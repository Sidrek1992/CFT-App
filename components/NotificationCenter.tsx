import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck, Cake, CalendarClock, FileWarning, Info, CheckCircle2, AlertTriangle } from 'lucide-react';

export type NotifType = 'birthday_today' | 'birthday_week' | 'contract_expired' | 'contract_soon' | 'info' | 'success' | 'warning';

export interface AppNotification {
    id: string;
    type: NotifType;
    title: string;
    body: string;
    timestamp: number;
    read: boolean;
}

// ─── Notification Store (module-level singleton) ─────────────────────────────
// Other modules can call addAppNotification() to push notifications.

type Listener = () => void;
const listeners = new Set<Listener>();
let _notifications: AppNotification[] = JSON.parse(localStorage.getItem('appNotifications') ?? '[]');

function persist() {
    // Keep only last 100 entries
    if (_notifications.length > 100) _notifications = _notifications.slice(-100);
    localStorage.setItem('appNotifications', JSON.stringify(_notifications));
}

export function addAppNotification(n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) {
    _notifications = [
        ..._notifications,
        { ...n, id: Date.now().toString(36) + Math.random().toString(36).slice(2), timestamp: Date.now(), read: false }
    ];
    persist();
    listeners.forEach(l => l());
}

export function useNotifications() {
    const [state, setState] = useState<AppNotification[]>(_notifications);
    useEffect(() => {
        const cb = () => setState([..._notifications]);
        listeners.add(cb);
        return () => { listeners.delete(cb); };
    }, []);

    const markAllRead = () => {
        _notifications = _notifications.map(n => ({ ...n, read: true }));
        persist();
        listeners.forEach(l => l());
    };
    const markRead = (id: string) => {
        _notifications = _notifications.map(n => n.id === id ? { ...n, read: true } : n);
        persist();
        listeners.forEach(l => l());
    };
    const remove = (id: string) => {
        _notifications = _notifications.filter(n => n.id !== id);
        persist();
        listeners.forEach(l => l());
    };
    const clearAll = () => {
        _notifications = [];
        persist();
        listeners.forEach(l => l());
    };

    return { notifications: state, markAllRead, markRead, remove, clearAll };
}

// ─── Icon per type ────────────────────────────────────────────────────────────
const NOTIF_META: Record<NotifType, { icon: React.ReactNode; color: string; bg: string }> = {
    birthday_today: { icon: <Cake className="w-4 h-4" />, color: 'text-pink-500', bg: 'bg-pink-100 dark:bg-pink-900/40' },
    birthday_week: { icon: <Cake className="w-4 h-4" />, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/40' },
    contract_expired: { icon: <FileWarning className="w-4 h-4" />, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/40' },
    contract_soon: { icon: <CalendarClock className="w-4 h-4" />, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/40' },
    info: { icon: <Info className="w-4 h-4" />, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/40' },
    success: { icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
    warning: { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/40' },
};

// ─── Component ────────────────────────────────────────────────────────────────
export const NotificationCenter: React.FC = () => {
    const { notifications, markAllRead, markRead, remove, clearAll } = useNotifications();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const unread = notifications.filter(n => !n.read).length;

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const formatTime = (ts: number) => {
        const diff = Date.now() - ts;
        if (diff < 60000) return 'Ahora';
        if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)}m`;
        if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)}h`;
        return new Date(ts).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
    };

    return (
        <div ref={ref} className="relative">
            {/* Bell button */}
            <button
                onClick={() => { setOpen(o => !o); if (!open && unread > 0) markAllRead(); }}
                className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-700 transition-colors"
                title="Notificaciones"
            >
                <Bell className="w-5 h-5" />
                {unread > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 animate-in zoom-in duration-200">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {/* Dropdown panel */}
            {open && (
                <div className="absolute right-0 top-full mt-2 w-96 max-h-[520px] bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
                        <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-indigo-500" />
                            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Notificaciones</h3>
                            {notifications.length > 0 && (
                                <span className="text-[10px] bg-slate-100 dark:bg-dark-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full font-medium">
                                    {notifications.length}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {notifications.length > 0 && (
                                <>
                                    <button
                                        onClick={markAllRead}
                                        className="p-1.5 text-slate-400 hover:text-indigo-500 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                                        title="Marcar todas como leídas"
                                    >
                                        <CheckCheck className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={clearAll}
                                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                        title="Borrar todas"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-dark-700 flex items-center justify-center mb-3">
                                    <Bell className="w-6 h-6 text-slate-300 dark:text-slate-500" />
                                </div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Sin notificaciones</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Estás al día ✓</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50 dark:divide-slate-800">
                                {[...notifications].reverse().map(n => {
                                    const meta = NOTIF_META[n.type];
                                    return (
                                        <div
                                            key={n.id}
                                            onClick={() => markRead(n.id)}
                                            className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-dark-700/50 transition-colors cursor-default ${!n.read ? 'bg-indigo-50/40 dark:bg-indigo-950/10' : ''}`}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${meta.bg} ${meta.color}`}>
                                                {meta.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className={`text-xs font-bold leading-snug ${!n.read ? 'text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                                                        {n.title}
                                                    </p>
                                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0 mt-0.5">
                                                        {formatTime(n.timestamp)}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{n.body}</p>
                                            </div>
                                            <button
                                                onClick={e => { e.stopPropagation(); remove(n.id); }}
                                                className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-400 rounded transition-colors flex-shrink-0 mt-0.5"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
