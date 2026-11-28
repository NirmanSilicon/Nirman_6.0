import React from 'react';
import { WeatherData } from '../../types';
import {
  CloudRain,
  Snowflake,
  Wind,
  Sun,
  ShieldAlert,
  Clock,
  Droplets,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

interface WeatherMapOverlayCardProps {
  weather: WeatherData;
  destinationName: string;
  onClose?: () => void;
}

export const WeatherMapOverlayCard: React.FC<WeatherMapOverlayCardProps> = ({
  weather,
  destinationName,
  onClose,
}) => {
  const isRain = weather.hazardType === 'RAIN_SLIP' || weather.condition.toLowerCase().includes('rain');
  const isSnow = weather.hazardType === 'SNOW_ICE' || weather.condition.toLowerCase().includes('snow');
  const isWind = weather.hazardType === 'HIGH_WIND' || weather.condition.toLowerCase().includes('wind');
  const isHazard = weather.hazardLevel === 'WARNING' || weather.hazardLevel === 'CRITICAL';

  return (
    <div className="p-3.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 text-xs w-72 space-y-2 animate-fade-in pointer-events-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
          {isRain ? (
            <CloudRain className="w-4 h-4 text-blue-500" />
          ) : isSnow ? (
            <Snowflake className="w-4 h-4 text-cyan-500" />
          ) : isWind ? (
            <Wind className="w-4 h-4 text-amber-500" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400" />
          )}
          <span className="truncate max-w-[170px]">{destinationName}</span>
        </div>
        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
          Live Radar
        </span>
      </div>

      {/* Temperature & Condition */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-black text-slate-900 dark:text-white">
            {weather.temperatureC}°C
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {weather.condition}
          </div>
        </div>

        {weather.delayMinutes && weather.delayMinutes > 0 ? (
          <div className="px-2 py-1 bg-rose-500/15 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl font-bold text-[11px] flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>+{weather.delayMinutes}m delay</span>
          </div>
        ) : (
          <div className="px-2 py-1 bg-emerald-500/15 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl font-bold text-[11px] flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Optimal</span>
          </div>
        )}
      </div>

      {/* Metrics Mini-Grid */}
      <div className="grid grid-cols-3 gap-1.5 text-center pt-1">
        <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <div className="text-[9px] text-slate-400 font-semibold uppercase">Traction</div>
          <div className="text-xs font-black text-slate-800 dark:text-slate-200">
            {weather.surfaceTractionScore ?? 95}%
          </div>
        </div>
        <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <div className="text-[9px] text-slate-400 font-semibold uppercase">Precip</div>
          <div className="text-xs font-black text-slate-800 dark:text-slate-200">
            {weather.precipitationMm ?? 0}mm
          </div>
        </div>
        <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <div className="text-[9px] text-slate-400 font-semibold uppercase">Wind</div>
          <div className="text-xs font-black text-slate-800 dark:text-slate-200">
            {weather.windSpeedKmh}k/h
          </div>
        </div>
      </div>

      {/* Obstacle warning if hazardous */}
      {isHazard && (
        <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <span className="leading-tight">{weather.hazardTitle || 'Reduced traction on outdoor ramps'}</span>
        </div>
      )}
    </div>
  );
};
