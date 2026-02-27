import React, { useEffect, useRef, useMemo } from 'react';
import { Official, Gender, Campaign } from '../types';
import {
  X, Edit2, Trash2, Mail, Briefcase, Building2, Crown,
  UserCheck, Users, Clock, Send, ChevronRight, BadgeCheck,
  UserCircle2, ExternalLink, Calendar, ShieldCheck
} from 'lucide-react';

interface OfficialDrawerProps {
  official: Official | null;
  allOfficials: Official[];
  campaigns: Campaign[];
  onClose: () => void;
  onEdit?: (official: Official) => void;
  onDelete?: (id: string) => void;
  /** Jump to another official's drawer */
  onViewOfficial: (official: Official) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const avatarColors: Record<string, string> = {
  [Gender.Female]: 'bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300',
  [Gender.Male]:   'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300',
  [Gender.Unspecified]: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
};

const accentBar: Record<string, string> = {
  [Gender.Female]: 'from-pink-500 to-rose-400',
  [Gender.Male]:   'from-indigo-500 to-violet-400',
  [Gender.Unspecified]: 'from-slate-400 to-slate-500',
};

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  if (mins  < 60)  return `hace ${mins} min`;
  if (hours < 24)  return `hace ${hours}h`;
  if (days  < 7)   return `hace ${days} días`;
  if (weeks < 5)   return `hace ${weeks} sem.`;
  return `hace ${months} mes${months !== 1 ? 'es' : ''}`;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar: React.FC<{ official: Official; size?: 'sm' | 'lg' }> = ({ official, size = 'lg' }) => {
  const cls = avatarColors[official.gender] ?? avatarColors[Gender.Unspecified];
  const dim = size === 'lg' ? 'w-16 h-16 text-2xl' : 'w-8 h-8 text-sm';

  return (
    <div className={`${dim} ${cls} rounded-full flex items-center justify-center font-bold shrink-0 shadow-md ring-2 ring-white dark:ring-dark-800`}>
      {official.profileImage ? (
        <img src={official.profileImage} alt={official.name}
          className="w-full h-full rounded-full object-cover" />
      ) : (
        official.name.charAt(0).toUpperCase()
      )}
    </div>
  );
};

// ─── Stat Pill ────────────────────────────────────────────────────────────────
const Pill: React.FC<{ label: string; value: string | number; accent?: string }> = ({ label, value, accent = 'text-indigo-600 dark:text-indigo-400' }) => (
  <div className="flex flex-col items-center bg-slate-50 dark:bg-dark-900/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 min-w-[80px]">
    <span className={`text-2xl font-extrabold ${accent}`}>{value}</span>
    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5 text-center">{label}</span>
  </div>
);

// ─── Mini Official Card (for boss / direct reports) ───────────────────────────
const MiniCard: React.FC<{
  official: Official;
  label: string;
  onClick: () => void;
}> = ({ official, label, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-dark-900/50 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all group text-left"
  >
    <Avatar official={official} size="sm" />
    <div className="min-w-0 flex-1">
      <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-semibold tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{official.name}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{official.position}</p>
    </div>
    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0" />
  </button>
);

// ─── Main Drawer ──────────────────────────────────────────────────────────────
export const OfficialDrawer: React.FC<OfficialDrawerProps> = ({
  official, allOfficials, campaigns, onClose, onEdit, onDelete, onViewOfficial
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Trap focus inside panel
  useEffect(() => {
    if (official) panelRef.current?.focus();
  }, [official]);

  // ── Derived data ────────────────────────────────────────────────────────────
  const bossOfficial = useMemo(() => {
    if (!official?.bossName) return null;
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    return allOfficials.find(o => norm(o.name) === norm(official.bossName)) ?? null;
  }, [official, allOfficials]);

  const directReports = useMemo(() => {
    if (!official) return [];
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    return allOfficials.filter(o =>
      o.id !== official.id &&
      o.bossName &&
      norm(o.bossName) === norm(official.name)
    );
  }, [official, allOfficials]);

  // Last campaign interaction
  const lastInteraction = useMemo(() => {
    if (!official) return null;
    let latest: number | null = null;
    let campaignName = '';
    for (const camp of campaigns) {
      for (const log of camp.logs ?? []) {
        if (log.officialId === official.id && (latest === null || log.sentAt > latest)) {
          latest = log.sentAt;
          campaignName = camp.name;
        }
      }
    }
    return latest ? { sentAt: latest, campaignName } : null;
  }, [official, campaigns]);

  const totalEmailsSent = useMemo(() => {
    if (!official) return 0;
    return campaigns.reduce((acc, camp) =>
      acc + (camp.logs ?? []).filter(l => l.officialId === official.id).length, 0
    );
  }, [official, campaigns]);

  const isOpen = official !== null;

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* ── Drawer Panel ── */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={official ? `Perfil de ${official.name}` : 'Panel de perfil'}
        className={`
          fixed top-0 right-0 h-full z-50 w-full max-w-md
          bg-white dark:bg-dark-800
          border-l border-slate-200 dark:border-slate-700
          shadow-2xl outline-none
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {official && (
          <>
            {/* ── Header gradient bar ── */}
            <div className={`h-1.5 w-full bg-gradient-to-r ${accentBar[official.gender] ?? accentBar[Gender.Unspecified]} shrink-0`} />

            {/* ── Top action row ── */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Perfil Funcionario
              </span>
              <div className="flex items-center gap-1">
                {onEdit && (
                  <button
                    onClick={() => { onClose(); onEdit(official); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Editar
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => { onClose(); onDelete(official.id); }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                    title="Eliminar funcionario"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-700 rounded-lg transition-colors ml-1"
                  title="Cerrar (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto overscroll-contain">

              {/* ── Identity block ── */}
              <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-700/60">
                <div className="flex items-start gap-4">
                  <Avatar official={official} size="lg" />
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                        {official.title} {official.name}
                      </h2>
                      {official.isBoss && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 rounded-full text-[10px] font-bold text-amber-700 dark:text-amber-300">
                          <Crown className="w-3 h-3 fill-amber-500 text-amber-500" />
                          Jefatura
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{official.position || '—'}</span>
                    </p>
                    {official.department && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{official.department}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <a
                  href={`mailto:${official.email}`}
                  className="mt-4 flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-dark-900/50 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-all group"
                >
                  <Mail className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 group-hover:underline truncate">
                    {official.email || 'Sin correo'}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 ml-auto shrink-0 transition-colors" />
                </a>
              </div>

              {/* ── Stats row ── */}
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/60">
                <div className="flex gap-3 flex-wrap">
                  <Pill label="Correos enviados" value={totalEmailsSent} />
                  <Pill label="Supervisa" value={directReports.length} accent="text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>

              {/* ── Details ── */}
              <div className="px-5 py-4 space-y-3 border-b border-slate-100 dark:border-slate-700/60">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Información
                </h3>

                {official.stament && (
                  <div className="flex items-center gap-2 text-sm">
                    <BadgeCheck className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-slate-500 dark:text-slate-400 w-24 shrink-0">Estamento</span>
                    <span className="font-medium text-slate-800 dark:text-slate-100">{official.stament}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400 w-24 shrink-0">Género</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {official.gender === Gender.Male ? 'Masculino' :
                     official.gender === Gender.Female ? 'Femenino' : 'No especificado'}
                  </span>
                </div>
              </div>

              {/* ── Jerarquía: quién le reporta ── */}
              {official.bossName && (
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/60">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    Reporta a
                  </h3>
                  {bossOfficial ? (
                    <MiniCard
                      official={bossOfficial}
                      label="Jefatura directa"
                      onClick={() => onViewOfficial(bossOfficial)}
                    />
                  ) : (
                    /* Boss exists in data but not registered as official */
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-dark-900/50 border border-slate-200 dark:border-slate-700">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                        <UserCircle2 className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Jefatura directa</p>
                        <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{official.bossName}</p>
                        {official.bossPosition && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{official.bossPosition}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Personas que supervisa ── */}
              {directReports.length > 0 && (
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/60">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Equipo a cargo
                    <span className="ml-auto bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {directReports.length}
                    </span>
                  </h3>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {directReports.map(r => (
                      <MiniCard
                        key={r.id}
                        official={r}
                        label={r.department || r.position}
                        onClick={() => onViewOfficial(r)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Última interacción de campaña ── */}
              <div className="px-5 py-4">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Actividad de campañas
                </h3>

                {lastInteraction ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-dark-900/50 border border-slate-200 dark:border-slate-700">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                        <Send className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" />
                          Último correo enviado
                        </p>
                        <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5 truncate">
                          {lastInteraction.campaignName}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {formatDate(lastInteraction.sentAt)}
                          {' · '}
                          <span className="font-medium text-indigo-500 dark:text-indigo-400">
                            {timeAgo(lastInteraction.sentAt)}
                          </span>
                        </p>
                      </div>
                    </div>
                    {totalEmailsSent > 1 && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
                        y {totalEmailsSent - 1} correo{totalEmailsSent > 2 ? 's' : ''} más en el historial
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-dark-900/50 border border-slate-200 dark:border-slate-700 border-dashed">
                    <Send className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                    <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                      Sin interacciones de campaña aún
                    </p>
                  </div>
                )}
              </div>

            </div>
            {/* ── End scrollable body ── */}
          </>
        )}
      </div>
    </>
  );
};
