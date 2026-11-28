import React, { useState, useEffect } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AccessibilityProvider, useAccessibility } from './context/AccessibilityContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Destination, BarrierReport, RouteOption } from './types';
import { INITIAL_DESTINATIONS, INITIAL_BARRIERS } from './data/mockData';
import { ALL_DESTINATIONS } from './data/destinationsData';
import { getApiEndpoint, API_ENDPOINTS } from './utils/apiConfig';

import { Navbar } from './components/layout/Navbar';
import { InteractiveMap } from './components/map/InteractiveMap';
import { JourneyPlanner } from './components/journey/JourneyPlanner';
import { DestinationCard } from './components/destination/DestinationCard';
import { DestinationDetailModal } from './components/destination/DestinationDetailModal';
import { BarrierReportModal } from './components/barrier/BarrierReportModal';
import { LanguageModal } from './components/common/LanguageModal';
import { AccessibilityModal } from './components/common/AccessibilityModal';
import { CursorBackgroundAnimation } from './components/common/CursorBackgroundAnimation';
import { GuidedDemoTour } from './components/demo/GuidedDemoTour';
import { AuthModal } from './components/auth/AuthModal';
import { AuthPage } from './components/auth/AuthPage';
import { HomePage3D } from './components/home/HomePage3D';
import { AccessWayLogo } from './components/common/AccessWayLogo';
import { SugamyaChatbot } from './components/sugamya/SugamyaChatbot';
import { TouristDestinationsDirectory } from './components/destination/TouristDestinationsDirectory';
import { HotelDirectory } from './components/hotels/HotelDirectory';
import { BarrierList } from './components/barrier/BarrierList';
import { AssistanceDirectory } from './components/assistance/AssistanceDirectory';
import { AuditorDashboard } from './components/dashboard/AuditorDashboard';
import { AdminAnalyticsView } from './components/dashboard/AdminAnalyticsView';
import { PlannedTripsView } from './components/trips/PlannedTripsView';

