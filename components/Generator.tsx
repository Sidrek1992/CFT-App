
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Official, EmailTemplate, Gender, Campaign, EmailLog } from '../types';
import { refineEmailWithAI } from '../services/geminiService';
import { EmailEditor } from './EmailEditor';
import { Copy, ExternalLink, AlertCircle, CheckSquare, Square, User, UserCheck, Search, ChevronLeft, ChevronRight, Check, Filter, Download, Sparkles, Building2, UserPlus, X, LayoutList, LayoutGrid, ChevronDown, ChevronUp, CopyPlus, UserCog, ArrowUpDown, History, Plus } from 'lucide-react';

interface GeneratorProps {
  officials: Official[];
  template: EmailTemplate;
  files: File[];

  // Updated props for Campaign System
  campaigns: Campaign[];
  onCampaignCreate: (name: string) => Campaign;
  onLogEmail: (campaignId: string, log: Omit<EmailLog, 'id' | 'campaignId' | 'status'>) => void;

  onToast: (msg: string, type: 'success' | 'error') => void;
}

interface EditableEmail {
  id: string; // Links to official.id
  official: Official;
  recipientType: 'official' | 'boss';
  includeCc: boolean; // Boss CC
  includeSubdirectora: boolean; // New Subdirectora CC
  additionalCc: string; // Email address of the extra person
  subject: string;
  body: string; // HTML
  sent: boolean; // Track sending status (local + logs)
  aiRefining: boolean;
}

// Helper to strip HTML tags for mailto: links (which only support plain text)
const stripHtml = (html: string) => {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

// Helper to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert file'));
      }
    };
    reader.onerror = error => reject(error);
  });
};

// Helper for accent-insensitive search
const normalizeText = (text: string) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

