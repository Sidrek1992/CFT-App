import React, { useState, useEffect, useMemo } from 'react';
import { Official, Gender } from '../types';
import { detectGenderAndTitle } from '../services/geminiService';
import { Sparkles, User, Mail, Briefcase, Save, X, Building2, Crown, Eraser, BadgeCheck, UserCheck } from 'lucide-react';

interface OfficialFormProps {
  initialData?: Official | null;
  existingOfficials: Official[];
  onSave: (official: Omit<Official, 'id'>) => void;
  onCancel: () => void;
}

export const OfficialForm: React.FC<OfficialFormProps> = ({ initialData, existingOfficials, onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [stament, setStament] = useState('');
  const [isBoss, setIsBoss] = useState(false);
  const [bossName, setBossName] = useState('');
  const [bossPosition, setBossPosition] = useState('');
  const [bossEmail, setBossEmail] = useState('');
  const [gender, setGender] = useState<Gender>(Gender.Unspecified);
  const [title, setTitle] = useState('Sr./Sra.');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Load data: If editing, load initialData. If new, try to load Draft from localStorage.
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setEmail(initialData.email);
      setDepartment(initialData.department || '');
      setPosition(initialData.position);
      setStament(initialData.stament || '');
      setIsBoss(initialData.isBoss || false);
      setBossName(initialData.bossName);
      setBossPosition(initialData.bossPosition);
      setBossEmail(initialData.bossEmail);
      setGender(initialData.gender);
      setTitle(initialData.title);
    } else {
      // Logic for recovering Draft
      const draft = localStorage.getItem('officialFormDraft');
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setName(parsed.name || '');
          setEmail(parsed.email || '');
          setDepartment(parsed.department || '');
          setPosition(parsed.position || '');
          setStament(parsed.stament || '');
          setIsBoss(parsed.isBoss || false);
          setBossName(parsed.bossName || '');
          setBossPosition(parsed.bossPosition || '');
          setBossEmail(parsed.bossEmail || '');
          setGender(parsed.gender || Gender.Unspecified);
          setTitle(parsed.title || 'Sr./Sra.');
        } catch (e) {
          console.error("Error loading draft", e);
        }
      }
    }
  }, [initialData]);

  // Save Draft Logic: Whenever fields change, if we are NOT editing an existing user, save to localStorage.
  useEffect(() => {
    if (!initialData) {
      const draft = {
        name,
        email,
        department,
        position,
        stament,
        isBoss,
        bossName,
        bossPosition,
        bossEmail,
        gender,
        title
      };
      localStorage.setItem('officialFormDraft', JSON.stringify(draft));
    }
  }, [name, email, department, position, stament, isBoss, bossName, bossPosition, bossEmail, gender, title, initialData]);

  // Derive unique lists for autocomplete
  const registeredBosses = useMemo(() => existingOfficials.filter(o => o.isBoss), [existingOfficials]);

  const uniqueDepartments = useMemo(() => 
    [...new Set(existingOfficials.map(o => o.department).filter(Boolean))].sort(),
  [existingOfficials]);

  const uniqueStaments = useMemo(() => 
    [...new Set(existingOfficials.map(o => o.stament).filter(Boolean))].sort(),
  [existingOfficials]);

  const uniqueBossNames = useMemo(() => {
    const historicNames = existingOfficials.map(o => o.bossName).filter(Boolean);
    const activeBossNames = registeredBosses.map(o => o.name);
    return [...new Set([...historicNames, ...activeBossNames])].filter(n => n && n.trim().length > 0).sort();
  }, [existingOfficials, registeredBosses]);

  const uniqueBossPositions = useMemo(() => {
    const historicPos = existingOfficials.map(o => o.bossPosition).filter(Boolean);
    const activeBossPos = registeredBosses.map(o => o.position);
    return [...new Set([...historicPos, ...activeBossPos])].filter(p => p && p.trim().length > 0).sort();
  }, [existingOfficials, registeredBosses]);

  const uniqueBossEmails = useMemo(() => {
    const historicEmails = existingOfficials.map(o => o.bossEmail).filter(Boolean);
    const activeBossEmails = registeredBosses.map(o => o.email);
    return [...new Set([...historicEmails, ...activeBossEmails])].filter(e => e && e.trim().length > 0).sort();
  }, [existingOfficials, registeredBosses]);

  const handleAnalyzeName = async () => {
    if (!name) return;
    setIsAnalyzing(true);
    const result = await detectGenderAndTitle(name);
    setGender(result.gender);
    setTitle(result.title);
    setIsAnalyzing(false);
  };

  const handleBossNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setBossName(val);
    
    const registeredMatch = registeredBosses.find(b => b.name.toLowerCase() === val.toLowerCase());
    if (registeredMatch) {
        setBossPosition(registeredMatch.position);
        setBossEmail(registeredMatch.email);
        return;
    }

    const historicMatch = existingOfficials.find(o => o.bossName.toLowerCase() === val.toLowerCase());
    if (historicMatch) {
        if (!bossPosition && historicMatch.bossPosition) setBossPosition(historicMatch.bossPosition);
        if (!bossEmail && historicMatch.bossEmail) setBossEmail(historicMatch.bossEmail);
    }
  };

  const handleClearDraft = () => {
    if (window.confirm("¿Estás seguro de que quieres limpiar el formulario?")) {
      setName('');
      setEmail('');
      setDepartment('');
      setPosition('');
      setStament('');
      setIsBoss(false);
      setBossName('');
      setBossPosition('');
      setBossEmail('');
      setGender(Gender.Unspecified);
      setTitle('Sr./Sra.');
      localStorage.removeItem('officialFormDraft');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      email,
      department,
      position,
      stament,
      isBoss,
      bossName,
      bossPosition,
      bossEmail,
      gender,
      title
    });
    
    // Clear draft on successful save
    if (!initialData) {
      localStorage.removeItem('officialFormDraft');
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-800">
            {initialData ? 'Editar Funcionario' : 'Nuevo Funcionario'}
            </h3>
            {!initialData && (name || email) && (
                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                    Borrador detectado
                </span>
            )}
        </div>
        <div className="flex gap-2">
             {!initialData && (name || email) && (
                <button 
                    onClick={handleClearDraft}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Limpiar formulario"
                >
                    <Eraser className="w-5 h-5" />
                </button>
            )}
            <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
            </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Personal Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-corporate-blue focus:border-transparent outline-none transition-all"
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              <button
                type="button"
                onClick={handleAnalyzeName}
                disabled={!name || isAnalyzing}
                className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 flex items-center gap-2 transition-colors font-medium text-sm"
                title="Detectar género automáticamente con IA"
              >
                {isAnalyzing ? (
                  <span className="animate-spin">✦</span>
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                IA Detect
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Género</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-corporate-blue outline-none"
            >
              <option value={Gender.Unspecified}>No especificado</option>
              <option value={Gender.Male}>Masculino</option>
              <option value={Gender.Female}>Femenino</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-corporate-blue outline-none"
              placeholder="Ej. Sr."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-corporate-blue outline-none"
                  placeholder="juan@empresa.com"
                />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Departamento</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building2 className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  list="departments-list"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="pl-10 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-corporate-blue outline-none"
                  placeholder="Seleccionar o escribir..."
                />
                <datalist id="departments-list">
                    {uniqueDepartments.map(d => <option key={d} value={d} />)}
                </datalist>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cargo</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Briefcase className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  required
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="pl-10 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-corporate-blue outline-none"
                  placeholder="Ej. Analista"
                />
            </div>
          </div>

           <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Estamento</label>
             <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <BadgeCheck className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  list="staments-list"
                  value={stament}
                  onChange={(e) => setStament(e.target.value)}
                  className="pl-10 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-corporate-blue outline-none"
                  placeholder="Ej. Profesional"
                />
                <datalist id="staments-list">
                    {uniqueStaments.map(s => <option key={s} value={s} />)}
                </datalist>
            </div>
          </div>
        </div>

        {/* Boss Toggle */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
             <div className="flex items-center gap-3 mb-4">
                 <div className="flex items-center h-5">
                    <input
                        id="is-boss"
                        type="checkbox"
                        checked={isBoss}
                        onChange={(e) => setIsBoss(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                 </div>
                 <div className="text-sm">
                    <label htmlFor="is-boss" className="font-medium text-slate-700 flex items-center gap-2">
                        Es Jefatura
                        <Crown className={`w-4 h-4 ${isBoss ? 'text-amber-500' : 'text-slate-300'}`} />
                    </label>
                    <p className="text-xs text-slate-500">Habilita a esta persona para ser seleccionada como jefe de otros.</p>
                 </div>
             </div>

             <div className="border-t border-slate-200 pt-4 mt-4">
                 <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-slate-500" />
                    Jefatura Directa (A quien reporta)
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Nombre Jefatura</label>
                        <input
                            type="text"
                            list="boss-names"
                            value={bossName}
                            onChange={handleBossNameChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-corporate-blue outline-none"
                            placeholder="Buscar jefe..."
                        />
                        <datalist id="boss-names">
                            {uniqueBossNames.map(n => <option key={n} value={n} />)}
                        </datalist>
                    </div>
                     <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Cargo Jefatura</label>
                        <input
                            type="text"
                            list="boss-positions"
                            value={bossPosition}
                            onChange={(e) => setBossPosition(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-corporate-blue outline-none"
                            placeholder="Cargo del jefe"
                        />
                         <datalist id="boss-positions">
                            {uniqueBossPositions.map(p => <option key={p} value={p} />)}
                        </datalist>
                    </div>
                     <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Correo Jefatura</label>
                        <input
                            type="email"
                            list="boss-emails"
                            value={bossEmail}
                            onChange={(e) => setBossEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-corporate-blue outline-none"
                            placeholder="correo.jefe@empresa.com"
                        />
                         <datalist id="boss-emails">
                            {uniqueBossEmails.map(e => <option key={e} value={e} />)}
                        </datalist>
                    </div>
                 </div>
             </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {initialData ? 'Actualizar Funcionario' : 'Guardar Funcionario'}
          </button>
        </div>
      </form>
    </div>
  );
};