import React, { useState, useEffect } from 'react';
import { Shield, User, ChevronDown, Save, AlertTriangle, Check } from 'lucide-react';
import {
    UserProfile,
    UserRole,
    ROLE_LABELS,
    ROLE_DESCRIPTIONS,
    ROLE_COLORS,
} from '../types';
import {
    subscribeToAllProfiles,
    updateUserRole,
    canManageRoles,
} from '../services/rolesService';

interface RolesManagerProps {
    currentUser: UserProfile;
    onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const ROLE_ORDER: UserRole[] = ['superadmin', 'admin', 'operator', 'reader'];

export const RolesManager: React.FC<RolesManagerProps> = ({ currentUser, onToast }) => {
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [pendingChanges, setPendingChanges] = useState<Record<string, UserRole>>({});
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        if (!canManageRoles(currentUser.role)) return;
        const unsub = subscribeToAllProfiles(setProfiles);
        return unsub;
    }, [currentUser.role]);

    const handleRoleChange = (uid: string, newRole: UserRole) => {
        setPendingChanges(prev => ({ ...prev, [uid]: newRole }));
    };

    const handleSave = async (uid: string) => {
        const newRole = pendingChanges[uid];
        if (!newRole) return;

        // Prevent removing the last superadmin
        if (newRole !== 'superadmin') {
            const superadminCount = profiles.filter(p => p.role === 'superadmin' && p.uid !== uid).length;
            if (superadminCount === 0 && profiles.find(p => p.uid === uid)?.role === 'superadmin') {
                onToast('No puedes quitar el último superadmin.', 'error');
                return;
            }
        }

        setSaving(uid);
        try {
            await updateUserRole(uid, newRole, currentUser.uid);
            setPendingChanges(prev => {
                const next = { ...prev };
                delete next[uid];
                return next;
            });
            onToast(`Rol de ${profiles.find(p => p.uid === uid)?.displayName} actualizado a ${ROLE_LABELS[newRole]}`, 'success');
        } catch (err: any) {
            onToast(err.message || 'Error al actualizar el rol', 'error');
        } finally {
            setSaving(null);
        }
    };

    if (!canManageRoles(currentUser.role)) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center">
                    <Shield className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Acceso restringido</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm">
                    Solo los Superadmins pueden gestionar los roles de usuarios.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header */}
            <div className="glass-panel bento-card p-6">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center flex-shrink-0 border border-primary-500/30">
                        <Shield className="w-6 h-6 text-primary-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Gestión de Permisos</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                            Asigna roles a los usuarios registrados. Los roles controlan qué módulos y acciones puede realizar cada persona.
                        </p>
                    </div>
                </div>
            </div>

            {/* Role descriptions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {ROLE_ORDER.map(role => (
                    <div key={role} className={`glass-panel p-4 rounded-xl border ${ROLE_COLORS[role]}`}>
                        <p className="text-xs font-bold uppercase tracking-widest mb-1">{ROLE_LABELS[role]}</p>
                        <p className="text-xs opacity-80">{ROLE_DESCRIPTIONS[role]}</p>
                    </div>
                ))}
            </div>

            {/* User list */}
            <div className="glass-panel bento-card rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <User className="w-4 h-4 text-primary-400" />
                        Usuarios registrados ({profiles.length})
                    </h3>
                </div>

                {profiles.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 dark:text-slate-500">
                        <p className="text-sm">No hay usuarios registrados aún.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-200 dark:divide-slate-800">
                        {profiles.map(profile => {
                            const isMe = profile.uid === currentUser.uid;
                            const pendingRole = pendingChanges[profile.uid];
                            const displayRole = pendingRole || profile.role;
                            const hasChange = !!pendingRole && pendingRole !== profile.role;

                            return (
                                <div
                                    key={profile.uid}
                                    className={`p-4 flex items-center gap-4 transition-colors ${hasChange ? 'bg-amber-50/50 dark:bg-amber-950/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}
                                >
                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                        {profile.displayName.charAt(0).toUpperCase()}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                                                {profile.displayName}
                                            </p>
                                            {isMe && (
                                                <span className="text-[10px] bg-primary-500/20 text-primary-400 border border-primary-500/30 px-1.5 py-0.5 rounded-full font-bold uppercase">
                                                    Tú
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{profile.email}</p>
                                    </div>

                                    {/* Role selector */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <div className="relative">
                                            <select
                                                value={displayRole}
                                                onChange={(e) => handleRoleChange(profile.uid, e.target.value as UserRole)}
                                                disabled={isMe || saving === profile.uid}
                                                className={`
                                                    appearance-none pr-8 pl-3 py-1.5 rounded-lg text-xs font-semibold
                                                    border transition-all cursor-pointer
                                                    disabled:opacity-60 disabled:cursor-not-allowed
                                                    bg-white dark:bg-dark-800
                                                    text-slate-800 dark:text-slate-200
                                                    border-slate-200 dark:border-slate-700
                                                    focus:outline-none focus:ring-2 focus:ring-primary-500
                                                `}
                                            >
                                                {ROLE_ORDER.map(r => (
                                                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                                        </div>

                                        {/* Save button (shows only when there's a pending change) */}
                                        {hasChange && !isMe && (
                                            <button
                                                onClick={() => handleSave(profile.uid)}
                                                disabled={saving === profile.uid}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
                                            >
                                                {saving === profile.uid ? (
                                                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <Check className="w-3 h-3" />
                                                )}
                                                Guardar
                                            </button>
                                        )}

                                        {/* Current role badge */}
                                        {!hasChange && (
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${ROLE_COLORS[profile.role]}`}>
                                                {ROLE_LABELS[profile.role]}
                                            </span>
                                        )}

                                        {/* Pending change indicator */}
                                        {hasChange && (
                                            <div className="flex items-center gap-1 text-[10px] text-amber-500 dark:text-amber-400">
                                                <AlertTriangle className="w-3 h-3" />
                                                Sin guardar
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Info card */}
            <div className="glass-panel bento-card p-4 border border-amber-500/20 bg-amber-500/5">
                <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">Notas importantes</p>
                        <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1 list-disc list-inside">
                            <li>Los nuevos usuarios que se registren obtienen el rol <strong>Lector</strong> por defecto.</li>
                            <li>El primer usuario registrado en el sistema obtiene automáticamente el rol <strong>Superadmin</strong>.</li>
                            <li>No puedes modificar tu propio rol (protección anti-bloqueo).</li>
                            <li>Debe existir al menos un Superadmin en todo momento.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
