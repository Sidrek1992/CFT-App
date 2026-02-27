import React from 'react';
import { ShieldOff } from 'lucide-react';
import { ROLE_LABELS, UserRole } from '../../types';

interface AccessDeniedProps {
  /** The view/resource that was blocked */
  resource?: string;
  /** The user's current role (shown in the message) */
  role?: UserRole;
  /** Optional custom message */
  message?: string;
}

/**
 * Full-area "access denied" placeholder shown when a role lacks permission
 * to render a given view.
 */
export const AccessDenied: React.FC<AccessDeniedProps> = ({
  resource,
  role,
  message,
}) => (
  <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-dark-800 rounded-xl border border-slate-200 dark:border-slate-700 gap-4 p-8 text-center select-none">
    <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center">
      <ShieldOff className="w-7 h-7 text-red-500 dark:text-red-400" />
    </div>
    <div>
      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
        Acceso restringido
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
        {message ??
          <>
            {role && (
              <>
                Tu rol actual es{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {ROLE_LABELS[role]}
                </span>
                {resource && <> y no tienes permiso para acceder a <strong>{resource}</strong></>}.
              </>
            )}
            {!role && 'No tienes permiso para acceder a este módulo.'}
          </>
        }
      </p>
    </div>
    <p className="text-xs text-slate-400 dark:text-slate-500">
      Contacta a un administrador si necesitas acceso.
    </p>
  </div>
);
