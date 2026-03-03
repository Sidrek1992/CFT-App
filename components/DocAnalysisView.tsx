/**
 * DocAnalysisView.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dedicated view for analyzing PDF documents already assigned in the Generator.
 * Shows a table of all assigned PDFs per official with status indicators, and
 * lets the user run Gemini AI analysis individually or all at once.
 */

import React, { useState, useCallback } from 'react';
import {
  ScanSearch, FileText, AlertCircle, CheckCircle2, ShieldAlert,
  Info, Loader2, ChevronDown, ChevronUp, X, Wand2, RefreshCw,
  Users, Paperclip, TriangleAlert,
} from 'lucide-react';
import { PdfAnalysisResult, PdfIssue } from '../types';
import { analyzePdfWithAI } from '../services/geminiService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AssignedFile {
  officialId: string;
  officialName: string;
  file: File;
  fileIndex: number; // index within that official's personalAttachments
}

type AnalysisState = 'idle' | 'analyzing' | 'done' | 'error';

interface FileAnalysisEntry extends AssignedFile {
  state: AnalysisState;
  result: PdfAnalysisResult | null;
  error: string | null;
  expanded: boolean;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DocAnalysisViewProps {
  assignedFiles: AssignedFile[];
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const SEVERITY_CONFIG = {
  error: {
    icon: <ShieldAlert className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />,
    badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    row: 'bg-red-50/60 dark:bg-red-950/20 border-red-100 dark:border-red-900/30',
    label: 'ERROR',
  },
  warning: {
    icon: <TriangleAlert className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />,
    badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    row: 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30',
    label: 'ATENCIÓN',
  },
  info: {
    icon: <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />,
    badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    row: 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30',
    label: 'INFO',
  },
} as const;

// Status badge for a single file row
function StatusBadge({ entry }: { entry: FileAnalysisEntry }) {
  if (entry.state === 'idle') {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
        Pendiente
      </span>
    );
  }
  if (entry.state === 'analyzing') {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
        <Loader2 className="w-3 h-3 animate-spin" />
        Analizando...
      </span>
    );
  }
  if (entry.state === 'error') {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
        <X className="w-3 h-3" />
        Error
      </span>
    );
  }
  // done
  const r = entry.result!;
  const errors   = r.issues.filter(i => i.severity === 'error').length;
  const warnings = r.issues.filter(i => i.severity === 'warning').length;

  if (!r.isLegible) {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
        <ShieldAlert className="w-3 h-3" /> Ilegible
      </span>
    );
  }
  if (errors > 0) {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
        <ShieldAlert className="w-3 h-3" /> {errors} error{errors > 1 ? 'es' : ''}
      </span>
    );
  }
  if (warnings > 0) {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
        <TriangleAlert className="w-3 h-3" /> {warnings} alerta{warnings > 1 ? 's' : ''}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
      <CheckCircle2 className="w-3 h-3" /> Sin problemas
    </span>
  );
}

