import React from 'react';
import { GenealogyEdge, GenealogyNode } from '../../data/reconstructionData';
import { 
  GitCommit, 
  ArrowRight, 
  Clock, 
  ShieldCheck, 
  Cpu, 
  Thermometer, 
  Activity, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface SelectedLinkInspectorProps {
  selectedEdge: GenealogyEdge | null;
  selectedNode: GenealogyNode | null;
  onInspectEvidence: () => void;
  theme?: 'light' | 'dark';
}

export const SelectedLinkInspector: React.FC<SelectedLinkInspectorProps> = ({
  selectedEdge,
  selectedNode,
  onInspectEvidence,
  theme
}) => {
  const isDark = theme === 'dark';

  // If nothing is selected, display helpful default state
  if (!selectedEdge && !selectedNode) {
    return (
      <div className="bg-[#FAF6EE] text-[#1A1A1A] border-2 border-[#1A1A1A] p-5 shadow-xl flex flex-col justify-between h-full min-h-[300px] select-none rounded-xs">
        <div>
          <div className="flex items-center justify-between border-b-2 border-[#1A1A1A]/20 pb-2 mb-3">
            <span className="text-xs font-mono-tech font-bold uppercase tracking-wider text-[#DC143C]">
              ZONE 03 // SELECTED LINK
            </span>
            <span className="text-[10px] font-mono-tech text-[#C5A945] font-bold">
              INSPECTOR ACTIVE
            </span>
          </div>
          <div className="text-sm font-mono-tech text-[#625A50] mt-6 leading-relaxed">
            Click any edge or node in the <strong className="text-[#1A1A1A]">Causal Genealogy</strong> graph above to inspect its structural dependency, confidence bounds, and temporal propagation gap.
          </div>
        </div>

        <div className="p-3 bg-[#1A1A1A]/5 border-l-4 border-[#C5A945] text-xs font-mono-tech">
          Tip: Each red and gold wire represents a physically verifiable hardware or software coupling.
        </div>
      </div>
    );
  }

  // If node is selected (and no edge), show node details in link inspector format
  if (!selectedEdge && selectedNode) {
    return (
      <div className="bg-[#FAF6EE] text-[#1A1A1A] border-2 border-[#1A1A1A] p-5 shadow-xl flex flex-col justify-between h-full min-h-[300px] select-none rounded-xs">
        <div>
          <div className="flex items-center justify-between border-b-2 border-[#1A1A1A]/20 pb-2 mb-3">
            <span className="text-xs font-mono-tech font-bold uppercase tracking-wider text-[#DC143C]">
              SELECTED SUBSYSTEM NODE
            </span>
            <span className="text-[10px] font-mono-tech bg-[#1A1A1A] text-[#FAF6EE] px-2 py-0.5 font-bold">
              {selectedNode.code}
            </span>
          </div>

          <div className="font-headline font-black text-xl text-[#1A1A1A] tracking-tight uppercase mb-1">
            {selectedNode.label}
          </div>
          <div className="text-xs font-mono-tech text-[#625A50] mb-4">
            {selectedNode.subsystemName}
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono-tech bg-[#F0EAD6] p-3 border border-[#1A1A1A]/20 mb-4">
            <div>
              <span className="text-[10px] text-[#625A50] block font-bold">STRATUM ROLE</span>
              <strong className="text-[#DC143C] uppercase">{selectedNode.stratum}</strong>
            </div>
            <div>
              <span className="text-[10px] text-[#625A50] block font-bold">CONFIDENCE</span>
              <strong className="text-emerald-700">{(selectedNode.confidence * 100).toFixed(1)}% (±{(selectedNode.uncertaintyMargin * 100).toFixed(1)}%)</strong>
            </div>
            <div>
              <span className="text-[10px] text-[#625A50] block font-bold">TELEMETRY READING</span>
              <strong className="text-[#1A1A1A] text-[11px] truncate block">{selectedNode.rawReading}</strong>
            </div>
            <div>
              <span className="text-[10px] text-[#625A50] block font-bold">TIME OFFSET</span>
              <strong className="text-[#C5A945]">{selectedNode.timeOffsetLabel}</strong>
            </div>
          </div>

          <div className="text-xs font-typewriter text-[#1A1A1A]/90 border-l-3 border-[#DC143C] pl-3 py-1">
            {selectedNode.evidenceSummary}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#1A1A1A]/20 flex items-center justify-between text-xs font-mono-tech">
          <span className="text-[#625A50]">OCCAM'S PATH:</span>
          <span className="text-emerald-700 font-bold">VERIFIED IRREDUCIBLE</span>
        </div>
      </div>
    );
  }

  // Edge is selected - exactly follow user specification:
  // SELECTED LINK: A -> B, THERMAL, CONF 0.91, TEMPORAL GAP, STRENGTH, INTERMEDIATE STATE
  return (
    <div className="bg-[#FAF6EE] text-[#1A1A1A] border-2 border-[#1A1A1A] p-5 shadow-xl flex flex-col justify-between h-full min-h-[300px] select-none rounded-xs">
      <div>
        
        {/* Header Badge */}
        <div className="flex items-center justify-between border-b-2 border-[#1A1A1A]/20 pb-2 mb-3">
          <span className="text-xs font-mono-tech font-bold uppercase tracking-wider text-[#DC143C] flex items-center gap-1.5">
            <GitCommit className="w-3.5 h-3.5" />
            <span>SELECTED LINK</span>
          </span>
          <span className="text-[10px] font-mono-tech bg-[#DC143C] text-[#FAF6EE] px-2 py-0.5 font-bold">
            CONF {selectedEdge!.confidence.toFixed(2)}
          </span>
        </div>

        {/* Link Heading: A -> B */}
        <div className="flex items-center gap-2 mb-3 bg-[#1A1A1A] text-[#FAF6EE] p-2.5 rounded-xs">
          <span className="font-headline font-black text-sm tracking-wide text-[#E5C76B]">
            {selectedEdge!.fromLabel}
          </span>
          <ArrowRight className="w-4 h-4 text-[#DC143C] shrink-0" />
          <span className="font-headline font-black text-sm tracking-wide text-[#FAF6EE]">
            {selectedEdge!.toLabel}
          </span>
        </div>

        {/* Dependency Category & Strength */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs font-mono-tech">
          <div className="bg-[#F0EAD6] p-2 border border-[#1A1A1A]/20">
            <span className="text-[10px] text-[#625A50] block font-bold">DEPENDENCY TYPE</span>
            <strong className="text-[#1A1A1A] uppercase">{selectedEdge!.dependencyCategory}</strong>
          </div>
          <div className="bg-[#F0EAD6] p-2 border border-[#1A1A1A]/20">
            <span className="text-[10px] text-[#625A50] block font-bold">STRENGTH (WEIGHT)</span>
            <strong className="text-[#DC143C] uppercase">{selectedEdge!.dependencyStrength} ({selectedEdge!.dependencyWeight.toFixed(2)})</strong>
          </div>
        </div>

        {/* Temporal Gap & Intermediate State */}
        <div className="space-y-2 text-xs font-mono-tech mb-3">
          <div className="flex items-center justify-between bg-[#FAF6EE] p-2 border border-[#1A1A1A]/30">
            <span className="text-[#625A50] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#C5A945]" />
              <span>TEMPORAL GAP:</span>
            </span>
            <strong className="text-base font-black text-[#DC143C]">
              {selectedEdge!.temporalGapLabel}
            </strong>
          </div>

          <div className="bg-[#F0EAD6] p-2.5 border-l-4 border-[#DC143C] text-[11px] leading-relaxed">
            <span className="text-[10px] text-[#625A50] block font-bold uppercase mb-0.5">
              INTERMEDIATE STATE:
            </span>
            <span className="font-typewriter text-[#1A1A1A]">
              {selectedEdge!.intermediateState}
            </span>
          </div>
        </div>

      </div>

      {/* Action to Focus on Evidence Audit */}
      <div className="pt-3 border-t border-[#1A1A1A]/20 flex items-center justify-between text-xs font-mono-tech">
        <div className="flex items-center gap-1 text-emerald-700 font-bold">
          <CheckCircle2 className="w-4 h-4" />
          <span>PHYSICALLY AUDITABLE</span>
        </div>

        <button
          onClick={onInspectEvidence}
          className="px-3 py-1 bg-[#1A1A1A] text-[#FAF6EE] hover:bg-[#DC143C] font-bold transition-colors cursor-pointer text-[11px]"
        >
          VIEW PROOF →
        </button>
      </div>

    </div>
  );
};
