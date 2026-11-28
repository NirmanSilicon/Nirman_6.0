import React, { useState } from 'react';
import { WeatherData, WeatherHazardLevel } from '../../types';
import {
  CloudRain,
  Snowflake,
  Wind,
  Sun,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Droplets,
  Activity,
  ArrowRight,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface WeatherOverlayBannerProps {
  weather: WeatherData;
  destinationName?: string;
  onRefresh?: () => void;
  onSimulateScenario?: (scenario: 'REAL' | 'RAIN' | 'SNOW' | 'WIND' | 'CLEAR') => void;
  currentScenario?: string;
  compact?: boolean;
}

export const WeatherOverlayBanner: React.FC<WeatherOverlayBannerProps> = ({
  weather,
  destinationName,
  onRefresh,
  onSimulateScenario,
  currentScenario = 'REAL',
  compact = false,
}) => {
  const [showHourly, setShowHourly] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    if (onRefresh) onRefresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const hazardLevel: WeatherHazardLevel = weather.hazardLevel || 'OPTIMAL';
  const isHazard = hazardLevel === 'WARNING' || hazardLevel === 'CRITICAL';
  const isAdvisory = hazardLevel === 'ADVISORY';

  // Choose styling themes based on hazard level & type
  let badgeTheme = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300';
  let bannerHeader = 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-800';
  let hazardIcon = <Sparkles className="w-5 h-5 text-emerald-500" />;

  if (weather.hazardType === 'RAIN_SLIP' || weather.condition.toLowerCase().includes('rain')) {
    hazardIcon = <CloudRain className="w-5 h-5 text-blue-500 animate-bounce" />;
    badgeTheme = isHazard
      ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200'
      : 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60 text-blue-800 dark:text-blue-300';
    bannerHeader = isHazard
      ? 'bg-blue-500/10 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800'
      : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-800';
  } else if (weather.hazardType === 'SNOW_ICE' || weather.condition.toLowerCase().includes('snow')) {
    hazardIcon = <Snowflake className="w-5 h-5 text-cyan-500 animate-spin" />;
    badgeTheme = 'bg-cyan-50 dark:bg-cyan-950/50 border-cyan-300 dark:border-cyan-800 text-cyan-900 dark:text-cyan-200';
    bannerHeader = 'bg-cyan-500/10 dark:bg-cyan-950/40 border-cyan-300 dark:border-cyan-800';
  } else if (weather.hazardType === 'HIGH_WIND' || weather.condition.toLowerCase().includes('wind')) {
    hazardIcon = <Wind className="w-5 h-5 text-amber-500" />;
    badgeTheme = 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200';
    bannerHeader = 'bg-amber-500/10 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800';
  } else if (weather.hazardType === 'THUNDERSTORM') {
    hazardIcon = <AlertTriangle className="w-5 h-5 text-rose-500" />;
    badgeTheme = 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200';
    bannerHeader = 'bg-rose-500/10 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800';
  }

  if (compact) {
    return (
      <div className={`p-3 rounded-2xl border ${badgeTheme} flex items-center justify-between gap-3 text-xs`}>
        <div className="flex items-center gap-2">
          {hazardIcon}
          <div>
            <div className="font-bold flex items-center gap-1.5">
              <span>{weather.temperatureC}°C • {weather.condition}</span>
              {weather.delayMinutes && weather.delayMinutes > 0 ? (
                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] font-black">
                  +{weather.delayMinutes}m delay
                </span>
              ) : null}
            </div>
            <div className="text-[11px] opacity-90 truncate max-w-[280px]">
              {weather.hazardTitle || weather.accessibilityImpact}
            </div>
          </div>
        </div>
        {onRefresh && (
          <button
            onClick={handleRefreshClick}
            className="p-1.5 rounded-lg hover:bg-black/10 transition-colors"
            title="Refresh Live Weather"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-3xl border ${bannerHeader} shadow-md overflow-hidden transition-all duration-300`}>
      {/* Top Banner Bar */}
      <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800">
            {hazardIcon}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Real-Time Weather & Obstacle Radar
              </span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-full">
                Open-Meteo Live API
              </span>
              {weather.lastUpdated && (
                <span className="text-[10px] text-slate-400">Updated: {weather.lastUpdated}</span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>{destinationName ? `${destinationName} • ` : ''}{weather.temperatureC}°C ({weather.condition})</span>
              {weather.apparentTemperatureC && (
                <span className="text-xs font-medium text-slate-500">
                  (Feels like {weather.apparentTemperatureC}°C)
                </span>
              )}
            </h3>
          </div>
        </div>

        {/* Action buttons & simulation switcher */}
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={handleRefreshClick}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Fetch latest Open-Meteo weather update"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}

          {weather.hourlyForecast && weather.hourlyForecast.length > 0 && (
            <button
              onClick={() => setShowHourly(!showHourly)}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
            >
              <span>Hourly</span>
              {showHourly ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Main Alert & Accessibility Obstacle Details */}
      <div className="p-4 sm:p-6 space-y-4">
        {/* Delay & Hazard Alert Card */}
        {isHazard || isAdvisory ? (
          <div className={`p-4 rounded-2xl border ${badgeTheme} space-y-2`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" />
                <span>{weather.hazardTitle || 'Potential Weather Obstacle Alert'}</span>
              </div>
              {weather.delayMinutes && weather.delayMinutes > 0 ? (
                <div className="px-2.5 py-1 rounded-xl bg-rose-600 text-white font-black text-xs shrink-0 flex items-center gap-1 shadow-xs">
                  <Clock className="w-3.5 h-3.5" />
                  <span>+{weather.delayMinutes}m Delay Estimated</span>
                </div>
              ) : null}
            </div>

            <p className="text-xs leading-relaxed opacity-95">
              {weather.hazardDescription || weather.accessibilityImpact}
            </p>

            {weather.recommendedMitigation && (
              <div className="pt-1 text-xs font-semibold flex items-start gap-1.5 text-blue-700 dark:text-blue-300">
                <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span><strong>Recommended Route Adjustment:</strong> {weather.recommendedMitigation}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span><strong>Optimal Accessibility:</strong> Dry surfaces with full traction across step-free paths. No weather delays predicted.</span>
            </div>
            <span className="px-2 py-0.5 bg-emerald-600 text-white font-bold rounded-lg text-[10px] shrink-0">
              0m Delay
            </span>
          </div>
        )}

        {/* 4-Column Weather Telemetry Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* Surface Traction */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5 text-[11px]">
              <Activity className="w-3.5 h-3.5 text-blue-500" />
              <span>Ramp Traction</span>
            </div>
            <div className="text-base font-black text-slate-900 dark:text-white">
              {weather.surfaceTractionScore ?? 95}%
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  (weather.surfaceTractionScore ?? 95) > 75
                    ? 'bg-emerald-500'
                    : (weather.surfaceTractionScore ?? 95) > 40
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${weather.surfaceTractionScore ?? 95}%` }}
              />
            </div>
          </div>

          {/* Precipitation / Rain Rate */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5 text-[11px]">
              <Droplets className="w-3.5 h-3.5 text-blue-500" />
              <span>Precipitation</span>
            </div>
            <div className="text-base font-black text-slate-900 dark:text-white">
              {weather.precipitationMm ?? 0} mm/h
            </div>
            <div className="text-[10px] text-slate-500">
              {weather.rainProbability}% Probability
            </div>
          </div>

          {/* Wind Speed & Gusts */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5 text-[11px]">
              <Wind className="w-3.5 h-3.5 text-teal-500" />
              <span>Wind Speed</span>
            </div>
            <div className="text-base font-black text-slate-900 dark:text-white">
              {weather.windSpeedKmh} km/h
            </div>
            <div className="text-[10px] text-slate-500">
              Gusts: {weather.windGustsKmh ?? weather.windSpeedKmh} km/h
            </div>
          </div>

          {/* Best Visit Window */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5 text-[11px]">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Best Visit Window</span>
            </div>
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate">
              {weather.bestVisitWindow}
            </div>
            <div className="text-[10px] text-slate-500">
              Visibility: {weather.visibilityKm} km
            </div>
          </div>
        </div>

        {/* Hourly Forecast Expandable Shelf */}
        {showHourly && weather.hourlyForecast && (
          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 animate-fade-in">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>Hourly Weather & Accessibility Traction Forecast</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1">
              {weather.hourlyForecast.slice(0, 6).map((h, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded-xl border text-center space-y-1 ${
                    h.hazardLevel === 'CRITICAL' || h.hazardLevel === 'WARNING'
                      ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{h.time}</div>
                  <div className="text-sm font-black text-slate-900 dark:text-white">{h.tempC}°C</div>
                  <div className="text-[10px] text-slate-500 truncate">{h.condition}</div>
                  {h.isRaining ? (
                    <div className="text-[9px] font-bold text-blue-600 dark:text-blue-400">🌧️ {h.precipitationMm}mm</div>
                  ) : h.isSnowing ? (
                    <div className="text-[9px] font-bold text-cyan-600 dark:text-cyan-400">❄️ Snow</div>
                  ) : (
                    <div className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">💨 {h.windSpeedKmh}k/h</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Scenario Simulator Switcher (for testing rain/snow/wind overlays) */}
        {onSimulateScenario && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              Simulate Weather Condition:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'REAL', label: '🛰️ Live Open-Meteo' },
                { id: 'RAIN', label: '🌧️ Heavy Rain / Slick' },
                { id: 'SNOW', label: '❄️ Snow / Ice' },
                { id: 'WIND', label: '💨 High Winds' },
                { id: 'CLEAR', label: '☀️ Clear Dry' },
              ].map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => onSimulateScenario(sc.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    currentScenario === sc.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {sc.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
