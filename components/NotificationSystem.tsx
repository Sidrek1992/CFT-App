import React, { useMemo } from 'react';
import { Official, AbsenceRecord } from '../types';
import { Bell, Briefcase, ChevronRight, UserCheck, Cake, Award } from 'lucide-react';

export interface NotificationItem {
    id: string;
    type: 'contract' | 'return' | 'birthday' | 'anniversary';
    title: string;
    description: string;
    officialName: string;
    date: string;
    priority: 'high' | 'medium' | 'low';
    icon: any;
}

export const useNotifications = (officials: Official[], absences: AbsenceRecord[]) => {
    return useMemo(() => {
        const items: NotificationItem[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        // 1. Contratos por vencer (próximos 7 días)
        officials.forEach(official => {
            if (official.contractEndDate) {
                const endDate = new Date(official.contractEndDate);
                endDate.setHours(0, 0, 0, 0);

                const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                if (diffDays >= 0 && diffDays <= 7) {
                    items.push({
                        id: `contract-${official.id}`,
                        type: 'contract',
                        title: diffDays === 0 ? 'Contrato vence hoy' : `Contrato por vencer en ${diffDays} días`,
                        description: `${official.position} • ${official.department}`,
                        officialName: official.name,
                        date: official.contractEndDate,
                        priority: diffDays <= 3 ? 'high' : 'medium',
                        icon: Briefcase
                    });
                }
            }

            // 3. Cumpleaños (hoy y mañana)
            if (official.birthDate) {
                const bDate = new Date(official.birthDate);
                const isToday = bDate.getDate() === today.getDate() && bDate.getMonth() === today.getMonth();
                const isTomorrow = bDate.getDate() === tomorrow.getDate() && bDate.getMonth() === tomorrow.getMonth();

                if (isToday || isTomorrow) {
                    items.push({
                        id: `birthday-${official.id}`,
                        type: 'birthday',
                        title: isToday ? '¡Hoy está de Cumpleaños!' : 'Mañana está de Cumpleaños',
                        description: `¡No olvides saludarlo(a)!`,
                        officialName: official.name,
                        date: isToday ? today.toISOString().split('T')[0] : tomorrow.toISOString().split('T')[0],
                        priority: 'medium',
                        icon: Cake
                    });
                }
            }

            // 4. Aniversarios (Antigüedad - Hitos de 1 año y múltiplos de 5)
            if (official.entryDate) {
                const eDate = new Date(official.entryDate);
                const years = today.getFullYear() - eDate.getFullYear();
                const isAnniversaryDay = eDate.getDate() === today.getDate() && eDate.getMonth() === today.getMonth();

                if (isAnniversaryDay && years > 0) {
                    const isMilestone = years % 5 === 0;
                    items.push({
                        id: `anniversary-${official.id}`,
                        type: 'anniversary',
                        title: isMilestone ? `${years} años de Antigüedad (Gran Hito)` : `Aniversario Laboral (${years} ${years === 1 ? 'año' : 'años'})`,
                        description: `Ingresó el ${official.entryDate} • ¡Felicidades!`,
                        officialName: official.name,
                        date: today.toISOString().split('T')[0],
                        priority: isMilestone ? 'high' : 'medium',
                        icon: Award
                    });
                }
            }
        });

        // 2. Retornos de ausencias (retornan mañana o hoy)
        absences.forEach(absence => {
            const endDate = new Date(absence.endDate);
            endDate.setHours(0, 0, 0, 0);

            const official = officials.find(o => o.id === absence.officialId);
            if (!official) return;

            const returnDate = new Date(endDate);
            returnDate.setDate(endDate.getDate() + 1);
            returnDate.setHours(0, 0, 0, 0);

            const diffDays = Math.ceil((returnDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays === 0 || diffDays === 1) {
                items.push({
                    id: `return-${absence.id}`,
                    type: 'return',
                    title: diffDays === 0 ? 'Retorna hoy a sus labores' : 'Retorna mañana a sus labores',
                    description: `Vuelve de: ${absence.type}`,
                    officialName: official.name,
                    date: returnDate.toISOString().split('T')[0],
                    priority: diffDays === 0 ? 'high' : 'medium',
                    icon: UserCheck
                });
            }
        });

        return items.sort((a, b) => {
            if (a.priority === 'high' && b.priority !== 'high') return -1;
            if (a.priority !== 'high' && b.priority === 'high') return 1;
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
    }, [officials, absences]);
};

export const NotificationSystem: React.FC<{ officials: Official[]; absences: AbsenceRecord[] }> = ({ officials, absences }) => {
    const notifications = useNotifications(officials, absences);

    if (notifications.length === 0) return null;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6 animate-in slide-in-from-top-4 duration-500">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Bell className="w-5 h-5 text-indigo-600" />
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
                    </div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Notificaciones del Sistema</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full">
                    {notifications.length} {notifications.length === 1 ? 'PENDIENTE' : 'PENDIENTES'}
                </span>
            </div>
            <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                {notifications.map(notif => (
                    <div key={notif.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-4 group">
                        <div className={`p-2 rounded-xl shrink-0 ${notif.priority === 'high' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                            <notif.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <p className="text-xs font-black text-slate-900 leading-none mb-1">{notif.title}</p>
                                <span className="text-[10px] font-bold text-slate-400">{notif.date}</span>
                            </div>
                            <p className="text-sm font-bold text-slate-800 truncate">{notif.officialName}</p>
                            <p className="text-[10px] text-slate-500 font-medium truncate">{notif.description}</p>
                        </div>
                        <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight className="w-4 h-4 text-slate-300" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
