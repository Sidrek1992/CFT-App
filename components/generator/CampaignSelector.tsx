import React from 'react';
import { Campaign } from '../../types';
import { History, Plus, Check, X } from 'lucide-react';

interface CampaignSelectorProps {
  campaigns: Campaign[];
  activeCampaignId: string;
  activeCampaign: Campaign | undefined;
  isCreatingCampaign: boolean;
  newCampaignName: string;
  onSelectCampaign: (id: string) => void;
  onStartCreate: () => void;
  onCancelCreate: () => void;
  onConfirmCreate: () => void;
  onNewCampaignNameChange: (name: string) => void;
}

export const CampaignSelector: React.FC<CampaignSelectorProps> = ({
  campaigns,
  activeCampaignId,
  activeCampaign,
  isCreatingCampaign,
  newCampaignName,
  onSelectCampaign,
  onStartCreate,
  onCancelCreate,
  onConfirmCreate,
  onNewCampaignNameChange,
}) => (
  <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center">
        <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div>
        <h3 className="font-bold text-indigo-900 dark:text-indigo-300">Campaña de Envío</h3>
        <p className="text-xs text-indigo-600 dark:text-indigo-400">
          {activeCampaign
            ? `Gestionando: ${activeCampaign.name}`
            : 'Selecciona o crea una campaña'}
        </p>
      </div>
    </div>

    <div className="flex items-center gap-2 w-full md:w-auto">
      {isCreatingCampaign ? (
        <div className="flex items-center gap-2 w-full animate-in fade-in slide-in-from-right-2">
          <input
            autoFocus
            type="text"
            value={newCampaignName}
            onChange={e => onNewCampaignNameChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onConfirmCreate()}
            placeholder="Nombre campaña"
            className="px-3 py-2 text-sm border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-48"
          />
          <button
            onClick={onConfirmCreate}
            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={onCancelCreate}
            className="p-2 bg-white text-slate-500 rounded-lg border border-slate-300 hover:bg-slate-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <select
            value={activeCampaignId}
            onChange={e => onSelectCampaign(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-dark-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64"
          >
            <option value="" disabled>
              Seleccionar Campaña
            </option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({new Date(c.createdAt).toLocaleDateString()})
              </option>
            ))}
          </select>
          <button
            onClick={onStartCreate}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Nueva
          </button>
        </>
      )}
    </div>
  </div>
);
