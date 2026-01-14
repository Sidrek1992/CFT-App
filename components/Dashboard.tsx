import React, { useMemo } from 'react';
import { Official, Gender, ViewState, FilterCriteria, AbsenceRecord, AbsenceType } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, Upload, UserPlus, Send, AlertTriangle, CheckCircle2, FileSpreadsheet, Clock, ShieldAlert, Heart, Fingerprint, Trash2, Calendar, Gift, FileText, Download, ChevronRight } from 'lucide-react';
import { generateAbsencePDF } from '../services/reportService';
import { NotificationSystem } from './NotificationSystem';
import { Bell } from 'lucide-react';

interface DashboardProps {
    officials: Official[];
    absences: AbsenceRecord[];
    sentHistory: string[];
    onNavigate: (view: ViewState, filter?: FilterCriteria) => void;
    onImport: () => void;
    onExportExcel: () => void;
    onNewOfficial: () => void;
    onClearDatabase: () => void;
    isAdmin: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ officials, absences, sentHistory, onNavigate, onImport, onExportExcel, onNewOfficial, onClearDatabase, isAdmin }) => {
    const total = officials.length;
    const sentCount = officials.filter(o => sentHistory.includes(o.id)).length;

    const expiringCount = useMemo(() => {
        const today = new Date();
        return officials.filter(o => {
            if (!o.contractEndDate) return false;
            const end = new Date(o.contractEndDate);
            const diff = (end.getTime() - today.getTime()) / (1000 * 3600 * 24);
            return diff >= 0 && diff <= 30;
        }).length;
    }, [officials]);

    const missingRutCount = officials.filter(o => !o.rut).length;
    const missingEmergencyCount = officials.filter(o => !o.emergencyContactName).length;

    // 1. Mejora: Distribución por departamento
    const departmentData = useMemo(() => {
        const counts: Record<string, number> = {};
        officials.forEach(o => {
            const dept = o.department || 'Sin Depto.';
            counts[dept] = (counts[dept] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [officials]);

    // 2. Mejora: Ausentes hoy
    const absentToday = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return absences.filter(a => {
            const start = new Date(a.startDate);
            const end = new Date(a.endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            return today >= start && today <= end;
        });
    }, [absences]);

    // 4. Mejora: Cumpleaños del mes
    const monthBirthdays = useMemo(() => {
        const currentMonth = new Date().getMonth();
        return officials.filter(o => {
            if (!o.birthDate) return false;
            const bDate = new Date(o.birthDate);
            return bDate.getMonth() === currentMonth;
        }).sort((a, b) => {
            const dayA = new Date(a.birthDate!).getDate();
            const dayB = new Date(b.birthDate!).getDate();
            return dayA - dayB;
        });
    }, [officials]);

    // 5. Mejora: Registros recientes
    const recentAbsences = useMemo(() => {
        return [...absences].reverse().slice(0, 5);
    }, [absences]);

    const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-lg">
                    <Users className="w-8 h-8 opacity-50 mb-4" />
                    <p className="text-indigo-100 text-sm font-bold uppercase tracking-wider">Total Funcionarios</p>
                    <h3 className="text-4xl font-black">{total}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <Send className="w-8 h-8 text-indigo-600 opacity-20 mb-4" />
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">Envíos Realizados</p>
                    <h3 className="text-4xl font-black text-slate-800">{sentCount}</h3>
                </div>
                <div onClick={() => onNavigate('database', { type: 'expiringSoon' })} className="bg-amber-50 p-6 rounded-2xl border border-amber-200 shadow-sm cursor-pointer hover:bg-amber-100 transition-colors">
                    <Clock className="w-8 h-8 text-amber-500 mb-4" />
                    <p className="text-amber-700 text-sm font-bold uppercase tracking-wider">Vencimientos (30d)</p>
                    <h3 className="text-4xl font-black text-amber-600">{expiringCount}</h3>
                </div>
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 shadow-sm">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-4" />
                    <p className="text-emerald-700 text-sm font-bold uppercase tracking-wider">Salud de Datos</p>
                    <h3 className="text-4xl font-black text-emerald-600">
                        {total > 0 ? Math.round(((total - missingRutCount) / total) * 100) : 0}%
                    </h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <NotificationSystem officials={officials} absences={absences} />
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-indigo-600" />
                            Alertas Prioritarias
                        </h3>
                        <div className="space-y-4">
                            {missingRutCount > 0 && (
                                <div onClick={() => onNavigate('database')} className="flex items-center justify-between p-4 bg-red-50 border border-red-100 rounded-xl cursor-pointer hover:bg-red-100 transition-colors thin-glow">
                                    <div className="flex items-center gap-3">
                                        <Fingerprint className="w-5 h-5 text-red-500" />
                                        <span className="text-sm font-bold text-red-900">{missingRutCount} funcionarios sin RUT registrado</span>
                                    </div>
                                    <span className="text-xs bg-red-200 text-red-700 px-3 py-1 rounded-full font-black">CORREGIR</span>
                                </div>
                            )}
                            {missingEmergencyCount > 0 && (
                                <div onClick={() => onNavigate('database')} className="flex items-center justify-between p-4 bg-rose-50 border border-rose-100 rounded-xl cursor-pointer hover:bg-rose-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Heart className="w-5 h-5 text-rose-500" />
                                        <span className="text-sm font-bold text-rose-900">{missingEmergencyCount} sin contacto de emergencia</span>
                                    </div>
                                    <span className="text-xs bg-rose-200 text-rose-700 px-3 py-1 rounded-full font-black">COMPLETAR</span>
                                </div>
                            )}
                            {expiringCount > 0 && (
                                <div className="space-y-2">
                                    <div onClick={() => onNavigate('database', { type: 'expiringSoon' })} className="flex items-center justify-between p-4 bg-amber-50 border border-amber-100 rounded-xl cursor-pointer hover:bg-amber-100 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <Clock className="w-5 h-5 text-amber-500" />
                                            <span className="text-sm font-bold text-amber-900">{expiringCount} contratos vencen en los próximos 30 días</span>
                                        </div>
                                        <span className="text-xs bg-amber-200 text-amber-700 px-3 py-1 rounded-full font-black">REVISAR</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-4">
                                        {officials.filter(o => {
                                            if (!o.contractEndDate) return false;
                                            const end = new Date(o.contractEndDate);
                                            const today = new Date();
                                            const diff = (end.getTime() - today.getTime()) / (1000 * 3600 * 24);
                                            return diff >= 0 && diff <= 30;
                                        }).slice(0, 4).map(o => (
                                            <div key={o.id} className="text-[10px] flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100 hover:border-amber-200 transition-colors">
                                                <span className="font-bold text-slate-700 truncate">{o.name}</span>
                                                <span className="text-amber-600 font-black">{o.contractEndDate}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {total === 0 && (
                                <p className="text-slate-400 italic text-center py-8">No hay alertas activas. Importe datos para comenzar.</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <BarChart className="w-5 h-5 text-indigo-600" />
                            Distribución por Departamento
                        </h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={departmentData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                        {departmentData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-indigo-600" />
                                Registros Recientes
                            </h3>
                            <button onClick={() => onNavigate('absenteeism')} className="text-xs font-black text-indigo-600 hover:underline flex items-center gap-1">
                                VER TODO <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            {recentAbsences.length === 0 ? (
                                <p className="text-center py-4 text-slate-400 italic text-sm">No hay registros de ausencia.</p>
                            ) : (
                                recentAbsences.map(a => {
                                    const official = officials.find(o => o.id === a.officialId);
                                    return (
                                        <div key={a.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center font-black text-[10px] text-indigo-600 shadow-sm">
                                                    {official?.name.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-800">{official?.name || 'Desconocido'}</p>
                                                    <p className="text-[10px] text-slate-500">{a.type} • {a.startDate}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => official && generateAbsencePDF(a, official)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 shadow-sm">
                        <h3 className="text-sm font-black text-indigo-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> Ausentes Hoy
                        </h3>
                        <div className="space-y-3">
                            {absentToday.length === 0 ? (
                                <p className="text-xs text-indigo-400 italic">No hay ausencias hoy.</p>
                            ) : (
                                absentToday.map(a => {
                                    const official = officials.find(o => o.id === a.officialId);
                                    return (
                                        <div key={a.id} className="flex items-center gap-3 p-3 bg-white/50 rounded-xl border border-indigo-100/50">
                                            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">
                                                {official?.name.charAt(0) || '?'}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-indigo-900 truncate">{official?.name || 'Desconocido'}</p>
                                                <p className="text-[10px] text-indigo-600 font-medium">{a.type}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* 5. Centro de Celebraciones (Mejorado) */}
                    <div className="bg-gradient-to-br from-rose-50 to-amber-50 p-6 rounded-2xl border border-rose-100 shadow-sm">
                        <h3 className="text-sm font-black text-rose-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Gift className="w-4 h-4" /> Centro de Celebraciones
                        </h3>
                        <div className="space-y-4">
                            {/* Birthdays Section */}
                            <div>
                                <p className="text-[9px] font-black text-rose-500 uppercase mb-2 tracking-tighter">Cumpleaños del Mes</p>
                                <div className="space-y-2">
                                    {monthBirthdays.length === 0 ? (
                                        <p className="text-[10px] text-rose-400 italic">No hay cumpleaños este mes.</p>
                                    ) : (
                                        monthBirthdays.slice(0, 5).map(o => (
                                            <div key={o.id} className="flex items-center justify-between p-2.5 bg-white/60 rounded-xl border border-rose-100/50 hover:bg-white transition-colors">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <div className="w-5 h-5 rounded-lg bg-rose-500 text-white flex items-center justify-center text-[9px] font-black">
                                                        {o.name.charAt(0)}
                                                    </div>
                                                    <p className="text-[10px] font-bold text-rose-900 truncate">{o.name}</p>
                                                </div>
                                                <span className="text-[9px] font-black text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">
                                                    {new Date(o.birthDate!).getDate()}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Anniversaries Section */}
                            <div className="pt-2 border-t border-rose-100/50">
                                <p className="text-[9px] font-black text-amber-600 uppercase mb-2 tracking-tighter">Aniversarios Laborales</p>
                                <div className="space-y-2">
                                    {officials.filter(o => {
                                        if (!o.entryDate) return false;
                                        const entry = new Date(o.entryDate);
                                        return entry.getMonth() === new Date().getMonth();
                                    }).length === 0 ? (
                                        <p className="text-[10px] text-amber-400 italic">No hay aniversarios este mes.</p>
                                    ) : (
                                        officials.filter(o => {
                                            if (!o.entryDate) return false;
                                            const entry = new Date(o.entryDate);
                                            return entry.getMonth() === new Date().getMonth();
                                        }).sort((a, b) => new Date(a.entryDate!).getDate() - new Date(b.entryDate!).getDate()).slice(0, 5).map(o => {
                                            const years = new Date().getFullYear() - new Date(o.entryDate!).getFullYear();
                                            if (years === 0) return null;
                                            return (
                                                <div key={o.id} className="flex items-center justify-between p-2.5 bg-white/60 rounded-xl border border-amber-100/50 hover:bg-white transition-colors">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <div className="w-5 h-5 rounded-lg bg-amber-500 text-white flex items-center justify-center text-[9px] font-black">
                                                            <Gift className="w-3 h-3" />
                                                        </div>
                                                        <p className="text-[10px] font-bold text-amber-900 truncate">{o.name}</p>
                                                    </div>
                                                    <span className="text-[9px] font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                                                        {years} {years === 1 ? 'AÑO' : 'AÑOS'}
                                                    </span>
                                                </div>
                                            );
                                        }).filter(Boolean)
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 p-8 rounded-2xl text-white shadow-xl">
                        <h3 className="text-xl font-bold mb-2">Acciones Rápidas</h3>
                        <p className="text-slate-400 text-sm mb-8">Administre su base de datos masivamente.</p>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={onImport} className="flex flex-col items-center justify-center p-4 bg-slate-800 rounded-xl hover:bg-slate-700 transition-all border border-slate-700 group">
                                <Upload className="w-6 h-6 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold uppercase tracking-widest">Importar</span>
                            </button>
                            <button onClick={onExportExcel} className="flex flex-col items-center justify-center p-4 bg-slate-800 rounded-xl hover:bg-slate-700 transition-all border border-slate-700 group">
                                <FileSpreadsheet className="w-6 h-6 text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold uppercase tracking-widest">Excel</span>
                            </button>
                            <button onClick={onNewOfficial} className="col-span-2 flex items-center justify-center gap-2 p-4 bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-all font-black uppercase text-xs">
                                <UserPlus className="w-4 h-4" />
                                Alta de Funcionario
                            </button>
                        </div>
                        <button onClick={() => onNavigate('generate')} className="w-full mt-6 py-4 bg-white text-slate-900 rounded-xl font-black uppercase text-sm hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
                            <Send className="w-4 h-4" />
                            Ir a Envíos Gmail
                        </button>
                        {isAdmin && (
                            <button onClick={onClearDatabase} className="w-full mt-4 py-3 bg-red-900/30 text-red-500 rounded-xl border border-red-900/50 hover:bg-red-900/50 transition-colors flex items-center justify-center gap-2 font-bold text-[10px] uppercase">
                                <Trash2 className="w-3 h-3" />
                                Borrar Todo
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
