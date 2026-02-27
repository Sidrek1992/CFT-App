import { auth } from './firebaseService';
import {
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    User,
    createUserWithEmailAndPassword,
    reauthenticateWithPopup
} from 'firebase/auth';

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/gmail.send');

export const loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken;

        if (token) {
            sessionStorage.setItem('gmail_access_token', token);
        }

        return result.user;
    } catch (error) {
        console.error("Error signing in with Google", error);
        throw error;
    }
};

/**
 * Re-authorizes the current user with Google to obtain a Gmail access token.
 * Does NOT sign out or change the current Firebase session.
 * Use this when the user is already logged in (e.g. via email/password)
 * but the Gmail token is missing or expired.
 */
export const reauthorizeWithGoogle = async (): Promise<string> => {
    const gmailProvider = new GoogleAuthProvider();
    gmailProvider.addScope('https://www.googleapis.com/auth/gmail.send');
    // Force account selection so the user can pick the right account
    gmailProvider.setCustomParameters({ prompt: 'consent' });

    let result;
    const currentUser = auth.currentUser;
    if (currentUser) {
        try {
            result = await reauthenticateWithPopup(currentUser, gmailProvider);
        } catch {
            // Fallback: signInWithPopup without changing currentUser identity
            result = await signInWithPopup(auth, gmailProvider);
        }
    } else {
        result = await signInWithPopup(auth, gmailProvider);
    }

    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    if (!token) throw new Error('No se pudo obtener el token de acceso de Gmail.');
    sessionStorage.setItem('gmail_access_token', token);
    return token;
};

/** Returns true if a Gmail OAuth token is stored in this session. */
export const hasGmailToken = (): boolean => !!sessionStorage.getItem('gmail_access_token');

export const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error signing out", error);
        throw error;
    }
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
};
