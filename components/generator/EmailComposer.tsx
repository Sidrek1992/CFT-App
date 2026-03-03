import React, { useRef } from 'react';
import { Gender, PdfAnalysisResult } from '../../types';
import { EditableEmail, AutoAssignResult } from '../../hooks/useEmailGenerator';
import { EmailEditor } from '../EmailEditor';
import {
  Send, Check, Download, Eye, Trash2, Loader2, Paperclip, Plus, Search,
  LayoutGrid, LayoutList, UserCog, UserCircle2, Crown, ChevronLeft, ChevronRight,
  Wand2, HardDrive, FolderOpen, X, CheckCircle2, AlertCircle, ScanSearch,
  Users, UserCheck, ToggleLeft, ToggleRight, ShieldAlert, Info,
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

  // Auto-assign
  autoAssigning: boolean;
  autoAssignResult: AutoAssignResult | null;
  onAutoAssignLocal: (files: FileList | null) => void;
  onAutoAssignDrive: () => void;
  onClearAutoAssignResult: () => void;
  gmailTokenPresent: boolean;

  // Global CC
  globalCcBoss: boolean;
  globalCcGestion: boolean;
  onToggleGlobalCcBoss: () => void;
  onToggleGlobalCcGestion: () => void;
  gestionPersonasEmail: string;

  // PDF Analyzer
  analyzingPdfId: string | null;
  pdfAnalysisResult: PdfAnalysisResult | null;
  onAnalyzePdf: (emailId: string, fileIndex: number, file: File) => void;
  onClearPdfResult: () => void;
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
  autoAssigning,
  autoAssignResult,
  onAutoAssignLocal,
  onAutoAssignDrive,
  onClearAutoAssignResult,
  gmailTokenPresent,
  globalCcBoss,
  globalCcGestion,
  onToggleGlobalCcBoss,
  onToggleGlobalCcGestion,
  gestionPersonasEmail,
  analyzingPdfId,
  pdfAnalysisResult,
  onAnalyzePdf,
  onClearPdfResult,
}) => {
  const autoAssignInputRef = useRef<HTMLInputElement>(null);
  return (
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
          {/* Auto-assign buttons */}
          <div className="flex items-center gap-1.5 border border-violet-200 dark:border-violet-800 rounded-lg p-1 bg-violet-50 dark:bg-violet-950/30">
            <span className="text-[11px] font-semibold text-violet-700 dark:text-violet-300 pl-1.5 flex items-center gap-1">
              <Wand2 className="w-3 h-3" /> Auto-asignar
            </span>
            {/* From local disk */}
            <label
              title="Sube archivos desde tu computador. El sistema los asigna automáticamente según el nombre del funcionario."
              className="cursor-pointer flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-violet-700 dark:text-violet-300 bg-white dark:bg-dark-800 border border-violet-300 dark:border-violet-700 rounded-md hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Desde PC
              <input
                ref={autoAssignInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={e => onAutoAssignLocal(e.target.files)}
                // reset so same files can be re-selected
                onClick={e => { (e.target as HTMLInputElement).value = ''; }}
              />
            </label>
            {/* From Drive */}
            <button
              onClick={onAutoAssignDrive}
              disabled={autoAssigning || !gmailTokenPresent}
              title={
                !gmailTokenPresent
                  ? 'Debes autorizar Gmail primero para usar Drive'
                  : 'Elige varios archivos de Drive y se asignan automáticamente'
              }
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-violet-700 dark:text-violet-300 bg-white dark:bg-dark-800 border border-violet-300 dark:border-violet-700 rounded-md hover:bg-violet-100 dark:hover:bg-violet-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {autoAssigning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <HardDrive className="w-3.5 h-3.5" />
              )}
              Desde Drive
            </button>
          </div>
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-600" />
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

      {/* CC Global section */}
      <div className="bg-indigo-50 dark:bg-indigo-950/30 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/50 space-y-3">
        <p className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
          <UserCog className="w-3.5 h-3.5" /> Copias CC globales — aplican a todos los correos
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Toggle CC Jefatura global */}
          <button
            onClick={onToggleGlobalCcBoss}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all flex-1 justify-center ${
              globalCcBoss
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                : 'bg-white dark:bg-dark-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-indigo-400'
            }`}
          >
            {globalCcBoss
              ? <ToggleRight className="w-4 h-4" />
              : <ToggleLeft className="w-4 h-4" />}
            <Users className="w-3.5 h-3.5" />
            CC Jefatura a todos
            {globalCcBoss && <span className="ml-1 bg-white/20 px-1.5 rounded-full text-[10px]">ON</span>}
          </button>
          {/* Toggle CC Gestión de Personas global */}
          <button
            onClick={onToggleGlobalCcGestion}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all flex-1 justify-center ${
              globalCcGestion
                ? 'bg-pink-600 text-white border-pink-700 shadow-sm'
                : 'bg-white dark:bg-dark-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-pink-400'
            }`}
          >
            {globalCcGestion
              ? <ToggleRight className="w-4 h-4" />
              : <ToggleLeft className="w-4 h-4" />}
            <UserCheck className="w-3.5 h-3.5" />
            CC Gestión de Personas a todos
            {globalCcGestion && <span className="ml-1 bg-white/20 px-1.5 rounded-full text-[10px]">ON</span>}
          </button>
        </div>
        {/* Gestión de Personas email field */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <label className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 whitespace-nowrap">
            Correo Gestión de Personas / Subdirectora:
          </label>
          <input
            type="email"
            value={subdirectoraEmail}
            onChange={e => onSubdirectoraEmailChange(e.target.value)}
            className="flex-1 w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-dark-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {gestionPersonasEmail && gestionPersonasEmail !== subdirectoraEmail && (
            <button
              onClick={() => onSubdirectoraEmailChange(gestionPersonasEmail)}
              className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
              title="Usar email detectado desde la base de datos"
            >
              Usar BD: {gestionPersonasEmail}
            </button>
          )}
        </div>
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
            analyzingPdfId={analyzingPdfId}
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
            onAnalyzePdf={onAnalyzePdf}
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

    {/* Auto-assign result modal */}
    {autoAssignResult && (
      <AutoAssignResultModal
        result={autoAssignResult}
        onClose={onClearAutoAssignResult}
      />
    )}

    {/* PDF analysis result modal */}
    {pdfAnalysisResult && (
      <PdfAnalysisModal
        result={pdfAnalysisResult}
        onClose={onClearPdfResult}
      />
    )}
  </div>
  );
};

