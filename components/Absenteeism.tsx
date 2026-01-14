import React, { useState, useMemo } from 'react';
import { Official, AbsenceRecord, AbsenceType, AbsenceConfig } from '../types';
import { Calendar, Plus, Trash2, Search, Filter, User, FileText, Download, TrendingUp } from 'lucide-react';
import { generateAbsencePDF } from '../services/reportService';
import { calculateProgressiveDays, calculateProportionalDays } from '../utils';

interface AbsenteeismProps {
    officials: Official[];
    absences: AbsenceRecord[];
    onAddAbsence: (absence: Omit<AbsenceRecord, 'id'>) => void;
    onDeleteAbsence: (id: string) => void;
    onToast: (message: string, type: 'success' | 'error' | 'info') => void;
    config: AbsenceConfig;
}

export const Absenteeism: React.FC<AbsenteeismProps> = ({
    officials,
    absences,
    onAddAbsence,
    onDeleteAbsence,
    onToast,
    config
}) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Form state
    const [selectedOfficialId, setSelectedOfficialId] = useState('');
    const [absenceType, setAbsenceType] = useState<string>(AbsenceType.FeriadoLegal);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [days, setDays] = useState(1);
    const [description, setDescription] = useState('');

    const resetForm = () => {
        setSelectedOfficialId('');
        setAbsenceType(AbsenceType.FeriadoLegal);
        setStartDate('');
        setEndDate('');
        setDays(1);
        setDescription('');
    };

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOfficialId || !startDate || !endDate) {
            onToast("Por favor complete los campos obligatorios", "error");
            return;
        }

        onAddAbsence({
            officialId: selectedOfficialId,
            type: absenceType as any,
            startDate,
            endDate,
            days,
            description
        });

        onToast("Registro de ausentismo añadido", "success");
        setShowAddForm(false);
        resetForm();
    };

    const getUsage = (officialId: string) => {
        const officialAbsences = absences.filter(a => a.officialId === officialId);
        const legalUsed = officialAbsences.filter(a => a.type === AbsenceType.FeriadoLegal).reduce((sum, a) => sum + a.days, 0);
        const adminUsed = officialAbsences.filter(a => a.type === AbsenceType.PermisoAdministrativo).reduce((sum, a) => sum + a.days, 0);

        // Custom usage
        const customUsage: Record<string, number> = {};
        (config.customLeaves || []).forEach(cl => {
            customUsage[cl.name] = officialAbsences.filter(a => a.type === cl.name).reduce((sum, a) => sum + a.days, 0);
        });

        return { legalUsed, adminUsed, customUsage };
    };

    const usageInfo = useMemo(() => {
        if (!selectedOfficialId) return null;
        const official = officials.find(o => o.id === selectedOfficialId);
        const progressiveDays = calculateProgressiveDays(official?.entryDate, official?.recognizedYears || 0);
        const proportionalDays = calculateProportionalDays(official?.entryDate, config.legalHolidayLimit);
        const { legalUsed, adminUsed, customUsage } = getUsage(selectedOfficialId);

        const totalLegalLimit = config.legalHolidayLimit + progressiveDays;

        const customInfo = (config.customLeaves || []).map(cl => ({
            name: cl.name,
            used: customUsage[cl.name] || 0,
            limit: cl.limit,
            remaining: cl.limit - (customUsage[cl.name] || 0)
        }));

        return {
            legal: {
                used: legalUsed,
                limit: totalLegalLimit,
                base: config.legalHolidayLimit,
                progressive: progressiveDays,
                proportional: proportionalDays,
                remaining: Math.floor((totalLegalLimit - legalUsed) * 100) / 100
            },
            admin: {
                used: adminUsed,
                limit: config.administrativeLeaveLimit,
                remaining: config.administrativeLeaveLimit - adminUsed
            },
            custom: customInfo
        };
    }, [selectedOfficialId, absences, config, officials]);

    const filteredAbsences = absences.filter(absence => {
        const official = officials.find(o => o.id === absence.officialId);
        if (!official) return false;
        return official.name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center text-slate-800">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Calendar className="text-indigo-600" /> Gestión de Ausentismo
                    </h2>
                    <p className="text-slate-500 text-sm">Control de feriados, permisos administrativos y especiales</p>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 shadow-md hover:bg-indigo-700 transition-colors"
                >
                    <Plus className="w-4 h-4" /> Registrar Ausencia
                </button>
            </div>

            {showAddForm && (
                <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm animate-in slide-in-from-top duration-300">
                    <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Funcionario</label>
                            <select
                                value={selectedOfficialId}
                                onChange={(e) => setSelectedOfficialId(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="">Seleccione un funcionario...</option>
                                {officials.map(o => (
                                    <option key={o.id} value={o.id}>{o.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Ausencia</label>
                            <select
                                value={absenceType}
                                onChange={(e) => setAbsenceType(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <optgroup label="Tipos Estándar">
                                    {Object.values(AbsenceType).map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </optgroup>
                                {config.customLeaves && config.customLeaves.length > 0 && (
                                    <optgroup label="Permisos Especiales">
                                        {config.customLeaves.map(cl => (
                                            <option key={cl.id} value={cl.name}>{cl.name}</option>
                                        ))}
                                    </optgroup>
                                )}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Días</label>
                            <input
                                type="number"
                                value={days}
                                onChange={(e) => setDays(Number(e.target.value))}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                min="0.5"
                                step="0.5"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Desde</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Hasta</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Descripción / Observación</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Opcional..."
                            />
                        </div>
                        <div className="md:col-span-3 flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => { setShowAddForm(false); resetForm(); }}
                                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700 transition-colors"
                            >
                                Guardar Registro
                            </button>
                        </div>
                    </form>

                    {usageInfo && (
                        <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 flex flex-col justify-between">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-emerald-700 uppercase">Resumen Feriado Legal</span>
                                            {usageInfo.legal.progressive > 0 && (
                                                <span className="text-[9px] font-black text-emerald-500 flex items-center gap-1 uppercase tracking-tighter">
                                                    <TrendingUp className="w-2.5 h-2.5" /> Incluye {usageInfo.legal.progressive} días progresivos
                                                </span>
                                            )}
                                            <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-1 uppercase tracking-tighter">
                                                <Calendar className="w-2.5 h-2.5" /> Ganados a la fecha: {usageInfo.legal.proportional} días
                                            </span>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${usageInfo.legal.remaining < 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                            {usageInfo.legal.remaining < 0 ? 'Excedido' : 'Disponible'}
                                        </span>
                                    </div>
                                    <div className="flex items-end justify-between">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-black text-emerald-600">{usageInfo.legal.remaining}</span>
                                            <span className="text-xs text-emerald-600/60 font-medium">días restantes</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-emerald-500 font-bold uppercase">Consumido</p>
                                            <p className="text-sm font-black text-emerald-700">{usageInfo.legal.used} / {usageInfo.legal.limit}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 h-1.5 w-full bg-emerald-200/30 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-500 rounded-full ${usageInfo.legal.remaining < 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                            style={{ width: `${Math.min(100, (usageInfo.legal.used / usageInfo.legal.limit) * 100)}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 flex flex-col justify-between">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-black text-indigo-700 uppercase">Resumen Permiso Admin.</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${usageInfo.admin.remaining < 0 ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                            {usageInfo.admin.remaining < 0 ? 'Excedido' : 'Disponible'}
                                        </span>
                                    </div>
                                    <div className="flex items-end justify-between">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-black text-indigo-600">{usageInfo.admin.remaining}</span>
                                            <span className="text-xs text-indigo-600/60 font-medium">días restantes</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-indigo-500 font-bold uppercase">Consumido</p>
                                            <p className="text-sm font-black text-indigo-700">{usageInfo.admin.used} / {usageInfo.admin.limit}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 h-1.5 w-full bg-indigo-200/30 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-500 rounded-full ${usageInfo.admin.remaining < 0 ? 'bg-rose-500' : 'bg-indigo-500'}`}
                                            style={{ width: `${Math.min(100, (usageInfo.admin.used / usageInfo.admin.limit) * 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            {usageInfo.custom && usageInfo.custom.length > 0 && (
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    {usageInfo.custom.map(cl => (
                                        <div key={cl.name} className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                                            <p className="text-[8px] font-black text-slate-400 uppercase mb-1 truncate">{cl.name}</p>
                                            <div className="flex items-baseline justify-between mb-1">
                                                <span className={`text-sm font-black ${cl.remaining < 0 ? 'text-rose-600' : 'text-slate-700'}`}>{cl.remaining}</span>
                                                <span className="text-[9px] text-slate-400">/{cl.limit}</span>
                                            </div>
                                            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${cl.remaining < 0 ? 'bg-rose-500' : 'bg-indigo-400'}`}
                                                    style={{ width: `${Math.min(100, (cl.used / cl.limit) * 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por funcionario..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                <th className="px-6 py-4">Funcionario</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4">Periodo</th>
                                <th className="px-6 py-4 text-center">Días</th>
                                <th className="px-6 py-4">Descripción</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredAbsences.length > 0 ? filteredAbsences.map(absence => {
                                const official = officials.find(o => o.id === absence.officialId);
                                return (
                                    <tr key={absence.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                                                    {official ? official.name.charAt(0) : '?'}
                                                </div>
                                                <span className="font-bold text-slate-800">{official ? official.name : 'Unknown'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${absence.type === AbsenceType.FeriadoLegal ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                absence.type === AbsenceType.PermisoAdministrativo ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                                                    'bg-amber-50 text-amber-600 border border-amber-100'
                                                }`}>
                                                {absence.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold">{absence.startDate} al {absence.endDate}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center font-black text-slate-700">
                                            {absence.days}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 italic max-w-xs truncate">
                                            {absence.description || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => official && generateAbsencePDF(absence, official)}
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors"
                                                    title="Generar Resolución PDF"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm("¿Eliminar este registro?")) onDeleteAbsence(absence.id);
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400 italic">
                                        No hay registros encontrados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
