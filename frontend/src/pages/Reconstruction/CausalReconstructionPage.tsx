import React, { useState, useEffect, useRef } from 'react';
import { 
  RECONSTRUCTION_SCENARIOS, 
  FailureModeScenario, 
  GenealogyNode, 
  GenealogyEdge 
} from '../../data/reconstructionData';
import { IncidentHeaderBar } from '../../components/reconstruction/IncidentHeaderBar';
import { CausalGenealogyTree } from '../../components/reconstruction/CausalGenealogyTree';
import { SelectedLinkInspector } from '../../components/reconstruction/SelectedLinkInspector';
import { EvidenceAuditPanel } from '../../components/reconstruction/EvidenceAuditPanel';
import { FailureModeLibraryModal } from '../../components/reconstruction/FailureModeLibraryModal';
import { 
  ArrowLeft, 
  ChevronRight, 
  Target, 
  ShieldCheck, 
  BookOpen, 
  Sparkles, 
  Beaker, 
  FileText, 
  Layers, 
  CheckCircle2,
  Clock,
  Printer,
  Download,
  Share2,
  Activity,
  X
} from 'lucide-react';
import { useAnalysis } from '../../context/AnalysisContext';
import { SpacecraftReplaySimulator } from '../../components/simulation/SpacecraftReplaySimulator';

interface CausalReconstructionPageProps {
  onBack: () => void;
  onOpenCaelis?: () => void;
  onOpenMissionLab?: () => void;
  onOpenEvidenceTrace?: () => void;
  onNavigateToSection?: (sectionId: string) => void;
  theme?: 'light' | 'dark';
}

