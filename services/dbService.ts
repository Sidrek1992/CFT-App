import { collection, doc, getDocs, setDoc, deleteDoc, query, where, onSnapshot } from "firebase/firestore";
import { db } from "./firebaseService";
import { OfficialDatabase, Official } from "../types";

const DB_COLLECTION = "databases";
const SHARED_DOC_ID = "shared_config";

export const dbService = {
    // Save or Update a full database object
    async saveDatabase(database: OfficialDatabase) {
        const dbRef = doc(db, DB_COLLECTION, database.id);
        await setDoc(dbRef, database);
    },

    // Load all databases from Firestore
    async loadDatabases() {
        const querySnapshot = await getDocs(collection(db, DB_COLLECTION));
        const databases: OfficialDatabase[] = [];
        querySnapshot.forEach((doc) => {
            databases.push(doc.data() as OfficialDatabase);
        });
        return databases;
    },

    // Real-time synchronization for databases
    subscribeToDatabases(callback: (databases: OfficialDatabase[]) => void) {
        return onSnapshot(collection(db, DB_COLLECTION), (snapshot) => {
            const databases: OfficialDatabase[] = [];
            snapshot.forEach((doc) => {
                databases.push(doc.data() as OfficialDatabase);
            });
            callback(databases);
        });
    },

    // Save Shared Config (Templates)
    async saveSharedConfig(data: any) {
        const docRef = doc(db, DB_COLLECTION, SHARED_DOC_ID);
        await setDoc(docRef, data, { merge: true });
    },

    // Subscribe to Shared Config
    subscribeToSharedConfig(callback: (data: any) => void) {
        return onSnapshot(doc(db, DB_COLLECTION, SHARED_DOC_ID), (docSnap) => {
            if (docSnap.exists()) {
                callback(docSnap.data());
            }
        });
    }
};
