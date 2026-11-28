import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroBannerTicker } from './components/HeroBannerTicker';
import { HeroSection } from './components/HeroSection';
import { IncidentSection } from './components/IncidentSection';
import { TraceSection } from './components/TraceSection';
import { EvidenceSection } from './components/EvidenceSection';
import { OriginSection } from './components/OriginSection';
import { FixCounterfactualSection } from './components/FixCounterfactualSection';
import { CaseClosedSection } from './components/CaseClosedSection';
import { Footer } from './components/Footer';
import { DossierModal } from './components/DossierModal';
import { TwinklingStarfield } from './components/TwinklingStarfield';
import { Preloader } from './components/Preloader';
import { useSmoothScroll } from './hooks/useSmoothScroll';
import { TelemetryFragment } from './types';
import { TELEMETRY_FRAGMENTS } from './data/incidentData';
import { CaelisPage } from './pages/Caelis/CaelisPage';
import { SyntheticMissionData } from './types/caelis';
import { AnalysisProvider, useAnalysis } from './context/AnalysisContext';

function AppContent() {
  const { backendConnected, checkBackendHealth } = useAnalysis();
  const { smoothScrollTo } = useSmoothScroll();
  const [isPreloading, setIsPreloading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<'home' | 'telemetry'>('home');
  const [activeSyntheticData, setActiveSyntheticData] = useState<SyntheticMissionData | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('manila_theme');
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  const [activeSection, setActiveSection] = useState<string>('incident');
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);
  const [selectedFragment, setSelectedFragment] = useState<TelemetryFragment | null>(null);
  const [jitterEnabled, setJitterEnabled] = useState<boolean>(true);

  const handlePreloaderComplete = () => {
    setIsPreloading(false);
  };

  // Sync theme with documentElement and localStorage
  const handleToggleTheme = () => {
    setTheme((prev) => {
      const nextTheme = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('manila_theme', nextTheme);
      } catch {
        // ignore
      }
      return nextTheme;
    });
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Scroll spy for updating active navigation tab via performant IntersectionObserver
  useEffect(() => {
    const sections = ['incident', 'trace', 'evidence', 'origin', 'fix', 'case-closed'];
    
    const observer = new IntersectionObserver((entries) => {
      let mostVisible = null;
      let maxRatio = 0;
      
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
          maxRatio = entry.intersectionRatio;
          mostVisible = entry.target.id;
        }
      });
      
      if (mostVisible) {
        setActiveSection(mostVisible);
      }
    }, {
      rootMargin: '-20% 0px -50% 0px',
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0]
    });

    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleNavigate = (sectionId: string) => {
    // If Telemetry tab or any analysis sub-route requested
    if (
      sectionId === 'telemetry' || 
      sectionId === 'caelis' || 
      sectionId === 'mission-lab' || 
      sectionId === 'reconstruction' || 
      sectionId === 'evidence-trace' || 
      sectionId === 'incident-report'
    ) {
      setCurrentPage('telemetry');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    if (sectionId === 'home' || sectionId === 'top') {
      if (currentPage !== 'home') {
        setCurrentPage('home');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (currentPage !== 'home') {
      setCurrentPage('home');
      // Give React time to render home before scrolling
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) smoothScrollTo(element, -65);
      }, 50);
      return;
    }

    const element = document.getElementById(sectionId);
    if (element) {
      smoothScrollTo(element, -65);
    }
  };

  const handleOpenFragmentInspector = (fragment: TelemetryFragment) => {
    setSelectedFragment(fragment);
    setIsDossierOpen(true);
  };

  return (
    <div className={`min-h-screen relative transition-colors duration-500 selection:bg-[#DC143C] selection:text-[#FAF6EE] ${theme === 'dark' ? 'dark bg-[#080B11] text-[#FAF6EE]' : 'bg-[#F0EAD6] text-[#1A1A1A]'}`}>
      
      {/* Incident Dossier Loading Screen */}
      {isPreloading && (
        <Preloader 
          theme={theme} 
          onComplete={handlePreloaderComplete} 
        />
      )}

      {/* Global Heavy Grunge Scratched Film Grain & Noise Overlay */}
      <div className="grunge-overlay pointer-events-none"></div>

      {/* Reactive Twinkling Stars, Earths & Orbiting Satellites */}
      <TwinklingStarfield theme={theme} showSatellites={currentPage === 'home'} />

      {/* Sticky Navigation Header with 2 Tabs: HOME & TELEMETRY ANALYSIS */}
      <Navbar
        theme={theme}
        onToggleTheme={handleToggleTheme}
        showThemeToggle={currentPage === 'home'}
        activeSection={currentPage === 'telemetry' ? 'telemetry' : activeSection}
        onNavigate={handleNavigate}
        onOpenDossier={() => {
          setSelectedFragment(TELEMETRY_FRAGMENTS[0]);
          setIsDossierOpen(true);
        }}
        jitterEnabled={jitterEnabled}
        onToggleJitter={() => setJitterEnabled(!jitterEnabled)}
      />

      {/* Global Sovereign / Backend Connectivity Banner */}
      {!backendConnected && (
        <div className="bg-amber-950/80 border-b border-amber-500/40 text-amber-200 px-4 py-1.5 text-xs font-mono flex items-center justify-between z-40 relative">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            <span>
              <strong>Sovereign Mode:</strong> Backend offline or air-gapped. Running with verified local reference model.
            </span>
          </div>
          <button
            onClick={() => checkBackendHealth()}
            className="px-2 py-0.5 rounded bg-amber-900/60 hover:bg-amber-800 text-amber-100 border border-amber-600/50 text-[11px] cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {currentPage === 'telemetry' ? (
        <CaelisPage 
          onBack={() => {
            setCurrentPage('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }} 
          theme={theme}
          onNavigateToSection={(sec) => handleNavigate(sec)}
          activeSyntheticData={activeSyntheticData}
        />
      ) : (
        <>
          {/* Component 1: Top Hero Banner Ticker */}
          <HeroBannerTicker 
            variant="crimson" 
            text="INCIDENT T+00:00 · CAUSE UNKNOWN · TRACE IN PROGRESS · ANOMALY: CUBESAT POWER BUS COLLAPSE · 6 UNRESOLVED ALARMS · CAUSAL TOPOLOGY ACTIVE · " 
          />

          {/* Hero Section */}
          <HeroSection
            onScrollToIncident={() => handleNavigate('incident')}
            onOpenDossier={() => {
              setSelectedFragment(TELEMETRY_FRAGMENTS[0]);
              setIsDossierOpen(true);
            }}
            onOpenMissionLab={() => setCurrentPage('telemetry')}
            jitterEnabled={jitterEnabled}
          />

          {/* Section 1: The Incident (Six Failures. Undifferentiated.) */}
          <IncidentSection
            onSelectFragment={handleOpenFragmentInspector}
            onProceedToTrace={() => handleNavigate('trace')}
            jitterEnabled={jitterEnabled}
          />

          {/* Section 2: The Trace (Follow The String Back.) */}
          <TraceSection
            onSelectFragment={handleOpenFragmentInspector}
            onProceedToEvidence={() => handleNavigate('evidence')}
            onOpenMissionLab={() => setCurrentPage('telemetry')}
            jitterEnabled={jitterEnabled}
          />

          {/* Section 3: The Evidence (Every Thread Has A Reason.) */}
          <EvidenceSection
            onProceedToOrigin={() => handleNavigate('origin')}
            onOpenCaelis={() => setCurrentPage('telemetry')}
            onOpenMissionLab={() => setCurrentPage('telemetry')}
            onOpenReconstruction={() => {
              setCurrentPage('telemetry');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenEvidenceTrace={() => {
              setCurrentPage('telemetry');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            jitterEnabled={jitterEnabled}
          />

          {/* Section 4: The Origin */}
          <OriginSection
            onSelectFragment={handleOpenFragmentInspector}
            onProceedToFix={() => handleNavigate('fix')}
            jitterEnabled={jitterEnabled}
          />

          {/* Section 5: CAELIS AI Pattern Recognition Engine */}
          <FixCounterfactualSection
            onSelectFragment={handleOpenFragmentInspector}
            onProceedToCaseClosed={() => handleNavigate('case-closed')}
            onOpenCaelis={() => {
              setCurrentPage('telemetry');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            jitterEnabled={jitterEnabled}
          />

          {/* Secondary Bottom Banner Ticker before CTA */}
          <HeroBannerTicker 
            variant="charcoal" 
            text="INVESTIGATION SUMMARY: ZERO HARDWARE FAILURES IN BUS · LOGICAL SENSOR SANITY ENFORCEMENT DEPLOYED · 100% ORBIT PRESERVATION · REF #GT-8849-ORBIT · " 
          />

          {/* Section 6: Case Closed */}
          <CaseClosedSection
            onOpenMissionLab={() => {
              setCurrentPage('telemetry');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenDossier={() => {
              setSelectedFragment(TELEMETRY_FRAGMENTS[0]);
              setIsDossierOpen(true);
            }}
            onOpenIncidentReport={() => {
              setCurrentPage('telemetry');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onScrollToTop={() => smoothScrollTo(0, 0)}
            jitterEnabled={jitterEnabled}
          />

          {/* Site Footer */}
          <Footer
            onNavigateSection={handleNavigate}
            onOpenPage={() => {
              setCurrentPage('telemetry');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onScrollToTop={() => smoothScrollTo(0, 0)}
          />

          {/* Full Investigation Case Dossier Modal */}
          <DossierModal
            isOpen={isDossierOpen}
            onClose={() => setIsDossierOpen(false)}
            initialFragment={selectedFragment}
          />
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AnalysisProvider>
      <AppContent />
    </AnalysisProvider>
  );
}
