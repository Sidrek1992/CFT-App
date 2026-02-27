import { auth } from './firebaseService';
import {
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    User,
    reauthenticateWithPopup
} from 'firebase/auth';
import { persistTokenMeta, clearTokenState, isTokenFresh, canShowReauthPopup, loadTokenMeta } from './tokenService';
import { DRIVE_SCOPE } from './driveService';

// ─── Scopes ───────────────────────────────────────────────────────────────────
const GMAIL_SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
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
 * Attempts a silent token refresh using Firebase's stored credential.
 * If the stored credential is still valid, Firebase will return a new
 * access token without a popup. Falls back to a popup only if allowed.
 */
const silentRefreshToken = async (uid: string, email: string): Promise<boolean> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return false;

    try {
        // Force token refresh via Firebase Auth (works if Firebase session is alive)
        await currentUser.getIdToken(true);

        // Re-authenticate with Google silently (select_account won't force popup
        // if the user already has a session with Google)
        if (canShowReauthPopup()) {
            const provider = buildGoogleProvider(false);
            provider.setCustomParameters({ prompt: 'select_account' });
            try {
                const result = await reauthenticateWithPopup(currentUser, provider);
                const credential = GoogleAuthProvider.credentialFromResult(result);
                const token = credential?.accessToken;
                if (token) {
                    sessionStorage.setItem('gmail_access_token', token);
                    await persistTokenMeta(uid, token, email);
                    console.log('[authService] Token refreshed silently.');
                    return true;
                }
            } catch (popupErr: any) {
                // popup-closed-by-user or popup-blocked are acceptable — just skip
                if (popupErr.code !== 'auth/popup-closed-by-user' &&
                    popupErr.code !== 'auth/popup-blocked') {
                    console.warn('[authService] Silent reauth failed:', popupErr.code);
                }
            }
        }
        return false;
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
 * Attempts a silent Gmail token refresh so the user never needs to re-authorize
 * manually after a page reload.
 *
 * Strategy:
 *  1. If a token already exists in sessionStorage (same tab), do nothing.
 *  2. Check Firestore token metadata to see if the user had a recent valid session.
 *  3. If the stored token is not stale (< 1 hour old), attempt a silent
 *     reauthentication with prompt='select_account'. In most cases Google
 *     resolves this instantly without showing a visible popup because the user's
 *     Google session is still alive in the browser.
 *  4. On any failure (popup blocked, cancelled, no Google session) we just
 *     return false — the GmailAuthBanner in the Generator handles the fallback.
 */
export const bootstrapGmailToken = async (user: User): Promise<boolean> => {
    // Already have a token in this tab — nothing to do
    if (hasGmailToken()) return true;

    try {
        const meta = await loadTokenMeta(user.uid);

        if (!meta) return false;

        // Only attempt silent re-auth if the Firestore record is recent enough
        // (within the last 2 hours — if older the Google session is likely gone too)
        const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
        if (Date.now() - meta.updatedAt > TWO_HOURS_MS) return false;

        const provider = buildGoogleProvider(false);
        // 'select_account' with an existing Google session usually resolves
        // silently without user interaction
        provider.setCustomParameters({ prompt: 'select_account' });

        const currentUser = auth.currentUser;
        if (!currentUser) return false;

        const result = await reauthenticateWithPopup(currentUser, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken;

        if (token) {
            sessionStorage.setItem('gmail_access_token', token);
            const email = result.user?.email || user.email || '';
            sessionStorage.setItem('gmail_user_email', email);
            await persistTokenMeta(user.uid, token, email);
            startAutoRefresh(user.uid, email);
            console.log('[authService] Gmail token restored silently on bootstrap.');
            return true;
        }
    } catch (err: any) {
        // Popup blocked or cancelled by user — non-fatal, GmailAuthBanner handles it
        const ignoredCodes = [
            'auth/popup-blocked',
            'auth/popup-closed-by-user',
            'auth/cancelled-popup-request',
        ];
        if (!ignoredCodes.includes(err?.code)) {
            console.warn('[authService] bootstrapGmailToken silent reauth failed:', err?.code ?? err);
        }
    }

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
