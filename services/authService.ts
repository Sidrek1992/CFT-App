import { auth } from './firebaseService';
import {
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    User,
    reauthenticateWithPopup
} from 'firebase/auth';
import { persistTokenMeta, clearTokenState, isTokenFresh } from './tokenService';
import { DRIVE_SCOPE } from './driveService';

// ─── Scopes ───────────────────────────────────────────────────────────────────
const GMAIL_SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
    DRIVE_SCOPE, // Google Drive readonly — for file picker
];

const buildGoogleProvider = (forceConsent = false): GoogleAuthProvider => {
    const provider = new GoogleAuthProvider();
    GMAIL_SCOPES.forEach(s => provider.addScope(s));
    if (forceConsent) {
        // access_type=offline requests a refresh token from Google
        provider.setCustomParameters({
            prompt: 'consent',
            access_type: 'offline',
        });
    }
    return provider;
};

// ─── Background auto-refresh timer ───────────────────────────────────────────
let refreshTimer: ReturnType<typeof setInterval> | null = null;

const startAutoRefresh = (uid: string, email: string) => {
    stopAutoRefresh();
    // Check every 5 minutes; refresh silently when < 10 min remain
    refreshTimer = setInterval(async () => {
        if (!isTokenFresh()) {
            console.log('[authService] Token near expiry — attempting silent refresh.');
            await silentRefreshToken(uid, email);
        }
    }, 5 * 60 * 1000);
};

export const stopAutoRefresh = () => {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
};

/**
 * Attempts to keep the Firebase Auth session alive by refreshing the ID token.
 * IMPORTANT: This does NOT open any popup. If the Gmail OAuth token has expired,
 * the user will see a banner prompting them to re-authorize manually.
 */
const silentRefreshToken = async (_uid: string, _email: string): Promise<boolean> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return false;

    try {
        // Refresh Firebase Auth ID token (no popup required)
        await currentUser.getIdToken(true);
        console.log('[authService] Firebase ID token refreshed. Gmail token status:', isTokenFresh() ? 'fresh' : 'expired');
        return isTokenFresh();
    } catch (err) {
        console.warn('[authService] silentRefreshToken error:', err);
        return false;
    }
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const loginWithGoogle = async () => {
    try {
        const provider = buildGoogleProvider(true);
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken;

        if (token && result.user) {
            sessionStorage.setItem('gmail_access_token', token);
            const email = result.user.email || '';
            sessionStorage.setItem('gmail_user_email', email);
            await persistTokenMeta(result.user.uid, token, email);
            startAutoRefresh(result.user.uid, email);
        }

        return result.user;
    } catch (error) {
        console.error('Error signing in with Google', error);
        throw error;
    }
};

/**
 * Re-authorizes the current user with Google to obtain a fresh Gmail
 * access token. Does NOT sign out or change the current Firebase session.
 * Use this when the user is already logged in but the Gmail token is
 * missing or expired and requires explicit user confirmation.
 */
export const reauthorizeWithGoogle = async (): Promise<string> => {
    const provider = buildGoogleProvider(true);
    const currentUser = auth.currentUser;

    let result;
    if (currentUser) {
        try {
            result = await reauthenticateWithPopup(currentUser, provider);
        } catch {
            result = await signInWithPopup(auth, provider);
        }
    } else {
        result = await signInWithPopup(auth, provider);
    }

    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    if (!token) throw new Error('No se pudo obtener el token de acceso de Gmail.');

    sessionStorage.setItem('gmail_access_token', token);
    const email = result.user?.email || sessionStorage.getItem('gmail_user_email') || '';
    sessionStorage.setItem('gmail_user_email', email);

    if (result.user) {
        await persistTokenMeta(result.user.uid, token, email);
        startAutoRefresh(result.user.uid, email);
    }

    return token;
};

/** Returns true if a Gmail OAuth token is stored in this session. */
export const hasGmailToken = (): boolean => !!sessionStorage.getItem('gmail_access_token');

/** Starts the auto-refresh background timer for an already-authenticated user. */
export const initAutoRefreshForUser = (user: User) => {
    startAutoRefresh(user.uid, user.email || '');
};

/**
 * Called once on app bootstrap when Firebase Auth restores a previous session.
 *
 * Strategy:
 *  1. If a token already exists in sessionStorage (same tab), start auto-refresh.
 *  2. Otherwise, check Firestore token metadata. If recent, the token probably
 *     expired with the tab close — the GmailAuthBanner will prompt the user
 *     to re-authorize at their convenience.
 *  3. NEVER opens a popup automatically. The user clicks "Autorizar Gmail"
 *     when they want to use email features — no surprise windows.
 */
export const bootstrapGmailToken = async (user: User): Promise<boolean> => {
    // Already have a token in this tab — just start monitoring
    if (hasGmailToken()) {
        startAutoRefresh(user.uid, user.email || '');
        return true;
    }

    // No token in session — don't open a popup.
    // The GmailAuthBanner component will prompt the user to re-authorize manually.
    console.log('[authService] No Gmail token in session. User can re-authorize via the Gmail banner.');
    return false;
};

export const logout = async () => {
    try {
        stopAutoRefresh();
        clearTokenState();
        await signOut(auth);
    } catch (error) {
        console.error('Error signing out', error);
        throw error;
    }
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
};
