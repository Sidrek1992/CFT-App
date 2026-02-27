import React from 'react';
import { EditableEmail } from '../../hooks/useEmailGenerator';
import { Eye, X, Paperclip, Download, Send, Loader2 } from 'lucide-react';

interface PreviewEmailModalProps {
  email: EditableEmail;
  globalFiles: File[];
  subdirectoraEmail: string;
  onClose: () => void;
  onSend: (email: EditableEmail) => void;
  onDownload: (email: EditableEmail) => void;
  sending: boolean;
}

export const PreviewEmailModal: React.FC<PreviewEmailModalProps> = ({
  email,
  globalFiles,
  subdirectoraEmail,
  onClose,
  onSend,
  onDownload,
  sending,
}) => {
  const to =
    email.recipientType === 'official' ? email.official.email : email.official.bossEmail;
  const ccList: string[] = [];
  if (email.includeCc && email.recipientType === 'official' && email.official.bossEmail)
    ccList.push(email.official.bossEmail);
  if (email.includeSubdirectora && subdirectoraEmail) ccList.push(subdirectoraEmail);
  if (email.additionalCc) ccList.push(email.additionalCc);
  const allAttachments = [...globalFiles, ...email.personalAttachments];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center">
              <Eye className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Vista Previa del Correo
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{email.official.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {/* Email metadata */}
          <div className="px-6 py-4 space-y-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-dark-900/40">
            <div className="grid grid-cols-[60px_1fr] gap-2 text-sm items-start">
              <span className="font-semibold text-slate-500 dark:text-slate-400 pt-0.5">Para:</span>
              <span className="text-slate-900 dark:text-white font-medium">
                {to || <span className="text-red-500 italic">Sin correo</span>}
              </span>
            </div>
            {ccList.length > 0 && (
              <div className="grid grid-cols-[60px_1fr] gap-2 text-sm items-start">
                <span className="font-semibold text-slate-500 dark:text-slate-400">CC:</span>
                <span className="text-slate-700 dark:text-slate-300">{ccList.join(', ')}</span>
              </div>
            )}
            <div className="grid grid-cols-[60px_1fr] gap-2 text-sm items-start">
              <span className="font-semibold text-slate-500 dark:text-slate-400">Asunto:</span>
              <span className="text-slate-900 dark:text-white font-semibold">
                {email.subject || '(Sin asunto)'}
              </span>
            </div>
            {allAttachments.length > 0 && (
              <div className="grid grid-cols-[60px_1fr] gap-2 text-sm items-start">
                <span className="font-semibold text-slate-500 dark:text-slate-400 pt-0.5">
                  Adjuntos:
                </span>
                <div className="flex flex-wrap gap-2">
                  {allAttachments.map((f, i) => (
                    <span
                      key={i}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        i < globalFiles.length
                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                      }`}
                    >
                      <Paperclip className="w-3 h-3" />
                      {f.name}
                      {i >= globalFiles.length && (
                        <span className="opacity-60 text-[10px]">(personal)</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Email HTML body */}
          <div className="px-6 py-5">
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 bg-white dark:bg-dark-900/30 border border-slate-200 dark:border-slate-700 rounded-xl p-5 min-h-[200px]"
              dangerouslySetInnerHTML={{
                __html: email.body || '<p class="text-slate-400 italic">Sin contenido</p>',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-900/40 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Cerrar
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onDownload(email)}
              className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-700 flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              Descargar .EML
            </button>
            <button
              onClick={() => onSend(email)}
              disabled={sending || !to}
              className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sending ? 'Enviando...' : 'Enviar Ahora'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
