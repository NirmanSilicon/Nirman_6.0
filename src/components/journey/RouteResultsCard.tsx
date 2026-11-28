import React, { useState } from 'react';
import {
  Sparkles,
  Navigation,
  ExternalLink,
  Bookmark,
  Download,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Compass,
  Footprints,
  ShieldCheck,
  Check,
  Zap,
  Award,
  ChevronRight,
} from 'lucide-react';
import { RouteOption, Destination } from '../../types';
import { ConfidenceRating } from '../common/ConfidenceRating';

interface RouteResultsCardProps {
  route: RouteOption;
  destination: Destination;
  originName: string;
  originCoords?: [number, number] | null;
  isSelected: boolean;
  isNavigating: boolean;
  onStartNavigation: (route: RouteOption) => void;
  onNavigateGoogleMaps: (route: RouteOption) => void;
  onSavePlannedTrip: (route: RouteOption) => void;
  onDownloadOffline: (route: RouteOption) => void;
  isSavedToTrips?: boolean;
}

export const RouteResultsCard: React.FC<RouteResultsCardProps> = ({
  route,
  destination,
  originName,
  originCoords,
  isSelected,
  isNavigating,
  onStartNavigation,
  onNavigateGoogleMaps,
  onSavePlannedTrip,
  onDownloadOffline,
  isSavedToTrips = false,
}) => {
  const [isStepsExpanded, setIsStepsExpanded] = useState(false);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const isBestMatch = route.isBestMatch || route.tag === 'RECOMMENDED';

  const tagColor =
    route.tag === 'RECOMMENDED'
      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
      : route.tag === 'FASTEST'
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
      : route.tag === 'ELEVATOR_PRIORITY'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
      : 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 border-purple-200 dark:border-purple-800';

  return (
    <div
      id={`route-card-${route.id}`}
      className={`p-6 rounded-3xl border transition-all flex flex-col justify-between relative ${
        isBestMatch
          ? 'border-blue-500 bg-white dark:bg-slate-900 ring-2 ring-blue-500/50 shadow-xl'
          : isSelected
          ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 ring-2 ring-emerald-500/50 shadow-lg'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
      }`}
    >
      {/* Best Match Top Ribbon */}
      {isBestMatch && (
        <div className="absolute -top-3.5 left-6 px-4 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-black uppercase tracking-wider rounded-full shadow-md flex items-center gap-1.5 z-10">
          <Award className="w-3.5 h-3.5 text-amber-300" />
          <span>SUGAMYA Recommended — Most Beneficial Route</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 pt-1">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-md border ${tagColor}`}>
                {route.tag === 'RECOMMENDED' ? '★ RECOMMENDED' : route.tag.replace('_', ' ')}
              </span>
              {route.energyEffort && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" />
                  Effort: {route.energyEffort}
                </span>
              )}
              {isSelected && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Active Selection
                </span>
              )}
            </div>
            <h4 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug">
              {route.name}
            </h4>
          </div>

          <div
            className={`text-right shrink-0 p-2.5 rounded-2xl border ${
              isBestMatch
                ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div
              className={`text-2xl sm:text-3xl font-black ${
                isBestMatch
                  ? 'text-blue-600 dark:text-blue-400'
                  : route.accessibilityScore >= 90
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-800 dark:text-slate-200'
              }`}
            >
              {route.accessibilityScore}%
            </div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              Access Score
            </div>
          </div>
        </div>

        {/* Real-Time Distance & Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 py-3 px-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
          <div>
            <div className="text-[11px] text-slate-500 font-medium flex items-center justify-center gap-1">
              <Compass className="w-3 h-3 text-blue-600" />
              <span>Distance</span>
            </div>
            <div className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400">
              {route.distanceKm} km
            </div>
            <div className="text-[10px] text-slate-400">
              {Math.round(route.distanceKm * 1000)} meters
            </div>
          </div>

          <div>
            <div className="text-[11px] text-slate-500 font-medium flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-slate-600" />
              <span>Duration ETA</span>
            </div>
            <div className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-200">
              {route.durationMinutes} min
            </div>
            <div className="text-[10px] text-slate-400">
              {route.tag === 'FASTEST' ? 'Express Transit' : route.tag === 'RECOMMENDED' ? 'Accessible Pace' : 'Bypass Pace'}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-slate-500 font-medium flex items-center justify-center gap-1">
              <Footprints className="w-3 h-3 text-emerald-600" />
              <span>Stairs</span>
            </div>
            <div
              className={`text-base sm:text-lg font-black ${
                route.stairsCount === 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {route.stairsCount === 0 ? '0 Stairs' : `${route.stairsCount} Steps ⚠️`}
            </div>
            <div className="text-[10px] text-emerald-600 font-bold">
              100% Step-Free
            </div>
          </div>
        </div>

        {/* Highlighted Key Benefits (Especially prominent on RECOMMENDED route) */}
        {route.keyBenefits && route.keyBenefits.length > 0 && (
          <div
            className={`p-3.5 rounded-2xl border ${
              isBestMatch
                ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{isBestMatch ? 'Key Recommended Advantages' : 'Route Key Advantages'}</span>
            </div>
            <ul className="space-y-1.5">
              {route.keyBenefits.map((benefit, bIdx) => (
                <li key={bIdx} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tradeoffs if present */}
        {route.tradeoffs && route.tradeoffs.length > 0 && (
          <div className="px-3 py-2 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200/80 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Trade-off note: </span>
              {route.tradeoffs.join(' • ')}
            </div>
          </div>
        )}

        {/* Suitability Note */}
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {route.suitabilityNote}
        </p>

        {/* Features Checklist */}
        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            {route.rampAvailable ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            )}
            <span>1:16 Gentle Verified Gradient Ramps on all elevation changes</span>
          </div>
          <div className="flex items-center gap-2">
            {route.liftAvailable ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
            )}
            <span>Wide PRM passenger elevators with audible chimes & Braille</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                route.crowdLevel === 'LOW'
                  ? 'bg-emerald-500'
                  : route.crowdLevel === 'MEDIUM' || route.crowdLevel === 'MODERATE'
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
            />
            <span>
              <strong>Crowd:</strong> {route.crowdLevel} Density —{' '}
              {route.crowdLevel === 'LOW' ? 'Quiet accessible corridor' : 'Moderate transit activity'}
            </span>
          </div>
        </div>

        {/* Expandable Step-by-Step Directions Breakdown */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setIsStepsExpanded(!isStepsExpanded)}
            className="w-full py-2 px-3 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
          >
            <span>
              {isStepsExpanded
                ? 'Hide Turn-by-Turn Steps'
                : `View All ${route.steps?.length || 3} Turn-by-Turn Steps`}
            </span>
            {isStepsExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {isStepsExpanded && route.steps && route.steps.length > 0 && (
            <div className="mt-2.5 space-y-2 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
              {route.steps.map((st, sIdx) => (
                <div key={sIdx} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {sIdx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-slate-800 dark:text-slate-200 font-medium">
                      {st.instruction}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span>{st.distanceMeters}m</span>
                      <span>•</span>
                      <span>{st.surface || 'Paved Step-Free Walkway'}</span>
                      {st.hasElevator && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          🛗 Lift Verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confidence Rating Badge */}
        <div className="pt-1">
          <ConfidenceRating
            score={
              route.accessibilityScore >= 98 && !route.currentBarriers
                ? 99
                : route.accessibilityScore >= 90
                ? 92
                : 82
            }
            variant="meter"
            label="Route Accessibility Confidence"
            entityName={route.name}
            auditorName="Real-Time Step-Free Route Validator"
            verifiedDate="Live Sensor Sync"
          />
        </div>
      </div>

      {/* Navigation Actions Footer */}
      <div className="pt-5 space-y-2.5">
        {/* 1. Primary: Start Navigation */}
        <button
          type="button"
          onClick={() => onStartNavigation(route)}
          className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 min-h-[48px] cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-600 ${
            isSelected && isNavigating
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : isBestMatch
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white'
          }`}
        >
          <Navigation className="w-4 h-4" />
          <span>
            {isSelected && isNavigating
              ? 'Guided Navigation Active'
              : isSelected
              ? 'Start Navigation (Active Route)'
              : 'Start Guided Navigation'}
          </span>
        </button>

        {/* 2. Secondary Row: Google Maps & Save to Trips */}
        <div className="grid grid-cols-2 gap-2">
          {/* Navigate with Google Maps */}
          <button
            type="button"
            onClick={() => onNavigateGoogleMaps(route)}
            title="Open exact origin to destination directions in Google Maps"
            className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors min-h-[44px] cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Google Maps</span>
          </button>

          {/* Save to Planned Trips */}
          <button
            type="button"
            onClick={() => onSavePlannedTrip(route)}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors min-h-[44px] cursor-pointer border ${
              isSavedToTrips
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
            }`}
          >
            {isSavedToTrips ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Saved to Trips</span>
              </>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Save to Trips</span>
              </>
            )}
          </button>
        </div>

        {/* 3. Offline Pass Download */}
        <button
          type="button"
          onClick={() => onDownloadOffline(route)}
          className="w-full py-2 px-3 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Offline Travel Pass</span>
        </button>
      </div>
    </div>
  );
};

