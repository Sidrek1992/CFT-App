
import React, { useState } from 'react';
import { SavedCc, AbsenceConfig, CustomLeaveType, UserRole, Gender } from '../types';
import { Mail, Plus, Trash2, Settings as SettingsIcon, ShieldCheck, CalendarRange, Lock, UserCog, AlertCircle } from 'lucide-react';

interface SettingsProps {
  savedCcs: SavedCc[];
  onAddCc: (label: string, email: string) => void;
  onDeleteCc: (id: string) => void;
  userRole: UserRole;
  onSetUserRole: (role: UserRole) => void;
  absenceConfig: AbsenceConfig;
  onUpdateAbsenceConfig: (config: AbsenceConfig) => void;
}

export const Settings: React.FC<SettingsProps> = ({ savedCcs, onAddCc, onDeleteCc, userRole, onSetUserRole, absenceConfig, onUpdateAbsenceConfig }) => {
  const [label, setLabel] = useState('');
  const [email, setEmail] = useState('');

  // Custom Leave Form State
  const [newLeaveName, setNewLeaveName] = useState('');
  const [newLeaveLimit, setNewLeaveLimit] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label || !email) return;
    onAddCc(label, email);
    setLabel('');
    setEmail('');
  };

  const handleAddCustomLeave = () => {
    if (!newLeaveName || newLeaveLimit <= 0) return;
    const newLeave: CustomLeaveType = {
      id: Date.now().toString(),
      name: newLeaveName,
      limit: newLeaveLimit
    };
    onUpdateAbsenceConfig({
      ...absenceConfig,
      customLeaves: [...(absenceConfig.customLeaves || []), newLeave]
    });
    setNewLeaveName('');
    setNewLeaveLimit(0);
  };

  const handleRemoveCustomLeave = (id: string) => {
    onUpdateAbsenceConfig({
      ...absenceConfig,
      customLeaves: absenceConfig.customLeaves.filter(cl => cl.id !== id)
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <SettingsIcon className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Panel de Control Global</h2>
            <p className="text-slate-500 text-sm">Administra la identidad del sistema, copias de correo y límites de ausentismo.</p>
          </div>
        </div>

        {/* IDENTITY & ROLES */}
        <div className="mb-10 p-6 bg-slate-900 rounded-2xl text-white">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center border border-indigo-400/30">
                <ShieldCheck className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Identidad de Usuario</h3>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Rol Actual: <span className="text-indigo-400 font-black">{userRole === 'admin' ? 'ADMINISTRADOR' : 'VISUALIZADOR'}</span></p>
              </div>
            </div>

            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 w-full md:w-auto">
              <button
                onClick={() => onSetUserRole('admin')}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${userRole === 'admin' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
              >
                ADMIN
              </button>
              <button
                onClick={() => onSetUserRole('viewer')}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${userRole === 'viewer' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
              >
                VIEWER
              </button>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
            <AlertCircle className="w-3 h-3 text-amber-500" />
            <span>El rol <strong>VIEWER</strong> restringe las operaciones de borrado, importación y edición en todo el sistema.</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div>
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Añadir Nuevo CC
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre / Etiqueta</label>
                <input
                  type="text"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="Ej: Subdirección Académica"
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ejemplo@cft.cl"
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!label || !email}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                Guardar CC Permanente
              </button>
            </form>
          </div>

          <div>
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-500" /> CCs Registrados
            </h3>
            {savedCcs.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No hay copias permanentes configuradas.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedCcs.map(cc => (
                  <div key={cc.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-200 transition-colors group">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{cc.label}</p>
                      <p className="text-xs text-slate-500">{cc.email}</p>
                    </div>
                    <button
                      onClick={() => onDeleteCc(cc.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CUSTOM LEAVE TYPES */}
        <div className="pt-8 border-t border-slate-100 mb-10">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-indigo-600" /> Gestión de Permisos Administrativos
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-4">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Límites por Defecto</p>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-700">Feriado Legal</p>
                  <input
                    type="number"
                    value={absenceConfig.legalHolidayLimit}
                    onChange={(e) => onUpdateAbsenceConfig({ ...absenceConfig, legalHolidayLimit: Number(e.target.value) })}
                    className="w-20 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold outline-none"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-700">Permiso Administrativo</p>
                  <input
                    type="number"
                    value={absenceConfig.administrativeLeaveLimit}
                    onChange={(e) => onUpdateAbsenceConfig({ ...absenceConfig, administrativeLeaveLimit: Number(e.target.value) })}
                    className="w-20 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold outline-none"
                  />
                </div>
              </div>

              <div className="bg-indigo-50/50 p-6 rounded-xl border border-indigo-100 space-y-4">
                <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-2">Nuevo Tipo de Permisos Especiales</p>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Ej: Permiso por Matrimonio"
                    value={newLeaveName}
                    onChange={(e) => setNewLeaveName(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none"
                  />
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Días Permitidos</label>
                      <input
                        type="number"
                        value={newLeaveLimit}
                        onChange={(e) => setNewLeaveLimit(Number(e.target.value))}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none"
                      />
                    </div>
                    <button
                      onClick={handleAddCustomLeave}
                      className="self-end px-6 py-2 bg-indigo-600 text-white rounded-lg font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-md shadow-indigo-100"
                    >
                      Añadir
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Permisos Especiales Configurados</p>
              {(!absenceConfig.customLeaves || absenceConfig.customLeaves.length === 0) ? (
                <div className="py-12 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center bg-slate-50/50">
                  <CalendarRange className="w-8 h-8 text-slate-200 mb-2" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Sin permisos adicionales</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {absenceConfig.customLeaves.map(cl => (
                    <div key={cl.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl group hover:border-indigo-200 transition-all">
                      <div>
                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{cl.name}</p>
                        <p className="text-xs font-bold text-indigo-600">{cl.limit} DÍAS ANUALES</p>
                      </div>
                      <button
                        onClick={() => handleRemoveCustomLeave(cl.id)}
                        className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
