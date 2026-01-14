import React, { useState } from 'react';
import { Official, AbsenceRecord, AbsenceType, AbsenceConfig, CompensatoryHourRecord } from '../types';
import { X, Calendar, FileText, Clock, Download, AlertCircle, TrendingUp, Sparkles, History } from 'lucide-react';
import { generateAbsencePDF, generateBalanceCertificatePDF } from '../services/reportService';
import { calculateProgressiveDays, calculateProportionalDays } from '../utils';
import { ProjectionSimulator } from './ProjectionSimulator';

interface AbsenceHistoryProps {
    official: Official;
    absences: AbsenceRecord[];
    compensatoryRecords: CompensatoryHourRecord[];
    config: AbsenceConfig;
    onClose: () => void;
}

export const AbsenceHistory: React.FC<AbsenceHistoryProps> = ({ official, absences, compensatoryRecords, config, onClose }) => {
    const [showSimulator, setShowSimulator] = useState(false);

    const formatHours = (decimalHours: number) => {
        const absValue = Math.abs(decimalHours);
        const h = Math.floor(absValue);
        const m = Math.round((absValue - h) * 60);
        const sign = decimalHours < 0 ? '-' : '';
        return `${sign}${h}h ${m}m`;
    };

    const officialAbsences = absences.filter(a => a.officialId === official.id)
        .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    const progressiveDays = calculateProgressiveDays(official.entryDate, official.recognizedYears || 0);
    const proportionalDays = calculateProportionalDays(official.entryDate, config.legalHolidayLimit);

    const officialCompRecords = compensatoryRecords.filter(r => r.officialId === official.id);
    const compensatoryEarned = officialCompRecords
        .filter(r => r.type === 'Requirement')
        .reduce((sum, r) => sum + r.totalCalculated, 0);
    const compensatoryUsed = officialCompRecords
        .filter(r => r.type === 'Compensation')
        .reduce((sum, r) => sum + r.hours, 0);

    const stats = {
        legal: officialAbsences.filter(a => a.type === AbsenceType.FeriadoLegal).reduce((sum, a) => sum + a.days, 0),
        admin: officialAbsences.filter(a => a.type === AbsenceType.PermisoAdministrativo).reduce((sum, a) => sum + a.days, 0),
        other: officialAbsences.filter(a => a.type !== AbsenceType.FeriadoLegal && a.type !== AbsenceType.PermisoAdministrativo)
            .reduce((sum, a) => sum + a.days, 0),
        progressive: progressiveDays,
        proportional: proportionalDays,
        baseLimit: config.legalHolidayLimit,
        balance: Math.floor((proportionalDays + progressiveDays - officialAbsences.filter(a => a.type === AbsenceType.FeriadoLegal).reduce((sum, a) => sum + a.days, 0)) * 100) / 100,
        compensatoryEarned,
        compensatoryUsed,
        compensatoryBalance: compensatoryEarned - compensatoryUsed
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg ring-4 ring-indigo-50">
                            {official.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">{official.name}</h2>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{official.position} • {official.rut}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => generateBalanceCertificatePDF(official, stats)}
                            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all font-bold text-[10px] uppercase tracking-wider"
                        >
                            <Download className="w-3.5 h-3.5" /> Certificado de Saldo
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white border-b border-slate-50">
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-1">
                                <p className="text-[10px] font-black text-emerald-600 uppercase">Feriado Legal</p>
                                {(() => {
                                    const totalAnnualLimit = config.legalHolidayLimit + stats.progressive;
                                    const accumulated = stats.proportional + stats.progressive - stats.legal;
                                    if (accumulated > (totalAnnualLimit * 2)) {
                                        return (
                                            <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[8px] font-black rounded-md flex items-center gap-1 animate-pulse border border-rose-200">
                                                <AlertCircle className="w-2.5 h-2.5" /> +2 PERIODOS
                                            </span>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                            <div className="flex items-baseline justify-between">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-emerald-700">{stats.legal}</span>
                                    <span className="text-xs font-bold text-emerald-500">días</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-emerald-600 flex items-center justify-end gap-1">
                                        <TrendingUp className="w-2.5 h-2.5" /> +{stats.progressive} PROG.
                                    </p>
                                    <p className="text-[8px] font-black text-emerald-700">
                                        Saldo: {stats.balance}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                        <p className="text-[10px] font-black text-indigo-600 uppercase mb-1">Permiso Admin.</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-indigo-700">{stats.admin}</span>
                            <span className="text-xs font-bold text-indigo-500">días util.</span>
                        </div>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                        <p className="text-[10px] font-black text-amber-600 uppercase mb-1">Otros Permisos</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-amber-700">{stats.other}</span>
                            <span className="text-xs font-bold text-amber-500">días util.</span>
                        </div>
                    </div>
                    <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-700">
                        <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Horas Compensatorias</p>
                        <div className="flex flex-col">
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-white">{formatHours(stats.compensatoryBalance)}</span>
                            </div>
                            <p className="text-[9px] font-bold text-slate-400 mt-1">Utilizado: {formatHours(stats.compensatoryUsed)}</p>
                        </div>
                    </div>
                </div>

                {/* Content Toggle */}
                <div className="flex border-b border-slate-100">
                    <button
                        onClick={() => setShowSimulator(false)}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${!showSimulator ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'bg-slate-50 text-slate-400'}`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <History className="w-4 h-4" /> Historial
                        </div>
                    </button>
                    <button
                        onClick={() => setShowSimulator(true)}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${showSimulator ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'bg-slate-50 text-slate-400'}`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Sparkles className="w-4 h-4" /> Simulador {showSimulator && '✦'}
                        </div>
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    {!showSimulator ? (
                        <>
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Clock className="w-4 h-4" /> Historial de Ausentismo
                            </h3>

                            {officialAbsences.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400 italic">
                                    <FileText className="w-12 h-12 opacity-20 mb-2" />
                                    <p>No se registran ausencias para este funcionario.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {officialAbsences.map(absence => (
                                        <div key={absence.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm ${absence.type === AbsenceType.FeriadoLegal ? 'bg-emerald-100 text-emerald-600' :
                                                    absence.type === AbsenceType.PermisoAdministrativo ? 'bg-indigo-100 text-indigo-600' :
                                                        'bg-amber-100 text-amber-600'
                                                    }`}>
                                                    <Calendar className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${absence.type === AbsenceType.FeriadoLegal ? 'bg-emerald-50 text-emerald-700' :
                                                            absence.type === AbsenceType.PermisoAdministrativo ? 'bg-indigo-50 text-indigo-700' :
                                                                'bg-amber-50 text-amber-700'
                                                            }`}>
                                                            {absence.type}
                                                        </span>
                                                        <span className="text-xs font-black text-slate-700">{absence.days} días</span>
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-500 mt-0.5">
                                                        {absence.startDate} al {absence.endDate}
                                                    </p>
                                                    {absence.description && (
                                                        <p className="text-[10px] text-slate-400 italic mt-1 max-w-md truncate">"{absence.description}"</p>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => generateAbsencePDF(absence, official)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all flex items-center gap-2 text-xs font-bold"
                                                title="Descargar Resolución"
                                            >
                                                <Download className="w-4 h-4" />
                                                <span className="hidden sm:inline">PDF</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="animate-in fade-in zoom-in-95 duration-500">
                            <ProjectionSimulator official={official} absences={absences} config={config} />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
                        <AlertCircle className="w-3 h-3 text-indigo-400" />
                        {showSimulator ? 'Las proyecciones son estimaciones matemáticas basadas en la fecha de ingreso' : 'Historial generado automáticamente desde la base de datos local'}
                    </div>
                </div>
            </div>
        </div>
    );
};
