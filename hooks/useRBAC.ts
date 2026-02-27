/**
 * useRBAC.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Centralizes all role-based access-control checks for the current session.
 * Consumes the UserProfile from App-level state and exposes boolean flags
 * that components can read without importing rolesService directly.
 *
 * Usage:
 *   const rbac = useRBAC(userRole);
 *   if (!rbac.canView('generate')) return <AccessDenied />;
 *   <button disabled={!rbac.canImportData}>Importar</button>
 */

import { UserRole } from '../types';
import {
    canEdit,
    canSendEmails,
    canManageRoles,
    canCreateDatabase,
    canDeleteDatabase,
    canRenameDatabase,
    canImportData,
    canExportData,
    canAddOfficial,
    canEditOfficial,
    canDeleteOfficial,
    canEditTemplate,
    canSaveTemplate,
    canDeleteTemplate,
    VIEW_PERMISSIONS,
} from '../services/rolesService';

export interface RBACContext {
    role: UserRole;

    // ── View-level ──────────────────────────────────────────────────────────
    /** Returns true if the role is allowed to render this view at all. */
    canView: (view: string) => boolean;
    /** Returns true if the role can perform mutations inside this view. */
    canMutateView: (view: string) => boolean;

    // ── Database actions ────────────────────────────────────────────────────
    canEditDb: boolean;        // edit any record (alias for canEdit)
    canSendMails: boolean;     // send emails via generator
    canManage: boolean;        // manage user roles
    canCreateDb: boolean;      // create a new database
    canDeleteDb: boolean;      // delete an existing database
    canRenameDb: boolean;      // rename an existing database
    canImport: boolean;        // import Excel / JSON
    canExport: boolean;        // export Excel / JSON / backup
    canAddOff: boolean;        // add a new official
    canEditOff: boolean;       // edit an existing official
    canDeleteOff: boolean;     // delete an official

    // ── Template actions ────────────────────────────────────────────────────
    canEditTpl: boolean;       // edit template body/subject
    canSaveTpl: boolean;       // save a named template
    canDeleteTpl: boolean;     // delete a saved template
}

export function useRBAC(role: UserRole): RBACContext {
    const canView = (view: string): boolean => {
        const perm = VIEW_PERMISSIONS[view];
        return perm ? perm.canView(role) : false;
    };

    const canMutateView = (view: string): boolean => {
        const perm = VIEW_PERMISSIONS[view];
        return perm?.canMutate ? perm.canMutate(role) : true;
    };

    return {
        role,
        canView,
        canMutateView,

        canEditDb:    canEdit(role),
        canSendMails: canSendEmails(role),
        canManage:    canManageRoles(role),
        canCreateDb:  canCreateDatabase(role),
        canDeleteDb:  canDeleteDatabase(role),
        canRenameDb:  canRenameDatabase(role),
        canImport:    canImportData(role),
        canExport:    canExportData(role),
        canAddOff:    canAddOfficial(role),
        canEditOff:   canEditOfficial(role),
        canDeleteOff: canDeleteOfficial(role),

        canEditTpl:   canEditTemplate(role),
        canSaveTpl:   canSaveTemplate(role),
        canDeleteTpl: canDeleteTemplate(role),
    };
}
