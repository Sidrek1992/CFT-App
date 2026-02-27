/**
 * tokenService.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Manages Google OAuth refresh tokens stored in Firestore.
 *
 * Strategy:
 *  1. At login, we request `access_type=offline` + `prompt=consent` so that
 *     Google returns a refresh_token alongside the access_token.
 *  2. We persist the refresh_token in Firestore under users/{uid}/tokens.
 *  3. When the access_token is about to expire (< 10 min left), we silently
 *     call the Google Token endpoint with the stored refresh_token to get a
 *     new access_token — no popup required.
 *  4. A background interval refreshes the token every 50 minutes so the
 *     session stays alive indefinitely.
 *
 * NOTE: The Firebase SDK's GoogleAuthProvider does NOT expose refresh_tokens
 * on the client side for security reasons. However, we CAN use the
 * `credential.accessToken` and intercept the OAuth code via a custom OAuth
 * flow. Because this app runs entirely on the client and already stores the
 * access_token in sessionStorage, we implement a lightweight "proactive
 * refresh" using the stored token metadata:
 *
 *  - Token expiry is tracked in sessionStorage (gmail_token_expiry).
 *  - On each gmailFetch we check if < 10 min remain → trigger silent refresh.
 *  - Silent refresh calls reauthorizeWithGoogle() ONLY if the popup hasn't
 *    been shown in the last 45 minutes (avoiding popup spam).
 *
 * For full offline refresh_token support (server-side), a Cloud Function
 * is required. This implementation uses the best available client approach.
 */

import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebaseService';

const TOKEN_EXPIRY_KEY = 'gmail_token_expiry';
const TOKEN_LAST_REFRESH_KEY = 'gmail_last_refresh';
const TOKEN_COLLECTION = 'user_tokens';

// Token lifetime: Google issues tokens valid for 3600 seconds (1 hour)
const TOKEN_LIFETIME_MS = 3600 * 1000;
// Refresh when less than this time remains
const REFRESH_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
// Minimum time between forced re-authorizations (popup)
const MIN_REAUTH_INTERVAL_MS = 45 * 60 * 1000; // 45 minutes

export interface StoredTokenMeta {
    uid: string;
    accessTokenHash: string; // first 8 chars for verification
    expiresAt: number;       // unix ms
    updatedAt: number;
    email: string;
}

/**
 * Records token metadata in Firestore so other tabs/devices know the token
 * was recently refreshed.
 */
export const persistTokenMeta = async (uid: string, accessToken: string, email: string): Promise<void> => {
    const expiresAt = Date.now() + TOKEN_LIFETIME_MS;
    sessionStorage.setItem(TOKEN_EXPIRY_KEY, String(expiresAt));
    sessionStorage.setItem(TOKEN_LAST_REFRESH_KEY, String(Date.now()));

    try {
        const ref = doc(db, TOKEN_COLLECTION, uid);
        const meta: StoredTokenMeta = {
            uid,
            accessTokenHash: accessToken.substring(0, 8),
            expiresAt,
            updatedAt: Date.now(),
            email,
        };
        await setDoc(ref, meta, { merge: true });
    } catch (err) {
        // Non-critical — just log; the token still works locally
        console.warn('[tokenService] Could not persist token meta to Firestore:', err);
    }
};

/**
 * Returns true if the stored access token is still valid (has more than
 * REFRESH_THRESHOLD_MS remaining).
 */
export const isTokenFresh = (): boolean => {
    const expiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiry) return false;
    return Date.now() < parseInt(expiry) - REFRESH_THRESHOLD_MS;
};

/**
 * Returns true if enough time has passed since last re-authorization popup
 * to allow showing another one.
 */
export const canShowReauthPopup = (): boolean => {
    const lastRefresh = sessionStorage.getItem(TOKEN_LAST_REFRESH_KEY);
    if (!lastRefresh) return true;
    return Date.now() - parseInt(lastRefresh) > MIN_REAUTH_INTERVAL_MS;
};

/**
 * Returns the token expiry timestamp in ms, or null if not set.
 */
export const getTokenExpiry = (): number | null => {
    const expiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY);
    return expiry ? parseInt(expiry) : null;
};

/**
 * Loads token metadata from Firestore for a given user.
 */
export const loadTokenMeta = async (uid: string): Promise<StoredTokenMeta | null> => {
    try {
        const ref = doc(db, TOKEN_COLLECTION, uid);
        const snap = await getDoc(ref);
        return snap.exists() ? (snap.data() as StoredTokenMeta) : null;
    } catch {
        return null;
    }
};

/**
 * Clears all local token state (call on logout).
 */
export const clearTokenState = (): void => {
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
    sessionStorage.removeItem(TOKEN_LAST_REFRESH_KEY);
    sessionStorage.removeItem('gmail_access_token');
    sessionStorage.removeItem('gmail_user_email');
};

/**
 * Returns a human-readable string for how long until the token expires.
 */
export const getTokenTimeRemaining = (): string => {
    const expiry = getTokenExpiry();
    if (!expiry) return 'desconocido';
    const remaining = expiry - Date.now();
    if (remaining <= 0) return 'expirado';
    const minutes = Math.floor(remaining / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
};
