
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Official, EmailTemplate, Gender, SavedCc } from '../types';
import { refineEmailWithAI } from '../services/geminiService';
import { Copy, ExternalLink, User, Search, ChevronLeft, ChevronRight, Check, Download, Sparkles, Building2, UserPlus, X, Mail, Send, Fingerprint, Calendar, Clock, BookmarkCheck } from 'lucide-react';

interface GeneratorProps {
  officials: Official[];
  template: EmailTemplate;
  files: File[];
  sentHistory: string[];
  savedCcs: SavedCc[];
  onMarkAsSent: (id: string) => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
}

interface EditableEmail {
  id: string;
  official: Official;
  recipientType: 'official' | 'boss';
  includeCc: boolean; // This refers to including the Boss CC
  selectedPermanentCcIds: string[];
  additionalCc: string;
  subject: string;
  body: string;
  sent: boolean;
  aiRefining: boolean;
}

const normalizeText = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const Generator: React.FC<GeneratorProps> = ({ officials, template, files, sentHistory, savedCcs, onMarkAsSent, onToast }) => {
  const [editableEmails, setEditableEmails] = useState<EditableEmail[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [aiInstruction, setAiInstruction] = useState<{ id: string, text: string } | null>(null);

  useEffect(() => {
    const generated = officials.map(official => {
      let body = template.body;
      let estimadoVar = official.gender === Gender.Male ? 'Estimado' : official.gender === Gender.Female ? 'Estimada' : 'Estimado/a';

      const nameParts = official.name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

      // Mapeo extendido de placeholders
      const mapping: Record<string, string> = {
        '{nombre}': official.name,
        '{nombres}': firstName,
        '{apellidos}': lastName,
        '{titulo}': official.title,
        '{estimado}': estimadoVar,
        '{rut}': official.rut || 'N/A',
        '{departamento}': official.department || '',
        '{cargo}': official.position,
        '{correo}': official.email,
        '{fecha_ingreso}': official.entryDate || 'N/A',
        '{fecha_fin_contrato}': official.contractEndDate || 'N/A',
        '{jefatura_nombre}': official.bossName || 'N/A',
        '{jefatura_cargo}': official.bossPosition || 'N/A'
      };

      Object.entries(mapping).forEach(([key, value]) => {
        body = body.replace(new RegExp(key, 'g'), value);
      });

      return {
        id: official.id,
        official,
        recipientType: 'official',
        includeCc: false,
        selectedPermanentCcIds: [],
        additionalCc: '',
        subject: template.subject,
        body,
        sent: sentHistory.includes(official.id),
        aiRefining: false
      };
    });
    setEditableEmails(generated);
  }, [officials, template, sentHistory]);

  const handleEmailChange = (id: string, field: keyof EditableEmail, value: any) => {
    setEditableEmails(prev => prev.map(email => email.id === id ? { ...email, [field]: value } : email));
  };

  const togglePermanentCc = (emailId: string, ccId: string) => {
    setEditableEmails(prev => prev.map(email => {
      if (email.id !== emailId) return email;
      const ids = [...email.selectedPermanentCcIds];
      const index = ids.indexOf(ccId);
      if (index === -1) ids.push(ccId);
      else ids.splice(index, 1);
      return { ...email, selectedPermanentCcIds: ids };
    }));
  };

  const getEmailAddresses = (email: EditableEmail) => {
    const to = email.recipientType === 'official' ? email.official.email : email.official.bossEmail;
    const ccList: string[] = [];

    // Boss CC
    if (email.includeCc && email.recipientType === 'official' && email.official.bossEmail) {
      ccList.push(email.official.bossEmail);
    }

    // Permanent CCs
    email.selectedPermanentCcIds.forEach(id => {
      const found = savedCcs.find(s => s.id === id);
      if (found) ccList.push(found.email);
    });

    // Manual CC
    if (email.additionalCc) ccList.push(email.additionalCc);

    return { to, cc: ccList.join(',') };
  };

  const handleGmailWeb = (email: EditableEmail) => {
    const { to, cc } = getEmailAddresses(email);
    const subject = encodeURIComponent(email.subject);
    const body = encodeURIComponent(email.body);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&cc=${cc}&su=${subject}&body=${body}`;
    window.open(gmailUrl, '_blank');
    onMarkAsSent(email.id);
  };

  const handleAiRefine = async (id: string) => {
    const email = editableEmails.find(e => e.id === id);
    if (!email || !aiInstruction || aiInstruction.id !== id || !aiInstruction.text) return;
    setEditableEmails(prev => prev.map(e => e.id === id ? { ...e, aiRefining: true } : e));
    try {
      const newBody = await refineEmailWithAI(email.body, aiInstruction.text);
      setEditableEmails(prev => prev.map(e => e.id === id ? { ...e, body: newBody, aiRefining: false } : e));
      setAiInstruction(null);
      onToast("Cuerpo actualizado con IA", "success");
    } catch (error) {
      setEditableEmails(prev => prev.map(e => e.id === id ? { ...e, aiRefining: false } : e));
      onToast("Error de IA", "error");
    }
  };

  const filteredEmails = editableEmails.filter(email => {
    const term = normalizeText(searchTerm);
    return normalizeText(email.official.name).includes(term) || (email.official.rut && email.official.rut.includes(term));
  });

  const totalPages = Math.ceil(filteredEmails.length / itemsPerPage);
  const currentItems = filteredEmails.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Send className="w-5 h-5 text-indigo-600" /> Cola de Envíos Personalizados
        </h2>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm w-full outline-none" placeholder="Filtrar cola por nombre o RUT..." />
        </div>
      </div>

      <div className="space-y-4">
        {currentItems.map(item => (
          <div key={item.id} className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all ${item.sent ? 'opacity-60 grayscale-[0.5]' : 'hover:shadow-md'}`}>
            <div className="p-6">
              <div className="flex flex-col lg:flex-row justify-between gap-6">
                <div className="flex gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${item.sent ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white'}`}>
                    {item.sent ? <Check className="w-6 h-6" /> : item.official.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{item.official.name}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                      <span className="text-xs text-slate-500 flex items-center gap-1"><Fingerprint className="w-3 h-3" /> {item.official.rut || 'N/A'}</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1"><Building2 className="w-3 h-3" /> {item.official.department}</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Término: {item.official.contractEndDate || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleGmailWeb(item)}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200"
                  >
                    <Mail className="w-4 h-4" /> Gmail Web
                  </button>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <input type="text" value={item.subject} onChange={e => handleEmailChange(item.id, 'subject', e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold" />
                  <div className="relative">
                    <textarea value={item.body} onChange={e => handleEmailChange(item.id, 'body', e.target.value)} className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono resize-none outline-none focus:ring-2 focus:ring-indigo-500" />
                    <button onClick={() => setAiInstruction({ id: item.id, text: '' })} className="absolute bottom-4 right-4 p-2 bg-white text-indigo-600 rounded-lg shadow-md border border-slate-100 hover:scale-105 transition-transform"><Sparkles className="w-4 h-4" /></button>
                  </div>
                  {aiInstruction?.id === item.id && (
                    <div className="flex gap-2 animate-in slide-in-from-top-2">
                      <input autoFocus type="text" value={aiInstruction.text} onChange={e => setAiInstruction({ id: item.id, text: e.target.value })} className="flex-1 px-3 py-1.5 text-xs border rounded-lg" placeholder="Ej: Escríbelo más formal..." />
                      <button onClick={() => handleAiRefine(item.id)} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold">Aplicar IA</button>
                    </div>
                  )}
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Opciones de Envío</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-100 cursor-pointer hover:bg-indigo-50 transition-colors">
                      <input type="checkbox" checked={item.includeCc} onChange={() => handleEmailChange(item.id, 'includeCc', !item.includeCc)} className="w-4 h-4 text-indigo-600 rounded" />
                      <span className="text-xs font-bold text-slate-700">CC Jefatura</span>
                    </label>

                    {/* Permanent CC Section */}
                    {savedCcs.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase flex items-center gap-1">
                          <BookmarkCheck className="w-3 h-3" /> Copias Permanentes:
                        </span>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {savedCcs.map(cc => (
                            <label key={cc.id} className="flex items-center gap-2 p-1.5 bg-white/50 rounded-lg border border-slate-100 cursor-pointer hover:bg-indigo-50 transition-colors">
                              <input
                                type="checkbox"
                                checked={item.selectedPermanentCcIds.includes(cc.id)}
                                onChange={() => togglePermanentCc(item.id, cc.id)}
                                className="w-3.5 h-3.5 text-indigo-600 rounded"
                              />
                              <div className="min-w-0">
                                <p className="text-[10px] font-bold text-slate-700 truncate leading-none">{cc.label}</p>
                                <p className="text-[8px] text-slate-400 truncate leading-none">{cc.email}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Para:</span>
                      <div className="flex gap-1">
                        <button onClick={() => handleEmailChange(item.id, 'recipientType', 'official')} className={`flex-1 py-2 rounded-lg text-[10px] font-black border transition-all ${item.recipientType === 'official' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-500 border-slate-200'}`}>FUNCIONARIO</button>
                        <button onClick={() => handleEmailChange(item.id, 'recipientType', 'boss')} className={`flex-1 py-2 rounded-lg text-[10px] font-black border transition-all ${item.recipientType === 'boss' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-500 border-slate-200'}`}>JEFATURA</button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">CC Adicional Manual:</label>
                      <input
                        type="text"
                        value={item.additionalCc}
                        onChange={e => handleEmailChange(item.id, 'additionalCc', e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-[10px] outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="otros@cft.cl"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 py-4">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="p-2 border rounded-lg bg-white shadow-sm"><ChevronLeft /></button>
          <span className="text-sm font-bold text-slate-600">Página {currentPage} de {totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="p-2 border rounded-lg bg-white shadow-sm"><ChevronRight /></button>
        </div>
      )}
    </div>
  );
};
