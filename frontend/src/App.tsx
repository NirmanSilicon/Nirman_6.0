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
import { MissionLabPage } from './pages/MissionLab/MissionLabPage';
import { CausalReconstructionPage } from './pages/Reconstruction/CausalReconstructionPage';
import { EvidenceTracePage } from './pages/EvidenceTrace/EvidenceTracePage';
import { IncidentReportPage } from './pages/IncidentReport/IncidentReportPage';
import { SyntheticMissionData } from './types/caelis';
import { AnalysisProvider, useAnalysis } from './context/AnalysisContext';

function AppContent() {
  const { backendConnected, backendHealth, checkBackendHealth, isBackendChecking, analysis, status } = useAnalysis();
  const { smoothScrollTo } = useSmoothScroll();
  const [isPreloading, setIsPreloading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<'home' | 'caelis' | 'mission-lab' | 'reconstruction' | 'evidence-trace' | 'incident-report'>('home');
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
      // Find the most visible intersecting section
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
      rootMargin: '-20% 0px -50% 0px', // Adjusted to trigger roughly near the upper-middle of viewport
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0] // Granular thresholds to track the most visible
    });

    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleNavigate = (sectionId: string) => {
    if (sectionId === 'origin') {
      setCurrentPage('caelis');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (sectionId === 'mission-lab' || sectionId === 'trace') {
      setCurrentPage('mission-lab');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (sectionId === 'evidence' || sectionId === 'reconstruction') {
      setCurrentPage('reconstruction');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (sectionId === 'evidence-trace') {
      setCurrentPage('evidence-trace');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (sectionId === 'incident-report' || sectionId === 'report' || sectionId === 'case-closed') {
      setCurrentPage('incident-report');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    if (currentPage !== 'home') {
      setCurrentPage('home');
      // Give React time to render home before scrolling
      setTimeout(() => {
        if (sectionId === 'top') {
          smoothScrollTo(0, 0);
          return;
        }
        const element = document.getElementById(sectionId);
        if (element) smoothScrollTo(element, -65);
      }, 50);
      return;
    }

    if (sectionId === 'top') {
      smoothScrollTo(0, 0);
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
      
      {/* Incident Dossier Loading Screen (runs on initial load, respects once-per-session) */}
      {isPreloading && (
        <Preloader 
          theme={theme} 
          onComplete={handlePreloaderComplete} 
        />
      )}

      {/* Global Heavy Grunge Scratched Film Grain & Noise Overlay */}
      <div className="grunge-overlay pointer-events-none"></div>


      {/* Reactive Twinkling Stars, Earths & Orbiting Satellites with Close-Pass Sparks (Satellites active on Home page only) */}
      <TwinklingStarfield theme={theme} showSatellites={currentPage === 'home'} />

      {/* Sticky Case Navigation Header */}
      <Navbar
        theme={theme}
        onToggleTheme={handleToggleTheme}
        showThemeToggle={currentPage === 'home'}
        activeSection={
          currentPage === 'caelis' 
            ? 'origin' 
            : currentPage === 'mission-lab' 
              ? 'trace' 
              : currentPage === 'reconstruction'
                ? 'evidence'
                : currentPage === 'evidence-trace'
                  ? 'evidence-trace'
                  : currentPage === 'incident-report'
                    ? 'incident-report'
                    : activeSection
        }
        onNavigate={handleNavigate}
        onOpenDossier={() => {
          setSelectedFragment(TELEMETRY_FRAGMENTS[0]);
          setIsDossierOpen(true);
        }}
        jitterEnabled={jitterEnabled}
        onToggleJitter={() => setJitterEnabled(!jitterEnabled)}
      />

      {/* Global Sovereign / Deployment Mode Connectivity Strip */}
      {backendConnected && backendHealth ? (
        <div className={`border-b px-4 py-1.5 text-xs font-mono flex items-center justify-between z-40 relative transition-colors ${
          backendHealth.mode === 'SOVEREIGN'
            ? 'bg-[#141A14] border-emerald-800/60 text-emerald-300'
            : 'bg-[#101726] border-sky-800/60 text-sky-300'
        }`}>
          <div className="flex items-center space-x-2.5">
            <span className={`w-2 h-2 rounded-full inline-block animate-pulse ${
              backendHealth.mode === 'SOVEREIGN' ? 'bg-emerald-400' : 'bg-sky-400'
            }`} />
            <span>
              <strong>{backendHealth.mode === 'SOVEREIGN' ? 'SOVEREIGN AIR-GAPPED MODE:' : 'CLOUD DEMO MODE:'}</strong>{' '}
              Backend Active · {backendHealth.database.type.toUpperCase()} · AI {backendHealth.ai_engine.version} Online (Zero Egress Enforced)
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-black/40 border border-current">
            PORT 8000 LIVE
          </span>
        </div>
      ) : (
        <div className="bg-amber-950/80 border-b border-amber-500/40 text-amber-200 px-4 py-1.5 text-xs font-mono flex items-center justify-between z-40 relative">
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full bg-amber-400 inline-block ${isBackendChecking ? 'animate-ping' : ''}`} />
            <span>
              <strong>Air-Gapped Standby:</strong> {isBackendChecking ? 'Connecting to backend API on port 8000...' : 'Backend offline. Operating with verified local reference model.'}
            </span>
          </div>
          <button
            onClick={() => checkBackendHealth()}
            disabled={isBackendChecking}
            className="px-2.5 py-0.5 rounded bg-amber-900/60 hover:bg-amber-800 disabled:opacity-50 text-amber-100 border border-amber-600/50 text-[11px] cursor-pointer transition-colors flex items-center gap-1.5"
            title="Ping backend /api/health/ endpoint"
          >
            {isBackendChecking ? (
              <>
                <svg className="animate-spin h-3 w-3 text-amber-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Connecting...</span>
              </>
            ) : (
              'Retry Connection'
            )}
          </button>
        </div>
      )}

      {currentPage === 'caelis' ? (
        <CaelisPage 
          onBack={() => setCurrentPage('home')} 
          theme={theme}
          onNavigateToSection={(sec) => handleNavigate(sec)}
          activeSyntheticData={activeSyntheticData}
          onOpenMissionLab={() => {
            setCurrentPage('mission-lab');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenReconstruction={() => {
            setCurrentPage('reconstruction');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      ) : currentPage === 'mission-lab' ? (
        <MissionLabPage 
          onBack={() => setCurrentPage('home')}
          theme={theme}
          onOpenAnalysis={(scenarioId, syntheticData) => {
            if (syntheticData) {
              setActiveSyntheticData(syntheticData);
            }
            setCurrentPage('caelis');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      ) : currentPage === 'reconstruction' ? (
        <CausalReconstructionPage
          onBack={() => setCurrentPage('home')}
          onOpenCaelis={() => {
            setCurrentPage('caelis');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenMissionLab={() => {
            setCurrentPage('mission-lab');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenEvidenceTrace={() => {
            setCurrentPage('evidence-trace');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onNavigateToSection={(sec) => handleNavigate(sec)}
          theme={theme}
        />
      ) : currentPage === 'evidence-trace' ? (
        <EvidenceTracePage
          onBack={() => setCurrentPage('home')}
          onOpenReconstruction={() => {
            setCurrentPage('reconstruction');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenCaelis={() => {
            setCurrentPage('caelis');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          theme={theme}
        />
      ) : currentPage === 'incident-report' ? (
        <IncidentReportPage
          onBack={() => setCurrentPage('home')}
          onOpenEvidenceTrace={() => {
            setCurrentPage('evidence-trace');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenReconstruction={() => {
            setCurrentPage('reconstruction');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenCaelis={() => {
            setCurrentPage('caelis');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          theme={theme}
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
            onOpenMissionLab={() => setCurrentPage('mission-lab')}
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
            onOpenMissionLab={() => setCurrentPage('mission-lab')}
            jitterEnabled={jitterEnabled}
          />

          {/* Section 3: The Evidence (Every Thread Has A Reason.) */}
          <EvidenceSection
            onProceedToOrigin={() => handleNavigate('origin')}
            onOpenCaelis={() => setCurrentPage('caelis')}
            onOpenMissionLab={() => setCurrentPage('mission-lab')}
            onOpenReconstruction={() => {
              setCurrentPage('reconstruction');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenEvidenceTrace={() => {
              setCurrentPage('evidence-trace');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            jitterEnabled={jitterEnabled}
          />

          {/* Section 4: The Origin (The Origin Was Never The Alarm. "ROOT CAUSE FOUND") */}
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
              setCurrentPage('caelis');
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
              setCurrentPage('mission-lab');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenDossier={() => {
              setSelectedFragment(TELEMETRY_FRAGMENTS[0]);
              setIsDossierOpen(true);
            }}
            onOpenIncidentReport={() => {
              setCurrentPage('incident-report');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onScrollToTop={() => smoothScrollTo(0, 0)}
            jitterEnabled={jitterEnabled}
          />

          {/* Site Footer */}
          <Footer
            onNavigateSection={handleNavigate}
            onOpenPage={(page) => {
              setCurrentPage(page as any);
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