export const CausalReconstructionPage: React.FC<CausalReconstructionPageProps> = ({
  onBack,
  onOpenCaelis,
  onOpenMissionLab,
  onOpenEvidenceTrace,
  onNavigateToSection,
  theme
}) => {
  const { analysis, status, loadScenario, activeIncidentId } = useAnalysis();
  const [activeTab, setActiveTab] = useState<'graph' | 'replay'>('graph');
  const [activeScenario, setActiveScenario] = useState<FailureModeScenario>(
    RECONSTRUCTION_SCENARIOS[0]
  );
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);
  const [isMinimumCausalOnly, setIsMinimumCausalOnly] = useState<boolean>(true);
  
  // Selection states (default to first edge)
  const [selectedNode, setSelectedNode] = useState<GenealogyNode | null>(
    activeScenario.nodes[0]
  );
  const [selectedEdge, setSelectedEdge] = useState<GenealogyEdge | null>(
    activeScenario.edges[0]
  );

  // Temporal Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const totalSteps = activeScenario.nodes.length;
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Snapshot / Export Modal
  const [isSnapshotOpen, setIsSnapshotOpen] = useState<boolean>(false);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handle Scenario Switch
  const handleSelectScenario = (scenario: FailureModeScenario) => {
    setActiveScenario(scenario);
    setSelectedNode(scenario.nodes[0]);
    setSelectedEdge(scenario.edges[0]);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  };

  // Node & Edge Selection Handlers
  const handleSelectNode = (node: GenealogyNode) => {
    setSelectedNode(node);
    // Find first edge originating or terminating at this node
    const relatedEdge = activeScenario.edges.find(
      e => e.fromId === node.id || e.toId === node.id
    );
    if (relatedEdge) {
      setSelectedEdge(relatedEdge);
    }
  };

  const handleSelectEdge = (edge: GenealogyEdge) => {
    setSelectedEdge(edge);
    const targetNode = activeScenario.nodes.find(n => n.id === edge.toId);
    if (targetNode) {
      setSelectedNode(targetNode);
    }
  };

  // Step-by-step Temporal Wave Simulation
  useEffect(() => {
    if (isPlaying) {
      playbackTimerRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= totalSteps - 1) {
            setIsPlaying(false);
            return prev;
          }
          const next = prev + 1;
          const nextNode = activeScenario.nodes[next];
          if (nextNode) {
            setSelectedNode(nextNode);
            const edgeToNext = activeScenario.edges.find(e => e.toId === nextNode.id);
            if (edgeToNext) setSelectedEdge(edgeToNext);
          }
          return next;
        });
      }, 1500);
    } else {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    }

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying, totalSteps, activeScenario]);

  const handleStepForward = () => {
    if (currentStepIndex < totalSteps - 1) {
      const next = currentStepIndex + 1;
      setCurrentStepIndex(next);
      const nextNode = activeScenario.nodes[next];
      if (nextNode) {
        setSelectedNode(nextNode);
        const edgeToNext = activeScenario.edges.find(e => e.toId === nextNode.id);
        if (edgeToNext) setSelectedEdge(edgeToNext);
      }
    }
  };

  const handleStepBackward = () => {
    if (currentStepIndex > 0) {
      const prev = currentStepIndex - 1;
      setCurrentStepIndex(prev);
      const prevNode = activeScenario.nodes[prev];
      if (prevNode) {
        setSelectedNode(prevNode);
        const edgeToPrev = activeScenario.edges.find(e => e.toId === prevNode.id);
        if (edgeToPrev) setSelectedEdge(edgeToPrev);
      }
    }
  };

  const handleResetPlayback = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
    setSelectedNode(activeScenario.nodes[0]);
    setSelectedEdge(activeScenario.edges[0]);
  };

  return (
    <div className="relative min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-[#F0EAD6] text-[#1A1A1A] transition-colors duration-200 overflow-hidden">
      
      {/* Background Subtle Watermark Grids */}
      <div className="absolute inset-0 bg-circuit-pattern opacity-15 pointer-events-none"></div>
      <div className="absolute inset-0 bg-halftone opacity-15 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-20 space-y-6">
        
        {/* Page Hero Header & Design Framing */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-mono-tech bg-[#DC143C] text-[#FAF6EE] px-2 py-0.5 font-bold uppercase tracking-widest">
                CORE SYSTEM // 04 — RECONSTRUCTION
              </span>
              <span className="text-xs font-mono-tech text-[#C5A945] font-bold">
                AUDITABLE CAUSAL GENEALOGY
              </span>
            </div>
            
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-headline font-black text-[#1A1A1A] tracking-tight leading-none">
              CAUSAL <span className="bg-[#DC143C] text-[#FAF6EE] px-2 py-0.5 inline-block torn-paper-strip">RECONSTRUCTION</span>
            </h1>

            <p className="mt-3 text-xs sm:text-sm font-mono-tech text-[#625A50] max-w-3xl leading-relaxed">
              Autonomous causal inference across coupled subsystems. Every edge proves direction, timestamp delta, and underlying telemetry without black-box approximations.
            </p>
          </div>

          {/* Quick Counterfactual Impact Highlight */}
          <div className="p-3 bg-[#FAF6EE] border-2 border-[#1A1A1A] shadow-md max-w-sm rounded-xs">
            <span className="text-[10px] font-mono-tech text-[#DC143C] font-bold uppercase block mb-1">
              COUNTERFACTUAL PROOF SUMMARY
            </span>
            <p className="text-xs font-typewriter text-[#1A1A1A] leading-snug">
              "{activeScenario.counterfactualImpact}"
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ZONE 1: INCIDENT HEADER BAR (Timestamp, Overall Confidence, Mode Controls) */}
        {/* ========================================================================= */}
        <IncidentHeaderBar
          scenario={activeScenario}
          onOpenLibrary={() => setIsLibraryOpen(true)}
          isMinimumCausalOnly={isMinimumCausalOnly}
          onToggleMinimumCausal={() => setIsMinimumCausalOnly(!isMinimumCausalOnly)}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          currentStepIndex={currentStepIndex}
          totalSteps={totalSteps}
          onStepForward={handleStepForward}
          onStepBackward={handleStepBackward}
          onResetPlayback={handleResetPlayback}
          onCaptureScreenshot={() => setIsSnapshotOpen(true)}
          theme={theme}
        />

        {/* View Selection Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#1A1A1A] pb-2 font-mono-tech text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('graph')}
              className={`px-4 py-2 font-bold uppercase transition-colors border-2 border-[#1A1A1A] flex items-center gap-2 cursor-pointer ${
                activeTab === 'graph'
                  ? 'bg-[#1A1A1A] text-[#FAF6EE] shadow-sm'
                  : 'bg-[#FAF6EE] text-[#1A1A1A] hover:bg-[#E8DFC8]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Causal Genealogy Graph</span>
            </button>
            <button
              onClick={() => setActiveTab('replay')}
              className={`px-4 py-2 font-bold uppercase transition-colors border-2 border-[#1A1A1A] flex items-center gap-2 cursor-pointer ${
                activeTab === 'replay'
                  ? 'bg-[#DC143C] text-[#FAF6EE] shadow-sm'
                  : 'bg-[#FAF6EE] text-[#1A1A1A] hover:bg-[#E8DFC8]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Spacecraft Replay & Counterfactuals</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-bold text-[#625A50]">
            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
            <span>MODEL: {activeIncidentId}</span>
            <span className="bg-[#FAF6EE] border border-[#1A1A1A]/30 px-2 py-0.5 text-[#1A1A1A]">
              STATUS: {status}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ZONE 2: CAUSAL GENEALOGY TREE OR REPLAY SIMULATOR                         */}
        {/* ========================================================================= */}
        {activeTab === 'graph' ? (
          <CausalGenealogyTree
            scenario={activeScenario}
            selectedNodeId={selectedNode?.id || null}
            selectedEdgeId={selectedEdge?.id || null}
            onSelectNode={handleSelectNode}
            onSelectEdge={handleSelectEdge}
            isMinimumCausalOnly={isMinimumCausalOnly}
            currentStepIndex={currentStepIndex}
            theme={theme}
          />
        ) : (
          <SpacecraftReplaySimulator />
        )}

        {/* ========================================================================= */}
        {/* ZONE 3 & ZONE 4: SELECTED LINK INSPECTOR (Left) + EVIDENCE AUDIT (Right)  */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* ZONE 3: SELECTED LINK INSPECTOR (Bottom Left - 5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <SelectedLinkInspector
              selectedEdge={selectedEdge}
              selectedNode={selectedNode}
              onInspectEvidence={() => {
                const evidenceElem = document.getElementById('evidence-panel-zone');
                if (evidenceElem) {
                  evidenceElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
              theme={theme}
            />
          </div>

          {/* ZONE 4: EVIDENCE & AUDIT PANEL (Bottom Right - 7 cols) */}
          <div id="evidence-panel-zone" className="lg:col-span-7 flex flex-col">
            <EvidenceAuditPanel
              selectedEdge={selectedEdge}
              selectedNode={selectedNode}
              theme={theme}
            />
          </div>

        </div>

      </div>

      {/* Feature 6: Failure Mode Library Modal */}
      <FailureModeLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        selectedScenarioId={activeScenario.id}
        onSelectScenario={handleSelectScenario}
        theme={theme}
      />

      {/* Screenshot / Printable Investigation Dossier Modal */}
      {isSnapshotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1A1A]/80 backdrop-blur-xs select-none">
          <div className="bg-[#FAF6EE] border-3 border-[#1A1A1A] shadow-2xl w-full max-w-3xl p-6 sm:p-8 rounded-xs relative">
            <div className="flex items-center justify-between border-b-2 border-[#1A1A1A] pb-3 mb-4">
              <div>
                <span className="text-[10px] font-mono-tech bg-[#DC143C] text-[#FAF6EE] px-2 py-0.5 font-bold uppercase">
                  CLASSIFIED MISSION DOSSIER REPORT
                </span>
                <h2 className="font-headline font-black text-2xl text-[#1A1A1A] mt-1">
                  CAUSAL RECONSTRUCTION · {activeScenario.code}
                </h2>
              </div>
              <button
                onClick={() => setIsSnapshotOpen(false)}
                className="p-1 text-[#1A1A1A] hover:bg-[#1A1A1A]/10 rounded-xs cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono-tech">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#F0EAD6] p-3 border border-[#1A1A1A]/20">
                <div>
                  <span className="text-[10px] text-[#625A50] block">INCIDENT TIME</span>
                  <strong className="text-[#1A1A1A]">{activeScenario.incidentTimeRange}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#625A50] block">OVERALL CONFIDENCE</span>
                  <strong className="text-emerald-700">{(activeScenario.overallConfidence * 100).toFixed(0)}% ({activeScenario.uncertainty})</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#625A50] block">ORIGIN SUBSYSTEM</span>
                  <strong className="text-[#DC143C]">{activeScenario.rootSubsystem}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#625A50] block">FINAL SYMPTOM</span>
                  <strong className="text-[#1A1A1A]">{activeScenario.finalSymptomSubsystem}</strong>
                </div>
              </div>

              <div className="p-3 bg-[#1A1A1A] text-[#FAF6EE] border border-[#1A1A1A]">
                <span className="text-[10px] text-[#E5C76B] font-bold block mb-1">
                  OCCAM'S IRREDUCIBLE PROPAGATION CHAIN:
                </span>
                <div className="flex flex-wrap items-center gap-2 font-bold text-xs">
                  {activeScenario.nodes.map((node, i) => (
                    <React.Fragment key={node.id}>
                      <span className="px-2 py-0.5 bg-[#26221F] border border-[#FAF6EE]/20">
                        {node.code} ({node.timeOffsetLabel})
                      </span>
                      {i < activeScenario.nodes.length - 1 && (
                        <span className="text-[#DC143C]">➔</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-[#F0EAD6] border-l-4 border-[#DC143C]">
                <span className="text-[10px] text-[#625A50] font-bold uppercase block mb-1">
                  VERIFIED COUNTERFACTUAL MITIGATION:
                </span>
                <p className="font-typewriter text-[#1A1A1A] text-xs leading-relaxed">
                  {activeScenario.counterfactualImpact}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t-2 border-[#1A1A1A] flex items-center justify-between">
              <span className="text-[10px] font-mono-tech text-[#625A50]">
                GENEALOGY TRACER · READY FOR FLIGHT DIRECTOR REVIEW
              </span>
              <button
                onClick={() => {
                  window.print();
                  setIsSnapshotOpen(false);
                }}
                className="px-4 py-2 bg-[#1A1A1A] text-[#FAF6EE] hover:bg-[#DC143C] text-xs font-mono-tech font-bold uppercase transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>PRINT / SAVE PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
