import React from 'react';
import { Gender } from '../../types';
import { EditableEmail } from '../../hooks/useEmailGenerator';
import { EmailEditor } from '../EmailEditor';
import {
  Send, Check, Download, Eye, Trash2, Loader2, Paperclip, Plus, Search,
  LayoutGrid, LayoutList, UserCog, UserCircle2, Crown, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { formatFileSize } from '../../hooks/useEmailGenerator';

interface EmailComposerProps {
  globalFiles: File[];
  currentItems: EditableEmail[];
  filteredEmails: EditableEmail[];
  pendingEmails: EditableEmail[];
  viewMode: 'cards' | 'compact';
  searchTerm: string;
  subdirectoraEmail: string;
  sendingEmailId: string | null;
  currentPage: number;
  totalPages: number;

  // Handlers
  onViewModeChange: (mode: 'cards' | 'compact') => void;
  onSearchChange: (v: string) => void;
  onSubdirectoraEmailChange: (v: string) => void;
  onOpenPreview: (email: EditableEmail) => void;
  onSendDirect: (email: EditableEmail) => void;
  onDownloadEml: (email: EditableEmail) => void;
  onRemove: (emailId: string) => void;
  onToggleRecipient: (id: string, type: 'official' | 'boss') => void;
  onToggleCc: (id: string) => void;
  onToggleSubdirectoraCc: (id: string) => void;
  onEmailChange: (id: string, field: 'subject' | 'body', value: string) => void;
  onAddAttachment: (emailId: string, files: FileList | null) => void;
  onRemoveAttachment: (emailId: string, index: number) => void;
  onPageChange: (page: number) => void;
  onBulkSendClick: () => void;
}

export const EmailComposer: React.FC<EmailComposerProps> = ({
  globalFiles,
  currentItems,
  filteredEmails,
  pendingEmails,
  viewMode,
  searchTerm,
  subdirectoraEmail,
  sendingEmailId,
  currentPage,
  totalPages,
  onViewModeChange,
  onSearchChange,
  onSubdirectoraEmailChange,
  onOpenPreview,
  onSendDirect,
  onDownloadEml,
  onRemove,
  onToggleRecipient,
  onToggleCc,
  onToggleSubdirectoraCc,
  onEmailChange,
  onAddAttachment,
  onRemoveAttachment,
  onPageChange,
  onBulkSendClick,
}) => (
  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">

    {/* Controls bar */}
    <div className="bg-white dark:bg-dark-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-4">
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center border-b border-slate-100 dark:border-slate-700 pb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">
            {filteredEmails.length} correo(s)
            {pendingEmails.length > 0 && (
              <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                ({pendingEmails.length} pendiente{pendingEmails.length !== 1 ? 's' : ''})
              </span>
            )}
          </h2>
          <div className="bg-slate-100 p-1 rounded-lg flex border border-slate-200">
            <button
              onClick={() => onViewModeChange('cards')}
              className={`p-1.5 rounded-md ${viewMode === 'cards' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('compact')}
              className={`p-1.5 rounded-md ${viewMode === 'compact' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={onBulkSendClick}
            disabled={pendingEmails.length === 0}
            title={
              pendingEmails.length === 0
                ? 'Todos los correos ya fueron enviados'
                : `Enviar los ${pendingEmails.length} correos pendientes`
            }
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-bold transition-all shadow-sm hover:shadow-md"
          >
            <Send className="w-4 h-4" />
            Enviar Todo ({pendingEmails.length})
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => onSearchChange(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Buscar en lista..."
            />
          </div>
        </div>
      </div>

      {/* Subdirectora CC input */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-indigo-50 dark:bg-indigo-950/30 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
        <label className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5 whitespace-nowrap">
          <UserCog className="w-3.5 h-3.5" /> Correo Subdirectora (CC opcional):
        </label>
        <input
          type="email"
          value={subdirectoraEmail}
          onChange={e => onSubdirectoraEmailChange(e.target.value)}
          className="flex-1 w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-dark-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    </div>

    {/* Cards view */}
    {viewMode === 'cards' && (
      <div className="grid grid-cols-1 gap-6">
        {currentItems.map(item => (
          <EmailCard
            key={item.id}
            item={item}
            globalFiles={globalFiles}
            sendingEmailId={sendingEmailId}
            onOpenPreview={onOpenPreview}
            onSendDirect={onSendDirect}
            onDownloadEml={onDownloadEml}
            onRemove={onRemove}
            onToggleRecipient={onToggleRecipient}
            onToggleCc={onToggleCc}
            onToggleSubdirectoraCc={onToggleSubdirectoraCc}
            onEmailChange={onEmailChange}
            onAddAttachment={onAddAttachment}
            onRemoveAttachment={onRemoveAttachment}
          />
        ))}
      </div>
    )}

    {/* Compact view */}
    {viewMode === 'compact' && (
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-dark-900/60 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Correo destino</th>
              <th className="px-4 py-3">Adjuntos</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {currentItems.map(item => {
              const to =
                item.recipientType === 'official'
                  ? item.official.email
                  : item.official.bossEmail;
              const totalAttachments = globalFiles.length + item.personalAttachments.length;
              return (
                <tr key={item.id} className={item.sent ? 'bg-green-50/30 dark:bg-green-950/20' : ''}>
                  <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">
                    {item.official.name}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-[180px] truncate">
                    {to || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <label className="cursor-pointer flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                      <Paperclip className="w-3 h-3" />
                      {totalAttachments > 0 ? `${totalAttachments} arch.` : '+ Adjuntar'}
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={e => onAddAttachment(item.id, e.target.files)}
                      />
                    </label>
                  </td>
                  <td className="px-4 py-3">
                    {item.sent ? (
                      <span className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 px-2 py-0.5 rounded text-[10px] font-bold">
                        Enviado
                      </span>
                    ) : (
                      <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded text-[10px]">
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => onOpenPreview({ ...item })}
                        className="p-1.5 text-slate-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 rounded transition-colors"
                        title="Vista Previa"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDownloadEml(item)}
                        className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-700 rounded transition-colors"
                        title="Descargar EML"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onSendDirect(item)}
                        disabled={sendingEmailId === item.id}
                        className={`p-1.5 rounded transition-colors ${
                          item.sent
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
                        }`}
                        title="Enviar Directo"
                      >
                        {sendingEmailId === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : item.sent ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => onRemove(item.id)}
                        title="Quitar de la lista"
                        className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}

    {/* Pagination */}
    {totalPages > 1 && (
      <div className="flex justify-center gap-4 pt-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 bg-white dark:bg-dark-800 rounded hover:bg-slate-50 disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm self-center text-slate-700 dark:text-slate-300">
          Página {currentPage} de {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 bg-white dark:bg-dark-800 rounded hover:bg-slate-50 disabled:opacity-50"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    )}
  </div>
);

// ─── Email Card (sub-component) ───────────────────────────────────────────────

interface EmailCardProps {
  item: EditableEmail;
  globalFiles: File[];
  sendingEmailId: string | null;
  onOpenPreview: (email: EditableEmail) => void;
  onSendDirect: (email: EditableEmail) => void;
  onDownloadEml: (email: EditableEmail) => void;
  onRemove: (emailId: string) => void;
  onToggleRecipient: (id: string, type: 'official' | 'boss') => void;
  onToggleCc: (id: string) => void;
  onToggleSubdirectoraCc: (id: string) => void;
  onEmailChange: (id: string, field: 'subject' | 'body', value: string) => void;
  onAddAttachment: (emailId: string, files: FileList | null) => void;
  onRemoveAttachment: (emailId: string, index: number) => void;
}

const EmailCard: React.FC<EmailCardProps> = ({
  item,
  globalFiles,
  sendingEmailId,
  onOpenPreview,
  onSendDirect,
  onDownloadEml,
  onRemove,
  onToggleRecipient,
  onToggleCc,
  onToggleSubdirectoraCc,
  onEmailChange,
  onAddAttachment,
  onRemoveAttachment,
}) => (
  <div
    className={`bg-white dark:bg-dark-800 rounded-xl shadow-sm border-2 transition-colors ${
      item.sent ? 'border-green-300 dark:border-green-800' : 'border-slate-200 dark:border-slate-700'
    }`}
  >
    {/* Card header */}
    <div
      className={`px-5 py-3 border-b dark:border-slate-700 flex flex-col lg:flex-row justify-between gap-3 ${
        item.sent ? 'bg-green-50/50 dark:bg-green-950/20' : 'bg-slate-50 dark:bg-dark-900/40'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
            item.official.gender === Gender.Female
              ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-600'
              : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600'
          }`}
        >
          <UserCircle2 className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            {item.official.isBoss && (
              <Crown className="w-3 h-3 text-amber-500 fill-amber-400" />
            )}
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">
              {item.official.name}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{item.official.position}</p>
        </div>
        {/* Recipient toggle */}
        <div className="flex gap-1.5 ml-2">
          <button
            onClick={() => onToggleRecipient(item.id, 'official')}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              item.recipientType === 'official'
                ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Oficial
          </button>
          <button
            onClick={() => onToggleRecipient(item.id, 'boss')}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              item.recipientType === 'boss'
                ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Jefatura
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => onToggleCc(item.id)}
          className={`px-2.5 py-1 text-xs rounded border transition-colors ${
            item.includeCc
              ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
              : 'bg-white dark:bg-dark-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-300'
          }`}
        >
          CC Jefe
        </button>
        <button
          onClick={() => onToggleSubdirectoraCc(item.id)}
          className={`px-2.5 py-1 text-xs rounded border transition-colors ${
            item.includeSubdirectora
              ? 'bg-pink-50 dark:bg-pink-900/40 border-pink-200 dark:border-pink-700 text-pink-700 dark:text-pink-300'
              : 'bg-white dark:bg-dark-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-pink-300'
          }`}
        >
          CC Sub
        </button>
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-600 mx-0.5" />
        <button
          onClick={() => onOpenPreview({ ...item })}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-dark-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded hover:border-indigo-400 hover:text-indigo-600 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" /> Vista Previa
        </button>
        <button
          onClick={() => onDownloadEml(item)}
          className="p-1.5 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-dark-700 text-slate-600 dark:text-slate-300 transition-colors"
          title="Descargar EML"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={() => onSendDirect(item)}
          disabled={sendingEmailId === item.id}
          className={`px-3 py-1.5 text-xs font-semibold rounded flex items-center gap-1.5 transition-all ${
            item.sent
              ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-400 shadow-sm'
          }`}
        >
          {sendingEmailId === item.id ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : item.sent ? (
            <Check className="w-3 h-3" />
          ) : (
            <Send className="w-3 h-3" />
          )}
          {sendingEmailId === item.id ? 'Enviando...' : item.sent ? 'Enviado' : 'Enviar'}
        </button>
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-600 mx-0.5" />
        <button
          onClick={() => onRemove(item.id)}
          title="Quitar de la lista"
          className="p-1.5 border border-red-200 dark:border-red-900 rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>

    {/* Subject + editor */}
    <div className="p-4">
      <div className="mb-2">
        <input
          type="text"
          value={item.subject}
          onChange={e => onEmailChange(item.id, 'subject', e.target.value)}
          className="w-full text-sm font-bold border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 outline-none bg-transparent text-slate-800 dark:text-white py-1"
        />
      </div>
      <EmailEditor
        content={item.body}
        onChange={val => onEmailChange(item.id, 'body', val)}
      />
    </div>

    {/* Personal attachments */}
    <div className="px-4 pb-4 pt-0">
      <div className="border border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-3 bg-slate-50 dark:bg-dark-900/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
            Adjuntos personales
            {item.personalAttachments.length > 0 && (
              <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-1.5 rounded-full text-[10px] font-bold">
                {item.personalAttachments.length}
              </span>
            )}
          </span>
          <label className="cursor-pointer flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors">
            <Plus className="w-3 h-3" /> Agregar archivo
            <input
              type="file"
              multiple
              className="hidden"
              onChange={e => onAddAttachment(item.id, e.target.files)}
            />
          </label>
        </div>
        {item.personalAttachments.length === 0 && globalFiles.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 italic">
            Sin adjuntos — solo para esta persona
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {globalFiles.map((f, i) => (
              <span
                key={`g-${i}`}
                className="flex items-center gap-1 px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs"
              >
                <Paperclip className="w-3 h-3" />
                {f.name}
                <span className="opacity-50 text-[10px]">(global)</span>
              </span>
            ))}
            {item.personalAttachments.map((f, i) => (
              <span
                key={`p-${i}`}
                className="flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded text-xs"
              >
                <Paperclip className="w-3 h-3" />
                {f.name}
                <span className="opacity-60 text-[10px]">({formatFileSize(f.size)})</span>
                <button
                  onClick={() => onRemoveAttachment(item.id, i)}
                  className="ml-0.5 text-indigo-400 hover:text-red-500 transition-colors"
                >
                  {/* inline X to avoid extra import */}
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);
