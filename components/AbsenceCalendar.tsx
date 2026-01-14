
import React, { useState, useMemo } from 'react';
import { Official, AbsenceRecord, AbsenceType } from '../types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, User } from 'lucide-react';

interface AbsenceCalendarProps {
    officials: Official[];
    absences: AbsenceRecord[];
}

export const AbsenceCalendar: React.FC<AbsenceCalendarProps> = ({ officials, absences }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const daysInMonth = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        return new Date(year, month + 1, 0).getDate();
    }, [currentDate]);

    const firstDayOfMonth = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        return new Date(year, month, 1).getDay();
    }, [currentDate]);

    const monthName = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const getAbsenceForDay = (officialId: string, day: number) => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        date.setHours(0, 0, 0, 0);

        return absences.find(a => {
            if (a.officialId !== officialId) return false;
            const start = new Date(a.startDate);
            const end = new Date(a.endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            return date >= start && date <= end;
        });
    };

    const getAbsenceColor = (type: AbsenceType) => {
        switch (type) {
            case AbsenceType.FeriadoLegal:
                return 'bg-emerald-500';
            case AbsenceType.PermisoAdministrativo:
                return 'bg-amber-500';
            default:
                return 'bg-slate-400';
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <CalendarIcon className="text-indigo-600" /> Visor de Ausentismo
                    </h2>
                    <p className="text-slate-500 text-sm">Visualización mensual de permisos y feriados</p>
                </div>
                <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <button onClick={prevMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-600">
                        <ChevronLeft />
                    </button>
                    <span className="text-sm font-black uppercase tracking-widest text-slate-700 min-w-32 text-center">
                        {monthName}
                    </span>
                    <button onClick={nextMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-600">
                        <ChevronRight />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="sticky left-0 z-10 bg-slate-50 p-4 text-left font-bold text-xs text-slate-500 uppercase tracking-wider min-w-48 shadow-[1px_0_0_0_#f1f5f9]">
                                Funcionario
                            </th>
                            {days.map(day => (
                                <th key={day} className="p-2 text-center text-[10px] font-black text-slate-400 min-w-8">
                                    {day}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {officials.length === 0 ? (
                            <tr>
                                <td colSpan={daysInMonth + 1} className="p-12 text-center text-slate-400 italic">
                                    No hay funcionarios registrados.
                                </td>
                            </tr>
                        ) : (
                            officials.map(official => (
                                <tr key={official.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="sticky left-0 z-10 bg-white p-4 font-bold text-xs text-slate-700 shadow-[1px_0_0_0_#f1f5f9] truncate">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-500">
                                                <User className="w-3 h-3" />
                                            </div>
                                            {official.name}
                                        </div>
                                    </td>
                                    {days.map(day => {
                                        const absence = getAbsenceForDay(official.id, day);
                                        return (
                                            <td key={day} className="p-0 border-r border-slate-50 h-10">
                                                {absence && (
                                                    <div
                                                        title={`${absence.type}: ${absence.description || ''}`}
                                                        className={`h-full w-full ${getAbsenceColor(absence.type)} opacity-80 cursor-help hover:opacity-100 transition-opacity`}
                                                    ></div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-8 flex gap-6 text-xs font-bold text-slate-500">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-emerald-500 opacity-80"></div>
                    <span>Feriado Legal</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-amber-500 opacity-80"></div>
                    <span>Permiso Administrativo</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-slate-400 opacity-80"></div>
                    <span>Otros</span>
                </div>
            </div>
        </div>
    );
};
