import React, { useState } from 'react';
import { TELEMETRY_FRAGMENTS, CAUSAL_EDGES } from '../data/incidentData';
import { TelemetryFragment } from '../types';
import { GitCommit, ArrowDown, Play, RotateCcw, CheckCircle2, ChevronRight, Beaker } from 'lucide-react';

interface TraceSectionProps {
  onSelectFragment: (fragment: TelemetryFragment) => void;
  onProceedToEvidence: () => void;
  onOpenMissionLab?: () => void;
  jitterEnabled: boolean;
}

export const TraceSection: React.FC<TraceSectionProps> = ({
  onSelectFragment,
  onProceedToEvidence,
  onOpenMissionLab,
  jitterEnabled
}) => {
  const [activeStep, setActiveStep] = useState<number>(6); // 1 to 6
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Methodology steps explanation
  const methodologySteps = [
    {
      num: "01",
      title: "INGEST LOGS",
      desc: "Parse raw telemetry into timestamped state transitions across all onboard subsystems."
    },
    {
      num: "02",
      title: "MAP HARDWARE",
      desc: "Cross-reference alarms against the satellite's power, thermal, and communication circuits."
    },
    {
      num: "03",
      title: "FILTER NOISE",
      desc: "Discard coincidental alarms that do not match real physical propagation delays."
    },
    {
      num: "04",
      title: "LOCK ROOT CAUSE",
      desc: "Establish the verifiable step-by-step causal chain from origin to final failure."
    }
  ];

  return (
    <section 
      id="trace"
      className="relative py-10 sm:py-14 px-4 sm:px-6 lg:px-8 bg-transparent dark:bg-transparent border-b-2 border-[#1A1A1A]/20 dark:border-[#FAF6EE]/20 overflow-hidden"
    >
      {/* Background Circuit & Halftone Texture */}
      <div className="absolute inset-0 bg-circuit-pattern opacity-25 pointer-events-none"></div>
      <div className="absolute inset-0 bg-halftone opacity-20 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col items-start mb-12">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono-tech bg-[#DC143C] text-[#FAF6EE] px-2 py-0.5 font-bold uppercase tracking-widest">
              SECTION 02 // CAUSAL LINEAGE RECONSTRUCTION
            </span>
            <span className="text-xs font-mono-tech text-[#C5A945] font-bold">
              GRAPH TOPOLOGY ENGINE
            </span>
          </div>

          <div className="relative">
            <h2 className="text-4xl sm:text-6xl md:text-7xl font-headline font-black text-[#1A1A1A] dark:text-[#FAF6EE] tracking-tighter leading-tight">
              FOLLOW THE STRING <span className="text-[#DC143C]">BACK.</span>
            </h2>
            <div className="absolute -bottom-5 right-4 text-3xl sm:text-5xl font-script text-[#C5A945] rotate-[-3deg] pointer-events-none">
              link by link.
            </div>
          </div>

          <p className="mt-4 text-xs sm:text-sm font-mono-tech text-[#1A1A1A] dark:text-[#FAF6EE]/90 max-w-2xl leading-relaxed">
            By mapping flight telemetry onto hardware circuits and physics constraints, the system untangles concurrent warnings into a single chronological chain.
          </p>
        </div>

        {/* Methodology Strip (4 Steps) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {methodologySteps.map((step, idx) => (
            <div 
              key={idx} 
              className="p-4 bg-transparent dark:bg-transparent border-2 border-[#1A1A1A]/20 dark:border-[#FAF6EE]/20 shadow-md relative hover:border-[#DC143C] transition-colors torn-paper-card"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-headline font-black text-[#DC143C]">{step.num}</span>
                <GitCommit className="w-4 h-4 text-[#C5A945]" />
              </div>
              <h4 className="font-headline font-bold text-sm text-[#1A1A1A] dark:text-[#FAF6EE] tracking-wide mb-1">{step.title}</h4>
              <p className="text-[11px] font-mono-tech text-[#625A50] dark:text-[#94A3B8] leading-normal">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Central Graphic: Ordered Causal String Sequence Board */}
        <div className="p-6 sm:p-8 paper-texture torn-paper-card shadow-2xl border-2 border-[#1A1A1A]/30 dark:border-[#FAF6EE]/30 relative">
          
          {/* Corkboard Top Header & Playback Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#1A1A1A] pb-4 mb-8">
            <div>
              <span className="text-xs font-mono-tech font-bold bg-[#DC143C] text-[#FAF6EE] px-2 py-0.5 uppercase">
                EXHIBIT B: TOPOLOGICAL SEQUENCE BOARD
              </span>
              <h3 className="font-headline font-black text-2xl text-[#1A1A1A] dark:text-[#FAF6EE] mt-1">
                TOP-TO-BOTTOM PROPAGATION LINE
              </h3>
            </div>

            {/* Interactive Step Slider / Controls */}
            <div className="flex items-center gap-2 bg-[#1A1A1A] dark:bg-[#1A1A1A]/60 dark:backdrop-blur-sm dark:border dark:border-[#FAF6EE]/30 p-2 text-[#FAF6EE] font-mono-tech text-xs rounded-sm shadow-md">
              <span className="text-[11px] text-[#C5A945] px-2 font-bold">PROPAGATION DEPTH:</span>
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  onClick={() => setActiveStep(num)}
                  className={`w-7 h-7 flex items-center justify-center font-bold text-xs transition-colors ${
                    activeStep >= num
                      ? 'bg-[#DC143C] text-[#FAF6EE]'
                      : 'bg-[#272420] text-[#FAF6EE]/40 hover:bg-[#3A3A3A]'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Connected Causal Vertical Pipeline */}
          <div className="relative py-4 space-y-8 max-w-4xl mx-auto">
            
            {/* The Crimson String Path connecting nodes */}
            <div className="absolute left-6 sm:left-1/2 top-4 bottom-4 w-1.5 bg-[#DC143C] -translate-x-1/2 shadow-[0_0_10px_rgba(201,29,55,0.4)] z-0"></div>

            {TELEMETRY_FRAGMENTS.slice(0, activeStep).map((frag, idx) => {
              const edge = CAUSAL_EDGES.find(e => e.toId === frag.id);
              const isEven = idx % 2 === 0;

              return (
                <div 
                  key={frag.id} 
                  className={`relative flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 sm:gap-0 z-10 ${
                    isEven ? 'sm:flex-row-reverse' : ''
                  }`}
                >
                  
                  {/* Left / Right Content Card */}
                  <div className="w-full sm:w-[calc(50%-2rem)] min-w-0 pl-14 sm:pl-0">
                    <div 
                      className={`p-4 paper-texture torn-paper-card shadow-xl transition-all ${
                        frag.isOrigin 
                          ? 'border-4 border-[#DC143C] shadow-[0_0_15px_rgba(201,29,55,0.4)] z-20' 
                          : 'border-2 border-[#1A1A1A]/30 dark:border-[#FAF6EE]/30 z-10'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-current/20 pb-1.5 mb-2">
                        <span className="font-mono-tech text-xs text-[#C5A945] font-bold">
                          STEP {idx + 1} // {frag.subsystemId}
                        </span>
                        <span className="text-[10px] font-mono-tech bg-[#DC143C] text-[#FAF6EE] px-1.5 py-0.5 font-bold">
                          {frag.timestamp}
                        </span>
                      </div>

                      <h4 className="font-headline font-bold text-lg text-[#1A1A1A] dark:text-[#FAF6EE]">
                        {frag.subsystemName}
                      </h4>
                      <p className="text-xs font-mono-tech text-[#DC143C] font-bold mt-0.5">
                        {frag.alarmTitle}
                      </p>

                      <div className="mt-2 text-[11px] font-mono-tech p-2 bg-[#1A1A1A] dark:bg-[#1A1A1A]/60 dark:backdrop-blur-sm dark:border dark:border-[#FAF6EE]/30 text-[#FAF6EE] border border-[#1A1A1A]">
                        {frag.evidenceNote}
                      </div>

                      {frag.isOrigin && (
                        <div className="mt-2 text-[10px] font-mono-tech text-[#DC143C] font-bold flex items-center gap-1">
                          ★ IDENTIFIED AS ROOT PROPAGATION SOURCE
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Central Node Pin Anchor */}
                  <div className="absolute top-1/2 left-6 sm:left-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center z-20">
                    <div className="w-8 h-8 rounded-full bg-transparent dark:bg-transparent border-2 border-[#DC143C] flex items-center justify-center shadow-lg">
                      <div className="pin-motif"></div>
                    </div>
                  </div>

                  {/* Opposite Side: Causal Link Delay & Relation Proof */}
                  <div className={`hidden sm:block w-[calc(50%-2rem)] min-w-0 ${isEven ? 'text-right' : 'text-left'}`}>
                    {edge && (
                      <div className="p-3 paper-texture border-2 border-[#1A1A1A]/30 dark:border-[#FAF6EE]/30 inline-block text-left text-xs font-mono-tech shadow-md torn-paper-card max-w-full">
                        <div className="text-[10px] text-[#DC143C] font-bold uppercase">
                          Causal Propagation (+{edge.delayMs / 1000}s)
                        </div>
                        <div className="text-[11px] font-bold mt-0.5">
                          {edge.evidenceSummary}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}

          </div>

          {/* Section Footer Banner */}
          <div className="mt-8 pt-4 border-t-2 border-[#1A1A1A] flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="font-script-marker text-lg text-[#1A1A1A] dark:text-[#FAF6EE] font-bold">
              "The sequence is irreversible. Every step was forced by the one before it."
            </span>

            <div className="flex flex-wrap items-center gap-3">
              {onOpenMissionLab && (
                <button
                  onClick={onOpenMissionLab}
                  className="px-4 py-2.5 text-xs flex items-center gap-2 shadow-md border-2 border-[#1A1A1A] bg-transparent dark:bg-transparent text-[#1A1A1A] dark:text-[#FAF6EE] hover:bg-[#1A1A1A] dark:bg-[#1A1A1A]/60 dark:backdrop-blur-sm dark:border dark:border-[#FAF6EE]/30 hover:text-[#FAF6EE] font-mono-tech transition-colors font-bold cursor-pointer"
                >
                  <Beaker className="w-4 h-4 text-[#C5A945]" />
                  <span>OPEN MISSION LAB</span>
                </button>
              )}
              <button
                onClick={onProceedToEvidence}
                className="px-5 py-2.5 text-xs font-mono-tech font-bold uppercase tracking-wider bg-[#DC143C] text-[#FAF6EE] hover:bg-[#A8152B] transition-colors flex items-center gap-2 shadow-md cursor-pointer"
              >
                <span>INSPECT EVIDENCE CARDS</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
