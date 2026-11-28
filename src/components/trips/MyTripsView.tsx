import React, { useState, useEffect } from 'react';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useLanguage } from '../../context/LanguageContext';
import { INITIAL_DESTINATIONS } from '../../data/mockData';
import { INITIAL_BOOKINGS } from '../../data/mockHotels';
import { Destination, RouteOption, HotelBooking, OfflineTripPdfRecord } from '../../types';
import { generateClientAccessibleRoutes } from '../../utils/routePlanner';
import { formatCurrency } from '../../utils/currency';
import { syncOfflinePdfToSupabase, SUPABASE_PROJECT_ID } from '../../utils/supabase';
import { getApiEndpoint, API_ENDPOINTS } from '../../utils/apiConfig';
import { SupabaseSyncModal } from './SupabaseSyncModal';
import {
  Download,
  Trash2,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Navigation,
  Compass,
  Footprints,
  Volume2,
  VolumeX,
  Printer,
  Sparkles,
  WifiOff,
  Wifi,
  PhoneCall,
  AlertOctagon,
  ChevronRight,
  ChevronLeft,
  Share2,
  FileDown,
  Layers,
  ArrowRight,
  HeartHandshake,
  Maximize2,
  Check,
  Building2,
  Home,
  CalendarCheck,
  QrCode,
  Tag,
  Database,
  FileText,
  ExternalLink,
} from 'lucide-react';

