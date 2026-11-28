import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Layers,
  MapPin,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Navigation,
  Compass,
  Crosshair,
  ShieldCheck,
  Info,
  Sun,
  CloudRain,
  Radio,
  Footprints,
  Sparkles,
} from 'lucide-react';
import { Destination, RouteOption, BarrierReport, WeatherData } from '../../types';

interface JourneyMapViewerProps {
  destination: Destination;
  originName: string;
  originCoords?: [number, number] | null;
  originMode: 'CURRENT_LOCATION' | 'CUSTOM';
  currentGpsCoords?: [number, number] | null;
  activeRoute?: RouteOption | null;
  barriers?: BarrierReport[];
  weather?: WeatherData | null;
  isNavigating?: boolean;
  activeStepIndex?: number;
  onSelectStepIndex?: (idx: number) => void;
  onRecenter?: () => void;
}

export const JourneyMapViewer: React.FC<JourneyMapViewerProps> = ({
  destination,
  originName,
  originCoords,
  originMode,
  currentGpsCoords,
  activeRoute,
  barriers = [],
  weather,
  isNavigating = false,
  activeStepIndex = 0,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const routeGroupRef = useRef<L.LayerGroup | null>(null);

  const [mapStyle, setMapStyle] = useState<'standard' | 'highContrast' | 'satellite'>('standard');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [showFacilities, setShowFacilities] = useState(true);
  const [showBarriers, setShowBarriers] = useState(true);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialCenter: [number, number] =
      originCoords || destination?.coordinates || [28.6139, 77.209];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 14,
      zoomControl: false,
    });

    const standardTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = standardTiles;
    markersGroupRef.current = L.layerGroup().addTo(map);
    routeGroupRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Handle Map Style Switch (Standard, High Contrast, Satellite)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let attribution = '&copy; OpenStreetMap contributors';

    if (mapStyle === 'highContrast') {
      url = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      attribution = '&copy; OpenStreetMap &copy; CARTO';
    } else if (mapStyle === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = '&copy; Esri, Maxar';
    }

    const newLayer = L.tileLayer(url, { attribution, maxZoom: 19 }).addTo(map);
    tileLayerRef.current = newLayer;
  }, [mapStyle]);

  // 3. Render Route, Origin, Destination, Facilities & Barriers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersGroupRef.current;
    const routeLayer = routeGroupRef.current;
    if (!map || !markersLayer || !routeLayer) return;

    markersLayer.clearLayers();
    routeLayer.clearLayers();

    const boundsPoints: [number, number][] = [];

    // --- A. Render Origin Marker ---
    const effectiveOrigin = originCoords || currentGpsCoords || [28.6139, 77.209];
    boundsPoints.push(effectiveOrigin);

    const isGpsMode = originMode === 'CURRENT_LOCATION';
    const originLabel = isGpsMode ? '📍 Current Location' : '📌 Selected Origin';

    const originHtml = `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 44px; height: 44px;">
        <div style="
          position: absolute;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: ${isGpsMode ? 'rgba(37, 99, 235, 0.25)' : 'rgba(5, 150, 105, 0.25)'};
          border: 2px solid ${isGpsMode ? '#2563eb' : '#059669'};
          animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        <div style="
          position: relative;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: ${isGpsMode ? '#2563eb' : '#059669'};
          border: 3.5px solid white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 10px;
          font-weight: 800;
        ">
          ${isGpsMode ? '📍' : '📌'}
        </div>
        <div style="
          position: absolute;
          bottom: -20px;
          background: #0f172a;
          color: white;
          border: 1px solid ${isGpsMode ? '#3b82f6' : '#10b981'};
          border-radius: 9999px;
          padding: 2px 8px;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        ">
          ${originLabel}
        </div>
      </div>
    `;

    const originIcon = L.divIcon({
      html: originHtml,
      className: 'origin-marker',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const originMarker = L.marker(effectiveOrigin, { icon: originIcon, zIndexOffset: 1000 });
    originMarker.bindPopup(`
      <div style="min-width: 180px;">
        <div style="color: ${isGpsMode ? '#2563eb' : '#059669'}; font-weight: 800; font-size: 12px;">
          ${originLabel}
        </div>
        <div style="font-size: 11px; font-weight: 700; color: #0f172a; margin-top: 2px;">
          ${originName}
        </div>
        <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
          Lat: ${effectiveOrigin[0].toFixed(5)}, Lng: ${effectiveOrigin[1].toFixed(5)}
        </div>
      </div>
    `);
    markersLayer.addLayer(originMarker);

    // --- B. Render Destination Marker ---
    if (destination && destination.coordinates) {
      const destCoords = destination.coordinates;
      boundsPoints.push(destCoords);

      const destHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
          <div style="
            width: 36px;
            height: 36px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            background: #dc2626;
            border: 2.5px solid white;
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.45);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
          ">
            <div style="transform: rotate(45deg); font-size: 13px; font-weight: 800;">
              🏛️
            </div>
          </div>
          <div style="
            background: #0f172a;
            color: #fef08a;
            border: 1px solid #dc2626;
            border-radius: 9999px;
            padding: 2px 8px;
            font-size: 10px;
            font-weight: 800;
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(0,0,0,0.35);
            margin-top: 2px;
          ">
            ${destination.name}
          </div>
        </div>
      `;

      const destIcon = L.divIcon({
        html: destHtml,
        className: 'dest-marker',
        iconSize: [36, 48],
        iconAnchor: [18, 48],
      });

      const destMarker = L.marker(destCoords, { icon: destIcon, zIndexOffset: 950 });
      destMarker.bindPopup(`
        <div style="min-width: 200px;">
          <div style="color: #dc2626; font-weight: 800; font-size: 12px;">
            Target Destination
          </div>
          <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-top: 2px;">
            ${destination.name}
          </div>
          <div style="font-size: 10px; color: #059669; font-weight: 700; margin-top: 3px;">
            ✓ ${destination.accessibilityScore || 98}% Accessibility Score (0 Stairs)
          </div>
        </div>
      `);
      markersLayer.addLayer(destMarker);
    }

    // --- C. Render Real Calculated Road Route Polyline ---
    if (activeRoute?.pathCoordinates && activeRoute.pathCoordinates.length >= 2) {
      activeRoute.pathCoordinates.forEach((pt) => boundsPoints.push(pt));

      // Outer glow polyline
      const glowPolyline = L.polyline(activeRoute.pathCoordinates, {
        color: '#60a5fa',
        weight: 9,
        opacity: 0.5,
        lineCap: 'round',
        lineJoin: 'round',
      });
      routeLayer.addLayer(glowPolyline);

      // Core route polyline
      const corePolyline = L.polyline(activeRoute.pathCoordinates, {
        color: '#2563eb',
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      });
      routeLayer.addLayer(corePolyline);

      // Step waypoints with turn instructions
      if (activeRoute.steps && activeRoute.steps.length > 0) {
        activeRoute.steps.forEach((st, sIdx) => {
          if (st.coordinates) {
            const stepHtml = `
              <div style="
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: ${sIdx === activeStepIndex && isNavigating ? '#059669' : '#2563eb'};
                color: white;
                border: 2px solid white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 9px;
                font-weight: 900;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
              ">
                ${sIdx + 1}
              </div>
            `;
            const stepIcon = L.divIcon({
              html: stepHtml,
              className: 'step-waypoint',
              iconSize: [18, 18],
              iconAnchor: [9, 9],
            });
            const stepMarker = L.marker(st.coordinates, { icon: stepIcon });
            stepMarker.bindPopup(`
              <div style="font-size: 11px;">
                <strong>Step ${sIdx + 1}:</strong> ${st.instruction}<br/>
                <span style="color: #64748b; font-size: 10px;">${st.distanceMeters}m • ${st.surface || 'Paved Walkway'}</span>
              </div>
            `);
            markersLayer.addLayer(stepMarker);
          }
        });
      }
    } else if (destination?.coordinates && effectiveOrigin) {
      // Direct connection line fallback
      const directLine = L.polyline([effectiveOrigin, destination.coordinates], {
        color: '#3b82f6',
        weight: 4,
        dashArray: '6, 8',
        opacity: 0.8,
      });
      routeLayer.addLayer(directLine);
    }

    // --- D. Render Reported Accessibility Barriers ---
    if (showBarriers && barriers.length > 0) {
      barriers.forEach((b) => {
        if (!b.coordinates) return;
        const bHtml = `
          <div style="
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: #d97706;
            color: white;
            border: 2px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          ">
            ⚠️
          </div>
        `;
        const bIcon = L.divIcon({
          html: bHtml,
          className: 'barrier-marker',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
        const bMarker = L.marker(b.coordinates, { icon: bIcon });
        bMarker.bindPopup(`
          <div style="font-size: 11px; min-width: 170px;">
            <div style="color: #d97706; font-weight: 800;">⚠️ ${b.type.replace('_', ' ')}</div>
            <div style="margin-top: 2px; color: #0f172a;">${b.description}</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Severity: ${b.severity}</div>
          </div>
        `);
        markersLayer.addLayer(bMarker);
      });
    }

    // --- E. Fit Map Bounds Cleanly with Smooth Animation ---
    if (boundsPoints.length >= 2) {
      try {
        const latLngBounds = L.latLngBounds(boundsPoints);
        map.fitBounds(latLngBounds, {
          padding: [50, 50],
          maxZoom: 16,
          animate: true,
        });
      } catch (_) {}
    } else if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0], 15);
    }
  }, [
    destination,
    originCoords,
    originMode,
    currentGpsCoords,
    activeRoute,
    barriers,
    showBarriers,
    showFacilities,
    activeStepIndex,
    isNavigating,
    originName,
  ]);

  // Recenter Map Function
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const points: [number, number][] = [];
    if (originCoords) points.push(originCoords);
    if (destination?.coordinates) points.push(destination.coordinates);
    if (activeRoute?.pathCoordinates) {
      activeRoute.pathCoordinates.forEach((p) => points.push(p));
    }

    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 16 });
    } else if (points.length === 1) {
      map.setView(points[0], 15);
    }
  };

  return (
    <div
      id="journey-planner-map-container"
      className={`relative w-full rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shadow-md transition-all ${
        isFullscreen ? 'fixed inset-4 z-[500] h-[calc(100vh-32px)]' : 'h-[380px] sm:h-[460px] lg:h-[520px]'
      }`}
    >
      {/* 1. The Leaflet Interactive Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" tabIndex={0} aria-label="Interactive Accessible Journey Map" />

      {/* 2. Top-Left: Map Mode & Layer Switchers */}
      <div className="absolute top-3 left-3 z-[400] flex flex-wrap items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-md">
        <button
          type="button"
          onClick={() => setMapStyle('standard')}
          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            mapStyle === 'standard'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Standard
        </button>
        <button
          type="button"
          onClick={() => setMapStyle('highContrast')}
          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            mapStyle === 'highContrast'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          High Contrast
        </button>
        <button
          type="button"
          onClick={() => setMapStyle('satellite')}
          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            mapStyle === 'satellite'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Satellite
        </button>
      </div>

      {/* 3. Top-Right: Fullscreen & Recenter Floating Controls */}
      <div className="absolute top-3 right-3 z-[400] flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleRecenter}
          aria-label="Recenter map bounds"
          title="Recenter map bounds"
          className="p-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md hover:bg-white text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-md cursor-pointer transition-transform hover:scale-105 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <Crosshair className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </button>
        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          aria-label={isFullscreen ? 'Exit fullscreen map' : 'Expand full map view'}
          title={isFullscreen ? 'Exit fullscreen' : 'Expand full map view'}
          className="p-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md hover:bg-white text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-md cursor-pointer transition-transform hover:scale-105 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* 4. Bottom Floating Banner: Real-Time Route Summary Bar */}
      {activeRoute && (
        <div className="absolute bottom-3 left-3 right-3 z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>Active Route Corridor</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {activeRoute.name}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="text-center">
              <div className="text-slate-400 font-medium text-[10px]">Real Distance</div>
              <div className="text-sm font-black text-blue-600 dark:text-blue-400">
                {activeRoute.distanceKm} km
              </div>
            </div>
            <div className="text-center">
              <div className="text-slate-400 font-medium text-[10px]">ETA</div>
              <div className="text-sm font-black text-slate-800 dark:text-slate-200">
                {activeRoute.durationMinutes} min
              </div>
            </div>
            <div className="text-center">
              <div className="text-slate-400 font-medium text-[10px]">Stairs</div>
              <div className="text-sm font-black text-emerald-600">
                {activeRoute.stairsCount === 0 ? '✓ 0 Stairs' : `${activeRoute.stairsCount} Steps`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Docked / Collapsible Map Legend in Top-Left or Bottom-Right */}
      {showLegend && (
        <div className="absolute bottom-16 sm:bottom-20 right-3 z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-lg text-[11px] space-y-1.5 hidden sm:block">
          <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-1">
            <span>Map Legend</span>
            <button
              type="button"
              onClick={() => setShowLegend(false)}
              className="text-slate-400 hover:text-slate-600 text-xs px-1"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1 text-slate-600 dark:text-slate-300 font-medium">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <span>📍 Origin (GPS / Custom)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
              <span>🏛️ Destination Landmark</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-1 bg-blue-600 rounded-full"></span>
              <span>Step-Free Road Route</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">⚠️</span>
              <span>Reported Obstacle</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
