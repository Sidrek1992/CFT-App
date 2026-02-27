import React from 'react';
import { Official } from '../../types';
import {
  Search, Check, Building2, Crown, LayoutGrid, ArrowRight, AlertCircle,
} from 'lucide-react';

interface RecipientSelectorProps {
  officials: Official[];
  selectedIds: Set<string>;
  selectionSearch: string;
  selectionDept: string;
  selectionView: 'grid' | 'boss';
  departments: string[];
  filteredForSelection: Official[];
  bossGroups: Map<string, Official[]>;
  activeCampaignId: string;

  onSearchChange: (v: string) => void;
  onDeptChange: (v: string) => void;
  onViewChange: (v: 'grid' | 'boss') => void;
  onToggleSelect: (id: string) => void;
  onToggleBossGroup: (bossName: string) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onProceed: () => void;
}

export const RecipientSelector: React.FC<RecipientSelectorProps> = ({
  officials,
  selectedIds,
  selectionSearch,
  selectionDept,
  selectionView,
  departments,
  filteredForSelection,
  bossGroups,
  activeCampaignId,
  onSearchChange,
  onDeptChange,
  onViewChange,
  onToggleSelect,
  onToggleBossGroup,
  onSelectAll,
  onSelectNone,
  onProceed,
}) => (
  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">

    {/* Controls */}
    <div className="bg-white dark:bg-dark-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-slate-800 dark:text-white">
            {selectedIds.size === 0
              ? 'Ninguno seleccionado'
              : `${selectedIds.size} de ${officials.length} seleccionados`}
          </span>
          <button
            onClick={onSelectAll}
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Sel. todos
          </button>
          {selectedIds.size > 0 && (
            <button
              onClick={onSelectNone}
              className="text-xs font-medium text-red-500 hover:underline"
            >
              Limpiar
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={selectionSearch}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Buscar funcionario..."
              className="pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-56"
            />
          </div>
          <select
            value={selectionDept}
            onChange={e => onDeptChange(e.target.value)}
            className="py-2 px-3 text-sm bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {departments.map(d => (
              <option key={d} value={d}>
                {d === 'Todos' ? 'Todos los Depts.' : d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-700 pt-3">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
          Agrupar por:
        </span>
        <button
          onClick={() => onViewChange('grid')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
            selectionView === 'grid'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-dark-600'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" /> Ninguno (grilla)
        </button>
        <button
          onClick={() => onViewChange('boss')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
            selectionView === 'boss'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-dark-600'
          }`}
        >
          <Crown className="w-3.5 h-3.5" /> Por Jefatura
        </button>
      </div>
    </div>

    {/* Grid view */}
    {selectionView === 'grid' && (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredForSelection.map(official => {
            const isSelected = selectedIds.has(official.id);
            return (
              <button
                key={official.id}
                onClick={() => onToggleSelect(official.id)}
                className={`text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-start gap-3 group ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 shadow-sm shadow-indigo-200 dark:shadow-none'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10'
                }`}
              >
                <div
                  className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-600'
                      : 'border-slate-300 dark:border-slate-600 group-hover:border-indigo-400'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {official.isBoss && (
                      <Crown className="w-3 h-3 text-amber-500 fill-amber-400 flex-shrink-0" />
                    )}
                    <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                      {official.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {official.position}
                  </p>
                  {official.department && (
                    <div className="flex items-center gap-1 mt-1">
                      <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
                        {official.department}
                      </span>
                    </div>
                  )}
                  {!official.email && (
                    <span className="text-[10px] text-red-500 font-medium">Sin correo</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        {filteredForSelection.length === 0 && (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No hay funcionarios que coincidan con la búsqueda.</p>
          </div>
        )}
      </>
    )}

    {/* Boss hierarchy view */}
    {selectionView === 'boss' && (
      <div className="space-y-4">
        {bossGroups.size === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No hay funcionarios que coincidan con la búsqueda.</p>
          </div>
        ) : (
          Array.from(bossGroups.entries()).map(([bossName, subordinates]) => {
            const allSelected = subordinates.every(o => selectedIds.has(o.id));
            const someSelected = !allSelected && subordinates.some(o => selectedIds.has(o.id));
            const countSelected = subordinates.filter(o => selectedIds.has(o.id)).length;
            return (
              <div
                key={bossName}
                className="bg-white dark:bg-dark-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm"
              >
                {/* Boss row */}
                <button
                  onClick={() => onToggleBossGroup(bossName)}
                  className={`w-full flex items-center justify-between px-5 py-3 transition-colors group ${
                    allSelected
                      ? 'bg-amber-50 dark:bg-amber-950/30'
                      : someSelected
                      ? 'bg-amber-50/50 dark:bg-amber-950/10'
                      : 'bg-slate-50 dark:bg-dark-900/40 hover:bg-amber-50/30 dark:hover:bg-amber-950/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        allSelected
                          ? 'bg-amber-500 border-amber-500'
                          : someSelected
                          ? 'bg-amber-200 border-amber-400 dark:bg-amber-900/40 dark:border-amber-600'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {allSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      {someSelected && (
                        <span className="w-2 h-2 bg-amber-500 rounded-sm block" />
                      )}
                    </div>
                    <Crown className="w-4 h-4 text-amber-500 fill-amber-400 flex-shrink-0" />
                    <div className="text-left">
                      <p className="font-bold text-sm text-slate-900 dark:text-white">{bossName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {subordinates.length} subordinado{subordinates.length !== 1 ? 's' : ''}
                        {countSelected > 0 &&
                          ` · ${countSelected} seleccionado${countSelected !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                      allSelected
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {allSelected ? 'Todos seleccionados' : 'Seleccionar todos'}
                  </span>
                </button>

                {/* Subordinates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-3">
                  {subordinates.map(official => {
                    const isSelected = selectedIds.has(official.id);
                    return (
                      <button
                        key={official.id}
                        onClick={() => onToggleSelect(official.id)}
                        className={`text-left px-3 py-2.5 rounded-lg border transition-all flex items-center gap-2.5 group ${
                          isSelected
                            ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30'
                            : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600'
                              : 'border-slate-300 dark:border-slate-600 group-hover:border-indigo-400'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                            {official.name}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                            {official.position}
                          </p>
                        </div>
                        {!official.email && (
                          <span title="Sin correo">
                            <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    )}

    {/* Proceed button */}
    <div className="flex flex-col items-end gap-2 pt-2">
      <button
        onClick={onProceed}
        disabled={selectedIds.size === 0 || !activeCampaignId}
        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow-md"
      >
        Continuar con {selectedIds.size > 0 ? selectedIds.size : '...'} destinatario(s)
        <ArrowRight className="w-4 h-4" />
      </button>
      {!activeCampaignId && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Debes seleccionar o crear una campaña antes de continuar.
        </p>
      )}
    </div>
  </div>
);
