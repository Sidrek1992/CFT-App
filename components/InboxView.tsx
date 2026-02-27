import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    RefreshCw, Mail, MailOpen, Send, ChevronLeft,
    Loader2, User, Reply, ShieldAlert, Search, Inbox,
    MessageSquare, Archive, ArchiveRestore, Sparkles, X,
    BookOpen, ChevronDown
} from 'lucide-react';
import {
    ParsedThread,
    ParsedMessage,
    fetchInboxThreads,
    fetchGmailProfile,
    markThreadAsRead,
    buildReplyRaw,
    sendGmailReply,
} from '../services/gmailService';
import { hasGmailToken, reauthorizeWithGoogle } from '../services/authService';
import { Campaign, SavedTemplate } from '../types';
import { generateQuickReplies } from '../services/geminiService';

// ─── Props ────────────────────────────────────────────────────────────────────
interface InboxViewProps {
    campaigns: Campaign[];
    onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
    savedTemplates?: SavedTemplate[];
}

// ─── Local storage key for archived thread IDs ────────────────────────────────
const ARCHIVED_KEY = 'inbox_archived_threads';

const getArchivedIds = (): Set<string> => {
    try {
        const raw = localStorage.getItem(ARCHIVED_KEY);
        return new Set(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
};

const saveArchivedIds = (ids: Set<string>) => {
    localStorage.setItem(ARCHIVED_KEY, JSON.stringify(Array.from(ids)));
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const isThisYear = d.getFullYear() === now.getFullYear();
    if (isToday) return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    if (isThisYear) return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
};

const extractEmail = (str: string): string => {
    const match = str.match(/<([^>]+)>/);
    return match ? match[1] : str.trim();
};

const extractDisplayName = (str: string): string => {
    const match = str.match(/^(.+?)\s*<[^>]+>/);
    return match ? match[1].trim().replace(/"/g, '') : str.trim();
};

// ─── Reply Editor (enhanced with templates + AI) ──────────────────────────────
interface ReplyEditorProps {
    thread: ParsedThread;
    onSent: () => void;
    onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
    savedTemplates?: SavedTemplate[];
}

const ReplyEditor: React.FC<ReplyEditorProps> = ({ thread, onSent, onToast, savedTemplates = [] }) => {
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingAI, setLoadingAI] = useState(false);
    const [aiReplies, setAiReplies] = useState<string[]>([]);
    const [showTemplates, setShowTemplates] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => { textareaRef.current?.focus(); }, []);

    // Auto-grow textarea
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setBody(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
    };

    const handleSend = async () => {
        if (!body.trim()) { onToast('Escribe una respuesta primero.', 'error'); return; }
        const lastMsg = thread.messages[thread.messages.length - 1];
        const replyTo = extractEmail(lastMsg.from);
        const htmlBody = `<p style="margin:0">${body.replace(/\n/g, '<br>')}</p>
      <br/><hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
      <p style="color:#9ca3af;font-size:12px">El ${new Date(lastMsg.date).toLocaleString('es-CL')}, ${lastMsg.from} escribió:</p>
      <blockquote style="margin:0 0 0 8px;padding-left:12px;border-left:3px solid #d1d5db;color:#6b7280;font-size:13px">
        ${lastMsg.bodyHtml}
      </blockquote>`;

        setSending(true);
        try {
            const payload = buildReplyRaw(replyTo, thread.subject, htmlBody, thread.threadId, lastMsg.id);
            await sendGmailReply(payload);
            onToast(`Respuesta enviada a ${replyTo}`, 'success');
            setBody('');
            setAiReplies([]);
            onSent();
        } catch (err: any) {
            onToast(err.message || 'Error al enviar la respuesta.', 'error');
        } finally {
            setSending(false);
        }
    };

    const handleGenerateAI = async () => {
        setLoadingAI(true);
        setAiReplies([]);
        try {
            const lastMsg = thread.messages[thread.messages.length - 1];
            const context = thread.messages
                .slice(-3)
                .map(m => `[${extractDisplayName(m.from)}]: ${m.bodyText.slice(0, 400)}`)
                .join('\n\n');
            const replies = await generateQuickReplies(context, extractDisplayName(lastMsg.from));
            setAiReplies(replies);
        } catch {
            onToast('Error al generar sugerencias IA', 'error');
        } finally {
            setLoadingAI(false);
        }
    };

    const applyTemplate = (t: SavedTemplate) => {
        // Strip placeholders and use raw body text
        const stripped = t.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        setBody(stripped);
        setShowTemplates(false);
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
            }
        }, 10);
    };

    const lastMsg = thread.messages[thread.messages.length - 1];
    const replyTo = extractEmail(lastMsg.from);
    const activeSavedTemplates = savedTemplates.filter(t => !t.archived);

    return (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
            {/* Header */}
            <div className="bg-slate-50 dark:bg-dark-900/50 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                    <Reply className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Responder a</span>
                    <span className="text-sm text-indigo-600 dark:text-indigo-400 font-mono">{replyTo}</span>
                </div>
                <div className="flex items-center gap-2">
                    {/* Templates dropdown */}
                    {activeSavedTemplates.length > 0 && (
                        <div className="relative">
                            <button
                                onClick={() => setShowTemplates(!showTemplates)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-dark-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-600"
                            >
                                <BookOpen className="w-3 h-3" />
                                Plantillas
                                <ChevronDown className="w-3 h-3" />
                            </button>
                            {showTemplates && (
                                <div className="absolute right-0 top-full mt-1 w-60 bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-10 overflow-hidden">
                                    <div className="max-h-48 overflow-y-auto">
                                        {activeSavedTemplates.map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => applyTemplate(t)}
                                                className="w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-dark-700 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
                                            >
                                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{t.name}</p>
                                                <p className="text-[10px] text-slate-400 truncate">{t.subject}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {/* AI Quick Replies */}
                    <button
                        onClick={handleGenerateAI}
                        disabled={loadingAI}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors border border-indigo-200 dark:border-indigo-800 disabled:opacity-60"
                    >
                        {loadingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        {loadingAI ? 'Generando...' : 'Sugerir con IA'}
                    </button>
                </div>
            </div>

            {/* AI Suggestions */}
            {aiReplies.length > 0 && (
                <div className="bg-indigo-50/60 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/50 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-2 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" /> Respuestas rápidas sugeridas por IA
                    </p>
                    <div className="flex flex-col gap-1.5">
                        {aiReplies.map((reply, i) => (
                            <button
                                key={i}
                                onClick={() => { setBody(reply); setAiReplies([]); }}
                                className="text-left text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-dark-800 border border-indigo-200 dark:border-indigo-800 rounded-lg px-3 py-2 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                            >
                                {reply}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setAiReplies([])} className="mt-1.5 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center gap-1">
                        <X className="w-3 h-3" /> Descartar sugerencias
                    </button>
                </div>
            )}

            {/* Body */}
            <div className="bg-white dark:bg-dark-800 p-4">
                <textarea
                    ref={textareaRef}
                    value={body}
                    onChange={handleChange}
                    placeholder="Escribe tu respuesta aquí..."
                    className="w-full min-h-[120px] text-sm text-slate-800 dark:text-slate-200 bg-transparent resize-none focus:outline-none placeholder-slate-400 dark:placeholder-slate-500"
                />
            </div>

            {/* Footer */}
            <div className="bg-slate-50 dark:bg-dark-900/50 border-t border-slate-200 dark:border-slate-700 px-4 py-3 flex justify-end">
                <button
                    onClick={handleSend}
                    disabled={sending || !body.trim()}
                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-semibold transition-all"
                >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {sending ? 'Enviando...' : 'Enviar respuesta'}
                </button>
            </div>
        </div>
    );
};

// ─── Thread Detail ─────────────────────────────────────────────────────────────
interface ThreadDetailProps {
    thread: ParsedThread;
    onBack: () => void;
    onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
    onReplySent: () => void;
    onArchive: (threadId: string) => void;
    savedTemplates?: SavedTemplate[];
}

const ThreadDetail: React.FC<ThreadDetailProps> = ({ thread, onBack, onToast, onReplySent, onArchive, savedTemplates }) => {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(
        new Set([thread.messages[thread.messages.length - 1]?.id])
    );
    const [showReply, setShowReply] = useState(false);

    const toggleMessage = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleReplySent = () => {
        setShowReply(false);
        onReplySent();
    };

    return (
        <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-200">
            {/* Top bar */}
            <div className="flex items-center gap-3 mb-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Bandeja
                </button>
                <span className="text-slate-300 dark:text-slate-600">/</span>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white truncate flex-1">
                    {thread.subject}
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
                    {thread.messageCount} mensaje{thread.messageCount !== 1 ? 's' : ''}
                </span>
                {/* Archive button */}
                <button
                    onClick={() => onArchive(thread.threadId)}
                    title="Archivar hilo"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                >
                    <Archive className="w-3.5 h-3.5" />
                    Archivar
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {thread.messages.map((msg, idx) => {
                    const isExpanded = expandedIds.has(msg.id);
                    const isLast = idx === thread.messages.length - 1;
                    return (
                        <div
                            key={msg.id}
                            className={`border rounded-xl overflow-hidden transition-all ${msg.isFromMe
                                ? 'border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-950/20'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-800'
                            }`}
                        >
                            <button
                                onClick={() => toggleMessage(msg.id)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${msg.isFromMe
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                }`}>
                                    {extractDisplayName(msg.from).charAt(0).toUpperCase() || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                                        {msg.isFromMe ? 'Tú' : extractDisplayName(msg.from)}
                                    </p>
                                    {!isExpanded && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{msg.bodyText.slice(0, 80)}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {isLast && !msg.isFromMe && (
                                        <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold px-1.5 py-0.5 rounded">
                                            NUEVO
                                        </span>
                                    )}
                                    <span className="text-xs text-slate-400 dark:text-slate-500">{formatDate(msg.date)}</span>
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-4">
                                    <div
                                        className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 [&_a]:text-indigo-600 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:text-slate-500"
                                        style={{ fontSize: '13px', lineHeight: '1.6' }}
                                        dangerouslySetInnerHTML={{ __html: msg.bodyHtml }}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Reply section */}
            <div className="mt-4 space-y-3">
                {!showReply ? (
                    <button
                        onClick={() => setShowReply(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-indigo-300 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-xl text-sm font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                    >
                        <Reply className="w-4 h-4" />
                        Responder a este hilo
                    </button>
                ) : (
                    <>
                        <ReplyEditor
                            thread={thread}
                            onSent={handleReplySent}
                            onToast={onToast}
                            savedTemplates={savedTemplates}
                        />
                        <button
                            onClick={() => setShowReply(false)}
                            className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        >
                            Cancelar
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

// ─── Main InboxView Component ─────────────────────────────────────────────────

export const InboxView: React.FC<InboxViewProps> = ({ campaigns, onToast, savedTemplates = [] }) => {
    const [threads, setThreads] = useState<ParsedThread[]>([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<ParsedThread | null>(null);
    const [search, setSearch] = useState('');
    const [authorizingGmail, setAuthorizingGmail] = useState(false);
    const [hasToken, setHasToken] = useState(hasGmailToken());
    const [gmailEmail, setGmailEmail] = useState(sessionStorage.getItem('gmail_user_email') || '');
    const [filter, setFilter] = useState<'all' | 'unread' | 'archived'>('all');
    const [archivedIds, setArchivedIds] = useState<Set<string>>(getArchivedIds);

    // Collect all unique emails from campaign logs
    const contactEmails = React.useMemo(() => {
        const emails = new Set<string>();
        campaigns.forEach(c => c.logs?.forEach(l => {
            if (l.recipientEmail) emails.add(l.recipientEmail);
        }));
        return Array.from(emails);
    }, [campaigns]);

    const loadInbox = useCallback(async () => {
        if (!hasGmailToken()) { setHasToken(false); return; }
        setLoading(true);
        try {
            if (!gmailEmail) {
                const profile = await fetchGmailProfile();
                setGmailEmail(profile.email);
            }
            const result = await fetchInboxThreads(contactEmails, 30);
            setThreads(result);
        } catch (err: any) {
            if (err.message?.includes('expirada') || err.message?.includes('expirado')) {
                setHasToken(false);
            }
            onToast(err.message || 'Error al cargar la bandeja de entrada.', 'error');
        } finally {
            setLoading(false);
        }
    }, [contactEmails, gmailEmail, onToast]);

    useEffect(() => {
        if (hasToken && hasGmailToken()) {
            loadInbox();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasToken]);

    const handleAuthorize = async () => {
        setAuthorizingGmail(true);
        try {
            await reauthorizeWithGoogle();
            setHasToken(true);
            const profile = await fetchGmailProfile();
            setGmailEmail(profile.email);
        } catch (err: any) {
            if (err.code !== 'auth/popup-closed-by-user') {
                onToast(`Error al autorizar Gmail: ${err.message}`, 'error');
            }
        } finally {
            setAuthorizingGmail(false);
        }
    };

    const openThread = async (thread: ParsedThread) => {
        setSelected(thread);
        if (thread.hasUnread) {
            try {
                await markThreadAsRead(thread.threadId);
                setThreads(prev => prev.map(t =>
                    t.threadId === thread.threadId ? { ...t, hasUnread: false } : t
                ));
            } catch { /* no-op */ }
        }
    };

    const handleArchive = (threadId: string) => {
        setArchivedIds(prev => {
            const next = new Set(prev);
            if (next.has(threadId)) {
                next.delete(threadId);
                onToast('Hilo restaurado a la bandeja.', 'info');
            } else {
                next.add(threadId);
                onToast('Hilo archivado. Ya no aparece en la bandeja principal.', 'info');
            }
            saveArchivedIds(next);
            return next;
        });
        setSelected(null);
    };

    const handleReplySent = () => { loadInbox(); };

    const filteredThreads = threads.filter(t => {
        const isArchived = archivedIds.has(t.threadId);
        if (filter === 'archived') return isArchived;
        if (isArchived) return false; // hide archived from 'all' and 'unread'
        const matchesSearch =
            !search ||
            t.subject.toLowerCase().includes(search.toLowerCase()) ||
            t.latestFrom.toLowerCase().includes(search.toLowerCase()) ||
            t.snippet.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'all' || (filter === 'unread' && t.hasUnread);
        return matchesSearch && matchesFilter;
    });

    const unreadCount = threads.filter(t => t.hasUnread && !archivedIds.has(t.threadId)).length;
    const archivedCount = threads.filter(t => archivedIds.has(t.threadId)).length;

    // ── No token screen ──
    if (!hasToken) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center shadow-inner">
                    <ShieldAlert className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Autorización requerida</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-sm">
                        Para leer tu bandeja de entrada necesitas autorizar el acceso a Gmail.
                    </p>
                </div>
                <button
                    onClick={handleAuthorize}
                    disabled={authorizingGmail}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all shadow-sm"
                >
                    {authorizingGmail
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Autorizando...</>
                        : <><ShieldAlert className="w-4 h-4" /> Autorizar Gmail</>
                    }
                </button>
            </div>
        );
    }

    // ── Main layout ──
    return (
        <div className="flex gap-6 h-[calc(100vh-10rem)]">

            {/* ── Thread List pane ───────────────────────────────────────────────── */}
            <div className={`flex flex-col gap-3 ${selected ? 'hidden lg:flex lg:w-72 xl:w-80 flex-shrink-0' : 'w-full'}`}>

                {/* Controls */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar..."
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
                        />
                    </div>
                    <button
                        onClick={loadInbox}
                        disabled={loading}
                        className="p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-50 dark:hover:bg-dark-700 transition-colors disabled:opacity-50"
                        title="Actualizar"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Filter tabs */}
                <div className="flex bg-slate-100 dark:bg-dark-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 gap-0.5">
                    {(['all', 'unread', 'archived'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${filter === f
                                ? 'bg-white dark:bg-dark-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                        >
                            {f === 'all' && `Todos (${threads.filter(t => !archivedIds.has(t.threadId)).length})`}
                            {f === 'unread' && `No leídos (${unreadCount})`}
                            {f === 'archived' && (
                                <span className="flex items-center justify-center gap-1">
                                    <Archive className="w-3 h-3" />
                                    ({archivedCount})
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Thread list */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {loading && threads.length === 0 && (
                        <div className="flex items-center justify-center py-16">
                            <div className="text-center">
                                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
                                <p className="text-sm text-slate-500 dark:text-slate-400">Cargando bandeja de entrada...</p>
                            </div>
                        </div>
                    )}
                    {!loading && filteredThreads.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
                                {filter === 'archived' ? <Archive className="w-6 h-6 text-slate-400" /> : <Inbox className="w-6 h-6 text-slate-400" />}
                            </div>
                            <div>
                                <p className="font-semibold text-slate-700 dark:text-slate-300">
                                    {filter === 'archived' ? 'Sin hilos archivados' : 'Sin respuestas'}
                                </p>
                                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                                    {contactEmails.length === 0
                                        ? 'Aún no has enviado correos desde la app.'
                                        : filter === 'archived'
                                            ? 'Archiva hilos para limpiar tu bandeja.'
                                            : 'No se encontraron respuestas de tus contactos.'}
                                </p>
                            </div>
                        </div>
                    )}
                    {filteredThreads.map(thread => {
                        const isArchived = archivedIds.has(thread.threadId);
                        return (
                            <button
                                key={thread.threadId}
                                onClick={() => openThread(thread)}
                                className={`w-full text-left p-3 rounded-xl border transition-all ${selected?.threadId === thread.threadId
                                    ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30'
                                    : thread.hasUnread && !isArchived
                                        ? 'border-slate-300 dark:border-slate-600 bg-white dark:bg-dark-800 shadow-sm'
                                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-800 hover:border-slate-300 dark:hover:border-slate-600'
                                } ${isArchived ? 'opacity-60' : ''}`}
                            >
                                <div className="flex items-start gap-2.5">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isArchived ? 'bg-slate-200 dark:bg-slate-700 text-slate-500' : thread.hasUnread
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                    }`}>
                                        {isArchived
                                            ? <Archive className="w-3.5 h-3.5" />
                                            : (extractDisplayName(thread.latestFrom).charAt(0).toUpperCase() || <User className="w-4 h-4" />)
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={`text-sm truncate ${thread.hasUnread && !isArchived ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                                                {extractDisplayName(thread.latestFrom) || extractEmail(thread.latestFrom)}
                                            </p>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                {thread.hasUnread && !isArchived && (
                                                    <span className="w-2 h-2 bg-indigo-600 rounded-full" />
                                                )}
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                                    {formatDate(thread.latestDate)}
                                                </span>
                                            </div>
                                        </div>
                                        <p className={`text-xs truncate mt-0.5 ${thread.hasUnread && !isArchived ? 'font-semibold text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
                                            {thread.subject}
                                        </p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                            {thread.snippet}
                                        </p>
                                        {thread.messageCount > 1 && (
                                            <div className="flex items-center gap-1 mt-1">
                                                <MessageSquare className="w-3 h-3 text-slate-400" />
                                                <span className="text-[10px] text-slate-400">{thread.messageCount} mensajes</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Gmail account badge */}
                {gmailEmail && (
                    <div className="flex items-center gap-2 py-2 px-3 bg-slate-50 dark:bg-dark-900 rounded-lg border border-slate-200 dark:border-slate-800">
                        <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{gmailEmail}</span>
                    </div>
                )}
            </div>

            {/* ── Thread Detail pane ─────────────────────────────────────────────── */}
            {selected && (
                <div className="flex-1 min-w-0 overflow-y-auto">
                    <ThreadDetail
                        thread={selected}
                        onBack={() => setSelected(null)}
                        onToast={onToast}
                        onReplySent={handleReplySent}
                        onArchive={handleArchive}
                        savedTemplates={savedTemplates}
                    />
                </div>
            )}

            {/* ── Empty right pane ─────────────────────────────────────────────── */}
            {!selected && threads.length > 0 && (
                <div className="hidden lg:flex flex-1 items-center justify-center text-center">
                    <div>
                        <MailOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Selecciona un hilo para leerlo</p>
                    </div>
                </div>
            )}
        </div>
    );
};