// ─── Email Card (sub-component) ───────────────────────────────────────────────

interface EmailCardProps {
  item: EditableEmail;
  globalFiles: File[];
  sendingEmailId: string | null;
  analyzingPdfId: string | null;
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
  onAnalyzePdf: (emailId: string, fileIndex: number, file: File) => void;
}

const EmailCard: React.FC<EmailCardProps> = ({
  item,
  globalFiles,
  sendingEmailId,
  analyzingPdfId,
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
  onAnalyzePdf,
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
            {item.personalAttachments.map((f, i) => {
              const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
              const pdfKey = `${item.id}::${i}`;
              const isAnalyzing = analyzingPdfId === pdfKey;
              return (
                <span
                  key={`p-${i}`}
                  className="flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded text-xs"
                >
                  <Paperclip className="w-3 h-3" />
                  {f.name}
                  <span className="opacity-60 text-[10px]">({formatFileSize(f.size)})</span>
                  {isPdf && (
                    <button
                      onClick={() => onAnalyzePdf(item.id, i, f)}
                      disabled={isAnalyzing}
                      title="Analizar PDF con IA — detecta inconsistencias en horas y asistencia"
                      className="ml-0.5 text-violet-500 hover:text-violet-700 dark:hover:text-violet-300 disabled:opacity-50 transition-colors"
                    >
                      {isAnalyzing
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <ScanSearch className="w-3 h-3" />}
                    </button>
                  )}
                  <button
                    onClick={() => onRemoveAttachment(item.id, i)}
                    className="ml-0.5 text-indigo-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  </div>
);

// ─── Auto-Assign Result Modal ─────────────────────────────────────────────────

interface AutoAssignResultModalProps {
  result: AutoAssignResult;
  onClose: () => void;
}

const AutoAssignResultModal: React.FC<AutoAssignResultModalProps> = ({ result, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
    <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg max-h-[80vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-violet-500" />
          <h3 className="font-bold text-slate-800 dark:text-white text-base">
            Resultado de asignación automática
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-700 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Summary badges */}
      <div className="flex gap-3 px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-dark-900/40">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-3 py-1 rounded-full">
          <CheckCircle2 className="w-4 h-4" />
          {result.assigned.length} asignado{result.assigned.length !== 1 ? 's' : ''}
        </span>
        {result.unmatched.length > 0 && (
          <span className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-3 py-1 rounded-full">
            <AlertCircle className="w-4 h-4" />
            {result.unmatched.length} sin coincidencia
          </span>
        )}
      </div>

      {/* Body */}
      <div className="overflow-y-auto flex-1 px-5 py-3 space-y-4">
        {result.assigned.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              Archivos asignados
            </p>
            <div className="space-y-1.5">
              {result.assigned.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-100 dark:border-green-900/40 text-sm"
                >
                  <Paperclip className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span className="font-medium text-slate-700 dark:text-slate-200 truncate flex-1">
                    {entry.file.name}
                  </span>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">
                    ({formatFileSize(entry.file.size)})
                  </span>
                  <span className="text-xs text-green-700 dark:text-green-300 flex-shrink-0">
                    → {entry.officialName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.unmatched.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              Sin coincidencia — no asignados
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
              El nombre del archivo no coincide con ningún funcionario en la lista.
            </p>
            <div className="space-y-1.5">
              {result.unmatched.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-100 dark:border-amber-900/40 text-sm"
                >
                  <Paperclip className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300 truncate flex-1">
                    {file.name}
                  </span>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">
                    ({formatFileSize(file.size)})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Entendido
        </button>
      </div>
    </div>
  </div>
);

// ─── PDF Analysis Result Modal ────────────────────────────────────────────────

interface PdfAnalysisModalProps {
  result: PdfAnalysisResult;
  onClose: () => void;
}

const SEVERITY_CONFIG = {
  error: {
    bg: 'bg-red-50 dark:bg-red-950/20',
    border: 'border-red-200 dark:border-red-900/40',
    icon: <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0" />,
    label: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
    text: 'ERROR',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-900/40',
    icon: <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />,
    label: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
    text: 'ATENCIÓN',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-200 dark:border-blue-900/40',
    icon: <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />,
    label: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    text: 'INFO',
  },
} as const;

const PdfAnalysisModal: React.FC<PdfAnalysisModalProps> = ({ result, onClose }) => {
  const errorCount   = result.issues.filter(i => i.severity === 'error').length;
  const warningCount = result.issues.filter(i => i.severity === 'warning').length;
  const hasIssues = result.issues.length > 0;
  const statusColor = errorCount > 0
    ? 'text-red-600 dark:text-red-400'
    : warningCount > 0
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-green-600 dark:text-green-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <ScanSearch className="w-5 h-5 text-violet-500" />
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                Análisis de PDF con IA
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[280px]">
                {result.fileName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2 px-5 py-3 bg-slate-50 dark:bg-dark-900/40 border-b border-slate-100 dark:border-slate-700">
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
            result.isLegible
              ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
              : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
          }`}>
            {result.isLegible ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {result.isLegible ? 'Documento legible' : 'Documento ilegible'}
          </span>
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
            result.horasDetected
              ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
              : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
          }`}>
            {result.horasDetected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {result.horasDetected ? 'Horas detectadas' : 'Horas no detectadas'}
          </span>
          {result.totalHorasFalta !== null && (
            <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
              result.totalHorasFalta > 8
                ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                : result.totalHorasFalta > 0
                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                  : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
            }`}>
              <ShieldAlert className="w-3.5 h-3.5" />
              Total horas falta: {result.totalHorasFalta}h
              {result.totalHorasFalta > 8 && ' ⚠ Alto'}
            </span>
          )}
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
            hasIssues
              ? errorCount > 0
                ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
              : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
          }`}>
            {hasIssues ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {hasIssues ? `${result.issues.length} inconsistencia(s)` : 'Sin inconsistencias'}
          </span>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Summary */}
          <div className="bg-slate-50 dark:bg-dark-900/40 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
              Resumen del documento
            </p>
            <p className={`text-sm font-medium ${statusColor}`}>{result.summary}</p>
          </div>

          {/* Issues list */}
          {hasIssues ? (
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Inconsistencias detectadas
              </p>
              <div className="space-y-2">
                {result.issues.map((issue, idx) => {
                  const cfg = SEVERITY_CONFIG[issue.severity];
                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-2.5 p-3 rounded-lg border ${cfg.bg} ${cfg.border}`}
                    >
                      {cfg.icon}
                      <div className="flex-1 min-w-0">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded mr-1.5 ${cfg.label}`}>
                          {cfg.text}
                        </span>
                        <span className="text-xs text-slate-700 dark:text-slate-200">
                          {issue.description}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900/40">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                El documento no presenta inconsistencias detectables.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            Análisis generado por Gemini AI — puede contener errores. Verifica manualmente.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
