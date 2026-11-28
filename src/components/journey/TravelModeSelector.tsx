import React from 'react';
import { Footprints, Car, Bus, Accessibility, CheckCircle2 } from 'lucide-react';

export type TravelMode = 'WALKING' | 'DRIVING' | 'TRANSIT' | 'ACCESSIBLE_MULTIMODAL';

interface TravelModeSelectorProps {
  selectedMode: TravelMode;
  onSelectMode: (mode: TravelMode) => void;
  idPrefix?: string;
}

export const TravelModeSelector: React.FC<TravelModeSelectorProps> = ({
  selectedMode,
  onSelectMode,
  idPrefix = 'travel-mode',
}) => {
  const modes: {
    id: TravelMode;
    label: string;
    subLabel: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    {
      id: 'WALKING',
      label: 'Walking / Rolling',
      subLabel: 'Step-free sidewalks & ramps',
      icon: Footprints,
    },
    {
      id: 'TRANSIT',
      label: 'Public Transport',
      subLabel: 'Accessible Metro & low-floor bus',
      icon: Bus,
    },
    {
      id: 'DRIVING',
      label: 'Accessible Vehicle',
      subLabel: 'Wheelchair cab & parking drops',
      icon: Car,
    },
    {
      id: 'ACCESSIBLE_MULTIMODAL',
      label: 'Guaranteed 0-Stairs',
      subLabel: 'Multi-modal certified corridor',
      icon: Accessibility,
    },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Travel Mode
        </label>
        <span className="text-[11px] text-slate-400">
          Tailors route speed and infrastructure
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {modes.map((m) => {
          const Icon = m.icon;
          const isSelected = selectedMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              id={`${idPrefix}-${m.id.toLowerCase()}`}
              onClick={() => onSelectMode(m.id)}
              aria-pressed={isSelected}
              className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between min-h-[78px] cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-600 ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/40'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
              </div>
              <div>
                <div className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                  {m.label}
                </div>
                <div className={`text-[10px] leading-tight ${isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                  {m.subLabel}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
