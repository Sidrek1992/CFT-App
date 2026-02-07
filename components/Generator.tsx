
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Official, EmailTemplate, Gender } from '../types';
import { refineEmailWithAI } from '../services/geminiService';
import { getGmailAuthStatus, sendGmailMessage, startGmailAuth } from '../services/gmailService';
import { Copy, AlertCircle, CheckSquare, Square, User, UserCheck, Search, ChevronLeft, ChevronRight, Check, Filter, Download, Sparkles, Building2, UserPlus, X, LayoutList, LayoutGrid, ChevronDown, ChevronUp, CopyPlus, UserCog, ArrowUpDown, Mail, Send } from 'lucide-react';

interface GeneratorProps {
  officials: Official[];
  template: EmailTemplate;
  files: File[];
  sentHistory: string[];
  onMarkAsSent: (id: string) => void;
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
  body: string;
  sent: boolean; // Track sending status (local + prop)
  sending: boolean;
  aiRefining: boolean;
}

// Helper to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the Data URL prefix (e.g., "data:application/pdf;base64,")
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

export const Generator: React.FC<GeneratorProps> = ({ officials, template, files, sentHistory, onMarkAsSent, onToast }) => {
  
  const [editableEmails, setEditableEmails] = useState<EditableEmail[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // View Mode State (Cards vs Compact Table)
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>('cards');
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  
  // Global Config for Subdirectora
  const [subdirectoraEmail, setSubdirectoraEmail] = useState('gestion.personas@cftestatalaricayparinacota.cl');

  // Gmail Auth State
  const [gmailStatus, setGmailStatus] = useState({
    authenticated: false,
    email: '',
    loading: true,
  });
  const [gmailActionLoading, setGmailActionLoading] = useState(false);

  // Filters State
  const [selectedPosition, setSelectedPosition] = useState<string>('Todos');
  const [selectedDept, setSelectedDept] = useState<string>('Todos');
  const [selectedBoss, setSelectedBoss] = useState<string>('Todos');
  
  // Sorting State
  const [sortOption, setSortOption] = useState<'name' | 'surname' | 'department'>('name');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = viewMode === 'compact' ? 10 : 5; // More items in compact mode
  const [aiInstruction, setAiInstruction] = useState<{id: string, text: string} | null>(null);

  // Extract unique values for filters
  const positions = useMemo(() => ['Todos', ...new Set(officials.map(o => o.position).filter(Boolean).sort())], [officials]);
  const departments = useMemo(() => ['Todos', ...new Set(officials.map(o => o.department).filter(Boolean).sort())], [officials]);
  const bosses = useMemo(() => ['Todos', ...new Set(officials.map(o => o.bossName).filter(Boolean).sort())], [officials]);

  // Sort officials for the CC dropdown
  const sortedOfficialsForCc = useMemo(() => {
    return [...officials].sort((a, b) => a.name.localeCompare(b.name));
  }, [officials]);

  // Hotkey listener for Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInputRef.current?.focus();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const refreshGmailStatus = async () => {
    try {
      const status = await getGmailAuthStatus();
      setGmailStatus({
        authenticated: status.authenticated,
        email: status.email || '',
        loading: false,
      });
    } catch (error) {
      console.warn('Gmail status check failed', error);
      setGmailStatus({ authenticated: false, email: '', loading: false });
    }
  };

  useEffect(() => {
    refreshGmailStatus();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailParam = params.get('gmail');

    if (gmailParam === 'connected') {
      onToast('Gmail conectado', 'success');
      refreshGmailStatus();
    }

    if (gmailParam === 'error') {
      onToast('Error conectando Gmail', 'error');
      refreshGmailStatus();
    }

    if (gmailParam) {
      params.delete('gmail');
      const query = params.toString();
      const nextUrl = window.location.pathname + (query ? `?${query}` : '');
      window.history.replaceState({}, document.title, nextUrl);
    }
  }, [onToast]);

  // Generate initial batch
  useEffect(() => {
    const generated = officials.map(official => {
      let body = template.body;
      
      // Calculate dynamic gender adjective
      let estimadoVar = 'Estimado/a';
      if (official.gender === Gender.Male) estimadoVar = 'Estimado';
      if (official.gender === Gender.Female) estimadoVar = 'Estimada';

      // Parse Name Parts
      const nameParts = official.name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      let lastName = '';
      
      // Heuristic: If name has > 2 parts, assume last 2 are surnames (Standard Spanish Format)
      if (nameParts.length > 2) {
          lastName = nameParts.slice(-2).join(' ');
      } else if (nameParts.length === 2) {
          lastName = nameParts[1];
      }

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

      return {
        id: official.id,
        official,
        recipientType: 'official' as const, // Default to official
        includeCc: false,
        includeSubdirectora: false,
        additionalCc: '',
        subject: template.subject,
        body,
        sent: sentHistory.includes(official.id),
        sending: false,
        aiRefining: false
      };
    });
    setEditableEmails(generated);
  }, [officials, template, sentHistory]);

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
      setEditableEmails(prev => prev.map(email => ({
          ...email,
          [key]: value
      })));
      onToast(`Configuración aplicada a ${editableEmails.length} correos.`, 'success');
  };

  const handleAdditionalCcChange = (id: string, value: string) => {
    setEditableEmails(prev => prev.map(email => 
        email.id === id ? { ...email, additionalCc: value } : email
      ));
  };

  const toggleRowExpand = (id: string) => {
      setExpandedRows(prev => 
        prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
      );
  };

  // Helper to calculate addresses based on current state
  const getEmailAddresses = (email: EditableEmail) => {
    const to = email.recipientType === 'official' ? email.official.email : email.official.bossEmail;
    
    const ccList: string[] = [];
    
    // Logic: If Include CC is on, we add the boss if the boss isn't already the recipient
    if (email.includeCc) {
       if (email.recipientType === 'official' && email.official.bossEmail) {
         ccList.push(email.official.bossEmail);
       }
    }
    
    // Logic: Include Subdirectora
    if (email.includeSubdirectora && subdirectoraEmail) {
        ccList.push(subdirectoraEmail);
    }

    // Add Additional CC
    if (email.additionalCc) {
        ccList.push(email.additionalCc);
    }

    const cc = ccList.join(',');
    return { to, cc };
  };

  const handleGmailConnect = () => {
    setGmailActionLoading(true);
    startGmailAuth();
  };

  const buildGmailAttachments = async () => {
    if (files.length === 0) return [];
    return Promise.all(
      files.map(async (file) => ({
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        contentBase64: await fileToBase64(file),
      }))
    );
  };

  const handleSendGmail = async (email: EditableEmail) => {
    if (!gmailStatus.authenticated) {
      onToast('Conecta Gmail para enviar', 'error');
      return;
    }

    const { to, cc } = getEmailAddresses(email);
    if (!to || !to.includes('@')) {
      onToast('Destinatario sin correo valido', 'error');
      return;
    }

    setEditableEmails(prev => prev.map(e =>
      e.id === email.id ? { ...e, sending: true } : e
    ));

    try {
      const attachments = await buildGmailAttachments();
      await sendGmailMessage({
        to,
        cc: cc || undefined,
        subject: email.subject || '',
        body: email.body || '',
        attachments,
        officialId: email.id,
      });

      onMarkAsSent(email.id);
      setEditableEmails(prev => prev.map(e =>
        e.id === email.id ? { ...e, sent: true, sending: false } : e
      ));
      onToast('Correo enviado con Gmail', 'success');
    } catch (error) {
      console.error('Error sending Gmail', error);
      setEditableEmails(prev => prev.map(e =>
        e.id === email.id ? { ...e, sending: false } : e
      ));
      if (error instanceof Error && error.message === 'not_authenticated') {
        onToast('Sesion de Gmail expirada. Vuelve a iniciar sesion.', 'error');
        refreshGmailStatus();
        return;
      }
      onToast('Error al enviar con Gmail', 'error');
    }
  };

  const handleDownloadEml = async (email: EditableEmail) => {
    try {
      const { to, cc } = getEmailAddresses(email);
      const boundary = `----=_NextPart_${Date.now()}`;
      
      // Headers
      let emlContent = `To: ${to}\n`;
      if (cc) emlContent += `Cc: ${cc}\n`;
      emlContent += `Subject: ${email.subject}\n`;
      emlContent += `X-Unsent: 1\n`;
      emlContent += `MIME-Version: 1.0\n`;
      emlContent += `Content-Type: multipart/mixed; boundary="${boundary}"\n\n`;

      // HTML Body Part
      emlContent += `--${boundary}\n`;
      emlContent += `Content-Type: text/html; charset="utf-8"\n`;
      emlContent += `Content-Transfer-Encoding: 7bit\n\n`;
      emlContent += `<html><body style="font-family: sans-serif;">${email.body.replace(/\n/g, '<br/>')}</body></html>\n\n`;

      // Attachments Parts
      if (files.length > 0) {
        for (const file of files) {
          const base64 = await fileToBase64(file);
          
          emlContent += `--${boundary}\n`;
          emlContent += `Content-Type: ${file.type || 'application/octet-stream'}; name="${file.name}"\n`;
          emlContent += `Content-Disposition: attachment; filename="${file.name}"\n`;
          emlContent += `Content-Transfer-Encoding: base64\n\n`;
          
          // Split base64 into 76-char lines for MIME compliance
          const chunks = base64.match(/.{1,76}/g) || [];
          emlContent += chunks.join('\n');
          emlContent += `\n\n`;
        }
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
      onToast("Archivo .eml descargado con adjuntos", "success");
    } catch (error) {
      console.error("Error generating EML", error);
      onToast("Error al generar archivo .eml", "error");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    onToast("Copiado al portapapeles", "success");
  };

  const handleAiRefine = async (id: string) => {
    const email = editableEmails.find(e => e.id === id);
    if (!email || !aiInstruction || aiInstruction.id !== id || !aiInstruction.text) return;

    setEditableEmails(prev => prev.map(e => e.id === id ? { ...e, aiRefining: true } : e));
    
    try {
      const newBody = await refineEmailWithAI(email.body, aiInstruction.text);
      setEditableEmails(prev => prev.map(e => e.id === id ? { ...e, body: newBody, aiRefining: false } : e));
      setAiInstruction(null); // Close input
      onToast("Correo reescrito con éxito", "success");
    } catch (error) {
      setEditableEmails(prev => prev.map(e => e.id === id ? { ...e, aiRefining: false } : e));
      onToast("Error al reescribir con IA", "error");
    }
  };

  // --- Filtering & Pagination Logic ---
  const filteredEmails = editableEmails.filter(email => {
    const term = normalizeText(searchTerm);
    const matchesSearch = (
      normalizeText(email.official.name).includes(term) ||
      normalizeText(email.official.email).includes(term) ||
      normalizeText(email.subject).includes(term)
    );
    
    const matchesPosition = selectedPosition === 'Todos' || email.official.position === selectedPosition;
    const matchesDept = selectedDept === 'Todos' || email.official.department === selectedDept;
    const matchesBoss = selectedBoss === 'Todos' || email.official.bossName === selectedBoss;

    return matchesSearch && matchesPosition && matchesDept && matchesBoss;
  });

  // Sorting Logic
  const sortedEmails = [...filteredEmails].sort((a, b) => {
      switch (sortOption) {
          case 'department':
               return (a.official.department || '').localeCompare(b.official.department || '');
          case 'surname':
              // Naive surname extraction: last word
              const surnameA = a.official.name.trim().split(' ').slice(-1)[0] || '';
              const surnameB = b.official.name.trim().split(' ').slice(-1)[0] || '';
              return surnameA.localeCompare(surnameB);
          case 'name':
          default:
              return a.official.name.localeCompare(b.official.name);
      }
  });

  const totalPages = Math.ceil(sortedEmails.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = sortedEmails.slice(startIndex, startIndex + itemsPerPage);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); 
  };

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

  // --- Render Components ---

  const renderPagination = () => (
      <div className="flex justify-center items-center gap-4 mt-8 pb-4">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-slate-300 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <span className="text-sm font-medium text-slate-600">
            Página {currentPage} de {totalPages}
          </span>
          
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-slate-300 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
  );

  const renderBodyEditor = (item: EditableEmail) => (
      <div className="space-y-4 relative bg-slate-50 p-4 rounded-lg border border-slate-200 mt-4">
        <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Asunto</span>
            <input
            type="text"
            value={item.subject}
            onChange={(e) => handleEmailChange(item.id, 'subject', e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-corporate-blue outline-none font-medium text-slate-800"
            />
        </div>
        
        <div className="relative">
            <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contenido</span>
                <button 
                    onClick={() => setAiInstruction(prev => prev?.id === item.id ? null : {id: item.id, text: ''})}
                    className="text-xs text-indigo-600 flex items-center gap-1 hover:text-indigo-800"
                >
                    <Sparkles className="w-3 h-3" /> IA Rewrite
                </button>
            </div>
            
            {aiInstruction?.id === item.id && (
                <div className="mb-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100 animate-in fade-in slide-in-from-top-2">
                    <label className="block text-xs font-medium text-indigo-800 mb-1">¿Cómo quieres mejorar este correo?</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            autoFocus
                            value={aiInstruction.text}
                            onChange={(e) => setAiInstruction({ id: item.id, text: e.target.value })}
                            className="flex-1 px-3 py-1.5 text-xs border border-indigo-200 rounded focus:outline-none focus:border-indigo-400"
                            placeholder="Ej. Hazlo más formal, resume el segundo párrafo..."
                            onKeyDown={(e) => e.key === 'Enter' && handleAiRefine(item.id)}
                        />
                        <button 
                            onClick={() => handleAiRefine(item.id)}
                            disabled={!aiInstruction.text || item.aiRefining}
                            className="px-3 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {item.aiRefining ? '...' : 'Aplicar'}
                        </button>
                    </div>
                </div>
            )}

            {/* Skeleton Loading or Textarea */}
            {item.aiRefining ? (
                <div className="w-full h-[200px] bg-white rounded-lg border border-slate-200 p-4 space-y-3 animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                    <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                </div>
            ) : (
                <textarea
                    value={item.body}
                    onChange={(e) => handleEmailChange(item.id, 'body', e.target.value)}
                    className="w-full p-4 bg-white rounded-lg border border-slate-300 text-sm text-slate-700 whitespace-pre-wrap font-mono focus:ring-2 focus:ring-corporate-blue outline-none min-h-[200px]"
                />
            )}
        </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {gmailStatus.authenticated ? (
        <div className="bg-green-50 p-3 rounded-xl border border-green-200 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-green-100 text-green-700">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-green-900">Gmail conectado</p>
            <p className="text-xs text-green-700">Conectado como {gmailStatus.email || 'Cuenta Google'}</p>
          </div>
        </div>
      ) : (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-100 text-slate-500">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Gmail integrado</p>
              <p className="text-xs text-slate-500">
                {gmailStatus.loading ? 'Revisando sesion...' : 'No conectado'}
              </p>
            </div>
          </div>
          {!gmailStatus.loading && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleGmailConnect}
                disabled={gmailActionLoading}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {gmailActionLoading ? 'Abriendo Google...' : 'Conectar Gmail'}
              </button>
            </div>
          )}
        </div>
      )}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
        
        {/* Global Controls Row */}
        <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center border-b border-slate-100 pb-4">
            <div>
               <div className="flex items-center gap-3">
                   <h2 className="text-lg font-semibold text-slate-800">Filtros y Búsqueda</h2>
                   {/* View Toggle */}
                   <div className="bg-slate-100 p-1 rounded-lg flex border border-slate-200">
                        <button 
                            onClick={() => setViewMode('cards')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'cards' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Vista Tarjetas"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setViewMode('compact')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'compact' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Vista Compacta"
                        >
                            <LayoutList className="w-4 h-4" />
                        </button>
                   </div>
               </div>
               <p className="text-xs text-slate-500 mt-1">
                 Mostrando {sortedEmails.length} correos
               </p>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full xl:w-auto">
                {/* Sort Dropdown */}
                <div className="relative min-w-[150px]">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <ArrowUpDown className="h-4 w-4 text-slate-400" />
                    </div>
                    <select
                        value={sortOption}
                        onChange={(e) => { setSortOption(e.target.value as any); setCurrentPage(1); }}
                        className="pl-10 w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-corporate-blue outline-none appearance-none cursor-pointer"
                    >
                        <option value="name">Nombre (A-Z)</option>
                        <option value="surname">Apellido (A-Z)</option>
                        <option value="department">Departamento</option>
                    </select>
                </div>

                {/* Department Filter */}
                 <div className="relative min-w-[150px]">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Building2 className="h-4 w-4 text-slate-400" />
                    </div>
                    <select
                        value={selectedDept}
                        onChange={(e) => { setSelectedDept(e.target.value); setCurrentPage(1); }}
                        className="pl-10 w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-corporate-blue outline-none appearance-none cursor-pointer"
                    >
                        {departments.map(d => (
                            <option key={d} value={d}>{d === 'Todos' ? 'Todos Depts.' : d}</option>
                        ))}
                    </select>
                </div>

                {/* Boss Filter */}
                <div className="relative min-w-[150px]">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <UserCheck className="h-4 w-4 text-slate-400" />
                    </div>
                    <select
                        value={selectedBoss}
                        onChange={(e) => { setSelectedBoss(e.target.value); setCurrentPage(1); }}
                        className="pl-10 w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-corporate-blue outline-none appearance-none cursor-pointer"
                    >
                        {bosses.map(b => (
                            <option key={b} value={b}>{b === 'Todos' ? 'Todas Jef.' : b}</option>
                        ))}
                    </select>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="pl-10 w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-corporate-blue outline-none"
                        placeholder="Buscar (Ctrl + K)"
                    />
                </div>
            </div>
        </div>

        {/* Configuration Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
             <div className="flex-1 w-full">
                 <label className="block text-xs font-bold text-indigo-900 mb-1 uppercase tracking-wider flex items-center gap-2">
                    <UserCog className="w-4 h-4" />
                    Correo Subdirectora de Gestión de Personas (CC Opcional)
                 </label>
                 <input 
                    type="email" 
                    value={subdirectoraEmail}
                    onChange={(e) => setSubdirectoraEmail(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-indigo-200 rounded text-slate-700 focus:outline-none focus:border-indigo-400"
                    placeholder="ejemplo@empresa.cl"
                 />
             </div>
             <div className="flex items-end gap-2 text-xs text-indigo-700">
                 <AlertCircle className="w-4 h-4 mb-0.5" />
                 <span className="max-w-md">Este correo se usará si activas la opción <strong>CC Subdirectora de Gestión de Personas</strong> en los envíos individuales o masivos.</span>
             </div>
        </div>

      </div>

      {filteredEmails.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
              <p className="text-slate-500">No se encontraron resultados.</p>
              <button 
                onClick={() => { setSearchTerm(''); setSelectedPosition('Todos'); setSelectedDept('Todos'); setSelectedBoss('Todos'); }}
                className="mt-2 text-indigo-600 hover:underline text-sm"
              >
                Limpiar filtros
              </button>
          </div>
      ) : viewMode === 'cards' ? (
          // CARD VIEW MODE
          <div className="grid grid-cols-1 gap-6">
            {currentItems.map((item) => {
              const sendDisabled = !gmailStatus.authenticated || item.sending;
              const sendTitle = !gmailStatus.authenticated
                ? 'Conecta Gmail para enviar'
                : item.sending
                ? 'Enviando...'
                : 'Enviar con Gmail';

              return (
                <div key={item.id} className={`bg-white rounded-xl shadow-sm border ${item.sent ? 'border-green-200' : 'border-slate-200'} overflow-visible transition-all hover:shadow-md`}>
                  {/* Card Header */}
                  <div className={`px-6 py-4 border-b flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 ${item.sent ? 'bg-green-50/50 border-green-100' : 'bg-slate-50 border-slate-200'}`}>
                    
                    {/* Recipient Selectors */}
                    <div className="flex flex-col gap-3 w-full lg:w-auto">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider w-12">Para:</span>
                        <div className="flex bg-white border border-slate-200 rounded-lg p-1">
                            <button 
                              onClick={() => toggleRecipient(item.id, 'official')}
                              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                item.recipientType === 'official' 
                                ? 'bg-indigo-100 text-indigo-700 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <User className="w-3 h-3" />
                              {item.official.name}
                            </button>
                            <button 
                              onClick={() => toggleRecipient(item.id, 'boss')}
                              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                item.recipientType === 'boss' 
                                ? 'bg-purple-100 text-purple-700 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <UserCheck className="w-3 h-3" />
                              Jefatura
                            </button>
                        </div>
                      </div>
                      
                       <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider w-12"></span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                             <span className="font-semibold">{item.official.position}</span>
                             {item.official.department && (
                                <span className="text-slate-400">• {item.official.department}</span>
                             )}
                          </span>
                       </div>

                    </div>

                    {/* CC and Actions */}
                    <div className="flex flex-col gap-2 w-full lg:w-auto">
                        
                        <div className="flex flex-wrap items-center gap-2">
                             {/* CC Jefatura Button */}
                            <div className="flex items-center">
                                <button 
                                    onClick={() => toggleCc(item.id)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-l-lg border-y border-l transition-all text-xs font-medium ${
                                    item.includeCc 
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 z-10' 
                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                    }`}
                                >
                                    {item.includeCc ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                    CC Jefatura
                                </button>
                                <button
                                    onClick={() => replicateSettingToAll('includeCc', !item.includeCc)}
                                    className="px-2 py-1.5 bg-slate-100 border border-slate-200 rounded-r-lg hover:bg-slate-200 text-slate-500 transition-colors"
                                    title={`Aplicar "CC Jefatura: ${!item.includeCc ? 'Sí' : 'No'}" a TODOS`}
                                >
                                    <CopyPlus className="w-4 h-4" />
                                </button>
                            </div>

                             {/* CC Subdirectora Button */}
                            <div className="flex items-center">
                                <button 
                                    onClick={() => toggleSubdirectoraCc(item.id)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-l-lg border-y border-l transition-all text-xs font-medium ${
                                    item.includeSubdirectora 
                                    ? 'bg-pink-50 border-pink-200 text-pink-700 z-10' 
                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                    }`}
                                >
                                    {item.includeSubdirectora ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                    CC Subdirectora de Gestión de Personas
                                </button>
                                <button
                                    onClick={() => replicateSettingToAll('includeSubdirectora', !item.includeSubdirectora)}
                                    className="px-2 py-1.5 bg-slate-100 border border-slate-200 rounded-r-lg hover:bg-slate-200 text-slate-500 transition-colors"
                                    title={`Aplicar "CC Subdirectora de Gestión de Personas: ${!item.includeSubdirectora ? 'Sí' : 'No'}" a TODOS`}
                                >
                                    <CopyPlus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 mt-2 lg:mt-0">
                            {/* Additional CC Selector */}
                            <div className="flex items-center gap-1">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                        <UserPlus className="w-3 h-3 text-slate-400" />
                                    </div>
                                    <select
                                        value={item.additionalCc}
                                        onChange={(e) => handleAdditionalCcChange(item.id, e.target.value)}
                                        className={`pl-7 pr-4 py-1.5 rounded-lg border text-xs font-medium appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-indigo-100 transition-all max-w-[150px] ${
                                            item.additionalCc 
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                        }`}
                                    >
                                        <option value="">{item.additionalCc ? 'Sin copia extra' : '+ CC Otro'}</option>
                                        {sortedOfficialsForCc.filter(o => o.email !== (item.recipientType === 'official' ? item.official.email : item.official.bossEmail)).map(o => (
                                            <option key={o.id} value={o.email}>
                                                {o.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {item.additionalCc && (
                                    <button
                                        onClick={() => handleAdditionalCcChange(item.id, '')}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                        title="Quitar CC adicional"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

                            <div className="h-4 w-px bg-slate-300 hidden lg:block"></div>

                            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                                <button
                                    onClick={() => handleDownloadEml(item)}
                                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-all border border-slate-200 hover:border-indigo-200"
                                    title="Descargar archivo .eml (Outlook)"
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => copyToClipboard(item.body)}
                                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-all border border-slate-200 hover:border-indigo-200"
                                    title="Copiar texto"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleSendGmail(item)}
                                    disabled={sendDisabled}
                                    title={sendTitle}
                                    className={`px-4 py-2 text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm hover:shadow ${
                                        item.sent 
                                        ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                    } ${sendDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                                >
                                    {item.sent ? <Check className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                                    {item.sending ? 'Enviando...' : item.sent ? 'Enviado' : 'Enviar con Gmail'}
                                </button>
                            </div>
                        </div>
                    </div>
                  </div>
                  
                  {/* Editable Content */}
                  <div className="p-6 relative">
                     {item.sent && (
                         <div className="absolute top-0 right-0 m-2">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-green-100 text-green-800 border border-green-200">
                                <Check className="w-3 h-3" /> Enviado
                            </span>
                         </div>
                    )}
                    {renderBodyEditor(item)}
                    
                    {files.length > 0 && (
                      <div className="pt-2 mt-4 border-t border-slate-100">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                          Adjuntos incluidos en descarga .EML
                        </span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {files.map((f, i) => (
                            <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-600">
                              {f.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
      ) : (
          // TABLE COMPACT MODE
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="overflow-x-auto">
                 <table className="w-full text-left">
                     <thead>
                         <tr className="bg-slate-50 border-b border-slate-200">
                             <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Destinatario</th>
                             <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Configuración</th>
                             <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Asunto</th>
                             <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-center">Estado</th>
                             <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Acciones</th>
                             <th className="w-10"></th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                          {currentItems.map(item => {
                              const sendDisabled = !gmailStatus.authenticated || item.sending;
                              const sendTitle = !gmailStatus.authenticated
                                ? 'Conecta Gmail para enviar'
                                : item.sending
                                ? 'Enviando...'
                                : 'Enviar con Gmail';

                              return (
                              <React.Fragment key={item.id}>
                                 <tr className={`hover:bg-slate-50 transition-colors ${item.sent ? 'bg-green-50/30' : ''}`}>
                                     <td className="px-4 py-3">
                                         <div className="font-medium text-sm text-slate-900">{item.official.name}</div>
                                         <div className="text-xs text-slate-500">{item.official.email}</div>
                                     </td>
                                     <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => toggleCc(item.id)}
                                                className={`p-1 rounded border transition-colors ${item.includeCc ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-400'}`}
                                                title="CC Jefatura"
                                            >
                                                <UserCheck className="w-3 h-3" />
                                            </button>
                                            <button 
                                                onClick={() => toggleSubdirectoraCc(item.id)}
                                                className={`p-1 rounded border transition-colors ${item.includeSubdirectora ? 'bg-pink-100 border-pink-200 text-pink-700' : 'bg-white border-slate-200 text-slate-400'}`}
                                                title="CC Subdirectora de Gestión de Personas"
                                            >
                                                <UserCog className="w-3 h-3" />
                                            </button>
                                        </div>
                                     </td>
                                     <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                                         {item.subject}
                                     </td>
                                     <td className="px-4 py-3 text-center">
                                         {item.sent ? (
                                             <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                                                 Enviado
                                             </span>
                                         ) : (
                                             <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                                                 Pendiente
                                             </span>
                                         )}
                                     </td>
                                     <td className="px-4 py-3 text-right">
                                         <div className="flex justify-end gap-2">
                                             <button
                                                onClick={() => handleDownloadEml(item)}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded bg-transparent hover:bg-indigo-50"
                                                title="Descargar EML"
                                             >
                                                 <Download className="w-4 h-4" />
                                             </button>
                                              <button
                                                onClick={() => handleSendGmail(item)}
                                                disabled={sendDisabled}
                                                className={`p-1.5 rounded transition-colors ${item.sent ? 'text-green-600 hover:bg-green-100' : 'text-indigo-600 hover:bg-indigo-100'} ${sendDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                title={sendTitle}
                                              >
                                                  {item.sent ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                                              </button>
                                         </div>
                                     </td>
                                     <td className="px-2">
                                         <button 
                                            onClick={() => toggleRowExpand(item.id)}
                                            className="p-1 text-slate-400 hover:text-slate-600"
                                         >
                                             {expandedRows.includes(item.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                         </button>
                                     </td>
                                 </tr>
                                 {expandedRows.includes(item.id) && (
                                     <tr className="bg-slate-50/50">
                                         <td colSpan={6} className="px-4 py-4 border-b border-slate-100">
                                             {renderBodyEditor(item)}
                                         </td>
                                     </tr>
                                 )}
                              </React.Fragment>
                          );
                          })}
                     </tbody>
                 </table>
             </div>
          </div>
      )}

      {totalPages > 1 && renderPagination()}
    </div>
  );
};
