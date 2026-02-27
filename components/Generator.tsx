import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Official, EmailTemplate, Gender, Campaign, EmailLog } from '../types';
import { refineEmailWithAI } from '../services/geminiService';
import { EmailEditor } from './EmailEditor';
import { sendGmail, buildRawMessage, fileToBase64 } from '../services/gmailService';
import { hasGmailToken, reauthorizeWithGoogle } from '../services/authService';
import { buildTrackingPixel, isTrackingEnabled } from '../services/trackingService';
import {
  Send, AlertCircle, CheckSquare, Square, Search, ChevronLeft, ChevronRight,
  Check, Download, Sparkles, Building2, UserCog, X, LayoutList, LayoutGrid,
  History, Plus, Loader2, Paperclip, Eye, Trash2, Users, ArrowRight,
  ChevronDown, ChevronUp, Mail, UserCircle2, Crown, ShieldAlert, RefreshCw
} from 'lucide-react';

interface GeneratorProps {
  officials: Official[];
  template: EmailTemplate;
  files: File[]; // Global attachments from TemplateEditor
  campaigns: Campaign[];
  databaseId: string;
  onCampaignCreate: (name: string) => Campaign;
  onLogEmail: (campaignId: string, log: Omit<EmailLog, 'id' | 'campaignId' | 'status'>, logId?: string) => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
}

interface EditableEmail {
  id: string;
  official: Official;
  recipientType: 'official' | 'boss';
  includeCc: boolean;
  includeSubdirectora: boolean;
  additionalCc: string;
  subject: string;
  body: string;
  sent: boolean;
  aiRefining: boolean;
  personalAttachments: File[]; // Per-person individual attachments
}

type Step = 'select' | 'compose';