// Expanded result panel
function AnalysisResultPanel({ result }: { result: PdfAnalysisResult }) {
  return (
    <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-100 dark:border-slate-700">
      {/* Summary */}
      <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-dark-900/40 rounded-lg p-2.5 border border-slate-100 dark:border-slate-700">
        {result.summary}
      </p>

      {/* Quick stats row */}
      <div className="flex flex-wrap gap-2">
        <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border ${
          result.isLegible
            ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
        }`}>
          {result.isLegible ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3" />}
          {result.isLegible ? 'Legible' : 'Ilegible'}
        </span>
        <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border ${
          result.horasDetected
            ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
            : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
        }`}>
          {result.horasDetected ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          {result.horasDetected ? 'Horas detectadas' : 'Horas no detectadas'}
        </span>
        {result.totalHorasFalta !== null && (
          <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border ${
            result.totalHorasFalta > 8
              ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
              : result.totalHorasFalta > 0
                ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
          }`}>
            <ShieldAlert className="w-3 h-3" />
            Horas falta: {result.totalHorasFalta}h
            {result.totalHorasFalta > 8 && ' ⚠'}
          </span>
        )}
      </div>

      {/* Issues list */}
      {result.issues.length > 0 ? (
        <div className="space-y-1.5">
          {result.issues.map((issue: PdfIssue, idx: number) => {
            const cfg = SEVERITY_CONFIG[issue.severity];
            return (
              <div key={idx} className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs ${cfg.row}`}>
                {cfg.icon}
                <div className="flex-1 min-w-0">
                  <span className={`inline text-[9px] font-bold border rounded px-1 py-0.5 mr-1.5 ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                  <span className="text-slate-700 dark:text-slate-200">{issue.description}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-2 p-2.5 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900/40 text-xs text-green-700 dark:text-green-300">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Sin inconsistencias detectadas.
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const DocAnalysisView: React.FC<DocAnalysisViewProps> = ({
  assignedFiles,
  onToast,
}) => {
  const [entries, setEntries] = useState<FileAnalysisEntry[]>(() =>
    assignedFiles.map(f => ({
      ...f,
      state: 'idle',
      result: null,
      error: null,
      expanded: false,
    }))
  );
  const [analyzingAll, setAnalyzingAll] = useState(false);

  // Sync when assignedFiles prop changes (user goes back to generator and adds more)
  const [lastFilesKey, setLastFilesKey] = useState(() =>
    assignedFiles.map(f => `${f.officialId}::${f.file.name}`).join('|')
  );
  const currentKey = assignedFiles.map(f => `${f.officialId}::${f.file.name}`).join('|');
  if (currentKey !== lastFilesKey) {
    setLastFilesKey(currentKey);
    setEntries(assignedFiles.map(f => ({
      ...f,
      state: 'idle',
      result: null,
      error: null,
      expanded: false,
    })));
  }

  const analyzeSingle = useCallback(async (key: string) => {
    setEntries(prev => prev.map(e =>
      entryKey(e) === key ? { ...e, state: 'analyzing', error: null } : e
    ));
    const entry = entries.find(e => entryKey(e) === key);
    if (!entry) return;
    try {
      const result = await analyzePdfWithAI(entry.file);
      setEntries(prev => prev.map(e =>
        entryKey(e) === key ? { ...e, state: 'done', result, expanded: true } : e
      ));
    } catch (err: any) {
      setEntries(prev => prev.map(e =>
        entryKey(e) === key ? { ...e, state: 'error', error: err.message ?? 'Error desconocido' } : e
      ));
      onToast(`Error al analizar "${entry.file.name}": ${err.message}`, 'error');
    }
  }, [entries, onToast]);

  const analyzeAll = useCallback(async () => {
    const pending = entries.filter(e => e.state === 'idle' || e.state === 'error');
    if (pending.length === 0) {
      onToast('Todos los archivos ya han sido analizados.', 'info');
      return;
    }
    setAnalyzingAll(true);
    for (const entry of pending) {
      await analyzeSingle(entryKey(entry));
      // small delay to avoid rate-limiting
      await new Promise(r => setTimeout(r, 600));
    }
    setAnalyzingAll(false);
    const doneNow = entries.filter(e => e.state === 'done').length + pending.length;
    onToast(`Análisis completado: ${doneNow} archivo(s) procesado(s).`, 'success');
  }, [entries, analyzeSingle, onToast]);

  const resetAll = () => {
    setEntries(prev => prev.map(e => ({
      ...e, state: 'idle', result: null, error: null, expanded: false,
    })));
  };

  const toggleExpanded = (key: string) => {
    setEntries(prev => prev.map(e =>
      entryKey(e) === key ? { ...e, expanded: !e.expanded } : e
    ));
  };

  // Summary stats
  const totalDone     = entries.filter(e => e.state === 'done').length;
  const totalErrors   = entries.filter(e => e.state === 'done' && e.result && e.result.issues.some(i => i.severity === 'error')).length;
  const totalWarnings = entries.filter(e => e.state === 'done' && e.result && e.result.issues.some(i => i.severity === 'warning') && !e.result.issues.some(i => i.severity === 'error')).length;
  const totalOk       = entries.filter(e => e.state === 'done' && e.result && e.result.issues.length === 0).length;
  const totalPending  = entries.filter(e => e.state === 'idle').length;

  if (assignedFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-72 bg-white dark:bg-dark-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4">
          <Paperclip className="w-8 h-8 text-violet-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-700 dark:text-white mb-2">Sin archivos asignados</h3>
        <p className="text-sm text-slate-400 dark:text-slate-500 max-w-sm">
          Ve al <strong>Generador de Correos</strong>, asigna archivos PDF a los funcionarios usando
          "Auto-asignar" y luego vuelve aquí para analizarlos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard value={entries.length} label="Total archivos" color="slate" icon={<FileText className="w-5 h-5" />} />
        <SummaryCard value={totalErrors}   label="Con errores"    color="red"   icon={<ShieldAlert className="w-5 h-5" />} />
        <SummaryCard value={totalWarnings} label="Con alertas"    color="amber" icon={<TriangleAlert className="w-5 h-5" />} />
        <SummaryCard value={totalOk}       label="Sin problemas"  color="green" icon={<CheckCircle2 className="w-5 h-5" />} />
      </div>

      {/* Action bar */}
      <div className="bg-white dark:bg-dark-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <ScanSearch className="w-5 h-5 text-violet-500" />
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-white">
              {entries.length} documento{entries.length !== 1 ? 's' : ''} asignado{entries.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {totalPending} pendiente{totalPending !== 1 ? 's' : ''} · {totalDone} analizado{totalDone !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetAll}
            disabled={analyzingAll}
            title="Reiniciar todos los análisis"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-dark-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-dark-600 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reiniciar
          </button>
          <button
            onClick={analyzeAll}
            disabled={analyzingAll || totalPending === 0}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-400 text-white text-sm font-bold rounded-lg transition-all shadow-sm hover:shadow-md"
          >
            {analyzingAll
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Wand2 className="w-4 h-4" />}
            {analyzingAll ? 'Analizando...' : `Analizar todo (${totalPending})`}
          </button>
        </div>
      </div>

      {/* File list */}
      <div className="space-y-2">
        {entries.map(entry => {
          const key = entryKey(entry);
          const isPdf = entry.file.type === 'application/pdf' || entry.file.name.toLowerCase().endsWith('.pdf');

          return (
            <div
              key={key}
              className="bg-white dark:bg-dark-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              {/* Row */}
              <div className="flex items-center gap-3 px-4 py-3">
                {/* File icon */}
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isPdf
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                }`}>
                  <FileText className="w-5 h-5" />
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                    {entry.file.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Users className="w-3 h-3" />
                      {entry.officialName}
                    </span>
                    <span className="text-[10px] text-slate-400">·</span>
                    <span className="text-[10px] text-slate-400">{formatFileSize(entry.file.size)}</span>
                  </div>
                </div>

                {/* Status + actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge entry={entry} />

                  {entry.state === 'done' && (
                    <button
                      onClick={() => toggleExpanded(key)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      title={entry.expanded ? 'Ocultar detalle' : 'Ver detalle'}
                    >
                      {entry.expanded
                        ? <ChevronUp className="w-4 h-4" />
                        : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}

                  {isPdf && (
                    <button
                      onClick={() => analyzeSingle(key)}
                      disabled={entry.state === 'analyzing' || analyzingAll}
                      title={entry.state === 'done' ? 'Re-analizar' : 'Analizar con IA'}
                      className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        entry.state === 'done'
                          ? 'text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                          : 'text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/30 hover:bg-violet-100 dark:hover:bg-violet-900/40'
                      }`}
                    >
                      {entry.state === 'analyzing'
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <ScanSearch className="w-3.5 h-3.5" />}
                      {entry.state === 'done' ? 'Re-analizar' : 'Analizar'}
                    </button>
                  )}

                  {!isPdf && (
                    <span className="text-[10px] text-slate-400 italic">No es PDF</span>
                  )}
                </div>
              </div>

              {/* Error message */}
              {entry.state === 'error' && entry.error && (
                <div className="mx-4 mb-3 px-3 py-2 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900/40 text-xs text-red-700 dark:text-red-300">
                  {entry.error}
                </div>
              )}

              {/* Expanded analysis result */}
              {entry.state === 'done' && entry.result && entry.expanded && (
                <AnalysisResultPanel result={entry.result} />
              )}
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
        Análisis generado por Gemini AI · Los resultados son orientativos, verifica manualmente ante dudas.
      </p>
    </div>
  );
};

// ─── Summary card helper ──────────────────────────────────────────────────────

function SummaryCard({
  value, label, color, icon,
}: {
  value: number;
  label: string;
  color: 'slate' | 'red' | 'amber' | 'green';
  icon: React.ReactNode;
}) {
  const styles = {
    slate: 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600',
    red:   'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
  };
  return (
    <div className={`rounded-xl border p-3 flex items-center gap-3 ${styles[color]}`}>
      <div className="opacity-80">{icon}</div>
      <div>
        <p className="text-2xl font-extrabold leading-none">{value}</p>
        <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Key helper ──────────────────────────────────────────────────────────────

function entryKey(e: AssignedFile): string {
  return `${e.officialId}::${e.fileIndex}::${e.file.name}`;
}
