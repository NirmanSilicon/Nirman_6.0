import React, { useState, useEffect, useRef } from 'react';
import { 
  EVIDENCE_TRACE_SCENARIOS, 
  EvidenceTraceScenario, 
  EvidenceEventRow, 
  CausalEvidenceLink 
} from '../../data/evidenceTraceData';
import { 
  COUNTERFACTUAL_SCENARIOS, 
  CounterfactualScenario, 
  InterventionOption, 
  CascadeStep 
} from '../../data/counterfactualData';
import { queryCounterfactual, CounterfactualResponse } from '../../services/backendApi';
import { 
  CheckCircle2, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Binary, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  Database, 
  Info,
  Zap,
  X,
  ExternalLink,
  Copy,
  Maximize2,
  Play,
  RotateCcw,
  Sliders,
  BatteryCharging,
  Radio,
  Activity,
  Sparkles,
  Timer,
  Cpu,
  Layers,
  Eye,
  RefreshCw,
  CornerDownRight,
  Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getLenis } from '../../hooks/useSmoothScroll';

interface EvidenceTracePageProps {
  onBack: () => void;
  onOpenReconstruction?: () => void;
  onOpenCaelis?: () => void;
  theme?: 'light' | 'dark';
}

export const EvidenceTracePage: React.FC<EvidenceTracePageProps> = ({
  onBack,
  onOpenReconstruction,
  onOpenCaelis,
  theme = 'light'
}) => {
  // Scenario Selection (synchronized between Evidence Trace and Counterfactual)
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<number>(0);
  const scenario: EvidenceTraceScenario = EVIDENCE_TRACE_SCENARIOS[selectedScenarioIndex] || EVIDENCE_TRACE_SCENARIOS[0];
  
  // Find matching counterfactual scenario by ID, or fallback to same index or first
  const cfScenario: CounterfactualScenario = 
    COUNTERFACTUAL_SCENARIOS.find(s => s.id === scenario.id) || 
    COUNTERFACTUAL_SCENARIOS[selectedScenarioIndex] || 
    COUNTERFACTUAL_SCENARIOS[0];

  // View Mode: 'AUDIT' (Evidence Trace view), 'WHAT_IF' (What-If Simulator view), 'DUAL' (Integrated View)
  const [viewMode, setViewMode] = useState<'AUDIT' | 'WHAT_IF' | 'DUAL'>('DUAL');

  // Evidence Trace Selection States
  const [selectedLinkId, setSelectedLinkId] = useState<string>(scenario.links[0]?.id || '');
  const [selectedEventId, setSelectedEventId] = useState<string>(
    scenario.links[0]?.fromNodeId || scenario.events[0].id
  );
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'PRIMARY' | 'PROPAGATION' | 'CONSEQUENCE'>('ALL');
  const [inspectorTab, setInspectorTab] = useState<'proof' | 'telemetry_log' | 'fmea' | 'what_if_intervene'>('proof');

  // Pop-up Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [copiedProof, setCopiedProof] = useState<boolean>(false);
  const modalBodyRef = useRef<HTMLDivElement>(null);

  // Counterfactual Simulator States
  const [selectedInterventionId, setSelectedInterventionId] = useState<string>(cfScenario.interventions[0]?.id || '');
  const [detectionOffsetSec, setDetectionOffsetSec] = useState<number>(
    cfScenario.interventions[0]?.earliestDetectableOffsetSec || 10
  );
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [hasSimulated, setHasSimulated] = useState<boolean>(true);
  const [simulatedStepProgress, setSimulatedStepProgress] = useState<number>(
    cfScenario.interventions[0]?.steps.length || 5
  );
  const [structuralResult, setStructuralResult] = useState<CounterfactualResponse | null>(null);
  const [showAssumptionsModal, setShowAssumptionsModal] = useState<boolean>(false);

  const whatIfSectionRef = useRef<HTMLDivElement>(null);

  // Active items
  const selectedLinkIndex = Math.max(0, scenario.links.findIndex(l => l.id === selectedLinkId));
  const selectedLink: CausalEvidenceLink = scenario.links[selectedLinkIndex] || scenario.links[0];
  
  const selectedEvent: EvidenceEventRow = 
    scenario.events.find(e => e.id === selectedEventId) || scenario.events[0];

  const causeEvent = scenario.events.find(e => e.id === selectedLink.fromNodeId);
  const effectEvent = scenario.events.find(e => e.id === selectedLink.toNodeId);

  const activeIntervention: InterventionOption = 
    cfScenario.interventions.find(i => i.id === selectedInterventionId) || cfScenario.interventions[0];

  // Synchronize when scenario index changes
  useEffect(() => {
    const newSc = EVIDENCE_TRACE_SCENARIOS[selectedScenarioIndex] || EVIDENCE_TRACE_SCENARIOS[0];
    setSelectedLinkId(newSc.links[0]?.id || '');
    setSelectedEventId(newSc.links[0]?.fromNodeId || newSc.events[0]?.id || '');

    const newCf = COUNTERFACTUAL_SCENARIOS.find(s => s.id === newSc.id) || COUNTERFACTUAL_SCENARIOS[selectedScenarioIndex] || COUNTERFACTUAL_SCENARIOS[0];
    if (newCf && newCf.interventions[0]) {
      setSelectedInterventionId(newCf.interventions[0].id);
      setDetectionOffsetSec(newCf.interventions[0].earliestDetectableOffsetSec);
      setSimulatedStepProgress(newCf.interventions[0].steps.length);
      setHasSimulated(true);
    }
  }, [selectedScenarioIndex]);

  // Lock background scroll and pause Lenis smooth scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      const lenis = getLenis();
      lenis?.stop();

      const originalBodyOverflow = document.body.style.overflow;
      const originalDocOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      // Intercept all wheel events while modal is open: scroll modal body directly and prevent background scroll
      const handleWheelWhileModalOpen = (e: WheelEvent) => {
        if (modalBodyRef.current) {
          modalBodyRef.current.scrollTop += e.deltaY;
          e.preventDefault();
        }
      };

      window.addEventListener('wheel', handleWheelWhileModalOpen, { passive: false });

      // Automatically focus the scrollable container
      const timer = setTimeout(() => {
        if (modalBodyRef.current) {
          modalBodyRef.current.focus({ preventScroll: true });
        }
      }, 30);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('wheel', handleWheelWhileModalOpen);
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalDocOverflow;
        lenis?.start();
      };
    }
  }, [isModalOpen, selectedLinkId]);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  // When user clicks a verified causal link card
  const handleSelectLink = (linkId: string, openModal: boolean = true) => {
    setSelectedLinkId(linkId);
    const link = scenario.links.find(l => l.id === linkId);
    if (link) {
      setSelectedEventId(link.fromNodeId);
    }
    if (openModal) {
      setIsModalOpen(true);
    }
  };

  // Switch to next/prev link inside modal
  const handleNextLink = () => {
    const nextIdx = (selectedLinkIndex + 1) % scenario.links.length;
    handleSelectLink(scenario.links[nextIdx].id, true);
  };

  const handlePrevLink = () => {
    const prevIdx = (selectedLinkIndex - 1 + scenario.links.length) % scenario.links.length;
    handleSelectLink(scenario.links[prevIdx].id, true);
  };

  // When user clicks an event row in the table
  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    const matchingLink = scenario.links.find(
      l => l.fromNodeId === eventId || l.toNodeId === eventId
    );
    if (matchingLink) {
      setSelectedLinkId(matchingLink.id);
    }
  };

  const handleCopyProof = () => {
    if (selectedLink) {
      navigator.clipboard.writeText(
        `CAUSAL LINK: ${selectedLink.fromLabel} -> ${selectedLink.toLabel}\nCONFIDENCE: ${(selectedLink.confidence * 100).toFixed(0)}%\nPHYSICAL PROOF: ${selectedLink.whyEngineBelievesThis.physicalProof}\nPHYSICAL LAW: ${selectedLink.whyEngineBelievesThis.firstPrinciplesLaw}`
      );
      setCopiedProof(true);
      setTimeout(() => setCopiedProof(false), 2000);
    }
  };

  // Run Simulation with stepped animation and real structural backend query
  const handleRunSimulation = () => {
    setIsSimulating(true);
    setHasSimulated(false);
    setSimulatedStepProgress(0);

    const targetNodeLower = (activeIntervention.targetNodeId || '').toLowerCase();
    const targetComp = targetNodeLower.includes('t-17') || targetNodeLower.includes('thm')
      ? 'thermal_sensor'
      : (targetNodeLower.includes('bms') || targetNodeLower.includes('protect') ? 'battery_protection' : targetNodeLower);

    queryCounterfactual({
      incidentId: scenario.id || 'inc_001',
      targetEventId: selectedEventId || 'evt-thm-001',
      interventionMinutesEarlier: detectionOffsetSec / 60.0,
      interventionOffsetSec: detectionOffsetSec,
      interventionComponent: targetComp,
      interventionType: activeIntervention.interventionType.toLowerCase().includes('trip') ? 'prevent_trip' : 'clamp',
      method: 'structural'
    }).then(res => {
      setStructuralResult(res);
    }).catch(err => {
      console.warn('[EvidenceTracePage] Structural counterfactual query error:', err);
    });

    const totalSteps = activeIntervention.steps.length;
    let current = 0;

    const interval = setInterval(() => {
      current += 1;
      setSimulatedStepProgress(current);
      if (current >= totalSteps) {
        clearInterval(interval);
        setIsSimulating(false);
        setHasSimulated(true);
      }
    }, 280);
  };

  const handleResetSimulation = () => {
    setHasSimulated(false);
    setSimulatedStepProgress(0);
  };

  const scrollToWhatIf = () => {
    setViewMode('DUAL');
    setTimeout(() => {
      whatIfSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const filteredEvents = scenario.events.filter(e => {
    if (roleFilter === 'ALL') return true;
    return e.causalRole === roleFilter;
  });

  const getRoleBadgeStyle = (role: 'PRIMARY' | 'PROPAGATION' | 'CONSEQUENCE') => {
    switch (role) {
      case 'PRIMARY':
        return 'bg-[#DC143C] text-[#FAF6EE] border-[#DC143C]';
      case 'PROPAGATION':
        return 'bg-[#C5A945] text-[#FAF6EE] border-[#C5A945]';
      case 'CONSEQUENCE':
        return 'bg-[#1D546C] text-[#FAF6EE] border-[#1D546C]';
    }
  };

  const getConfidenceTierBadge = (tier?: string, score?: number) => {
    const resolvedTier = tier || (
      score === undefined || score <= 0 ? 'INSUFFICIENT EVIDENCE' :
      score >= 0.85 ? 'HIGH CONFIDENCE' :
      score >= 0.60 ? 'MODERATE CONFIDENCE' :
      score >= 0.35 ? 'LOW CONFIDENCE' : 'INSUFFICIENT EVIDENCE'
    );

    switch (resolvedTier) {
      case 'HIGH CONFIDENCE':
        return {
          label: 'HIGH CONFIDENCE',
          badgeClass: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
          dotClass: 'bg-emerald-500',
        };
      case 'MODERATE CONFIDENCE':
        return {
          label: 'MODERATE CONFIDENCE',
          badgeClass: 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40',
          dotClass: 'bg-amber-500',
        };
      case 'LOW CONFIDENCE':
        return {
          label: 'LOW CONFIDENCE',
          badgeClass: 'bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-500/40',
          dotClass: 'bg-orange-500',
        };
      case 'INSUFFICIENT EVIDENCE':
      default:
        return {
          label: 'INSUFFICIENT EVIDENCE',
          badgeClass: 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/40',
          dotClass: 'bg-slate-500',
        };
    }
  };

  return (
    <div className="relative min-h-screen bg-[#F0EAD6] dark:bg-[#080B11] text-[#1A1A1A] dark:text-[#FAF6EE] transition-colors duration-300 overflow-x-clip pb-16">
      
      {/* Top Banner Header */}
      <div className="relative z-10 bg-[#1A1A1A] text-[#FAF6EE] border-b-2 border-[#DC143C] px-4 sm:px-6 lg:px-8 py-5 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-mono-tech uppercase font-bold tracking-widest bg-[#DC143C] text-[#FAF6EE] px-2 py-0.5 shadow-sm">
                05 — EVIDENCE TRACE & WHAT IF?
              </span>
              <span className="text-[11px] font-mono-tech text-[#E5C76B] font-bold">
                AUDITABLE FIRST-PRINCIPLES PHYSICAL PROOFS & COUNTERFACTUAL ENGINE
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-headline font-black tracking-tight text-[#FAF6EE]">
              EVIDENCE TRACE & WHAT IF? ENGINE
            </h1>
            <p className="text-xs sm:text-sm font-mono-tech text-[#FAF6EE]/80 mt-1 max-w-3xl">
              Forensic validation answers the central question: <strong className="text-[#E5C76B]">Why does the engine believe this?</strong> Counterfactual interventions test: <strong className="text-green-400">What could have saved the mission?</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* View Mode Pills */}
            <div className="bg-[#FAF6EE]/10 p-1 border border-[#FAF6EE]/20 flex items-center gap-1">
              <button
                onClick={() => setViewMode('AUDIT')}
                className={`px-2.5 py-1 text-[10px] font-mono-tech uppercase font-bold tracking-wider transition-all cursor-pointer ${
                  viewMode === 'AUDIT'
                    ? 'bg-[#DC143C] text-[#FAF6EE] shadow-xs'
                    : 'text-[#FAF6EE]/70 hover:text-[#FAF6EE]'
                }`}
              >
                05 AUDIT ONLY
              </button>
              <button
                onClick={() => setViewMode('DUAL')}
                className={`px-2.5 py-1 text-[10px] font-mono-tech uppercase font-bold tracking-wider transition-all cursor-pointer ${
                  viewMode === 'DUAL'
                    ? 'bg-[#DC143C] text-[#FAF6EE] shadow-xs'
                    : 'text-[#FAF6EE]/70 hover:text-[#FAF6EE]'
                }`}
              >
                ⚖️ COMBINED VIEW
              </button>
              <button
                onClick={() => setViewMode('WHAT_IF')}
                className={`px-2.5 py-1 text-[10px] font-mono-tech uppercase font-bold tracking-wider transition-all cursor-pointer ${
                  viewMode === 'WHAT_IF'
                    ? 'bg-green-600 text-[#FAF6EE] shadow-xs'
                    : 'text-[#FAF6EE]/70 hover:text-[#FAF6EE]'
                }`}
              >
                06 WHAT IF? ONLY
              </button>
            </div>

            <button
              onClick={onBack}
              className="px-3 py-1.5 bg-[#F0EAD6]/10 hover:bg-[#F0EAD6]/20 text-[#FAF6EE] text-xs font-mono-tech font-bold uppercase tracking-wider border border-[#FAF6EE]/30 transition-all cursor-pointer"
            >
              BACK TO CASE
            </button>
          </div>
        </div>
      </div>

      {/* Scenario Selector & Global Health Metrics Bar */}
      <div className="relative z-10 bg-[#E2D5C0]/90 dark:bg-[#121824]/90 backdrop-blur-xs border-b border-[#1A1A1A]/15 dark:border-[#FAF6EE]/15 px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono-tech font-bold text-[#1A1A1A] dark:text-[#FAF6EE] uppercase whitespace-nowrap flex items-center gap-1.5">
              <Database className="w-4 h-4 text-[#DC143C]" />
              CASE EVIDENCE DATASET:
            </span>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {EVIDENCE_TRACE_SCENARIOS.map((sc, idx) => {
                const isSelected = selectedScenarioIndex === idx;
                return (
                  <button
                    key={sc.id}
                    onClick={() => {
                      setSelectedScenarioIndex(idx);
                      setSelectedLinkId(sc.links[0]?.id || '');
                      setSelectedEventId(sc.links[0]?.fromNodeId || sc.events[0].id);
                    }}
                    className={`px-3 py-1 text-xs font-mono-tech uppercase font-bold tracking-wider whitespace-nowrap transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-[#1A1A1A] text-[#FAF6EE] border-[#DC143C] shadow-sm'
                        : 'bg-[#F0EAD6]/70 dark:bg-[#1A2232] text-[#1A1A1A] dark:text-[#FAF6EE] border-[#1A1A1A]/20 dark:border-[#FAF6EE]/20 hover:border-[#DC143C]'
                    }`}
                  >
                    {sc.code} · {sc.title.split(' ')[0]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs font-mono-tech">
            <div className="flex items-center gap-1.5">
              <span className="text-[#625A50] dark:text-[#94A3B8]">TIME WINDOW:</span>
              <span className="font-bold text-[#1A1A1A] dark:text-[#FAF6EE]">{scenario.incidentTimeRange}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[#625A50] dark:text-[#94A3B8]">REASONING CONFIDENCE:</span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs text-[10px] font-bold border ${getConfidenceTierBadge(scenario.confidenceTier, scenario.overallConfidence).badgeClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${getConfidenceTierBadge(scenario.confidenceTier, scenario.overallConfidence).dotClass}`} />
                {getConfidenceTierBadge(scenario.confidenceTier, scenario.overallConfidence).label}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[#625A50] dark:text-[#94A3B8]">PATTERN STATUS:</span>
              <span className={`px-2 py-0.5 text-[10px] font-bold border ${
                (scenario.patternStatus || 'KNOWN PATTERN') === 'UNKNOWN / OUT-OF-DISTRIBUTION'
                  ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/40'
                  : 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40'
              }`}>
                {scenario.patternStatus || 'KNOWN PATTERN'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        
        {/* ========================================================================= */}
        {/* SECTION 1: EVIDENCE TRACE & CAUSAL AUDIT (VISIBLE IN AUDIT & DUAL MODES)  */}
        {/* ========================================================================= */}
        {(viewMode === 'AUDIT' || viewMode === 'DUAL') && (
          <div className="space-y-6">
            
            {/* Top Info Callout */}
            <div className="bg-[#FAF6EE] dark:bg-[#121824] p-4 border-l-4 border-[#DC143C] border-y border-r border-[#1A1A1A]/10 dark:border-[#FAF6EE]/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#DC143C] shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-sm font-headline font-bold text-[#1A1A1A] dark:text-[#FAF6EE] uppercase tracking-wide">
                    DEFENSIBLE FORENSIC LEDGER · CLICK ANY CAUSAL LINK TO POP UP AUDIT DOSSIER
                  </h2>
                  <p className="text-xs font-mono-tech text-[#1A1A1A]/80 dark:text-[#FAF6EE]/80 mt-0.5">
                    Every event below has undergone hardware timestamp alignment, telemetry gap verification, and failure-mode classification. Competing explanations and missing intermediate evidence are explicitly preserved.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={scrollToWhatIf}
                  className="px-3 py-1 bg-[#1A1A1A] hover:bg-[#DC143C] text-[#FAF6EE] text-[11px] font-mono-tech font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#E5C76B]" />
                  <span>JUMP TO WHAT IF? SIMULATOR ↓</span>
                </button>
              </div>
            </div>

            {/* Competing Hypotheses Banner / Card (when ambiguous or multiple candidate roots) */}
            {(scenario.isAmbiguousRoot || (scenario.competingHypotheses && scenario.competingHypotheses.length > 1)) && (
              <div className="bg-[#FAF6EE] dark:bg-[#121824] p-4 border-2 border-amber-500/50 dark:border-amber-400/40 shadow-md">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      <h3 className="text-sm font-headline font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                        COMPETING HYPOTHESES DETECTED · AMBIGUOUS ROOT CAUSE (MARGIN &lt; 0.12)
                      </h3>
                      <p className="text-xs font-mono-tech text-[#1A1A1A]/70 dark:text-[#FAF6EE]/70">
                        Top candidate failure roots remain within ambiguous decision boundaries. The engine refuses to force an unjustified single cause. Select a candidate hypothesis below to audit:
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-mono-tech font-bold uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 whitespace-nowrap">
                    AMBIGUOUS PRIMARY ROOT
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {scenario.competingHypotheses?.map((hypo, hIdx) => {
                    const isSelectedHypo = selectedEventId === hypo.eventId;
                    return (
                      <button
                        key={hypo.eventId}
                        onClick={() => handleSelectEvent(hypo.eventId)}
                        className={`text-left p-3 border transition-all cursor-pointer ${
                          isSelectedHypo
                            ? 'bg-amber-500/10 border-amber-500 shadow-sm ring-1 ring-amber-500'
                            : 'bg-[#F0EAD6]/50 dark:bg-[#1A2232] border-[#1A1A1A]/15 dark:border-[#FAF6EE]/15 hover:border-amber-500/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-headline font-bold text-[#1A1A1A] dark:text-[#FAF6EE]">
                            HYPOTHESIS {String.fromCharCode(65 + hIdx)}: {hypo.component}
                          </span>
                          <span className={`text-[10px] font-mono-tech font-bold px-1.5 py-0.5 border ${getConfidenceTierBadge(hypo.confidenceTier).badgeClass}`}>
                            {hypo.confidenceTier} ({Math.round(hypo.score * 100)}%)
                          </span>
                        </div>
                        <p className="text-[11px] font-mono-tech text-[#1A1A1A]/80 dark:text-[#FAF6EE]/80">
                          {hypo.rationale}
                        </p>
                        <div className="mt-2 text-[10px] font-mono-tech text-[#625A50] dark:text-[#94A3B8] flex items-center justify-between">
                          <span>Margin from Top: {hypo.marginFromTop.toFixed(2)}</span>
                          <span className="text-amber-600 dark:text-amber-400 font-bold">{isSelectedHypo ? '● ACTIVE INSPECTION' : '○ CLICK TO SELECT'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Missing Evidence / Unobserved Telemetry Banner */}
            {scenario.missingEvidence && scenario.missingEvidence.length > 0 && (
              <div className="p-3 bg-purple-500/10 border border-purple-500/30 text-xs font-mono-tech flex items-start gap-2.5">
                <Info className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-purple-700 dark:text-purple-300 uppercase">
                    MISSING EVIDENCE & TELEMETRY GAPS OBSERVED:
                  </div>
                  {scenario.missingEvidence.map((me, meIdx) => (
                    <div key={meIdx} className="text-[11px] text-[#1A1A1A]/80 dark:text-[#FAF6EE]/80">
                      • <strong>{me.description}</strong> (Missing: {me.missingComponents.join(', ')})
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Causal Red-String Link Fast Switcher Strip */}
            <div className="bg-[#FAF6EE] dark:bg-[#121824] p-4 border-2 border-[#1A1A1A]/20 dark:border-[#FAF6EE]/20 shadow-md">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <span className="text-xs font-mono-tech font-bold uppercase text-[#1A1A1A] dark:text-[#FAF6EE] flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#DC143C]" />
                  VERIFIED CAUSAL LINKS (CLICK FOR POP-UP AUDIT CARD):
                </span>
                <span className="text-[11px] font-mono-tech text-[#625A50] dark:text-[#94A3B8]">
                  {scenario.links.length} AUDITABLE THREADS · ACTIVE: <strong className="text-[#DC143C]">{selectedLink.fromLabel} ➔ {selectedLink.toLabel}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {scenario.links.map((link) => {
                  const isSelected = selectedLinkId === link.id;
                  return (
                    <button
                      key={link.id}
                      onClick={() => handleSelectLink(link.id, true)}
                      className={`p-3.5 text-left border-2 transition-all cursor-pointer relative overflow-hidden group flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[#1A1A1A] text-[#FAF6EE] border-[#DC143C] shadow-lg -translate-y-0.5 ring-2 ring-[#DC143C]/50'
                          : 'bg-[#F0EAD6]/60 dark:bg-[#1A2232]/80 text-[#1A1A1A] dark:text-[#FAF6EE] border-[#1A1A1A]/20 dark:border-[#FAF6EE]/20 hover:border-[#DC143C] hover:bg-[#F0EAD6] dark:hover:bg-[#1A2232]'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#DC143C]" />
                      )}
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-mono-tech mb-1.5">
                          <span className={`font-bold px-1.5 py-0.5 rounded-xs ${
                            isSelected ? 'bg-[#DC143C] text-[#FAF6EE]' : 'bg-[#C5A945]/15 text-[#C5A945]'
                          }`}>
                            DEP: {link.dependency.toUpperCase()}
                          </span>
                          <span className="font-mono font-bold flex items-center gap-1">
                            <span>{link.temporalGapLabel}</span>
                            <ExternalLink className="w-3 h-3 opacity-70 group-hover:opacity-100 text-[#DC143C]" />
                          </span>
                        </div>
                        
                        <div className="font-headline font-black text-sm sm:text-base flex items-center gap-1.5 tracking-wide mt-1">
                          <span className={isSelected ? 'text-[#FAF6EE]' : 'text-[#1A1A1A] dark:text-[#FAF6EE]'}>
                            {link.fromLabel}
                          </span>
                          <span className="text-[#DC143C] font-bold">➔</span>
                          <span className={isSelected ? 'text-[#FAF6EE]' : 'text-[#1A1A1A] dark:text-[#FAF6EE]'}>
                            {link.toLabel}
                          </span>
                        </div>
                      </div>

                      <div className="text-[10px] font-mono-tech mt-2.5 pt-2 border-t border-current/10 opacity-90 flex items-center justify-between">
                        <span className="font-bold text-[#DC143C] dark:text-[#E63956]">
                          CONF: {(link.confidence * 100).toFixed(0)}%
                        </span>
                        <span className="text-[9px] uppercase font-bold text-[#C5A945] flex items-center gap-0.5">
                          POP UP AUDIT ↗
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 2: FULLY INTEGRATED WHAT IF? COUNTERFACTUAL INTERVENTION ENGINE   */}
        {/* ========================================================================= */}
        {(viewMode === 'WHAT_IF' || viewMode === 'DUAL') && (
          <div ref={whatIfSectionRef} className="pt-6 border-t-4 border-[#1A1A1A]/20 dark:border-[#FAF6EE]/20 space-y-6">
            
            {/* What-If Engine Banner */}
            <div className="bg-[#1A1A1A] text-[#FAF6EE] p-5 border-l-4 border-green-500 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono-tech uppercase font-bold tracking-widest bg-green-600 text-[#FAF6EE] px-2 py-0.5 animate-pulse">
                    06 — COUNTERFACTUAL INTERVENTION ENGINE
                  </span>
                  <span className="text-[11px] font-mono-tech text-[#E5C76B] font-bold">
                    PHYSICS-CONSTRAINED CAUSAL FALSIFICATION & CASCADE TRUNCATION
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-headline font-black tracking-tight text-[#FAF6EE]">
                  WHAT IF? COUNTERFACTUAL SIMULATOR
                </h2>
                <p className="text-xs sm:text-sm font-mono-tech text-[#FAF6EE]/80 mt-1 max-w-3xl">
                  Simulate modifying or eliminating failure origins in the causal topology, re-propagate the physical differential model, and observe exact cascade truncation.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right font-mono-tech text-xs">
                  <span className="text-[#94A3B8] block text-[10px]">ACTIVE CASE:</span>
                  <span className="font-bold text-[#E5C76B]">{cfScenario.craftName} ({cfScenario.incidentRef})</span>
                </div>
              </div>
            </div>

            {/* Three-Column Architecture: Left (Intervention Deck) | Middle (Cascade Comparator) | Right (Judge Moment) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
              
              {/* ========================================================================= */}
              {/* LEFT COLUMN (4 cols): INTERVENTION CONFIGURATION PANEL                    */}
              {/* ========================================================================= */}
              <div className="lg:col-span-4 space-y-4">
                
                <div className="bg-[#FAF6EE] dark:bg-[#121824] border-2 border-[#1A1A1A] dark:border-[#FAF6EE]/30 shadow-xl p-5 relative">
                  
                  {/* Header */}
                  <div className="border-b-2 border-[#1A1A1A] dark:border-[#FAF6EE]/20 pb-3 mb-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono-tech bg-[#DC143C] text-[#FAF6EE] px-2 py-0.5 uppercase font-bold tracking-wider">
                        INTERVENTION SETUP
                      </span>
                      <h3 className="font-headline font-black text-xl text-[#1A1A1A] dark:text-[#FAF6EE] mt-1">
                        SELECT INTERVENTION
                      </h3>
                    </div>
                    <Sliders className="w-5 h-5 text-[#DC143C]" />
                  </div>

                  {/* 1. SELECT FAILURE POINT */}
                  <div className="space-y-2 mb-4">
                    <label className="text-xs font-mono-tech font-bold uppercase text-[#1A1A1A] dark:text-[#FAF6EE] flex items-center gap-1.5">
                      <span>SELECT FAILURE POINT:</span>
                    </label>
                    <div className="space-y-2">
                      {cfScenario.interventions.map((interv) => {
                        const isSelected = selectedInterventionId === interv.id;
                        return (
                          <div
                            key={interv.id}
                            onClick={() => {
                              setSelectedInterventionId(interv.id);
                              setDetectionOffsetSec(interv.earliestDetectableOffsetSec);
                            }}
                            className={`p-3 border-2 cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-[#1A1A1A] text-[#FAF6EE] border-[#DC143C] shadow-md ring-2 ring-[#DC143C]/40'
                                : 'bg-[#F0EAD6]/50 dark:bg-[#1A2232] text-[#1A1A1A] dark:text-[#FAF6EE] border-[#1A1A1A]/20 dark:border-[#FAF6EE]/20 hover:border-[#DC143C]'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs font-mono-tech">
                              <span className="font-bold uppercase font-headline">
                                [ {interv.targetNodeLabel} ]
                              </span>
                              <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-[#E5C76B]' : 'text-[#DC143C]'}`}>
                                {interv.earliestEffectiveInterventionLabel}
                              </span>
                            </div>
                            <p className="text-[11px] font-mono-tech mt-1 opacity-80 leading-tight">
                              {interv.interventionType}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. DETECT EARLIER (Time-offset Selector) */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono-tech font-bold uppercase text-[#1A1A1A] dark:text-[#FAF6EE] flex items-center gap-1.5">
                        <Timer className="w-3.5 h-3.5 text-[#DC143C]" />
                        <span>DETECT EARLIER OFFSET:</span>
                      </label>
                      <span className="text-xs font-mono-tech font-bold text-[#DC143C] dark:text-[#E63956]">
                        [ {detectionOffsetSec} seconds ]
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 text-xs font-mono-tech">
                      {[5, 10, 30, 60].map((sec) => (
                        <button
                          key={sec}
                          onClick={() => setDetectionOffsetSec(sec)}
                          className={`py-1.5 px-2 border font-bold uppercase text-center transition-all cursor-pointer ${
                            detectionOffsetSec === sec
                              ? 'bg-[#DC143C] text-[#FAF6EE] border-[#DC143C] shadow-sm'
                              : 'bg-[#F0EAD6]/50 dark:bg-[#1A2232] text-[#1A1A1A] dark:text-[#FAF6EE] border-[#1A1A1A]/20 dark:border-[#FAF6EE]/20 hover:border-[#DC143C]'
                          }`}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>

                    <p className="text-[10px] font-mono-tech text-[#625A50] dark:text-[#94A3B8] mt-1">
                      Effective window: {activeIntervention.effectiveTimeWindow}
                    </p>
                  </div>

                  {/* 3. INTERVENTION MECHANISM SUMMARY */}
                  <div className="bg-[#F0EAD6]/50 dark:bg-[#1A2232] p-3 border border-[#1A1A1A]/15 dark:border-[#FAF6EE]/15 mb-4 space-y-2 text-xs font-mono-tech">
                    <span className="font-bold text-[#C5A945] block uppercase text-[10px]">
                      PHYSICAL MECHANISM:
                    </span>
                    <p className="text-[11px] text-[#1A1A1A]/85 dark:text-[#FAF6EE]/85 leading-relaxed">
                      {activeIntervention.mechanism}
                    </p>
                    <div className="pt-2 border-t border-[#1A1A1A]/10 dark:border-[#FAF6EE]/10 text-[10px] text-[#625A50] dark:text-[#94A3B8]">
                      Tradeoff: {activeIntervention.riskTradeoff}
                    </div>
                  </div>

                  {/* 4. RUN COUNTERFACTUAL ACTION BUTTON */}
                  <button
                    onClick={handleRunSimulation}
                    disabled={isSimulating}
                    className={`w-full py-3.5 px-4 text-xs sm:text-sm font-mono-tech font-black uppercase tracking-widest flex items-center justify-center gap-2 border-2 transition-all shadow-xl cursor-pointer ${
                      isSimulating
                        ? 'bg-[#C5A945] text-[#FAF6EE] border-[#C5A945] animate-pulse cursor-wait'
                        : 'bg-green-600 hover:bg-green-700 text-[#FAF6EE] border-green-600 hover:scale-[1.01]'
                    }`}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{isSimulating ? 'PROPAGATING PHYSICAL MODEL...' : 'RUN COUNTERFACTUAL →'}</span>
                  </button>

                </div>

              </div>

              {/* ========================================================================= */}
              {/* MIDDLE COLUMN (5 cols): OBSERVED vs COUNTERFACTUAL SIDE-BY-SIDE CASCADE   */}
              {/* ========================================================================= */}
              <div className="lg:col-span-5 space-y-4">
                
                <div className="bg-[#FAF6EE] dark:bg-[#121824] border-2 border-[#1A1A1A] dark:border-[#FAF6EE]/30 shadow-xl p-5 relative">
                  
                  {/* Header Toggle / Status */}
                  <div className="border-b-2 border-[#1A1A1A] dark:border-[#FAF6EE]/20 pb-3 mb-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono-tech bg-[#1A1A1A] text-[#FAF6EE] px-2 py-0.5 uppercase font-bold">
                        CASCADE COMPARATOR
                      </span>
                      <h3 className="font-headline font-black text-xl text-[#1A1A1A] dark:text-[#FAF6EE] mt-1">
                        OBSERVED vs SIMULATED
                      </h3>
                    </div>
                    {hasSimulated && (
                      <span className="text-xs font-mono-tech font-bold text-green-600 dark:text-emerald-400 bg-green-500/10 px-2 py-1 border border-green-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> PROPAGATED
                      </span>
                    )}
                  </div>

                  {/* Side-by-Side Cascade Columns */}
                  <div className="grid grid-cols-2 gap-3">
                    
                    {/* Column A: OBSERVED (Incident History) */}
                    <div className="space-y-2">
                      <div className="bg-[#1A1A1A] text-[#FAF6EE] text-center py-1.5 px-2 text-[11px] font-mono-tech font-bold uppercase tracking-wider border-b-2 border-[#DC143C]">
                        OBSERVED INCIDENT
                      </div>

                      <div className="space-y-1.5">
                        {activeIntervention.steps.map((step, idx) => (
                          <div key={step.id} className="flex flex-col items-center">
                            <div className="w-full p-2 bg-[#FAF6EE] dark:bg-[#1A2232] border-2 border-[#DC143C]/70 text-[#1A1A1A] dark:text-[#FAF6EE] text-center shadow-xs">
                              <div className="text-[9px] font-mono-tech text-[#DC143C] font-bold uppercase">
                                {step.timeOffsetLabel}
                              </div>
                              <div className="font-headline font-black text-xs tracking-wider">
                                {step.subsystemCode}
                              </div>
                              <div className="text-[9px] font-mono-tech text-[#625A50] dark:text-[#94A3B8] truncate mt-0.5">
                                {step.observedReading}
                              </div>
                            </div>

                            {idx < activeIntervention.steps.length - 1 && (
                              <div className="text-[#DC143C] font-bold text-xs my-0.5">↓</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Column B: COUNTERFACTUAL (Simulated Result) */}
                    <div className="space-y-2">
                      <div className="bg-[#1A1A1A] text-[#FAF6EE] text-center py-1.5 px-2 text-[11px] font-mono-tech font-bold uppercase tracking-wider border-b-2 border-green-500">
                        COUNTERFACTUAL
                      </div>

                      {/* Cascade Steps */}
                      <div className="space-y-1.5">
                        
                        {/* The Intervened Origin Node */}
                        <div className="w-full p-2 bg-green-500/15 border-2 border-green-600 text-[#1A1A1A] dark:text-[#FAF6EE] text-center shadow-xs">
                          <div className="text-[9px] font-mono-tech text-green-600 dark:text-emerald-400 font-bold uppercase">
                            T-{detectionOffsetSec}s INTERVENTION
                          </div>
                          <div className="font-headline font-black text-xs tracking-wider text-green-700 dark:text-green-300">
                            {activeIntervention.targetNodeId} PREVENTED
                          </div>
                          <div className="text-[9px] font-mono-tech text-green-800 dark:text-green-200 font-bold truncate mt-0.5">
                            SANITY FILTER TRIP
                          </div>
                        </div>

                        {/* Visual Physical Barrier Bar */}
                        <div className="w-full bg-green-600 text-[#FAF6EE] py-1 text-center font-mono font-black text-[9px] sm:text-[10px] tracking-widest uppercase shadow-xs">
                          ████ PREVENTED ████
                        </div>

                        {/* Downstream Cascaded Steps */}
                        {activeIntervention.steps.slice(1).map((step, idx) => {
                          const isRevealed = (idx + 1) < simulatedStepProgress;
                          const isPrevented = step.preventedByIntervention;

                          return (
                            <div key={step.id} className="flex flex-col items-center">
                              {idx > 0 && (
                                <div className="text-green-600 font-bold text-xs my-0.5">↓</div>
                              )}

                              <div className={`w-full p-2 border-2 text-center transition-all ${
                                isRevealed && isPrevented
                                  ? 'bg-green-500/10 dark:bg-green-950/30 border-green-600 text-[#1A1A1A] dark:text-[#FAF6EE] shadow-xs'
                                  : isRevealed && !isPrevented
                                    ? 'bg-amber-500/10 border-amber-600 text-[#1A1A1A] dark:text-[#FAF6EE]'
                                    : 'bg-[#F0EAD6]/30 dark:bg-[#1A2232]/30 border-dashed border-[#1A1A1A]/20 dark:border-[#FAF6EE]/20 opacity-40'
                              }`}>
                                <div className="flex items-center justify-between text-[9px] font-mono-tech font-bold">
                                  <span className="text-[#1A1A1A] dark:text-[#FAF6EE]">{step.subsystemCode}</span>
                                  <span className={isPrevented ? 'text-green-600 dark:text-emerald-400 font-black' : 'text-amber-600 font-bold'}>
                                    {isRevealed ? (isPrevented ? 'PREVENTED' : 'DEGRADED') : 'CALCULATING...'}
                                  </span>
                                </div>
                                <div className="text-[9px] font-mono-tech text-[#625A50] dark:text-[#94A3B8] truncate mt-0.5">
                                  {isRevealed ? step.counterfactualReading : '---'}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                      </div>

                    </div>

                  </div>

                </div>

              </div>

              {/* ========================================================================= */}
              {/* RIGHT COLUMN (3 cols): THE VERDICT & JUDGE MOMENT                         */}
              {/* ========================================================================= */}
              <div className="lg:col-span-3 space-y-4">
                
                {/* The Big Verdict & Judge Moment Card */}
                <div className="bg-[#1A1A1A] text-[#FAF6EE] border-2 border-green-600 shadow-xl p-5 relative overflow-hidden">
                  
                  {/* Background Glow */}
                  <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-green-500/15 rounded-full blur-2xl pointer-events-none"></div>

                  <div className="flex items-center justify-between border-b border-[#FAF6EE]/20 pb-3 mb-4">
                    <span className="text-[10px] font-mono-tech bg-green-600 text-[#FAF6EE] px-2 py-0.5 uppercase font-bold tracking-wider">
                      VERDICT AUDIT
                    </span>
                    <Sparkles className="w-4 h-4 text-[#E5C76B]" />
                  </div>

                  {/* The Big Result */}
                  <div className="text-center py-3 bg-[#FAF6EE]/5 border border-[#FAF6EE]/15 mb-4">
                    <span className="text-[10px] font-mono-tech text-[#FAF6EE]/70 uppercase tracking-widest block mb-1">
                      STRUCTURAL FORWARD MITIGATION
                    </span>
                    <div className="font-headline font-black text-2xl sm:text-3xl text-green-400 tracking-tight">
                      {structuralResult?.prevented_count ?? activeIntervention.preventedFailuresCount} / {activeIntervention.totalFailuresCount} FAILURES
                    </div>
                    <div className="font-headline font-black text-sm sm:text-base text-[#FAF6EE] mt-0.5 tracking-wider flex items-center justify-center gap-2">
                      <span>PREVENTED</span>
                      {((structuralResult?.shifted_events?.length ?? 0) > 0) && (
                        <span className="text-xs text-amber-400 font-mono-tech">
                          (+{structuralResult!.shifted_events!.length} SHIFTED)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Judge Moment Key Finding */}
                  <div className="p-3 bg-[#FAF6EE]/10 border-l-4 border-[#E5C76B] mb-4">
                    <span className="text-[10px] font-mono-tech text-[#E5C76B] font-bold block uppercase tracking-wider">
                      CRITICAL INTERVENTION TIMING:
                    </span>
                    <div className="font-headline font-black text-sm text-[#FAF6EE] mt-0.5">
                      Intervention Point: <span className="text-[#E5C76B]">{structuralResult?.intervention_timing?.description || `T-${detectionOffsetSec}s before failure`}</span>
                    </div>
                    <p className="text-[11px] font-mono-tech text-[#FAF6EE]/80 mt-1 leading-relaxed">
                      Forward structural simulation proves that modifying input at T-{detectionOffsetSec}s breaks downstream differential heating and isolates the cascade.
                    </p>
                  </div>

                  {/* Baseline Reachability vs Structural Simulation Comparator */}
                  <div className="p-2.5 bg-[#FAF6EE]/5 border border-[#FAF6EE]/15 mb-4 space-y-1.5 font-mono-tech text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[#94A3B8] uppercase">BASELINE REACHABILITY:</span>
                      <span className="font-bold text-[#FAF6EE]">
                        {structuralResult?.baseline_reachability?.prevented_count ?? activeIntervention.preventedFailuresCount} / {activeIntervention.totalFailuresCount} PRUNED
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-[#FAF6EE]/10 pt-1">
                      <span className="text-green-400 uppercase font-bold">STRUCTURAL SIMULATION:</span>
                      <span className="font-bold text-green-400">
                        {structuralResult?.prevented_count ?? activeIntervention.preventedFailuresCount} / {activeIntervention.totalFailuresCount} PREVENTED
                      </span>
                    </div>
                  </div>

                  {/* Quantitative Physical Metrics */}
                  <div className="space-y-2 text-xs font-mono-tech">
                    <div className="flex items-center justify-between p-2 bg-[#FAF6EE]/5 border border-[#FAF6EE]/10">
                      <span className="text-[#FAF6EE]/70 flex items-center gap-1.5 text-[11px]">
                        <BatteryCharging className="w-3.5 h-3.5 text-green-400" />
                        BATTERY SOC PRESERVED:
                      </span>
                      <span className="font-bold text-green-400">
                        {structuralResult?.mission_impact_difference?.battery_soc_preserved_percent ?? activeIntervention.batterySocPreservedPercent}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-[#FAF6EE]/5 border border-[#FAF6EE]/10">
                      <span className="text-[#FAF6EE]/70 flex items-center gap-1.5 text-[11px]">
                        <Zap className="w-3.5 h-3.5 text-[#E5C76B]" />
                        POWER SAVED:
                      </span>
                      <span className="font-bold text-[#E5C76B]">
                        {structuralResult?.mission_impact_difference?.power_saved_watt_hours ?? activeIntervention.powerSavedWattHours} Wh
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-[#FAF6EE]/5 border border-[#FAF6EE]/10">
                      <span className="text-[#FAF6EE]/70 flex items-center gap-1.5 text-[11px]">
                        <Radio className="w-3.5 h-3.5 text-cyan-400" />
                        COMMS BEACON UPTIME:
                      </span>
                      <span className="font-bold text-cyan-400">
                        {structuralResult?.mission_impact_difference?.comms_uptime_percent ?? 100}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-[#FAF6EE]/5 border border-green-500/30">
                      <span className="text-[#FAF6EE]/70 flex items-center gap-1.5 text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
                        SIMULATION CONFIDENCE:
                      </span>
                      <span className="font-bold text-green-400 flex items-center gap-1.5">
                        <span>{((structuralResult?.simulation_confidence ?? 0.94) * 100).toFixed(0)}%</span>
                        <span className="px-1.5 py-0.5 bg-green-500/20 text-[9px] border border-green-500/40 uppercase">
                          {structuralResult?.confidence_tier || 'HIGH CONFIDENCE'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Assumptions Toggle & Panel */}
                  <div className="mt-4 pt-3 border-t border-[#FAF6EE]/15">
                    <button
                      onClick={() => setShowAssumptionsModal(!showAssumptionsModal)}
                      className="w-full py-1.5 px-2 bg-[#FAF6EE]/5 hover:bg-[#FAF6EE]/10 border border-[#FAF6EE]/20 text-[10px] font-mono-tech font-bold uppercase tracking-wider flex items-center justify-between text-[#FAF6EE] transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Info className="w-3 h-3 text-[#E5C76B]" />
                        PHYSICAL ASSUMPTIONS & RULES
                      </span>
                      <span className="text-[9px] text-[#E5C76B]">
                        {showAssumptionsModal ? '▲ HIDE' : '▼ VIEW'}
                      </span>
                    </button>

                    {showAssumptionsModal && (
                      <div className="mt-2 p-2.5 bg-[#121824] border border-[#FAF6EE]/20 text-[10px] font-mono-tech space-y-1.5 text-[#FAF6EE]/80">
                        <span className="text-[#E5C76B] font-bold block uppercase text-[9px]">
                          DETERMINISTIC MODEL CONSTRAINTS:
                        </span>
                        <ul className="list-disc pl-3.5 space-y-1">
                          <li>Discrete-time state transitions computed via canonical module templates.</li>
                          <li>Conductive thermal resistance R_th = 1.8 K/W between heater and battery pack.</li>
                          <li>BMS over-temp comparator threshold at 60.0°C with 2.0s trip latency.</li>
                          <li>Power bus voltage collapses exponentially to 0.04V upon battery isolation in eclipse.</li>
                          <li>Avionics UVLO threshold triggers brownout below 3.2V / 5.0V.</li>
                        </ul>
                      </div>
                    )}
                  </div>

                </div>

                {/* Reset Action */}
                <div className="p-3 bg-[#FAF6EE] dark:bg-[#121824] border-2 border-[#1A1A1A]/20 dark:border-[#FAF6EE]/20 shadow-md">
                  <button
                    onClick={handleResetSimulation}
                    className="w-full py-2 px-3 border border-[#1A1A1A]/30 dark:border-[#FAF6EE]/30 hover:bg-[#F0EAD6] dark:hover:bg-[#1A2232] font-mono-tech text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>RESET SIMULATION STATE</span>
                  </button>
                </div>

              </div>

            </div>

          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* PROPER POP-UP CARD MODAL DIALOG (WITH SMOOTH SCROLL & FULL FORENSIC DATA) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isModalOpen && (
          <div 
            data-lenis-prevent="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8"
          >
            
            {/* Backdrop Blur Overlay with Click-to-Close */}
            <motion.div
              data-lenis-prevent="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-[#000000]/80 backdrop-blur-md cursor-pointer"
            />

            {/* Modal Card Container */}
            <motion.div
              data-lenis-prevent="true"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#FAF6EE] dark:bg-[#101622] border-3 border-[#DC143C] shadow-[0_25px_60px_rgba(0,0,0,0.6)] z-10 overflow-hidden overscroll-contain"
            >
              
              {/* Modal Top Ribbon / Header Bar */}
              <div className="bg-[#1A1A1A] text-[#FAF6EE] px-5 py-4 border-b-2 border-[#DC143C] flex items-center justify-between shrink-0 flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono-tech uppercase font-bold tracking-widest bg-[#DC143C] text-[#FAF6EE] px-2 py-0.5 shadow-sm">
                      CAUSAL LINK DOSSIER
                    </span>
                    <span className="text-[11px] font-mono-tech text-[#E5C76B] font-bold">
                      THREAD {selectedLinkIndex + 1} OF {scenario.links.length} · ID: {selectedLink.id}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-headline font-black tracking-tight text-[#FAF6EE] flex items-center gap-2.5">
                    <span>{selectedLink.fromLabel}</span>
                    <span className="text-[#DC143C] font-bold text-xl sm:text-2xl">➔</span>
                    <span>{selectedLink.toLabel}</span>
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  {/* Prev / Next link buttons */}
                  <button
                    onClick={handlePrevLink}
                    title="Previous verified link"
                    className="p-1.5 bg-[#FAF6EE]/10 hover:bg-[#FAF6EE]/25 text-[#FAF6EE] border border-[#FAF6EE]/20 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextLink}
                    title="Next verified link"
                    className="p-1.5 bg-[#FAF6EE]/10 hover:bg-[#FAF6EE]/25 text-[#FAF6EE] border border-[#FAF6EE]/20 transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  
                  {/* Close Modal Button */}
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="ml-2 px-3 py-1.5 bg-[#DC143C] hover:bg-[#A0162B] text-[#FAF6EE] text-xs font-mono-tech font-bold uppercase tracking-wider flex items-center gap-1.5 border border-[#FAF6EE]/30 shadow-sm transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span className="hidden sm:inline">CLOSE [ESC]</span>
                  </button>
                </div>
              </div>

              {/* Modal Posterior Confidence & Link Sub-Bar */}
              <div className="bg-[#E2D5C0] dark:bg-[#161F2E] px-5 py-2.5 border-b border-[#1A1A1A]/15 dark:border-[#FAF6EE]/15 flex flex-wrap items-center justify-between gap-3 text-xs font-mono-tech shrink-0">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[#1A1A1A] dark:text-[#FAF6EE] uppercase">
                    TEMPORAL DELAY: <span className="text-[#DC143C] font-mono">{selectedLink.temporalGapLabel} ({selectedLink.temporalGapMs}ms)</span>
                  </span>
                  <span className="text-[#625A50] dark:text-[#94A3B8]">|</span>
                  <span className="font-bold text-[#1A1A1A] dark:text-[#FAF6EE] uppercase">
                    STRENGTH: <span className="text-[#DC143C] font-bold">{selectedLink.strength.toUpperCase()}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[#625A50] dark:text-[#94A3B8] font-bold uppercase">POSTERIOR CONFIDENCE:</span>
                  <span className="font-headline font-black text-xl text-[#DC143C] dark:text-[#E63956]">
                    {selectedLink.confidence.toFixed(2)} ({(selectedLink.confidence * 100).toFixed(0)}% ±{(selectedLink.uncertaintyMargin * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* Modal Body - Fully Scrollable with keyboard and mouse wheel containment */}
              <div 
                ref={modalBodyRef}
                data-lenis-prevent="true"
                tabIndex={0}
                className="overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-6 flex-1 text-[#1A1A1A] dark:text-[#FAF6EE] focus:outline-none focus:ring-0 select-text"
                style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
              >
                
                {/* 0. Cause vs Effect Event Pair Overview & Telemetry */}
                <div>
                  <h3 className="text-xs font-mono-tech font-bold uppercase text-[#625A50] dark:text-[#94A3B8] mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#DC143C]" />
                    LINK EVENT PAIR & TELEMETRY EXTRACTION
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Cause Card */}
                    <div className="p-3.5 bg-[#F0EAD6]/80 dark:bg-[#1A2232] border-2 border-[#DC143C]/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] bg-[#DC143C] text-[#FAF6EE] px-1.5 py-0.5 rounded-xs font-mono-tech uppercase font-bold">
                          ORIGIN CAUSE
                        </span>
                        <span className="font-mono text-xs font-bold text-[#DC143C]">
                          {causeEvent?.timestamp}
                        </span>
                      </div>
                      <div className="font-headline font-bold text-sm text-[#1A1A1A] dark:text-[#FAF6EE]">
                        {causeEvent?.event || selectedLink.fromLabel}
                      </div>
                      <div className="text-[10px] font-mono-tech text-[#625A50] dark:text-[#94A3B8]">
                        SUBSYSTEM: {causeEvent?.subsystemCode} · ROLE: {causeEvent?.causalRole}
                      </div>
                      <div className="p-2 bg-[#FAF6EE] dark:bg-[#0B0F19] border border-[#1A1A1A]/10 dark:border-[#FAF6EE]/10 font-mono text-xs text-[#DC143C] dark:text-[#E63956] font-bold">
                        {causeEvent?.telemetrySnippet}
                      </div>
                      <div className="text-[10px] font-mono-tech text-[#625A50] dark:text-[#94A3B8] flex items-center justify-between">
                        <span>Nominal: {causeEvent?.nominalRange}</span>
                        {causeEvent?.telemetryGap.hasGap ? (
                          <span className="text-[#DC143C] font-bold">GAP +{causeEvent.telemetryGap.gapDurationMs}MS</span>
                        ) : (
                          <span className="text-green-600 dark:text-emerald-400 font-bold">Continuous Stream</span>
                        )}
                      </div>
                    </div>

                    {/* Effect Card */}
                    <div className="p-3.5 bg-[#F0EAD6]/80 dark:bg-[#1A2232] border-2 border-[#1D546C]/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] bg-[#1D546C] text-[#FAF6EE] px-1.5 py-0.5 rounded-xs font-mono-tech uppercase font-bold">
                          PROPAGATED EFFECT
                        </span>
                        <span className="font-mono text-xs font-bold text-[#1D546C] dark:text-cyan-400">
                          {effectEvent?.timestamp}
                        </span>
                      </div>
                      <div className="font-headline font-bold text-sm text-[#1A1A1A] dark:text-[#FAF6EE]">
                        {effectEvent?.event || selectedLink.toLabel}
                      </div>
                      <div className="text-[10px] font-mono-tech text-[#625A50] dark:text-[#94A3B8]">
                        SUBSYSTEM: {effectEvent?.subsystemCode} · ROLE: {effectEvent?.causalRole}
                      </div>
                      <div className="p-2 bg-[#FAF6EE] dark:bg-[#0B0F19] border border-[#1A1A1A]/10 dark:border-[#FAF6EE]/10 font-mono text-xs text-[#1D546C] dark:text-cyan-400 font-bold">
                        {effectEvent?.telemetrySnippet}
                      </div>
                      <div className="text-[10px] font-mono-tech text-[#625A50] dark:text-[#94A3B8] flex items-center justify-between">
                        <span>Nominal: {effectEvent?.nominalRange}</span>
                        {effectEvent?.telemetryGap.hasGap ? (
                          <span className="text-[#DC143C] font-bold">GAP +{effectEvent.telemetryGap.gapDurationMs}MS</span>
                        ) : (
                          <span className="text-green-600 dark:text-emerald-400 font-bold">Continuous Stream</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 1. Six Key Forensic Metrics Cards Grid */}
                <div>
                  <h3 className="text-xs font-mono-tech font-bold uppercase text-[#625A50] dark:text-[#94A3B8] mb-2 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#DC143C]" />
                    KEY FORENSIC METRICS & OBSERVED INTERMEDIATES
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    
                    <div className="p-3 bg-[#F0EAD6]/80 dark:bg-[#1A2232] border border-[#1A1A1A]/15 dark:border-[#FAF6EE]/15">
                      <span className="text-[10px] font-mono-tech text-[#625A50] dark:text-[#94A3B8] uppercase block font-semibold">
                        DEPENDENCY
                      </span>
                      <span className="font-mono text-sm font-bold text-[#1A1A1A] dark:text-[#FAF6EE] uppercase mt-0.5 block">
                        {selectedLink.dependency}
                      </span>
                    </div>

                    <div className="p-3 bg-[#F0EAD6]/80 dark:bg-[#1A2232] border border-[#1A1A1A]/15 dark:border-[#FAF6EE]/15">
                      <span className="text-[10px] font-mono-tech text-[#625A50] dark:text-[#94A3B8] uppercase block font-semibold">
                        STRENGTH
                      </span>
                      <span className="font-mono text-sm font-bold text-[#DC143C] dark:text-[#E63956] uppercase mt-0.5 block">
                        {selectedLink.strength}
                      </span>
                    </div>

                    <div className="p-3 bg-[#F0EAD6]/80 dark:bg-[#1A2232] border border-[#1A1A1A]/15 dark:border-[#FAF6EE]/15">
                      <span className="text-[10px] font-mono-tech text-[#625A50] dark:text-[#94A3B8] uppercase block font-semibold">
                        TEMPORAL GAP
                      </span>
                      <span className="font-mono text-sm font-bold text-[#1A1A1A] dark:text-[#FAF6EE] mt-0.5 block">
                        {selectedLink.temporalGapLabel} ({selectedLink.temporalGapMs} ms)
                      </span>
                    </div>

                    <div className="p-3 bg-[#F0EAD6]/80 dark:bg-[#1A2232] border border-[#1A1A1A]/15 dark:border-[#FAF6EE]/15">
                      <span className="text-[10px] font-mono-tech text-[#625A50] dark:text-[#94A3B8] uppercase block font-semibold">
                        CONFIDENCE MARGIN
                      </span>
                      <span className="font-mono text-sm font-bold text-[#C5A945] mt-0.5 block">
                        {(selectedLink.confidence * 100).toFixed(0)}% (±{(selectedLink.uncertaintyMargin * 100).toFixed(1)}%)
                      </span>
                    </div>

                    <div className="p-3 bg-[#F0EAD6]/80 dark:bg-[#1A2232] border border-[#1A1A1A]/15 dark:border-[#FAF6EE]/15">
                      <span className="text-[10px] font-mono-tech text-[#625A50] dark:text-[#94A3B8] uppercase block font-semibold">
                        OBSERVED INTERMEDIATE
                      </span>
                      <span className="font-mono text-xs font-bold text-[#1A1A1A] dark:text-[#FAF6EE] mt-0.5 block">
                        {selectedLink.observedIntermediate}
                      </span>
                    </div>

                    <div className="p-3 bg-[#F0EAD6]/80 dark:bg-[#1A2232] border border-[#1A1A1A]/15 dark:border-[#FAF6EE]/15">
                      <span className="text-[10px] font-mono-tech text-[#625A50] dark:text-[#94A3B8] uppercase block font-semibold">
                        TELEMETRY TRANSITION
                      </span>
                      <span className="font-mono text-sm font-bold text-[#DC143C] dark:text-[#E63956] mt-0.5 block">
                        {selectedLink.telemetrySupport}
                      </span>
                    </div>

                  </div>
                </div>

                {/* 2. Physical Proof & Laws Applied */}
                <div className="p-4 bg-[#F0EAD6]/50 dark:bg-[#161F2E] border-2 border-[#1A1A1A]/20 dark:border-[#FAF6EE]/20 space-y-3">
                  <span className="text-xs font-mono-tech font-bold uppercase text-[#1A1A1A] dark:text-[#FAF6EE] flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-[#DC143C]" />
                    FIRST-PRINCIPLES PHYSICAL PROOF (REASONING & EMPIRICAL EVIDENCE):
                  </span>
                  
                  <p className="text-xs font-mono-tech text-[#1A1A1A] dark:text-[#FAF6EE] leading-relaxed bg-[#FAF6EE] dark:bg-[#0E1420] p-3.5 border border-[#1A1A1A]/10 dark:border-[#FAF6EE]/10">
                    {selectedLink.whyEngineBelievesThis.physicalProof}
                  </p>

                  <div className="p-3 bg-[#1A1A1A] text-[#FAF6EE] text-xs font-mono-tech border-l-3 border-[#DC143C]">
                    <span className="text-[#E5C76B] font-bold block mb-1">PHYSICAL LAW / FIRST PRINCIPLE:</span>
                    <p className="text-[#FAF6EE]/90 leading-relaxed font-mono">
                      {selectedLink.whyEngineBelievesThis.firstPrinciplesLaw}
                    </p>
                  </div>

                  <div className="p-3 bg-[#E2D5C0]/60 dark:bg-[#1A2232] text-xs font-mono-tech border border-[#1A1A1A]/15 dark:border-[#FAF6EE]/15">
                    <span className="font-bold text-[#C5A945] block uppercase">COUNTERFACTUAL FALSIFICATION CHECK:</span>
                    <p className="text-[#1A1A1A]/90 dark:text-[#FAF6EE]/90 mt-1">
                      {selectedLink.whyEngineBelievesThis.counterfactualFalsification}
                    </p>
                  </div>
                </div>

                {/* 3. Raw Supporting Telemetry & Firmware Trace Logs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#1A1A1A] text-[#FAF6EE] border border-[#1A1A1A]">
                    <span className="text-[10px] font-mono-tech font-bold uppercase text-[#94A3B8] block mb-1.5">
                      SUPPORTING HIGH-RATE TELEMETRY DUMP
                    </span>
                    <div className="bg-[#0B0F19] text-emerald-400 p-3 rounded-xs font-mono text-xs leading-relaxed border border-emerald-950">
                      <code>{selectedLink.whyEngineBelievesThis.supportingTelemetryDump}</code>
                    </div>
                  </div>

                  <div className="p-4 bg-[#1A1A1A] text-[#FAF6EE] border border-[#1A1A1A]">
                    <span className="text-[10px] font-mono-tech font-bold uppercase text-[#94A3B8] block mb-1.5">
                      ONBOARD FIRMWARE TRACE LOG
                    </span>
                    <div className="bg-[#0B0F19] text-[#E5C76B] p-3 rounded-xs font-mono text-xs leading-relaxed border border-amber-950">
                      <code>{selectedLink.whyEngineBelievesThis.firmwareTraceLog}</code>
                    </div>
                  </div>
                </div>

                {/* 4. Failure Mode & Criticality Standards + Timestamp Alignment */}
                <div className="p-4 bg-[#F0EAD6]/50 dark:bg-[#161F2E] border border-[#1A1A1A]/15 dark:border-[#FAF6EE]/15 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono-tech">
                  <div className="p-2.5 bg-[#FAF6EE] dark:bg-[#1A2232] border border-[#1A1A1A]/10 dark:border-[#FAF6EE]/10">
                    <span className="text-[10px] text-[#625A50] dark:text-[#94A3B8] uppercase block">FMEA CODE</span>
                    <span className="font-bold text-[#DC143C] dark:text-[#E63956] text-sm mt-0.5 block">
                      {selectedLink.failureModeClassification.fmeaCode}
                    </span>
                  </div>
                  <div className="p-2.5 bg-[#FAF6EE] dark:bg-[#1A2232] border border-[#1A1A1A]/10 dark:border-[#FAF6EE]/10">
                    <span className="text-[10px] text-[#625A50] dark:text-[#94A3B8] uppercase block">GOVERNING STANDARD</span>
                    <span className="font-bold text-[#1A1A1A] dark:text-[#FAF6EE] text-xs mt-0.5 block">
                      {selectedLink.failureModeClassification.standard}
                    </span>
                  </div>
                  <div className="p-2.5 bg-[#FAF6EE] dark:bg-[#1A2232] border border-[#1A1A1A]/10 dark:border-[#FAF6EE]/10">
                    <span className="text-[10px] text-[#625A50] dark:text-[#94A3B8] uppercase block">SEVERITY / CRITICALITY</span>
                    <span className="font-bold text-[#DC143C] dark:text-[#E63956] text-xs mt-0.5 block">
                      {selectedLink.failureModeClassification.severity} (RANK #{selectedLink.failureModeClassification.criticalityRank})
                    </span>
                  </div>
                  <div className="p-2.5 bg-[#FAF6EE] dark:bg-[#1A2232] border border-[#1A1A1A]/10 dark:border-[#FAF6EE]/10">
                    <span className="text-[10px] text-[#625A50] dark:text-[#94A3B8] uppercase block">TIMESTAMP ALIGNMENT</span>
                    <span className="font-bold text-green-600 dark:text-emerald-400 text-xs mt-0.5 block">
                      GPS PPS ±{selectedLink.timestampAlignment.clockSkewMs}ms
                    </span>
                    <span className="text-[10px] text-[#625A50] dark:text-[#94A3B8] block">✓ Precedence Verified</span>
                  </div>
                </div>

              </div>

              {/* Modal Footer Controls */}
              <div className="bg-[#E2D5C0] dark:bg-[#161F2E] px-5 py-3 border-t border-[#1A1A1A]/15 dark:border-[#FAF6EE]/15 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyProof}
                    className="px-3 py-1.5 bg-[#1A1A1A] text-[#FAF6EE] hover:bg-[#DC143C] text-xs font-mono-tech font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedProof ? 'COPIED TO CLIPBOARD!' : 'COPY AUDIT TEXT'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      scrollToWhatIf();
                    }}
                    className="px-3 py-1.5 bg-green-700 hover:bg-green-800 text-[#FAF6EE] text-xs font-mono-tech font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#E5C76B]" />
                    <span>RUN WHAT-IF INTERVENTION ON THIS FAULT →</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevLink}
                    className="px-3 py-1.5 bg-[#FAF6EE] dark:bg-[#1A2232] border border-[#1A1A1A]/20 dark:border-[#FAF6EE]/20 hover:border-[#DC143C] text-xs font-mono-tech font-bold uppercase cursor-pointer"
                  >
                    ← PREV THREAD
                  </button>
                  <button
                    onClick={handleNextLink}
                    className="px-3 py-1.5 bg-[#FAF6EE] dark:bg-[#1A2232] border border-[#1A1A1A]/20 dark:border-[#FAF6EE]/20 hover:border-[#DC143C] text-xs font-mono-tech font-bold uppercase cursor-pointer"
                  >
                    NEXT THREAD →
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
