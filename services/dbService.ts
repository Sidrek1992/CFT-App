import {
    collection, doc, getDocs, setDoc, deleteDoc, onSnapshot,
    query, orderBy, limit, startAfter, DocumentSnapshot, getDoc,
} from "firebase/firestore";
import { db } from "./firebaseService";
import { Campaign, EmailLog, OfficialDatabase } from "../types";

export const DB_PAGE_SIZE = 50;

const DB_COLLECTION = "databases";
const SHARED_DOC_ID = "shared_config";
const USER_TEMPLATES_COLLECTION = "user_templates";

/**
 * Firestore does NOT accept fields with `undefined` values — it throws
 * "Function setDoc() called with invalid data. Unsupported field value: undefined".
 * This helper recursively strips every key whose value is `undefined` so the
 * document is always clean before it is written to Firestore.
 */
function sanitizeForFirestore<T>(obj: T): T {
    if (Array.isArray(obj)) {
        return obj.map(sanitizeForFirestore) as unknown as T;
    }
    if (obj !== null && typeof obj === 'object') {
        return Object.fromEntries(
            Object.entries(obj as Record<string, unknown>)
                .filter(([, v]) => v !== undefined)
                .map(([k, v]) => [k, sanitizeForFirestore(v)])
        ) as T;
    }
    return obj;
}

export const dbService = {
    // Save or Update a full database object
    async saveDatabase(database: OfficialDatabase) {
        const dbRef = doc(db, DB_COLLECTION, database.id);
        await setDoc(dbRef, sanitizeForFirestore(database));
    },

    // Delete a database document from Firestore
    async deleteDatabase(databaseId: string) {
        const dbRef = doc(db, DB_COLLECTION, databaseId);
        await deleteDoc(dbRef);
    },

    // Load all databases from Firestore (excludes shared_config)
    async loadDatabases() {
        const querySnapshot = await getDocs(collection(db, DB_COLLECTION));
        const databases: OfficialDatabase[] = [];
        querySnapshot.forEach((docSnap) => {
            if (docSnap.id !== SHARED_DOC_ID) {
                databases.push(docSnap.data() as OfficialDatabase);
            }
        });
        return databases;
    },

    // Real-time synchronization for databases (excludes shared_config)
    subscribeToDatabases(callback: (databases: OfficialDatabase[]) => void) {
        return onSnapshot(
            collection(db, DB_COLLECTION),
            (snapshot) => {
                const databases: OfficialDatabase[] = [];
                snapshot.forEach((docSnap) => {
                    if (docSnap.id !== SHARED_DOC_ID) {
                        databases.push(docSnap.data() as OfficialDatabase);
                    }
                });
                callback(databases);
            },
            // Silently ignore permission errors that fire when the user signs out
            (err) => {
                if (err.code !== 'permission-denied' && err.code !== 'unauthenticated') {
                    console.error('subscribeToDatabases error:', err);
                }
            }
        );
    },

    /**
     * Load a page of databases ordered by name, excluding shared_config.
     * Pass `afterDoc` (a DocumentSnapshot from the previous page's last item) to get the next page.
     * Returns the loaded databases and the last DocumentSnapshot for use as the next cursor.
     */
    async loadDatabasesPage(
        afterDoc?: DocumentSnapshot
    ): Promise<{ databases: OfficialDatabase[]; lastDoc: DocumentSnapshot | null }> {
        const col = collection(db, DB_COLLECTION);
        const constraints = afterDoc
            ? [orderBy('name'), startAfter(afterDoc), limit(DB_PAGE_SIZE)]
            : [orderBy('name'), limit(DB_PAGE_SIZE)];

        const q = query(col, ...constraints);
        const snapshot = await getDocs(q);
        const databases: OfficialDatabase[] = [];
        snapshot.forEach((docSnap) => {
            if (docSnap.id !== SHARED_DOC_ID) {
                databases.push(docSnap.data() as OfficialDatabase);
            }
        });

        const lastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
        return { databases, lastDoc };
    },

    // Save Shared Config (Templates)
    async saveSharedConfig(data: any) {
        const docRef = doc(db, DB_COLLECTION, SHARED_DOC_ID);
        await setDoc(docRef, data, { merge: true });
    },

    // Persist campaign metadata in subcollection for scalable log tracking
    async saveCampaignMeta(databaseId: string, campaign: Campaign) {
        const campaignRef = doc(db, DB_COLLECTION, databaseId, 'campaigns', campaign.id);
        await setDoc(
            campaignRef,
            {
                id: campaign.id,
                name: campaign.name,
                subject: campaign.subject,
                createdAt: campaign.createdAt,
                status: campaign.status,
            },
            { merge: true }
        );
    },

    // Persist one email log in subcollection to avoid fat-document writes
    async saveCampaignLog(databaseId: string, campaignId: string, log: EmailLog) {
        const logRef = doc(db, DB_COLLECTION, databaseId, 'campaigns', campaignId, 'logs', log.id);
        await setDoc(logRef, log, { merge: true });
    },

    // Subscribe to Shared Config
    subscribeToSharedConfig(callback: (data: any) => void) {
        return onSnapshot(
            doc(db, DB_COLLECTION, SHARED_DOC_ID),
            (docSnap) => {
                if (docSnap.exists()) {
                    callback(docSnap.data());
                }
            },
            // Silently ignore permission errors that fire when the user signs out
            (err) => {
                if (err.code !== 'permission-denied' && err.code !== 'unauthenticated') {
                    console.error('subscribeToSharedConfig error:', err);
                }
            }
        );
    },

    // ─── Per-user template persistence ─────────────────────────────────────────
    // Each user has their own document: user_templates/{uid}
    // Field: savedTemplates — array of SavedTemplate.
    // The active template body/subject is still saved in shared_config for
    // backward compatibility; only the SavedTemplates library moves per-user.

    /** Saves the user's template library to their own Firestore document. */
    async saveUserTemplates(uid: string, data: { savedTemplates: any[]; template?: any }) {
        const ref = doc(db, USER_TEMPLATES_COLLECTION, uid);
        await setDoc(ref, { ...data, updatedAt: Date.now() }, { merge: true });
    },

    /** Real-time listener for the current user's template library. */
    subscribeToUserTemplates(uid: string, callback: (data: any) => void) {
        const ref = doc(db, USER_TEMPLATES_COLLECTION, uid);
        return onSnapshot(
            ref,
            (docSnap) => {
                callback(docSnap.exists() ? docSnap.data() : null);
            },
            (err) => {
                if (err.code !== 'permission-denied' && err.code !== 'unauthenticated') {
                    console.error('subscribeToUserTemplates error:', err);
                }
            }
        );
    },
};