import {
  Compass,
  MapPin,
  AlertTriangle,
  HeartHandshake,
  ShieldCheck,
  Search,
  Filter,
  Sparkles,
  SlidersHorizontal,
  Bot,
  Volume2,
  Bookmark,
  Download,
  Globe2,
} from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { t } = useLanguage();
  const { role, profile, simpleMode, savedJourneys } = useAccessibility();
  const { user, isAuthenticated } = useAuth();

  const [viewMode, setViewMode] = useState<'home' | 'website'>('home');
  const [activeTab, setActiveTab] = useState<string>('planner');
  const [destinations, setDestinations] = useState<Destination[]>(ALL_DESTINATIONS);
  const [barriers, setBarriers] = useState<BarrierReport[]>(INITIAL_BARRIERS);

  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(
    ALL_DESTINATIONS[0]
  );
  const [activeRoute, setActiveRoute] = useState<RouteOption | null>(null);
  const [inspectingDestination, setInspectingDestination] = useState<Destination | null>(null);

  // Navigation and Route synchronization
  const [startLocationName, setStartLocationName] = useState<string>('My Current Location');
  const [startLocationCoords, setStartLocationCoords] = useState<[number, number] | null>(null);
  const [originMode, setOriginMode] = useState<'CURRENT_LOCATION' | 'CUSTOM'>('CURRENT_LOCATION');
  const [currentGpsCoords, setCurrentGpsCoords] = useState<[number, number] | null>(null);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  // Initialize browser GPS on mount - store real GPS in currentGpsCoords without overriding custom origins
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          const coords: [number, number] = [latitude, longitude];
          setCurrentGpsCoords(coords);
          setStartLocationCoords((prev) => {
            // Only set startLocationCoords if currently in CURRENT_LOCATION mode or no custom coords yet
            return prev === null ? coords : prev;
          });
          console.log('[GPS Navigation Root] Initial browser GPS acquired:', { latitude, longitude, accuracy });
        },
        (err) => {
          console.warn('[GPS Navigation Root] Initial GPS access:', err.message);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  const handleNavigateToMap = (
    dest: Destination,
    route?: RouteOption | null,
    originName?: string,
    originCoords?: [number, number] | null
  ) => {
    if (dest) setSelectedDestination(dest);
    if (route) setActiveRoute(route);
    if (originName) setStartLocationName(originName);
    if (originCoords) setStartLocationCoords(originCoords);
    setIsNavigating(true);
    setActiveStepIndex(0);
    setActiveTab('map');
  };

  // Search & Filter state for destinations
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showOnlyBookmarked, setShowOnlyBookmarked] = useState(false);

  // Modals state
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isAccessibilityModalOpen, setIsAccessibilityModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isGuidedTourOpen, setIsGuidedTourOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Fetch live destinations and barriers
  const refreshData = async () => {
    try {
      const [destRes, barRes] = await Promise.all([
        fetch(getApiEndpoint(API_ENDPOINTS.DESTINATIONS)),
        fetch(getApiEndpoint(API_ENDPOINTS.BARRIERS)),
      ]);
      if (destRes.ok) {
        const destData = await destRes.json();
        setDestinations(destData);
      }
      if (barRes.ok) {
        const barData = await barRes.json();
        setBarriers(barData);
      }
    } catch (e) {
      console.warn('Using initial seed data:', e);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const filteredDestinations = destinations.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'ALL' || d.category === selectedCategory;

    const matchesBookmark =
      !showOnlyBookmarked || (user?.savedDestinations && user.savedDestinations.includes(d.id));

    return matchesSearch && matchesCategory && matchesBookmark;
  });

  if (viewMode === 'home') {
    return (
      <HomePage3D
        onEnterWebsite={() => setViewMode('website')}
      />
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Interactive Cursor Moving Background Animation */}
      <CursorBackgroundAnimation />

      {/* Skip to Main Content (WCAG requirement) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:p-4 focus:bg-blue-600 focus:text-white focus:rounded-xl focus:shadow-2xl"
      >
        Skip to main accessibility content
      </a>

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNavigateToHome={() => setViewMode('home')}
        onOpenLanguageModal={() => setIsLanguageModalOpen(true)}
        onOpenAccessibilityModal={() => setIsAccessibilityModalOpen(true)}
        onOpenGuidedTour={() => setIsGuidedTourOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Main App Container */}
      <main id="main-content" className="grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Tab 1: Journey Planner */}
        {activeTab === 'planner' && (
          <div className="space-y-8">
            <section aria-label="Accessible Journey Planner Form">
              <JourneyPlanner
                destinations={destinations}
                selectedDestination={selectedDestination}
                onSelectDestination={(d) => setSelectedDestination(d)}
                activeRoute={activeRoute}
                setActiveRoute={setActiveRoute}
                onOpenReportModal={() => setIsReportModalOpen(true)}
                startLocation={startLocationName}
                setStartLocation={setStartLocationName}
                startLocationCoords={startLocationCoords}
                setStartLocationCoords={setStartLocationCoords}
                originMode={originMode}
                setOriginMode={setOriginMode}
                currentGpsCoords={currentGpsCoords}
                isNavigating={isNavigating}
                setIsNavigating={setIsNavigating}
                activeStepIndex={activeStepIndex}
                setActiveStepIndex={setActiveStepIndex}
                onNavigateToTrips={() => setActiveTab('trips')}
                onNavigateToMap={handleNavigateToMap}
              />
            </section>
          </div>
        )}

        {/* Tab: Dedicated Live Map & GPS Navigation */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                  <MapPin className="w-6 h-6 text-blue-600" />
                  <span>Live Interactive Map & GPS Navigation</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Full-screen interactive step-free map with verified ramps, elevator markers, tactile corridors, and live obstacle alerts.
                </p>
              </div>
            </div>

            <InteractiveMap
              destinations={destinations}
              barriers={barriers}
              selectedDestination={selectedDestination}
              activeRoute={activeRoute}
              startLocationName={startLocationName}
              startLocationCoords={startLocationCoords}
              originMode={originMode}
              currentGpsCoords={currentGpsCoords}
              isNavigating={isNavigating}
              activeStepIndex={activeStepIndex}
              onStepChange={(idx) => setActiveStepIndex(idx)}
              onStopNavigation={() => setIsNavigating(false)}
              onSelectDestination={(d) => {
                setSelectedDestination(d);
              }}
              onReportBarrierAtLocation={(coords, name) => {
                setIsReportModalOpen(true);
              }}
              onSetGpsAsStart={(locName, coords) => {
                setOriginMode('CURRENT_LOCATION');
                setStartLocationName(locName);
                setStartLocationCoords(coords);
              }}
            />
          </div>
        )}

        {/* Tab 2: Verified Tourist Destinations & World Wonders Directory */}
        {activeTab === 'destinations' && (
          <TouristDestinationsDirectory
            destinations={destinations}
            onSelectDestination={(d) => {
              setSelectedDestination(d);
              setActiveTab('planner');
            }}
            onViewDetails={(d) => setInspectingDestination(d)}
          />
        )}

        {/* Tab: Verified Accessible Hotels & Guest Houses */}
        {activeTab === 'hotels' && (
          <HotelDirectory onNavigateToTrips={() => setActiveTab('trips')} />
        )}

        {/* Tab 3: Real-Time Barrier Tracker */}
        {activeTab === 'barriers' && (
          <BarrierList
            barriers={barriers}
            onOpenReportModal={() => setIsReportModalOpen(true)}
            onRefresh={refreshData}
          />
        )}

        {/* Tab 4: Assistance Hubs Directory */}
        {activeTab === 'assistance' && (
          <AssistanceDirectory destinations={destinations} />
        )}

        {/* Tab 5: Planned Trips & Itinerary Library */}
        {activeTab === 'trips' && (
          <PlannedTripsView
            currentGpsCoords={currentGpsCoords}
            onNavigateToPlanner={() => setActiveTab('planner')}
            onStartNavigation={(dest, route, origName, origCoords, origMode) => {
              setSelectedDestination(dest);
              setActiveRoute(route);
              setStartLocationName(origName);
              setStartLocationCoords(origCoords);
              setOriginMode(origMode);
              setIsNavigating(true);
              setActiveStepIndex(0);
              setActiveTab('map');
            }}
          />
        )}

        {/* Tab 6: Auditor Verification Desk */}
        {activeTab === 'auditor' && (
          <AuditorDashboard barriers={barriers} onRefresh={refreshData} />
        )}

        {/* Tab 7: Admin Analytics & Coverage */}
        {activeTab === 'analytics' && <AdminAnalyticsView />}

        {/* Tab 8: Dedicated Full-Page Login & Sign In with Video Animation */}
        {activeTab === 'auth' && (
          <div className="max-w-6xl mx-auto py-2 animate-fade-in">
            <AuthPage
              onSuccess={() => setActiveTab('planner')}
              initialMode="LOGIN"
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AccessWayLogo variant="compact" size="sm" />
            <span className="text-slate-400">|</span>
            <span>Universal Accessible Journey Planner & Real-Time Navigation</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline">WCAG 2.2 AA Compliant</span>
            <span className="hidden md:inline">Zero-Hallucination Policy</span>
            <button
              onClick={() => setIsGuidedTourOpen(true)}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
            >
              Start Guided Tour
            </button>
          </div>
        </div>
      </footer>

      {/* Global Modals & Drawers */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onNavigateToTrips={() => setActiveTab('trips')}
        onSignOut={() => setViewMode('home')}
      />

      <LanguageModal
        isOpen={isLanguageModalOpen}
        onClose={() => setIsLanguageModalOpen(false)}
      />

      <AccessibilityModal
        isOpen={isAccessibilityModalOpen}
        onClose={() => setIsAccessibilityModalOpen(false)}
      />

      <BarrierReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        destinations={destinations}
        onBarrierSubmitted={refreshData}
      />

      <DestinationDetailModal
        destination={inspectingDestination}
        isOpen={!!inspectingDestination}
        onClose={() => setInspectingDestination(null)}
        onPlanJourney={(d) => {
          setSelectedDestination(d);
          setActiveTab('planner');
        }}
        onReportBarrier={() => {
          setInspectingDestination(null);
          setIsReportModalOpen(true);
        }}
      />

      <GuidedDemoTour
        isOpen={isGuidedTourOpen}
        onClose={() => setIsGuidedTourOpen(false)}
        onNavigateTab={(t) => setActiveTab(t)}
        onOpenAccessibilityModal={() => setIsAccessibilityModalOpen(true)}
        onOpenReportModal={() => setIsReportModalOpen(true)}
      />

      {/* Sugamya AI - Universal Accessibility Travel Assistant */}
      <SugamyaChatbot
        destinations={destinations}
        onPlanJourney={(d) => {
          setSelectedDestination(d);
          setActiveTab('planner');
        }}
        onViewOnMap={(d) => {
          handleNavigateToMap(d);
        }}
        onInspectDestination={(d) => {
          setInspectingDestination(d);
        }}
        onNavigateTab={(tab) => {
          setActiveTab(tab as any);
        }}
        userLiveCoordinates={currentGpsCoords}
      />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AccessibilityProvider>
          <MainAppContent />
        </AccessibilityProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
