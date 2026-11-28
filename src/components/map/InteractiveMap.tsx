import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import confetti from 'canvas-confetti';
import { Destination, BarrierReport, RouteOption, WeatherData, RouteStep } from '../../types';
import {
  Layers,
  MapPin,
  AlertTriangle,
  Maximize2,
  Navigation,
  CheckCircle2,
  CloudRain,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  LocateFixed,
  Radio,
  Compass,
  RotateCcw,
  X,
  CornerUpLeft,
  CornerUpRight,
  ArrowUp,
  Footprints,
  Flag,
  Crosshair,
  ShieldCheck,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { fetchPublicWeather, getSimulatedWeatherScenario } from '../../utils/weatherService';
import {
  reverseGeocodeLocation,
  calculateDistanceMeters,
  calculateDistanceKm,
  fetchOsrmRoute,
  geocodeLocation,
} from '../../utils/realRoutingService';

interface InteractiveMapProps {
  destinations: Destination[];
  barriers: BarrierReport[];
  selectedDestination?: Destination | null;
  activeRoute?: RouteOption | null;
  startLocationName?: string;
  startLocationCoords?: [number, number] | null;
  originMode?: 'CURRENT_LOCATION' | 'CUSTOM';
  currentGpsCoords?: [number, number] | null;
  isNavigating?: boolean;
  activeStepIndex?: number;
  onStepChange?: (index: number) => void;
  onStopNavigation?: () => void;
  onSelectDestination?: (dest: Destination) => void;
  onReportBarrierAtLocation?: (coords: [number, number], name: string) => void;
  onSetGpsAsStart?: (locationName: string, coords: [number, number]) => void;
  onRecalculate?: () => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  destinations,
  barriers,
  selectedDestination,
  activeRoute: initialActiveRoute,
  startLocationName = 'My Current Location',
  startLocationCoords,
  originMode = 'CURRENT_LOCATION',
  currentGpsCoords,
  isNavigating = false,
  activeStepIndex = 0,
  onStepChange,
  onStopNavigation,
  onSelectDestination,
  onReportBarrierAtLocation,
  onSetGpsAsStart,
  onRecalculate,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const routeLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const userGpsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const gpsWatchIdRef = useRef<number | null>(null);

  // Active dynamically calculated road route
  const [currentLiveRoute, setCurrentLiveRoute] = useState<RouteOption | null>(initialActiveRoute || null);

  // Map Tile Style: 'standard' | 'highContrast' | 'satellite'
  const [mapTileStyle, setMapTileStyle] = useState<'standard' | 'highContrast' | 'satellite'>('standard');
  const [sizeMode, setSizeMode] = useState<'small' | 'standard' | 'expanded'>('standard');
  const [showLegend, setShowLegend] = useState(true);

  // Real-Time GPS Tracking State via navigator.geolocation.watchPosition()
  const [userGpsCoords, setUserGpsCoords] = useState<[number, number] | null>(startLocationCoords || null);
  const [gpsAccuracyMeters, setGpsAccuracyMeters] = useState<number | null>(null);
  const [gpsHeading, setGpsHeading] = useState<number | null>(null);
  const [gpsSpeed, setGpsSpeed] = useState<number | null>(null);
  const [userGpsStreetName, setUserGpsStreetName] = useState<string>('');
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [gpsPermissionState, setGpsPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsNotification, setGpsNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  } | null>(null);

  // Significant movement tracking for route recalculation (20-30 meters)
  const lastRouteOriginRef = useRef<[number, number] | null>(null);
  const [isRecalculatingLiveRoute, setIsRecalculatingLiveRoute] = useState(false);
  const [distanceRemainingMeters, setDistanceRemainingMeters] = useState<number | null>(null);
  const [hasReachedDestination, setHasReachedDestination] = useState<boolean>(false);

  // Layer visibility toggles
  const [visibleLayers, setVisibleLayers] = useState({
    destinations: true,
    weatherOverlay: true,
    barriers: true,
    assistance: true,
    userGps: true,
  });

  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [weatherMap, setWeatherMap] = useState<Record<string, WeatherData>>({});
  const [simulatedScenario, setSimulatedScenario] = useState<'REAL' | 'RAIN' | 'SNOW' | 'WIND' | 'CLEAR'>('REAL');
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);

  // Target Destination
  const currentDest = selectedDestination || destinations[0];

  // Sync initialActiveRoute when changed from props
  useEffect(() => {
    if (initialActiveRoute) {
      setCurrentLiveRoute(initialActiveRoute);
    }
  }, [initialActiveRoute]);

  // Invalidate map size on sizeMode toggle
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [sizeMode]);

  // Load weather data in parallel
  const loadDestinationsWeather = async () => {
    setIsLoadingWeather(true);
    const newWeatherMap: Record<string, WeatherData> = {};
    const weatherPromises = destinations.map(async (dest) => {
      try {
        const live = await fetchPublicWeather(
          dest.coordinates[0],
          dest.coordinates[1],
          dest.name,
          dest.facilities.pathSurface
        );
        return { id: dest.id, data: live };
      } catch (err) {
        return { id: dest.id, data: dest.weather };
      }
    });

    const results = await Promise.all(weatherPromises);
    results.forEach(({ id, data }) => {
      newWeatherMap[id] = data;
    });
    setWeatherMap(newWeatherMap);
    setIsLoadingWeather(false);
  };

  useEffect(() => {
    loadDestinationsWeather();
  }, [destinations]);

  // Last GPS position references to avoid unnecessary re-renders & excessive reverse geocoding
  const lastRecordedGpsPosRef = useRef<[number, number] | null>(null);
  const lastRevGeocodePosRef = useRef<[number, number] | null>(null);

  // ========================================================
  // 1. INITIALIZE LEAFLET OPENSTREETMAP INSTANCE
  // ========================================================
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Use current user GPS or selected destination coordinates as initial center
    const initialCenter: [number, number] =
      userGpsCoords || currentDest?.coordinates || [28.6139, 77.2090];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 15,
      zoomControl: true,
    });

    // OpenStreetMap Standard Tiles
    const standardTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = standardTiles;

    // Layer groups for clean management
    markersLayerGroupRef.current = L.layerGroup().addTo(map);
    routeLayerGroupRef.current = L.layerGroup().addTo(map);
    userGpsLayerGroupRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    // Start Real GPS watch
    startLiveGpsWatch();

    return () => {
      if (gpsWatchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current);
        gpsWatchIdRef.current = null;
      }
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Style Layer (Standard OSM, High Contrast, Satellite)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let attribution = '&copy; OpenStreetMap contributors';

    if (mapTileStyle === 'highContrast') {
      url = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      attribution = '&copy; OpenStreetMap &copy; CARTO';
    } else if (mapTileStyle === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = '&copy; Esri, Maxar, Earthstar Geographics';
    }

    const newLayer = L.tileLayer(url, {
      attribution,
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = newLayer;
  }, [mapTileStyle]);

  // ========================================================
  // 2. REAL GPS TRACKING ENGINE WITH navigator.geolocation.watchPosition
  // ========================================================
  const startLiveGpsWatch = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported by your browser.');
      setGpsPermissionState('denied');
      return;
    }

    setIsLocatingGps(true);

    if (gpsWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(gpsWatchIdRef.current);
      gpsWatchIdRef.current = null;
    }

    gpsWatchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, accuracy, heading, speed } = pos.coords;
        const realCoords: [number, number] = [latitude, longitude];

        // Check if user has actually moved (> 3 meters) before triggering heavy updates
        const lastPos = lastRecordedGpsPosRef.current;
        let hasMoved = true;
        if (lastPos) {
          const dLat = (latitude - lastPos[0]) * 111320;
          const dLng = (longitude - lastPos[1]) * (111320 * Math.cos((latitude * Math.PI) / 180));
          const distM = Math.sqrt(dLat * dLat + dLng * dLng);
          if (distM < 3) {
            hasMoved = false;
          }
        }

        if (hasMoved || !lastPos) {
          lastRecordedGpsPosRef.current = realCoords;
          setUserGpsCoords(realCoords);
          setGpsAccuracyMeters(Math.round(accuracy));
          setGpsPermissionState('granted');
          setGpsError(null);
          setIsLocatingGps(false);

          if (heading !== null && !isNaN(heading)) setGpsHeading(heading);
          if (speed !== null && !isNaN(speed)) setGpsSpeed(speed);

          // Only reverse geocode if user has moved at least 30 meters or first time
          const lastRev = lastRevGeocodePosRef.current;
          let shouldRevGeocode = !lastRev;
          if (lastRev) {
            const rLat = (latitude - lastRev[0]) * 111320;
            const rLng = (longitude - lastRev[1]) * (111320 * Math.cos((latitude * Math.PI) / 180));
            if (Math.sqrt(rLat * rLat + rLng * rLng) >= 30) {
              shouldRevGeocode = true;
            }
          }

          if (shouldRevGeocode) {
            lastRevGeocodePosRef.current = realCoords;
            try {
              const rev = await reverseGeocodeLocation(latitude, longitude);
              if (rev?.street) {
                setUserGpsStreetName(rev.street);
                if (onSetGpsAsStart && originMode === 'CURRENT_LOCATION' && !startLocationCoords) {
                  onSetGpsAsStart(rev.street, realCoords);
                }
              }
            } catch (_) {}
          }
        }
      },
      (err) => {
        setIsLocatingGps(false);
        let errorMsg = 'GPS location unavailable.';
        if (err.code === 1) {
          errorMsg = 'GPS permission denied. Please allow location access in your browser.';
          setGpsPermissionState('denied');
        } else if (err.code === 2) {
          errorMsg = 'Position unavailable. GPS satellites could not be reached.';
          setGpsPermissionState('denied');
        } else if (err.code === 3) {
          errorMsg = 'GPS acquisition request timed out.';
        }
        setGpsError(errorMsg);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );
  }, [onSetGpsAsStart, startLocationCoords, originMode]);

  const triggerGpsLocateNow = () => {
    if (!('geolocation' in navigator)) {
      setGpsNotification({
        message: 'Geolocation is not supported by this browser.',
        type: 'error',
      });
      setTimeout(() => setGpsNotification(null), 4000);
      return;
    }

    setIsLocatingGps(true);
    setGpsNotification({
      message: 'Acquiring high-precision GPS satellite lock...',
      type: 'info',
    });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy, heading, speed } = pos.coords;
        const coords: [number, number] = [latitude, longitude];

        console.log('[GPS Navigation] GPS Force Locate result:', {
          latitude,
          longitude,
          accuracyMeters: Math.round(accuracy),
        });

        setUserGpsCoords(coords);
        setGpsAccuracyMeters(Math.round(accuracy));
        setIsLocatingGps(false);
        setGpsError(null);
        setGpsPermissionState('granted');
        if (heading !== null && !isNaN(heading)) setGpsHeading(heading);
        if (speed !== null && !isNaN(speed)) setGpsSpeed(speed);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo(coords, 16, { duration: 1.2 });
        }

        const rev = await reverseGeocodeLocation(latitude, longitude);
        if (rev?.street) {
          setUserGpsStreetName(rev.street);
          if (onSetGpsAsStart) onSetGpsAsStart(rev.street, coords);
        }

        setGpsNotification({
          message: `📍 GPS Locked! ±${Math.round(accuracy)}m (${rev?.street || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`})`,
          type: 'success',
        });
        setTimeout(() => setGpsNotification(null), 4000);
      },
      (err) => {
        setIsLocatingGps(false);
        const errTxt =
          err.code === 1
            ? 'GPS access permission was denied in browser.'
            : 'Unable to acquire satellite GPS fix.';
        setGpsError(errTxt);
        setGpsPermissionState('denied');
        setGpsNotification({
          message: errTxt,
          type: 'error',
        });
        setTimeout(() => setGpsNotification(null), 4500);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  // ========================================================
  // 3. REAL OSRM ROUTE CALCULATION & RECALCULATION ON SIGNIFICANT MOVEMENT (20-30m)
  // ========================================================
  const computeAndSetRealRoadRoute = useCallback(
    async (originCoords: [number, number], destCoords: [number, number], destName: string, customOriginName?: string) => {
      setIsRecalculatingLiveRoute(true);
      const originDisplayName = customOriginName || (originMode === 'CUSTOM' ? startLocationName : (userGpsStreetName || 'My Current Location'));
      console.log('[Route Planning] Calculating real OSRM road route to destination:', {
        originMode,
        originCoordinates: originCoords,
        originName: originDisplayName,
        destinationCoordinates: destCoords,
        destinationName: destName,
      });

      try {
        const osrmResult = await fetchOsrmRoute(
          originCoords,
          destCoords,
          'walking',
          destName,
          originDisplayName
        );

        if (osrmResult && osrmResult.pathCoordinates.length >= 2) {
          const distKm = Math.round((osrmResult.distanceMeters / 1000) * 100) / 100;
          const durationMins = Math.max(1, Math.round(osrmResult.durationSeconds / 60));

          const newRoute: RouteOption = {
            id: `route-live-${Date.now()}`,
            name: `Verified Step-Free Route to ${destName}`,
            tag: 'RECOMMENDED',
            distanceKm: distKm,
            durationMinutes: durationMins,
            accessibilityScore: 98,
            crowdLevel: 'LOW',
            stairsCount: 0,
            rampAvailable: true,
            liftAvailable: true,
            currentBarriers: false,
            assistanceAvailable: true,
            isBestMatch: true,
            suitabilityNote: `Real road-following step-free corridor calculated directly from ${originDisplayName}.`,
            steps: osrmResult.steps,
            pathCoordinates: osrmResult.pathCoordinates,
          };

          setCurrentLiveRoute(newRoute);
          setDistanceRemainingMeters(osrmResult.distanceMeters);
          lastRouteOriginRef.current = originCoords;

          console.log('[Route Planning] Route calculation complete:', {
            totalDistanceMeters: osrmResult.distanceMeters,
            durationMinutes: durationMins,
            waypointsCount: osrmResult.pathCoordinates.length,
          });
        }
      } catch (e) {
        console.error('[Route Planning] Error calculating live OSRM route:', e);
      } finally {
        setIsRecalculatingLiveRoute(false);
      }
    },
    [userGpsStreetName, originMode, startLocationName]
  );

  // Recalculate route when destination, start location, or originMode changes
  useEffect(() => {
    if (!currentDest || !currentDest.coordinates) return;

    const origin = originMode === 'CUSTOM'
      ? (startLocationCoords || userGpsCoords)
      : (userGpsCoords || startLocationCoords);
    if (!origin) return;

    const originLabel = originMode === 'CUSTOM' ? startLocationName : (userGpsStreetName || 'My Current Location');
    computeAndSetRealRoadRoute(origin, currentDest.coordinates, currentDest.name, originLabel);
  }, [currentDest?.id, startLocationCoords, startLocationName, originMode, isNavigating, computeAndSetRealRoadRoute]);

  // Recalculate route ONLY when in CURRENT_LOCATION mode and GPS position changes significantly (>= 25 meters)
  useEffect(() => {
    if (originMode !== 'CURRENT_LOCATION') return;
    if (!userGpsCoords || !currentDest?.coordinates) return;

    if (!lastRouteOriginRef.current) {
      lastRouteOriginRef.current = userGpsCoords;
      return;
    }

    const distMovedMeters = calculateDistanceMeters(lastRouteOriginRef.current, userGpsCoords);

    // Recalculate if user moved >= 25 meters in CURRENT_LOCATION mode
    if (distMovedMeters >= 25) {
      console.log(
        `[GPS Navigation] Significant movement detected in Current Location mode (${distMovedMeters.toFixed(1)}m >= 25m). Recalculating OSRM route from new GPS position...`
      );
      computeAndSetRealRoadRoute(userGpsCoords, currentDest.coordinates, currentDest.name, userGpsStreetName || 'My Current Location');
    } else {
      // Update distance remaining to destination
      const distToDestMeters = calculateDistanceMeters(userGpsCoords, currentDest.coordinates);
      setDistanceRemainingMeters(Math.round(distToDestMeters));

      // Arrival check: user within 15 meters of destination
      if (distToDestMeters <= 15 && isNavigating && !hasReachedDestination) {
        setHasReachedDestination(true);
        confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
        setGpsNotification({
          message: `🎉 You have arrived at ${currentDest.name}!`,
          type: 'success',
        });
      }
    }
  }, [userGpsCoords, currentDest, isNavigating, computeAndSetRealRoadRoute, hasReachedDestination, originMode, userGpsStreetName]);

  // Automatically center map on user's real GPS position when navigation starts
  useEffect(() => {
    if (isNavigating && userGpsCoords && mapInstanceRef.current) {
      console.log('[GPS Navigation] Navigation started: Centering map on real user GPS position:', userGpsCoords);
      mapInstanceRef.current.flyTo(userGpsCoords, 17, { duration: 1.2 });
    }
  }, [isNavigating]);

  // ========================================================
  // 4. RENDER LIVE "YOU ARE HERE" BLUE GPS MARKER (STATIONARY UNLESS GPS UPDATES)
  // ========================================================
  useEffect(() => {
    const map = mapInstanceRef.current;
    const gpsLayer = userGpsLayerGroupRef.current;
    if (!map || !gpsLayer) return;

    gpsLayer.clearLayers();

    if (!userGpsCoords || !visibleLayers.userGps) return;

    // 1. Accuracy Circle (visualizing actual GPS accuracy in meters)
    if (gpsAccuracyMeters && gpsAccuracyMeters < 1000) {
      const accuracyCircle = L.circle(userGpsCoords, {
        radius: gpsAccuracyMeters,
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.12,
        weight: 1.5,
        dashArray: '4, 4',
      });
      gpsLayer.addLayer(accuracyCircle);
    }

    // 2. Real Blue GPS Location Puck with Heading Direction Arrow
    const headingDegree = gpsHeading !== null && !isNaN(gpsHeading) ? gpsHeading : 0;
    const showHeading = gpsHeading !== null && !isNaN(gpsHeading);

    const gpsHtml = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 48px; height: 48px;">
        <!-- Pulsing Wave -->
        <div style="
          position: absolute;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(37, 99, 235, 0.25);
          border: 2px solid #2563eb;
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>

        ${
          showHeading
            ? `
          <!-- GPS Heading Cone Indicator -->
          <div style="
            position: absolute;
            width: 0;
            height: 0;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-bottom: 16px solid #2563eb;
            top: 1px;
            transform: rotate(${headingDegree}deg);
            transform-origin: center 23px;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));
          "></div>
        `
            : ''
        }

        <!-- Center Glowing Blue Puck -->
        <div style="
          position: relative;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #2563eb;
          border: 3.5px solid white;
          box-shadow: 0 0 16px rgba(37, 99, 235, 0.9), 0 3px 8px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="width: 5px; height: 5px; border-radius: 50%; background: white;"></div>
        </div>

        <!-- "You Are Here" Pill -->
        <div style="
          position: absolute;
          bottom: -18px;
          background: #0f172a;
          color: #93c5fd;
          border: 1px solid #3b82f6;
          border-radius: 9999px;
          padding: 1px 7px;
          font-size: 9px;
          font-weight: 800;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          gap: 3px;
        ">
          <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: #3b82f6; animation: pulse 1.2s infinite;"></span>
          <span>You Are Here</span>
        </div>
      </div>
    `;

    const gpsIcon = L.divIcon({
      html: gpsHtml,
      className: 'live-gps-puck',
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });

    const liveGpsMarker = L.marker(userGpsCoords, { icon: gpsIcon, zIndexOffset: 1100 });
    liveGpsMarker.bindPopup(`
      <div style="font-family: 'Playfair Display', Georgia, serif; min-width: 230px;">
        <div style="color: #2563eb; font-weight: 800; font-size: 13px; margin-bottom: 3px; display: flex; align-items: center; gap: 4px;">
          <span>📍 Real Device GPS Position</span>
        </div>
        <div style="font-size: 11px; font-weight: 700; color: #0f172a;">${userGpsStreetName || 'Live Position'}</div>
        <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
          Latitude: ${userGpsCoords[0].toFixed(6)}°<br/>
          Longitude: ${userGpsCoords[1].toFixed(6)}°
        </div>
        ${
          gpsAccuracyMeters
            ? `<div style="font-size: 10px; color: ${gpsAccuracyMeters < 30 ? '#059669' : '#d97706'}; font-weight: 700; margin-top: 4px;">
                ${gpsAccuracyMeters < 30 ? '✓ High Accuracy' : '⚠️ Accuracy'}: ±${gpsAccuracyMeters}m
              </div>`
            : ''
        }
      </div>
    `);

    gpsLayer.addLayer(liveGpsMarker);
  }, [userGpsCoords, gpsAccuracyMeters, gpsHeading, userGpsStreetName, visibleLayers.userGps]);

  // ========================================================
  // 5. RENDER DESTINATIONS & BARRIER ACCESSIBILITY LAYERS
  // ========================================================
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = markersLayerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // 1. Destination Markers
    if (visibleLayers.destinations) {
      destinations.forEach((dest) => {
        const isSelected = currentDest?.id === dest.id;
        const baseWeather = weatherMap[dest.id] || dest.weather;
        const effectiveWeather = getSimulatedWeatherScenario(
          simulatedScenario,
          baseWeather,
          dest.facilities.pathSurface
        );
        const isHazard = effectiveWeather.hazardLevel === 'WARNING' || effectiveWeather.hazardLevel === 'CRITICAL';

        const iconHtml = `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            ${
              visibleLayers.weatherOverlay
                ? `
                <div style="
                  position: absolute;
                  top: -16px;
                  background: ${isHazard ? '#dc2626' : '#1e293b'};
                  color: white;
                  padding: 1px 5px;
                  border-radius: 9999px;
                  font-size: 9px;
                  font-weight: 800;
                  white-space: nowrap;
                  border: 1px solid ${isHazard ? '#fca5a5' : '#475569'};
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                  display: flex;
                  align-items: center;
                  gap: 3px;
                  z-index: 10;
                ">
                  <span>${effectiveWeather.temperatureC}°C</span>
                  <span>${effectiveWeather.condition.includes('Rain') ? '🌧️' : effectiveWeather.condition.includes('Snow') ? '❄️' : '☀️'}</span>
                </div>
              `
                : ''
            }
            <div style="
              width: ${isSelected ? '38px' : '30px'};
              height: ${isSelected ? '38px' : '30px'};
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              background: ${isSelected ? '#2563eb' : '#059669'};
              border: 2.5px solid white;
              box-shadow: 0 4px 12px rgba(0,0,0,0.35);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              transition: all 0.2s;
            ">
              <div style="transform: rotate(45deg); font-size: ${isSelected ? '14px' : '11px'}; font-weight: 800;">
                ♿
              </div>
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'destination-marker',
          iconSize: [38, 38],
          iconAnchor: [19, 38],
        });

        const marker = L.marker(dest.coordinates, { icon: customIcon });
        marker.on('click', () => {
          if (onSelectDestination) {
            onSelectDestination(dest);
          }
        });

        marker.bindPopup(`
          <div style="font-family: 'Playfair Display', Georgia, serif; min-width: 220px;">
            <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 2px;">${dest.name}</div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">${dest.city}, ${dest.country}</div>
            <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
              <span style="background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; font-weight: 800; font-size: 10px; padding: 2px 6px; border-radius: 6px;">
                Score: ${dest.accessibilityScore.overall}/100
              </span>
              <span style="background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; font-weight: 700; font-size: 10px; padding: 2px 6px; border-radius: 6px;">
                ✓ 100% Step-Free
              </span>
            </div>
            <div style="font-size: 11px; color: #334155; line-height: 1.4;">${dest.description.slice(0, 95)}...</div>
          </div>
        `);

        layerGroup.addLayer(marker);
      });
    }

    // 2. Barrier Alerts (🚧)
    if (visibleLayers.barriers) {
      barriers.forEach((barrier) => {
        const isActive = barrier.status === 'ACTIVE_BARRIER' || barrier.status === 'REPORTED';
        const iconHtml = `
          <div style="
            background-color: ${isActive ? '#dc2626' : '#9ca3af'};
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.35);
            border: 2px solid white;
            animation: ${isActive ? 'pulse 1.8s infinite' : 'none'};
          ">
            🚧
          </div>
        `;
        const barrierIcon = L.divIcon({
          html: iconHtml,
          className: 'barrier-marker',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const marker = L.marker(barrier.coordinates, { icon: barrierIcon });
        marker.bindPopup(`
          <div style="min-width: 200px; font-family: 'Playfair Display', Georgia, serif;">
            <div style="font-weight: 800; color: #dc2626; font-size: 12px; margin-bottom: 2px;">🚧 Barrier: ${barrier.title}</div>
            <div style="font-size: 11px; color: #475569;">${barrier.description}</div>
          </div>
        `);
        layerGroup.addLayer(marker);
      });
    }
  }, [destinations, barriers, currentDest, visibleLayers, simulatedScenario, weatherMap]);

  // ========================================================
  // 6. RENDER REAL OSRM ROAD-FOLLOWING BLUE POLYLINE & A/B MARKERS
  // ========================================================
  useEffect(() => {
    const map = mapInstanceRef.current;
    const routeLayer = routeLayerGroupRef.current;
    if (!map || !routeLayer) return;

    routeLayer.clearLayers();

    const routeToDraw = currentLiveRoute || initialActiveRoute;
    if (!routeToDraw || !routeToDraw.pathCoordinates || routeToDraw.pathCoordinates.length < 2) {
      return;
    }

    const pathCoords = routeToDraw.pathCoordinates;
    const originCoords = pathCoords[0];
    const destinationCoords = pathCoords[pathCoords.length - 1];

    // 1. Origin Marker (Green Pin "A" at user GPS origin)
    const originHtml = `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="
          background: #0f172a;
          color: #34d399;
          border: 1.5px solid #10b981;
          border-radius: 9999px;
          padding: 2px 8px;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 3px;
        ">
          <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></span>
          <span>Origin: ${originMode === 'CUSTOM' ? (startLocationName ? startLocationName.split(',')[0] : 'Custom Origin') : (userGpsStreetName || startLocationName.split(',')[0] || 'Current Location')}</span>
        </div>

        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #059669;
          border: 3px solid white;
          box-shadow: 0 0 14px rgba(16, 185, 129, 0.8), 0 4px 10px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 14px;
          font-weight: 900;
        ">
          A
        </div>
      </div>
    `;

    const originDivIcon = L.divIcon({
      html: originHtml,
      className: 'gmaps-origin-marker',
      iconSize: [160, 54],
      iconAnchor: [80, 48],
    });

    const originMarker = L.marker(originCoords, { icon: originDivIcon, zIndexOffset: 800 });
    originMarker.bindPopup(`
      <div style="font-family: 'Playfair Display', Georgia, serif; min-width: 210px;">
        <div style="color: #059669; font-weight: 800; font-size: 12px; margin-bottom: 2px;">🟢 Route Departure (Origin A)</div>
        <div style="font-weight: 700; font-size: 13px; color: #0f172a;">${originMode === 'CUSTOM' ? startLocationName : (userGpsStreetName || startLocationName)}</div>
        <div style="font-size: 10px; color: #64748b; margin-top: 3px;">Coordinates: ${originCoords[0].toFixed(5)}°, ${originCoords[1].toFixed(5)}°</div>
      </div>
    `);
    routeLayer.addLayer(originMarker);

    // 2. Destination Marker (Red Teardrop Pin "B")
    const destHtml = `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="
          background: #0f172a;
          color: #fca5a5;
          border: 1.5px solid #ef4444;
          border-radius: 9999px;
          padding: 2px 8px;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 2px;
        ">
          <span>🏁 ${currentDest.name} (B)</span>
        </div>

        <div style="
          width: 34px;
          height: 34px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          background: #dc2626;
          border: 3px solid white;
          box-shadow: 0 0 16px rgba(220, 38, 38, 0.8), 0 4px 10px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin-top: 2px;
        ">
          <div style="transform: rotate(45deg); font-size: 13px; font-weight: 900;">★</div>
        </div>
      </div>
    `;

    const destDivIcon = L.divIcon({
      html: destHtml,
      className: 'gmaps-destination-marker',
      iconSize: [180, 56],
      iconAnchor: [90, 50],
    });

    const destMarker = L.marker(destinationCoords, { icon: destDivIcon, zIndexOffset: 850 });
    destMarker.bindPopup(`
      <div style="font-family: 'Playfair Display', Georgia, serif; min-width: 210px;">
        <div style="color: #dc2626; font-weight: 800; font-size: 12px; margin-bottom: 2px;">🔴 Route Destination (B)</div>
        <div style="font-weight: 800; font-size: 14px; color: #0f172a;">${currentDest.name}</div>
        <div style="font-size: 11px; color: #059669; font-weight: 700; margin-top: 4px;">✓ 100% Step-Free Accessible Entrance</div>
        <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Coordinates: ${destinationCoords[0].toFixed(5)}°, ${destinationCoords[1].toFixed(5)}°</div>
      </div>
    `);
    routeLayer.addLayer(destMarker);

    // 3. Draw Real Road-Following Blue Polyline (Google Maps Style)
    const fullCasing = L.polyline(pathCoords, {
      color: '#0d47a1',
      weight: 10,
      opacity: 0.65,
      lineCap: 'round',
      lineJoin: 'round',
    });
    const fullBlue = L.polyline(pathCoords, {
      color: '#1a73e8',
      weight: 6,
      opacity: 0.98,
      lineCap: 'round',
      lineJoin: 'round',
    });
    routeLayer.addLayer(fullCasing);
    routeLayer.addLayer(fullBlue);

    // Fit route bounds if not navigating
    if (!isNavigating) {
      try {
        const bounds = fullBlue.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        }
      } catch (_) {}
    }

    // 4. Turn Waypoint Maneuvers along the road
    if (routeToDraw.steps) {
      routeToDraw.steps.forEach((step, idx) => {
        if (!step.coordinates) return;
        const waypointMarker = L.circleMarker(step.coordinates, {
          radius: 4.5,
          fillColor: '#ffffff',
          color: '#1a73e8',
          weight: 2.5,
          fillOpacity: 1,
        });

        waypointMarker.bindPopup(`
          <div style="font-family: 'Playfair Display', Georgia, serif; min-width: 200px;">
            <div style="font-size: 11px; font-weight: 800; color: #1a73e8; margin-bottom: 2px;">Step ${idx + 1} of ${routeToDraw.steps.length}</div>
            <div style="font-weight: 700; font-size: 12px; color: #0f172a; margin-bottom: 4px;">${step.instruction}</div>
            <div style="font-size: 10px; color: #64748b;">${step.distanceMeters}m • ${step.surface} • 0 Stairs</div>
          </div>
        `);
        routeLayer.addLayer(waypointMarker);
      });
    }
  }, [currentLiveRoute, initialActiveRoute, isNavigating, currentDest, startLocationName, userGpsStreetName]);

  // Fit entire route manually
  const handleFitEntireRoute = () => {
    if (!mapInstanceRef.current) return;
    const activeCoords = currentLiveRoute?.pathCoordinates || initialActiveRoute?.pathCoordinates;
    if (activeCoords && activeCoords.length >= 2) {
      const bounds = L.latLngBounds(activeCoords);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    } else if (currentDest) {
      mapInstanceRef.current.flyTo(currentDest.coordinates, 15);
    }
  };

  // Center on user real GPS
  const handleCenterOnGps = () => {
    if (!userGpsCoords) {
      triggerGpsLocateNow();
      return;
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(userGpsCoords, 17, { duration: 1.2 });
    }
  };

  // Current Step details for top HUD banner
  const activeRouteData = currentLiveRoute || initialActiveRoute;
  const currentStep: RouteStep | undefined =
    activeRouteData?.steps && activeRouteData.steps[activeStepIndex]
      ? activeRouteData.steps[activeStepIndex]
      : activeRouteData?.steps?.[0];

  const totalSteps = activeRouteData?.steps?.length || 1;

  const getManeuverIcon = (instruction = '') => {
    const text = instruction.toLowerCase();
    if (text.includes('left')) return <CornerUpLeft className="w-5 h-5 text-emerald-400" />;
    if (text.includes('right')) return <CornerUpRight className="w-5 h-5 text-emerald-400" />;
    if (text.includes('ramp')) return <Footprints className="w-5 h-5 text-blue-400" />;
    if (text.includes('arrive') || text.includes('enter') || text.includes('gate'))
      return <Flag className="w-5 h-5 text-rose-400" />;
    return <ArrowUp className="w-5 h-5 text-emerald-400" />;
  };

  const heightClass =
    sizeMode === 'small'
      ? 'h-[320px] sm:h-[360px] md:h-[390px]'
      : sizeMode === 'standard'
      ? 'h-[420px] sm:h-[480px] md:h-[520px]'
      : 'h-[540px] sm:h-[600px] md:h-[680px]';

  return (
    <div
      className={`relative w-full ${heightClass} rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl transition-all duration-300`}
    >
      {/* Map Container Element */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* ========================================================
          GPS PERMISSION DENIED OR ERROR BANNER
          ======================================================== */}
      {gpsError && (
        <div className="absolute top-2.5 sm:top-3.5 left-2.5 sm:left-3.5 right-2.5 sm:right-3.5 z-[500] bg-rose-950/95 backdrop-blur-xl border border-rose-500/60 text-white rounded-2xl p-3 sm:p-4 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <div className="text-xs">
              <div className="font-bold text-rose-200">GPS Location Required for Live Navigation</div>
              <div className="text-rose-300 text-[11px] truncate">{gpsError}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={triggerGpsLocateNow}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0 transition-colors shadow-md"
          >
            Allow GPS Access
          </button>
        </div>
      )}

      {/* ========================================================
          ACTIVE REAL-TIME GPS NAVIGATION TOP HUD BANNER
          ======================================================== */}
      {isNavigating && activeRouteData && (
        <div className="absolute top-2.5 sm:top-3.5 left-2.5 sm:left-3.5 right-2.5 sm:right-3.5 z-[500] bg-slate-950/95 backdrop-blur-xl border border-blue-500/40 text-white rounded-2xl p-3 sm:p-4 shadow-2xl space-y-2.5 animate-in fade-in slide-in-from-top-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-2.5 sm:p-3 rounded-xl bg-blue-600/30 border border-blue-500/60 shrink-0">
                {getManeuverIcon(currentStep?.instruction)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-black text-[10px] uppercase tracking-wider">
                    Step {activeStepIndex + 1} of {totalSteps}
                  </span>
                  <span className="text-xs text-blue-300 font-semibold truncate">
                    {activeRouteData.name}
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-white truncate mt-0.5">
                  {currentStep?.instruction || 'Proceed along verified step-free corridor'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Recalculate indicator */}
              {isRecalculatingLiveRoute && (
                <div className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-300 text-[10px] font-bold animate-pulse flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Recalculating...</span>
                </div>
              )}

              {/* Center Real GPS button */}
              <button
                type="button"
                onClick={handleCenterOnGps}
                className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1"
                title="Center camera on your real GPS location"
              >
                <LocateFixed className="w-4 h-4" />
                <span className="hidden md:inline">My GPS</span>
              </button>

              {onStopNavigation && (
                <button
                  type="button"
                  onClick={onStopNavigation}
                  className="p-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white transition-colors"
                  title="Exit Navigation"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* GPS Live Telemetry & Remaining Distance */}
          <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1 border-t border-slate-800">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Live GPS Tracking</span>
              </span>
              {gpsAccuracyMeters && (
                <span className="text-slate-400">
                  Accuracy: ±{gpsAccuracyMeters}m
                </span>
              )}
            </div>
            {distanceRemainingMeters !== null && (
              <div className="font-bold text-white">
                Remaining: {(distanceRemainingMeters / 1000).toFixed(2)} km
              </div>
            )}
          </div>
        </div>
      )}

      {/* GPS Status Toast Notification */}
      {gpsNotification && (
        <div className="absolute top-14 sm:top-16 left-1/2 -translate-x-1/2 z-[500] px-4 py-2 rounded-2xl bg-slate-950/95 text-white text-xs font-bold shadow-2xl backdrop-blur-md border border-blue-500/40 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 max-w-[90%] text-center">
          {gpsNotification.type === 'info' ? (
            <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse shrink-0" />
          ) : gpsNotification.type === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : gpsNotification.type === 'warning' ? (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          )}
          <span className="truncate">{gpsNotification.message}</span>
        </div>
      )}

      {/* Top Floating Control Bar (When NOT navigating) */}
      {!isNavigating && !gpsError && (
        <div className="absolute top-2.5 sm:top-3.5 left-2.5 sm:left-3.5 right-2.5 sm:right-3.5 z-[400] flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 pointer-events-none">
          {/* Weather Overlay Quick Bar */}
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 p-1 sm:p-1.5 flex items-center gap-1 sm:gap-1.5 pointer-events-auto text-xs">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-200 px-1.5 flex items-center gap-1">
              <CloudRain className="w-3 h-3 text-blue-500" />
              <span className="hidden sm:inline">Weather:</span>
            </span>

            {[
              { id: 'REAL', label: '🛰️ Live', title: 'Live Open-Meteo API' },
              { id: 'RAIN', label: '🌧️ Rain', title: 'Simulate Rain & Slippery Ramps' },
              { id: 'SNOW', label: '❄️ Snow', title: 'Simulate Snow & Frozen Paths' },
              { id: 'WIND', label: '💨 Wind', title: 'Simulate High Winds (>40km/h)' },
            ].map((sc) => (
              <button
                key={sc.id}
                onClick={() => setSimulatedScenario(sc.id as any)}
                title={sc.title}
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-bold transition-all ${
                  simulatedScenario === sc.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {sc.label}
              </button>
            ))}

            <button
              onClick={loadDestinationsWeather}
              className="p-1 sm:p-1.5 rounded-lg sm:rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              title="Refresh Live Weather from Open-Meteo"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingWeather ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Quick Controls: Real GPS Lock, Fit Route, Map Style */}
          <div className="flex items-center gap-1 sm:gap-1.5 pointer-events-auto">
            {/* Real GPS Location Button */}
            <button
              onClick={triggerGpsLocateNow}
              disabled={isLocatingGps}
              className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              title="Acquire live GPS satellite fix from browser"
            >
              <LocateFixed className={`w-3.5 h-3.5 ${isLocatingGps ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {userGpsCoords ? 'My GPS' : 'Get Real GPS'}
              </span>
            </button>

            {/* Fit Complete Route */}
            {activeRouteData && (
              <button
                onClick={handleFitEntireRoute}
                className="p-1.5 sm:p-2 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-md border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-all"
                title="Fit complete route in view"
              >
                <Crosshair className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Map Tile Style Switcher */}
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 p-0.5 sm:p-1 flex items-center gap-0.5">
              {(['standard', 'highContrast', 'satellite'] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => setMapTileStyle(style)}
                  className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-bold uppercase transition-all ${
                    mapTileStyle === style
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {style === 'standard' ? 'OSM' : style === 'highContrast' ? 'Contrast' : 'Sat'}
                </button>
              ))}
            </div>

            {/* Size expand toggle */}
            <button
              onClick={() => {
                setSizeMode((prev) => (prev === 'standard' ? 'expanded' : prev === 'expanded' ? 'small' : 'standard'));
              }}
              className="p-1.5 sm:p-2 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-md border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-all"
              title="Toggle map height"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Bottom Left: GPS Coordinates & Route Info Badge */}
      <div className="absolute bottom-2.5 sm:bottom-3.5 left-2.5 sm:left-3.5 z-[400] flex flex-col gap-1.5 pointer-events-auto max-w-[85%] sm:max-w-xs">
        {userGpsCoords && (
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 p-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-blue-600 font-bold">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                <span>Real Device GPS Active</span>
              </div>
              {gpsAccuracyMeters !== null && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  ±{gpsAccuracyMeters}m
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5">
              {userGpsStreetName || `${userGpsCoords[0].toFixed(5)}°, ${userGpsCoords[1].toFixed(5)}°`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