const stripHtml = (html: string) => {
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

const normalizeText = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ─── Preview Modal ────────────────────────────────────────────────────────────
const PreviewModal: React.FC<{
  email: EditableEmail;
  globalFiles: File[];
  subdirectoraEmail: string;
  onClose: () => void;
  onSend: (email: EditableEmail) => void;
  onDownload: (email: EditableEmail) => void;
  sending: boolean;
}> = ({ email, globalFiles, subdirectoraEmail, onClose, onSend, onDownload, sending }) => {
  const to = email.recipientType === 'official' ? email.official.email : email.official.bossEmail;
  const ccList: string[] = [];
  if (email.includeCc && email.recipientType === 'official' && email.official.bossEmail)
    ccList.push(email.official.bossEmail);
  if (email.includeSubdirectora && subdirectoraEmail) ccList.push(subdirectoraEmail);
  if (email.additionalCc) ccList.push(email.additionalCc);
  const allAttachments = [...globalFiles, ...email.personalAttachments];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center">
              <Eye className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Vista Previa del Correo</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{email.official.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-700 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1">
          {/* Email Headers */}
          <div className="px-6 py-4 space-y-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-dark-900/40">
            <div className="grid grid-cols-[60px_1fr] gap-2 text-sm items-start">
              <span className="font-semibold text-slate-500 dark:text-slate-400 pt-0.5">Para:</span>
              <span className="text-slate-900 dark:text-white font-medium">{to || <span className="text-red-500 italic">Sin correo</span>}</span>
            </div>
            {ccList.length > 0 && (
              <div className="grid grid-cols-[60px_1fr] gap-2 text-sm items-start">
                <span className="font-semibold text-slate-500 dark:text-slate-400">CC:</span>
                <span className="text-slate-700 dark:text-slate-300">{ccList.join(', ')}</span>
              </div>
            )}
            <div className="grid grid-cols-[60px_1fr] gap-2 text-sm items-start">
              <span className="font-semibold text-slate-500 dark:text-slate-400">Asunto:</span>
              <span className="text-slate-900 dark:text-white font-semibold">{email.subject || '(Sin asunto)'}</span>
            </div>
            {allAttachments.length > 0 && (
              <div className="grid grid-cols-[60px_1fr] gap-2 text-sm items-start">
                <span className="font-semibold text-slate-500 dark:text-slate-400 pt-0.5">Adjuntos:</span>
                <div className="flex flex-wrap gap-2">
                  {allAttachments.map((f, i) => (
                    <span key={i} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${i < globalFiles.length ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'}`}>
                      <Paperclip className="w-3 h-3" />
                      {f.name}
                      {i >= globalFiles.length && <span className="opacity-60 text-[10px]">(personal)</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Email Body */}
          <div className="px-6 py-5">
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 bg-white dark:bg-dark-900/30 border border-slate-200 dark:border-slate-700 rounded-xl p-5 min-h-[200px]"
              dangerouslySetInnerHTML={{ __html: email.body || '<p class="text-slate-400 italic">Sin contenido</p>' }}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-900/40 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
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
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Enviando...' : 'Enviar Ahora'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Draft autosave key ───────────────────────────────────────────────────────
const DRAFT_KEY = 'generator_draft_v1';

interface GeneratorDraft {
    step: Step;
    selectedIds: string[];
    activeCampaignId: string;
    subdirectoraEmail: string;
    // Serializable form of editable emails (no File objects)
    emailBodies: Record<string, { subject: string; body: string; includeCc: boolean; includeSubdirectora: boolean; additionalCc: string }>;
    savedAt: number;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const Generator: React.FC<GeneratorProps> = ({
  officials, template, files, campaigns, databaseId, onCampaignCreate, onLogEmail, onToast
}) => {

  // ── Step State ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>(() => {
      try {
          const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') as GeneratorDraft | null;
          return draft?.step || 'select';
      } catch { return 'select'; }
  });
  const [hasDraft, setHasDraft] = useState(() => !!localStorage.getItem(DRAFT_KEY));

  // ── Gmail Token State ─────────────────────────────────────────────────────
  const [gmailTokenPresent, setGmailTokenPresent] = useState<boolean>(() => hasGmailToken());
  const [authorizingGmail, setAuthorizingGmail] = useState(false);

  const handleAuthorizeGmail = async () => {
    setAuthorizingGmail(true);
    try {
      await reauthorizeWithGoogle();
      setGmailTokenPresent(true);
      onToast('✅ Gmail autorizado correctamente. Ya puedes enviar correos.', 'success');
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        onToast(`Error al autorizar Gmail: ${err.message}`, 'error');
      }
    } finally {
      setAuthorizingGmail(false);
    }
  };

  // ── Campaign State ────────────────────────────────────────────────────────
  const [activeCampaignId, setActiveCampaignId] = useState<string>(() => {
      try {
          const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') as GeneratorDraft | null;
          return draft?.activeCampaignId || '';
      } catch { return ''; }
  });
  const [newCampaignName, setNewCampaignName] = useState('');
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const activeCampaign = campaigns.find(c => c.id === activeCampaignId);

  // ── Step 1: Selection State ───────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
      try {
          const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') as GeneratorDraft | null;
          return new Set(draft?.selectedIds || []);
      } catch { return new Set(); }
  });
  const [selectionSearch, setSelectionSearch] = useState('');
  const [selectionDept, setSelectionDept] = useState('Todos');
  const [selectionView, setSelectionView] = useState<'grid' | 'boss'>('grid');

  // ── Step 2: Email/Compose State ───────────────────────────────────────────
  const [editableEmails, setEditableEmails] = useState<EditableEmail[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>('cards');
  const [subdirectoraEmail, setSubdirectoraEmail] = useState(() => {
      try {
          const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') as GeneratorDraft | null;
          return draft?.subdirectoraEmail || 'gestion.personas@cftestatalaricayparinacota.cl';
      } catch { return 'gestion.personas@cftestatalaricayparinacota.cl'; }
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [previewEmail, setPreviewEmail] = useState<EditableEmail | null>(null);

  // File input refs per email card (keyed by email id)
  const attachmentRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // ── Draft Autosave (runs on every meaningful state change, 2s debounce) ──
  useEffect(() => {
      const timer = setTimeout(() => {
          const emailBodies: GeneratorDraft['emailBodies'] = {};
          editableEmails.forEach(e => {
              emailBodies[e.official.id] = {
                  subject: e.subject,
                  body: e.body,
                  includeCc: e.includeCc,
                  includeSubdirectora: e.includeSubdirectora,
                  additionalCc: e.additionalCc,
              };
          });
          const draft: GeneratorDraft = {
              step,
              selectedIds: Array.from(selectedIds),
              activeCampaignId,
              subdirectoraEmail,
              emailBodies,
              savedAt: Date.now(),
          };
          localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      }, 2000);
      return () => clearTimeout(timer);
  }, [step, selectedIds, activeCampaignId, subdirectoraEmail, editableEmails]);

  const clearDraft = () => {
      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
  };

  const itemsPerPage = viewMode === 'compact' ? 10 : 5;

  // ── Derived Data ──────────────────────────────────────────────────────────
  const departments = useMemo(
    () => ['Todos', ...new Set(officials.map(o => o.department).filter(Boolean).sort())],
    [officials]
  );

  // Boss groups: map bossName -> subordinates
  const bossGroups = useMemo(() => {
    const groups = new Map<string, Official[]>();
    const term = normalizeText(selectionSearch);
    officials.forEach(o => {
      const matchesSearch = !term ||
        normalizeText(o.name).includes(term) ||
        normalizeText(o.email).includes(term) ||
        normalizeText(o.department || '').includes(term);
      const matchesDept = selectionDept === 'Todos' || o.department === selectionDept;
      if (!matchesSearch || !matchesDept) return;
      const boss = o.bossName?.trim() || '(Sin jefatura asignada)';
      if (!groups.has(boss)) groups.set(boss, []);
      groups.get(boss)!.push(o);
    });
    return groups;
  }, [officials, selectionSearch, selectionDept]);

  // Set initial campaign
  useEffect(() => {
    if (!activeCampaignId && campaigns.length > 0) {
      const recent = [...campaigns].sort((a, b) => b.createdAt - a.createdAt)[0];
      setActiveCampaignId(recent.id);
    }
  }, [campaigns, activeCampaignId]);

  // ── Selection Helpers ─────────────────────────────────────────────────────
  const filteredForSelection = useMemo(() => {
    const term = normalizeText(selectionSearch);
    return officials.filter(o =>
      (normalizeText(o.name).includes(term) || normalizeText(o.email).includes(term) ||
        normalizeText(o.department || '').includes(term)) &&
      (selectionDept === 'Todos' || o.department === selectionDept)
    );
  }, [officials, selectionSearch, selectionDept]);

  // Select / deselect all subordinates of a given boss
  const toggleBossGroup = (bossName: string) => {
    const subordinates = bossGroups.get(bossName) || [];
    const allSelected = subordinates.every(o => selectedIds.has(o.id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        subordinates.forEach(o => next.delete(o.id));
      } else {
        subordinates.forEach(o => next.add(o.id));
      }
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filteredForSelection.map(o => o.id)));
  const selectNone = () => setSelectedIds(new Set());

  // ── Email Generation ──────────────────────────────────────────────────────
  const buildEmailContent = (official: Official): string => {
    let body = template.body;
    let estimadoVar = 'Estimado/a';
    if (official.gender === Gender.Male) estimadoVar = 'Estimado';
    if (official.gender === Gender.Female) estimadoVar = 'Estimada';

    const nameParts = official.name.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 2 ? nameParts.slice(-2).join(' ') : (nameParts[1] || '');

    body = body.replace(/{nombre}/g, official.name);
    body = body.replace(/{nombres}/g, firstName);
    body = body.replace(/{apellidos}/g, lastName);
    body = body.replace(/{titulo}/g, official.title);
    body = body.replace(/{estimado}/g, estimadoVar);
    body = body.replace(/{departamento}/g, official.department || '');
    body = body.replace(/{cargo}/g, official.position);
    body = body.replace(/{correo}/g, official.email);
    body = body.replace(/{jefatura_nombre}/g, official.bossName || 'N/A');
    body = body.replace(/{jefatura_cargo}/g, official.bossPosition || 'N/A');
    return body;
  };

  const proceedToCompose = () => {
    if (selectedIds.size === 0) {
      onToast('Selecciona al menos un destinatario', 'error');
      return;
    }
    const selectedOfficials = officials.filter(o => selectedIds.has(o.id));
    const generated: EditableEmail[] = selectedOfficials.map(official => {
      const isSent = activeCampaign
        ? activeCampaign.logs.some(l => l.officialId === official.id)
        : false;
      return {
        id: official.id,
        official,
        recipientType: 'official',
        includeCc: false,
        includeSubdirectora: false,
        additionalCc: '',
        subject: template.subject,
        body: buildEmailContent(official),
        sent: isSent,
        aiRefining: false,
        personalAttachments: [],
      };
    });
    setEditableEmails(generated);
    setCurrentPage(1);
    setStep('compose');
  };

  // ── Compose Handlers ──────────────────────────────────────────────────────
  const handleEmailChange = (id: string, field: 'subject' | 'body', value: string) => {
    setEditableEmails(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const toggleRecipient = (id: string, type: 'official' | 'boss') => {
    setEditableEmails(prev => prev.map(e => e.id === id ? { ...e, recipientType: type } : e));
  };

  const toggleCc = (id: string) => {
    setEditableEmails(prev => prev.map(e => e.id === id ? { ...e, includeCc: !e.includeCc } : e));
  };

  const toggleSubdirectoraCc = (id: string) => {
    setEditableEmails(prev => prev.map(e => e.id === id ? { ...e, includeSubdirectora: !e.includeSubdirectora } : e));
  };

  const handleAdditionalCcChange = (id: string, value: string) => {
    setEditableEmails(prev => prev.map(e => e.id === id ? { ...e, additionalCc: value } : e));
  };

  // ── Per-Person Attachments ────────────────────────────────────────────────
  const handleAddPersonalAttachment = (emailId: string, newFiles: FileList | null) => {
    if (!newFiles) return;
    const arr = Array.from(newFiles);
    setEditableEmails(prev => prev.map(e =>
      e.id === emailId ? { ...e, personalAttachments: [...e.personalAttachments, ...arr] } : e
    ));
    // Also update previewEmail if open
    setPreviewEmail(prev => prev?.id === emailId
      ? { ...prev, personalAttachments: [...prev.personalAttachments, ...arr] }
      : prev
    );
  };

  const handleRemovePersonalAttachment = (emailId: string, fileIndex: number) => {
    setEditableEmails(prev => prev.map(e =>
      e.id === emailId
        ? { ...e, personalAttachments: e.personalAttachments.filter((_, i) => i !== fileIndex) }
        : e
    ));
    setPreviewEmail(prev => prev?.id === emailId
      ? { ...prev, personalAttachments: prev.personalAttachments.filter((_, i) => i !== fileIndex) }
      : prev
    );
  };

  // ── Remove from compose list (Step 2) ────────────────────────────────────
  const handleRemoveFromCompose = (emailId: string) => {
    setEditableEmails(prev => prev.filter(e => e.id !== emailId));
    // Also remove from selectedIds so the badge count stays accurate
    setSelectedIds(prev => { const next = new Set(prev); next.delete(emailId); return next; });
    if (previewEmail?.id === emailId) setPreviewEmail(null);
  };

  // ── Send / Download ───────────────────────────────────────────────────────
  const getEmailAddresses = (email: EditableEmail) => {
    const to = email.recipientType === 'official' ? email.official.email : email.official.bossEmail;
    const ccList: string[] = [];
    if (email.includeCc && email.recipientType === 'official' && email.official.bossEmail)
      ccList.push(email.official.bossEmail);
    if (email.includeSubdirectora && subdirectoraEmail) ccList.push(subdirectoraEmail);
    if (email.additionalCc) ccList.push(email.additionalCc);
    return { to, cc: ccList.join(',') };
  };

  const markSent = (emailId: string) => {
    setEditableEmails(prev => prev.map(e => e.id === emailId ? { ...e, sent: true } : e));
  };

  const handleSendDirect = async (email: EditableEmail) => {
    if (!activeCampaignId) { onToast('Selecciona una campaña primero.', 'error'); return; }

    // If token is missing, try to re-authorize before sending
    if (!hasGmailToken()) {
      try {
        onToast('Se requiere autorización de Gmail. Abriendo ventana...', 'success');
        await reauthorizeWithGoogle();
        setGmailTokenPresent(true);
      } catch (authErr: any) {
        if (authErr.code !== 'auth/popup-closed-by-user') {
          onToast('No se pudo autorizar Gmail. Por favor usa el botón "Autorizar Gmail".', 'error');
        }
        return;
      }
    }

    setSendingEmailId(email.id);
    try {
      const { to, cc } = getEmailAddresses(email);
      const allFiles = [...files, ...email.personalAttachments];

      // Generate a logId upfront so the tracking pixel and the Firestore log share the same ID
      const logId = crypto.randomUUID();
      const trackingPixel = isTrackingEnabled()
        ? buildTrackingPixel(logId, activeCampaignId, databaseId)
        : undefined;

      const raw = await buildRawMessage(to, email.subject, email.body, cc, allFiles, trackingPixel);
      await sendGmail(raw);
      onLogEmail(activeCampaignId, {
        officialId: email.id, recipientEmail: to, sentAt: Date.now(), method: 'gmail_api',
        databaseId,
      }, logId);
      markSent(email.id);
      setPreviewEmail(null);
      onToast(`Correo enviado a ${to}`, 'success');
    } catch (error: any) {
      // If 401, token expired — clear flag so banner re-appears
      if (error.message?.includes('expirado') || error.message?.includes('permisos')) {
        setGmailTokenPresent(false);
      }
      onToast(error.message || 'Error al enviar', 'error');
    } finally {
      setSendingEmailId(null);
    }
  };

  // ── Send All ──────────────────────────────────────────────────────────────
  type BulkSendResult = { emailId: string; to: string; status: 'ok' | 'error'; error?: string };

  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; results: BulkSendResult[] } | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const bulkCancelRef = useRef(false);

  // Emails pending (not sent yet, have a valid TO address)
  const pendingEmails = editableEmails.filter(e => {
    const to = e.recipientType === 'official' ? e.official.email : e.official.bossEmail;
    return !e.sent && !!to;
  });

  const handleSendAll = async () => {
    if (!activeCampaignId) { onToast('Selecciona una campaña primero.', 'error'); return; }
    if (pendingEmails.length === 0) { onToast('No hay correos pendientes para enviar.', 'error'); return; }

    // Re-authorize if needed
    if (!hasGmailToken()) {
      try {
        onToast('Se requiere autorización de Gmail. Abriendo ventana...', 'success');
        await reauthorizeWithGoogle();
        setGmailTokenPresent(true);
      } catch (authErr: any) {
        if (authErr.code !== 'auth/popup-closed-by-user') {
          onToast('No se pudo autorizar Gmail.', 'error');
        }
        return;
      }
    }

    setShowBulkConfirm(false);
    setBulkSending(true);
    bulkCancelRef.current = false;
    const results: BulkSendResult[] = [];
    setBulkProgress({ current: 0, total: pendingEmails.length, results });

    for (let i = 0; i < pendingEmails.length; i++) {
      if (bulkCancelRef.current) break;

      const email = pendingEmails[i];
      const { to, cc } = getEmailAddresses(email);
      try {
        const allFiles = [...files, ...email.personalAttachments];
        const logId = crypto.randomUUID();
        const trackingPixel = isTrackingEnabled()
          ? buildTrackingPixel(logId, activeCampaignId, databaseId)
          : undefined;
        const raw = await buildRawMessage(to, email.subject, email.body, cc, allFiles, trackingPixel);
        await sendGmail(raw);
        onLogEmail(activeCampaignId, { officialId: email.id, recipientEmail: to, sentAt: Date.now(), method: 'gmail_api', databaseId }, logId);
        markSent(email.id);
        results.push({ emailId: email.id, to, status: 'ok' });
      } catch (err: any) {
        if (err.message?.includes('expirado') || err.message?.includes('permisos')) {
          setGmailTokenPresent(false);
        }
        results.push({ emailId: email.id, to, status: 'error', error: err.message });
      }

      setBulkProgress({ current: i + 1, total: pendingEmails.length, results: [...results] });

      // Small delay to avoid hitting Gmail API rate limits (except after last)
      if (i < pendingEmails.length - 1 && !bulkCancelRef.current) {
        await new Promise(r => setTimeout(r, 400));
      }
    }

    setBulkSending(false);
    const okCount = results.filter(r => r.status === 'ok').length;
    const errCount = results.filter(r => r.status === 'error').length;
    if (errCount === 0) {
      onToast(`✅ ${okCount} correo(s) enviados exitosamente.`, 'success');
      clearDraft(); // Clear draft after successful bulk send
    } else {
      onToast(`Enviados: ${okCount} ✅  |  Errores: ${errCount} ❌`, 'error');
    }
  };

  const handleDownloadEml = async (email: EditableEmail) => {
    if (!activeCampaignId) { onToast('Selecciona una campaña primero.', 'error'); return; }
    try {
      const { to, cc } = getEmailAddresses(email);
      const allFiles = [...files, ...email.personalAttachments];
      const boundary = `----=_NextPart_${Date.now()}`;
      let emlContent = `To: ${to}\n`;
      if (cc) emlContent += `Cc: ${cc}\n`;
      emlContent += `Subject: ${email.subject}\nX-Unsent: 1\nMIME-Version: 1.0\nContent-Type: multipart/mixed; boundary="${boundary}"\n\n`;
      emlContent += `--${boundary}\nContent-Type: text/html; charset="utf-8"\nContent-Transfer-Encoding: 7bit\n\n<html><body style="font-family:sans-serif">${email.body}</body></html>\n\n`;
      for (const file of allFiles) {
        const b64 = await fileToBase64(file);
        emlContent += `--${boundary}\nContent-Type: ${file.type || 'application/octet-stream'}; name="${file.name}"\nContent-Disposition: attachment; filename="${file.name}"\nContent-Transfer-Encoding: base64\n\n`;
        emlContent += (b64.match(/.{1,76}/g) || []).join('\n') + '\n\n';
      }
      emlContent += `--${boundary}--`;
      const blob = new Blob([emlContent], { type: 'message/rfc822' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `${email.subject.replace(/[^a-z0-9]/gi, '_')}.eml`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      onLogEmail(activeCampaignId, {
        officialId: email.id, recipientEmail: to, sentAt: Date.now(), method: 'eml'
      });
      markSent(email.id);
      setPreviewEmail(null);
      onToast('Archivo .eml descargado', 'success');
    } catch { onToast('Error al generar .eml', 'error'); }
  };

  // ── Filter & Pagination ───────────────────────────────────────────────────
  const filteredEmails = editableEmails.filter(email => {
    const term = normalizeText(searchTerm);
    return normalizeText(email.official.name).includes(term) ||
      normalizeText(email.official.email).includes(term);
  });
  const totalPages = Math.ceil(filteredEmails.length / itemsPerPage);
  const currentItems = filteredEmails.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════

  if (officials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-dark-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
        <p className="text-slate-600 dark:text-slate-400">No hay funcionarios en la base de datos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Draft Recovery Banner ────────────────────────────────────────── */}
      {hasDraft && step === 'select' && selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
              <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-bold text-blue-900 dark:text-blue-300 text-sm">Borrador recuperado</p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                Se encontró un borrador guardado con <strong>{selectedIds.size}</strong> destinatarios seleccionados.
              </p>
            </div>
          </div>
          <button
            onClick={clearDraft}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
          >
            <X className="w-3 h-3" /> Descartar
          </button>
        </div>
      )}

      {/* ── Gmail Authorization Warning ──────────────────────────────────── */}
      {!gmailTokenPresent && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-amber-900 dark:text-amber-300 text-sm">Autorización de Gmail requerida</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Para enviar correos directamente necesitas autorizar el acceso a Gmail. Haz clic en el botón para autorizarlo ahora.
              </p>
            </div>
          </div>
          <button
            onClick={handleAuthorizeGmail}
            disabled={authorizingGmail}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg text-sm font-semibold transition-all shadow-sm whitespace-nowrap flex-shrink-0"
          >
            {authorizingGmail
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Autorizando...</>
              : <><ShieldAlert className="w-4 h-4" /> Autorizar Gmail</>
            }
          </button>
        </div>
      )}

      {/* ── Campaign Selector ─────────────────────────────────────────────── */}
      <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center">
            <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="font-bold text-indigo-900 dark:text-indigo-300">Campaña de Envío</h3>
            <p className="text-xs text-indigo-600 dark:text-indigo-400">
              {activeCampaign ? `Gestionando: ${activeCampaign.name}` : 'Selecciona o crea una campaña'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          {isCreatingCampaign ? (
            <div className="flex items-center gap-2 w-full animate-in fade-in slide-in-from-right-2">
              <input autoFocus type="text" value={newCampaignName} onChange={e => setNewCampaignName(e.target.value)}
                placeholder="Nombre campaña" className="px-3 py-2 text-sm border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-48" />
              <button onClick={() => { if (!newCampaignName.trim()) return; const c = onCampaignCreate(newCampaignName); setActiveCampaignId(c.id); setIsCreatingCampaign(false); setNewCampaignName(''); onToast(`Campaña "${c.name}" creada`, 'success'); }} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"><Check className="w-4 h-4" /></button>
              <button onClick={() => setIsCreatingCampaign(false)} className="p-2 bg-white text-slate-500 rounded-lg border border-slate-300 hover:bg-slate-50"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <>
              <select value={activeCampaignId} onChange={e => setActiveCampaignId(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-dark-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64">
                <option value="" disabled>Seleccionar Campaña</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name} ({new Date(c.createdAt).toLocaleDateString()})</option>)}
              </select>
              <button onClick={() => setIsCreatingCampaign(true)} className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 whitespace-nowrap">
                <Plus className="w-4 h-4" /> Nueva
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Step Indicator ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setStep('select')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${step === 'select' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-dark-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}
        >
          <Users className="w-4 h-4" />
          1. Seleccionar Destinatarios
          {selectedIds.size > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${step === 'select' ? 'bg-white/20 text-white' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'}`}>
              {selectedIds.size}
            </span>
          )}
        </button>
        <ArrowRight className="w-4 h-4 text-slate-400" />
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${step === 'compose' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-dark-800 text-slate-500 dark:text-slate-500 border border-slate-200 dark:border-slate-700'}`}
        >
          <Mail className="w-4 h-4" />
          2. Componer y Enviar
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 1 — SELECT RECIPIENTS
         ══════════════════════════════════════════════════════════════════════ */}
      {step === 'select' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Selection Controls */}
          <div className="bg-white dark:bg-dark-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-semibold text-slate-800 dark:text-white">
                  {selectedIds.size === 0 ? 'Ninguno seleccionado' : `${selectedIds.size} de ${officials.length} seleccionados`}
                </span>
                <button onClick={selectAll} className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">Sel. todos</button>
                {selectedIds.size > 0 && <button onClick={selectNone} className="text-xs font-medium text-red-500 hover:underline">Limpiar</button>}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input value={selectionSearch} onChange={e => setSelectionSearch(e.target.value)}
                    placeholder="Buscar funcionario..."
                    className="pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-56" />
                </div>
                <select value={selectionDept} onChange={e => setSelectionDept(e.target.value)}
                  className="py-2 px-3 text-sm bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {departments.map(d => <option key={d} value={d}>{d === 'Todos' ? 'Todos los Depts.' : d}</option>)}
                </select>
              </div>
            </div>
            {/* View mode tabs */}
            <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-700 pt-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">Agrupar por:</span>
              <button
                onClick={() => setSelectionView('grid')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${selectionView === 'grid'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-dark-600'
                  }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Ninguno (grilla)
              </button>
              <button
                onClick={() => setSelectionView('boss')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${selectionView === 'boss'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-dark-600'
                  }`}
              >
                <Crown className="w-3.5 h-3.5" /> Por Jefatura
              </button>
            </div>
          </div>

          {/* ── Grid View ─────────────────────────────────────────────── */}
          {selectionView === 'grid' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredForSelection.map(official => {
                  const isSelected = selectedIds.has(official.id);
                  return (
                    <button
                      key={official.id}
                      onClick={() => toggleSelect(official.id)}
                      className={`text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-start gap-3 group ${isSelected
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 shadow-sm shadow-indigo-200 dark:shadow-none'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10'
                        }`}
                    >
                      <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600 group-hover:border-indigo-400'
                        }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {official.isBoss && <Crown className="w-3 h-3 text-amber-500 fill-amber-400 flex-shrink-0" />}
                          <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">{official.name}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{official.position}</p>
                        {official.department && (
                          <div className="flex items-center gap-1 mt-1">
                            <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="text-xs text-slate-400 dark:text-slate-500 truncate">{official.department}</span>
                          </div>
                        )}
                        {!official.email && <span className="text-[10px] text-red-500 font-medium">Sin correo</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
              {filteredForSelection.length === 0 && (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No hay funcionarios que coincidan con la búsqueda.</p>
                </div>
              )}
            </>
          )}

          {/* ── Boss Hierarchy View ────────────────────────────────────── */}
          {selectionView === 'boss' && (
            <div className="space-y-4">
              {bossGroups.size === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No hay funcionarios que coincidan con la búsqueda.</p>
                </div>
              ) : (
                Array.from(bossGroups.entries()).map(([bossName, subordinates]) => {
                  const allSelected = subordinates.every(o => selectedIds.has(o.id));
                  const someSelected = !allSelected && subordinates.some(o => selectedIds.has(o.id));
                  const countSelected = subordinates.filter(o => selectedIds.has(o.id)).length;
                  return (
                    <div key={bossName} className="bg-white dark:bg-dark-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                      {/* Boss Header — click to select/deselect all */}
                      <button
                        onClick={() => toggleBossGroup(bossName)}
                        className={`w-full flex items-center justify-between px-5 py-3 transition-colors group ${allSelected
                          ? 'bg-amber-50 dark:bg-amber-950/30'
                          : someSelected
                            ? 'bg-amber-50/50 dark:bg-amber-950/10'
                            : 'bg-slate-50 dark:bg-dark-900/40 hover:bg-amber-50/30 dark:hover:bg-amber-950/10'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${allSelected
                            ? 'bg-amber-500 border-amber-500'
                            : someSelected
                              ? 'bg-amber-200 border-amber-400 dark:bg-amber-900/40 dark:border-amber-600'
                              : 'border-slate-300 dark:border-slate-600'
                            }`}>
                            {allSelected && <Check className="w-3.5 h-3.5 text-white" />}
                            {someSelected && <span className="w-2 h-2 bg-amber-500 rounded-sm block" />}
                          </div>
                          <Crown className="w-4 h-4 text-amber-500 fill-amber-400 flex-shrink-0" />
                          <div className="text-left">
                            <p className="font-bold text-sm text-slate-900 dark:text-white">{bossName}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {subordinates.length} subordinado{subordinates.length !== 1 ? 's' : ''}
                              {countSelected > 0 && ` · ${countSelected} seleccionado${countSelected !== 1 ? 's' : ''}`}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${allSelected
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                          }`}>
                          {allSelected ? '✓ Todos seleccionados' : 'Seleccionar todos'}
                        </span>
                      </button>
                      {/* Subordinates grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-3">
                        {subordinates.map(official => {
                          const isSelected = selectedIds.has(official.id);
                          return (
                            <button
                              key={official.id}
                              onClick={() => toggleSelect(official.id)}
                              className={`text-left px-3 py-2.5 rounded-lg border transition-all flex items-center gap-2.5 group ${isSelected
                                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30'
                                : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10'
                                }`}
                            >
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600 group-hover:border-indigo-400'
                                }`}>
                                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{official.name}</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{official.position}</p>
                              </div>
                              {!official.email && <span title="Sin correo"><AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" /></span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}


          {/* Confirm Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={proceedToCompose}
              disabled={selectedIds.size === 0 || !activeCampaignId}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow-md"
            >
              Continuar con {selectedIds.size > 0 ? selectedIds.size : '...'} destinatario(s)
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          {!activeCampaignId && (
            <p className="text-center text-xs text-amber-600 dark:text-amber-400">
              Debes seleccionar o crear una campaña antes de continuar.
            </p>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 2 — COMPOSE & SEND
         ══════════════════════════════════════════════════════════════════════ */}
      {step === 'compose' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">

          {/* Controls Bar */}
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
                  <button onClick={() => setViewMode('cards')} className={`p-1.5 rounded-md ${viewMode === 'cards' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}><LayoutGrid className="w-4 h-4" /></button>
                  <button onClick={() => setViewMode('compact')} className={`p-1.5 rounded-md ${viewMode === 'compact' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}><LayoutList className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {/* ── SEND ALL BUTTON ── */}
                <button
                  onClick={() => setShowBulkConfirm(true)}
                  disabled={pendingEmails.length === 0 || bulkSending}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-bold transition-all shadow-sm hover:shadow-md"
                  title={pendingEmails.length === 0 ? 'Todos los correos ya fueron enviados' : `Enviar los ${pendingEmails.length} correos pendientes`}
                >
                  <Send className="w-4 h-4" />
                  Enviar Todo ({pendingEmails.length})
                </button>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Buscar en lista..." />
                </div>
              </div>
            </div>

            {/* Subdirectora CC Config */}
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-indigo-50 dark:bg-indigo-950/30 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
              <label className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5 whitespace-nowrap">
                <UserCog className="w-3.5 h-3.5" /> Correo Subdirectora (CC opcional):
              </label>
              <input type="email" value={subdirectoraEmail} onChange={e => setSubdirectoraEmail(e.target.value)}
                className="flex-1 w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-dark-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>

          {/* ── Cards View ──────────────────────────────────────────────── */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 gap-6">
              {currentItems.map((item) => (
                <div key={item.id}
                  className={`bg-white dark:bg-dark-800 rounded-xl shadow-sm border-2 transition-colors ${item.sent ? 'border-green-300 dark:border-green-800' : 'border-slate-200 dark:border-slate-700'}`}>

                  {/* Card Header */}
                  <div className={`px-5 py-3 border-b dark:border-slate-700 flex flex-col lg:flex-row justify-between gap-3 ${item.sent ? 'bg-green-50/50 dark:bg-green-950/20' : 'bg-slate-50 dark:bg-dark-900/40'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${item.official.gender === Gender.Female ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-600' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600'}`}>
                        <UserCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          {item.official.isBoss && <Crown className="w-3 h-3 text-amber-500 fill-amber-400" />}
                          <h3 className="font-bold text-slate-800 dark:text-white text-sm">{item.official.name}</h3>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.official.position}</p>
                      </div>
                      {/* Recipient Toggle */}
                      <div className="flex gap-1.5 ml-2">
                        <button onClick={() => toggleRecipient(item.id, 'official')}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${item.recipientType === 'official' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'text-slate-400 hover:text-slate-600'}`}>
                          Oficial
                        </button>
                        <button onClick={() => toggleRecipient(item.id, 'boss')}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${item.recipientType === 'boss' ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300' : 'text-slate-400 hover:text-slate-600'}`}>
                          Jefatura
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 items-center">
                      <button onClick={() => toggleCc(item.id)}
                        className={`px-2.5 py-1 text-xs rounded border transition-colors ${item.includeCc ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-dark-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-300'}`}>
                        CC Jefe
                      </button>
                      <button onClick={() => toggleSubdirectoraCc(item.id)}
                        className={`px-2.5 py-1 text-xs rounded border transition-colors ${item.includeSubdirectora ? 'bg-pink-50 dark:bg-pink-900/40 border-pink-200 dark:border-pink-700 text-pink-700 dark:text-pink-300' : 'bg-white dark:bg-dark-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-pink-300'}`}>
                        CC Sub
                      </button>
                      <div className="h-4 w-px bg-slate-200 dark:bg-slate-600 mx-0.5" />
                      {/* Preview Button */}
                      <button
                        onClick={() => setPreviewEmail({ ...item })}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-dark-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Vista Previa
                      </button>
                      <button onClick={() => handleDownloadEml(item)} className="p-1.5 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-dark-700 text-slate-600 dark:text-slate-300 transition-colors" title="Descargar EML">
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleSendDirect(item)}
                        disabled={sendingEmailId === item.id}
                        className={`px-3 py-1.5 text-xs font-semibold rounded flex items-center gap-1.5 transition-all ${item.sent ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-400 shadow-sm'}`}
                      >
                        {sendingEmailId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : item.sent ? <Check className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                        {sendingEmailId === item.id ? 'Enviando...' : item.sent ? 'Enviado' : 'Enviar'}
                      </button>
                      <div className="h-4 w-px bg-slate-200 dark:bg-slate-600 mx-0.5" />
                      {/* Remove from list */}
                      <button
                        onClick={() => handleRemoveFromCompose(item.id)}
                        title="Quitar de la lista"
                        className="p-1.5 border border-red-200 dark:border-red-900 rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Card Body: Subject + Email Editor */}
                  <div className="p-4">
                    <div className="mb-2">
                      <input type="text" value={item.subject}
                        onChange={e => handleEmailChange(item.id, 'subject', e.target.value)}
                        className="w-full text-sm font-bold border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 outline-none bg-transparent text-slate-800 dark:text-white py-1" />
                    </div>
                    <EmailEditor content={item.body} onChange={val => handleEmailChange(item.id, 'body', val)} />
                  </div>

                  {/* ── Personal Attachments ─────────────────────────── */}
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
                            ref={el => { if (el) attachmentRefs.current.set(item.id, el); }}
                            onChange={e => handleAddPersonalAttachment(item.id, e.target.files)}
                          />
                        </label>
                      </div>
                      {item.personalAttachments.length === 0 && files.length === 0 ? (
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic">Sin adjuntos — solo para esta persona</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {/* Global files (read-only badge) */}
                          {files.map((f, i) => (
                            <span key={`g-${i}`} className="flex items-center gap-1 px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs">
                              <Paperclip className="w-3 h-3" />{f.name}
                              <span className="opacity-50 text-[10px]">(global)</span>
                            </span>
                          ))}
                          {/* Personal files */}
                          {item.personalAttachments.map((f, i) => (
                            <span key={`p-${i}`} className="flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded text-xs">
                              <Paperclip className="w-3 h-3" />
                              {f.name}
                              <span className="opacity-60 text-[10px]">({formatFileSize(f.size)})</span>
                              <button onClick={() => handleRemovePersonalAttachment(item.id, i)} className="ml-0.5 text-indigo-400 hover:text-red-500 transition-colors">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Compact View ────────────────────────────────────────────── */}
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
                    const { to } = getEmailAddresses(item);
                    const totalAttachments = files.length + item.personalAttachments.length;
                    return (
                      <tr key={item.id} className={item.sent ? 'bg-green-50/30 dark:bg-green-950/20' : ''}>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">{item.official.name}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-[180px] truncate">{to || '—'}</td>
                        <td className="px-4 py-3">
                          <label className="cursor-pointer flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                            <Paperclip className="w-3 h-3" />
                            {totalAttachments > 0 ? `${totalAttachments} arch.` : '+ Adjuntar'}
                            <input type="file" multiple className="hidden"
                              onChange={e => handleAddPersonalAttachment(item.id, e.target.files)} />
                          </label>
                        </td>
                        <td className="px-4 py-3">
                          {item.sent
                            ? <span className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 px-2 py-0.5 rounded text-[10px] font-bold">Enviado</span>
                            : <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded text-[10px]">Pendiente</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => setPreviewEmail({ ...item })} className="p-1.5 text-slate-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 rounded transition-colors" title="Vista Previa">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDownloadEml(item)} className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-700 rounded transition-colors" title="Descargar EML">
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSendDirect(item)}
                              disabled={sendingEmailId === item.id}
                              className={`p-1.5 rounded transition-colors ${item.sent ? 'text-green-600 dark:text-green-400' : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'}`}
                              title="Enviar Directo"
                            >
                              {sendingEmailId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : item.sent ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleRemoveFromCompose(item.id)}
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
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="p-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 bg-white dark:bg-dark-800 rounded hover:bg-slate-50 disabled:opacity-50">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm self-center text-slate-700 dark:text-slate-300">Página {currentPage} de {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="p-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 bg-white dark:bg-dark-800 rounded hover:bg-slate-50 disabled:opacity-50">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Bulk Send Confirm Modal ─────────────────────────────────────────── */}
      {showBulkConfirm && (
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
                  <span className="font-bold text-slate-900 dark:text-white">{pendingEmails.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Ya enviados:</span>
                  <span className="font-bold text-green-600 dark:text-green-400">{editableEmails.filter(e => e.sent).length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Sin dirección válida:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {editableEmails.filter(e => !(e.recipientType === 'official' ? e.official.email : e.official.bossEmail)).length}
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Se enviarán <strong className="text-slate-800 dark:text-white">{pendingEmails.length} correos</strong> usando la API de Gmail con un pequeño intervalo entre envíos para evitar límites de velocidad.
              </p>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">Revisa los correos antes de enviar. Una vez iniciado el proceso, podrás cancelarlo pero los correos ya enviados no se pueden revertir.</p>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setShowBulkConfirm(false)}
                className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-dark-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendAll}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md"
              >
                <Send className="w-4 h-4" />
                Enviar {pendingEmails.length} correos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Send Progress Overlay ──────────────────────────────────────── */}
      {bulkSending && bulkProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white">Enviando correos...</h3>
                  <p className="text-indigo-100 text-sm">{bulkProgress.current} de {bulkProgress.total} procesados</p>
                </div>
              </div>
              {/* Progress Bar */}
              <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-300"
                  style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                />
              </div>
            </div>
            {/* Results log */}
            <div className="max-h-56 overflow-y-auto p-4 space-y-1 custom-scrollbar">
              {bulkProgress.results.length === 0 && (
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">Iniciando envíos...</p>
              )}
              {[...bulkProgress.results].reverse().map((r, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${r.status === 'ok'
                    ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300'
                    : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
                  }`}>
                  {r.status === 'ok'
                    ? <Check className="w-3.5 h-3.5 flex-shrink-0" />
                    : <X className="w-3.5 h-3.5 flex-shrink-0" />
                  }
                  <span className="truncate flex-1">{r.to}</span>
                  {r.status === 'error' && <span className="truncate text-[10px] opacity-75">{r.error}</span>}
                </div>
              ))}
            </div>
            {/* Footer */}
            <div className="border-t border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center">
              <div className="flex gap-4 text-sm">
                <span className="text-green-600 dark:text-green-400 font-semibold">
                  ✅ {bulkProgress.results.filter(r => r.status === 'ok').length} enviados
                </span>
                {bulkProgress.results.filter(r => r.status === 'error').length > 0 && (
                  <span className="text-red-600 dark:text-red-400 font-semibold">
                    ❌ {bulkProgress.results.filter(r => r.status === 'error').length} errores
                  </span>
                )}
              </div>
              <button
                onClick={() => { bulkCancelRef.current = true; }}
                className="px-4 py-2 text-sm bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview Modal ──────────────────────────────────────────────────── */}
      {previewEmail && (
        <PreviewModal
          email={previewEmail}
          globalFiles={files}
          subdirectoraEmail={subdirectoraEmail}
          onClose={() => setPreviewEmail(null)}
          onSend={handleSendDirect}
          onDownload={handleDownloadEml}
          sending={sendingEmailId === previewEmail.id}
        />
      )}
    </div>
  );
};
