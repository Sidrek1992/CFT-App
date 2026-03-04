import React, { useState, useEffect, useMemo } from 'react';
import { Official, Gender, buildFullName } from '../types';
import { detectGenderAndTitle } from '../services/geminiService';
import { Sparkles, User, Mail, Briefcase, Save, X, Building2, Crown, Eraser, BadgeCheck, UserCheck, AlertTriangle, Eye, CalendarDays, Phone, MapPin, FileText, GraduationCap, Heart, Users, Car } from 'lucide-react';
import { Combobox } from './Combobox';

interface OfficialFormProps {
  initialData?: Official | null;
  existingOfficials: Official[];
  onSave: (official: Omit<Official, 'id'>) => void;
  onCancel: () => void;
  onViewProfile?: (official: Official) => void;
}

const normalizeStr = (s: string) =>
  s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

type MatchReason = 'name' | 'email';
interface DuplicateMatch {
  official: Official;
  reasons: MatchReason[];
}

const ESTADO_CIVIL_OPTIONS = ['Soltero/a', 'Casado/a', 'Conviviente Civil', 'Divorciado/a', 'Viudo/a', 'Separado/a'];
const TIPO_CONTRATO_OPTIONS = ['Planta', 'Contrata', 'Honorarios', 'Reemplazante', 'FEES'];

