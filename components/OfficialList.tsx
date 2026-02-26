import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Official, Gender, SortOption, FilterCriteria } from '../types';
import { Edit2, Trash2, UserCircle2, User, Building2, Search, Filter, UserCheck, ArrowUpDown, PieChart, Crown, CheckSquare, Square, MoreHorizontal, Mail, Briefcase, X } from 'lucide-react';

interface OfficialListProps {
  officials: Official[];
  onEdit: (official: Official) => void;
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkUpdate: (ids: string[], field: keyof Official, value: any) => void;
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
  initialFilter?: FilterCriteria;
  onClearFilter: () => void;
}

// Helper for accent-insensitive search
const normalizeText = (text: string) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

const getFilterLabel = (type: string, value?: string) => {
    switch(type) {
        case 'missingBoss': return 'Funcionarios sin Jefatura';
        case 'missingGender': return 'Funcionarios sin Género';
        case 'invalidEmail': return 'Correos Inválidos';
        case 'department': return `Departamento: ${value}`;
        default: return 'Filtro Activo';
    }
};

export const OfficialList: React.FC<OfficialListProps> = ({ 
    officials, onEdit, onDelete, onBulkDelete, onBulkUpdate, sortOption, onSortChange, initialFilter, onClearFilter
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('Todos');
  const [selectedBoss, setSelectedBoss] = useState('Todos');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Selection State (Checkboxes)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Tooltip State (JS Based Positioning to avoid overflow clipping)
  const [activeTooltip, setActiveTooltip] = useState<{
      official: Official;
      x: number;
      y: number;
      position: 'top' | 'bottom';
  } | null>(null);
  
  // Handle Initial Smart Filters from Dashboard
  useEffect(() => {
      if (initialFilter) {
          // Always reset search when a new external filter arrives for clarity
          setSearchTerm('');

          if (initialFilter.type === 'department' && initialFilter.value) {
              setSelectedDept(initialFilter.value);
              setSelectedBoss('Todos');
          } else if (['missingBoss', 'missingGender', 'invalidEmail'].includes(initialFilter.type)) {
               // When filtering by errors, reset standard filters to ensure errors are visible
               setSelectedDept('Todos');
               setSelectedBoss('Todos');
          } else if (initialFilter.type === 'none') {
             // Optional: reset logic if needed when navigating back without filter
          }
      }
  }, [initialFilter]);

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

  // Derive unique lists for filters
  const departments = useMemo(() => 
    ['Todos', ...new Set(officials.map(o => o.department).filter(Boolean).sort())],
  [officials]);

  const bosses = useMemo(() => 
    ['Todos', ...new Set(officials.map(o => o.bossName).filter(Boolean).sort())],
  [officials]);

  // Statistics Calculation
  const deptStats = useMemo(() => {
    const stats: Record<string, number> = {};
    officials.forEach(o => {
        const dept = o.department?.trim() || 'Sin Departamento';
        stats[dept] = (stats[dept] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [officials]);

  const maleCount = officials.filter(o => o.gender === Gender.Male).length;
  const femaleCount = officials.filter(o => o.gender === Gender.Female).length;

  // Filter Logic
  const filteredOfficials = officials.filter(official => {
    // Smart Filters from Dashboard
    if (initialFilter?.type === 'missingBoss' && official.bossName) return false;
    if (initialFilter?.type === 'missingGender' && official.gender !== Gender.Unspecified) return false;
    if (initialFilter?.type === 'invalidEmail' && official.email.includes('@')) return false;

    // Normalize search term and fields for accent-insensitive comparison
    const term = normalizeText(searchTerm);
    const matchesSearch = 
      normalizeText(official.name).includes(term) ||
      normalizeText(official.email).includes(term) ||
      normalizeText(official.position).includes(term);

    const matchesDept = selectedDept === 'Todos' || official.department === selectedDept;
    const matchesBoss = selectedBoss === 'Todos' || official.bossName === selectedBoss;

    return matchesSearch && matchesDept && matchesBoss;
  });

  // Sort Logic
  const sortedOfficials = [...filteredOfficials].sort((a, b) => {
    switch (sortOption) {
        case 'department':
            return (a.department || '').localeCompare(b.department || '');
        case 'surname':
            const surnameA = a.name.trim().split(' ').pop() || '';
            const surnameB = b.name.trim().split(' ').pop() || '';
            return surnameA.localeCompare(surnameB);
        case 'name':
        default:
            return a.name.localeCompare(b.name);
    }
  });

  // Handlers
  const toggleSelectAll = () => {
      if (selectedIds.length === sortedOfficials.length) {
          setSelectedIds([]);
      } else {
          setSelectedIds(sortedOfficials.map(o => o.id));
      }
  };

  const toggleSelectOne = (id: string) => {
      if (selectedIds.includes(id)) {
          setSelectedIds(prev => prev.filter(item => item !== id));
      } else {
          setSelectedIds(prev => [...prev, id]);
      }
  };

  const handleBulkChangeDept = () => {
      const newDept = window.prompt("Ingresa el nuevo departamento para los usuarios seleccionados:");
      if (newDept !== null) {
          onBulkUpdate(selectedIds, 'department', newDept);
          setSelectedIds([]); 
      }
  };

  const handleMouseEnterTooltip = (e: React.MouseEvent, official: Official) => {
      if (!official.bossName) return;
      
      const rect = e.currentTarget.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const position = spaceBelow < 180 ? 'top' : 'bottom'; // Show on top if near bottom edge

      setActiveTooltip({
          official,
          x: rect.left + 20,
          y: position === 'bottom' ? rect.bottom + 5 : rect.top - 5,
          position
      });
  };

  const handleMouseLeaveTooltip = () => {
      setActiveTooltip(null);
  };

  if (officials.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-slate-200 border-dashed">
        <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <User className="w-6 h-6 text-slate-600 dark:text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-900">No hay funcionarios</h3>
        <p className="text-slate-500 dark:text-slate-500 mt-1">Agrega nuevos funcionarios para comenzar a gestionar correos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      
      {/* Statistics Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-indigo-600 rounded-xl p-4 text-slate-900 dark:text-white shadow-sm flex flex-col justify-between">
            <div>
                <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">Total Registros</p>
                <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-indigo-300" />
                    <span className="text-3xl font-bold">{officials.length}</span>
                </div>
            </div>
            <div className="mt-2 text-xs text-indigo-200">
                Funcionarios ingresados
            </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-center gap-2">
             <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Por Género</h4>
             <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        Hombres
                    </span>
                    <span className="font-bold text-slate-900">{maleCount}</span>
                </div>
                <div className="flex items-center justify-between">
                     <span className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                        Mujeres
                    </span>
                    <span className="font-bold text-slate-900">{femaleCount}</span>
                </div>
             </div>
        </div>

        <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
             <div className="flex items-center gap-2 mb-3">
                <PieChart className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Desglose por Departamento</h4>
             </div>
             <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
                {deptStats.map(([dept, count]) => (
                    <div key={dept} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
                        <span className="truncate max-w-[150px]">{dept}</span>
                        <span className="bg-white px-1.5 py-0.5 rounded-md border border-slate-200 text-slate-900 font-bold text-[10px] shadow-sm">
                            {count}
                        </span>
                    </div>
                ))}
             </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
          <div className="bg-indigo-900 text-slate-900 dark:text-white p-3 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2 shadow-lg">
              <div className="flex items-center gap-3">
                  <span className="bg-indigo-700 px-2 py-1 rounded text-xs font-bold">{selectedIds.length} seleccionados</span>
                  <span className="text-sm text-indigo-200 hidden sm:inline">Acciones masivas:</span>
              </div>
              <div className="flex gap-2">
                  <button 
                    onClick={handleBulkChangeDept}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-800 hover:bg-indigo-700 rounded-lg text-xs font-medium transition-colors"
                  >
                      <Building2 className="w-3 h-3" />
                      Cambiar Dept.
                  </button>
                  <button 
                    onClick={() => { onBulkDelete(selectedIds); setSelectedIds([]); }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded-lg text-xs font-medium transition-colors shadow-sm"
                  >
                      <Trash2 className="w-3 h-3" />
                      Eliminar
                  </button>
                  <button 
                    onClick={() => setSelectedIds([])}
                    className="p-1.5 text-indigo-300 hover:text-slate-900 dark:text-white"
                  >
                      <MoreHorizontal className="w-4 h-4" />
                  </button>
              </div>
          </div>
      )}

      {/* Active Filter Banner */}
      {initialFilter && initialFilter.type !== 'none' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-amber-900">
                <Filter className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium">
                    {getFilterLabel(initialFilter.type, initialFilter.value)}: <span className="font-bold">{filteredOfficials.length}</span> resultados
                </span>
            </div>
            <button
                onClick={onClearFilter}
                className="text-xs bg-white border border-amber-200 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-100 font-medium transition-colors flex items-center gap-1 shadow-sm"
            >
                <X className="w-3 h-3" />
                Limpiar Filtro
            </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
        <div className="relative w-full xl:w-64">
           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-600 dark:text-slate-400" />
           </div>
           <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar (Ctrl + K)..."
              className="pl-10 w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-corporate-blue outline-none"
           />
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full xl:w-auto">
           {/* Sort Dropdown */}
           <div className="relative min-w-[160px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <ArrowUpDown className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </div>
              <select
                  value={sortOption}
                  onChange={(e) => onSortChange(e.target.value as SortOption)}
                  className="pl-10 w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-corporate-blue outline-none appearance-none cursor-pointer font-medium text-slate-700"
              >
                  <option value="name">Nombre (A-Z)</option>
                  <option value="surname">Apellido (A-Z)</option>
                  <option value="department">Departamento</option>
              </select>
           </div>

           <div className="h-full w-px bg-slate-200 hidden sm:block mx-1"></div>

           {/* Department Filter */}
           <div className="relative min-w-[160px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building2 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </div>
              <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="pl-10 w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-corporate-blue outline-none appearance-none cursor-pointer"
              >
                  {departments.map(d => <option key={d} value={d}>{d === 'Todos' ? 'Todos Depts.' : d}</option>)}
              </select>
           </div>

           {/* Boss Filter */}
           <div className="relative min-w-[160px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserCheck className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </div>
              <select
                  value={selectedBoss}
                  onChange={(e) => setSelectedBoss(e.target.value)}
                  className="pl-10 w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-corporate-blue outline-none appearance-none cursor-pointer"
              >
                   {bosses.map(b => <option key={b} value={b}>{b === 'Todos' ? 'Todas Jefaturas' : b}</option>)}
              </select>
           </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-visible">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 w-10">
                    <button onClick={toggleSelectAll} className="flex items-center text-slate-600 dark:text-slate-400 hover:text-indigo-600">
                        {selectedIds.length > 0 && selectedIds.length === sortedOfficials.length ? (
                            <CheckSquare className="w-5 h-5 text-indigo-600" />
                        ) : (
                            <Square className="w-5 h-5" />
                        )}
                    </button>
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Departamento</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Cargo</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Correo</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Jefatura</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedOfficials.length === 0 ? (
                <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500 dark:text-slate-500">
                        No se encontraron resultados con los filtros seleccionados.
                    </td>
                </tr>
              ) : (
                sortedOfficials.map((official) => (
                  <tr key={official.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.includes(official.id) ? 'bg-indigo-50/50' : ''}`}>
                    <td className="px-6 py-4">
                        <button onClick={() => toggleSelectOne(official.id)} className="flex items-center text-slate-600 dark:text-slate-400 hover:text-indigo-600">
                             {selectedIds.includes(official.id) ? (
                                <CheckSquare className="w-5 h-5 text-indigo-600" />
                            ) : (
                                <Square className="w-5 h-5" />
                            )}
                        </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         {/* Icono de Jefatura a la Izquierda del nombre */}
                         {official.isBoss && <Crown className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" title="Jefatura" />}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${official.gender === Gender.Female ? 'bg-pink-100 text-pink-600' : official.gender === Gender.Male ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                          <UserCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 flex items-center gap-1">
                            {official.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-500">{official.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                        {official.department ? (
                            <div className="flex items-center gap-2">
                                <Building2 className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                                {official.department}
                            </div>
                        ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{official.position}</td>
                    
                    {/* Clickable Email Column */}
                    <td className="px-6 py-4 text-sm">
                        {official.email ? (
                            <a 
                                href={`mailto:${official.email}`} 
                                className="text-indigo-600 hover:underline hover:text-indigo-800 flex items-center gap-1.5 transition-colors font-medium"
                                onClick={(e) => e.stopPropagation()}
                                title="Enviar correo"
                            >
                                <Mail className="w-3 h-3" />
                                {official.email}
                            </a>
                        ) : (
                            <span className="text-slate-600 dark:text-slate-400 italic">Sin correo</span>
                        )}
                    </td>
                    
                    {/* Boss Column with JS-based Tooltip */}
                    <td 
                        className="px-6 py-4 cursor-help"
                        onMouseEnter={(e) => handleMouseEnterTooltip(e, official)}
                        onMouseLeave={handleMouseLeaveTooltip}
                    >
                      <div className="text-sm text-slate-900 font-medium decoration-slate-300 decoration-dotted underline-offset-2 hover:underline">
                          {official.bossName || '-'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-500">{official.bossPosition}</div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onEdit(official); }}
                          className="p-1.5 text-slate-500 dark:text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                        >
                          <Edit2 className="w-4 h-4 pointer-events-none" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onDelete(official.id); }}
                          className="p-1.5 text-slate-500 dark:text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4 pointer-events-none" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Tooltip (Rendered outside table to prevent overflow clipping) */}
      {activeTooltip && (
          <div 
            className="fixed z-[9999] bg-slate-800 text-slate-900 dark:text-white p-3 rounded-lg shadow-xl animate-in fade-in zoom-in-95 pointer-events-none"
            style={{ 
                left: activeTooltip.x, 
                top: activeTooltip.position === 'bottom' ? activeTooltip.y : undefined,
                bottom: activeTooltip.position === 'top' ? (window.innerHeight - activeTooltip.y) : undefined,
                width: '260px'
            }}
          >
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Detalles Jefatura</div>
              <div className="space-y-1">
                  <div className="flex items-start gap-2">
                      <User className="w-3 h-3 text-indigo-400 mt-0.5" />
                      <span className="text-sm font-medium">{activeTooltip.official.bossName}</span>
                  </div>
                  <div className="flex items-start gap-2">
                      <Briefcase className="w-3 h-3 text-indigo-400 mt-0.5" />
                      <span className="text-xs text-slate-700 dark:text-slate-300">{activeTooltip.official.bossPosition || 'Sin Cargo'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                      <Mail className="w-3 h-3 text-indigo-400 mt-0.5" />
                      <span className="text-xs text-slate-700 dark:text-slate-300 break-all">{activeTooltip.official.bossEmail || 'Sin Correo'}</span>
                  </div>
              </div>
              {/* Arrow */}
              <div 
                className="absolute left-6 w-2 h-2 bg-slate-800 rotate-45"
                style={{
                    top: activeTooltip.position === 'bottom' ? '-4px' : undefined,
                    bottom: activeTooltip.position === 'top' ? '-4px' : undefined,
                }}
              ></div>
          </div>
      )}

    </div>
  );
};