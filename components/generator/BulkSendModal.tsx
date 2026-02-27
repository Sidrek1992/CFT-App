import React from 'react';
import { BulkProgress } from '../../hooks/useEmailGenerator';
import { EditableEmail } from '../../hooks/useEmailGenerator';
import { Send, Loader2, AlertCircle, Check, X } from 'lucide-react';

// ─── Confirm dialog ───────────────────────────────────────────────────────────

interface BulkSendConfirmProps {
  pendingCount: number;
  sentCount: number;
  noAddressCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const BulkSendConfirm: React.FC<BulkSendConfirmProps> = ({
  pendingCount,
  sentCount,
  noAddressCount,
  onConfirm,
  onCancel,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200 overflow-hidden">
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Send className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">Enviar todos los correos</h3>
            <p className="text-green-100 text-sm">Confirma antes de continuar</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="bg-slate-50 dark:bg-dark-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Correos a enviar:</span>
            <span className="font-bold text-slate-900 dark:text-white">{pendingCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Ya enviados:</span>
            <span className="font-bold text-green-600 dark:text-green-400">{sentCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Sin dirección válida:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">{noAddressCount}</span>
          </div>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400">
          Se enviarán{' '}
          <strong className="text-slate-800 dark:text-white">{pendingCount} correos</strong> usando
          la API de Gmail con un pequeño intervalo entre envíos para evitar límites de velocidad.
        </p>

        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Revisa los correos antes de enviar. Una vez iniciado el proceso, podrás cancelarlo
            pero los correos ya enviados no se pueden revertir.
          </p>
        </div>
      </div>

      <div className="flex gap-3 px-6 pb-6">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-dark-700 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md"
        >
          <Send className="w-4 h-4" />
          Enviar {pendingCount} correos
        </button>
      </div>
    </div>
  </div>
);

// ─── Progress overlay ─────────────────────────────────────────────────────────

interface BulkSendProgressProps {
  progress: BulkProgress;
  onCancel: () => void;
}

export const BulkSendProgress: React.FC<BulkSendProgressProps> = ({ progress, onCancel }) => {
  const okCount = progress.results.filter(r => r.status === 'ok').length;
  const errCount = progress.results.filter(r => r.status === 'error').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header + progress bar */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white">Enviando correos...</h3>
              <p className="text-indigo-100 text-sm">
                {progress.current} de {progress.total} procesados
              </p>
            </div>
          </div>
          <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>

        {/* Results log */}
        <div className="max-h-56 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          {progress.results.length === 0 && (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
              Iniciando envíos...
            </p>
          )}
          {[...progress.results].reverse().map((r, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                r.status === 'ok'
                  ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
              }`}
            >
              {r.status === 'ok' ? (
                <Check className="w-3.5 h-3.5 flex-shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 flex-shrink-0" />
              )}
              <span className="truncate flex-1">{r.to}</span>
              {r.status === 'error' && (
                <span className="truncate text-[10px] opacity-75">{r.error}</span>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center">
          <div className="flex gap-4 text-sm">
            <span className="text-green-600 dark:text-green-400 font-semibold">
              {okCount} enviados
            </span>
            {errCount > 0 && (
              <span className="text-red-600 dark:text-red-400 font-semibold">
                {errCount} errores
              </span>
            )}
          </div>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors font-medium"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
