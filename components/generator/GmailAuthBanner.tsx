import React from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface GmailAuthBannerProps {
  onAuthorize: () => void;
  authorizing: boolean;
}

export const GmailAuthBanner: React.FC<GmailAuthBannerProps> = ({ onAuthorize, authorizing }) => (
  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4 shadow-sm">
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="min-w-0">
        <p className="font-bold text-amber-900 dark:text-amber-300 text-sm">
          Autorización de Gmail requerida
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
          Para enviar correos directamente necesitas autorizar el acceso a Gmail. Haz clic en el
          botón para autorizarlo ahora.
        </p>
      </div>
    </div>
    <button
      onClick={onAuthorize}
      disabled={authorizing}
      className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg text-sm font-semibold transition-all shadow-sm whitespace-nowrap flex-shrink-0"
    >
      {authorizing ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" /> Autorizando...
        </>
      ) : (
        <>
          <ShieldAlert className="w-4 h-4" /> Autorizar Gmail
        </>
      )}
    </button>
  </div>
);
