import React, { useState } from 'react';
import { TELEMETRY_FRAGMENTS, CAUSAL_EDGES } from '../data/incidentData';
import { FileText, CheckCircle, ShieldCheck, ChevronRight, Pin, Orbit, Cpu, Beaker } from 'lucide-react';
import { InteractiveMoon } from './InteractiveMoon';

interface EvidenceSectionProps {
  onProceedToOrigin: () => void;
  onOpenCaelis: () => void;
  onOpenMissionLab?: () => void;
  onOpenReconstruction?: () => void;
  onOpenEvidenceTrace?: () => void;
  jitterEnabled: boolean;
}

export const EvidenceSection: React.FC<EvidenceSectionProps> = ({
  onProceedToOrigin,
  onOpenCaelis,
  onOpenMissionLab,
  onOpenReconstruction,
  onOpenEvidenceTrace,
  jitterEnabled
}) => {
  const [selectedEdgeIndex, setSelectedEdgeIndex] = useState<number>(0);
  const activeEdge = CAUSAL_EDGES[selectedEdgeIndex];
  const sourceFrag = TELEMETRY_FRAGMENTS.find(f => f.id === activeEdge.fromId);
  const targetFrag = TELEMETRY_FRAGMENTS.find(f => f.id === activeEdge.toId);

  return (
    <section 
      id="evidence"
      className="relative py-10 sm:py-14 px-4 sm:px-6 lg:px-8 bg-transparent dark:bg-transparent border-b-2 border-[#1A1A1A]/20 dark:border-[#FAF6EE]/20 overflow-hidden"
    >
      {/* Background Grunge Texture */}
      <div className="absolute inset-0 bg-circuit-pattern opacity-15 pointer-events-none"></div>
      <div className="absolute inset-0 bg-halftone opacity-20 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12">
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono-tech bg-[#DC143C] text-[#FAF6EE] px-2 py-0.5 font-bold uppercase tracking-widest">
                SECTION 03 // EVIDENCE & AUDITABILITY
              </span>
              <span className="text-xs font-mono-tech text-[#C5A945] font-bold">
                VERIFIABLE PHYSICAL PROOFS
              </span>
            </div>

            <div className="relative">
              <h2 className="text-4xl sm:text-6xl md:text-7xl font-headline font-black text-[#1A1A1A] dark:text-[#FAF6EE] tracking-tighter leading-tight">
                EVERY THREAD HAS A <span className="bg-[#DC143C] text-[#FAF6EE] px-2 py-0.5 inline-block torn-paper-strip">REASON.</span>
              </h2>
              <div 
                className="absolute -bottom-6 right-0 sm:right-24 text-3xl sm:text-5xl font-script text-[#C5A945] rotate-[-2deg] pointer-events-none font-bold drop-shadow-[0_2px_4px_rgba(250,246,238,0.9)]"
                style={{ textShadow: '1px 1px 0px #FAF6EE, -1px -1px 0px #FAF6EE' }}
              >
                no black-box guesses.
              </div>
            </div>

            <p className="mt-10 sm:mt-12 text-xs sm:text-sm font-mono-tech text-[#1A1A1A] dark:text-[#FAF6EE]/90 max-w-2xl leading-relaxed">
              Every step in the causal chain links directly to verified telemetry: exact voltages, thermal readings, and hardware commands.
            </p>
          </div>

          {/* Seamless Spinning Moon */}
          <div className="hidden sm:flex self-start lg:self-center">
            <InteractiveMoon 
              size={46} 
              initialSpinSpeed={12}
              sunAngle={310}
            />
          </div>
        </div>

        {/* Interactive Evidence Explorer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: List of 5 Causal Thread Links */}
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-mono-tech text-[#1A1A1A] dark:text-[#FAF6EE] font-bold uppercase mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#DC143C]" />
              <span>SELECT A VERIFIED CAUSAL LINK (5 TOTAL):</span>
            </div>

            {CAUSAL_EDGES.map((edge, idx) => {
              const isSelected = selectedEdgeIndex === idx;
              const fromNode = TELEMETRY_FRAGMENTS.find(f => f.id === edge.fromId);
              const toNode = TELEMETRY_FRAGMENTS.find(f => f.id === edge.toId);

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedEdgeIndex(idx)}
                  className={`p-4 border-2 cursor-pointer transition-all torn-paper-card paper-texture ${
                    isSelected
                      ? 'border-4 border-[#DC143C] shadow-[0_0_15px_rgba(201,29,55,0.4)] translate-x-2 z-10'
                      : 'border-[#1A1A1A]/30 dark:border-[#FAF6EE]/30 hover:border-[#DC143C]/60 shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono-tech mb-1">
                    <span className={`font-bold ${isSelected ? 'text-[#DC143C]' : 'text-[#C5A945]'}`}>
                      LINK #{idx + 1}: {edge.relationType}
                    </span>
                    <span className="font-mono-tech text-[10px] opacity-70">
                      +{edge.delayMs / 1000}s DELAY
                    </span>
                  </div>

                  <div className="font-headline font-bold text-base tracking-wide flex items-center gap-2">
                    <span>{fromNode?.subsystemId}</span>
                    <span className="text-[#DC143C]">➔</span>
                    <span>{toNode?.subsystemId}</span>
                  </div>

                  <p className="text-[11px] font-mono-tech mt-1 line-clamp-2 opacity-90">
                    {edge.evidenceSummary}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Right Column: Pinned Torn Index Card with Handwritten Margin Note */}
          <div className="lg:col-span-7">
            <div className="relative paper-texture p-6 sm:p-8 torn-paper-card shadow-2xl border-2 border-[#1A1A1A] rotate-[-1deg]">
              
              {/* Pushpins */}
              <div className="absolute -top-3 left-10 pin-motif z-20"></div>
              <div className="absolute -top-3 right-10 pin-gold z-20"></div>

              {/* Red String coming into the card */}
              <div className="absolute -top-10 left-12 w-1 h-10 bg-[#DC143C] shadow-[0_0_6px_#DC143C]"></div>

              {/* Card Header */}
              <div className="border-b-2 border-[#1A1A1A] pb-3 mb-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono-tech bg-[#1A1A1A] dark:bg-[#1A1A1A]/60 dark:backdrop-blur-sm dark:border dark:border-[#FAF6EE]/30 text-[#FAF6EE] px-2 py-0.5 font-bold uppercase">
                    FORENSIC EVIDENCE DOSSIER CARD
                  </span>
                  <h3 className="font-headline font-black text-2xl text-[#1A1A1A] dark:text-[#FAF6EE] mt-1">
                    RELATION #{selectedEdgeIndex + 1}: {activeEdge.relationType}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono-tech text-[#DC143C] font-bold block">
                    CONFIDENCE
                  </span>
                  <span className="font-headline font-black text-2xl text-[#DC143C]">
                    {(sourceFrag?.confidence ? (sourceFrag.confidence * 100).toFixed(1) : '99.4')}%
                  </span>
                </div>
              </div>

              {/* Subsystem Transition Grid */}
              <div className="grid grid-cols-2 gap-4 bg-[#1A1A1A] dark:bg-[#1A1A1A]/60 dark:backdrop-blur-sm dark:border dark:border-[#FAF6EE]/30 text-[#FAF6EE] p-4 border border-[#1A1A1A] mb-4">
                <div>
                  <span className="text-[10px] font-mono-tech text-[#C5A945] font-bold block">PARENT SUBSYSTEM</span>
                  <h5 className="font-headline font-bold text-base text-[#FAF6EE]">{sourceFrag?.subsystemName}</h5>
                  <code className="text-[10px] font-mono-tech text-[#DC143C] block font-bold">{sourceFrag?.alarmCode}</code>
                  <span className="text-[10px] font-mono-tech text-[#FAF6EE]/80 block mt-1">
                    Value: {sourceFrag?.rawReading}
                  </span>
                </div>

                <div className="border-l border-[#FAF6EE]/20 pl-4">
                  <span className="text-[10px] font-mono-tech text-[#C5A945] font-bold block">TRIGGERED CHILD</span>
                  <h5 className="font-headline font-bold text-base text-[#FAF6EE]">{targetFrag?.subsystemName}</h5>
                  <code className="text-[10px] font-mono-tech text-[#DC143C] block font-bold">{targetFrag?.alarmCode}</code>
                  <span className="text-[10px] font-mono-tech text-[#FAF6EE]/80 block mt-1">
                    Value: {targetFrag?.rawReading}
                  </span>
                </div>
              </div>

              {/* Verified Physical Causal Proof */}
              <div className="mb-4">
                <span className="text-xs font-mono-tech text-[#1A1A1A] dark:text-[#FAF6EE] font-bold uppercase block mb-1">
                  PHYSICAL PROPAGATION PROOF:
                </span>
                <p className="text-xs sm:text-sm font-mono-tech text-[#1A1A1A] dark:text-[#FAF6EE] bg-[#1A1A1A] dark:bg-[#1A1A1A]/60 dark:backdrop-blur-sm dark:border dark:border-[#FAF6EE]/30/5 p-3 border-l-4 border-[#DC143C] leading-relaxed font-bold">
                  {activeEdge.evidenceSummary}
                </p>
              </div>

              {/* Handwritten Investigator Annotation Note pinned in margin */}
              <div className="mt-4 p-3 border-2 border-dashed border-[#DC143C] bg-[#DC143C]/10 relative">
                <span className="absolute -top-2.5 right-4 bg-[#DC143C] text-[#FAF6EE] text-[9px] font-mono-tech px-1.5 font-bold">
                  MARGIN NOTE
                </span>
                <p className="font-script-marker text-base sm:text-lg text-[#1A1A1A] dark:text-[#FAF6EE] font-bold leading-snug">
                  "Checked hardware bus schematic: Subsystem {sourceFrag?.subsystemId} directly commands line {targetFrag?.subsystemId} via relay K2. Physical coupling confirmed without doubt."
                </p>
              </div>

              {/* Action Button to Proceed to Origin */}
              <div className="mt-6 pt-4 border-t border-[#1A1A1A]/20 dark:border-[#FAF6EE]/20 flex flex-wrap gap-3 justify-end">
                {onOpenEvidenceTrace && (
                  <button
                    onClick={onOpenEvidenceTrace}
                    className="px-5 py-2.5 text-xs flex items-center gap-2 shadow-md border-2 border-[#DC143C] bg-[#DC143C] text-[#FAF6EE] hover:bg-[#1A1A1A] dark:bg-[#1A1A1A]/60 dark:backdrop-blur-sm dark:border dark:border-[#FAF6EE]/30 font-mono-tech transition-colors font-bold cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-[#FAF6EE]" />
                    <span>05 · FULL EVIDENCE TRACE</span>
                  </button>
                )}
                {onOpenReconstruction && (
                  <button
                    onClick={onOpenReconstruction}
                    className="px-5 py-2.5 text-xs flex items-center gap-2 shadow-md border-2 border-[#DC143C] bg-[#DC143C] text-[#FAF6EE] hover:bg-[#1A1A1A] dark:bg-[#1A1A1A]/60 dark:backdrop-blur-sm dark:border dark:border-[#FAF6EE]/30 font-mono-tech transition-colors font-bold cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-[#FAF6EE]" />
                    <span>CAUSAL RECONSTRUCTION PAGE</span>
                  </button>
                )}
                {onOpenMissionLab && (
                  <button
                    onClick={onOpenMissionLab}
                    className="px-5 py-2.5 text-xs flex items-center gap-2 shadow-md border-2 border-[#1A1A1A] bg-transparent dark:bg-transparent text-[#1A1A1A] dark:text-[#FAF6EE] hover:bg-[#1A1A1A] dark:bg-[#1A1A1A]/60 dark:backdrop-blur-sm dark:border dark:border-[#FAF6EE]/30 hover:text-[#FAF6EE] font-mono-tech transition-colors font-bold cursor-pointer"
                  >
                    <Beaker className="w-4 h-4 text-[#C5A945]" />
                    <span>MISSION LAB</span>
                  </button>
                )}
                <button
                  onClick={onOpenCaelis}
                  className="px-5 py-2.5 text-xs flex items-center gap-2 shadow-md border-2 border-[#1A1A1A] bg-transparent dark:bg-transparent text-[#1A1A1A] dark:text-[#FAF6EE] hover:bg-[#1A1A1A] dark:bg-[#1A1A1A]/60 dark:backdrop-blur-sm dark:border dark:border-[#FAF6EE]/30 hover:text-[#FAF6EE] font-mono-tech transition-colors font-bold cursor-pointer"
                >
                  <Cpu className="w-4 h-4" />
                  <span>CAELIS AI MODEL</span>
                </button>
                <button
                  onClick={onProceedToOrigin}
                  className="btn-dossier-crimson px-5 py-2.5 text-xs flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <span>REVEAL THE ROOT ORIGIN</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
