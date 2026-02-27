import React, { useMemo, useRef, useState } from 'react';
import { Official, Gender, ViewState, FilterCriteria, Campaign, EmailLog } from '../types';
import {
    Users, Upload, UserPlus, Send, AlertTriangle, CheckCircle2,
    Download, Save, RefreshCw, FileSpreadsheet, Trash2, Mail,
    Briefcase, Activity, TrendingUp, Clock, MessageSquare,
    Eye, Zap, BarChart2, Award, Target, MousePointerClick
} from 'lucide-react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    BarChart, Bar, Legend, ComposedChart, Line
} from 'recharts';

interface DashboardProps {
    officials: Official[];
    campaigns: Campaign[];
    sentHistory: string[];
    onNavigate: (view: ViewState, filter?: FilterCriteria) => void;
    onImport: () => void;
    onExportExcel: () => void;
    onNewOfficial: () => void;
    onExportBackup: () => void;
    onImportBackup: (file: File) => void;
    onClearDatabase: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getDayKey = (ts: number) => new Date(ts).toISOString().slice(0, 10);

const buildTimeline = (campaigns: Campaign[], days: 7 | 30 | 90) => {
    const now = Date.now();
    const msPerDay = 86400000;
    const entries: { date: string; enviados: number; abiertos: number }[] = [];

    const keyToIndex: Record<string, number> = {};
    for (let i = days - 1; i >= 0; i--) {
        const dayStart = now - i * msPerDay;
        const key = getDayKey(dayStart);
        const d = new Date(dayStart);
        keyToIndex[key] = days - 1 - i;
        entries.push({
            date: d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }),
            enviados: 0,
            abiertos: 0,
        });
    }

    campaigns.forEach(c => {
        c.logs?.forEach(log => {
            if (log.status === 'sent') {
                const key = getDayKey(log.sentAt);
                if (keyToIndex[key] !== undefined) {
                    entries[keyToIndex[key]].enviados++;
                }
            }
            if (log.openedAt) {
                const key = getDayKey(log.openedAt);
                if (keyToIndex[key] !== undefined) {
                    entries[keyToIndex[key]].abiertos++;
                }
            }
        });
    });

    return entries;
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
interface KPICardProps {
    label: string;
    value: string | number;
    sub?: string;
    icon: React.ReactNode;
    color: string; // tailwind bg class for icon bg
    trend?: { value: number; label: string };
}

const KPICard: React.FC<KPICardProps> = ({ label, value, sub, icon, color, trend }) => (
    <div className="glass-panel bento-card p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
            <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                {icon}
            </div>
            {trend !== undefined && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${trend.value >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                    {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
                </span>
            )}
        </div>
        <div>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-0.5">{label}</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{value}</p>
            {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub}</p>}
        </div>
    </div>
);

// ─── Custom tooltip ───────────────────────────────────────────────────────────
const darkTooltipStyle = {
    backgroundColor: 'rgba(15,23,42,0.92)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    fontSize: '12px',
    color: '#fff',
};

// ─── Component ────────────────────────────────────────────────────────────────

