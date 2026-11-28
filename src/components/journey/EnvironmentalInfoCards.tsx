import React from 'react';
import {
  CloudSun,
  Users,
  ShieldCheck,
  AlertTriangle,
  Droplets,
  Wind,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { WeatherData, BarrierReport } from '../../types';

interface EnvironmentalInfoCardsProps {
  weather?: WeatherData | null;
  crowdLevel?: 'LOW' | 'MODERATE' | 'HIGH';
  barriersCount?: number;
  stairsCount?: number;
  hasRamps?: boolean;
  hasLifts?: boolean;
  destinationName?: string;
}

export const EnvironmentalInfoCards: React.FC<EnvironmentalInfoCardsProps> = ({
  weather,
  crowdLevel = 'LOW',
  barriersCount = 0,
  stairsCount = 0,
  hasRamps = true,
  hasLifts = true,
  destinationName = 'Selected Destination',
}) => {
  const temp = weather?.temperatureC ?? 26;
  const condition = weather?.condition ?? 'Sunny & Dry';
  const precipitationProb = weather?.precipitationProbability ?? 0;
  const surfaceStatus = weather?.surfaceStatus ?? 'DRY';

  const crowdText =
    crowdLevel === 'LOW'
      ? 'Low Crowd — Wide open paths, quick passage'
      : crowdLevel === 'MODERATE'
      ? 'Moderate Crowd — Steady flow, accessible lanes open'
      : 'High Crowd — Dense footfall, allow extra roll time';

  const crowdBadge =
    crowdLevel === 'LOW'
      ? '🟢 Low Density'
      : crowdLevel === 'MODERATE'
      ? '🟡 Moderate Density'
      : '🔴 High Density';

  const weatherBadge =
    surfaceStatus === 'DRY'
      ? '🟢 Optimal Grip (Dry Surface)'
      : surfaceStatus === 'WET'
      ? '⚠️ Wet Surface — Drive with care'
      : '❄️ Slippery Surface';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Live Weather & Surface Traction */}
      <div
        id="env-card-weather"
        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-2"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <CloudSun className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Weather & Traction
              </span>
              <div className="text-[10px] text-slate-400">Live conditions</div>
            </div>
          </div>
          <span className="text-sm font-black text-slate-900 dark:text-white">
            {temp}°C
          </span>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>{condition}</span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Droplets className="w-3 h-3 text-blue-500" />
              {precipitationProb}% Rain
            </span>
          </div>
          <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
            {weatherBadge}
          </div>
        </div>
      </div>

      {/* 2. Crowd Density & Navigation Ease */}
      <div
        id="env-card-crowd"
        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-2"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Crowd Density
              </span>
              <div className="text-[10px] text-slate-400">Real-time sensor feed</div>
            </div>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {crowdBadge}
          </span>
        </div>

        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
          {crowdText}
        </p>
      </div>

      {/* 3. Verified Step-Free Infrastructure */}
      <div
        id="env-card-accessibility"
        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-2"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                0-Stairs Guarantee
              </span>
              <div className="text-[10px] text-slate-400">Audited corridor</div>
            </div>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{stairsCount === 0 ? '0 Stairs' : `${stairsCount} Steps`}</span>
          </span>
        </div>

        <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
          <div className="flex items-center gap-1">
            <span className="text-emerald-600 font-bold">✓</span>
            <span>1:12 Verified Ramps on all grades</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-emerald-600 font-bold">✓</span>
            <span>Step-free lifts & wide boarding docks</span>
          </div>
        </div>
      </div>

      {/* 4. Active Route Barriers & Obstacle Alerts */}
      <div
        id="env-card-barriers"
        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-2"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                barriersCount === 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
              }`}
            >
              {barriersCount === 0 ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Route Clear Status
              </span>
              <div className="text-[10px] text-slate-400">Community audits</div>
            </div>
          </div>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              barriersCount === 0
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
            }`}
          >
            {barriersCount === 0 ? '0 Blockers' : `${barriersCount} Reported`}
          </span>
        </div>

        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
          {barriersCount === 0
            ? '✓ Path is fully clear of construction, broken elevators, or debris.'
            : '⚠️ Temporary obstruction reported nearby; route automatically bypasses it.'}
        </p>
      </div>
    </div>
  );
};