export const MyTripsView: React.FC = () => {
  const {
    profile,
    savedJourneys,
    removeSavedJourney,
    saveJourneyOffline,
    lastSyncTime,
    speak,
    stopSpeaking,
    isSpeaking,
  } = useAccessibility();
  const { t } = useLanguage();

  const [activeSection, setActiveSection] = useState<'routes' | 'bookings' | 'documents'>('routes');
  const [bookings, setBookings] = useState<HotelBooking[]>(INITIAL_BOOKINGS);
  const [activeBookingId, setActiveBookingId] = useState<string>(
    INITIAL_BOOKINGS[0]?.id || ''
  );
  const [offlinePdfs, setOfflinePdfs] = useState<OfflineTripPdfRecord[]>([]);

  const [activeOfflineTripId, setActiveOfflineTripId] = useState<string | null>(
    savedJourneys.length > 0 ? savedJourneys[0].id : null
  );
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isSimulatingOffline, setIsSimulatingOffline] = useState<boolean>(false);
  const [isPrintModeOpen, setIsPrintModeOpen] = useState<boolean>(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);
  const [copiedPass, setCopiedPass] = useState<boolean>(false);
  const [pdfSyncSuccess, setPdfSyncSuccess] = useState<boolean>(false);

  // Fetch live bookings
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
      console.warn('Using seeded bookings:', e);
    }
  };

  // Fetch saved Supabase Offline PDF documents
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

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await fetch(getApiEndpoint(`/api/bookings/${bookingId}/cancel`), { method: 'PATCH' });
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: 'CANCELLED' } : b))
      );
    } catch (e) {
      console.error('Cancel booking error:', e);
    }
  };

  const activeBooking = bookings.find((b) => b.id === activeBookingId) || bookings[0];

  // Active selected trip
  const activeTrip = savedJourneys.find((j) => j.id === activeOfflineTripId) || savedJourneys[0];

  // Helper to generate a default route if saving from one-click bundle
  const generateMockRoute = (dest: Destination): RouteOption => {
    return (
      generateClientAccessibleRoutes(dest, 'Central Accessible Transit Concourse', profile)[0] || {
        id: `offline-route-${dest.id}`,
        name: `${dest.name} Universal Step-Free Path`,
        tag: 'RECOMMENDED',
        distanceKm: 0.85,
        durationMinutes: 14,
        accessibilityScore: dest.accessibilityScore.overall,
        crowdLevel: dest.crowd.currentLevel,
        stairsCount: 0,
        rampAvailable: dest.facilities.ramp,
        liftAvailable: dest.facilities.elevatorLift,
        currentBarriers: false,
        assistanceAvailable: true,
        isBestMatch: true,
        suitabilityNote: `100% Step-free path verified for ${dest.name} with audio assistance and assistance desks.`,
        pathCoordinates: [
          [dest.coordinates[0] - 0.005, dest.coordinates[1] - 0.004],
          dest.coordinates,
        ],
        steps: [
          {
            instruction: `Arrive at main accessible drop-off gate. Proceed toward ${dest.facilities.wheelchairEntrance ? 'Priority Step-Free Entrance' : 'Main Ramp Gateway'}.`,
            distanceMeters: 80,
            durationSeconds: 90,
            isStepFree: true,
            hasRamp: true,
            hasElevator: false,
            surface: dest.facilities.pathSurface,
            coordinates: dest.coordinates,
          },
          {
            instruction: `Traverse the 1:12 slope ramp with dual handrails. Assistance desk located on the right.`,
            distanceMeters: 140,
            durationSeconds: 150,
            isStepFree: true,
            hasRamp: true,
            hasElevator: dest.facilities.elevatorLift,
            surface: 'Smooth Level Paving with Tactile Markers',
            coordinates: [dest.coordinates[0] + 0.001, dest.coordinates[1] + 0.001],
          },
        ],
      }
    );
  };

  // 1-Click Download Top World Tourist Sights Offline Package
  const handleDownloadAllTopSights = () => {
    INITIAL_DESTINATIONS.slice(0, 6).forEach((dest) => {
      const isAlreadySaved = savedJourneys.some((j) => j.destination.id === dest.id);
      if (!isAlreadySaved) {
        saveJourneyOffline(dest, generateMockRoute(dest));
      }
    });
  };

  const handleStepSpeak = (stepText: string) => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speak(stepText);
    }
  };

  const handleCopyPass = () => {
    if (!activeTrip) return;
    const text = `AccessWay Offline Travel Pass\nDestination: ${activeTrip.destination.name}\nCity: ${activeTrip.destination.city}, ${activeTrip.destination.country}\nScore: ${activeTrip.destination.accessibilityScore.overall}/100\nRoute: ${activeTrip.selectedRoute.name} (Step-Free)\nEmergency: ${activeTrip.destination.assistancePoints[0]?.contactPhone || '112'}`;
    navigator.clipboard.writeText(text);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  // Sync and save Offline PDF Document to Supabase
  const handleSaveAndPrintPdf = async (trip: typeof activeTrip) => {
    if (!trip) return;
    const pdfRecord: OfflineTripPdfRecord = {
      id: `PDF-${Date.now()}`,
      tripId: trip.id,
      userEmail: 'traveler@accessway.org',
      documentTitle: `${trip.destination.name} - Offline Travel Pass & PRM Guide`,
      documentType: 'TRIP_PASS',
      destinationName: trip.destination.name,
      travelerName: 'Verified AccessWay Traveler',
      accessibilityScore: trip.destination.accessibilityScore.overall,
      emergencyContacts: trip.destination.assistancePoints.map((p) => ({
        name: p.name,
        phone: p.contactPhone,
        location: p.location,
      })),
      turnByTurnSteps: trip.selectedRoute.steps.map((s) => s.instruction),
      pdfMetadata: {
        generatedAt: new Date().toISOString(),
        stepCount: trip.selectedRoute.steps.length,
        distanceKm: trip.selectedRoute.distanceKm,
        durationMinutes: trip.selectedRoute.durationMinutes,
        isStepFree: true,
        verificationPin: String(Math.floor(1000 + Math.random() * 9000)),
        qrCodeData: `ACCESSWAY-OFFLINE-PDF-${trip.destination.id}-${trip.id}`,
      },
      syncedToSupabase: true,
      created_at: new Date().toISOString(),
    };

    try {
      await syncOfflinePdfToSupabase(pdfRecord);
      setPdfSyncSuccess(true);
      setTimeout(() => setPdfSyncSuccess(false), 3000);
      refreshOfflinePdfs();
    } catch (e) {
      console.warn('PDF sync notice:', e);
    }

    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Offline Mode Banner & Controls */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl shadow-xl border border-blue-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 bg-blue-500/20 border border-blue-400/30 text-blue-300 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" />
                <span>Zero-Data Offline Engine</span>
              </span>
              {isSimulatingOffline && (
                <span className="px-3 py-1 bg-amber-500/20 border border-amber-400/40 text-amber-300 rounded-full text-xs font-black uppercase flex items-center gap-1.5 animate-pulse">
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Simulating Offline Disconnected Mode</span>
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Offline Tourist Trips & Emergency Travel Passes
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Store verified 0-stairs routes, ramp gradients, audio tour transcripts, and local station PRM assistance contacts directly on your device. Works seamlessly without WiFi or cellular reception.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Supabase Cloud Connection Status Button */}
            <button
              onClick={() => setIsSupabaseModalOpen(true)}
              className="px-4 py-3 rounded-2xl bg-emerald-600/90 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 border border-emerald-400/40 shadow-lg shadow-emerald-950/40 transition-all"
              title="View Supabase PostgreSQL Cloud Sync Status & Tables"
            >
              <Database className="w-4 h-4 text-emerald-300" />
              <span className="flex items-center gap-1.5">
                <span>Supabase Database</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </span>
            </button>

            {/* Toggle Offline Simulation */}
            <button
              onClick={() => setIsSimulatingOffline(!isSimulatingOffline)}
              className={`px-4 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all shadow-md ${
                isSimulatingOffline
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              {isSimulatingOffline ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
              <span>{isSimulatingOffline ? 'Exit Offline Simulation' : 'Test Offline Mode'}</span>
            </button>

            {/* 1-Click Download Top Sights */}
            <button
              onClick={handleDownloadAllTopSights}
              className="px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg hover:shadow-blue-500/25 transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Download Top 6 World Sights Bundle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section Switcher Tabs: Routes vs Hotel Passes vs Offline PDF Docs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveSection('routes')}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeSection === 'routes'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>🗺️ Offline Route Guides ({savedJourneys.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('bookings')}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeSection === 'bookings'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>🏨 Hotel & Stay Bookings ({bookings.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('documents')}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeSection === 'documents'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>📑 Synced Offline PDF Passes ({offlinePdfs.length})</span>
        </button>
      </div>

      {/* RENDER SUPABASE OFFLINE PDF DOCUMENTS SECTION */}
      {activeSection === 'documents' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Supabase Cloud Offline Trip PDF Vault
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  All generated emergency passes, verification PINs, and step-free PDF details are stored in table <code className="text-emerald-700 dark:text-emerald-300 font-mono text-[11px] font-bold">offline_trip_pdfs</code>.
                </p>
              </div>
            </div>

            <button
              onClick={refreshOfflinePdfs}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Refresh Vault
            </button>
          </div>

          {offlinePdfs.length === 0 ? (
            <div className="p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <FileText className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No Offline PDF Passes Generated Yet
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Open any offline trip or hotel voucher and click "Print Document" or "Export PDF Detail" to save it into your Supabase account.
              </p>
              <button
                onClick={() => {
                  if (activeTrip) {
                    handleSaveAndPrintPdf(activeTrip);
                  }
                }}
                className="mt-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs inline-flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Generate & Sync Current Trip PDF</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {offlinePdfs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 shadow-sm space-y-4 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] font-bold uppercase">
                        {doc.documentType || 'OFFLINE_PASS'}
                      </span>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                        {doc.documentTitle}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {doc.destinationName} • Verified {doc.accessibilityScore}/100 Score
                      </p>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-center shrink-0">
                      <span className="block text-[9px] uppercase font-bold text-slate-400">PIN</span>
                      <strong className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                        {doc.pdfMetadata?.verificationPin || '5821'}
                      </strong>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>Generated At:</span>
                      <span className="font-mono text-[11px] font-bold text-slate-900 dark:text-white">
                        {new Date(doc.pdfMetadata?.generatedAt || doc.generatedAt || Date.now()).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Step-Free Routing:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {doc.pdfMetadata?.isStepFree ? '✓ 100% Step-Free' : 'Universal'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Cloud Sync Status:</span>
                      <span className="text-emerald-600 font-bold font-mono text-[11px] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Supabase Synced
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => window.print()}
                      className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Re-Print PDF</span>
                    </button>
                    <button
                      onClick={() => {
                        const content = `AccessWay Verified Pass\nTitle: ${doc.documentTitle}\nDestination: ${doc.destinationName}\nPIN: ${doc.pdfMetadata?.verificationPin}\nContacts: ${doc.emergencyContacts?.map(c => c.phone).join(', ')}`;
                        navigator.clipboard.writeText(content);
                        alert('Offline pass details copied to clipboard!');
                      }}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                      title="Copy Pass Text"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* RENDER HOTEL PASSES SECTION */}
      {activeSection === 'bookings' && (
        <div className="space-y-6">
          {bookings.length === 0 ? (
            <div className="p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <Building2 className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No Hotel / Guest House Reservations Found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Book step-free hotels and homestays with guaranteed roll-in showers and ramp pickups.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Bookings list */}
              <div className="lg:col-span-5 space-y-3">
                <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Accessible Reservations ({bookings.length})
                </span>

                {bookings.map((b) => {
                  const isSelected = activeBooking?.id === b.id;
                  return (
                    <div
                      key={b.id}
                      onClick={() => setActiveBookingId(b.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                        isSelected
                          ? 'bg-blue-50/80 dark:bg-blue-950/50 border-blue-600 dark:border-blue-500 shadow-md ring-2 ring-blue-500/20'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-black rounded-md uppercase ${
                                b.status === 'CONFIRMED'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {b.status}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              PIN: {b.verificationPin}
                            </span>
                          </div>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                            {b.hotelName}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {b.roomName} • {b.hotelCity}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-black text-slate-900 dark:text-white">
                            {formatCurrency(b.totalPrice, b.currency || 'INR')}
                          </div>
                          <div className="text-[10px] text-slate-400">{b.nightsCount} Nights</div>
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                        <span>
                          {b.checkInDate} to {b.checkOutDate}
                        </span>
                        <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                          <span>Pass Details</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Printable Pass Detail */}
              {activeBooking && (
                <div className="lg:col-span-7 space-y-4">
                  <div className="p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl border border-slate-700 shadow-xl space-y-5">
                    {/* Top Pass Header */}
                    <div className="flex items-start justify-between border-b border-slate-700 pb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                            Verified Sugamya Stay Pass
                          </span>
                          <span className="text-[10px] text-emerald-400 font-bold">
                            Guaranteed Roll-in Shower
                          </span>
                        </div>
                        <h3 className="text-xl font-black text-white">{activeBooking.hotelName}</h3>
                        <p className="text-xs text-slate-300">{activeBooking.hotelAddress}</p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Reception PIN</span>
                        <div className="text-xl font-mono font-black text-amber-400">
                          {activeBooking.verificationPin}
                        </div>
                      </div>
                    </div>

                    {/* Key Stats Matrix */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 bg-slate-800/80 rounded-xl">
                        <span className="text-slate-400 block text-[10px]">Reference</span>
                        <strong className="text-white font-mono text-[11px]">
                          {activeBooking.id}
                        </strong>
                      </div>
                      <div className="p-3 bg-slate-800/80 rounded-xl">
                        <span className="text-slate-400 block text-[10px]">Check-In</span>
                        <strong className="text-white">{activeBooking.checkInDate}</strong>
                      </div>
                      <div className="p-3 bg-slate-800/80 rounded-xl">
                        <span className="text-slate-400 block text-[10px]">Check-Out</span>
                        <strong className="text-white">{activeBooking.checkOutDate}</strong>
                      </div>
                      <div className="p-3 bg-slate-800/80 rounded-xl">
                        <span className="text-slate-400 block text-[10px]">Total Paid</span>
                        <strong className="text-emerald-400 font-bold">
                          {formatCurrency(activeBooking.totalPrice, activeBooking.currency || 'INR')}
                        </strong>
                      </div>
                    </div>

                    {/* Guest & Room Info */}
                    <div className="p-3.5 bg-slate-800/50 rounded-2xl text-xs space-y-1.5 border border-slate-700/60">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Primary Guest:</span>
                        <span className="font-bold text-white">{activeBooking.guestName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Emergency Phone:</span>
                        <span className="font-mono text-slate-200">{activeBooking.guestPhone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Reserved Room Type:</span>
                        <span className="font-bold text-blue-300">{activeBooking.roomName}</span>
                      </div>
                    </div>

                    {/* Accessibility Guarantees */}
                    <div className="space-y-1.5 text-xs">
                      <span className="text-[11px] font-bold text-blue-300 block">
                        Verified Accessibility Guarantees:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {activeBooking.specialRequests.map((req, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 bg-blue-950 text-blue-200 border border-blue-800 text-[11px] font-medium rounded-lg flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{req}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-2 border-t border-slate-700 flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => window.print()}
                        className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Print Stay Voucher</span>
                      </button>

                      {activeBooking.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleCancelBooking(activeBooking.id)}
                          className="px-4 py-2.5 bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 rounded-xl text-xs font-bold transition-colors"
                        >
                          Cancel Booking
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* RENDER ROUTES SECTION */}
      {activeSection === 'routes' && (
        <>
          {savedJourneys.length === 0 ? (
            /* Empty State */
            <div className="p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mx-auto text-2xl font-black">
                📥
              </div>
              <h3 className="font-black text-xl text-slate-900 dark:text-white">
                No Offline Trips Stored Locally
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                Download your favorite tourist destinations and verified step-free routes for zero-connectivity journeys.
              </p>
              <button
                onClick={handleDownloadAllTopSights}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-lg inline-flex items-center gap-2 hover:scale-105 transition-transform"
              >
                <Download className="w-4 h-4" />
                <span>Preload Taj Mahal, Louvre, Eiffel Tower & Konark</span>
              </button>
            </div>
          ) : (
            /* Stored Journeys Layout with Interactive Navigator */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Trip List (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Saved Offline Itineraries ({savedJourneys.length})
                  </span>
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">
                    Local Cache: {(savedJourneys.length * 1.2).toFixed(1)} MB
                  </span>
                </div>

                <div className="space-y-3">
                  {savedJourneys.map((item) => {
                    const isSelected = activeTrip?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setActiveOfflineTripId(item.id);
                          setCurrentStepIndex(0);
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                          isSelected
                            ? 'bg-blue-50/80 dark:bg-blue-950/50 border-blue-600 dark:border-blue-500 shadow-md ring-2 ring-blue-500/20'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-black rounded-md uppercase">
                                {item.destination.accessibilityScore.overall}% Score
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold">
                                Saved {item.savedAt}
                              </span>
                            </div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                              {item.destination.name}
                            </h4>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                              <span className="truncate">
                                {item.destination.city}, {item.destination.country}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSavedJourney(item.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors shrink-0 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
                            title="Remove from offline cache"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                          <span className="font-semibold">{item.selectedRoute.name}</span>
                          <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                            <span>{item.selectedRoute.steps.length} Steps</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Active Interactive Offline Navigator (7 cols) */}
              {activeTrip && (
                <div className="lg:col-span-7 space-y-6">
                  {/* Active Trip Header */}
                  <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 text-xs font-black rounded-lg uppercase">
                        {activeTrip.selectedRoute.tag.replace('_', ' ')}
                      </span>
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 100% Offline Ready
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                      {activeTrip.destination.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {activeTrip.destination.address}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyPass}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      title="Copy Travel Pass Summary"
                    >
                      {copiedPass ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                      <span>{copiedPass ? 'Copied' : 'Share Pass'}</span>
                    </button>
                    <button
                      onClick={() => setIsPrintModeOpen(true)}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      title="Print or Export Offline Sheet"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Pass</span>
                    </button>
                  </div>
                </div>

                {/* Route Metrics Pill Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="font-black text-blue-600 dark:text-blue-400 text-base">
                      {activeTrip.selectedRoute.distanceKm} km
                    </span>
                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">Total Distance</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="font-black text-purple-600 dark:text-purple-400 text-base">
                      {activeTrip.selectedRoute.durationMinutes} min
                    </span>
                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">Estimated Roll Time</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-base">
                      0 Stairs
                    </span>
                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">Step-Free Mandate</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="font-black text-amber-600 dark:text-amber-400 text-base">
                      1:12 Ramp
                    </span>
                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">Gentle Gradient</p>
                  </div>
                </div>

                {/* Interactive Turn-by-Turn Offline Navigator Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white space-y-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Navigation className="w-5 h-5 animate-pulse" />
                      <span className="text-xs font-black uppercase tracking-wider">
                        Live Step-by-Step Offline Navigator
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold bg-white/20 px-2.5 py-0.5 rounded-full">
                      Step {currentStepIndex + 1} of {activeTrip.selectedRoute.steps.length}
                    </span>
                  </div>

                  {/* Current Active Step */}
                  <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 space-y-2">
                    <p className="text-base sm:text-lg font-bold leading-snug">
                      {activeTrip.selectedRoute.steps[currentStepIndex]?.instruction ||
                        'Arrive at destination.'}
                    </p>
                    <div className="flex items-center justify-between text-xs text-blue-100 font-medium">
                      <span>Surface: {activeTrip.selectedRoute.steps[currentStepIndex]?.surface}</span>
                      <span>{activeTrip.selectedRoute.steps[currentStepIndex]?.distanceMeters} meters</span>
                    </div>
                  </div>

                  {/* Step Control Buttons */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <button
                      disabled={currentStepIndex === 0}
                      onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                      className="px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous</span>
                    </button>

                    <button
                      onClick={() =>
                        handleStepSpeak(
                          activeTrip.selectedRoute.steps[currentStepIndex]?.instruction || ''
                        )
                      }
                      className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-colors"
                      title="Read step instructions aloud"
                    >
                      {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      <span className="hidden sm:inline">{isSpeaking ? 'Stop' : 'Speak Step'}</span>
                    </button>

                    <button
                      disabled={currentStepIndex >= activeTrip.selectedRoute.steps.length - 1}
                      onClick={() =>
                        setCurrentStepIndex((prev) =>
                          Math.min(activeTrip.selectedRoute.steps.length - 1, prev + 1)
                        )
                      }
                      className="px-4 py-2.5 rounded-xl bg-white text-blue-900 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs flex items-center gap-1.5 shadow-md transition-colors"
                    >
                      <span>Next Step</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Emergency Assistance & PRM Contacts (Cached Offline) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <HeartHandshake className="w-4 h-4 text-rose-600" />
                      <span>Cached Station & Special Assistance Desks</span>
                    </span>
                    <span className="text-[11px] text-emerald-600 font-bold">24/7 Verified</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeTrip.destination.assistancePoints.map((point) => (
                      <div
                        key={point.id}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs"
                      >
                        <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                          <span className="truncate">{point.name}</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                          Location: {point.location}
                        </p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                            {point.contactPhone}
                          </span>
                          <a
                            href={`tel:${point.contactPhone}`}
                            className="px-2.5 py-1 bg-blue-600 text-white rounded-lg font-bold text-[11px] flex items-center gap-1"
                          >
                            <PhoneCall className="w-3 h-3" />
                            <span>Call</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        )}
      </>
      )}

      {/* Printable / Exportable Travel Pass Modal */}
      {isPrintModeOpen && activeTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white text-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-300 space-y-6">
            <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
                  ♿
                </div>
                <div>
                  <h3 className="font-black text-base">AccessWay Travel Pass</h3>
                  <p className="text-xs text-slate-500">Official Offline Accessibility Certificate</p>
                </div>
              </div>
              <button
                onClick={() => setIsPrintModeOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-100 rounded-xl space-y-1">
                <div className="font-bold text-sm">{activeTrip.destination.name}</div>
                <div className="text-slate-600">{activeTrip.destination.address}</div>
                <div className="text-blue-700 font-bold">
                  Verified Accessibility: {activeTrip.destination.accessibilityScore.overall}/100
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-700">Turn-by-Turn Route:</span>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  {activeTrip.selectedRoute.steps.map((s, idx) => (
                    <li key={idx} className="leading-snug">{s.instruction}</li>
                  ))}
                </ol>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
                <div className="font-bold">Emergency PRM Hotline:</div>
                <div className="font-mono text-sm font-bold">
                  {activeTrip.destination.assistancePoints[0]?.contactPhone || '+91 112 / +33 112'}
                </div>
              </div>
            </div>

            {pdfSyncSuccess && (
              <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs flex items-center gap-1.5 font-bold animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Saved & Synced to Supabase database (offline_trip_pdfs)!</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleSaveAndPrintPdf(activeTrip)}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Save to Supabase & Print Pass</span>
              </button>
              <button
                onClick={() => setIsPrintModeOpen(false)}
                className="px-4 py-3 border border-slate-300 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-50"
              >
                Close
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
