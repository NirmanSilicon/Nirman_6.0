import React, { useState, useEffect } from 'react';
import { Destination, RouteOption, WeatherData } from '../../types';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { WeatherOverlayBanner } from '../weather/WeatherOverlayBanner';
import { fetchPublicWeather, getSimulatedWeatherScenario } from '../../utils/weatherService';
import { generateClientAccessibleRoutes } from '../../utils/routePlanner';
import { ConfidenceRating } from '../common/ConfidenceRating';
import {
  X,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  CloudSun,
  Phone,
  Clock,
  Compass,
  Sparkles,
  Info,
  Navigation,
  Download,
  Volume2,
  VolumeX,
  Bookmark,
  Check,
  Activity,
  Droplets,
  Wind,
  ShieldAlert,
} from 'lucide-react';

interface DestinationDetailModalProps {
  destination: Destination | null;
  isOpen: boolean;
  onClose: () => void;
  onPlanJourney: (dest: Destination) => void;
  onReportBarrier: () => void;
}

export const DestinationDetailModal: React.FC<DestinationDetailModalProps> = ({
  destination,
  isOpen,
  onClose,
  onPlanJourney,
  onReportBarrier,
}) => {
  const { t } = useLanguage();
  const { profile, speak, stopSpeaking, isSpeaking, savedJourneys, saveJourneyOffline } = useAccessibility();
  const { isBookmarked, toggleBookmark, isAuthenticated, openAuthPrompt } = useAuth();
  const [offlineDownloaded, setOfflineDownloaded] = useState(false);
  const [liveWeather, setLiveWeather] = useState<WeatherData | null>(null);
  const [weatherScenario, setWeatherScenario] = useState<'REAL' | 'RAIN' | 'SNOW' | 'WIND' | 'CLEAR'>('REAL');

  useEffect(() => {
    if (destination) {
      // Fetch fresh live Open-Meteo weather
      fetchPublicWeather(
        destination.coordinates[0],
        destination.coordinates[1],
        destination.name,
        destination.facilities.pathSurface
      ).then((w) => setLiveWeather(w));
    }
  }, [destination]);

  if (!isOpen || !destination) return null;

  const effectiveWeather = getSimulatedWeatherScenario(
    weatherScenario,
    liveWeather || destination.weather,
    destination.facilities.pathSurface
  );

  const score = destination.accessibilityScore;
  const fac = destination.facilities;
  const isSavedOffline = savedJourneys.some((j) => j.destination.id === destination.id);
  const isFavorite = isBookmarked(destination.id);

  const handleRefreshWeather = () => {
    fetchPublicWeather(
      destination.coordinates[0],
      destination.coordinates[1],
      destination.name,
      destination.facilities.pathSurface
    ).then((w) => setLiveWeather(w));
  };

  const handleSaveOffline = () => {
    if (!isAuthenticated) {
      openAuthPrompt(
        'Please sign in or register to save offline trips and download verified passes.',
        'REGISTER'
      );
      return;
    }
    const accessibleRoute: RouteOption =
      generateClientAccessibleRoutes(destination, 'Central Accessible Transit Gate', profile)[0] || {
        id: `offline-route-${destination.id}`,
        name: `${destination.name} Audited Step-Free Path`,
        tag: 'RECOMMENDED',
        distanceKm: 0.8,
        durationMinutes: 12 + (effectiveWeather.delayMinutes || 0),
        accessibilityScore: destination.accessibilityScore.overall,
        crowdLevel: destination.crowd.currentLevel,
        stairsCount: 0,
        rampAvailable: destination.facilities.ramp,
        liftAvailable: destination.facilities.elevatorLift,
        currentBarriers: false,
        assistanceAvailable: true,
        isBestMatch: true,
        suitabilityNote: `100% Step-free path for ${destination.name}.`,
        pathCoordinates: [
          [destination.coordinates[0] - 0.005, destination.coordinates[1] - 0.004],
          destination.coordinates,
        ],
        steps: [
          {
            instruction: `Arrive at accessible entrance of ${destination.name}. Priority drop-off zone.`,
            distanceMeters: 60,
            durationSeconds: 70,
            isStepFree: true,
            hasRamp: true,
            hasElevator: false,
            surface: destination.facilities.pathSurface,
            coordinates: destination.coordinates,
          },
          {
            instruction: `Proceed along 1:12 ramp into main atrium. Accessible restrooms located on right.`,
            distanceMeters: 90,
            durationSeconds: 100,
            isStepFree: true,
            hasRamp: true,
            hasElevator: destination.facilities.elevatorLift,
            surface: 'Smooth Level Paving',
            coordinates: destination.coordinates,
          },
        ],
      };
    saveJourneyOffline(destination, accessibleRoute);
    setOfflineDownloaded(true);
    setTimeout(() => setOfflineDownloaded(false), 2500);
  };

  const handleAudioTour = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      const weatherAudio = effectiveWeather.delayMinutes && effectiveWeather.delayMinutes > 0
        ? `Weather Obstacle Warning: ${effectiveWeather.hazardTitle}. Estimated delay is ${effectiveWeather.delayMinutes} minutes due to reduced surface traction. Recommended route adjustment: ${effectiveWeather.recommendedMitigation}.`
        : `Weather condition is ${effectiveWeather.condition} with ${effectiveWeather.temperatureC} degrees Celsius and optimal step-free pathway traction.`;

      speak(
        `${destination.name} in ${destination.city}, ${destination.country}. ${destination.description}. Overall accessibility rating is ${score.overall} out of 100. ${weatherAudio} ${fac.accessibilityNotes}`
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dest-detail-title"
    >
      <div className="w-full max-w-3xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Banner with Image */}
        <div className="relative h-60 sm:h-72 w-full overflow-hidden bg-slate-900 shrink-0">
          <img
            src={destination.imageUrl}
            alt={destination.name}
            className="w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

          {/* Top Actions: Close, Bookmark, Offline, Audio */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={handleAudioTour}
              className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors flex items-center gap-1.5 text-xs font-bold"
              title="Audio Tour Describers"
            >
              {isSpeaking ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{isSpeaking ? 'Stop' : 'Audio Guide'}</span>
            </button>
            <button
              onClick={() => toggleBookmark(destination.id)}
              className={`p-2.5 rounded-full backdrop-blur-md transition-all ${
                isFavorite ? 'bg-amber-500 text-white' : 'bg-black/60 hover:bg-black/80 text-white'
              }`}
              title="Bookmark"
            >
              <Bookmark className={`w-4 h-4 ${isFavorite ? 'fill-white' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
              aria-label="Close details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

            {/* Header text */}
          <div className="absolute bottom-4 left-6 right-6 text-white">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-300 mb-1 flex-wrap">
              <MapPin className="w-4 h-4" />
              <span>
                {destination.city}, {destination.country}
              </span>
              <span className="px-2 py-0.5 bg-emerald-600/90 rounded-md text-[10px] font-black uppercase text-white">
                {fac.verificationStatus}
              </span>
              <ConfidenceRating
                score={fac.confidence || 96}
                variant="pill"
                entityName={destination.name}
                auditorName={fac.verifiedBy}
                verifiedDate={fac.lastVerifiedDate}
              />
              <span className="px-2 py-0.5 bg-blue-600/90 rounded-md text-[10px] font-black uppercase text-white">
                {destination.category}
              </span>
            </div>
            <h2 id="dest-detail-title" className="text-xl sm:text-2xl md:text-3xl font-black leading-tight drop-shadow-sm">
              {destination.name}
            </h2>
            {destination.localName && (
              <p className="text-sm text-slate-300 font-medium">{destination.localName}</p>
            )}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 sm:p-8 overflow-y-auto max-h-[60vh] space-y-6">
          {/* Quick Description */}
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            {destination.description}
          </p>

          {/* Score & Calculation Breakdown */}
          <div className="p-5 sm:p-6 bg-blue-50/70 dark:bg-blue-950/30 rounded-3xl border border-blue-200 dark:border-blue-800/80 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-blue-200 dark:border-blue-800/80 pb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                  {t('accessibilityScore')}
                </div>
                <div className="text-3xl sm:text-4xl font-black text-blue-700 dark:text-blue-400 flex items-center gap-2 mt-1">
                  <span>♿ {score.overall}</span>
                  <span className="text-sm font-bold text-slate-500">/ 100 Overall</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <ConfidenceRating
                  score={fac.confidence || 96}
                  variant="stars"
                  entityName={destination.name}
                  auditorName={fac.verifiedBy}
                  verifiedDate={fac.lastVerifiedDate}
                />
                <div className="text-xs text-slate-500">
                  Audited by: <strong className="text-slate-700 dark:text-slate-300">{fac.verifiedBy}</strong> ({fac.lastVerifiedDate})
                </div>
              </div>
            </div>

            {/* Sub-Score Bars */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-bold">
              <div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300 mb-1">
                  <span>Wheelchair Entrance</span>
                  <span>{score.wheelchairAccess}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: `${score.wheelchairAccess}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300 mb-1">
                  <span>Ramps & Gradient</span>
                  <span>{score.ramp}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: `${score.ramp}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300 mb-1">
                  <span>Accessible Restrooms</span>
                  <span>{score.accessibleToilet}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: `${score.accessibleToilet}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300 mb-1">
                  <span>Pathways & Tactile</span>
                  <span>{score.pathAccessibility}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: `${score.pathAccessibility}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300 mb-1">
                  <span>Staff Assistance</span>
                  <span>{score.assistance}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: `${score.assistance}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300 mb-1">
                  <span>Barrier Clearance</span>
                  <span>{score.barrierStatus}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: `${score.barrierStatus}%` }} />
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1">
              * {score.disclaimer}
            </div>
          </div>

          {/* Detailed Facilities Checklist */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Verified On-Site Facilities & Physical Dimensions
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Entrance Door Width</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{fac.entranceWidthCm} cm (Wide)</span>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Pavement Surface</span>
                <span className="font-bold text-slate-900 dark:text-white truncate max-w-[180px]">{fac.pathSurface}</span>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Accessible Parking</span>
                <span className="font-bold text-emerald-600">{fac.accessibleParking ? 'Available (Designated)' : 'No'}</span>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Public Transport / Transit</span>
                <span className="font-bold text-emerald-600">{fac.accessiblePublicTransport ? 'Accessible Bus / Metro' : 'Standard'}</span>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Accessible Restrooms</span>
                <span className="font-bold text-emerald-600">{fac.accessibleToilet ? 'Grab Rails & Wide Stall' : 'Standard'}</span>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Tactile & Braille Guides</span>
                <span className="font-bold text-emerald-600">{fac.brailleSignage ? 'Installed' : 'None'}</span>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/50 p-4 rounded-2xl leading-relaxed">
              <strong>Auditor Notes:</strong> {fac.accessibilityNotes}
            </p>
          </div>

          {/* Real-Time Weather Overlay & Obstacle Radar */}
          <WeatherOverlayBanner
            weather={effectiveWeather}
            destinationName={destination.name}
            onRefresh={handleRefreshWeather}
            onSimulateScenario={setWeatherScenario}
            currentScenario={weatherScenario}
          />

          {/* Crowd Planning */}
          <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Users className="w-4 h-4 text-blue-600" />
              Crowd Forecast & Sensory Quiet Hours
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              Current: <span className="text-emerald-600 font-bold">{destination.crowd.currentLevel}</span> ({destination.crowd.occupancyPercent}% Occupancy)
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              <strong>Recommended Quiet Window:</strong> {destination.crowd.quietHours}
            </div>
            <div className="text-xs text-slate-500">
              Peak Hours: {destination.crowd.peakHours}
            </div>
          </div>

          {/* Assistance & Emergency Contacts */}
          {destination.assistancePoints.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Phone className="w-4 h-4 text-purple-600" />
                Assistance & Emergency Direct Dial
              </h3>
              {destination.assistancePoints.map((ast) => (
                <div
                  key={ast.id}
                  className="p-4 bg-purple-50/60 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="font-bold text-purple-950 dark:text-purple-100 text-sm">
                      {ast.name} ({ast.location})
                    </div>
                    <div className="text-xs text-purple-800 dark:text-purple-300">
                      Services: {ast.services.join(', ')}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`tel:${ast.contactPhone}`}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{ast.contactPhone}</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveOffline}
              className={`px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                isSavedOffline || offlineDownloaded
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200'
              }`}
            >
              {isSavedOffline || offlineDownloaded ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved for Offline Trip</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Save Offline</span>
                </>
              )}
            </button>

            <button
              onClick={onReportBarrier}
              className="px-3.5 py-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1.5"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Report Barrier</span>
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  onClose();
                  openAuthPrompt(
                    'Please sign in or register to plan your accessible route and book your journey.',
                    'REGISTER'
                  );
                  return;
                }
                onPlanJourney(destination);
                onClose();
              }}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 text-sm"
            >
              <Navigation className="w-4 h-4" />
              <span>Plan Accessible Route</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
