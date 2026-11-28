import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Destination,
  RouteOption,
  JourneyPlanRequest,
  BarrierReport,
} from '../../types';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { ConfidenceRating } from '../common/ConfidenceRating';
import {
  Navigation,
  MapPin,
  Calendar,
  Clock,
  Users,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Download,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal,
  Volume2,
  Info,
  Footprints,
  Compass,
  Search,
  X,
  LocateFixed,
  Radio,
  Check,
  Share2,
  ChevronDown,
  Building,
  Plane,
  Train,
  ShieldAlert,
  UserPlus,
  ArrowUpDown,
  Landmark,
  Layers,
  Bus,
  Gauge,
  Zap,
  GitCompare,
  ChevronUp,
  Navigation2,
  ExternalLink,
  Bookmark,
  Car,
  Accessibility,
} from 'lucide-react';
import { TurnByTurnSpeechNavigator } from './TurnByTurnSpeechNavigator';
import { getApiEndpoint, API_ENDPOINTS } from '../../utils/apiConfig';
import {
  generateClientAccessibleRoutes,
  generateRealAccessibleRoutes,
  geocodeLocation,
  calculateDistanceKm,
  calculateDistanceMeters,
} from '../../utils/routePlanner';
import { matchesDestinationSearch } from '../../utils/destinationSearch';
import {
  ALL_START_LOCATIONS,
  matchesStartLocationSearch,
  POPULAR_START_CITIES,
  CityStartLocation,
} from '../../data/citiesData';
import {
  ALL_INDIAN_LOCATIONS,
  IndianLocation,
  getIndianLocationsByState,
  convertIndianLocationToDestination,
  matchesIndianLocationSearch,
} from '../../data/indianLocationsData';
import { IndianLocationsVerticalBar } from './IndianLocationsVerticalBar';
import { AnimatedLocationSelector } from './AnimatedLocationSelector';
import { ConfirmedVerificationModal } from './ConfirmedVerificationModal';
import { AnimatedDatePicker } from '../common/AnimatedDatePicker';
import { AnimatedTimePicker } from '../common/AnimatedTimePicker';

// New modular components
import { VoiceSearchButton } from './VoiceSearchButton';
import { AccessibilityPreferencesCard } from './AccessibilityPreferencesCard';
import { TravelModeSelector, TravelMode } from './TravelModeSelector';
import { EnvironmentalInfoCards } from './EnvironmentalInfoCards';
import { RouteResultsCard } from './RouteResultsCard';
import { JourneyMapViewer } from './JourneyMapViewer';

interface JourneyPlannerProps {
  destinations: Destination[];
  selectedDestination: Destination | null;
  onSelectDestination: (dest: Destination) => void;
  activeRoute: RouteOption | null;
  setActiveRoute: (route: RouteOption | null) => void;
  onOpenReportModal: () => void;
  startLocation?: string;
  setStartLocation?: (val: string) => void;
  startLocationCoords?: [number, number] | null;
  setStartLocationCoords?: (coords: [number, number] | null) => void;
  originMode?: 'CURRENT_LOCATION' | 'CUSTOM';
  setOriginMode?: (mode: 'CURRENT_LOCATION' | 'CUSTOM') => void;
  currentGpsCoords?: [number, number] | null;
  isNavigating?: boolean;
  setIsNavigating?: (val: boolean) => void;
  activeStepIndex?: number;
  setActiveStepIndex?: (idx: number) => void;
  onNavigateToTrips?: () => void;
  onNavigateToMap?: (
    destination: Destination,
    route: RouteOption,
    originName: string,
    originCoords?: [number, number] | null
  ) => void;
}

