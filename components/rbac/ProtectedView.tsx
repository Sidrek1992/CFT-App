import React from 'react';
import { UserRole } from '../../types';
import { AccessDenied } from './AccessDenied';

interface ProtectedViewProps {
  /** Boolean permission flag — if false, renders AccessDenied */
  allowed: boolean;
  /** The user's current role (forwarded to AccessDenied for the message) */
  role?: UserRole;
  /** Human-readable name of the resource being protected */
  resource?: string;
  children: React.ReactNode;
}

/**
 * Wraps any view with a permission gate.
 *
 * Usage:
 *   <ProtectedView allowed={rbac.canView('generate')} role={userRole} resource="Generador de Correos">
 *     <Generator ... />
 *   </ProtectedView>
 */
export const ProtectedView: React.FC<ProtectedViewProps> = ({
  allowed,
  role,
  resource,
  children,
}) => {
  if (!allowed) {
    return <AccessDenied role={role} resource={resource} />;
  }
  return <>{children}</>;
};
