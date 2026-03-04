import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Car, ChevronLeft, ChevronRight, Settings, Send,
    CheckCircle2, AlertTriangle, CalendarDays, Users,
    ParkingSquare, Loader2, Plus, Minus, Mail,
    Lock, Unlock, RefreshCw, ListFilter, X, UserPlus
} from 'lucide-react';
import { Official, ParkingConfig, ParkingWeek } from '../types';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebaseService';
import { sendGmail, buildRawMessage } from '../services/gmailService';

// ─── Week Utilities ────────────────────────────────────────────────────────────

/** Returns ISO week key like '2026-W10' for a given Date */
const getWeekKey = (date: Date): string => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

/** Returns the Monday of the week for a given week key */
const getWeekStart = (weekKey: string): Date => {
    const [year, w] = weekKey.split('-W').map(Number);
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const week1Mon = new Date(jan4);
    week1Mon.setUTCDate(jan4.getUTCDate() - (jan4.getUTCDay() || 7) + 1);
    const result = new Date(week1Mon);
    result.setUTCDate(week1Mon.getUTCDate() + (w - 1) * 7);
    return result;
};

/** Human-readable label for a week key */
const weekLabel = (weekKey: string): string => {
    const start = getWeekStart(weekKey);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 4); // Mon-Fri
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', timeZone: 'UTC' };
    return `Lun ${start.toLocaleDateString('es-CL', opts)} – Vie ${end.toLocaleDateString('es-CL', opts)}`;
};

const currentWeekKey = () => getWeekKey(new Date());

/** Navigate from a weekKey by ±n weeks */
const shiftWeek = (weekKey: string, delta: number): string => {
    const start = getWeekStart(weekKey);
    start.setUTCDate(start.getUTCDate() + delta * 7);
    return getWeekKey(start);
};

const computeWeeksDiff = (from: string, to: string): number => {
    const fromDate = getWeekStart(from);
    const toDate = getWeekStart(to);
    return Math.round((toDate.getTime() - fromDate.getTime()) / (7 * 86400000));
};

// ─── Firestore helpers ─────────────────────────────────────────────────────────

const PARKING_COLLECTION = 'parking_config';
const PARKING_DOC_ID = 'rotation';

const loadParkingConfig = async (): Promise<ParkingConfig | null> => {
    try {
        const snap = await getDoc(doc(db, PARKING_COLLECTION, PARKING_DOC_ID));
        return snap.exists() ? (snap.data() as ParkingConfig) : null;
    } catch {
        return null;
    }
};

const saveParkingConfig = async (config: ParkingConfig): Promise<void> => {
    await setDoc(doc(db, PARKING_COLLECTION, PARKING_DOC_ID), config, { merge: true });
};

// ─── Rotation Logic ────────────────────────────────────────────────────────────

/**
 * Round-robin rotation: each week we advance the pointer by `spots` positions.
 * No history needed — it's purely mathematical based on week offset from epoch.
 */
const computeAssigned = (
    eligibleIds: string[],
    spots: number,
    weekKey: string,
    history: ParkingWeek[]
): string[] => {
    if (eligibleIds.length === 0 || spots <= 0) return [];

    // Find the last locked (confirmed) week as the anchor
    const sortedHistory = [...history]
        .filter(w => w.lockedManually)
        .sort((a, b) => a.weekKey.localeCompare(b.weekKey));
    const anchor = sortedHistory[sortedHistory.length - 1];

    if (!anchor) {
        // No anchor: start from index 0
        return eligibleIds.slice(0, Math.min(spots, eligibleIds.length));
    }

    // Find where the anchor started in the eligible list
    const anchorFirstId = anchor.assignedOfficialIds[0];
    const anchorIndex = eligibleIds.indexOf(anchorFirstId);
    if (anchorIndex === -1) {
        return eligibleIds.slice(0, Math.min(spots, eligibleIds.length));
    }

    const weeksElapsed = computeWeeksDiff(anchor.weekKey, weekKey);
    const nextStart = ((anchorIndex + weeksElapsed * spots) % eligibleIds.length + eligibleIds.length) % eligibleIds.length;

    const result: string[] = [];
    for (let i = 0; i < Math.min(spots, eligibleIds.length); i++) {
        result.push(eligibleIds[(nextStart + i) % eligibleIds.length]);
    }
    return result;
};