export const OfficialForm: React.FC<OfficialFormProps> = ({ initialData, existingOfficials, onSave, onCancel, onViewProfile }) => {
  // ── Nombre desglosado ─────────────────────────────────────────────────────
  const [primerNombre, setPrimerNombre] = useState('');
  const [segundoNombre, setSegundoNombre] = useState('');
  const [tercerNombre, setTercerNombre] = useState('');
  const [primerApellido, setPrimerApellido] = useState('');
  const [segundoApellido, setSegundoApellido] = useState('');

  // ── Datos de contacto ────────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');

  // ── Datos personales ─────────────────────────────────────────────────────
  const [gender, setGender] = useState<Gender>(Gender.Unspecified);
  const [title, setTitle] = useState('Sr./Sra.');
  const [estadoCivil, setEstadoCivil] = useState('');
  const [hijos, setHijos] = useState('');

  // ── Datos laborales ──────────────────────────────────────────────────────
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [stament, setStament] = useState('');
  const [tipoContrato, setTipoContrato] = useState('');
  const [profesion, setProfesion] = useState('');
  const [postGrado, setPostGrado] = useState('');
  const [isBoss, setIsBoss] = useState(false);
  const [bossName, setBossName] = useState('');
  const [bossPosition, setBossPosition] = useState('');
  const [bossEmail, setBossEmail] = useState('');

  // ── Fechas ────────────────────────────────────────────────────────────────
  const [fechaIngreso, setFechaIngreso] = useState('');
  const [fechaTermino, setFechaTermino] = useState('');
  const [fechaCumpleanios, setFechaCumpleanios] = useState('');

  // ── Otros ────────────────────────────────────────────────────────────────
  const [contactoEmergencia, setContactoEmergencia] = useState('');
  const [direccion, setDireccion] = useState('');
  const [tieneVehiculo, setTieneVehiculo] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // ── nombre completo derivado ──────────────────────────────────────────────
  const fullName = [primerNombre, segundoNombre, tercerNombre, primerApellido, segundoApellido]
    .filter(Boolean).join(' ').trim();

  // ── Helpers para cargar datos ─────────────────────────────────────────────
  const loadFromOfficial = (data: Official) => {
    // Nombre: si tiene campos desglosados los usamos; si no, intentamos parsear 'name'
    if (data.primerNombre || data.primerApellido) {
      setPrimerNombre(data.primerNombre || '');
      setSegundoNombre(data.segundoNombre || '');
      setTercerNombre(data.tercerNombre || '');
      setPrimerApellido(data.primerApellido || '');
      setSegundoApellido(data.segundoApellido || '');
    } else if (data.name) {
      // Retrocompatibilidad: parsear nombre completo
      const parts = data.name.trim().split(/\s+/);
      // Heurística: últimas 2 partes son apellidos, primeras son nombres
      if (parts.length >= 4) {
        setPrimerNombre(parts[0]);
        setSegundoNombre(parts.slice(1, parts.length - 2).join(' '));
        setTercerNombre('');
        setPrimerApellido(parts[parts.length - 2]);
        setSegundoApellido(parts[parts.length - 1]);
      } else if (parts.length === 3) {
        setPrimerNombre(parts[0]);
        setSegundoNombre('');
        setTercerNombre('');
        setPrimerApellido(parts[1]);
        setSegundoApellido(parts[2]);
      } else if (parts.length === 2) {
        setPrimerNombre(parts[0]);
        setSegundoNombre('');
        setTercerNombre('');
        setPrimerApellido(parts[1]);
        setSegundoApellido('');
      } else {
        setPrimerNombre(data.name);
        setSegundoNombre(''); setTercerNombre(''); setPrimerApellido(''); setSegundoApellido('');
      }
    }

    setEmail(data.email);
    setTelefono(data.telefono || '');
    setGender(data.gender);
    setTitle(data.title);
    setEstadoCivil(data.estadoCivil || '');
    setHijos(data.hijos !== undefined ? String(data.hijos) : '');
    setDepartment(data.department || '');
    setPosition(data.position);
    setStament(data.stament || '');
    setTipoContrato(data.tipoContrato || '');
    setProfesion(data.profesion || '');
    setPostGrado(data.postGrado || '');
    setIsBoss(data.isBoss || false);
    setBossName(data.bossName);
    setBossPosition(data.bossPosition);
    setBossEmail(data.bossEmail);
    setFechaIngreso(data.fechaIngreso || '');
    setFechaTermino(data.fechaTermino || '');
    setFechaCumpleanios(data.fechaCumpleanios || '');
    setContactoEmergencia(data.contactoEmergencia || '');
    setDireccion(data.direccion || '');
    setTieneVehiculo(data.tieneVehiculo || false);
  };

  const loadFromDraft = (parsed: any) => {
    setPrimerNombre(parsed.primerNombre || '');
    setSegundoNombre(parsed.segundoNombre || '');
    setTercerNombre(parsed.tercerNombre || '');
    setPrimerApellido(parsed.primerApellido || '');
    setSegundoApellido(parsed.segundoApellido || '');
    setEmail(parsed.email || '');
    setTelefono(parsed.telefono || '');
    setGender(parsed.gender || Gender.Unspecified);
    setTitle(parsed.title || 'Sr./Sra.');
    setEstadoCivil(parsed.estadoCivil || '');
    setHijos(parsed.hijos !== undefined ? String(parsed.hijos) : '');
    setDepartment(parsed.department || '');
    setPosition(parsed.position || '');
    setStament(parsed.stament || '');
    setTipoContrato(parsed.tipoContrato || '');
    setProfesion(parsed.profesion || '');
    setPostGrado(parsed.postGrado || '');
    setIsBoss(parsed.isBoss || false);
    setBossName(parsed.bossName || '');
    setBossPosition(parsed.bossPosition || '');
    setBossEmail(parsed.bossEmail || '');
    setFechaIngreso(parsed.fechaIngreso || '');
    setFechaTermino(parsed.fechaTermino || '');
    setFechaCumpleanios(parsed.fechaCumpleanios || '');
    setContactoEmergencia(parsed.contactoEmergencia || '');
    setDireccion(parsed.direccion || '');
    setTieneVehiculo(parsed.tieneVehiculo || false);
  };

  useEffect(() => {
    if (initialData) {
      loadFromOfficial(initialData);
    } else {
      const draft = localStorage.getItem('officialFormDraft');
      if (draft) {
        try { loadFromDraft(JSON.parse(draft)); } catch { /* ignore corrupt drafts */ }
      }
    }
  }, [initialData]);

  // ── Auto-save draft ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!initialData) {
      const draft = {
        primerNombre, segundoNombre, tercerNombre, primerApellido, segundoApellido,
        email, telefono, gender, title, estadoCivil, hijos,
        department, position, stament, tipoContrato, profesion, postGrado,
        isBoss, bossName, bossPosition, bossEmail,
        fechaIngreso, fechaTermino, fechaCumpleanios,
        contactoEmergencia, direccion, tieneVehiculo,
      };
      localStorage.setItem('officialFormDraft', JSON.stringify(draft));
    }
  }, [
    primerNombre, segundoNombre, tercerNombre, primerApellido, segundoApellido,
    email, telefono, gender, title, estadoCivil, hijos,
    department, position, stament, tipoContrato, profesion, postGrado,
    isBoss, bossName, bossPosition, bossEmail,
    fechaIngreso, fechaTermino, fechaCumpleanios,
    contactoEmergencia, direccion, tieneVehiculo, initialData,
  ]);

  // ── Autocomplete listas ───────────────────────────────────────────────────
  const registeredBosses = useMemo(() => existingOfficials.filter(o => o.isBoss), [existingOfficials]);
  const uniqueDepartments = useMemo(() => [...new Set(existingOfficials.map(o => o.department).filter(Boolean))].sort(), [existingOfficials]);
  const uniqueStaments = useMemo(() => [...new Set(existingOfficials.map(o => o.stament).filter(Boolean))].sort(), [existingOfficials]);
  const uniqueProfesiones = useMemo(() => [...new Set(existingOfficials.map(o => o.profesion).filter(Boolean))].sort(), [existingOfficials]);
  const uniquePostGrados = useMemo(() => [...new Set(existingOfficials.map(o => o.postGrado).filter(Boolean))].sort(), [existingOfficials]);
  const uniqueBossNames = useMemo(() => {
    const h = existingOfficials.map(o => o.bossName).filter(Boolean);
    const a = registeredBosses.map(o => o.name);
    return [...new Set([...h, ...a])].filter(n => n?.trim().length > 0).sort();
  }, [existingOfficials, registeredBosses]);
  const uniqueBossPositions = useMemo(() => {
    const h = existingOfficials.map(o => o.bossPosition).filter(Boolean);
    const a = registeredBosses.map(o => o.position);
    return [...new Set([...h, ...a])].filter(p => p?.trim().length > 0).sort();
  }, [existingOfficials, registeredBosses]);
  const uniqueBossEmails = useMemo(() => {
    const h = existingOfficials.map(o => o.bossEmail).filter(Boolean);
    const a = registeredBosses.map(o => o.email);
    return [...new Set([...h, ...a])].filter(e => e?.trim().length > 0).sort();
  }, [existingOfficials, registeredBosses]);

  // ── Detección de duplicados ───────────────────────────────────────────────
  const duplicateMatch = useMemo<DuplicateMatch | null>(() => {
    const normEmail = normalizeStr(email);
    const normFull = normalizeStr(fullName);
    const nameReady = normFull.length >= 3;
    const emailReady = normEmail.includes('@') && normEmail.length > 5;
    if (!nameReady && !emailReady) return null;

    for (const o of existingOfficials) {
      if (initialData && o.id === initialData.id) continue;
      const reasons: MatchReason[] = [];
      const oFullNorm = normalizeStr(buildFullName(o));
      if (nameReady && oFullNorm === normFull) reasons.push('name');
      if (emailReady && normalizeStr(o.email) === normEmail) reasons.push('email');
      if (reasons.length > 0) return { official: o, reasons };
    }
    return null;
  }, [fullName, email, existingOfficials, initialData]);

  const [dismissedDuplicateId, setDismissedDuplicateId] = useState<string | null>(null);
  useEffect(() => {
    if (duplicateMatch?.official.id !== dismissedDuplicateId) setDismissedDuplicateId(null);
  }, [duplicateMatch?.official.id]);
  const showDuplicateAlert = duplicateMatch !== null && duplicateMatch.official.id !== dismissedDuplicateId;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleAnalyzeName = async () => {
    if (!fullName) return;
    setIsAnalyzing(true);
    const result = await detectGenderAndTitle(fullName);
    setGender(result.gender);
    setTitle(result.title);
    setIsAnalyzing(false);
  };

  const handleBossNameChange = (val: string) => {
    setBossName(val);
    const registeredMatch = registeredBosses.find(b => b.name.toLowerCase() === val.toLowerCase());
    if (registeredMatch) { setBossPosition(registeredMatch.position); setBossEmail(registeredMatch.email); return; }
    const historicMatch = existingOfficials.find(o => o.bossName.toLowerCase() === val.toLowerCase());
    if (historicMatch) {
      if (!bossPosition && historicMatch.bossPosition) setBossPosition(historicMatch.bossPosition);
      if (!bossEmail && historicMatch.bossEmail) setBossEmail(historicMatch.bossEmail);
    }
  };

  const handleClearDraft = () => {
    if (window.confirm('¿Estás seguro de que quieres limpiar el formulario?')) {
      setPrimerNombre(''); setSegundoNombre(''); setTercerNombre(''); setPrimerApellido(''); setSegundoApellido('');
      setEmail(''); setTelefono(''); setGender(Gender.Unspecified); setTitle('Sr./Sra.');
      setEstadoCivil(''); setHijos('');
      setDepartment(''); setPosition(''); setStament(''); setTipoContrato(''); setProfesion(''); setPostGrado('');
      setIsBoss(false); setBossName(''); setBossPosition(''); setBossEmail('');
      setFechaIngreso(''); setFechaTermino(''); setFechaCumpleanios('');
      setContactoEmergencia(''); setDireccion(''); setTieneVehiculo(false);
      localStorage.removeItem('officialFormDraft');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const computed = fullName || primerNombre;
    onSave({
      name: computed,
      primerNombre: primerNombre || undefined,
      segundoNombre: segundoNombre || undefined,
      tercerNombre: tercerNombre || undefined,
      primerApellido: primerApellido || undefined,
      segundoApellido: segundoApellido || undefined,
      email,
      telefono: telefono || undefined,
      gender,
      title,
      estadoCivil: estadoCivil || undefined,
      hijos: hijos !== '' ? Number(hijos) : undefined,
      department,
      position,
      stament: stament || undefined,
      tipoContrato: tipoContrato || undefined,
      profesion: profesion || undefined,
      postGrado: postGrado || undefined,
      isBoss,
      bossName,
      bossPosition,
      bossEmail,
      fechaIngreso: fechaIngreso || undefined,
      fechaTermino: fechaTermino || undefined,
      fechaCumpleanios: fechaCumpleanios || undefined,
      contactoEmergencia: contactoEmergencia || undefined,
      direccion: direccion || undefined,
      tieneVehiculo,
    });
    if (!initialData) localStorage.removeItem('officialFormDraft');
  };

  const inputCls = 'w-full px-4 py-2 bg-white dark:bg-dark-900 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all';
  const inputSmCls = 'w-full px-3 py-1.5 bg-white dark:bg-dark-900 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm';
  const inputWithIconCls = 'pl-10 ' + inputCls;
  const labelCls = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';
  const labelSmCls = 'block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1';
  const sectionCls = 'bg-slate-50 dark:bg-dark-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700';
  const sectionTitle = 'text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2';

  const hasDraft = !initialData && (primerNombre || email);

  return (
    <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
            {initialData ? 'Editar Funcionario' : 'Nuevo Funcionario'}
          </h3>
          {hasDraft && (
            <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium">
              Borrador detectado
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {hasDraft && (
            <button onClick={handleClearDraft} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors" title="Limpiar formulario">
              <Eraser className="w-5 h-5" />
            </button>
          )}
          <button onClick={onCancel} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Duplicate Alert */}
      {showDuplicateAlert && duplicateMatch && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/60 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Este funcionario ya parece existir</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              <span className="font-medium">{duplicateMatch.official.name}</span>
              {' '}({duplicateMatch.official.position || duplicateMatch.official.email})
              {' · '}
              {duplicateMatch.reasons.map(r => r === 'name' ? 'nombre coincide' : 'correo coincide').join(' y ')}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onViewProfile && (
              <button type="button" onClick={() => onViewProfile(duplicateMatch.official)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-200 dark:hover:bg-amber-800/60 rounded-lg transition-colors">
                <Eye className="w-3.5 h-3.5" /> Ver perfil
              </button>
            )}
            <button type="button" onClick={() => setDismissedDuplicateId(duplicateMatch.official.id)} className="p-1.5 text-amber-400 hover:text-amber-600 dark:hover:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors" title="Ignorar">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Sección: Nombre ───────────────────────────────────────────── */}
        <div className={sectionCls}>
          <div className="flex items-center justify-between mb-3">
            <h4 className={sectionTitle}>
              <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              Nombre Completo
              {fullName && <span className="ml-2 text-xs font-normal text-indigo-500 dark:text-indigo-400">→ {fullName}</span>}
            </h4>
            <button
              type="button"
              onClick={handleAnalyzeName}
              disabled={!fullName || isAnalyzing}
              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 flex items-center gap-1.5 transition-colors font-medium text-xs disabled:opacity-50"
              title="Detectar género con IA"
            >
              {isAnalyzing ? <span className="animate-spin">✦</span> : <Sparkles className="w-3.5 h-3.5" />}
              IA Detect
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className={labelSmCls}>1er Nombre <span className="text-red-400">*</span></label>
              <input required type="text" value={primerNombre} onChange={e => setPrimerNombre(e.target.value)} className={inputSmCls} placeholder="Ej. Juan" />
            </div>
            <div>
              <label className={labelSmCls}>2do Nombre</label>
              <input type="text" value={segundoNombre} onChange={e => setSegundoNombre(e.target.value)} className={inputSmCls} placeholder="Ej. Carlos" />
            </div>
            <div>
              <label className={labelSmCls}>3er Nombre</label>
              <input type="text" value={tercerNombre} onChange={e => setTercerNombre(e.target.value)} className={inputSmCls} placeholder="Ej. Andrés" />
            </div>
            <div>
              <label className={labelSmCls}>1er Apellido <span className="text-red-400">*</span></label>
              <input required type="text" value={primerApellido} onChange={e => setPrimerApellido(e.target.value)} className={inputSmCls} placeholder="Ej. Pérez" />
            </div>
            <div>
              <label className={labelSmCls}>2do Apellido</label>
              <input type="text" value={segundoApellido} onChange={e => setSegundoApellido(e.target.value)} className={inputSmCls} placeholder="Ej. González" />
            </div>
          </div>
        </div>

        {/* ── Sección: Datos Personales ─────────────────────────────────── */}
        <div className={sectionCls}>
          <h4 className={sectionTitle}>
            <Heart className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            Datos Personales
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>
              <label className={labelCls}>Género</label>
              <select value={gender} onChange={e => setGender(e.target.value as Gender)} className={inputCls}>
                <option value={Gender.Unspecified}>No especificado</option>
                <option value={Gender.Male}>Masculino</option>
                <option value={Gender.Female}>Femenino</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Título</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputCls} placeholder="Ej. Sr." />
            </div>

            <div>
              <label className={labelCls}>Estado Civil</label>
              <Combobox id="estadocivil-combo" value={estadoCivil} onChange={setEstadoCivil} options={ESTADO_CIVIL_OPTIONS} placeholder="Ej. Casado/a" />
            </div>

            <div>
              <label className={labelCls}>N° de Hijos</label>
              <input type="number" min="0" max="30" value={hijos} onChange={e => setHijos(e.target.value)} className={inputCls} placeholder="0" />
            </div>

            <div>
              <label className={labelCls}>Correo Electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                </div>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputWithIconCls} placeholder="juan@empresa.com" />
              </div>
            </div>

            <div>
              <label className={labelCls}>Teléfono</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                </div>
                <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} className={inputWithIconCls} placeholder="+56 9 1234 5678" />
              </div>
            </div>

          </div>
        </div>

        {/* ── Sección: Datos Laborales ──────────────────────────────────── */}
        <div className={sectionCls}>
          <h4 className={sectionTitle}>
            <Briefcase className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            Datos Laborales
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>
              <label className={labelCls}>Departamento</label>
              <Combobox id="dept-combo" value={department} onChange={setDepartment} options={uniqueDepartments} placeholder="Seleccionar o escribir..." icon={<Building2 className="h-4 w-4 text-slate-400 dark:text-slate-500" />} />
            </div>

            <div>
              <label className={labelCls}>Cargo <span className="text-red-400">*</span></label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Briefcase className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                </div>
                <input required type="text" value={position} onChange={e => setPosition(e.target.value)} className={inputWithIconCls} placeholder="Ej. Analista" />
              </div>
            </div>

            <div>
              <label className={labelCls}>Estamento</label>
              <Combobox id="stament-combo" value={stament} onChange={setStament} options={uniqueStaments} placeholder="Ej. Profesional" icon={<BadgeCheck className="h-4 w-4 text-slate-400 dark:text-slate-500" />} />
            </div>

            <div>
              <label className={labelCls}>Tipo Contrato</label>
              <Combobox id="contrato-combo" value={tipoContrato} onChange={setTipoContrato} options={TIPO_CONTRATO_OPTIONS} placeholder="Ej. Planta" icon={<FileText className="h-4 w-4 text-slate-400 dark:text-slate-500" />} />
            </div>

            <div>
              <label className={labelCls}>Profesión / Título</label>
              <Combobox id="profesion-combo" value={profesion} onChange={setProfesion} options={uniqueProfesiones} placeholder="Ej. Ingeniero Civil" icon={<GraduationCap className="h-4 w-4 text-slate-400 dark:text-slate-500" />} />
            </div>

            <div>
              <label className={labelCls}>Postgrado</label>
              <Combobox id="postgrado-combo" value={postGrado} onChange={setPostGrado} options={uniquePostGrados} placeholder="Ej. Magíster en Gestión" icon={<GraduationCap className="h-4 w-4 text-slate-400 dark:text-slate-500" />} />
            </div>

          </div>
        </div>

        {/* ── Sección: Datos Adicionales (fechas, emergencia, dir) ──────── */}
        <div className={sectionCls}>
          <h4 className={sectionTitle}>
            <CalendarDays className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            Datos Adicionales
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelSmCls}>Fecha Ingreso</label>
              <input type="date" value={fechaIngreso} onChange={e => setFechaIngreso(e.target.value)} className={inputSmCls} />
            </div>
            <div>
              <label className={labelSmCls}>Fecha Término Contrato</label>
              <input type="date" value={fechaTermino} onChange={e => setFechaTermino(e.target.value)} className={inputSmCls} />
            </div>
            <div>
              <label className={labelSmCls}>Fecha Cumpleaños</label>
              <input type="date" value={fechaCumpleanios} onChange={e => setFechaCumpleanios(e.target.value)} className={inputSmCls} />
            </div>
            <div>
              <label className={labelSmCls}>Contacto de Emergencia</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                </div>
                <input type="text" value={contactoEmergencia} onChange={e => setContactoEmergencia(e.target.value)} className={'pl-10 ' + inputSmCls} placeholder="Nombre – +56 9 1234 5678" />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className={labelSmCls}>Dirección</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                </div>
                <input type="text" value={direccion} onChange={e => setDireccion(e.target.value)} className={'pl-10 ' + inputSmCls} placeholder="Av. Ejemplo 1234, Arica" />
              </div>
            </div>
          </div>

          {/* Tiene vehículo */}
          <div className="flex items-center gap-3 pt-3 mt-3 border-t border-slate-200 dark:border-slate-700">
            <input
              id="tiene-vehiculo"
              type="checkbox"
              checked={tieneVehiculo}
              onChange={e => setTieneVehiculo(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-slate-300 dark:border-slate-600 rounded focus:ring-indigo-500"
            />
            <label htmlFor="tiene-vehiculo" className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer select-none">
              <Car className={`w-4 h-4 ${tieneVehiculo ? 'text-indigo-500' : 'text-slate-400'}`} />
              Tiene vehículo propio
              <span className="text-xs font-normal text-slate-400 dark:text-slate-500">(se considera en la rotación de estacionamiento)</span>
            </label>
          </div>
        </div>

        {/* ── Sección: Jefatura ─────────────────────────────────────────── */}
        <div className={sectionCls}>
          <div className="flex items-center gap-3 mb-4">
            <input id="is-boss" type="checkbox" checked={isBoss} onChange={e => setIsBoss(e.target.checked)} className="w-4 h-4 text-indigo-600 border-slate-300 dark:border-slate-600 rounded focus:ring-indigo-500" />
            <label htmlFor="is-boss" className="font-medium text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2">
              Es Jefatura
              <Crown className={`w-4 h-4 ${isBoss ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'}`} />
            </label>
          </div>
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <h4 className={sectionTitle}>
              <UserCheck className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              Jefatura Directa (a quien reporta)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelSmCls}>Nombre Jefatura</label>
                <Combobox id="boss-name-combo" value={bossName} onChange={handleBossNameChange} options={uniqueBossNames} placeholder="Buscar jefe..." size="sm" />
              </div>
              <div>
                <label className={labelSmCls}>Cargo Jefatura</label>
                <Combobox id="boss-pos-combo" value={bossPosition} onChange={setBossPosition} options={uniqueBossPositions} placeholder="Cargo del jefe" size="sm" />
              </div>
              <div className="md:col-span-2">
                <label className={labelSmCls}>Correo Jefatura</label>
                <Combobox id="boss-email-combo" value={bossEmail} onChange={setBossEmail} options={uniqueBossEmails} placeholder="correo.jefe@empresa.com" size="sm" type="email" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-slate-600 dark:text-slate-300 bg-white dark:bg-dark-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-dark-700 font-medium transition-colors">
            Cancelar
          </button>
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm transition-colors flex items-center gap-2">
            <Save className="w-4 h-4" />
            {initialData ? 'Actualizar Funcionario' : 'Guardar Funcionario'}
          </button>
        </div>
      </form>
    </div>
  );
};