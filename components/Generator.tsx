import React from 'react';
import { Official, EmailTemplate, Campaign, EmailLog } from '../types';
import { useEmailGenerator } from '../hooks/useEmailGenerator';

import { GmailAuthBanner } from './generator/GmailAuthBanner';
import { CampaignSelector } from './generator/CampaignSelector';
import { RecipientSelector } from './generator/RecipientSelector';
import { EmailComposer } from './generator/EmailComposer';
import { PreviewEmailModal } from './generator/PreviewEmailModal';
import { BulkSendConfirm, BulkSendProgress } from './generator/BulkSendModal';

import { AlertCircle, Users, Mail, ArrowRight, RefreshCw, X } from 'lucide-react';

// ─── Props ────────────────────────────────────────────────────────────────────

interface GeneratorProps {
  officials: Official[];
  template: EmailTemplate;
  files: File[];
  campaigns: Campaign[];
  databaseId: string;
  onCampaignCreate: (name: string) => Campaign;
  onLogEmail: (
    campaignId: string,
    log: Omit<EmailLog, 'id' | 'campaignId' | 'status'>,
    logId?: string
  ) => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Generator: React.FC<GeneratorProps> = ({
  officials,
  template,
  files,
  campaigns,
  databaseId,
  onCampaignCreate,
  onLogEmail,
  onToast,
}) => {
  const g = useEmailGenerator({
    officials,
    template,
    files,
    campaigns,
    databaseId,
    onCampaignCreate,
    onLogEmail,
    onToast,
  });

  // Empty-state guard
  if (officials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-dark-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
        <p className="text-slate-600 dark:text-slate-400">
          No hay funcionarios en la base de datos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Draft recovery banner */}
      {g.hasDraft && g.step === 'select' && g.selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
              <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-bold text-blue-900 dark:text-blue-300 text-sm">
                Borrador recuperado
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                Se encontró un borrador guardado con{' '}
                <strong>{g.selectedIds.size}</strong> destinatarios seleccionados.
              </p>
            </div>
          </div>
          <button
            onClick={g.clearDraft}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
          >
            <X className="w-3 h-3" /> Descartar
          </button>
        </div>
      )}

      {/* Gmail auth warning */}
      {!g.gmailTokenPresent && (
        <GmailAuthBanner
          onAuthorize={g.handleAuthorizeGmail}
          authorizing={g.authorizingGmail}
        />
      )}

      {/* Campaign selector */}
      <CampaignSelector
        campaigns={campaigns}
        activeCampaignId={g.activeCampaignId}
        activeCampaign={g.activeCampaign}
        isCreatingCampaign={g.isCreatingCampaign}
        newCampaignName={g.newCampaignName}
        onSelectCampaign={g.setActiveCampaignId}
        onStartCreate={() => g.setIsCreatingCampaign(true)}
        onCancelCreate={() => g.setIsCreatingCampaign(false)}
        onConfirmCreate={g.handleCreateCampaign}
        onNewCampaignNameChange={g.setNewCampaignName}
      />

      {/* Step indicator */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => g.setStep('select')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            g.step === 'select'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white dark:bg-dark-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-300'
          }`}
        >
          <Users className="w-4 h-4" />
          1. Seleccionar Destinatarios
          {g.selectedIds.size > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                g.step === 'select'
                  ? 'bg-white/20 text-white'
                  : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
              }`}
            >
              {g.selectedIds.size}
            </span>
          )}
        </button>
        <ArrowRight className="w-4 h-4 text-slate-400" />
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            g.step === 'compose'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white dark:bg-dark-800 text-slate-500 dark:text-slate-500 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Mail className="w-4 h-4" />
          2. Componer y Enviar
        </div>
      </div>

      {/* Step 1 — Select recipients */}
      {g.step === 'select' && (
        <RecipientSelector
          officials={officials}
          selectedIds={g.selectedIds}
          selectionSearch={g.selectionSearch}
          selectionDept={g.selectionDept}
          selectionView={g.selectionView}
          departments={g.departments}
          filteredForSelection={g.filteredForSelection}
          bossGroups={g.bossGroups}
          activeCampaignId={g.activeCampaignId}
          onSearchChange={g.setSelectionSearch}
          onDeptChange={g.setSelectionDept}
          onViewChange={g.setSelectionView}
          onToggleSelect={g.toggleSelect}
          onToggleBossGroup={g.toggleBossGroup}
          onSelectAll={g.selectAll}
          onSelectNone={g.selectNone}
          onProceed={g.proceedToCompose}
        />
      )}

      {/* Step 2 — Compose & send */}
      {g.step === 'compose' && (
        <EmailComposer
          globalFiles={files}
          currentItems={g.currentItems}
          filteredEmails={g.filteredEmails}
          pendingEmails={g.pendingEmails}
          viewMode={g.viewMode}
          searchTerm={g.searchTerm}
          subdirectoraEmail={g.subdirectoraEmail}
          sendingEmailId={g.sendingEmailId}
          currentPage={g.currentPage}
          totalPages={g.totalPages}
          onViewModeChange={g.setViewMode}
          onSearchChange={g.setSearchTerm}
          onSubdirectoraEmailChange={g.setSubdirectoraEmail}
          onOpenPreview={email => g.setPreviewEmail(email)}
          onSendDirect={g.handleSendDirect}
          onDownloadEml={g.handleDownloadEml}
          onRemove={g.handleRemoveFromCompose}
          onToggleRecipient={g.toggleRecipient}
          onToggleCc={g.toggleCc}
          onToggleSubdirectoraCc={g.toggleSubdirectoraCc}
          onEmailChange={g.handleEmailChange}
          onAddAttachment={g.handleAddPersonalAttachment}
          onRemoveAttachment={g.handleRemovePersonalAttachment}
          onPageChange={g.setCurrentPage}
          onBulkSendClick={() => g.setShowBulkConfirm(true)}
        />
      )}

      {/* Bulk send confirm modal */}
      {g.showBulkConfirm && (
        <BulkSendConfirm
          pendingCount={g.pendingEmails.length}
          sentCount={g.editableEmails.filter(e => e.sent).length}
          noAddressCount={g.editableEmails.filter(
            e => !(e.recipientType === 'official' ? e.official.email : e.official.bossEmail)
          ).length}
          onConfirm={g.handleSendAll}
          onCancel={() => g.setShowBulkConfirm(false)}
        />
      )}

      {/* Bulk send progress overlay */}
      {g.bulkSending && g.bulkProgress && (
        <BulkSendProgress
          progress={g.bulkProgress}
          onCancel={g.cancelBulkSend}
        />
      )}

      {/* Preview modal */}
      {g.previewEmail && (
        <PreviewEmailModal
          email={g.previewEmail}
          globalFiles={files}
          subdirectoraEmail={g.subdirectoraEmail}
          onClose={() => g.setPreviewEmail(null)}
          onSend={g.handleSendDirect}
          onDownload={g.handleDownloadEml}
          sending={g.sendingEmailId === g.previewEmail.id}
        />
      )}
    </div>
  );
};