// ─── Props ─────────────────────────────────────────────────────────────────────

interface ParkingRotationProps {
    officials: Official[];
    canEdit: boolean;
    onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export const ParkingRotation: React.FC<ParkingRotationProps> = ({ officials, canEdit, onToast }) => {
    const [config, setConfig] = useState<ParkingConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sending, setSending] = useState(false);
    const [viewWeek, setViewWeek] = useState(currentWeekKey());
    const [showSettings, setShowSettings] = useState(false);
    const [spotsInput, setSpotsInput] = useState('13');
    const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
    const [showExcludePanel, setShowExcludePanel] = useState(false);

    // CC emails state
    const [ccEmails, setCcEmails] = useState<string[]>([]);
    const [newCcEmail, setNewCcEmail] = useState('');
    const [showCcPanel, setShowCcPanel] = useState(false);

    // Load config on mount
    useEffect(() => {
        setLoading(true);
        loadParkingConfig().then(cfg => {
            if (cfg) {
                setConfig(cfg);
                setSpotsInput(String(cfg.spots));
                setExcludedIds(new Set(cfg.excludedOfficialIds || []));
                setCcEmails(cfg.ccEmails || []);
            } else {
                const defaultCfg: ParkingConfig = {
                    spots: 13,
                    rotationHistory: [],
                    excludedOfficialIds: [],
                    ccEmails: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };
                setConfig(defaultCfg);
            }
            setLoading(false);
        });
    }, []);

    // Officials eligible for parking (have vehicle, not excluded)
    const eligibleOfficials = useMemo(() =>
        officials
            .filter(o => o.tieneVehiculo && !excludedIds.has(o.id))
            .sort((a, b) => a.name.localeCompare(b.name, 'es')),
        [officials, excludedIds]
    );

    const eligibleIds = useMemo(() => eligibleOfficials.map(o => o.id), [eligibleOfficials]);

    // Officials with vehicle (for exclusion panel)
    const vehicleOfficials = useMemo(() =>
        officials.filter(o => o.tieneVehiculo).sort((a, b) => a.name.localeCompare(b.name, 'es')),
        [officials]
    );

    const spots = config?.spots ?? 13;

    // Get week entry from history, or compute it automatically
    const getWeekData = useCallback((weekKey: string): ParkingWeek => {
        const existing = config?.rotationHistory.find(w => w.weekKey === weekKey);
        if (existing) return existing;
        return {
            weekKey,
            assignedOfficialIds: computeAssigned(eligibleIds, spots, weekKey, config?.rotationHistory ?? []),
            spots,
        };
    }, [config, eligibleIds, spots]);

    const currentWeekData = useMemo(() => getWeekData(viewWeek), [getWeekData, viewWeek]);
    const isCurrentWeek = viewWeek === currentWeekKey();