export const Generator: React.FC<GeneratorProps> = ({
  officials, template, files, campaigns, onCampaignCreate, onLogEmail, onToast
}) => {

  // Campaign State
  const [activeCampaignId, setActiveCampaignId] = useState<string>('');
  const [newCampaignName, setNewCampaignName] = useState('');
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);

  const activeCampaign = campaigns.find(c => c.id === activeCampaignId);

  // Email State
  const [editableEmails, setEditableEmails] = useState<EditableEmail[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // View & UI State
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>('cards');
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [subdirectoraEmail, setSubdirectoraEmail] = useState('gestion.personas@cftestatalaricayparinacota.cl');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = viewMode === 'compact' ? 10 : 5;
  const [aiInstruction, setAiInstruction] = useState<{ id: string, text: string } | null>(null);

  // Filters & Sort State
  const [selectedPosition, setSelectedPosition] = useState<string>('Todos');
  const [selectedDept, setSelectedDept] = useState<string>('Todos');
  const [selectedBoss, setSelectedBoss] = useState<string>('Todos');
  const [sortOption, setSortOption] = useState<'name' | 'surname' | 'department'>('name');

  // Derived Data
  const positions = useMemo(() => ['Todos', ...new Set(officials.map(o => o.position).filter(Boolean).sort())], [officials]);
  const departments = useMemo(() => ['Todos', ...new Set(officials.map(o => o.department).filter(Boolean).sort())], [officials]);
  const bosses = useMemo(() => ['Todos', ...new Set(officials.map(o => o.bossName).filter(Boolean).sort())], [officials]);
  const sortedOfficialsForCc = useMemo(() => [...officials].sort((a, b) => a.name.localeCompare(b.name)), [officials]);

  // Set initial campaign if available
  useEffect(() => {
    if (!activeCampaignId && campaigns.length > 0) {
      // Default to most recent campaign
      const recent = [...campaigns].sort((a, b) => b.createdAt - a.createdAt)[0];
      setActiveCampaignId(recent.id);
    }
  }, [campaigns]);

  // Generate Email List
  useEffect(() => {
    const generated = officials.map(official => {
      let body = template.body;

      // Calculate dynamic gender adjective
      let estimadoVar = 'Estimado/a';
      if (official.gender === Gender.Male) estimadoVar = 'Estimado';
      if (official.gender === Gender.Female) estimadoVar = 'Estimada';

      // Parse Name
      const nameParts = official.name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      let lastName = nameParts.length > 2 ? nameParts.slice(-2).join(' ') : (nameParts[1] || '');

      // Replace variables
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

      // Check logs for sent status in THIS campaign
      const isSent = activeCampaign
        ? activeCampaign.logs.some(l => l.officialId === official.id)
        : false;

      return {
        id: official.id,
        official,
        recipientType: 'official' as const,
        includeCc: false,
        includeSubdirectora: false,
        additionalCc: '',
        subject: template.subject,
        body,
        sent: isSent,
        aiRefining: false
      };
    });
    setEditableEmails(generated);
  }, [officials, template, activeCampaign]);

  // Handlers
  const handleCreateCampaign = () => {
    if (!newCampaignName.trim()) return;
    const newCamp = onCampaignCreate(newCampaignName);
    setActiveCampaignId(newCamp.id);
    setIsCreatingCampaign(false);
    setNewCampaignName('');
    onToast(`Campaña "${newCamp.name}" creada`, 'success');
  };

  const handleEmailChange = (id: string, field: 'subject' | 'body', value: string) => {
    setEditableEmails(prev => prev.map(email =>
      email.id === id ? { ...email, [field]: value } : email
    ));
  };

  const toggleRecipient = (id: string, type: 'official' | 'boss') => {
    setEditableEmails(prev => prev.map(email =>
      email.id === id ? { ...email, recipientType: type } : email
    ));
  };

  const toggleCc = (id: string) => {
    setEditableEmails(prev => prev.map(email =>
      email.id === id ? { ...email, includeCc: !email.includeCc } : email
    ));
  };

  const toggleSubdirectoraCc = (id: string) => {
    setEditableEmails(prev => prev.map(email =>
      email.id === id ? { ...email, includeSubdirectora: !email.includeSubdirectora } : email
    ));
  };

  const replicateSettingToAll = (key: 'includeCc' | 'includeSubdirectora', value: boolean) => {
    setEditableEmails(prev => prev.map(email => ({ ...email, [key]: value })));
    onToast(`Configuración aplicada a ${editableEmails.length} correos.`, 'success');
  };

  const handleAdditionalCcChange = (id: string, value: string) => {
    setEditableEmails(prev => prev.map(email => email.id === id ? { ...email, additionalCc: value } : email));
  };

  const getEmailAddresses = (email: EditableEmail) => {
    const to = email.recipientType === 'official' ? email.official.email : email.official.bossEmail;
    const ccList: string[] = [];

    if (email.includeCc && email.recipientType === 'official' && email.official.bossEmail) {
      ccList.push(email.official.bossEmail);
    }
    if (email.includeSubdirectora && subdirectoraEmail) ccList.push(subdirectoraEmail);
    if (email.additionalCc) ccList.push(email.additionalCc);

    const cc = ccList.join(',');
    return { to, cc };
  };

  const handleMailTo = (email: EditableEmail) => {
    if (!activeCampaignId) {
      onToast("Debes seleccionar o crear una campaña primero.", "error");
      return;
    }

    const { to, cc } = getEmailAddresses(email);
    // Convert HTML to Plain Text for mailto
    const plainBody = stripHtml(email.body);

    const params: string[] = [];
    if (cc) params.push(`cc=${encodeURIComponent(cc)}`);
    params.push(`subject=${encodeURIComponent(email.subject)}`);
    params.push(`body=${encodeURIComponent(plainBody)}`);

    window.open(`mailto:${to}?${params.join('&')}`, '_blank');

    onLogEmail(activeCampaignId, {
      officialId: email.id,
      recipientEmail: to,
      sentAt: Date.now(),
      method: 'mailto'
    });

    setEditableEmails(prev => prev.map(e => e.id === email.id ? { ...e, sent: true } : e));
  };

  const handleDownloadEml = async (email: EditableEmail) => {
    if (!activeCampaignId) {
      onToast("Debes seleccionar o crear una campaña primero.", "error");
      return;
    }

    try {
      const { to, cc } = getEmailAddresses(email);
      const boundary = `----=_NextPart_${Date.now()}`;

      let emlContent = `To: ${to}\n`;
      if (cc) emlContent += `Cc: ${cc}\n`;
      emlContent += `Subject: ${email.subject}\n`;
      emlContent += `X-Unsent: 1\n`;
      emlContent += `MIME-Version: 1.0\n`;
      emlContent += `Content-Type: multipart/mixed; boundary="${boundary}"\n\n`;

      // HTML Body
      emlContent += `--${boundary}\n`;
      emlContent += `Content-Type: text/html; charset="utf-8"\n`;
      emlContent += `Content-Transfer-Encoding: 7bit\n\n`;
      emlContent += `<html><body style="font-family: sans-serif;">${email.body}</body></html>\n\n`;

      // Attachments
      for (const file of files) {
        const base64 = await fileToBase64(file);
        emlContent += `--${boundary}\n`;
        emlContent += `Content-Type: ${file.type || 'application/octet-stream'}; name="${file.name}"\n`;
        emlContent += `Content-Disposition: attachment; filename="${file.name}"\n`;
        emlContent += `Content-Transfer-Encoding: base64\n\n`;
        const chunks = base64.match(/.{1,76}/g) || [];
        emlContent += chunks.join('\n') + `\n\n`;
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
        method: 'eml'
      });
      setEditableEmails(prev => prev.map(e => e.id === email.id ? { ...e, sent: true } : e));
      onToast("Archivo .eml descargado", "success");
    } catch (error) {
      console.error(error);
      onToast("Error al generar .eml", "error");
    }
  };

  const handleAiRefine = async (id: string) => {
    const email = editableEmails.find(e => e.id === id);
    if (!email || !aiInstruction || aiInstruction.id !== id || !aiInstruction.text) return;

    setEditableEmails(prev => prev.map(e => e.id === id ? { ...e, aiRefining: true } : e));
    try {
      const plainBody = stripHtml(email.body); // Send plain text context to AI
      const newBody = await refineEmailWithAI(plainBody, aiInstruction.text);
      // AI returns plain text, convert newline to BR for HTML editor
      const htmlBody = newBody.replace(/\n/g, '<br>');
      setEditableEmails(prev => prev.map(e => e.id === id ? { ...e, body: htmlBody, aiRefining: false } : e));
      setAiInstruction(null);
      onToast("Correo reescrito con éxito", "success");
    } catch (error) {
      setEditableEmails(prev => prev.map(e => e.id === id ? { ...e, aiRefining: false } : e));
      onToast("Error al reescribir con IA", "error");
    }
  };

  // --- Filter & Pagination ---
  const filteredEmails = editableEmails.filter(email => {
    const term = normalizeText(searchTerm);
    return (
      (normalizeText(email.official.name).includes(term) ||
        normalizeText(email.official.email).includes(term) ||
        normalizeText(email.subject).includes(term)) &&
      (selectedPosition === 'Todos' || email.official.position === selectedPosition) &&
      (selectedDept === 'Todos' || email.official.department === selectedDept) &&
      (selectedBoss === 'Todos' || email.official.bossName === selectedBoss)
    );
  });

  const sortedEmails = [...filteredEmails].sort((a, b) => {
    switch (sortOption) {
      case 'department': return (a.official.department || '').localeCompare(b.official.department || '');
      case 'surname':
        const sA = a.official.name.trim().split(' ').slice(-1)[0] || '';
        const sB = b.official.name.trim().split(' ').slice(-1)[0] || '';
        return sA.localeCompare(sB);
      case 'name':
      default: return a.official.name.localeCompare(b.official.name);
    }
  });

  const totalPages = Math.ceil(sortedEmails.length / itemsPerPage);
  const currentItems = sortedEmails.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (officials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-slate-200">
        <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
        <p className="text-slate-600">No hay funcionarios seleccionados para generar correos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Campaign Selector */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <History className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-indigo-900">Campaña de Envío</h3>
            <p className="text-xs text-indigo-600">
              {activeCampaign ? `Gestionando: ${activeCampaign.name}` : 'Selecciona o crea una campaña'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {isCreatingCampaign ? (
            <div className="flex items-center gap-2 w-full animate-in fade-in slide-in-from-right-2">
              <input
                autoFocus
                type="text"
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                placeholder="Nombre campaña (Ej. Navidad)"
                className="px-3 py-2 text-sm border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-48"
              />
              <button onClick={handleCreateCampaign} className="p-2 bg-indigo-600 text-slate-900 dark:text-white rounded-lg hover:bg-indigo-700">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setIsCreatingCampaign(false)} className="p-2 bg-white text-slate-500 dark:text-slate-500 rounded-lg border border-slate-300 hover:bg-slate-50">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <select
                value={activeCampaignId}
                onChange={(e) => setActiveCampaignId(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64"
              >
                <option value="" disabled>Seleccionar Campaña</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({new Date(c.createdAt).toLocaleDateString()})</option>
                ))}
              </select>
              <button
                onClick={() => setIsCreatingCampaign(true)}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-slate-900 dark:text-white rounded-lg text-sm font-medium hover:bg-indigo-700 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" /> Nueva
              </button>
            </>
          )}
        </div>
      </div>

      {!activeCampaignId ? (
        <div className="text-center py-20 opacity-50">
          <p>Por favor selecciona una campaña arriba para comenzar.</p>
        </div>
      ) : (
        <>
          {/* Main Controls */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-slate-800">Correos ({sortedEmails.length})</h2>
                <div className="bg-slate-100 p-1 rounded-lg flex border border-slate-200">
                  <button onClick={() => setViewMode('cards')} className={`p-1.5 rounded-md ${viewMode === 'cards' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 dark:text-slate-500'}`}><LayoutGrid className="w-4 h-4" /></button>
                  <button onClick={() => setViewMode('compact')} className={`p-1.5 rounded-md ${viewMode === 'compact' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 dark:text-slate-500'}`}><LayoutList className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full xl:w-auto">
                <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"><option value="Todos">Todos Dept.</option>{departments.map(d => <option key={d} value={d}>{d}</option>)}</select>
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm" placeholder="Buscar..." />
              </div>
            </div>
            {/* Subdirectora CC Config */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
              <div className="flex-1 w-full">
                <label className="text-xs font-bold text-indigo-900 flex items-center gap-2"><UserCog className="w-3 h-3" /> Correo Subdirectora (CC Opcional)</label>
                <input type="email" value={subdirectoraEmail} onChange={(e) => setSubdirectoraEmail(e.target.value)} className="w-full px-2 py-1 text-sm border rounded" />
              </div>
            </div>
          </div>

          {/* List */}
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 gap-6">
              {currentItems.map((item) => (
                <div key={item.id} className={`bg-white rounded-xl shadow-sm border ${item.sent ? 'border-green-200' : 'border-slate-200'}`}>
                  <div className={`px-6 py-4 border-b flex flex-col lg:flex-row justify-between gap-4 ${item.sent ? 'bg-green-50/50' : 'bg-slate-50'}`}>
                    <div className="flex flex-col gap-2">
                      <h3 className="font-bold text-slate-800">{item.official.name}</h3>
                      <div className="flex gap-2 text-xs">
                        <button onClick={() => toggleRecipient(item.id, 'official')} className={`px-2 py-1 rounded ${item.recipientType === 'official' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 dark:text-slate-500'}`}>Oficial</button>
                        <button onClick={() => toggleRecipient(item.id, 'boss')} className={`px-2 py-1 rounded ${item.recipientType === 'boss' ? 'bg-purple-100 text-purple-700' : 'text-slate-500 dark:text-slate-500'}`}>Jefatura</button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <button onClick={() => toggleCc(item.id)} className={`px-3 py-1.5 text-xs rounded border ${item.includeCc ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white'}`}>CC Jefe</button>
                      <button onClick={() => toggleSubdirectoraCc(item.id)} className={`px-3 py-1.5 text-xs rounded border ${item.includeSubdirectora ? 'bg-pink-50 border-pink-200 text-pink-700' : 'bg-white'}`}>CC Sub</button>
                      <div className="h-4 w-px bg-slate-300 mx-1"></div>
                      <button onClick={() => handleDownloadEml(item)} className="p-2 border rounded hover:bg-slate-50" title="Descargar EML (HTML)"><Download className="w-4 h-4" /></button>
                      <button onClick={() => handleMailTo(item)} className={`px-4 py-2 text-xs font-medium rounded flex items-center gap-2 ${item.sent ? 'bg-green-100 text-green-700' : 'bg-indigo-600 text-slate-900 dark:text-white'}`}>
                        {item.sent ? <Check className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />} {item.sent ? 'Enviado' : 'Enviar'}
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="mb-2">
                      <input type="text" value={item.subject} onChange={(e) => handleEmailChange(item.id, 'subject', e.target.value)} className="w-full text-sm font-bold border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none" />
                    </div>
                    <EmailEditor
                      content={item.body}
                      onChange={(val) => handleEmailChange(item.id, 'body', val)}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase">
                  <tr><th className="px-4 py-3">Nombre</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Acciones</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentItems.map(item => (
                    <tr key={item.id} className={item.sent ? 'bg-green-50/30' : ''}>
                      <td className="px-4 py-3 text-sm">{item.official.name}</td>
                      <td className="px-4 py-3 text-center">{item.sent ? <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-[10px]">Enviado</span> : <span className="bg-slate-100 text-slate-500 dark:text-slate-500 px-2 py-0.5 rounded text-[10px]">Pendiente</span>}</td>
                      <td className="px-4 py-3 text-right flex justify-end gap-2">
                        <button onClick={() => handleDownloadEml(item)} className="p-1.5 text-slate-500 dark:text-slate-500 hover:bg-slate-100 rounded"><Download className="w-4 h-4" /></button>
                        <button onClick={() => handleMailTo(item)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"><ExternalLink className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-4 pt-4">
              <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="p-2 border rounded disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm self-center">Página {currentPage} de {totalPages}</span>
              <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 border rounded disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
