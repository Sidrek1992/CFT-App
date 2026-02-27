import { useEffect, useState, useMemo, useRef } from 'react';
import { Official, EmailTemplate, Gender, Campaign, EmailLog } from '../types';
import { refineEmailWithAI } from '../services/geminiService';
import { sendGmail, buildRawMessage, fileToBase64 } from '../services/gmailService';
import { hasGmailToken, reauthorizeWithGoogle } from '../services/authService';
import { buildTrackingPixel, isTrackingEnabled } from '../services/trackingService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EditableEmail {
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
  personalAttachments: File[];
}

export type GeneratorStep = 'select' | 'compose';

export type BulkSendResult = { emailId: string; to: string; status: 'ok' | 'error'; error?: string };

export interface BulkProgress {
  current: number;
  total: number;
  results: BulkSendResult[];
}

// ─── Draft Persistence ────────────────────────────────────────────────────────

const DRAFT_KEY = 'generator_draft_v1';

interface GeneratorDraft {
  step: GeneratorStep;
  selectedIds: string[];
  activeCampaignId: string;
  subdirectoraEmail: string;
  emailBodies: Record<string, {
    subject: string;
    body: string;
    includeCc: boolean;
    includeSubdirectora: boolean;
    additionalCc: string;
  }>;
  savedAt: number;
}

function loadDraft(): GeneratorDraft | null {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') as GeneratorDraft | null;
  } catch {
    return null;
  }
}

// ─── Utility helpers ──────────────────────────────────────────────────────────