export const Dashboard: React.FC<DashboardProps> = ({
    officials,
    campaigns,
    sentHistory,
    onNavigate,
    onImport,
    onExportExcel,
    onNewOfficial,
    onExportBackup,
    onImportBackup,
    onClearDatabase,
}) => {
    const totalOfficials = officials.length;
    const backupInputRef = useRef<HTMLInputElement>(null);
    const [timelineDays, setTimelineDays] = useState<7 | 30 | 90>(30);

    // ── Basic progress ──────────────────────────────────────────────────────
    const sentCount = officials.filter(o => sentHistory.includes(o.id)).length;
    const progressPercent = totalOfficials > 0 ? Math.round((sentCount / totalOfficials) * 100) : 0;

    // ── Gender ──────────────────────────────────────────────────────────────
    const maleCount   = officials.filter(o => o.gender === Gender.Male).length;
    const femaleCount = officials.filter(o => o.gender === Gender.Female).length;
    const unspecifiedCount = officials.filter(o => o.gender === Gender.Unspecified).length;

    const genderData = [
        { name: 'Hombres', value: maleCount,      color: '#3b82f6' },
        { name: 'Mujeres', value: femaleCount,     color: '#ec4899' },
        { name: 'Outros',  value: unspecifiedCount, color: '#94a3b8' },
    ].filter(d => d.value > 0);

    // ── Health checks ───────────────────────────────────────────────────────
    const missingBossCount    = officials.filter(o => !o.bossName).length;
    const invalidEmailCount   = officials.filter(o => !o.email.includes('@')).length;
    const isHealthy = missingBossCount === 0 && unspecifiedCount === 0 && invalidEmailCount === 0 && totalOfficials > 0;

    // ── Flatten all logs ────────────────────────────────────────────────────
    const allLogs: EmailLog[] = useMemo(
        () => campaigns.flatMap(c => c.logs ?? []),
        [campaigns]
    );

    // ── Email analytics KPIs ────────────────────────────────────────────────
    const emailAnalytics = useMemo(() => {
        const totalSent   = allLogs.filter(l => l.status === 'sent').length;
        const totalOpened = allLogs.filter(l => l.openedAt).length;
        const openRate    = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;

        // Method breakdown
        const byMethod: Record<string, number> = { gmail_api: 0, eml: 0, mailto: 0 };
        allLogs.forEach(l => { byMethod[l.method] = (byMethod[l.method] || 0) + 1; });
        const topMethod = Object.entries(byMethod).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

        // Avg sends per campaign
        const activeCampaigns = campaigns.filter(c => (c.logs?.length ?? 0) > 0).length;
        const avgSends = activeCampaigns > 0 ? Math.round(totalSent / activeCampaigns) : 0;

        // Open count last 7 days
        const cutoff7d = Date.now() - 7 * 86400000;
        const opens7d  = allLogs.filter(l => l.openedAt && l.openedAt > cutoff7d).length;

        return { totalSent, totalOpened, openRate, topMethod, avgSends, opens7d, byMethod };
    }, [allLogs, campaigns]);

    // ── Campaign bar chart data ─────────────────────────────────────────────
    const campaignBarData = useMemo(() => {
        return campaigns
            .filter(c => (c.logs?.length ?? 0) > 0)
            .map(c => {
                const sent   = c.logs.filter(l => l.status === 'sent').length;
                const opened = c.logs.filter(l => l.openedAt).length;
                const rate   = sent > 0 ? Math.round((opened / sent) * 100) : 0;
                return {
                    name: c.name.length > 18 ? c.name.slice(0, 16) + '…' : c.name,
                    fullName: c.name,
                    enviados: sent,
                    abiertos: opened,
                    tasa: rate,
                };
            })
            .sort((a, b) => b.enviados - a.enviados)
            .slice(0, 7);
    }, [campaigns]);

    // ── Method pie data ─────────────────────────────────────────────────────
    const methodData = useMemo(() => {
        const labels: Record<string, string> = { gmail_api: 'Gmail API', eml: 'EML', mailto: 'Mailto' };
        const colors: Record<string, string> = { gmail_api: '#6366f1', eml: '#10b981', mailto: '#f59e0b' };
        return Object.entries(emailAnalytics.byMethod)
            .filter(([, v]) => v > 0)
            .map(([k, v]) => ({ name: labels[k] ?? k, value: v, color: colors[k] ?? '#94a3b8' }));
    }, [emailAnalytics.byMethod]);

    // ── Top departments ─────────────────────────────────────────────────────
    const topDepartments = useMemo(() => {
        const counts: Record<string, number> = {};
        officials.forEach(o => {
            const dept = o.department || 'Sin Dept.';
            counts[dept] = (counts[dept] || 0) + 1;
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    }, [officials]);
    const maxDeptCount = topDepartments[0]?.[1] || 1;

    // ── Timeline ────────────────────────────────────────────────────────────
    const timelineData = useMemo(
        () => buildTimeline(campaigns, timelineDays),
        [campaigns, timelineDays]
    );
    const totalInPeriod  = timelineData.reduce((acc, d) => acc + d.enviados, 0);
    const openedInPeriod = timelineData.reduce((acc, d) => acc + d.abiertos, 0);

    // ── Last campaigns table ────────────────────────────────────────────────
    const recentCampaigns = useMemo(() => {
        return [...campaigns]
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 5)
            .map(c => {
                const sent   = c.logs?.filter(l => l.status === 'sent').length ?? 0;
                const opened = c.logs?.filter(l => l.openedAt).length ?? 0;
                const rate   = sent > 0 ? Math.round((opened / sent) * 100) : 0;
                const methods = [...new Set(c.logs?.map(l => l.method) ?? [])];
                return { id: c.id, name: c.name, createdAt: c.createdAt, sent, opened, rate, methods };
            });
    }, [campaigns]);

    const handleBackupImportClick = () => {
        if (backupInputRef.current) {
            backupInputRef.current.value = '';
            backupInputRef.current.click();
        }
    };

    const handleBackupFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onImportBackup(file);
    };

    const methodLabel: Record<string, string> = { gmail_api: 'Gmail API', eml: 'EML', mailto: 'Mailto' };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <input type="file" ref={backupInputRef} onChange={handleBackupFileChange} className="hidden" accept=".json" />

            {/* ── Row 1: Hero + Quick Actions ────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Hero */}
                <div className="glass-panel bento-card lg:col-span-3 p-8 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/20 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:bg-primary-500/30 transition-colors duration-700" />
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-500/20 rounded-full blur-[60px] -ml-10 -mb-10 group-hover:bg-indigo-500/30 transition-colors duration-700" />
                    <div className="relative z-10">
                        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 leading-tight">
                            GDP Cloud <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-indigo-400">Gestor Email</span>
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 text-sm max-w-lg mb-8">
                            Gestiona tu base de datos y campañas con una interfaz fluida. Has contactado al <strong className="text-primary-400">{progressPercent}%</strong> de tu registro actual.
                        </p>
                    </div>
                    <div className="relative z-10 mt-auto">
                        <div className="flex justify-between items-end mb-3">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1">Progreso Campaña</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-slate-900 dark:text-white">{sentCount}</span>
                                    <span className="text-sm font-medium text-slate-500 dark:text-slate-500">/ {totalOfficials} enviados</span>
                                </div>
                            </div>
                        </div>
                        <div className="w-full bg-slate-50 dark:bg-dark-950/50 rounded-full h-3 overflow-hidden border border-slate-100 dark:border-white/5 shadow-inner">
                            <div className="bg-gradient-to-r from-primary-600 to-indigo-500 h-full rounded-full transition-all duration-1000 ease-out relative" style={{ width: `${progressPercent}%` }}>
                                <div className="absolute inset-0 bg-white/20 animate-pulse-slow" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="glass-panel bento-card p-6 flex flex-col gap-3">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary-400" />Acciones
                    </h3>
                    <button onClick={() => onNavigate('generate')} className="w-full glass-button group relative overflow-hidden flex items-center justify-center gap-2 p-3.5 rounded-xl font-bold text-sm text-slate-900 dark:text-white border border-primary-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_25px_rgba(99,102,241,0.4)]">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-indigo-600 opacity-80 group-hover:opacity-100 transition-opacity" />
                        <Send className="w-4 h-4 relative z-10" />
                        <span className="relative z-10">Enviar Correos</span>
                    </button>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                        <button onClick={onNewOfficial} className="flex flex-col items-center justify-center gap-1.5 p-3 bg-slate-100 dark:bg-dark-800/50 hover:bg-slate-200 dark:hover:bg-dark-700 border border-slate-100 dark:border-white/5 rounded-xl font-semibold text-[10px] text-slate-700 dark:text-slate-300 transition-all hover:-translate-y-1">
                            <UserPlus className="w-5 h-5 text-blue-400" />Crear
                        </button>
                        <button onClick={onImport} className="flex flex-col items-center justify-center gap-1.5 p-3 bg-slate-100 dark:bg-dark-800/50 hover:bg-slate-200 dark:hover:bg-dark-700 border border-slate-100 dark:border-white/5 rounded-xl font-semibold text-[10px] text-slate-700 dark:text-slate-300 transition-all hover:-translate-y-1">
                            <Upload className="w-5 h-5 text-emerald-400" />Importar
                        </button>
                        <button onClick={onExportExcel} className="flex flex-col items-center justify-center gap-1.5 p-3 bg-slate-100 dark:bg-dark-800/50 hover:bg-slate-200 dark:hover:bg-dark-700 border border-slate-100 dark:border-white/5 rounded-xl font-semibold text-[10px] text-slate-700 dark:text-slate-300 transition-all hover:-translate-y-1">
                            <FileSpreadsheet className="w-5 h-5 text-purple-400" />Exportar
                        </button>
                        <button onClick={onClearDatabase} className="flex flex-col items-center justify-center gap-1.5 p-3 bg-slate-100 dark:bg-dark-800/50 hover:bg-red-50 dark:hover:bg-red-950/20 border border-slate-100 dark:border-white/5 hover:border-red-500/30 rounded-xl font-semibold text-[10px] text-slate-700 dark:text-slate-300 hover:text-red-500 dark:hover:text-red-400 transition-all hover:-translate-y-1">
                            <Trash2 className="w-5 h-5 text-red-400" />Limpiar
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Row 2: Email Analytics KPIs ────────────────────────────────── */}
            <div>
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <BarChart2 className="w-3.5 h-3.5" /> Métricas de Email
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <KPICard
                        label="Total Enviados"
                        value={emailAnalytics.totalSent.toLocaleString('es-CL')}
                        sub={`${campaigns.filter(c => (c.logs?.length ?? 0) > 0).length} campaña(s)`}
                        icon={<Send className="w-4 h-4 text-indigo-400" />}
                        color="bg-indigo-500/15"
                    />
                    <KPICard
                        label="Correos Abiertos"
                        value={emailAnalytics.totalOpened.toLocaleString('es-CL')}
                        sub="con pixel de seguimiento"
                        icon={<Eye className="w-4 h-4 text-emerald-400" />}
                        color="bg-emerald-500/15"
                    />
                    <KPICard
                        label="Tasa de Apertura"
                        value={`${emailAnalytics.openRate}%`}
                        sub={emailAnalytics.totalSent > 0 ? `${emailAnalytics.totalOpened} de ${emailAnalytics.totalSent}` : 'Sin datos aún'}
                        icon={<MousePointerClick className="w-4 h-4 text-amber-400" />}
                        color="bg-amber-500/15"
                    />
                    <KPICard
                        label="Prom. por Campaña"
                        value={emailAnalytics.avgSends.toLocaleString('es-CL')}
                        sub="correos / campaña activa"
                        icon={<Target className="w-4 h-4 text-pink-400" />}
                        color="bg-pink-500/15"
                    />
                    <KPICard
                        label="Aperturas 7 días"
                        value={emailAnalytics.opens7d.toLocaleString('es-CL')}
                        sub="últimos 7 días"
                        icon={<Zap className="w-4 h-4 text-cyan-400" />}
                        color="bg-cyan-500/15"
                    />
                </div>
            </div>

            {/* ── Row 3: Timeline + Campaign bar chart ───────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Timeline — enviados + abiertos */}
                <div className="glass-panel bento-card p-6 lg:col-span-3 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-primary-400" />
                            Actividad de Correos
                            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                                ({totalInPeriod} enviados · {openedInPeriod} abiertos)
                            </span>
                        </h3>
                        <div className="flex bg-slate-100 dark:bg-dark-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
                            {([7, 30, 90] as const).map(d => (
                                <button key={d} onClick={() => setTimelineDays(d)}
                                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${timelineDays === d ? 'bg-primary-600 text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}>
                                    {d}d
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 h-48">
                        {totalInPeriod === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                                <Clock className="w-8 h-8 mb-2 opacity-40" />
                                <p className="text-sm">Sin envíos en este período</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={timelineData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                                    <defs>
                                        <linearGradient id="gradEnviados" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gradAbiertos" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }}
                                        interval={timelineDays === 7 ? 0 : timelineDays === 30 ? 4 : 13} />
                                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                                    <RechartsTooltip contentStyle={darkTooltipStyle} labelStyle={{ color: '#94a3b8' }} />
                                    <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                                    <Area type="monotone" dataKey="enviados" name="Enviados" stroke="#6366f1" strokeWidth={2} fill="url(#gradEnviados)" dot={false} activeDot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="abiertos" name="Abiertos" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Campaign bar chart */}
                <div className="glass-panel bento-card p-6 lg:col-span-2 flex flex-col">
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-4 flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-400" />
                        Campañas: Enviados vs Abiertos
                    </h3>
                    {campaignBarData.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
                            Sin campañas con registros
                        </div>
                    ) : (
                        <div className="flex-1 h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={campaignBarData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} width={70} />
                                    <RechartsTooltip
                                        contentStyle={darkTooltipStyle}
                                        formatter={(value: number, name: string, props: any) => {
                                            if (name === 'Enviados') return [value, 'Enviados'];
                                            return [`${value} (${props.payload.tasa}% tasa)`, 'Abiertos'];
                                        }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                                    <Bar dataKey="enviados" name="Enviados" fill="#6366f1" radius={[0, 3, 3, 0]} maxBarSize={14} />
                                    <Bar dataKey="abiertos" name="Abiertos" fill="#10b981" radius={[0, 3, 3, 0]} maxBarSize={14} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Row 4: Donut + Method + Top Depts + Health ─────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Gender donut */}
                <div className="glass-panel bento-card p-6 flex flex-col h-[300px]">
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-3">Demografía</h3>
                    {totalOfficials === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 dark:text-slate-500">
                            <Users className="w-8 h-8 mb-2 opacity-50" /><p className="text-sm">Sin datos</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={genderData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value" stroke="none">
                                            {genderData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                        </Pie>
                                        <RechartsTooltip contentStyle={darkTooltipStyle} itemStyle={{ color: '#fff' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-3xl font-black text-slate-900 dark:text-white">{totalOfficials}</span>
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Total</span>
                                </div>
                            </div>
                            <div className="mt-2 flex flex-wrap justify-center gap-3">
                                {genderData.map(d => (
                                    <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />{d.name}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Method donut */}
                <div className="glass-panel bento-card p-6 flex flex-col h-[300px]">
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-3 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-cyan-400" />Método de Envío
                    </h3>
                    {methodData.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 dark:text-slate-500">
                            <Mail className="w-8 h-8 mb-2 opacity-50" /><p className="text-sm">Sin envíos</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={methodData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value" stroke="none">
                                            {methodData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                        </Pie>
                                        <RechartsTooltip contentStyle={darkTooltipStyle} itemStyle={{ color: '#fff' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-2xl font-black text-slate-900 dark:text-white">{emailAnalytics.totalSent}</span>
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Enviados</span>
                                </div>
                            </div>
                            <div className="mt-2 flex flex-wrap justify-center gap-3">
                                {methodData.map(d => (
                                    <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />{d.name}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Top Departments */}
                <div className="glass-panel bento-card p-6 flex flex-col h-[300px]">
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-4 flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-primary-400" />Top Áreas
                    </h3>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {topDepartments.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-500 text-sm">Sin datos</div>
                        ) : (
                            <div className="space-y-4">
                                {topDepartments.map(([name, count], index) => (
                                    <div key={name} className="relative cursor-pointer group"
                                        onClick={() => onNavigate('database', { type: 'department', value: name === 'Sin Dept.' ? '' : name })}>
                                        <div className="flex justify-between items-end mb-1.5 z-10 relative">
                                            <span className="text-slate-700 dark:text-slate-300 text-sm font-semibold truncate pr-4 group-hover:text-primary-300 transition-colors">{name}</span>
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-500 bg-white dark:bg-dark-900/50 px-2 py-0.5 rounded-md">{count}</span>
                                        </div>
                                        <div className="w-full bg-white dark:bg-dark-900/50 h-1.5 rounded-full overflow-hidden border border-slate-100 dark:border-white/5">
                                            <div className={`h-full rounded-full transition-all duration-1000 ease-out ${index === 0 ? 'bg-gradient-to-r from-primary-500 to-indigo-400' : 'bg-slate-600'}`}
                                                style={{ width: `${(count / maxDeptCount) * 100}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Database Health */}
                <div className="glass-panel bento-card p-6 flex flex-col h-[300px]">
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4 text-sm flex items-center justify-between">
                        Integridad de Datos
                        {isHealthy && totalOfficials > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] uppercase font-bold border border-emerald-500/20">Óptima</span>
                        )}
                    </h3>
                    {totalOfficials === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 dark:text-slate-500"><p className="text-sm">Base de datos vacía</p></div>
                    ) : isHealthy ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                            <div className="relative">
                                <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
                                <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-4 relative z-10">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                                </div>
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-1">Todo en orden</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400">La información crítica está completa.</p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                            {missingBossCount > 0 && (
                                <div onClick={() => onNavigate('database', { type: 'missingBoss' })}
                                    className="flex items-center gap-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl cursor-pointer hover:bg-orange-500/20 transition-colors group">
                                    <div className="w-9 h-9 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                                        <AlertTriangle className="w-4 h-4 text-orange-400" />
                                    </div>
                                    <div><p className="text-sm font-bold text-slate-900 dark:text-white">{missingBossCount} Sin Jefatura</p><p className="text-xs text-orange-400/80">Requerido para copias.</p></div>
                                </div>
                            )}
                            {unspecifiedCount > 0 && (
                                <div onClick={() => onNavigate('database', { type: 'missingGender' })}
                                    className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl cursor-pointer hover:bg-amber-500/20 transition-colors group">
                                    <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                                    </div>
                                    <div><p className="text-sm font-bold text-slate-900 dark:text-white">{unspecifiedCount} Sin Género</p><p className="text-xs text-amber-400/80">Click para revisar.</p></div>
                                </div>
                            )}
                            {invalidEmailCount > 0 && (
                                <div onClick={() => onNavigate('database', { type: 'invalidEmail' })}
                                    className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl cursor-pointer hover:bg-red-500/20 transition-colors group">
                                    <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                                        <Mail className="w-4 h-4 text-red-400" />
                                    </div>
                                    <div><p className="text-sm font-bold text-slate-900 dark:text-white">{invalidEmailCount} Correos Inválidos</p><p className="text-xs text-red-400/80">Formato incorrecto.</p></div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Row 5: Recent Campaigns Table ──────────────────────────────── */}
            {recentCampaigns.length > 0 && (
                <div className="glass-panel bento-card p-6">
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-4 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-emerald-400" />
                        Últimas Campañas
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-700">
                                    <th className="text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-3 pr-4">Campaña</th>
                                    <th className="text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-3 pr-4">Fecha</th>
                                    <th className="text-right text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-3 pr-4">Enviados</th>
                                    <th className="text-right text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-3 pr-4">Abiertos</th>
                                    <th className="text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-3 pr-4">Tasa Apertura</th>
                                    <th className="text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-3">Método(s)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {recentCampaigns.map(c => (
                                    <tr key={c.id} className="group hover:bg-slate-50 dark:hover:bg-white/3 transition-colors">
                                        <td className="py-3 pr-4 font-semibold text-slate-800 dark:text-white truncate max-w-[160px]">{c.name}</td>
                                        <td className="py-3 pr-4 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                                            {new Date(c.createdAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: '2-digit' })}
                                        </td>
                                        <td className="py-3 pr-4 text-right font-bold text-slate-700 dark:text-slate-200">{c.sent}</td>
                                        <td className="py-3 pr-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{c.opened}</td>
                                        <td className="py-3 pr-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1.5 bg-slate-100 dark:bg-dark-900 rounded-full overflow-hidden min-w-[60px]">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
                                                        style={{ width: `${c.rate}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-8 text-right">{c.rate}%</span>
                                            </div>
                                        </td>
                                        <td className="py-3">
                                            <div className="flex gap-1 flex-wrap">
                                                {c.methods.map(m => (
                                                    <span key={m} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                        m === 'gmail_api' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' :
                                                        m === 'eml'       ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' :
                                                        'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                                                    }`}>
                                                        {methodLabel[m] ?? m}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Row 6: Backup ──────────────────────────────────────────────── */}
            <div className="glass-panel bento-card p-6 flex flex-col sm:flex-row items-center justify-between gap-6 bg-gradient-to-r from-slate-100 dark:from-dark-800/80 to-slate-100 dark:to-dark-900/80">
                <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-300 dark:border-white/5 shadow-inner">
                        <Save className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">Copia de Seguridad del Entorno</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">Asegura tus plantillas, historiales y configuraciones locales descargando un archivo de restauración.</p>
                    </div>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <button onClick={handleBackupImportClick} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-dark-800/80 hover:bg-slate-200 dark:hover:bg-dark-700 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 transition-all hover:-translate-y-0.5">
                        <RefreshCw className="w-4 h-4" />Restaurar
                    </button>
                    <button onClick={onExportBackup} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900/10 dark:bg-white/10 hover:bg-white/15 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-900 dark:text-white transition-all hover:-translate-y-0.5 backdrop-blur-sm">
                        <Download className="w-4 h-4" />Exportar
                    </button>
                </div>
            </div>
        </div>
    );
};
