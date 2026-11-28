import React from 'react';
import { Destination, RouteOption } from '../../types';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { generateClientAccessibleRoutes } from '../../utils/routePlanner';
import { ConfidenceRating } from '../common/ConfidenceRating';
import {
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CloudSun,
  CloudRain,
  Snowflake,
  Wind,
  Users,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  Download,
  Bookmark,
  Check,
  ShieldAlert,
  Activity,
} from 'lucide-react';

interface DestinationCardProps {
  destination: Destination;
  onSelect: (dest: Destination) => void;
  onViewDetails: (dest: Destination) => void;
}

export const DestinationCard: React.FC<DestinationCardProps> = ({
  destination,
  onSelect,
  onViewDetails,
}) => {
  const { t } = useLanguage();
  const { profile, simpleMode, savedJourneys, saveJourneyOffline } = useAccessibility();
  const { isBookmarked, toggleBookmark } = useAuth();

  const isSavedOffline = savedJourneys.some((j) => j.destination.id === destination.id);
  const isFavorite = isBookmarked(destination.id);

  const score = destination.accessibilityScore.overall;
  const scoreColor =
    score >= 90
      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800'
      : score >= 75
      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800'
      : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800';

  const weather = destination.weather;
  const isHazard = weather.hazardLevel === 'WARNING' || weather.hazardLevel === 'CRITICAL';
  const isRain = weather.hazardType === 'RAIN_SLIP' || weather.condition.toLowerCase().includes('rain');
  const isSnow = weather.hazardType === 'SNOW_ICE' || weather.condition.toLowerCase().includes('snow');
  const isWind = weather.hazardType === 'HIGH_WIND' || weather.condition.toLowerCase().includes('wind');

  const handleQuickOfflineSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    const accessibleRoute: RouteOption =
      generateClientAccessibleRoutes(destination, 'Accessible Transit Arrival Gate', profile)[0] || {
        id: `offline-route-${destination.id}`,
        name: `${destination.name} Verified Step-Free Route`,
        tag: 'RECOMMENDED',
        distanceKm: 0.9,
        durationMinutes: 15 + (weather.delayMinutes || 0),
        accessibilityScore: destination.accessibilityScore.overall,
        crowdLevel: destination.crowd.currentLevel,
        stairsCount: 0,
        rampAvailable: destination.facilities.ramp,
        liftAvailable: destination.facilities.elevatorLift,
        currentBarriers: false,
        assistanceAvailable: true,
        isBestMatch: true,
        suitabilityNote: `Zero-stairs path audited for ${destination.name}.`,
        pathCoordinates: [
          [destination.coordinates[0] - 0.005, destination.coordinates[1] - 0.004],
          destination.coordinates,
        ],
        steps: [
          {
            instruction: `Arrive at main accessible drop-off at ${destination.name}.`,
            distanceMeters: 60,
            durationSeconds: 70,
            isStepFree: true,
            hasRamp: true,
            hasElevator: false,
            surface: destination.facilities.pathSurface,
            coordinates: destination.coordinates,
          },
          {
            instruction: `Enter through priority step-free entrance. Assistance desk is located inside.`,
            distanceMeters: 100,
            durationSeconds: 110,
            isStepFree: true,
            hasRamp: true,
            hasElevator: destination.facilities.elevatorLift,
            surface: 'Smooth Level Paving',
            coordinates: destination.coordinates,
          },
        ],
      };
    saveJourneyOffline(destination, accessibleRoute);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group">
      {/* Image Banner */}
      <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={destination.imageUrl}
          alt={destination.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

        {/* Verification Status & Weather Hazard Pill */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
          <span className="px-3 py-1 bg-emerald-600/95 backdrop-blur-xs text-white text-[11px] font-black uppercase tracking-wider rounded-full shadow-md flex items-center gap-1.5 border border-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            {destination.verificationStatus}
          </span>

          <ConfidenceRating
            score={destination.facilities.confidence || 96}
            variant="pill"
            entityName={destination.name}
            auditorName={destination.facilities.verifiedBy}
            verifiedDate={destination.facilities.lastVerifiedDate}
          />

          {isHazard ? (
            <span className="px-2.5 py-1 bg-rose-600/95 backdrop-blur-md text-white text-[10px] font-black rounded-full shadow-md flex items-center gap-1 border border-rose-400 animate-pulse">
              {isRain ? <CloudRain className="w-3 h-3" /> : isSnow ? <Snowflake className="w-3 h-3" /> : <Wind className="w-3 h-3" />}
              <span>+{weather.delayMinutes}m Weather Delay</span>
            </span>
          ) : (
            <span className="px-2.5 py-0.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold rounded-full uppercase">
              {destination.category}
            </span>
          )}
        </div>

        {/* Bookmark & Offline Quick Actions */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <button
            onClick={handleQuickOfflineSave}
            className={`p-2 rounded-xl backdrop-blur-md transition-all shadow-md ${
              isSavedOffline
                ? 'bg-emerald-600 text-white'
                : 'bg-black/50 text-white hover:bg-black/70'
            }`}
            title={isSavedOffline ? 'Saved Offline' : 'Save for Offline Use'}
          >
            {isSavedOffline ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleBookmark(destination.id);
            }}
            className={`p-2 rounded-xl backdrop-blur-md transition-all shadow-md ${
              isFavorite
                ? 'bg-amber-500 text-white'
                : 'bg-black/50 text-white hover:bg-black/70'
            }`}
            title={isFavorite ? 'Remove Bookmark' : 'Add to Favorites'}
          >
            <Bookmark className={`w-4 h-4 ${isFavorite ? 'fill-white' : ''}`} />
          </button>
        </div>

        {/* Bottom Image Info */}
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-200 font-medium truncate">
              <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="truncate">
                {destination.city}
                {destination.state ? `, ${destination.state}` : ''} • {destination.country}
              </span>
            </div>
            {/* Score Pill */}
            <div
              className={`px-2.5 py-1 rounded-xl font-black text-xs shadow-lg border backdrop-blur-xs flex items-center gap-1 shrink-0 ${scoreColor}`}
            >
              <span>♿ {score}</span>
              <span className="text-[9px] uppercase font-bold opacity-80">/100</span>
            </div>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white truncate drop-shadow-xs mt-0.5">
            {destination.name}
          </h3>
          {destination.attractionType && (
            <p className="text-[11px] text-slate-300 font-semibold truncate drop-shadow-xs">
              {destination.attractionType}
            </p>
          )}
        </div>
      </div>

      {/* Content Body */}
      <div className="p-5 space-y-4 grow flex flex-col justify-between">
        <div className="space-y-3">
          {/* Short Description */}
          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
            {destination.description}
          </p>

          {/* Key Facilities checklist */}
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              {destination.facilities.wheelchairEntrance ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
              )}
              <span>Step-Free Entrance</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              {destination.facilities.accessibleToilet ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
              )}
              <span>Accessible Toilets</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              {destination.facilities.accessibleParking ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
              )}
              <span>PRM Parking</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              {destination.facilities.accessiblePublicTransport ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
              )}
              <span>Public Transit</span>
            </div>
          </div>

          {/* Crowd & Live Weather Overlay Snippet */}
          {!simpleMode && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/60 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    Crowd: <strong>{destination.crowd.currentLevel}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                  {isRain ? (
                    <CloudRain className="w-3.5 h-3.5 text-blue-500" />
                  ) : isSnow ? (
                    <Snowflake className="w-3.5 h-3.5 text-cyan-500" />
                  ) : isWind ? (
                    <Wind className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <CloudSun className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span>
                    {weather.temperatureC}°C • {weather.condition}
                  </span>
                </div>
              </div>

              {/* Traction & Hazard Impact Line */}
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="flex items-center gap-1 text-slate-500">
                  <Activity className="w-3 h-3 text-blue-500" />
                  Traction: <strong>{weather.surfaceTractionScore ?? 95}%</strong>
                </span>
                {weather.delayMinutes && weather.delayMinutes > 0 ? (
                  <span className="text-rose-600 dark:text-rose-400 font-black flex items-center gap-0.5">
                    <Clock className="w-3 h-3" />
                    +{weather.delayMinutes}m Delay Alert
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    Optimal Step-Free Path
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Active Barrier Warning Badge if any */}
          {destination.currentBarriersCount > 0 && (
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{destination.currentBarriersCount} active obstacle report nearby</span>
            </div>
          )}
          {/* Accessibility Confidence Rating */}
          <div className="pt-1">
            <ConfidenceRating
              score={destination.facilities.confidence || 96}
              variant="meter"
              label="Accessibility Confidence Rating"
              entityName={destination.name}
              auditorName={destination.facilities.verifiedBy}
              verifiedDate={destination.facilities.lastVerifiedDate}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 flex gap-2">
          <button
            onClick={() => onSelect(destination)}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 text-xs sm:text-sm"
          >
            <span>Plan Route</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewDetails(destination)}
            className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs sm:text-sm transition-colors"
          >
            Details
          </button>
        </div>
      </div>
    </div>
  );
};
