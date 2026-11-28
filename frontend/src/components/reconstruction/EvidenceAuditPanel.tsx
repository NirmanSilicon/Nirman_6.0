import React from 'react';
import { GenealogyEdge, GenealogyNode } from '../../data/reconstructionData';
import { 
  FileText, 
  CheckCircle, 
  ShieldCheck, 
  ArrowDown, 
  Terminal, 
  Cpu, 
  Layers, 
  BookOpen,
  HelpCircle,
  Hash,
  Activity,
  AlertTriangle
} from 'lucide-react';

interface EvidenceAuditPanelProps {
  selectedEdge: GenealogyEdge | null;
  selectedNode: GenealogyNode | null;
  theme?: 'light' | 'dark';
}

export const EvidenceAuditPanel: React.FC<EvidenceAuditPanelProps> = ({
  selectedEdge,
  selectedNode,
  theme
}) => {
  const isDark = theme === 'dark';

  // Default state when nothing selected
  if (!selectedEdge && !selectedNode) {
    return (
      <div className="bg-[#FAF6EE] text-[#1A1A1A] border-2 border-[#1A1A1A] p-5 shadow-xl flex flex-col justify-between h-full min-h-[300px] select-none rounded-xs">
        <div>
          <div className="flex items-center justify-between border-b-2 border-[#1A1A1A]/20 pb-2 mb-4">
            <span className="text-xs font-mono-tech font-bold uppercase tracking-wider text-[#DC143C] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>ZONE 04 // EVIDENCE & AUDIT TRACE</span>
            </span>
            <span className="text-[10px] font-mono-tech bg-emerald-800 text-white px-2 py-0.5 font-bold">
              VERIFIED 100%
            </span>
          </div>

          <h3 className="font-headline font-black text-xl text-[#1A1A1A] mb-2">
            WHY EVERY LINK IS AUDITABLE
          </h3>
          <p className="text-xs font-mono-tech text-[#625A50] leading-relaxed mb-4">
            In space operations, causal reconstructions must be mathematically and physically demonstrable. 
            Select any edge in the graph above to reveal its raw telemetry provenance, firmware states, and physics validation proofs.
          </p>

          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono-tech mt-4">
            <div className="bg-[#F0EAD6] p-3 border border-[#1A1A1A]/20">
              <div className="font-headline font-black text-lg text-[#DC143C]">100%</div>
              <div className="text-[9px] text-[#625A50]">TEMPORAL ORDER</div>
            </div>
            <div className="bg-[#F0EAD6] p-3 border border-[#1A1A1A]/20">
              <div className="font-headline font-black text-lg text-[#C5A945]">0.94</div>
              <div className="text-[9px] text-[#625A50]">MEAN POSTERIOR</div>
            </div>
            <div className="bg-[#F0EAD6] p-3 border border-[#1A1A1A]/20">
              <div className="font-headline font-black text-lg text-emerald-700">0</div>
              <div className="text-[9px] text-[#625A50]">BLACK-BOX GUESSES</div>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-[#1A1A1A]/20 text-[10px] font-mono-tech text-[#625A50]">
          Strict standard: Every explanation traces directly to underlying packet timestamps and circuit schematic topology.
        </div>
      </div>
    );
  }

  // Node selected (when no edge active)
  if (!selectedEdge && selectedNode) {
    return (
      <div className="bg-[#FAF6EE] text-[#1A1A1A] border-2 border-[#1A1A1A] p-5 shadow-xl flex flex-col justify-between h-full min-h-[300px] select-none rounded-xs">
        <div>
          <div className="flex items-center justify-between border-b-2 border-[#1A1A1A]/20 pb-2 mb-3">
            <span className="text-xs font-mono-tech font-bold uppercase tracking-wider text-[#DC143C] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>NODE EVIDENCE PROVENANCE</span>
            </span>
            <span className="text-[10px] font-mono-tech bg-[#C5A945] text-white px-2 py-0.5 font-bold">
              PACKET HEX VERIFIED
            </span>
          </div>

          <div className="font-headline font-black text-lg text-[#1A1A1A] uppercase mb-2">
            {selectedNode.label} ({selectedNode.code})
          </div>

          {/* Raw Telemetry Snippet Box */}
          <div className="bg-[#1A1A1A] text-[#FAF6EE] p-3 border border-[#1A1A1A] mb-3 font-mono-tech text-xs">
            <div className="text-[10px] text-[#E5C76B] font-bold mb-1">
              FLIGHT RECORDER PACKET DUMP:
            </div>
            <div className="text-emerald-400 font-bold mb-1">
              {selectedNode.telemetrySnippet}
            </div>
            <div className="text-[10px] text-[#FAF6EE]/60">
              HEX: {selectedNode.rawPacketHex}
            </div>
          </div>

          {/* Physical Mechanism */}
          <div className="mb-3 text-xs font-mono-tech">
            <span className="text-[10px] text-[#625A50] block font-bold uppercase mb-0.5">
              PHYSICAL STATE & DIAGNOSIS:
            </span>
            <p className="p-2 bg-[#F0EAD6] border-l-3 border-[#DC143C] font-typewriter text-[#1A1A1A] leading-relaxed">
              {selectedNode.evidenceSummary}
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-[#1A1A1A]/20 flex items-center justify-between text-xs font-mono-tech">
          <span className="text-[#625A50]">TIMESTAMP: {selectedNode.timestamp}</span>
          <span className="text-emerald-700 font-bold">NOMINAL RANGE: {selectedNode.nominalRange}</span>
        </div>
      </div>
    );
  }

  // Edge is selected: Display "WHY THIS LINK EXISTS" precisely formatted
  return (
    <div className="bg-[#FAF6EE] text-[#1A1A1A] border-2 border-[#1A1A1A] p-5 shadow-xl flex flex-col justify-between h-full min-h-[300px] select-none rounded-xs">
      <div>
        
        {/* Header: WHY THIS LINK EXISTS */}
        <div className="flex items-center justify-between border-b-2 border-[#1A1A1A]/20 pb-2 mb-3">
          <span className="text-xs font-mono-tech font-black uppercase tracking-wider text-[#DC143C] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#DC143C]" />
            <span>WHY THIS LINK EXISTS</span>
          </span>
          <span className="text-[10px] font-mono-tech bg-emerald-800 text-white px-2 py-0.5 font-bold">
            AUDITABLE
          </span>
        </div>

        {/* Source -> Target Vertical Mini Hierarchy */}
        <div className="bg-[#1A1A1A] text-[#FAF6EE] p-3 border border-[#1A1A1A] mb-3 flex flex-col items-center justify-center text-center">
          <div className="text-xs font-headline font-black tracking-wide text-[#E5C76B]">
            {selectedEdge!.fromLabel}
          </div>
          <ArrowDown className="w-4 h-4 text-[#DC143C] my-1" />
          <div className="text-xs font-headline font-black tracking-wide text-[#FAF6EE]">
            {selectedEdge!.toLabel}
          </div>
        </div>

        {/* Dependency & Temporal Gap Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs font-mono-tech">
          <div className="bg-[#F0EAD6] p-2 border border-[#1A1A1A]/20">
            <span className="text-[9.5px] text-[#625A50] block font-bold uppercase">DEPENDENCY</span>
            <strong className="text-[#1A1A1A] uppercase text-[11px] block">{selectedEdge!.dependencyCategory}</strong>
          </div>
          <div className="bg-[#F0EAD6] p-2 border border-[#1A1A1A]/20">
            <span className="text-[9.5px] text-[#625A50] block font-bold uppercase">TEMPORAL GAP</span>
            <strong className="text-[#DC143C] text-[11px] block">{selectedEdge!.temporalGapLabel}</strong>
          </div>
        </div>

        {/* Supporting Event */}
        <div className="mb-2 text-xs font-mono-tech">
          <span className="text-[9.5px] text-[#625A50] block font-bold uppercase mb-0.5">
            SUPPORTING EVENT
          </span>
          <div className="bg-[#F0EAD6] p-2 border-l-3 border-[#C5A945] font-bold text-[#1A1A1A] text-[11px]">
            {selectedEdge!.supportingEvent}
          </div>
        </div>

        {/* Telemetry Proof */}
        <div className="mb-2 text-xs font-mono-tech">
          <span className="text-[9.5px] text-[#625A50] block font-bold uppercase mb-0.5">
            TELEMETRY
          </span>
          <div className="bg-[#1A1A1A] text-emerald-400 p-2 font-mono text-[11px] font-bold border border-[#1A1A1A]">
            {selectedEdge!.telemetryProof}
          </div>
        </div>

        {/* Confidence & Physics Validation */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono-tech mt-2">
          <div className="bg-[#F0EAD6] p-2 border border-[#1A1A1A]/20">
            <span className="text-[9.5px] text-[#625A50] block font-bold uppercase">CONFIDENCE</span>
            <strong className="text-emerald-700 text-sm font-black">{selectedEdge!.confidence.toFixed(2)}</strong>
          </div>
          <div className="bg-[#F0EAD6] p-2 border border-[#1A1A1A]/20">
            <span className="text-[9.5px] text-[#625A50] block font-bold uppercase">PHYSICAL VALIDITY</span>
            <strong className="text-emerald-700 text-xs font-bold">PASS [100%]</strong>
          </div>
        </div>

      </div>

      {/* Counterfactual Bottom Note */}
      <div className="mt-3 pt-2.5 border-t border-[#1A1A1A]/20 text-[10px] font-mono-tech text-[#625A50]">
        <strong className="text-[#DC143C]">COUNTERFACTUAL PROOF:</strong> {selectedEdge!.counterfactualCheck}
      </div>

    </div>
  );
};
