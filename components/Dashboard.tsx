import React, { useMemo, useRef } from 'react';
import { Official, Gender, ViewState, FilterCriteria } from '../types';
import { Users, Upload, UserPlus, Send, AlertTriangle, CheckCircle2, Download, Save, RefreshCw, FileSpreadsheet, Trash2, Mail, Briefcase, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

interface DashboardProps {
    officials: Official[];
    sentHistory: string[];
    onNavigate: (view: ViewState, filter?: FilterCriteria) => void;
    onImport: () => void;
    onExportExcel: () => void;
    onNewOfficial: () => void;
    onExportBackup: () => void;
    onImportBackup: (file: File) => void;
    onClearDatabase: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
    officials,
    sentHistory,
    onNavigate,
    onImport,
    onExportExcel,
    onNewOfficial,
    onExportBackup,
    onImportBackup,
    onClearDatabase
}) => {
    const totalOfficials = officials.length;
    const backupInputRef = useRef<HTMLInputElement>(null);

    // Progress Stats
    const sentCount = officials.filter(o => sentHistory.includes(o.id)).length;
    const progressPercent = totalOfficials > 0 ? Math.round((sentCount / totalOfficials) * 100) : 0;

    // Gender Stats
    const maleCount = officials.filter(o => o.gender === Gender.Male).length;
    const femaleCount = officials.filter(o => o.gender === Gender.Female).length;
    const unspecifiedCount = officials.filter(o => o.gender === Gender.Unspecified).length;

    const genderData = [
        { name: 'Hombres', value: maleCount, color: '#3b82f6' },
        { name: 'Mujeres', value: femaleCount, color: '#ec4899' },
        { name: 'Outros', value: unspecifiedCount, color: '#94a3b8' }
    ].filter(d => d.value > 0);

    // Health Checks
    const missingBossCount = officials.filter(o => !o.bossName).length;
    const unspecifiedGenderCount = unspecifiedCount;
    const invalidEmailCount = officials.filter(o => !o.email.includes('@')).length;
    const isHealthy = missingBossCount === 0 && unspecifiedGenderCount === 0 && invalidEmailCount === 0 && totalOfficials > 0;

    // Top Departments Logic
    const topDepartments = useMemo(() => {
        const counts: Record<string, number> = {};
        officials.forEach(o => {
            const dept = o.department || 'Sin Dept.';
            counts[dept] = (counts[dept] || 0) + 1;
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5); // Take top 5
    }, [officials]);

    const maxDeptCount = topDepartments[0]?.[1] || 1;

    const handleBackupImportClick = () => {
        if (backupInputRef.current) {
            backupInputRef.current.value = '';
            backupInputRef.current.click();
        }
    };

    const handleBackupFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onImportBackup(file);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">

            {/* Hidden input for backup restore */}
            <input
                type="file"
                ref={backupInputRef}
                onChange={handleBackupFileChange}
                className="hidden"
                accept=".json"
            />

            {/* 1. Bento Box Row 1: Greetings & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Hero Card */}
                <div className="glass-panel bento-card lg:col-span-3 p-8 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/20 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:bg-primary-500/30 transition-colors duration-700"></div>
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-500/20 rounded-full blur-[60px] -ml-10 -mb-10 group-hover:bg-indigo-500/30 transition-colors duration-700"></div>

                    <div className="relative z-10">
                        <h2 className="text-3xl font-extrabold text-white mb-2 leading-tight">Panel de Control <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-indigo-400">Premium</span></h2>
                        <p className="text-slate-400 text-sm max-w-lg mb-8">
                            Gestiona tu base de datos y campañas con una interfaz fluida. Has contactado al <strong className="text-primary-400">{progressPercent}%</strong> de tu registro actual.
                        </p>
                    </div>

                    <div className="relative z-10 mt-auto">
                        <div className="flex justify-between items-end mb-3">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Progreso Campaña</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-white">{sentCount}</span>
                                    <span className="text-sm font-medium text-slate-500">/ {totalOfficials} enviados</span>
                                </div>
                            </div>
                        </div>
                        <div className="w-full bg-dark-950/50 rounded-full h-3 overflow-hidden border border-white/5 shadow-inner">
                            <div
                                className="bg-gradient-to-r from-primary-600 to-indigo-500 h-full rounded-full transition-all duration-1000 ease-out relative"
                                style={{ width: `${progressPercent}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-pulse-slow"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions (Vertical) */}
                <div className="glass-panel bento-card p-6 flex flex-col gap-3">
                    <h3 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary-400" />
                        Acciones
                    </h3>
                    <button
                        onClick={() => onNavigate('generate')}
                        className="w-full glass-button group relative overflow-hidden flex items-center justify-center gap-2 p-3.5 rounded-xl font-bold text-sm text-white border border-primary-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_25px_rgba(99,102,241,0.4)]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-indigo-600 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                        <Send className="w-4 h-4 relative z-10" />
                        <span className="relative z-10">Enviar Correos</span>
                    </button>

                    <div className="grid grid-cols-2 gap-3 mt-2">
                        <button
                            onClick={onNewOfficial}
                            className="flex flex-col items-center justify-center gap-1.5 p-3 bg-dark-800/50 hover:bg-dark-700/50 border border-white/5 rounded-xl font-semibold text-[10px] text-slate-300 transition-all hover:-translate-y-1 hover:border-slate-600"
                        >
                            <UserPlus className="w-5 h-5 text-blue-400" />
                            Crear
                        </button>
                        <button
                            onClick={onImport}
                            className="flex flex-col items-center justify-center gap-1.5 p-3 bg-dark-800/50 hover:bg-dark-700/50 border border-white/5 rounded-xl font-semibold text-[10px] text-slate-300 transition-all hover:-translate-y-1 hover:border-emerald-500/50"
                        >
                            <Upload className="w-5 h-5 text-emerald-400" />
                            Importar
                        </button>
                        <button
                            onClick={onExportExcel}
                            className="flex flex-col items-center justify-center gap-1.5 p-3 bg-dark-800/50 hover:bg-dark-700/50 border border-white/5 rounded-xl font-semibold text-[10px] text-slate-300 transition-all hover:-translate-y-1 hover:border-purple-500/50"
                        >
                            <FileSpreadsheet className="w-5 h-5 text-purple-400" />
                            Exportar
                        </button>
                        <button
                            onClick={onClearDatabase}
                            className="flex flex-col items-center justify-center gap-1.5 p-3 bg-dark-800/50 hover:bg-red-900/20 border border-white/5 hover:border-red-500/30 rounded-xl font-semibold text-[10px] text-slate-300 hover:text-red-400 transition-all hover:-translate-y-1"
                        >
                            <Trash2 className="w-5 h-5 text-red-400" />
                            Limpiar
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Bento Box Row 2: Analytics & Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Distribution (Donut Chart) */}
                <div className="glass-panel bento-card p-6 flex flex-col relative h-[320px]">
                    <h3 className="font-bold text-slate-300 text-sm mb-4">Distribución Demográfica</h3>

                    {totalOfficials === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                            <Users className="w-8 h-8 mb-2 opacity-50" />
                            <p className="text-sm">Sin datos</p>
                        </div>
                    ) : (
                        <div className="flex-1 w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={genderData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {genderData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-3xl font-black text-white">{totalOfficials}</span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total</span>
                            </div>
                        </div>
                    )}
                    <div className="mt-2 flex flex-wrap justify-center gap-3">
                        {genderData.map(d => (
                            <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></span>
                                {d.name}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Departments */}
                <div className="glass-panel bento-card p-6 flex flex-col h-[320px]">
                    <h3 className="font-bold text-slate-300 text-sm mb-4 flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-primary-400" />
                        Top Áreas
                    </h3>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {topDepartments.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                <p className="text-sm">No hay datos suficientes</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {topDepartments.map(([name, count], index) => (
                                    <div
                                        key={name}
                                        className="relative cursor-pointer group"
                                        onClick={() => onNavigate('database', { type: 'department', value: name === 'Sin Dept.' ? '' : name })}
                                    >
                                        <div className="flex justify-between items-end mb-1.5 z-10 relative">
                                            <span className="text-slate-300 text-sm font-semibold truncate pr-4 group-hover:text-primary-300 transition-colors">{name}</span>
                                            <span className="text-xs font-bold text-slate-500 bg-dark-900/50 px-2 py-0.5 rounded-md">{count}</span>
                                        </div>
                                        <div className="w-full bg-dark-900/50 h-1.5 rounded-full overflow-hidden border border-white/5">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${index === 0 ? 'bg-gradient-to-r from-primary-500 to-indigo-400' : 'bg-slate-600'}`}
                                                style={{ width: `${(count / maxDeptCount) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Database Health */}
                <div className="glass-panel bento-card p-6 flex flex-col h-[320px]">
                    <h3 className="font-bold text-slate-300 mb-4 text-sm flex items-center justify-between">
                        Integridad de Datos
                        {isHealthy && totalOfficials > 0 && <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] uppercase font-bold border border-emerald-500/20">Óptima</span>}
                    </h3>

                    {totalOfficials === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                            <p className="text-sm">Base de datos vacía</p>
                        </div>
                    ) : isHealthy ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                            <div className="relative">
                                <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse"></div>
                                <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-4 relative z-10">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                                </div>
                            </div>
                            <h4 className="font-bold text-white mb-1">Todo en orden</h4>
                            <p className="text-xs text-slate-400">La información crítica está completa.</p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                            {missingBossCount > 0 && (
                                <div
                                    onClick={() => onNavigate('database', { type: 'missingBoss' })}
                                    className="flex items-center gap-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl cursor-pointer hover:bg-orange-500/20 transition-colors group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                        <AlertTriangle className="w-5 h-5 text-orange-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{missingBossCount} Sin Jefatura</p>
                                        <p className="text-xs text-orange-400/80">Requerido para flujos de copia.</p>
                                    </div>
                                </div>
                            )}
                            {unspecifiedGenderCount > 0 && (
                                <div
                                    onClick={() => onNavigate('database', { type: 'missingGender' })}
                                    className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl cursor-pointer hover:bg-amber-500/20 transition-colors group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{unspecifiedGenderCount} Sin Género</p>
                                        <p className="text-xs text-amber-400/80">Click para auto-detectar.</p>
                                    </div>
                                </div>
                            )}
                            {invalidEmailCount > 0 && (
                                <div
                                    onClick={() => onNavigate('database', { type: 'invalidEmail' })}
                                    className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl cursor-pointer hover:bg-red-500/20 transition-colors group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                        <Mail className="w-5 h-5 text-red-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{invalidEmailCount} Correos Inválidos</p>
                                        <p className="text-xs text-red-400/80">Formato incorrecto.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 3. Backup Section (Spans columns) */}
                <div className="glass-panel bento-card p-6 md:col-span-2 lg:col-span-3 flex flex-col sm:flex-row items-center justify-between gap-6 border-slate-700/50 bg-gradient-to-r from-dark-800/80 to-dark-900/80">
                    <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center border border-white/5 shadow-inner">
                            <Save className="w-6 h-6 text-slate-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-base mb-1">Copia de Seguridad del Entorno</h3>
                            <p className="text-sm text-slate-400 max-w-2xl">
                                Asegura tus plantillas, historiales y configuraciones locales descargando un archivo de restauración.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 w-full sm:w-auto">
                        <button
                            onClick={handleBackupImportClick}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-dark-800/80 hover:bg-dark-700 border border-white/10 rounded-xl text-sm font-semibold text-slate-300 transition-all hover:-translate-y-0.5"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Restaurar
                        </button>
                        <button
                            onClick={onExportBackup}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 backdrop-blur-sm"
                        >
                            <Download className="w-4 h-4" />
                            Exportar
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}