    // Save config helper
    const persistConfig = async (updatedConfig: ParkingConfig) => {
        setSaving(true);
        try {
            await saveParkingConfig({ ...updatedConfig, updatedAt: Date.now() });
            setConfig({ ...updatedConfig, updatedAt: Date.now() });
            onToast('Configuración guardada', 'success');
        } catch {
            onToast('Error al guardar la configuración', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Lock/confirm the current viewed week into history
    const handleLockWeek = async () => {
        if (!config) return;
        const weekData = getWeekData(viewWeek);
        const exists = config.rotationHistory.some(w => w.weekKey === viewWeek);
        const newHistory = exists
            ? config.rotationHistory.map(w => w.weekKey === viewWeek ? { ...weekData, lockedManually: true } : w)
            : [...config.rotationHistory, { ...weekData, lockedManually: true }];

        await persistConfig({
            ...config,
            rotationHistory: newHistory,
            lastRotatedWeekKey: viewWeek,
        });
    };

    // Save settings (spots + exclusions + ccEmails)
    const handleSaveSettings = async () => {
        if (!config) return;
        const newSpots = Math.max(1, parseInt(spotsInput) || 13);
        const updatedConfig: ParkingConfig = {
            ...config,
            spots: newSpots,
            excludedOfficialIds: Array.from(excludedIds),
            ccEmails,
        };
        await persistConfig(updatedConfig);
        setShowSettings(false);
        setShowExcludePanel(false);
        setShowCcPanel(false);
    };

    // Toggle exclude
    const toggleExclude = (id: string) => {
        setExcludedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    // CC email management
    const addCcEmail = () => {
        const email = newCcEmail.trim().toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            onToast('Ingresa un correo válido', 'error');
            return;
        }
        if (ccEmails.includes(email)) {
            onToast('Este correo ya está en la lista', 'error');
            return;
        }
        setCcEmails(prev => [...prev, email]);
        setNewCcEmail('');
    };

    const removeCcEmail = (email: string) => {
        setCcEmails(prev => prev.filter(e => e !== email));
    };

    const assignedOfficials = currentWeekData.assignedOfficialIds
        .map(id => officials.find(o => o.id === id))
        .filter(Boolean) as Official[];

    const isLocked = currentWeekData.lockedManually;

    // ─── Send Email Notification ────────────────────────────────────────────────

    const handleSendNotification = async () => {
        if (assignedOfficials.length === 0) {
            onToast('No hay funcionarios asignados esta semana', 'error');
            return;
        }

        const token = sessionStorage.getItem('gmail_access_token');
        if (!token) {
            onToast('Debes autorizar Gmail primero para enviar correos', 'error');
            return;
        }

        setSending(true);
        try {
            // Build the list of assigned names for the email
            const namesList = assignedOfficials
                .map((o, i) => `${i + 1}. ${o.name} — Espacio #${i + 1}`)
                .join('<br>');

            const subject = `Rotación de Estacionamiento — Semana ${viewWeek}`;
            const bodyHTML = `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 24px; border-radius: 12px 12px 0 0;">
                        <h2 style="color: white; margin: 0; font-size: 20px;">🅿️ Rotación de Estacionamiento</h2>
                        <p style="color: #d1fae5; margin: 4px 0 0; font-size: 14px;">Semana ${viewWeek} · ${weekLabel(viewWeek)}</p>
                    </div>
                    <div style="background: #f0fdf4; padding: 24px; border: 1px solid #bbf7d0; border-top: none; border-radius: 0 0 12px 12px;">
                        <p style="color: #166534; font-size: 14px; margin: 0 0 16px;">
                            Estimado/a funcionario/a, le informamos que esta semana le corresponde estacionamiento asignado:
                        </p>
                        <div style="background: white; border: 1px solid #d1fae5; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                            ${namesList}
                        </div>
                        <p style="color: #6b7280; font-size: 12px; margin: 0;">
                            Este es un correo automático del sistema de rotación de estacionamientos del CFT Estatal de Arica y Parinacota.
                        </p>
                    </div>
                </div>
            `;

            // Send to each assigned official
            const toEmails = assignedOfficials
                .map(o => o.email)
                .filter(e => e && e.includes('@'));

            if (toEmails.length === 0) {
                onToast('Los funcionarios asignados no tienen correo válido', 'error');
                setSending(false);
                return;
            }

            const ccList = ccEmails.filter(e => !toEmails.includes(e));
            const toHeader = toEmails.join(', ');
            const ccHeader = ccList.length > 0 ? ccList.join(', ') : undefined;

            const rawMessage = await buildRawMessage(toHeader, subject, bodyHTML, ccHeader);
            await sendGmail(rawMessage);

            onToast(`Notificación enviada a ${toEmails.length} funcionario(s)${ccList.length > 0 ? ` + ${ccList.length} CC` : ''}`, 'success');
        } catch (err: any) {
            console.error('Error enviando notificación:', err);
            onToast(err.message || 'Error al enviar notificación', 'error');
        } finally {
            setSending(false);
        }
    };

    // ── Render ──────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    if (vehicleOfficials.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
                <div className="w-20 h-20 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-4xl shadow-inner">
                    🚗
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                        Ningún funcionario tiene vehículo registrado
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md">
                        Ve a la <strong>Base de Datos</strong>, edita un funcionario y activa la opción
                        <strong> "Tiene vehículo propio"</strong> para que aparezca en la rotación.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* ── Header ─────────────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md">
                            <ParkingSquare className="w-5 h-5 text-white" />
                        </div>
                        Rotación de Estacionamiento
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 ml-13">
                        {eligibleOfficials.length} funcionario{eligibleOfficials.length !== 1 ? 's' : ''} en rotación
                        · {spots} espacio{spots !== 1 ? 's' : ''}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {canEdit && (
                        <>
                            <button
                                onClick={() => { setShowCcPanel(!showCcPanel); setShowExcludePanel(false); setShowSettings(false); }}
                                className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl border transition-all ${showCcPanel
                                    ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                                    : 'bg-white dark:bg-dark-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                    }`}
                            >
                                <UserPlus className="w-4 h-4" />
                                CC ({ccEmails.length})
                            </button>
                            <button
                                onClick={() => { setShowExcludePanel(!showExcludePanel); setShowSettings(false); setShowCcPanel(false); }}
                                className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl border transition-all ${showExcludePanel
                                    ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                                    : 'bg-white dark:bg-dark-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                    }`}
                            >
                                <ListFilter className="w-4 h-4" />
                                Exclusiones
                            </button>
                            <button
                                onClick={() => { setShowSettings(!showSettings); setSpotsInput(String(spots)); setShowExcludePanel(false); setShowCcPanel(false); }}
                                className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl border transition-all ${showSettings
                                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                    : 'bg-white dark:bg-dark-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                    }`}
                            >
                                <Settings className="w-4 h-4" />
                                Configurar
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── CC Emails Panel ─────────────────────────────────────────────────── */}
            {showCcPanel && canEdit && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <h4 className="font-bold text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Correos adicionales (CC)
                    </h4>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-4">
                        Estos correos recibirán la notificación de rotación como copia, aunque no estén en la lista de rotación.
                    </p>

                    <div className="flex gap-2 mb-4">
                        <input
                            type="email"
                            value={newCcEmail}
                            onChange={e => setNewCcEmail(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addCcEmail()}
                            placeholder="ejemplo@correo.cl"
                            className="flex-1 px-3 py-2 bg-white dark:bg-dark-800 border border-blue-300 dark:border-blue-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={addCcEmail}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Agregar
                        </button>
                    </div>

                    {ccEmails.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {ccEmails.map(email => (
                                <span
                                    key={email}
                                    className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-white dark:bg-dark-800 border border-blue-200 dark:border-blue-700 rounded-full text-xs font-medium text-blue-800 dark:text-blue-200"
                                >
                                    <Mail className="w-3 h-3 text-blue-400" />
                                    {email}
                                    <button
                                        onClick={() => removeCcEmail(email)}
                                        className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 hover:text-red-600 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowCcPanel(false)}
                            className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-dark-700 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSaveSettings}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Guardar correos CC
                        </button>
                    </div>
                </div>
            )}

            {/* ── Settings Panel ─────────────────────────────────────────────────── */}
            {showSettings && canEdit && (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <h4 className="font-bold text-emerald-800 dark:text-emerald-200 mb-4 flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Configuración de Rotación
                    </h4>
                    <div className="flex items-end gap-6 flex-wrap">
                        <div>
                            <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-2">
                                N° de Espacios Disponibles
                            </label>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setSpotsInput(s => String(Math.max(1, parseInt(s || '13') - 1)))}
                                    className="w-9 h-9 rounded-lg bg-white dark:bg-dark-800 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors text-emerald-700 dark:text-emerald-300"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <input
                                    type="number"
                                    min={1}
                                    value={spotsInput}
                                    onChange={e => setSpotsInput(e.target.value)}
                                    className="w-16 text-center py-2 px-2 font-bold text-lg bg-white dark:bg-dark-800 border border-emerald-300 dark:border-emerald-700 rounded-lg text-emerald-900 dark:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <button
                                    onClick={() => setSpotsInput(s => String(parseInt(s || '13') + 1))}
                                    className="w-9 h-9 rounded-lg bg-white dark:bg-dark-800 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors text-emerald-700 dark:text-emerald-300"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-2 pb-0.5">
                            <button
                                onClick={() => setShowSettings(false)}
                                className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-dark-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveSettings}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Exclusion Panel ─────────────────────────────────────────────────── */}
            {showExcludePanel && canEdit && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-amber-800 dark:text-amber-200 flex items-center gap-2">
                            <ListFilter className="w-4 h-4" />
                            Excluir funcionarios de la rotación
                        </h4>
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                            Excluidos: {excludedIds.size} · En rotación: {eligibleOfficials.length}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
                        {vehicleOfficials.map(o => (
                            <label
                                key={o.id}
                                className={`flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-all border ${excludedIds.has(o.id)
                                    ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700'
                                    : 'bg-white dark:bg-dark-800 border-slate-200 dark:border-slate-700 hover:border-amber-300'
                                    }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={excludedIds.has(o.id)}
                                    onChange={() => toggleExclude(o.id)}
                                    className="w-4 h-4 text-amber-600 rounded"
                                />
                                <div className="min-w-0">
                                    <p className={`text-sm font-medium truncate ${excludedIds.has(o.id) ? 'text-amber-800 dark:text-amber-200 line-through opacity-60' : 'text-slate-800 dark:text-white'}`}>
                                        {o.name}
                                    </p>
                                    <p className="text-xs text-slate-400 truncate">{o.position}</p>
                                </div>
                            </label>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowExcludePanel(false)}
                            className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-dark-700 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSaveSettings}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Aplicar cambios
                        </button>
                    </div>
                </div>
            )}

            {/* ── Week Navigator + Assignments ───────────────────────────────────── */}
            <div className="bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                    <button
                        onClick={() => setViewWeek(w => shiftWeek(w, -1))}
                        className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="text-center">
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                            <CalendarDays className="w-4 h-4 text-emerald-500" />
                            <span className="text-base font-bold text-slate-800 dark:text-white">{viewWeek}</span>
                            {isCurrentWeek && (
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full">
                                    ESTA SEMANA
                                </span>
                            )}
                            {isLocked && (
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full flex items-center gap-1">
                                    <Lock className="w-2.5 h-2.5" /> CONFIRMADA
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{weekLabel(viewWeek)}</p>
                    </div>

                    <button
                        onClick={() => setViewWeek(w => shiftWeek(w, 1))}
                        className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Assigned this week */}
                {eligibleOfficials.length === 0 ? (
                    <div className="flex flex-col items-center py-10 text-center gap-3">
                        <AlertTriangle className="w-10 h-10 text-amber-400" />
                        <p className="text-slate-600 dark:text-slate-300 font-medium">No hay funcionarios elegibles</p>
                        <p className="text-sm text-slate-400">Todos los funcionarios con vehículo están excluidos de la rotación.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                            {Array.from({ length: Math.min(spots, eligibleOfficials.length) }).map((_, idx) => {
                                const assigned = assignedOfficials[idx];
                                return (
                                    <div
                                        key={idx}
                                        className={`relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${assigned
                                            ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 shadow-sm'
                                            : 'border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-900/50'
                                            }`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-bold shadow-inner ${assigned
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                                            }`}>
                                            {idx + 1}
                                        </div>
                                        {assigned ? (
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-slate-800 dark:text-white truncate text-sm">{assigned.name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{assigned.position || assigned.department}</p>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">🚗 Espacio #{idx + 1}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-slate-400 dark:text-slate-500 italic">Espacio vacío</div>
                                        )}
                                        {isLocked && (
                                            <Lock className="w-3.5 h-3.5 text-green-500 absolute top-2 right-2 flex-shrink-0" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {!isCurrentWeek && (
                                <button
                                    onClick={() => setViewWeek(currentWeekKey())}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-dark-700 transition-colors"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    Ir a esta semana
                                </button>
                            )}
                            {canEdit && (
                                <>
                                    <button
                                        onClick={handleLockWeek}
                                        disabled={saving || isLocked}
                                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all disabled:opacity-50 ${isLocked
                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700 cursor-not-allowed'
                                            : 'bg-white dark:bg-dark-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-green-300 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20'
                                            }`}
                                    >
                                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                        {isLocked ? 'Confirmada' : 'Confirmar semana'}
                                    </button>
                                    <button
                                        onClick={handleSendNotification}
                                        disabled={sending || assignedOfficials.length === 0}
                                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors disabled:opacity-50 shadow-sm"
                                    >
                                        {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                        Enviar notificación
                                    </button>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* ── Full Rotation Queue ─────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-500" />
                    Cola de rotación — {eligibleOfficials.length} funcionario{eligibleOfficials.length !== 1 ? 's' : ''}
                </h3>

                {eligibleOfficials.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No hay funcionarios en rotación.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800">
                                    <th className="pb-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 pr-4">#</th>
                                    <th className="pb-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 pr-4">Funcionario</th>
                                    <th className="pb-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 pr-4">Cargo</th>
                                    <th className="pb-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 pr-4">Correo</th>
                                    <th className="pb-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">Esta semana</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                {eligibleOfficials.map((o, idx) => {
                                    const isAssignedNow = currentWeekData.assignedOfficialIds.includes(o.id);
                                    return (
                                        <tr key={o.id} className={`transition-colors ${isAssignedNow ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : ''}`}>
                                            <td className="py-2.5 pr-4 text-slate-400 font-mono text-xs">{String(idx + 1).padStart(2, '0')}</td>
                                            <td className="py-2.5 pr-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isAssignedNow
                                                        ? 'bg-emerald-600 text-white'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                                        }`}>
                                                        {o.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className={`font-medium ${isAssignedNow ? 'text-emerald-800 dark:text-emerald-200' : 'text-slate-700 dark:text-slate-300'}`}>
                                                        {o.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400 truncate max-w-[180px]">{o.position || '—'}</td>
                                            <td className="py-2.5 pr-4 text-slate-400 dark:text-slate-500 text-xs truncate max-w-[200px]">{o.email || '—'}</td>
                                            <td className="py-2.5 text-center">
                                                {isAssignedNow ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full">
                                                        <Car className="w-2.5 h-2.5" /> Le toca
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-300 dark:text-slate-600">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Rotation History ───────────────────────────────────────────────── */}
            {(config?.rotationHistory.length ?? 0) > 0 && (
                <div className="bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-slate-400" />
                        Historial de rotaciones confirmadas
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {[...(config?.rotationHistory ?? [])]
                            .sort((a, b) => b.weekKey.localeCompare(a.weekKey))
                            .map(week => {
                                const weekOfficials = week.assignedOfficialIds
                                    .map(id => officials.find(o => o.id === id)?.name ?? '(desconocido)')
                                    .join(', ');
                                const isCurrent = week.weekKey === currentWeekKey();
                                return (
                                    <button
                                        key={week.weekKey}
                                        onClick={() => setViewWeek(week.weekKey)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${isCurrent
                                            ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/20'
                                            : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-dark-700'
                                            }`}
                                    >
                                        <div className="flex-shrink-0">
                                            {week.lockedManually
                                                ? <Lock className="w-4 h-4 text-green-500" />
                                                : <CalendarDays className="w-4 h-4 text-slate-400" />
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-slate-800 dark:text-white">{week.weekKey}</span>
                                                {isCurrent && <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">ACTUAL</span>}
                                                {week.lockedManually && <span className="text-[10px] font-bold text-green-600 dark:text-green-400">CONFIRMADA</span>}
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{weekOfficials || '(sin asignados)'}</p>
                                        </div>
                                        <span className="text-xs text-slate-400 flex-shrink-0">{weekLabel(week.weekKey)}</span>
                                    </button>
                                );
                            })}
                    </div>
                </div>
            )}
        </div>
    );
};
