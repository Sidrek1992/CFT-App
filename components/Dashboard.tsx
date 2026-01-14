
import React, { useMemo } from 'react';
import { Official, Gender, ViewState, FilterCriteria } from '../types';
// Import Fingerprint icon
import { Users, Upload, UserPlus, Send, AlertTriangle, CheckCircle2, FileSpreadsheet, Clock, ShieldAlert, Heart, Fingerprint, Trash2 } from 'lucide-react';

interface DashboardProps {
    officials: Official[];
    sentHistory: string[];
    onNavigate: (view: ViewState, filter?: FilterCriteria) => void;
    onImport: () => void;
    onExportExcel: () => void;
    onNewOfficial: () => void;
    onClearDatabase: () => void;
    isAdmin: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ officials, sentHistory, onNavigate, onImport, onExportExcel, onNewOfficial, onClearDatabase, isAdmin }) => {
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
                <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-indigo-600" />
                        Alertas Prioritarias
                    </h3>
                    <div className="space-y-4">
                        {missingRutCount > 0 && (
                            <div onClick={() => onNavigate('database')} className="flex items-center justify-between p-4 bg-red-50 border border-red-100 rounded-xl cursor-pointer hover:bg-red-100 transition-colors">
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
                                        <div key={o.id} className="text-[10px] flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100">
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
                        {isAdmin && (
                            <div className="pt-4 mt-4 border-t border-slate-100">
                                <button onClick={onClearDatabase} className="w-full py-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 hover:bg-rose-100 transition-colors flex items-center justify-center gap-2 font-bold text-sm">
                                    <Trash2 className="w-4 h-4" />
                                    Limpiar Base de Datos Completa
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-2xl text-white shadow-xl flex flex-col justify-between">
                    <div>
                        <h3 className="text-xl font-bold mb-2">Acciones Rápidas</h3>
                        <p className="text-slate-400 text-sm mb-8">Administre su base de datos de funcionarios de forma masiva.</p>
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
                    </div>
                    <button onClick={() => onNavigate('generate')} className="w-full mt-8 py-4 bg-white text-slate-900 rounded-xl font-black uppercase text-sm hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
                        <Send className="w-4 h-4" />
                        Ir a Envíos Gmail
                    </button>
                </div>
            </div>
        </div>
    );
}
