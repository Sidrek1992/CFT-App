
import React, { useState } from 'react';
import { SavedCc } from '../types';
import { Mail, Plus, Trash2, Settings as SettingsIcon, ShieldCheck } from 'lucide-react';

interface SettingsProps {
  savedCcs: SavedCc[];
  onAddCc: (label: string, email: string) => void;
  onDeleteCc: (id: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ savedCcs, onAddCc, onDeleteCc }) => {
  const [label, setLabel] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label || !email) return;
    onAddCc(label, email);
    setLabel('');
    setEmail('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <SettingsIcon className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Configuración Global</h2>
            <p className="text-slate-500 text-sm">Administra los correos de copia (CC) permanentes que usas en tus envíos.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> CCs Guardados
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
      </div>
    </div>
  );
};
