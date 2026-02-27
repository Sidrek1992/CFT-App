/**
 * rolesService.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Manages user roles and profiles stored in Firestore.
 *
 * Collection: user_profiles/{uid}
 * Document fields: uid, email, displayName, photoURL, role, createdAt, updatedAt
 *
 * Security model:
 *  - Any authenticated user can READ their own profile.
 *  - Only superadmins can WRITE to any user's profile.
 *  - First user to log in is automatically granted 'superadmin' role if no
 *    profiles exist yet.
 *
 * Firestore rules must enforce this (see firestore.rules).
 */

import {
    collection,
    doc,
    getDoc,
    setDoc,
    onSnapshot,
    query,
    updateDoc,
    getDocs,
    orderBy,
} from 'firebase/firestore';
import { db } from './firebaseService';
import { UserProfile, UserRole } from '../types';
import { User } from 'firebase/auth';

const PROFILES_COLLECTION = 'user_profiles';

// ─── Bootstrap ────────────────────────────────────────────────────────────────

/**
 * Ensures a UserProfile exists for the given Firebase user.
 * - If no profiles exist yet → first user becomes superadmin.
 * - If the user already has a profile → returns it unchanged.
 * - If the user is new (no profile) → creates with role 'reader' by default.
 */
export const bootstrapUserProfile = async (user: User): Promise<UserProfile> => {
    const profileRef = doc(db, PROFILES_COLLECTION, user.uid);
    const existing = await getDoc(profileRef);

    if (existing.exists()) {
        return existing.data() as UserProfile;
    }

    // Check if any profiles exist at all
    const allProfiles = await getDocs(collection(db, PROFILES_COLLECTION));
    const isFirstUser = allProfiles.empty;

    const profile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'Usuario',
        photoURL: user.photoURL || undefined,
        role: isFirstUser ? 'superadmin' : 'reader',
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    await setDoc(profileRef, profile);
    return profile;
};

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Fetches a user's profile from Firestore once.
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    const ref = doc(db, PROFILES_COLLECTION, uid);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as UserProfile) : null;
};

/**
 * Subscribes to real-time updates of ALL user profiles.
 * Only meaningful for superadmins (others may get permission-denied).
 */
export const subscribeToAllProfiles = (
    callback: (profiles: UserProfile[]) => void
): (() => void) => {
    const q = query(collection(db, PROFILES_COLLECTION), orderBy('createdAt', 'asc'));
    return onSnapshot(
        q,
        (snap) => {
            const profiles = snap.docs.map(d => d.data() as UserProfile);
            callback(profiles);
        },
        (err) => {
            if (err.code !== 'permission-denied') {
                console.error('[rolesService] subscribeToAllProfiles error:', err);
            }
        }
    );
};

/**
 * Subscribes to the current user's own profile for real-time role changes.
 */
export const subscribeToMyProfile = (
    uid: string,
    callback: (profile: UserProfile | null) => void
): (() => void) => {
    const ref = doc(db, PROFILES_COLLECTION, uid);
    return onSnapshot(
        ref,
        (snap) => {
            callback(snap.exists() ? (snap.data() as UserProfile) : null);
        },
        (err) => {
            if (err.code !== 'permission-denied') {
                console.error('[rolesService] subscribeToMyProfile error:', err);
            }
        }
    );
};

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Updates a user's role. Only callable by a superadmin in practice
 * (enforced by Firestore rules).
 */
export const updateUserRole = async (
    uid: string,
    role: UserRole,
    updatedByUid: string
): Promise<void> => {
    const ref = doc(db, PROFILES_COLLECTION, uid);
    await updateDoc(ref, {
        role,
        updatedAt: Date.now(),
        updatedBy: updatedByUid,
    });
};

// ─── Permission helpers ───────────────────────────────────────────────────────

export const canEdit = (role: UserRole): boolean =>
    role === 'superadmin' || role === 'admin';

export const canSendEmails = (role: UserRole): boolean =>
    role === 'superadmin' || role === 'admin' || role === 'operator';

export const canManageRoles = (role: UserRole): boolean =>
    role === 'superadmin';

export const canViewDashboard = (_role: UserRole): boolean => true; // all roles