export const normalizeText = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseEmailGeneratorOptions {
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

export function useEmailGenerator({
  officials,
  template,
  files,
  campaigns,
  databaseId,
  onCampaignCreate,
  onLogEmail,
  onToast,
}: UseEmailGeneratorOptions) {
  const draft = loadDraft();

  // ── Step ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<GeneratorStep>(draft?.step ?? 'select');
  const [hasDraft, setHasDraft] = useState(() => !!localStorage.getItem(DRAFT_KEY));

  // ── Gmail Auth ────────────────────────────────────────────────────────────
  const [gmailTokenPresent, setGmailTokenPresent] = useState<boolean>(() => hasGmailToken());
  const [authorizingGmail, setAuthorizingGmail] = useState(false);

  // Re-check token presence after mount (bootstrapGmailToken may finish async)
  useEffect(() => {
    // Check immediately in case bootstrap already finished
    if (hasGmailToken()) {
      setGmailTokenPresent(true);
      return;
    }
    // Poll briefly (max 5 s) for the token to appear after silent reauth
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (hasGmailToken()) {
        setGmailTokenPresent(true);
        clearInterval(interval);
      } else if (attempts >= 10) {
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleAuthorizeGmail = async () => {
    setAuthorizingGmail(true);
    try {
      await reauthorizeWithGoogle();
      setGmailTokenPresent(true);
      onToast('Gmail autorizado correctamente. Ya puedes enviar correos.', 'success');
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        onToast(`Error al autorizar Gmail: ${err.message}`, 'error');
      }
    } finally {
      setAuthorizingGmail(false);
    }
  };

  // ── Campaign ──────────────────────────────────────────────────────────────
  const [activeCampaignId, setActiveCampaignId] = useState<string>(
    draft?.activeCampaignId ?? ''
  );
  const [newCampaignName, setNewCampaignName] = useState('');
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const activeCampaign = campaigns.find(c => c.id === activeCampaignId);

  const handleCreateCampaign = () => {
    if (!newCampaignName.trim()) return;
    const c = onCampaignCreate(newCampaignName);
    setActiveCampaignId(c.id);
    setIsCreatingCampaign(false);
    setNewCampaignName('');
    onToast(`Campaña "${c.name}" creada`, 'success');
  };

  // Set most-recent campaign if none selected
  useEffect(() => {
    if (!activeCampaignId && campaigns.length > 0) {
      const recent = [...campaigns].sort((a, b) => b.createdAt - a.createdAt)[0];
      setActiveCampaignId(recent.id);
    }
  }, [campaigns, activeCampaignId]);

  // ── Step 1: Recipient selection ───────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(draft?.selectedIds ?? [])
  );
  const [selectionSearch, setSelectionSearch] = useState('');
  const [selectionDept, setSelectionDept] = useState('Todos');
  const [selectionView, setSelectionView] = useState<'grid' | 'boss'>('grid');

  const departments = useMemo(
    () => ['Todos', ...new Set(officials.map(o => o.department).filter(Boolean).sort())],
    [officials]
  );

  const filteredForSelection = useMemo(() => {
    const term = normalizeText(selectionSearch);
    return officials.filter(o =>
      (normalizeText(o.name).includes(term) ||
        normalizeText(o.email).includes(term) ||
        normalizeText(o.department || '').includes(term)) &&
      (selectionDept === 'Todos' || o.department === selectionDept)
    );
  }, [officials, selectionSearch, selectionDept]);

  const bossGroups = useMemo(() => {
    const groups = new Map<string, Official[]>();
    const term = normalizeText(selectionSearch);
    officials.forEach(o => {
      const matchesSearch =
        !term ||
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

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

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

  const selectAll = () => setSelectedIds(new Set(filteredForSelection.map(o => o.id)));
  const selectNone = () => setSelectedIds(new Set());

  // ── Step 2: Compose ───────────────────────────────────────────────────────
  const [editableEmails, setEditableEmails] = useState<EditableEmail[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>('cards');
  const [subdirectoraEmail, setSubdirectoraEmail] = useState(
    draft?.subdirectoraEmail ?? 'gestion.personas@cftestatalaricayparinacota.cl'
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [previewEmail, setPreviewEmail] = useState<EditableEmail | null>(null);

  const attachmentRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // ── Bulk Send ─────────────────────────────────────────────────────────────
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<BulkProgress | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const bulkCancelRef = useRef(false);

  const itemsPerPage = viewMode === 'compact' ? 10 : 5;

  // ── Draft autosave (2 s debounce) ─────────────────────────────────────────
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
      const draftData: GeneratorDraft = {
        step,
        selectedIds: Array.from(selectedIds),
        activeCampaignId,
        subdirectoraEmail,
        emailBodies,
        savedAt: Date.now(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
    }, 2000);
    return () => clearTimeout(timer);
  }, [step, selectedIds, activeCampaignId, subdirectoraEmail, editableEmails]);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
  };

  // ── Email content builder ─────────────────────────────────────────────────
  const buildEmailContent = (official: Official): string => {
    let body = template.body;
    let estimadoVar = 'Estimado/a';
    if (official.gender === Gender.Male) estimadoVar = 'Estimado';
    if (official.gender === Gender.Female) estimadoVar = 'Estimada';

    const nameParts = official.name.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName =
      nameParts.length > 2 ? nameParts.slice(-2).join(' ') : nameParts[1] || '';

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

  // ── Proceed to Compose ────────────────────────────────────────────────────
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
      // Restore draft body if available
      const savedBody = loadDraft()?.emailBodies?.[official.id];
      return {
        id: official.id,
        official,
        recipientType: 'official',
        includeCc: savedBody?.includeCc ?? false,
        includeSubdirectora: savedBody?.includeSubdirectora ?? false,
        additionalCc: savedBody?.additionalCc ?? '',
        subject: savedBody?.subject ?? template.subject,
        body: savedBody?.body ?? buildEmailContent(official),
        sent: isSent,
        aiRefining: false,
        personalAttachments: [],
      };
    });
    setEditableEmails(generated);
    setCurrentPage(1);
    setStep('compose');
  };

  // ── Compose handlers ──────────────────────────────────────────────────────
  const handleEmailChange = (id: string, field: 'subject' | 'body', value: string) =>
    setEditableEmails(prev => prev.map(e => (e.id === id ? { ...e, [field]: value } : e)));

  const toggleRecipient = (id: string, type: 'official' | 'boss') =>
    setEditableEmails(prev => prev.map(e => (e.id === id ? { ...e, recipientType: type } : e)));

  const toggleCc = (id: string) =>
    setEditableEmails(prev => prev.map(e => (e.id === id ? { ...e, includeCc: !e.includeCc } : e)));

  const toggleSubdirectoraCc = (id: string) =>
    setEditableEmails(prev =>
      prev.map(e => (e.id === id ? { ...e, includeSubdirectora: !e.includeSubdirectora } : e))
    );

  const handleAdditionalCcChange = (id: string, value: string) =>
    setEditableEmails(prev => prev.map(e => (e.id === id ? { ...e, additionalCc: value } : e)));

  // ── Personal attachments ──────────────────────────────────────────────────
  const handleAddPersonalAttachment = (emailId: string, newFiles: FileList | null) => {
    if (!newFiles) return;
    const arr = Array.from(newFiles);
    setEditableEmails(prev =>
      prev.map(e =>
        e.id === emailId
          ? { ...e, personalAttachments: [...e.personalAttachments, ...arr] }
          : e
      )
    );
    setPreviewEmail(prev =>
      prev?.id === emailId
        ? { ...prev, personalAttachments: [...prev.personalAttachments, ...arr] }
        : prev
    );
  };

  const handleRemovePersonalAttachment = (emailId: string, fileIndex: number) => {
    setEditableEmails(prev =>
      prev.map(e =>
        e.id === emailId
          ? { ...e, personalAttachments: e.personalAttachments.filter((_, i) => i !== fileIndex) }
          : e
      )
    );
    setPreviewEmail(prev =>
      prev?.id === emailId
        ? { ...prev, personalAttachments: prev.personalAttachments.filter((_, i) => i !== fileIndex) }
        : prev
    );
  };

  // ── Remove from compose list ──────────────────────────────────────────────
  const handleRemoveFromCompose = (emailId: string) => {
    setEditableEmails(prev => prev.filter(e => e.id !== emailId));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(emailId);
      return next;
    });
    if (previewEmail?.id === emailId) setPreviewEmail(null);
  };

  // ── Address helpers ───────────────────────────────────────────────────────
  const getEmailAddresses = (email: EditableEmail) => {
    const to =
      email.recipientType === 'official' ? email.official.email : email.official.bossEmail;
    const ccList: string[] = [];
    if (email.includeCc && email.recipientType === 'official' && email.official.bossEmail)
      ccList.push(email.official.bossEmail);
    if (email.includeSubdirectora && subdirectoraEmail) ccList.push(subdirectoraEmail);
    if (email.additionalCc) ccList.push(email.additionalCc);
    return { to, cc: ccList.join(',') };
  };

  const markSent = (emailId: string) =>
    setEditableEmails(prev => prev.map(e => (e.id === emailId ? { ...e, sent: true } : e)));

  // ── Re-authorize helper ───────────────────────────────────────────────────
  const ensureGmailAuth = async (): Promise<boolean> => {
    if (hasGmailToken()) return true;
    try {
      onToast('Se requiere autorización de Gmail. Abriendo ventana...', 'success');
      await reauthorizeWithGoogle();
      setGmailTokenPresent(true);
      return true;
    } catch (authErr: any) {
      if (authErr.code !== 'auth/popup-closed-by-user') {
        onToast('No se pudo autorizar Gmail. Por favor usa el botón "Autorizar Gmail".', 'error');
      }
      return false;
    }
  };

  // ── Send single email ─────────────────────────────────────────────────────
  const handleSendDirect = async (email: EditableEmail) => {
    if (!activeCampaignId) { onToast('Selecciona una campaña primero.', 'error'); return; }
    if (!(await ensureGmailAuth())) return;

    setSendingEmailId(email.id);
    try {
      const { to, cc } = getEmailAddresses(email);
      const allFiles = [...files, ...email.personalAttachments];
      const logId = crypto.randomUUID();
      const trackingPixel = isTrackingEnabled()
        ? buildTrackingPixel(logId, activeCampaignId, databaseId)
        : undefined;

      const raw = await buildRawMessage(to, email.subject, email.body, cc, allFiles, trackingPixel);
      await sendGmail(raw);
      onLogEmail(
        activeCampaignId,
        { officialId: email.id, recipientEmail: to, sentAt: Date.now(), method: 'gmail_api', databaseId },
        logId
      );
      markSent(email.id);
      setPreviewEmail(null);
      onToast(`Correo enviado a ${to}`, 'success');
    } catch (error: any) {
      if (error.message?.includes('expirado') || error.message?.includes('permisos')) {
        setGmailTokenPresent(false);
      }
      onToast(error.message || 'Error al enviar', 'error');
    } finally {
      setSendingEmailId(null);
    }
  };

  // ── Send all ──────────────────────────────────────────────────────────────
  const pendingEmails = editableEmails.filter(e => {
    const to = e.recipientType === 'official' ? e.official.email : e.official.bossEmail;
    return !e.sent && !!to;
  });

  const handleSendAll = async () => {
    if (!activeCampaignId) { onToast('Selecciona una campaña primero.', 'error'); return; }
    if (pendingEmails.length === 0) { onToast('No hay correos pendientes para enviar.', 'error'); return; }
    if (!(await ensureGmailAuth())) return;

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
        onLogEmail(
          activeCampaignId,
          { officialId: email.id, recipientEmail: to, sentAt: Date.now(), method: 'gmail_api', databaseId },
          logId
        );
        markSent(email.id);
        results.push({ emailId: email.id, to, status: 'ok' });
      } catch (err: any) {
        if (err.message?.includes('expirado') || err.message?.includes('permisos')) {
          setGmailTokenPresent(false);
        }
        results.push({ emailId: email.id, to, status: 'error', error: err.message });
      }

      setBulkProgress({ current: i + 1, total: pendingEmails.length, results: [...results] });

      if (i < pendingEmails.length - 1 && !bulkCancelRef.current) {
        await new Promise(r => setTimeout(r, 400));
      }
    }

    setBulkSending(false);
    const okCount = results.filter(r => r.status === 'ok').length;
    const errCount = results.filter(r => r.status === 'error').length;
    if (errCount === 0) {
      onToast(`${okCount} correo(s) enviados exitosamente.`, 'success');
      clearDraft();
    } else {
      onToast(`Enviados: ${okCount}  |  Errores: ${errCount}`, 'error');
    }
  };

  const cancelBulkSend = () => { bulkCancelRef.current = true; };

  // ── Download EML ──────────────────────────────────────────────────────────
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
      link.href = url;
      link.download = `${email.subject.replace(/[^a-z0-9]/gi, '_')}.eml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onLogEmail(activeCampaignId, {
        officialId: email.id,
        recipientEmail: to,
        sentAt: Date.now(),
        method: 'eml',
      });
      markSent(email.id);
      setPreviewEmail(null);
      onToast('Archivo .eml descargado', 'success');
    } catch {
      onToast('Error al generar .eml', 'error');
    }
  };

  // ── Filter & Pagination ───────────────────────────────────────────────────
  const filteredEmails = editableEmails.filter(email => {
    const term = normalizeText(searchTerm);
    return (
      normalizeText(email.official.name).includes(term) ||
      normalizeText(email.official.email).includes(term)
    );
  });
  const totalPages = Math.ceil(filteredEmails.length / itemsPerPage);
  const currentItems = filteredEmails.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ── Exposed API ───────────────────────────────────────────────────────────
  return {
    // Step
    step, setStep,
    hasDraft, clearDraft,

    // Gmail auth
    gmailTokenPresent,
    authorizingGmail,
    handleAuthorizeGmail,

    // Campaign
    activeCampaignId, setActiveCampaignId,
    activeCampaign,
    newCampaignName, setNewCampaignName,
    isCreatingCampaign, setIsCreatingCampaign,
    handleCreateCampaign,

    // Step 1 — selection
    selectedIds,
    selectionSearch, setSelectionSearch,
    selectionDept, setSelectionDept,
    selectionView, setSelectionView,
    departments,
    filteredForSelection,
    bossGroups,
    toggleSelect,
    toggleBossGroup,
    selectAll,
    selectNone,
    proceedToCompose,

    // Step 2 — compose
    editableEmails,
    searchTerm, setSearchTerm,
    sendingEmailId,
    viewMode, setViewMode,
    subdirectoraEmail, setSubdirectoraEmail,
    currentPage, setCurrentPage,
    previewEmail, setPreviewEmail,
    attachmentRefs,
    itemsPerPage,
    filteredEmails,
    totalPages,
    currentItems,
    pendingEmails,

    // Email handlers
    handleEmailChange,
    toggleRecipient,
    toggleCc,
    toggleSubdirectoraCc,
    handleAdditionalCcChange,
    handleAddPersonalAttachment,
    handleRemovePersonalAttachment,
    handleRemoveFromCompose,
    getEmailAddresses,
    handleSendDirect,
    handleDownloadEml,

    // Bulk send
    bulkSending,
    bulkProgress,
    showBulkConfirm, setShowBulkConfirm,
    handleSendAll,
    cancelBulkSend,
  };
}
