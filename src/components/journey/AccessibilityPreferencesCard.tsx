import React from 'react';
import {
  Accessibility,
  Footprints,
  Sparkles,
  VolumeX,
  ShieldCheck,
  Check,
  Sliders,
} from 'lucide-react';
import { AccessibilityProfile } from '../../types';

interface AccessibilityPreferencesCardProps {
  preferences: {
    wheelchairRequired: boolean;
    avoidStairs: boolean;
    elevatorRequired: boolean;
    reducedWalking: boolean;
    preferQuietRoutes: boolean;
    maxWalkingDistanceMeters: number;
  };
  onChange: (key: string, value: any) => void;
  idPrefix?: string;
}

export const AccessibilityPreferencesCard: React.FC<AccessibilityPreferencesCardProps> = ({
  preferences,
  onChange,
  idPrefix = 'acc-pref',
}) => {
  const options = [
    {
      key: 'wheelchairRequired',
      label: 'Wheelchair Accessible',
      shortDescription: '1:12 slope ramps, wide doorways & step-free paths',
      icon: Accessibility,
      active: preferences.wheelchairRequired,
    },
    {
      key: 'avoidStairs',
      label: 'Avoid Stairs (0 Stairs)',
      shortDescription: 'Strict 100% 0-step guarantee across entire journey',
      icon: Footprints,
      active: preferences.avoidStairs,
    },
    {
      key: 'elevatorRequired',
      label: 'Elevator Required',
      shortDescription: 'Routes must have working elevators & lifts between levels',
      icon: Sparkles,
      active: preferences.elevatorRequired,
    },
    {
      key: 'reducedWalking',
      label: 'Reduced Walking',
      shortDescription: 'Limits continuous walking/rolling distance',
      icon: Sliders,
      active: preferences.reducedWalking,
    },
    {
      key: 'preferQuietRoutes',
      label: 'Prefer Quieter Routes',
      shortDescription: 'Low crowd density & sensory-friendly corridors',
      icon: VolumeX,
      active: preferences.preferQuietRoutes,
    },
  ];

  const activeCount = Object.values(preferences).filter((v) => typeof v === 'boolean' && v).length;

  return (
    <div
      id={`${idPrefix}-container`}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Accessibility className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Accessibility Requirements</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Select your travel mobility preferences to filter step-free, sensory-safe routes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold flex items-center gap-1 border border-blue-200 dark:border-blue-900">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{activeCount} Active Filter{activeCount !== 1 ? 's' : ''}</span>
          </span>
        </div>
      </div>

      {/* Selectable Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = opt.active;
          return (
            <button
              key={opt.key}
              type="button"
              id={`${idPrefix}-${opt.key}`}
              onClick={() => onChange(opt.key, !isSelected)}
              aria-pressed={isSelected}
              className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between min-h-[92px] cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-600 ${
                isSelected
                  ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-600 dark:border-blue-500 ring-2 ring-blue-600/30 shadow-sm'
                  : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-xs sm:text-sm font-bold ${isSelected ? 'text-blue-950 dark:text-blue-100' : 'text-slate-800 dark:text-slate-200'}`}>
                    {opt.label}
                  </span>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-tight">
                {opt.shortDescription}
              </p>
            </button>
          );
        })}
      </div>

      {/* Optional Distance Slider when Reduced Walking is checked */}
      {preferences.reducedWalking && (
        <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/60 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Maximum Walking Limit
            </span>
            <p className="text-[11px] text-slate-500">
              Prioritizes public transit and direct shuttle boarding points.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {[300, 500, 1000].map((dist) => (
              <button
                key={dist}
                type="button"
                onClick={() => onChange('maxWalkingDistanceMeters', dist)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  preferences.maxWalkingDistanceMeters === dist
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                {dist}m
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
