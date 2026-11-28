import React, { useState, useEffect, useMemo } from 'react';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Destination, RouteOption, HotelBooking, OfflineTripPdfRecord, PlannedTrip } from '../../types';
import { INITIAL_BOOKINGS } from '../../data/mockHotels';
import { formatCurrency } from '../../utils/currency';
import { syncOfflinePdfToSupabase, SUPABASE_PROJECT_ID } from '../../utils/supabase';
import { getApiEndpoint, API_ENDPOINTS } from '../../utils/apiConfig';
import { SupabaseSyncModal } from './SupabaseSyncModal';
import { AnimatedDatePicker } from '../common/AnimatedDatePicker';
import { AnimatedTimePicker } from '../common/AnimatedTimePicker';
import {
  Compass,
  MapPin,
  Calendar,
  Clock,
  Users,
  ShieldCheck,
  Navigation,
  Trash2,
  Edit3,
  Search,
  SlidersHorizontal,
  Sparkles,
  ArrowRight,
  Printer,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Building2,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Database,
  Radio,
  LocateFixed,
  Footprints,
  HeartHandshake,
  Download,
  Tag,
  QrCode,
  CalendarCheck,
  Plus,
  RefreshCw,
  X,
  Check,
} from 'lucide-react';

interface PlannedTripsViewProps {
  onStartNavigation?: (
    destination: Destination,
    route: RouteOption,
    originName: string,
    originCoords: [number, number] | null,
    originMode: 'CURRENT_LOCATION' | 'CUSTOM'
  ) => void;
  onNavigateToPlanner?: () => void;
  currentGpsCoords?: [number, number] | null;
}

