
import React, { useState } from 'react';
import { Official, Gender, SortOption, FilterCriteria } from '../types';
import { Edit2, Trash2, Search, Mail, Calendar, Clock, Phone, Fingerprint, LayoutGrid, List, Eraser, Building2 } from 'lucide-react';

interface OfficialListProps {
  officials: Official[];
  onEdit: (official: Official) => void;
  onDelete: (official: Official) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkUpdate: (ids: string[], field: keyof Official, value: any) => void;
  onClearAll: () => void;
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
  initialFilter?: FilterCriteria;
  onClearFilter: () => void;
}

const normalizeText = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const OfficialList: React.FC<OfficialListProps> = ({ 
    officials, onEdit, onDelete, onClearAll, sortOption, onSortChange, initialFilter, onClearFilter
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const filteredOfficials = officials.filter(official => {
    if (initialFilter?.type === 'expiringSoon' && official.contractEndDate) {
        const endDate = new Date(official.contractEndDate);
        const today = new Date();
        const diffDays = (endDate.getTime() - today.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 30 || diffDays < 0) return false;
    }

    const term = normalizeText(searchTerm);
    return normalizeText(official.name).includes(term) ||
           (official.rut && official.rut.includes(term)) ||
           normalizeText(official.email).includes(term);
  });

  const sortedOfficials = [...filteredOfficials].sort((a, b) => {
    if (sortOption === 'rut') return (a.rut || '').localeCompare(b.rut || '');
    if (sortOption === 'entryDate') return (a.entryDate || '').localeCompare(b.entryDate || '');
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-4">
      {/* Barra de Herramientas */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input 
                    type="text" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    placeholder="Buscar funcionario..." 
                    className="pl-10 w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                />
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <LayoutGrid className="w-4 h-4" />
                </button>
                <button 
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <List className="w-4 h-4" />
                </button>
            </div>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
            <select 
                value={sortOption} 
                onChange={(e) => onSortChange(e.target.value as SortOption)} 
                className="px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 outline-none"
            >
                <option value="name">Nombre (A-Z)</option>
                <option value="rut">RUT</option>
                <option value="entryDate">Antigüedad</option>
                <option value="department">Departamento</option>
            </select>
            
            <button 
                onClick={onClearAll}
                className="px-4 py-2 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg text-sm font-bold hover:bg-rose-100 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
                <Eraser className="w-4 h-4" />
                Limpiar BD
            </button>
            
            {initialFilter?.type !== 'none' && (
                <button onClick={onClearFilter} className="px-3 py-2 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors">Limpiar Filtros</button>
            )}
        </div>
      </div>

      {/* Vista de Cuadrícula */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          {sortedOfficials.map((official) => {
            const isExpiringSoon = official.contractEndDate && (() => {
              const diff = (new Date(official.contractEndDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
              return diff > 0 && diff <= 30;
            })();

            return (
              <div key={official.id} className={`bg-white rounded-2xl shadow-sm border p-6 hover:shadow-md transition-all relative overflow-hidden group ${isExpiringSoon ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'}`}>
                {isExpiringSoon && (
                    <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-sm flex items-center gap-1">
                        <Clock className="w-3 h-3" /> VENCE PRONTO
                    </div>
                )}
                
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${official.gender === Gender.Female ? 'bg-pink-100 text-pink-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    {official.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 truncate">{official.name}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Fingerprint className="w-3 h-3" /> {official.rut || 'Sin RUT'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="truncate">{official.department} • {official.position}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Mail className="w-3.5 h-3.5" />
                      <a href={`mailto:${official.email}`} className="truncate hover:text-indigo-600 hover:underline transition-colors">{official.email}</a>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{official.phone || 'Sin teléfono'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
                  <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Ingreso</span>
                      <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-emerald-500" />
                          {official.entryDate || 'N/A'}
                      </p>
                  </div>
                  <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Término</span>
                      <p className={`text-xs font-bold flex items-center gap-1 ${isExpiringSoon ? 'text-amber-600' : 'text-slate-700'}`}>
                          <Clock className={`w-3 h-3 ${isExpiringSoon ? 'text-amber-500' : ''}`} />
                          {official.contractEndDate || 'Indefinido'}
                      </p>
                  </div>
                </div>

                <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onEdit(official)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => onDelete(official)} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Vista de Tabla */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm animate-in fade-in duration-300">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                            <th className="px-6 py-4">Funcionario</th>
                            <th className="px-6 py-4">RUT</th>
                            <th className="px-6 py-4">Contacto</th>
                            <th className="px-6 py-4">Unidad / Cargo</th>
                            <th className="px-6 py-4">Vencimiento</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedOfficials.map((official) => {
                            const isExpiringSoon = official.contractEndDate && (() => {
                                const diff = (new Date(official.contractEndDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
                                return diff > 0 && diff <= 30;
                            })();

                            return (
                                <tr key={official.id} className={`hover:bg-slate-50 transition-colors ${isExpiringSoon ? 'bg-amber-50/20' : ''}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${official.gender === Gender.Female ? 'bg-pink-100 text-pink-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                                {official.name.charAt(0)}
                                            </div>
                                            <span className="font-bold text-slate-800">{official.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 font-medium">
                                        {official.rut || '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-0.5">
                                            <a href={`mailto:${official.email}`} className="text-xs text-indigo-600 font-medium hover:underline flex items-center gap-1 truncate max-w-[180px]">
                                                <Mail className="w-3 h-3" />
                                                {official.email}
                                            </a>
                                            <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                                <Phone className="w-2.5 h-2.5" />
                                                {official.phone || 'Sin tel.'}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-slate-700 font-medium">{official.department}</p>
                                        <p className="text-[10px] text-slate-400">{official.position}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`text-[10px] font-bold flex items-center gap-1 ${isExpiringSoon ? 'text-amber-600' : 'text-slate-500'}`}>
                                            <Clock className="w-3 h-3" />
                                            {official.contractEndDate || 'Indef.'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1">
                                            <button onClick={() => onEdit(official)} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors rounded-md hover:bg-indigo-50">
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => onDelete(official)} className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-md hover:bg-rose-50">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
      )}
      
      {sortedOfficials.length === 0 && (
        <div className="py-20 text-center text-slate-400 italic bg-white rounded-xl border border-slate-200">
            No se encontraron registros.
        </div>
      )}
    </div>
  );
};