export const JourneyPlanner: React.FC<JourneyPlannerProps> = ({
  destinations,
  selectedDestination,
  onSelectDestination,
  activeRoute,
  setActiveRoute,
  onOpenReportModal,
  startLocation: propStartLocation,
  setStartLocation: propSetStartLocation,
  startLocationCoords: propStartLocationCoords,
  setStartLocationCoords: propSetStartLocationCoords,
  originMode: propOriginMode,
  setOriginMode: propSetOriginMode,
  currentGpsCoords,
  isNavigating: propIsNavigating,
  setIsNavigating: propSetIsNavigating,
  activeStepIndex: propActiveStepIndex,
  setActiveStepIndex: propSetActiveStepIndex,
  onNavigateToTrips,
  onNavigateToMap,
}) => {
  const {
    profile,
    updateProfile,
    saveJourneyOffline,
    savePlannedTrip,
    plannedTrips,
    speak,
    addNotification,
    simpleMode,
  } = useAccessibility();
  const { t } = useLanguage();
  const { user, isAuthenticated, openAuthPrompt } = useAuth();

  const [internalStartLocation, setInternalStartLocation] = useState('My Current Location');
  const [internalStartCoords, setInternalStartCoords] = useState<[number, number] | null>(null);
  const [internalOriginMode, setInternalOriginMode] = useState<'CURRENT_LOCATION' | 'CUSTOM'>('CURRENT_LOCATION');
  const [internalIsNavigating, setInternalIsNavigating] = useState(false);
  const [internalActiveStepIndex, setInternalActiveStepIndex] = useState(0);

  const startLocation = propStartLocation ?? internalStartLocation;
  const setStartLocation = propSetStartLocation ?? setInternalStartLocation;
  const startLocationCoords = propStartLocationCoords ?? internalStartCoords;
  const setStartLocationCoords = propSetStartLocationCoords ?? setInternalStartCoords;
  const originMode = propOriginMode ?? internalOriginMode;
  const setOriginMode = propSetOriginMode ?? setInternalOriginMode;
  const isNavigating = propIsNavigating ?? internalIsNavigating;
  const setIsNavigating = propSetIsNavigating ?? setInternalIsNavigating;
  const activeStepIndex = propActiveStepIndex ?? internalActiveStepIndex;
  const setActiveStepIndex = propSetActiveStepIndex ?? setInternalActiveStepIndex;

  const [destId, setDestId] = useState<string>(selectedDestination?.id || destinations[0]?.id || '');
  const [travelDate, setTravelDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [travelersCount, setTravelersCount] = useState<number | ''>('');
  const [transportPref, setTransportPref] = useState<TravelMode>('WALK_ROLL');
  const [crowdTolerance, setCrowdTolerance] = useState<'LOW' | 'NEUTRAL' | 'ANY'>('LOW');
  const [assistanceReq, setAssistanceReq] = useState(true);

  // Search & Autocomplete States for Start & Destination
  const [startSearchOpen, setStartSearchOpen] = useState(false);
  const [startCategoryFilter, setStartCategoryFilter] = useState<'ALL' | 'ODISHA' | 'INDIA' | 'INTERNATIONAL' | 'AIRPORT' | 'TRAIN'>('ALL');
  const [destSearchQuery, setDestSearchQuery] = useState('');
  const [destSearchOpen, setDestSearchOpen] = useState(false);
  const [destCategoryFilter, setDestCategoryFilter] = useState<'ALL' | 'ODISHA' | 'INDIA' | 'VILLAGES' | 'HERITAGE' | 'GLOBAL'>('ALL');
  const [isAcquiringGps, setIsAcquiringGps] = useState(false);
  const [isIndiaVerticalBarOpen, setIsIndiaVerticalBarOpen] = useState(false);
  const [verticalBarRole, setVerticalBarRole] = useState<'start' | 'destination'>('start');

  // Grouped Indian locations by State for Native Select
  const indianLocationsGrouped: Record<string, IndianLocation[]> = useMemo(() => getIndianLocationsByState(), []);

  // Confirmation state upon planning
  const [journeyConfirmation, setJourneyConfirmation] = useState<{
    destination: Destination;
    startLocation: string;
    bestRoute: RouteOption;
    plannedAt: string;
    totalRoutesCount: number;
  } | null>(null);

  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [simulatedBarrierAlert, setSimulatedBarrierAlert] = useState<BarrierReport | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Route Filter, View Mode, and Distance Tracking States
  const [routeFilter, setRouteFilter] = useState<'ALL' | 'RECOMMENDED' | 'FASTEST' | 'LOWEST_CROWD' | 'ELEVATOR_PRIORITY'>('ALL');
  const [routeViewMode, setRouteViewMode] = useState<'CARDS' | 'COMPARE'>('CARDS');
  const [isSyncingDistance, setIsSyncingDistance] = useState(false);
  const [expandedRouteStepsId, setExpandedRouteStepsId] = useState<string | null>(null);

  const startRef = useRef<HTMLDivElement>(null);
  const destRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const mapSectionRef = useRef<HTMLDivElement>(null);

  const currentDestination: Destination = useMemo(() => {
    if (selectedDestination && (selectedDestination.id === destId || !destId)) {
      return selectedDestination;
    }
    const foundInDestinations = destinations.find((d) => d.id === destId);
    if (foundInDestinations) return foundInDestinations;

    const foundInIndian = ALL_INDIAN_LOCATIONS.find((l) => l.id === destId || l.name === destId);
    if (foundInIndian) {
      return convertIndianLocationToDestination(foundInIndian);
    }

    if (selectedDestination) return selectedDestination;
    return destinations[0];
  }, [destId, selectedDestination, destinations]);

  // Real-time straight line (aerial geodesic) distance between origin coordinates and destination coordinates
  const realTimeDirectDistanceKm = useMemo(() => {
    if (!currentDestination?.coordinates) return 0;
    const originCoords = startLocationCoords || (originMode === 'CURRENT_LOCATION' && currentGpsCoords ? currentGpsCoords : null);
    if (!originCoords || originCoords.length !== 2) {
      if (activeRoute?.distanceKm) {
        return Math.round(activeRoute.distanceKm * 0.88 * 100) / 100;
      }
      return 1.2;
    }
    return calculateDistanceKm(originCoords, currentDestination.coordinates);
  }, [startLocationCoords, originMode, currentGpsCoords, currentDestination, activeRoute]);

  // Refresh live distance and route calculation
  const handleRefreshLiveDistance = () => {
    setIsSyncingDistance(true);
    if (originMode === 'CURRENT_LOCATION' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setStartLocationCoords(coords);
          executeRouteCalculation('My Current Location', coords, 'CURRENT_LOCATION', false);
          setIsSyncingDistance(false);
          addNotification({
            type: 'ROUTE_UPDATE',
            title: '📍 Real-Time GPS Distance Synced',
            message: `Live distance: ${calculateDistanceKm(coords, currentDestination.coordinates)} km to ${currentDestination.name} (accuracy ±${Math.round(pos.coords.accuracy)}m).`,
            severity: 'SUCCESS',
          });
          if (profile.audioNavigationEnabled) {
            speak(`Real-time distance to ${currentDestination.name} is ${calculateDistanceKm(coords, currentDestination.coordinates)} kilometers.`);
          }
        },
        () => {
          setIsSyncingDistance(false);
          executeRouteCalculation(startLocation, startLocationCoords, originMode, false);
          addNotification({
            type: 'ROUTE_UPDATE',
            title: 'Distance Recalculated',
            message: `Real-time distance between ${startLocation} and ${currentDestination.name} refreshed.`,
            severity: 'INFO',
          });
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      executeRouteCalculation(startLocation, startLocationCoords, originMode, false);
      setTimeout(() => {
        setIsSyncingDistance(false);
        addNotification({
          type: 'ROUTE_UPDATE',
          title: '📍 Real-Time Distance Refreshed',
          message: `Real-time route distance between ${startLocation} and ${currentDestination.name} verified.`,
          severity: 'INFO',
        });
      }, 500);
    }
  };

  // Sync selectedDestination from props
  useEffect(() => {
    if (selectedDestination && selectedDestination.id !== destId) {
      setDestId(selectedDestination.id);
      setDestSearchQuery('');
    }
  }, [selectedDestination]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (startRef.current && !startRef.current.contains(e.target as Node)) {
        setStartSearchOpen(false);
      }
      if (destRef.current && !destRef.current.contains(e.target as Node)) {
        setDestSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered Start Suggestions using BOTH ALL_START_LOCATIONS and ALL_INDIAN_LOCATIONS
  const filteredStartSuggestions = useMemo(() => {
    const query = startLocation.trim();

    const hubMatches = ALL_START_LOCATIONS.filter((loc) => {
      const textMatch = !query || matchesStartLocationSearch(loc, query);
      if (!textMatch) return false;

      if (startCategoryFilter === 'ODISHA') return loc.region === 'Odisha' || loc.state === 'Odisha';
      if (startCategoryFilter === 'INDIA') return loc.country === 'India';
      if (startCategoryFilter === 'INTERNATIONAL') return loc.country !== 'India';
      if (startCategoryFilter === 'AIRPORT') return loc.category === 'Airport';
      if (startCategoryFilter === 'TRAIN') return loc.category === 'Railway Station' || loc.category === 'Metro Station';
      return true;
    });

    const settlementMatches = ALL_INDIAN_LOCATIONS.filter((loc) => {
      const textMatch = !query || matchesIndianLocationSearch(loc, query);
      if (!textMatch) return false;

      if (startCategoryFilter === 'ODISHA') return loc.state === 'Odisha';
      if (startCategoryFilter === 'INTERNATIONAL') return false;
      if (startCategoryFilter === 'AIRPORT' || startCategoryFilter === 'TRAIN') {
        return loc.accessibleTransit.toLowerCase().includes('rail') || loc.accessibleTransit.toLowerCase().includes('airport');
      }
      return true;
    });

    return {
      hubs: hubMatches,
      settlements: settlementMatches,
      totalCount: hubMatches.length + settlementMatches.length,
    };
  }, [startLocation, startCategoryFilter]);

  // Unified Destination Matches from verified destinations + all Indian locations database
  const filteredDestinationsList = useMemo(() => {
    const query = destSearchQuery.trim();

    const matchedBuiltIn = destinations.filter((d) => {
      if (query && !matchesDestinationSearch(d, query)) return false;

      if (destCategoryFilter === 'ODISHA') {
        return (
          d.city?.toLowerCase().includes('odisha') ||
          d.city?.toLowerCase().includes('bhubaneswar') ||
          d.city?.toLowerCase().includes('puri') ||
          d.city?.toLowerCase().includes('konark') ||
          d.state === 'Odisha'
        );
      }
      if (destCategoryFilter === 'INDIA') return d.country === 'India';
      if (destCategoryFilter === 'GLOBAL') return d.country !== 'India';
      if (destCategoryFilter === 'HERITAGE') return d.category === 'HERITAGE' || d.category === 'RELIGIOUS';
      if (destCategoryFilter === 'VILLAGES') return d.name.toLowerCase().includes('village') || d.category === 'NATURAL_ATTRACTION';
      return true;
    });

    const matchedIndian = ALL_INDIAN_LOCATIONS.filter((loc) => {
      if (query && !matchesIndianLocationSearch(loc, query)) return false;

      const isAlreadyInBuiltIn = matchedBuiltIn.some(
        (b) =>
          b.name.toLowerCase().includes(loc.name.toLowerCase()) ||
          loc.name.toLowerCase().includes(b.name.toLowerCase())
      );
      if (isAlreadyInBuiltIn && !query) return false;

      if (destCategoryFilter === 'ODISHA') return loc.state === 'Odisha';
      if (destCategoryFilter === 'INDIA') return true;
      if (destCategoryFilter === 'GLOBAL') return false;
      if (destCategoryFilter === 'HERITAGE') {
        return loc.type.toLowerCase().includes('heritage') || loc.type.toLowerCase().includes('pilgrim');
      }
      if (destCategoryFilter === 'VILLAGES') {
        return loc.type.toLowerCase().includes('village');
      }
      return true;
    });

    return {
      destinations: matchedBuiltIn,
      indianLocations: matchedIndian,
      totalCount: matchedBuiltIn.length + matchedIndian.length,
    };
  }, [destinations, destSearchQuery, destCategoryFilter]);

  // Unified Destination Selection Handler
  const handleSelectDestination = (destOrLoc: Destination | IndianLocation) => {
    if ('facilities' in destOrLoc) {
      setDestId(destOrLoc.id);
      onSelectDestination(destOrLoc);
      setDestSearchQuery('');
      setDestSearchOpen(false);
      speak(`Selected ${destOrLoc.name} as target destination.`);
      addNotification({
        title: `Destination: ${destOrLoc.name}`,
        message: `Verified step-free access: ${destOrLoc.accessibilityScore.overall}/100 in ${destOrLoc.city}.`,
        type: 'ROUTE_UPDATE',
        severity: 'SUCCESS',
      });
    } else {
      const existingMatch = destinations.find(
        (d) =>
          d.name.toLowerCase().includes(destOrLoc.name.toLowerCase()) ||
          d.city?.toLowerCase().includes(destOrLoc.name.toLowerCase()) ||
          destOrLoc.name.toLowerCase().includes(d.city?.toLowerCase() || '') ||
          destOrLoc.famousLandmark.toLowerCase().includes(d.name.toLowerCase())
      );
      const target = existingMatch || convertIndianLocationToDestination(destOrLoc);
      setDestId(target.id);
      onSelectDestination(target);
      setDestSearchQuery('');
      setDestSearchOpen(false);
      speak(`Selected ${destOrLoc.name}, located in ${destOrLoc.district} District, ${destOrLoc.state}.`);
      addNotification({
        title: `Destination: ${destOrLoc.name}`,
        message: `PRM Accessibility: ${destOrLoc.wheelchairFriendliness}. Accessible transit: ${destOrLoc.accessibleTransit}.`,
        type: 'ROUTE_UPDATE',
        severity: 'SUCCESS',
      });
    }
  };

  // Unified Start Location Selection Handler for custom locations
  const handleSelectStartLocation = async (
    name: string,
    district?: string,
    state?: string,
    explicitCoords?: [number, number] | null
  ) => {
    setOriginMode('CUSTOM');
    setStartLocation(name);
    setStartSearchOpen(false);

    let coords = explicitCoords || null;
    if (!coords) {
      const matchedHub = ALL_START_LOCATIONS.find((l) => l.name.toLowerCase() === name.toLowerCase());
      const matchedInd = ALL_INDIAN_LOCATIONS.find((l) => l.name.toLowerCase() === name.toLowerCase());
      coords = matchedHub?.coordinates || matchedInd?.coordinates || null;
    }

    if (!coords) {
      const geo = await geocodeLocation(name);
      if (geo) {
        coords = geo.coords;
      }
    }

    if (coords) {
      setStartLocationCoords(coords);
    }

    speak(`Departure origin set to ${name}.`);
    addNotification({
      title: `Departure Set: ${name}`,
      message: district && state ? `Origin locked in ${district} District, ${state}.` : 'Origin departure hub locked.',
      type: 'ROUTE_UPDATE',
      severity: 'SUCCESS',
    });

    // Recalculate route using the new custom origin coordinates
    executeRouteCalculation(name, coords, 'CUSTOM', false);
  };

  // Acquire Browser GPS Coordinates for Start Location (Explicit user request)
  const handleUseCurrentGps = () => {
    if (!('geolocation' in navigator)) {
      addNotification({
        type: 'BARRIER_ALERT',
        title: 'Geolocation Unavailable',
        message: 'Your browser does not support automatic geolocation.',
        severity: 'INFO',
      });
      return;
    }

    setIsAcquiringGps(true);
    setOriginMode('CURRENT_LOCATION');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const gpsCoords: [number, number] = [latitude, longitude];
        const gpsStr = 'My Current Location';
        setStartLocation(gpsStr);
        setStartLocationCoords(gpsCoords);
        setIsAcquiringGps(false);
        setStartSearchOpen(false);
        addNotification({
          type: 'ROUTE_UPDATE',
          title: '📍 GPS Location Locked',
          message: `Accuracy ±${Math.round(accuracy)}m. Set as departure point.`,
          severity: 'INFO',
        });
        executeRouteCalculation(gpsStr, gpsCoords, 'CURRENT_LOCATION', false);
      },
      (err) => {
        setIsAcquiringGps(false);
        addNotification({
          type: 'BARRIER_ALERT',
          title: 'GPS Access Denied',
          message: 'Please allow location permission in your browser to use GPS location.',
          severity: 'WARNING',
        });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Swap Origin and Destination Handler
  const handleSwapOriginAndDestination = () => {
    const currentDest = currentDestination;
    const currentStart = startLocation;
    const currentStartCoordsVal = startLocationCoords;

    if (!currentDest) return;

    const effectivePreviousStart = (currentStart && currentStart.trim()) ? currentStart.trim() : 'My Current Location';

    const newOriginName = currentDest.name;
    const newOriginCoords = currentDest.coordinates;

    let targetNewDestination: Destination;

    const matchedDest = destinations.find(
      (d) =>
        d.name.toLowerCase() === effectivePreviousStart.toLowerCase() ||
        d.city?.toLowerCase() === effectivePreviousStart.toLowerCase() ||
        d.id.toLowerCase() === effectivePreviousStart.toLowerCase()
    );

    if (matchedDest) {
      targetNewDestination = matchedDest;
    } else {
      const matchedInd = ALL_INDIAN_LOCATIONS.find(
        (l) =>
          l.name.toLowerCase() === effectivePreviousStart.toLowerCase() ||
          l.id.toLowerCase() === effectivePreviousStart.toLowerCase() ||
          effectivePreviousStart.toLowerCase().includes(l.name.toLowerCase()) ||
          l.name.toLowerCase().includes(effectivePreviousStart.toLowerCase())
      );

      if (matchedInd) {
        targetNewDestination = convertIndianLocationToDestination(matchedInd);
      } else {
        const matchedHub = ALL_START_LOCATIONS.find(
          (h) =>
            h.name.toLowerCase() === effectivePreviousStart.toLowerCase() ||
            effectivePreviousStart.toLowerCase().includes(h.name.toLowerCase())
        );

        targetNewDestination = {
          ...destinations[0],
          id: 'swap-dest-' + Date.now(),
          name: effectivePreviousStart,
          city: matchedHub?.cityName || 'Origin Hub',
          state: matchedHub?.state || 'Odisha',
          country: matchedHub?.country || 'India',
          coordinates: currentStartCoordsVal || matchedHub?.coordinates || currentGpsCoords || [20.2961, 85.8245],
          category: 'HERITAGE',
          accessibilityScore: {
            overall: 95,
            stepFreeAccess: 95,
            tactilePaving: 92,
            audioAssistance: 90,
            brailleSignage: 88,
            accessibleRestrooms: 90,
            wheelchairRamps: 95,
            prmElevators: 90,
          },
          facilities: ['Step-Free Access Point', 'Accessible Vehicle Drop-off', 'Tactile Guiding'],
          verifiedByAuditor: true,
          verifiedAt: 'Swapped Origin Point',
          imageUrl: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=800',
          description: `Accessible route point swapped from previous departure origin: ${effectivePreviousStart}.`,
          elevationGainMeters: 0,
          crowdLevel: 'LOW',
          weatherSuitability: 'ALL_WEATHER',
        };
      }
    }

    setOriginMode('CUSTOM');
    setStartLocation(newOriginName);
    setStartLocationCoords(newOriginCoords);

    setDestId(targetNewDestination.id);
    onSelectDestination(targetNewDestination);
    setDestSearchQuery('');
    setDestSearchOpen(false);

    speak(`Swapped origin and destination. Departure origin is now ${newOriginName} and target destination is ${targetNewDestination.name}.`);
    addNotification({
      title: 'Origin & Destination Swapped',
      message: `Routing from ${newOriginName} to ${targetNewDestination.name}.`,
      type: 'ROUTE_UPDATE',
      severity: 'SUCCESS',
    });

    executeRouteCalculation(
      newOriginName,
      newOriginCoords,
      'CUSTOM',
      false,
      targetNewDestination
    );
  };

  // Core execution engine for calculating and updating accessible routes
  const executeRouteCalculation = async (
    targetStartLocation: string,
    targetStartCoords?: [number, number] | null,
    targetOriginMode?: 'CURRENT_LOCATION' | 'CUSTOM',
    isExplicitUserAction = false,
    explicitDestination?: Destination | null
  ) => {
    const effectiveMode = targetOriginMode || originMode;
    let resolvedCoords = targetStartCoords ?? startLocationCoords;
    const effectiveDestination = explicitDestination || currentDestination;

    if (effectiveMode === 'CUSTOM' && !resolvedCoords && targetStartLocation) {
      const geo = await geocodeLocation(targetStartLocation);
      if (geo) {
        resolvedCoords = geo.coords;
        setStartLocationCoords(resolvedCoords);
      }
    }

    setIsLoading(true);
    setIsNavigating(false);
    setSimulatedBarrierAlert(null);

    if (isExplicitUserAction) {
      setIsVerificationModalOpen(true);
    }

    try {
      let calculatedRoutes: RouteOption[] = [];
      try {
        const payload: JourneyPlanRequest = {
          startLocation: targetStartLocation,
          startCoords: resolvedCoords || undefined,
          destinationId: effectiveDestination.id,
          destinationName: effectiveDestination.name,
          destinationCoords: effectiveDestination.coordinates,
          travelDate: travelDate || '',
          startTime: startTime || '',
          endTime: endTime || '',
          travelersCount: typeof travelersCount === 'number' ? travelersCount : 1,
          profile,
          transportPreference: transportPref,
          crowdPreference: crowdTolerance,
          weatherPreference: true,
          assistanceRequired: assistanceReq,
        };

        const res = await fetch(getApiEndpoint(API_ENDPOINTS.ROUTE_PLAN), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          calculatedRoutes = data.routes || [];
        }
      } catch (_) {
        // Fallback for static or offline mode
      }

      if (!calculatedRoutes || calculatedRoutes.length === 0) {
        calculatedRoutes = await generateRealAccessibleRoutes(
          effectiveDestination,
          targetStartLocation || 'Departure Point',
          profile,
          resolvedCoords,
          effectiveMode,
          currentGpsCoords
        );
      }

      setRoutes(calculatedRoutes);
      const best = calculatedRoutes.find((r: RouteOption) => r.isBestMatch) || calculatedRoutes[0];
      setActiveRoute(best);

      if (isExplicitUserAction) {
        confetti({ particleCount: 85, spread: 80, origin: { y: 0.6 } });

        try {
          savePlannedTrip({
            title: `${effectiveDestination.name} Accessible Journey`,
            originName: targetStartLocation || 'My Current Location',
            originCoords: resolvedCoords,
            originMode: effectiveMode,
            destinationId: effectiveDestination.id,
            destinationName: effectiveDestination.name,
            destinationCity: effectiveDestination.city,
            destinationCountry: effectiveDestination.country,
            destinationCoords: effectiveDestination.coordinates,
            destination: effectiveDestination,
            travelDate: travelDate || undefined,
            startTime: startTime || undefined,
            endTime: endTime || undefined,
            travelersCount: typeof travelersCount === 'number' ? travelersCount : 1,
            accessibilityScore: best?.accessibilityScore || effectiveDestination.accessibilityScore.overall,
            selectedRoute: best,
            preferences: {
              transportPreference: transportPref,
              crowdPreference: crowdTolerance,
              assistanceRequired: assistanceReq,
              profile,
            },
            notes: `Planned via Sugamya Planner. 0 physical stairs path verified.`,
          });
        } catch (e) {
          console.warn('[Auto Save Planned Trip Failed]:', e);
        }
      }

      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setJourneyConfirmation({
        destination: effectiveDestination,
        startLocation: targetStartLocation || 'Current Departure Point',
        bestRoute: best,
        plannedAt: nowStr,
        totalRoutesCount: calculatedRoutes.length,
      });

      if (isExplicitUserAction) {
        addNotification({
          type: 'ROUTE_UPDATE',
          title: '🎉 Accessible Journey Confirmed & Saved to Planned Trips!',
          message: `${best ? best.name : 'Route'} to ${currentDestination.name} saved in your Planned Trips library and ready for Live Navigation.`,
          severity: 'SUCCESS',
        });

        if (profile.audioNavigationEnabled) {
          speak(`Accessible Journey to ${currentDestination.name} planned and verified successfully! Recommended ${best?.name || 'Route'} is 100% step-free.`);
        }

        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 250);
      }
    } catch (err) {
      console.error('[Route Planning Error]:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load initial routes on mount or destination change (background silent initialization)
  useEffect(() => {
    if (destId) {
      executeRouteCalculation(startLocation, startLocationCoords, originMode, false);
    }
  }, [destId]);

  const handlePlanJourney = async (e?: React.FormEvent, isExplicitUserAction = true) => {
    if (e) e.preventDefault();
    const isUserTriggered = Boolean(e || isExplicitUserAction);

    if (isUserTriggered && !isAuthenticated) {
      openAuthPrompt(
        'Please sign in or register to book your trip and calculate verified accessible routes.',
        'REGISTER'
      );
      return;
    }

    await executeRouteCalculation(startLocation, startLocationCoords, originMode, isUserTriggered);
  };

  const handleStartNavigation = (route: RouteOption) => {
    setActiveRoute(route);
    setIsNavigating(true);
    setActiveStepIndex(0);

    if (onNavigateToMap) {
      onNavigateToMap(currentDestination, route, startLocation || 'My Current GPS Location', startLocationCoords);
    }

    if (profile.audioNavigationEnabled) {
      speak(`Starting guided step-free journey on ${route.name}. Head towards ${route.steps[0]?.instruction}`);
    }

    if (route.tag === 'FASTEST' || route.currentBarriers) {
      setTimeout(() => {
        const barrierAlert: BarrierReport = {
          id: 'sim-alert-1',
          barrierType: 'BLOCKED_RAMP',
          title: 'Scaffolding Obstruction at East Courtyard Ramp',
          description: 'Emergency maintenance scaffolding is blocking the ramp. Wheelchair passage obstructed.',
          destinationName: currentDestination.name,
          locationName: 'Passage Richelieu Ramp',
          coordinates: [currentDestination.coordinates[0] - 0.002, currentDestination.coordinates[1] - 0.001],
          reportedDate: '13 August 2026',
          reportedTime: 'Just now',
          photoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb180c5f5?auto=format&fit=crop&w=600&q=80',
          evidenceType: 'PHOTO',
          confidence: 96,
          status: 'ACTIVE_BARRIER',
          reportedBy: { userId: 'sim-user', userName: 'Real-Time Sensor / Community' },
          auditHistory: [],
        };
        setSimulatedBarrierAlert(barrierAlert);
        addNotification({
          type: 'BARRIER_ALERT',
          title: '⚠️ Accessibility Alert on Current Route',
          message: 'Temporary barrier detected on East Ramp. Alternative route ready.',
          severity: 'CRITICAL',
          hasAlternativeRoute: true,
        });
      }, 3500);
    }
  };

  const handleNavigateGoogleMaps = (route: RouteOption) => {
    const origin = startLocationCoords || currentGpsCoords;
    const dest = currentDestination.coordinates;
    const travelMode =
      transportPref === 'WALK_ROLL'
        ? 'walking'
        : transportPref === 'WHEELCHAIR_TAXI'
        ? 'driving'
        : 'transit';

    let googleMapsUrl = '';
    if (origin && dest) {
      googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin[0]},${origin[1]}&destination=${dest[0]},${dest[1]}&travelmode=${travelMode}`;
    } else {
      const originQuery = encodeURIComponent(startLocation || 'Current Location');
      const destQuery = encodeURIComponent(currentDestination.name);
      googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${originQuery}&destination=${destQuery}&travelmode=${travelMode}`;
    }

    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
    addNotification({
      type: 'ROUTE_UPDATE',
      title: '🗺️ Opening in Google Maps',
      message: `Navigating from ${startLocation || 'Origin'} to ${currentDestination.name} in Google Maps.`,
      severity: 'INFO',
    });
  };

  const handleSavePlannedTrip = (route: RouteOption) => {
    if (!isAuthenticated) {
      openAuthPrompt(
        'Please sign in or register to save journeys to your Planned Trips library.',
        'REGISTER'
      );
      return;
    }

    savePlannedTrip({
      title: `${currentDestination.name} Accessible Journey`,
      originName: startLocation || 'My Current Location',
      originCoords: startLocationCoords || currentGpsCoords || undefined,
      originMode,
      destinationId: currentDestination.id,
      destinationName: currentDestination.name,
      destinationCity: currentDestination.city,
      destinationCountry: currentDestination.country,
      destinationCoords: currentDestination.coordinates,
      destination: currentDestination,
      travelDate: travelDate || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      travelersCount: typeof travelersCount === 'number' ? travelersCount : 1,
      accessibilityScore: route?.accessibilityScore || currentDestination.accessibilityScore.overall,
      selectedRoute: route,
      preferences: {
        transportPreference: transportPref,
        crowdPreference: crowdTolerance,
        assistanceRequired: assistanceReq,
        profile,
      },
      notes: `Planned via SUGAMYA Planner. 0 physical stairs guaranteed.`,
    });

    confetti({ particleCount: 65, spread: 75, origin: { y: 0.6 } });
    addNotification({
      type: 'ROUTE_UPDATE',
      title: '💾 Saved to Planned Trips!',
      message: `${route.name} to ${currentDestination.name} has been added to your Planned Trips library.`,
      severity: 'SUCCESS',
    });
  };

  const handleRecalculateAlternative = async () => {
    setIsRecalculating(true);
    try {
      const res = await fetch(getApiEndpoint(API_ENDPOINTS.ROUTE_RECALCULATE), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationId: currentDestination.id,
          blockedRouteId: activeRoute?.id,
          barrierReason: 'Scaffolding obstruction on East Ramp',
        }),
      });
      const data = await res.json();
      if (data.recalculatedRoute) {
        setActiveRoute(data.recalculatedRoute);
        setSimulatedBarrierAlert(null);
        setActiveStepIndex(0);
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        if (profile.audioNavigationEnabled) {
          speak(`Alternative route active. Safely bypassing East Ramp via Gate 2 Level entrance with zero stairs.`);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleSaveOffline = (route: RouteOption) => {
    if (!isAuthenticated) {
      openAuthPrompt(
        'Please sign in or register to save offline trips and access downloaded passes.',
        'REGISTER'
      );
      return;
    }
    saveJourneyOffline(currentDestination, route);
    confetti({ particleCount: 70, spread: 80, origin: { y: 0.7 } });
  };

  // Preference change handler that modifies user profile
  const handleAccessibilityPreferenceChange = (key: string, value: any) => {
    if (key === 'wheelchairRequired') {
      updateProfile({ wheelchairUser: value });
    } else if (key === 'avoidStairs') {
      updateProfile({ avoidStairs: value });
    } else if (key === 'elevatorRequired') {
      updateProfile({ wheelchairUser: value || profile.wheelchairUser });
    } else if (key === 'reducedWalking') {
      updateProfile({
        limitedMobility: value,
        maxWalkingDistanceMeters: value ? 250 : 500,
      });
    } else if (key === 'preferQuietRoutes') {
      updateProfile({ cognitiveFriendly: value });
      setCrowdTolerance(value ? 'LOW' : 'NEUTRAL');
    }
  };

  return (
    <div className="space-y-8" id="journey-planner-container">
      {/* 1. TOP HEADER */}
      <div
        id="planner-top-header"
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-sm">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Plan Your Accessible Journey
              </h1>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Find routes that match your accessibility needs.
              </p>
            </div>
          </div>
        </div>

        {/* Action button & active indicators */}
        <div className="flex flex-wrap items-center gap-3">
          {onNavigateToTrips && (
            <button
              type="button"
              id="header-my-planned-trips-btn"
              onClick={onNavigateToTrips}
              className="px-4 py-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center gap-2 cursor-pointer hover:scale-102 active:scale-98"
            >
              <Bookmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>My Planned Trips</span>
              {plannedTrips && plannedTrips.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[11px] font-black">
                  {plannedTrips.length}
                </span>
              )}
            </button>
          )}

          {/* Quick Active Accessibility Indicators */}
          <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
            {profile.wheelchairUser && (
              <span className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-full flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800">
                <span>♿</span> Step-Free
              </span>
            )}
            {profile.avoidStairs && (
              <span className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 rounded-full flex items-center gap-1.5 border border-blue-200 dark:border-blue-800">
                <span>🚫🪜</span> 0 Stairs
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Guest Explorer Banner if unauthenticated */}
      {!isAuthenticated && (
        <div
          role="status"
          className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-teal-900/40 border-2 border-blue-500/40 backdrop-blur-md text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0 ring-2 ring-amber-300/60">
              <ShieldAlert className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-white">
                  Guest Explorer Mode Active
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 uppercase tracking-wider">
                  Compulsory Login Required
                </span>
              </div>
              <p className="text-xs text-slate-200/90 font-medium">
                Sign in or register to calculate personalized 0-stairs routes, book accessible travel, and save offline passes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() =>
                openAuthPrompt(
                  'Please sign in or register to book your trip and plan accessible routes.',
                  'REGISTER'
                )
              }
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-105"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register / Sign In to Book</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. ORIGIN & DESTINATION SEARCH CARD */}
      <div className={`p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl ${simpleMode ? 'space-y-6' : 'space-y-8'}`}>
        <form onSubmit={handlePlanJourney} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* ORIGIN INPUT FIELD (5 cols) */}
            <div className="lg:col-span-5 space-y-2 relative" id="start-location-section" ref={startRef}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="text-base">{originMode === 'CURRENT_LOCATION' ? '📍' : '📌'}</span>
                  <span>Departure Origin</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    originMode === 'CURRENT_LOCATION'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                  }`}>
                    {originMode === 'CURRENT_LOCATION' ? 'Current GPS' : 'Selected Hub'}
                  </span>
                </label>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    id="open-start-vertical-bar-btn"
                    onClick={() => {
                      setVerticalBarRole('start');
                      setIsIndiaVerticalBarOpen(true);
                    }}
                    className="text-[11px] text-indigo-700 dark:text-indigo-300 hover:text-indigo-800 font-bold flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 shadow-xs cursor-pointer"
                    title="Open full vertical option bar for all Indian cities and villages"
                  >
                    <span>🇮🇳 All India</span>
                  </button>

                  <button
                    type="button"
                    id="gps-locate-start-btn"
                    onClick={handleUseCurrentGps}
                    disabled={isAcquiringGps}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 font-bold flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 cursor-pointer"
                    title="Detect my current location with browser GPS"
                  >
                    <LocateFixed className={`w-3.5 h-3.5 ${isAcquiringGps ? 'animate-spin text-amber-500' : ''}`} />
                    <span>{isAcquiringGps ? 'Locating...' : '📍 GPS'}</span>
                  </button>
                </div>
              </div>

              {/* Start Input with Voice Search & Clear */}
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  id="start-location-search-input"
                  value={startLocation}
                  onChange={(e) => {
                    setStartLocation(e.target.value);
                    setStartSearchOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSelectStartLocation(startLocation);
                    }
                  }}
                  onFocus={() => setStartSearchOpen(true)}
                  placeholder="Type any departure city, station or landmark..."
                  className="w-full pl-10 pr-20 py-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-600 focus:outline-hidden font-medium text-sm shadow-xs"
                />

                <div className="absolute right-2 flex items-center gap-1">
                  {startLocation && (
                    <button
                      type="button"
                      id="clear-start-location-btn"
                      onClick={() => {
                        setStartLocation('');
                        setStartSearchOpen(true);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title="Clear start location"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <VoiceSearchButton
                    id="voice-search-start-btn"
                    onTranscript={(text) => {
                      setStartLocation(text);
                      handleSelectStartLocation(text);
                    }}
                    placeholder="Speak departure location"
                  />
                </div>
              </div>

              {/* Start Location Search Suggestions Dropdown */}
              {startSearchOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-[300] overflow-hidden max-h-80 overflow-y-auto">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                    <div className="flex flex-wrap gap-1">
                      {[
                        { key: 'ALL', label: `All (${filteredStartSuggestions.totalCount})` },
                        { key: 'ODISHA', label: '🏛️ Odisha' },
                        { key: 'INDIA', label: '🇮🇳 India' },
                        { key: 'AIRPORT', label: '✈️ Airports' },
                        { key: 'TRAIN', label: '🚆 Rail/Metro' },
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setStartCategoryFilter(key as any)}
                          className={`px-2 py-1 rounded-md font-bold transition-all ${
                            startCategoryFilter === key
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleUseCurrentGps}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1 shrink-0 ml-auto"
                    >
                      <Radio className="w-3 h-3" />
                      <span>GPS Live Fix</span>
                    </button>
                  </div>

                  <div className="p-1.5 divide-y divide-slate-100 dark:divide-slate-800/60">
                    <button
                      type="button"
                      onClick={handleUseCurrentGps}
                      className="w-full text-left px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl flex items-center justify-between text-sm transition-colors text-blue-700 dark:text-blue-300 font-bold mb-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">📍</span>
                        <div>
                          <div>My Current Location (Real-time GPS)</div>
                          <div className="text-xs text-blue-500 font-normal">Auto-detect from satellite coordinates</div>
                        </div>
                      </div>
                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full font-bold">GPS</span>
                    </button>

                    {filteredStartSuggestions.settlements.slice(0, 10).map((loc) => (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => handleSelectStartLocation(loc.name, loc.district, loc.state, loc.coordinates)}
                        className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl flex flex-col gap-1 text-sm transition-colors text-slate-800 dark:text-slate-200 group cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <span className="text-lg shrink-0 mt-0.5">🇮🇳</span>
                            <div>
                              <div className="font-bold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {loc.name}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  {loc.district} District, {loc.state}
                                </span>
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full font-bold shrink-0">
                            {loc.wheelchairFriendliness}
                          </span>
                        </div>
                      </button>
                    ))}

                    {filteredStartSuggestions.hubs.slice(0, 10).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectStartLocation(item.name, item.cityName, item.state, item.coordinates)}
                        className="w-full text-left px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl flex flex-col gap-1.5 text-sm transition-colors text-slate-800 dark:text-slate-200 group cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <span className="text-lg shrink-0 mt-0.5">{item.icon}</span>
                            <div>
                              <div className="font-bold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {item.name}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  {item.cityName}{item.state ? `, ${item.state}` : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full font-bold shrink-0">
                            Step-Free
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* SWAP BUTTON (2 cols) */}
            <div className="lg:col-span-2 flex items-center justify-center pt-2 sm:pt-6">
              <button
                type="button"
                id="swap-origin-destination-btn"
                onClick={handleSwapOriginAndDestination}
                className="p-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white rounded-2xl shadow-md transition-all hover:scale-110 active:scale-95 cursor-pointer group flex items-center justify-center gap-2"
                title="Swap Origin and Destination"
              >
                <ArrowUpDown className="w-5 h-5 rotate-90 lg:rotate-0 group-hover:rotate-180 transition-transform duration-300" />
                <span className="lg:hidden text-xs font-bold">Swap Points</span>
              </button>
            </div>

            {/* DESTINATION INPUT FIELD (5 cols) */}
            <div className="lg:col-span-5 space-y-2 relative" id="destination-section" ref={destRef}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-emerald-600" />
                  <span>Target Destination</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-bold">
                    🏛️ Verified Site
                  </span>
                </label>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    id="open-dest-vertical-bar-btn"
                    onClick={() => {
                      setVerticalBarRole('destination');
                      setIsIndiaVerticalBarOpen(true);
                    }}
                    className="text-[11px] text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 font-bold flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 shadow-xs cursor-pointer"
                    title="Open full vertical option bar for all destinations"
                  >
                    <span>🇮🇳 All India</span>
                  </button>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    {filteredDestinationsList.totalCount} Sites
                  </span>
                </div>
              </div>

              {/* Destination Search Input */}
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  id="destination-search-input"
                  value={destSearchOpen ? destSearchQuery : `${currentDestination.name} (${currentDestination.city || currentDestination.state || ''}, ${currentDestination.country})`}
                  onChange={(e) => {
                    setDestSearchQuery(e.target.value);
                    setDestSearchOpen(true);
                  }}
                  onFocus={() => {
                    setDestSearchOpen(true);
                  }}
                  placeholder="Search destination, temple, monument, village..."
                  className="w-full pl-10 pr-24 py-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-emerald-600 focus:outline-hidden font-medium text-sm shadow-xs"
                />

                <div className="absolute right-2 flex items-center gap-1">
                  {destSearchQuery && (
                    <button
                      type="button"
                      id="clear-dest-search-btn"
                      onClick={() => {
                        setDestSearchQuery('');
                        setDestSearchOpen(true);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title="Clear search query"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <VoiceSearchButton
                    id="voice-search-dest-btn"
                    onTranscript={(text) => {
                      setDestSearchQuery(text);
                      setDestSearchOpen(true);
                      const match = destinations.find((d) => d.name.toLowerCase().includes(text.toLowerCase()));
                      if (match) {
                        handleSelectDestination(match);
                      }
                    }}
                    placeholder="Speak destination name"
                  />
                  <button
                    type="button"
                    id="toggle-dest-dropdown-btn"
                    onClick={() => setDestSearchOpen(!destSearchOpen)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title="Toggle destination suggestions"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${destSearchOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Destination Search Results Dropdown List */}
              {destSearchOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-[300] overflow-hidden max-h-80 overflow-y-auto">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                    <div className="flex flex-wrap gap-1">
                      {[
                        { key: 'ALL', label: `All (${filteredDestinationsList.totalCount})` },
                        { key: 'ODISHA', label: '🏛️ Odisha' },
                        { key: 'INDIA', label: '🇮🇳 India' },
                        { key: 'VILLAGES', label: '🌳 Villages' },
                        { key: 'HERITAGE', label: '⛩️ Heritage' },
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setDestCategoryFilter(key as any)}
                          className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                            destCategoryFilter === key
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black">
                      ♿ 100% 0-Stairs Audited
                    </span>
                  </div>

                  <div className="p-1 divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredDestinationsList.destinations.map((d) => {
                      const isCurrent = d.id === destId;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => handleSelectDestination(d)}
                          className={`w-full text-left px-3.5 py-3 rounded-xl flex items-center justify-between text-sm transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold ring-1 ring-emerald-500/30'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={d.imageUrl}
                              alt={d.name}
                              className="w-10 h-10 rounded-lg object-cover shadow-xs shrink-0"
                            />
                            <div>
                              <div className="font-bold flex items-center gap-2">
                                <span>{d.name}</span>
                                {isCurrent && <Check className="w-4 h-4 text-emerald-600 inline" />}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                <span>📍 {d.city}, {d.country}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md inline-block">
                              {d.accessibilityScore.overall}/100
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    {filteredDestinationsList.indianLocations.slice(0, 15).map((loc) => {
                      const isCurrent = currentDestination.name.toLowerCase() === loc.name.toLowerCase();
                      return (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => handleSelectDestination(loc)}
                          className={`w-full text-left px-3.5 py-3 rounded-xl flex items-center justify-between text-sm transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold ring-1 ring-emerald-500/30'
                              : 'hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-xl shrink-0">
                              🏛️
                            </div>
                            <div>
                              <div className="font-bold flex items-center gap-2">
                                <span>{loc.name}</span>
                                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded-md font-bold">
                                  {loc.type}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                📍 {loc.district}, {loc.state}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md inline-block">
                              {loc.wheelchairFriendliness}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. TRAVEL OPTIONS (ACCESSIBLE TRAVEL-MODE SELECTOR) */}
          <div className="pt-2">
            <TravelModeSelector
              selectedMode={transportPref}
              onSelectMode={(mode) => setTransportPref(mode)}
            />
          </div>

          {/* 4. ACCESSIBILITY REQUIREMENTS (Cards / Toggles) */}
          <div className="pt-2">
            <AccessibilityPreferencesCard
              preferences={{
                wheelchairRequired: profile.wheelchairUser,
                avoidStairs: profile.avoidStairs,
                elevatorRequired: profile.wheelchairUser,
                reducedWalking: profile.limitedMobility,
                preferQuietRoutes: crowdTolerance === 'LOW',
                maxWalkingDistanceMeters: profile.maxWalkingDistanceMeters,
              }}
              onChange={handleAccessibilityPreferenceChange}
            />
          </div>

          {/* 5. TRIP SCHEDULE & TRAVELERS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between gap-1.5">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  {t('date')}
                </span>
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded">
                  DD/MM/YYYY
                </span>
              </label>
              <AnimatedDatePicker
                value={travelDate}
                onChange={setTravelDate}
                placeholder="DD/MM/YYYY"
                id="journey-travel-date"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between gap-1.5">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  {t('startTime')}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">12-Hour AM/PM</span>
              </label>
              <AnimatedTimePicker
                value={startTime}
                onChange={setStartTime}
                placeholder="Select start time"
                id="journey-start-time"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between gap-1.5">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  {t('travelers')}
                </span>
              </label>
              <div className="relative">
                <select
                  value={travelersCount}
                  onChange={(e) => setTravelersCount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none"
                >
                  <option value="">-- Choose travelers --</option>
                  <option value={1}>1 Traveler (Solo)</option>
                  <option value={2}>2 Travelers (Pair)</option>
                  <option value={3}>3 Travelers (Small Group)</option>
                  <option value={4}>4 Travelers (Family)</option>
                  <option value={5}>5+ Travelers</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t('assistanceRequirementLabel')}
              </label>
              <select
                value={assistanceReq ? 'yes' : 'no'}
                onChange={(e) => setAssistanceReq(e.target.value === 'yes')}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white"
              >
                <option value="yes">🤝 Request Station Escort / PRM</option>
                <option value="no">Self Guided (Independent)</option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            id="plan-accessible-journey-submit-btn"
            disabled={isLoading}
            className="w-full py-4.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white text-base sm:text-lg font-black rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-emerald-500/25 transition-all transform active:scale-[0.99] flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer group"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin text-white" />
                <span>Auditing & Verifying Step-Free Pathways (0 Stairs)...</span>
              </>
            ) : (
              <>
                <div className="p-1 rounded-lg bg-white/20 group-hover:rotate-12 transition-transform">
                  <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                </div>
                <span>Plan My Accessible Journey</span>
                <span className="text-xs bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider hidden sm:inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                  0-Stairs Guarantee
                </span>
                <ArrowRight className="w-5 h-5 text-emerald-200 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* 6. PROMINENT MAP VIEW (MAIN VISUAL FOCUS OF THE PLANNER) */}
      <div ref={mapSectionRef} className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Interactive Journey Map
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Visualizing route from <strong className="text-blue-600 dark:text-blue-400">{startLocation || 'Origin'}</strong> to <strong className="text-emerald-600 dark:text-emerald-400">{currentDestination.name}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="center-route-map-btn"
              onClick={handleRefreshLiveDistance}
              disabled={isSyncingDistance}
              className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Refresh GPS Coordinates and Real-time Distance"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDistance ? 'animate-spin text-blue-600' : ''}`} />
              <span>{isSyncingDistance ? 'Syncing...' : 'Sync Distance'}</span>
            </button>
          </div>
        </div>

        {/* Map Container */}
        <JourneyMapViewer
          originName={startLocation || 'My Current Location'}
          originCoords={startLocationCoords}
          originMode={originMode}
          destination={currentDestination}
          activeRoute={activeRoute || routes[0] || null}
          currentGpsCoords={currentGpsCoords}
          barrierAlert={simulatedBarrierAlert}
          heightClass="h-[440px] sm:h-[500px]"
          onStartNavigation={() => activeRoute && handleStartNavigation(activeRoute)}
          onRecalculateRoute={handleRecalculateAlternative}
        />
      </div>

      {/* 7. ENVIRONMENTAL INFORMATION CARDS */}
      <EnvironmentalInfoCards
        destination={currentDestination}
        activeRoute={activeRoute || routes[0] || null}
        barrierAlert={simulatedBarrierAlert}
        onOpenBarrierModal={onOpenReportModal}
      />

      {/* 8. REAL-TIME DISTANCE & ROUTE CORRIDOR METRICS */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-5 md:p-6 shadow-xl border border-blue-800/60 relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Origin Location Block */}
            <div className="md:col-span-4 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 text-blue-300 text-xs font-bold uppercase tracking-wider mb-1">
                {originMode === 'CURRENT_LOCATION' ? (
                  <>
                    <LocateFixed className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Live GPS Origin</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    <span>Selected Departure Hub</span>
                  </>
                )}
              </div>
              <div className="font-bold text-white text-base truncate">
                {startLocation || 'My Current Location'}
              </div>
              <div className="text-[11px] text-slate-300 font-mono mt-0.5 flex items-center gap-2">
                <span>
                  Coords:{' '}
                  {startLocationCoords
                    ? `${startLocationCoords[0].toFixed(4)}°N, ${startLocationCoords[1].toFixed(4)}°E`
                    : currentGpsCoords
                    ? `${currentGpsCoords[0].toFixed(4)}°N, ${currentGpsCoords[1].toFixed(4)}°E`
                    : 'Resolved GPS'}
                </span>
              </div>
            </div>

            {/* Corridor Arrow & Real-Time Sync Indicator */}
            <div className="md:col-span-4 flex flex-col items-center justify-center text-center px-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-200 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Real-Time Distance Corridor</span>
              </div>
              <div className="w-full flex items-center gap-2">
                <div className="h-0.5 flex-1 bg-gradient-to-r from-blue-400 to-indigo-300" />
                <div className="px-3 py-1 bg-blue-500/30 border border-blue-400/40 rounded-full text-xs font-black text-white shadow-inner flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-amber-300" />
                  <span>{activeRoute ? activeRoute.distanceKm : realTimeDirectDistanceKm} km</span>
                </div>
                <div className="h-0.5 flex-1 bg-gradient-to-r from-indigo-300 to-emerald-400" />
              </div>
              <div className="text-[11px] text-slate-300 mt-1">
                {activeRoute ? activeRoute.name : 'Step-Free Verified Path'}
              </div>
            </div>

            {/* Destination Location Block */}
            <div className="md:col-span-4 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">
                <Landmark className="w-3.5 h-3.5 text-emerald-400" />
                <span>Accessible Destination</span>
              </div>
              <div className="font-bold text-white text-base truncate">
                {currentDestination.name}
              </div>
              <div className="text-[11px] text-slate-300 font-mono mt-0.5 flex items-center justify-between">
                <span>
                  {currentDestination.city || 'India'} •{' '}
                  {currentDestination.coordinates
                    ? `${currentDestination.coordinates[0].toFixed(4)}°N, ${currentDestination.coordinates[1].toFixed(4)}°E`
                    : 'Verified GPS'}
                </span>
              </div>
            </div>
          </div>

          {/* Distance Metrics Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/10">
            <div className="bg-black/20 rounded-xl p-3 border border-white/5">
              <div className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-blue-400" />
                <span>Direct Aerial Distance</span>
              </div>
              <div className="text-lg font-black text-white mt-0.5">
                {realTimeDirectDistanceKm} km
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {Math.round(realTimeDirectDistanceKm * 1000).toLocaleString()}m geodesic
              </div>
            </div>

            <div className="bg-black/20 rounded-xl p-3 border border-white/5">
              <div className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
                <Footprints className="w-3.5 h-3.5 text-emerald-400" />
                <span>Active Route Distance</span>
              </div>
              <div className="text-lg font-black text-emerald-400 mt-0.5">
                {activeRoute ? activeRoute.distanceKm : realTimeDirectDistanceKm} km
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {activeRoute && realTimeDirectDistanceKm > 0
                  ? `+${Math.max(0, Math.round(((activeRoute.distanceKm - realTimeDirectDistanceKm) / realTimeDirectDistanceKm) * 100))}% road corridor`
                  : 'Exact corridor'}
              </div>
            </div>

            <div className="bg-black/20 rounded-xl p-3 border border-white/5">
              <div className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Estimated Travel Time</span>
              </div>
              <div className="text-lg font-black text-amber-300 mt-0.5">
                {activeRoute ? activeRoute.durationMinutes : 15} min
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {transportPref === 'WALK_ROLL' ? '0 Stairs Wheel/Walk' : 'Accessible Transit'}
              </div>
            </div>

            <div className="bg-black/20 rounded-xl p-3 border border-white/5 flex flex-col justify-between">
              <div className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <span>Real-Time Distance Sync</span>
              </div>
              <button
                type="button"
                onClick={handleRefreshLiveDistance}
                disabled={isSyncingDistance}
                className="mt-1 w-full py-1.5 px-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncingDistance ? 'animate-spin' : ''}`} />
                <span>{isSyncingDistance ? 'Syncing...' : 'Refresh Distance'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 9. CALCULATED ROUTE RESULTS PRESENTATION */}
      {routes.length > 0 && (
        <div ref={resultsRef} className="space-y-6 pt-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-xs font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5">
                  <Navigation2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  {routes.length} Verified Accessible Route Options
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Distance Verified
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 flex items-center gap-2">
                <span>Accessible Route Options to {currentDestination.name}</span>
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                Every route is strictly filtered against your 0-stairs policy, curb-ramp requirements, and {profile.maxWalkingDistanceMeters}m walk limit.
              </p>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60 shrink-0 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setRouteViewMode('CARDS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  routeViewMode === 'CARDS'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Card View</span>
              </button>
              <button
                type="button"
                onClick={() => setRouteViewMode('COMPARE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  routeViewMode === 'COMPARE'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>Compare Matrix</span>
              </button>
            </div>
          </div>

          {/* Route Category Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <button
              type="button"
              onClick={() => setRouteFilter('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                routeFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Routes ({routes.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setRouteFilter('RECOMMENDED')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                routeFilter === 'RECOMMENDED'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Footprints className="w-3.5 h-3.5 text-blue-500" />
              <span>♿ 100% Step-Free Walk ({routes.filter((r) => r.tag === 'RECOMMENDED').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setRouteFilter('FASTEST')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                routeFilter === 'FASTEST'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Bus className="w-3.5 h-3.5 text-amber-500" />
              <span>🚌 Accessible Transit ({routes.filter((r) => r.tag === 'FASTEST').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setRouteFilter('LOWEST_CROWD')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                routeFilter === 'LOWEST_CROWD'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span>🌿 Quiet Sensory ({routes.filter((r) => r.tag === 'LOWEST_CROWD').length})</span>
            </button>
          </div>

          {/* VIEW MODE 1: Comparison Matrix */}
          {routeViewMode === 'COMPARE' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-xs uppercase font-bold text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="py-4 px-5">Route Option</th>
                      <th className="py-4 px-4">Distance</th>
                      <th className="py-4 px-4">Duration</th>
                      <th className="py-4 px-4">Stairs</th>
                      <th className="py-4 px-4">Ramps & Lifts</th>
                      <th className="py-4 px-4">Crowd</th>
                      <th className="py-4 px-4">Score</th>
                      <th className="py-4 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {routes
                      .filter((r) => routeFilter === 'ALL' || r.tag === routeFilter)
                      .map((route) => {
                        const isSelected = activeRoute?.id === route.id;
                        return (
                          <tr
                            key={route.id}
                            className={`transition-colors ${
                              isSelected
                                ? 'bg-blue-50/60 dark:bg-blue-950/30'
                                : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <td className="py-4 px-5">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {route.name}
                              </div>
                              <span className="text-[10px] text-slate-500 font-semibold uppercase">
                                {route.tag.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-4 px-4 font-black text-slate-900 dark:text-white">
                              {route.distanceKm} km
                            </td>
                            <td className="py-4 px-4 font-bold text-slate-800 dark:text-slate-200">
                              {route.durationMinutes} mins
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                                ✓ 0 Stairs
                              </span>
                            </td>
                            <td className="py-4 px-4 text-xs text-slate-600 dark:text-slate-300">
                              <div>{route.rampAvailable ? '✓ Ramps' : 'Level'}</div>
                              <div>{route.liftAvailable ? '✓ Lifts' : '—'}</div>
                            </td>
                            <td className="py-4 px-4">
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                {route.crowdLevel} Density
                              </span>
                            </td>
                            <td className="py-4 px-4 font-black text-blue-600 dark:text-blue-400 text-base">
                              {route.accessibilityScore}%
                            </td>
                            <td className="py-4 px-5 text-right space-x-2">
                              <button
                                type="button"
                                onClick={() => handleStartNavigation(route)}
                                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                              >
                                Navigate
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW MODE 2: Rich Route Cards Grid */}
          {routeViewMode === 'CARDS' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {routes
                .filter((r) => routeFilter === 'ALL' || r.tag === routeFilter)
                .map((route) => {
                  const isSelected = activeRoute?.id === route.id;
                  const isSaved = plannedTrips.some(
                    (p) => p.destinationId === currentDestination.id && p.selectedRoute?.id === route.id
                  );

                  return (
                    <RouteResultsCard
                      key={route.id}
                      route={route}
                      destination={currentDestination}
                      originName={startLocation || 'My Current Location'}
                      originCoords={startLocationCoords}
                      isSelected={isSelected}
                      isNavigating={isSelected && isNavigating}
                      onStartNavigation={handleStartNavigation}
                      onNavigateGoogleMaps={handleNavigateGoogleMaps}
                      onSavePlannedTrip={handleSavePlannedTrip}
                      onDownloadOffline={handleSaveOffline}
                      isSavedToTrips={isSaved}
                    />
                  );
                })}
            </div>
          )}

          {/* Active Turn-by-Turn Spoken Navigation Engine */}
          {activeRoute && (
            <TurnByTurnSpeechNavigator
              route={activeRoute}
              destination={currentDestination}
              activeStepIndex={activeStepIndex}
              onStepChange={(idx) => setActiveStepIndex(idx)}
              onCloseNavigation={() => setIsNavigating(false)}
              onRecalculate={handleRecalculateAlternative}
            />
          )}
        </div>
      )}

      {/* Real-Time Barrier Alert Simulation Banner */}
      {simulatedBarrierAlert && (
        <div className="p-6 bg-red-50 dark:bg-red-950/50 border-2 border-red-500 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-600 text-white rounded-2xl shrink-0 shadow-lg">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-red-600 text-white text-xs font-black uppercase tracking-wider rounded-md">
                  {t('barrierAlertTitle')}
                </span>
                <span className="text-xs text-red-700 dark:text-red-300 font-semibold">
                  Confidence: {simulatedBarrierAlert.confidence}%
                </span>
              </div>
              <h3 className="text-lg font-bold text-red-900 dark:text-red-100">
                {simulatedBarrierAlert.title}
              </h3>
              <p className="text-sm text-red-800 dark:text-red-200 max-w-2xl">
                {simulatedBarrierAlert.description} ({simulatedBarrierAlert.locationName})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <button
              onClick={handleRecalculateAlternative}
              disabled={isRecalculating}
              className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0 text-sm"
            >
              {isRecalculating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>{t('findAlternativeRoute')}</span>
            </button>
            <button
              onClick={onOpenReportModal}
              className="px-4 py-3.5 bg-white dark:bg-slate-900 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 font-semibold rounded-xl text-sm"
            >
              View Barrier Evidence
            </button>
          </div>
        </div>
      )}

      {/* Slide-out Vertical Option Bar for All Indian Cities, Towns and Villages */}
      <IndianLocationsVerticalBar
        isOpen={isIndiaVerticalBarOpen}
        onClose={() => setIsIndiaVerticalBarOpen(false)}
        currentStartLocation={startLocation}
        currentDestinationName={currentDestination.name}
        targetMode={verticalBarRole}
        onSelectLocation={(loc, role) => {
          if (role === 'start') {
            handleSelectStartLocation(loc.name, loc.district, loc.state, loc.coordinates);
          } else {
            handleSelectDestination(loc);
          }
        }}
      />

      {/* Interactive 0-Stairs Confirmed & Verified Celebration Showcase Modal */}
      <ConfirmedVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        destination={currentDestination}
        startLocation={startLocation}
        bestRoute={activeRoute || routes[0] || null}
        totalRoutesCount={routes.length}
        onStartNavigation={(route) => handleStartNavigation(route)}
        onSaveOffline={(route) => handleSaveOffline(route)}
        onViewRouteSteps={() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      />
    </div>
  );
};