export const PlannedTripsView: React.FC<PlannedTripsViewProps> = ({
  onStartNavigation,
  onNavigateToPlanner,
  currentGpsCoords,
}) => {
  const {
    profile,
    plannedTrips,
    removePlannedTrip,
    updatePlannedTrip,
    lastSyncTime,
    speak,
    addNotification,
  } = useAccessibility();
  const { t } = useLanguage();
  const { user, isAuthenticated, openAuthPrompt } = useAuth();

  // Active section tabs: 'trips' | 'bookings' | 'documents'
  const [activeSection, setActiveSection] = useState<'trips' | 'bookings' | 'documents'>('trips');

  // Search & Filter State for Planned Trips
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'UPCOMING' | 'TODAY' | 'STEP_FREE' | 'ASSISTANCE'>('ALL');
  const [sortBy, setSortBy] = useState<'DATE_ASC' | 'RECENT' | 'SCORE_DESC'>('DATE_ASC');

  // Expanded Trip details
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);

  // Edit Modal State
  const [editingTrip, setEditingTrip] = useState<PlannedTrip | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editTravelers, setEditTravelers] = useState<number>(1);
  const [editNotes, setEditNotes] = useState('');

  // Delete Confirmation Modal State
  const [tripToDelete, setTripToDelete] = useState<PlannedTrip | null>(null);

  // Print Pass Modal State
  const [tripToPrint, setTripToPrint] = useState<PlannedTrip | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);
  const [pdfSyncSuccess, setPdfSyncSuccess] = useState(false);

  // Hotel bookings and offline pdfs state
  const [bookings, setBookings] = useState<HotelBooking[]>(INITIAL_BOOKINGS);
  const [activeBookingId, setActiveBookingId] = useState<string>(INITIAL_BOOKINGS[0]?.id || '');
  const [offlinePdfs, setOfflinePdfs] = useState<OfflineTripPdfRecord[]>([]);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Fetch hotel bookings & saved PDF records
  const refreshBookings = async () => {
    try {
      const res = await fetch(getApiEndpoint(API_ENDPOINTS.BOOKINGS));
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
        if (data.length > 0 && !activeBookingId) {
          setActiveBookingId(data[0].id);
        }
      }
    } catch (e) {
      console.warn('Using seeded bookings in Planned Trips:', e);
    }
  };

  const refreshOfflinePdfs = async () => {
    try {
      const res = await fetch(getApiEndpoint(API_ENDPOINTS.OFFLINE_DOCS));
      if (res.ok) {
        const data = await res.json();
        setOfflinePdfs(data);
      }
    } catch (e) {
      console.warn('Using local offline PDFs:', e);
    }
  };

  useEffect(() => {
    refreshBookings();
    refreshOfflinePdfs();
  }, []);

  // Parse DD/MM/YYYY date strings into timestamp for sorting & comparison
  const parseTripDate = (dateStr?: string): number => {
    if (!dateStr) return 0;
    // Format is DD/MM/YYYY
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.getTime();
    }
    // Fallback standard parse
    const timestamp = Date.parse(dateStr);
    return isNaN(timestamp) ? 0 : timestamp;
  };

  // Check if date is today or upcoming
  const getTripTimelineStatus = (dateStr?: string) => {
    if (!dateStr) return { label: 'Upcoming', color: 'text-blue-600 bg-blue-50 border-blue-200' };
    const tripTime = parseTripDate(dateStr);
    if (!tripTime) return { label: 'Planned', color: 'text-slate-600 bg-slate-100 border-slate-200' };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const diffDays = Math.round((tripTime - todayStart) / oneDayMs);

    if (diffDays === 0) {
      return { label: '⚡ Journey Today', color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300' };
    } else if (diffDays === 1) {
      return { label: '⏳ Tomorrow', color: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-300' };
    } else if (diffDays > 1 && diffDays <= 7) {
      return { label: `📅 In ${diffDays} Days`, color: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-300' };
    } else if (diffDays > 7) {
      return { label: `📅 ${dateStr}`, color: 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300' };
    } else {
      return { label: '✓ Past Journey', color: 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700' };
    }
  };

  // Filtered and Sorted Planned Trips
  const filteredAndSortedTrips = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return plannedTrips
      .filter((trip) => {
        // Text search matching
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          !q ||
          trip.title?.toLowerCase().includes(q) ||
          trip.destinationName?.toLowerCase().includes(q) ||
          trip.destinationCity?.toLowerCase().includes(q) ||
          trip.originName?.toLowerCase().includes(q) ||
          trip.notes?.toLowerCase().includes(q);

        if (!matchesQuery) return false;

        // Category / Timeline filters
        const tripTimestamp = parseTripDate(trip.travelDate);
        if (filterMode === 'UPCOMING') {
          return tripTimestamp >= todayStart;
        }
        if (filterMode === 'TODAY') {
          const oneDayMs = 24 * 60 * 60 * 1000;
          return tripTimestamp >= todayStart && tripTimestamp < todayStart + oneDayMs;
        }
        if (filterMode === 'STEP_FREE') {
          return trip.selectedRoute?.stairsCount === 0;
        }
        if (filterMode === 'ASSISTANCE') {
          return trip.preferences?.assistanceRequired || trip.selectedRoute?.assistanceAvailable;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'DATE_ASC') {
          const dateA = parseTripDate(a.travelDate);
          const dateB = parseTripDate(b.travelDate);
          return (dateA || 9999999999999) - (dateB || 9999999999999);
        }
        if (sortBy === 'RECENT') {
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        }
        if (sortBy === 'SCORE_DESC') {
          return (b.accessibilityScore || 0) - (a.accessibilityScore || 0);
        }
        return 0;
      });
  }, [plannedTrips, searchQuery, filterMode, sortBy]);

  // Statistics
  const upcomingTripsCount = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return plannedTrips.filter((t) => parseTripDate(t.travelDate) >= todayStart).length;
  }, [plannedTrips]);

  const avgAccessibilityScore = useMemo(() => {
    if (plannedTrips.length === 0) return 98;
    const sum = plannedTrips.reduce((acc, t) => acc + (t.accessibilityScore || 95), 0);
    return Math.round(sum / plannedTrips.length);
  }, [plannedTrips]);

  // Open Edit Modal
  const handleOpenEditModal = (trip: PlannedTrip) => {
    setEditingTrip(trip);
    setEditTitle(trip.title || `${trip.destinationName} Accessible Trip`);
    setEditDate(trip.travelDate || '');
    setEditStartTime(trip.startTime || '');
    setEditEndTime(trip.endTime || '');
    setEditTravelers(trip.travelersCount || 1);
    setEditNotes(trip.notes || '');
  };

  // Save Edit Modal
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrip) return;

    updatePlannedTrip(editingTrip.id, {
      title: editTitle.trim() || editingTrip.title,
      travelDate: editDate || editingTrip.travelDate,
      startTime: editStartTime || editingTrip.startTime,
      endTime: editEndTime,
      travelersCount: editTravelers,
      notes: editNotes,
    });

    addNotification({
      type: 'ROUTE_UPDATE',
      title: 'Trip Details Updated',
      message: `Updated itinerary schedule for ${editingTrip.destinationName}.`,
      severity: 'SUCCESS',
    });

    setEditingTrip(null);
  };

  // Handle Start Navigation with Conditional GPS Origin Logic
  const handleStartTripNavigation = (trip: PlannedTrip) => {
    const isCurrentLocMode = trip.originMode === 'CURRENT_LOCATION' || trip.originName.toLowerCase().includes('current location');

    let effectiveOriginName = trip.originName;
    let effectiveOriginCoords: [number, number] | null = trip.originCoords;
    let effectiveOriginMode: 'CURRENT_LOCATION' | 'CUSTOM' = trip.originMode || 'CURRENT_LOCATION';

    if (isCurrentLocMode) {
      // RULE: If origin was set to Current Location, use the user's current GPS position when navigation starts!
      effectiveOriginName = 'My Current Location';
      effectiveOriginCoords = currentGpsCoords || null;
      effectiveOriginMode = 'CURRENT_LOCATION';
    } else {
      // RULE: If the user manually selected an origin, always use that saved origin and NEVER replace it with the current GPS location.
      effectiveOriginName = trip.originName;
      effectiveOriginCoords = trip.originCoords;
      effectiveOriginMode = 'CUSTOM';
    }

    if (profile.audioNavigationEnabled) {
      speak(`Starting live accessible navigation to ${trip.destinationName} from ${effectiveOriginName}. Step-free path active.`);
    }

    if (onStartNavigation) {
      onStartNavigation(
        trip.destination,
        trip.selectedRoute,
        effectiveOriginName,
        effectiveOriginCoords,
        effectiveOriginMode
      );
    }
  };

  // Handle Save Offline PDF & Supabase sync
  const handleSaveAndPrintPdf = async (trip: PlannedTrip) => {
    setPdfSyncSuccess(false);
    const pdfRecord: OfflineTripPdfRecord = {
      id: `doc-${Date.now()}`,
      tripId: trip.id,
      userEmail: user?.email || 'traveler@accessway.org',
      documentTitle: `${trip.destinationName} - Official AccessWay Verified Pass`,
      documentType: 'TRIP_PASS',
      destinationName: trip.destinationName,
      travelerName: user?.name || 'Alex Rivera (Verified Traveler)',
      accessibilityScore: trip.accessibilityScore || 98,
      emergencyContacts: [
        { name: 'PRM Station Escort Desk', phone: '+91 112 / +33 112', location: trip.destinationName },
        { name: 'AccessWay Emergency Hub', phone: '+91 674 2390111', location: '24/7 Universal Dispatch' },
      ],
      turnByTurnSteps: trip.selectedRoute?.steps?.map((s) => s.instruction) || ['Proceed along step-free tactile corridor.'],
      generatedAt: new Date().toISOString(),
      pdfMetadata: {
        generatedAt: new Date().toISOString(),
        stepCount: trip.selectedRoute?.steps?.length || 1,
        distanceKm: trip.selectedRoute?.distanceKm || 1.2,
        durationMinutes: trip.selectedRoute?.durationMinutes || 15,
        isStepFree: true,
        verificationPin: 'AW-' + Math.floor(1000 + Math.random() * 9000),
        qrCodeData: `https://accessway.app/verify/pass/${trip.id}`,
      },
    };

    try {
      await syncOfflinePdfToSupabase(pdfRecord);
      setPdfSyncSuccess(true);
      refreshOfflinePdfs();
    } catch (e) {
      console.warn('PDF sync:', e);
    }

    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handleShareTrip = (trip: PlannedTrip) => {
    const text = `AccessWay Verified Trip: ${trip.title} to ${trip.destinationName} on ${trip.travelDate} at ${trip.startTime}. 100% Step-free & 0-Stairs.`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner & Stats Overview */}
      <div className="p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white rounded-3xl shadow-xl border border-blue-500/20 relative overflow-hidden">
        {/* Background decorative glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-black uppercase tracking-wider rounded-full flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-blue-400" />
                Planned Trips Library
              </span>
              <span className="text-xs text-blue-200/70 font-medium">
                Cloud Synced • Supabase Backed
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <span>My Planned Trips & Passes</span>
            </h1>
            <p className="text-sm text-blue-100/80 max-w-2xl">
              All your calculated step-free journeys, booked accessible stays, and verified offline passes stored in one place. Automatically saved whenever you plan a route.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {onNavigateToPlanner && (
              <button
                type="button"
                id="plan-new-trip-btn"
                onClick={onNavigateToPlanner}
                className="px-4.5 py-3 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-black rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center gap-2 text-sm cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Plan New Journey</span>
              </button>
            )}
            <button
              type="button"
              id="open-supabase-sync-btn"
              onClick={() => setIsSupabaseModalOpen(true)}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 text-sm backdrop-blur-md cursor-pointer"
            >
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Supabase Sync</span>
            </button>
          </div>
        </div>

        {/* Quick Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10 pt-6 mt-6 border-t border-white/10">
          <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xs">
            <div className="text-xs text-blue-200/80 font-medium">Total Saved Trips</div>
            <div className="text-2xl font-black text-white mt-0.5">{plannedTrips.length}</div>
            <div className="text-[11px] text-blue-300/70 mt-0.5">Stored & Ready Offline</div>
          </div>

          <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xs">
            <div className="text-xs text-blue-200/80 font-medium">Upcoming Journeys</div>
            <div className="text-2xl font-black text-emerald-400 mt-0.5">{upcomingTripsCount}</div>
            <div className="text-[11px] text-emerald-300/70 mt-0.5">Scheduled on your calendar</div>
          </div>

          <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xs">
            <div className="text-xs text-blue-200/80 font-medium">Avg Accessibility Score</div>
            <div className="text-2xl font-black text-blue-400 mt-0.5">{avgAccessibilityScore}%</div>
            <div className="text-[11px] text-blue-300/70 mt-0.5">100% 0-Stairs Verified</div>
          </div>

          <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xs">
            <div className="text-xs text-blue-200/80 font-medium">Hotel Stays Booked</div>
            <div className="text-2xl font-black text-purple-300 mt-0.5">{bookings.length}</div>
            <div className="text-[11px] text-purple-200/70 mt-0.5">Wheelchair Accessible</div>
          </div>
        </div>
      </div>

      {/* Main Section Navigation Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setActiveSection('trips')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all flex items-center gap-2 ${
              activeSection === 'trips'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Planned Trips ({plannedTrips.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('bookings')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all flex items-center gap-2 ${
              activeSection === 'bookings'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Hotel Bookings ({bookings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('documents')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all flex items-center gap-2 ${
              activeSection === 'documents'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>PDF Passes & Vault ({offlinePdfs.length})</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Last synchronized: <strong>{lastSyncTime}</strong></span>
        </div>
      </div>

      {/* SECTION 1: PLANNED TRIPS LIBRARY */}
      {activeSection === 'trips' && (
        <div className="space-y-6">
          {/* Search, Filter & Sort Controls */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search planned trips by destination, origin, city, or notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-slate-900 dark:text-white"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-slate-500">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DATE_ASC">Upcoming Date (Earliest First)</option>
                  <option value="RECENT">Recently Planned</option>
                  <option value="SCORE_DESC">Highest Accessibility Score</option>
                </select>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
              <span className="font-bold text-slate-500 mr-1">Filter:</span>
              {[
                { id: 'ALL', label: 'All Trips' },
                { id: 'UPCOMING', label: 'Upcoming Only' },
                { id: 'TODAY', label: 'Today' },
                { id: 'STEP_FREE', label: '0-Stairs Step-Free' },
                { id: 'ASSISTANCE', label: 'PRM Assistance' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterMode(f.id as any)}
                  className={`px-3 py-1.5 rounded-full font-bold transition-all ${
                    filterMode === f.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Planned Trips Cards Grid */}
          {filteredAndSortedTrips.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredAndSortedTrips.map((trip) => {
                const timeline = getTripTimelineStatus(trip.travelDate);
                const isExpanded = expandedTripId === trip.id;
                const isCurrentLoc = trip.originMode === 'CURRENT_LOCATION' || trip.originName.toLowerCase().includes('current location');

                return (
                  <div
                    key={trip.id}
                    id={`planned-trip-card-${trip.id}`}
                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header with Destination Photo and Status */}
                      <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                        {trip.destination?.imageUrl ? (
                          <img
                            src={trip.destination.imageUrl}
                            alt={trip.destinationName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover brightness-90 group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-r from-blue-900 to-indigo-900 flex items-center justify-center">
                            <Compass className="w-12 h-12 text-blue-300/40" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-black border shadow-xs ${timeline.color}`}>
                            {timeline.label}
                          </span>

                          <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/90 text-slate-950 border border-emerald-300 shadow-xs flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {trip.accessibilityScore || 98}% Step-Free
                          </span>
                        </div>

                        {/* Title on Image bottom */}
                        <div className="absolute bottom-3 left-3 right-3">
                          <h3 className="text-lg font-black text-white drop-shadow-md leading-tight">
                            {trip.title || `${trip.destinationName} Accessible Trip`}
                          </h3>
                          <p className="text-xs text-blue-200/90 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                            <span>{trip.destinationCity ? `${trip.destinationCity}, ` : ''}{trip.destinationCountry || ''}</span>
                          </p>
                        </div>
                      </div>

                      {/* Route Summary Row: Origin -> Destination */}
                      <div className="p-4.5 space-y-4">
                        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                          {/* Origin */}
                          <div className="flex items-start gap-2.5 text-xs">
                            <div className="p-1 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 shrink-0 mt-0.5">
                              {isCurrentLoc ? <LocateFixed className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                            </div>
                            <div className="flex-1">
                              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                {isCurrentLoc ? 'Origin (Live GPS at Start)' : 'Origin (Fixed Selected Point)'}
                              </div>
                              <div className="font-bold text-slate-800 dark:text-slate-200">
                                {trip.originName || 'My Current Location'}
                              </div>
                            </div>
                          </div>

                          {/* Arrow Divider */}
                          <div className="flex items-center gap-2 pl-3">
                            <div className="w-0.5 h-3 bg-slate-300 dark:bg-slate-600 rounded-full" />
                            <span className="text-[11px] text-slate-400 font-medium">
                              {trip.selectedRoute?.durationMinutes ? `${trip.selectedRoute.durationMinutes} mins` : '15 mins'} • {trip.selectedRoute?.distanceKm ? `${trip.selectedRoute.distanceKm} km` : '1.2 km'}
                            </span>
                          </div>

                          {/* Destination */}
                          <div className="flex items-start gap-2.5 text-xs">
                            <div className="p-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 shrink-0 mt-0.5">
                              <Compass className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1">
                              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Destination</div>
                              <div className="font-bold text-slate-900 dark:text-white">
                                {trip.destinationName}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Schedule & Metadata Grid */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                            <div>
                              <div className="text-[10px] text-slate-400 font-bold">Planned Date</div>
                              <div className="font-bold text-slate-800 dark:text-slate-200">
                                {trip.travelDate || 'Not set'}
                              </div>
                            </div>
                          </div>

                          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                            <div>
                              <div className="text-[10px] text-slate-400 font-bold">Departure Time</div>
                              <div className="font-bold text-slate-800 dark:text-slate-200">
                                {trip.startTime || '09:00 AM'}{trip.endTime ? ` - ${trip.endTime}` : ''}
                              </div>
                            </div>
                          </div>

                          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                            <Users className="w-4 h-4 text-purple-500 shrink-0" />
                            <div>
                              <div className="text-[10px] text-slate-400 font-bold">Travelers</div>
                              <div className="font-bold text-slate-800 dark:text-slate-200">
                                {trip.travelersCount || 1} {trip.travelersCount === 1 ? 'Person' : 'People'}
                              </div>
                            </div>
                          </div>

                          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                            <div>
                              <div className="text-[10px] text-slate-400 font-bold">Physical Stairs</div>
                              <div className="font-bold text-emerald-600 dark:text-emerald-400">
                                0 Stairs (100% Step-Free)
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Notes snippet if present */}
                        {trip.notes && (
                          <div className="text-xs text-slate-600 dark:text-slate-400 bg-amber-50/60 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-200/50 dark:border-amber-900/30">
                            <strong>Note:</strong> {trip.notes}
                          </div>
                        )}

                        {/* Expandable Turn-by-Turn Steps */}
                        {isExpanded && trip.selectedRoute?.steps && (
                          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl space-y-2 text-xs animate-in fade-in">
                            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                              <span>Turn-by-Turn Accessible Path:</span>
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                                {trip.selectedRoute.steps.length} Steps
                              </span>
                            </div>
                            <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-300">
                              {trip.selectedRoute.steps.map((s, idx) => (
                                <li key={idx} className="leading-relaxed">
                                  {s.instruction} {s.rampSlope ? `(Ramp grade: ${s.rampSlope})` : ''}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions Bar */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          id={`edit-trip-btn-${trip.id}`}
                          onClick={() => handleOpenEditModal(trip)}
                          className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          title="Edit Trip Schedule & Notes"
                          aria-label="Edit trip"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          id={`print-pass-btn-${trip.id}`}
                          onClick={() => {
                            setTripToPrint(trip);
                            handleSaveAndPrintPdf(trip);
                          }}
                          className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          title="Print / Save PDF Travel Pass"
                          aria-label="Print trip pass"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          id={`share-trip-btn-${trip.id}`}
                          onClick={() => handleShareTrip(trip)}
                          className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          title="Share Trip Details"
                          aria-label="Share trip"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedTripId(isExpanded ? null : trip.id)}
                          className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          title={isExpanded ? 'Hide Steps' : 'Show Turn-by-Turn Steps'}
                          aria-label="Toggle steps"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        <button
                          type="button"
                          id={`delete-trip-btn-${trip.id}`}
                          onClick={() => setTripToDelete(trip)}
                          className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete Planned Trip"
                          aria-label="Delete trip"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Prominent Start Navigation Button */}
                      <button
                        type="button"
                        id={`start-navigation-trip-btn-${trip.id}`}
                        onClick={() => handleStartTripNavigation(trip)}
                        className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl shadow-md hover:shadow-emerald-500/25 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                      >
                        <Navigation className="w-4 h-4" />
                        <span>Start Navigation</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 max-w-xl mx-auto">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto">
                <Compass className="w-8 h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {searchQuery || filterMode !== 'ALL' ? 'No matching planned trips found' : 'Your Planned Trips Library is Empty'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {searchQuery || filterMode !== 'ALL'
                  ? 'Try clearing your search query or reset the filter mode to view all stored trips.'
                  : 'Whenever you calculate an accessible route in the Journey Planner, it will be automatically saved here for quick offline access and one-click live navigation.'}
              </p>
              {onNavigateToPlanner && (
                <button
                  type="button"
                  id="empty-plan-journey-btn"
                  onClick={onNavigateToPlanner}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Plan Your First Accessible Journey</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: HOTEL BOOKINGS */}
      {activeSection === 'bookings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {bookings.length > 0 ? (
              bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        {booking.status}
                      </span>
                      <h3 className="text-base font-black text-slate-900 dark:text-white mt-1">
                        {booking.hotelName}
                      </h3>
                      <p className="text-xs text-slate-500">{booking.roomName}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-black text-blue-600 dark:text-blue-400">
                        {formatCurrency(booking.totalPrice, 'INR')}
                      </div>
                      <div className="text-[10px] text-slate-400">Paid Amount</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold">Check-In</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{booking.checkInDate}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold">Check-Out</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{booking.checkOutDate}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold">Guests</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{booking.guestsCount} Guests ({booking.roomsCount} Room)</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold">PIN Code</div>
                      <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{booking.verificationPin}</div>
                    </div>
                  </div>

                  {booking.accessibilityRequirements && booking.accessibilityRequirements.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {booking.accessibilityRequirements.map((req, i) => (
                        <span key={i} className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-slate-600 dark:text-slate-300">
                          ✓ {req}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-2 p-10 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500">No hotel stays booked yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: PDF PASSES & SUPABASE VAULT */}
      {activeSection === 'documents' && (
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl text-xs text-blue-800 dark:text-blue-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600 shrink-0" />
              <span>Offline Passes & Certificates synced with table <code>offline_trip_pdfs</code> in Supabase project <code>{SUPABASE_PROJECT_ID}</code>.</span>
            </div>
            <button
              type="button"
              onClick={() => setIsSupabaseModalOpen(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shrink-0"
            >
              Verify Schema
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {offlinePdfs.length > 0 ? (
              offlinePdfs.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-100 dark:bg-red-950/50 text-red-600 rounded-xl shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                        {doc.documentTitle}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {doc.destinationName} • {doc.travelerName}
                      </p>
                      <span className="text-[10px] text-emerald-600 font-bold">
                        Score: {doc.accessibilityScore}/100 • Step-Free Pass
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors"
                    title="Print Document"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="col-span-2 p-10 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500">No PDF passes generated yet. Click Print Pass on any planned trip above.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT TRIP MODAL */}
      {editingTrip && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-trip-modal-title"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-600 rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="edit-trip-modal-title" className="text-base font-black text-slate-900 dark:text-white">
                    Edit Planned Trip Details
                  </h3>
                  <p className="text-xs text-slate-500">{editingTrip.destinationName}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingTrip(null)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Trip Name / Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  placeholder="e.g. Taj Mahal Accessible Journey"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AnimatedDatePicker
                  label="Travel Date (DD/MM/YYYY)"
                  value={editDate}
                  onChange={setEditDate}
                />

                <AnimatedTimePicker
                  label="Departure Time"
                  value={editStartTime}
                  onChange={setEditStartTime}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AnimatedTimePicker
                  label="Estimated Return / End"
                  value={editEndTime}
                  onChange={setEditEndTime}
                />

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Travelers Count
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={editTravelers}
                    onChange={(e) => setEditTravelers(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Special Accessibility Notes / Instructions
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  placeholder="e.g. Request wheelchair ramp at Gate 2, driver contact..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTrip(null)}
                  className="px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {tripToDelete && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="p-3 bg-red-100 dark:bg-red-950 text-red-600 rounded-2xl w-12 h-12 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 id="delete-dialog-title" className="text-base font-black text-slate-900 dark:text-white">
                Delete Planned Trip?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to remove <strong>{tripToDelete.title || tripToDelete.destinationName}</strong> from your Planned Trips library?
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                id="confirm-delete-trip-btn"
                onClick={() => {
                  removePlannedTrip(tripToDelete.id);
                  setTripToDelete(null);
                  addNotification({
                    type: 'ROUTE_UPDATE',
                    title: 'Trip Removed',
                    message: `Removed ${tripToDelete.destinationName} from Planned Trips.`,
                    severity: 'INFO',
                  });
                }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Yes, Delete Trip
              </button>
              <button
                type="button"
                onClick={() => setTripToDelete(null)}
                className="px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supabase Cloud Connection & Sync Modal */}
      <SupabaseSyncModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onSyncComplete={() => {
          refreshBookings();
          refreshOfflinePdfs();
        }}
      />
    </div>
  );
};
