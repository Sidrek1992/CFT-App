import { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebaseService";
import { OfficialDatabase } from "../types";

const DB_COLLECTION = "databases";
const SHARED_DOC_ID = "shared_config";

export const dbService = {
    // Save or Update a full database object
    async saveDatabase(database: OfficialDatabase) {
        const dbRef = doc(db, DB_COLLECTION, database.id);
        await setDoc(dbRef, database);
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

    // Save Shared Config (Templates)
    async saveSharedConfig(data: any) {
        const docRef = doc(db, DB_COLLECTION, SHARED_DOC_ID);
        await setDoc(docRef, data, { merge: true });
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
    }
};
