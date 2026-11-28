import React, { useState } from 'react';
import { MISSION_INFO, TELEMETRY_FRAGMENTS } from '../data/incidentData';
import { ArrowDown, AlertTriangle, Cpu, Radio, ShieldAlert, Zap, Compass, Satellite, Beaker } from 'lucide-react';
import { InteractiveMoon } from './InteractiveMoon';

interface HeroSectionProps {
  onScrollToIncident: () => void;
  onOpenDossier: () => void;
  onOpenMissionLab?: () => void;
  jitterEnabled: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onScrollToIncident,
  onOpenDossier,
  onOpenMissionLab,
  jitterEnabled
}) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  return (
    <section 
      id="hero"
      className="relative min-h-[80vh] flex flex-col justify-between pt-4 pb-10 sm:pb-12 px-4 sm:px-6 lg:px-8 bg-transparent dark:bg-transparent overflow-hidden"
    >
      {/* Background Circuit Watermark & Grain on Warm Beige */}
      <div className="absolute inset-0 bg-circuit-pattern opacity-30 pointer-events-none"></div>
      <div className="absolute inset-0 bg-halftone opacity-25 pointer-events-none"></div>

      {/* Main Grid: Distressed Headlines & Central Halftone Graphic */}
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto py-8 z-10">
        
        {/* Left Column: Massive Distressed Headline Stack & Subtitle */}
        <div className="lg:col-span-7 flex flex-col items-start relative">
          
          {/* Top mono case notation */}
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 bg-[#DC143C] rotate-45 inline-block"></span>
            <span className="text-xs font-mono-tech text-[#C5A945] font-bold tracking-widest uppercase">
              EXHIBIT A // INCIDENT CAUSAL RECONSTRUCTION
            </span>
          </div>

          {/* Distressed Headline Block */}
          <div className={`relative select-none ${jitterEnabled ? 'animate-micro-jitter' : ''}`}>
            
            {/* Stacked Line 1: SIX ALARMS. */}
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-headline font-black tracking-tighter text-[#1A1A1A] dark:text-[#FAF6EE] leading-[0.88] drop-shadow-sm">
              SIX ALARMS.
            </h1>

            {/* Stacked Line 2: ONE ORIGIN. (Offset for collage cut-out feel) */}
            <div className="relative mt-2 sm:mt-3 ml-2 sm:ml-4">
              <h2 className="text-5xl sm:text-7xl md:text-8xl font-headline font-black tracking-tighter text-[#FAF6EE] leading-[0.88] bg-[#1A1A1A] dark:bg-[#1A1A1A]/60 dark:backdrop-blur-sm dark:border dark:border-[#FAF6EE]/30 px-3 py-1 inline-block border-l-4 border-[#DC143C] shadow-xl">
                ONE ORIGIN.
              </h2>
            </div>

            {/* Hand-drawn Script Element: "traced." scrawled diagonally across */}
            <div 
              className="absolute -top-3 right-4 sm:right-12 sm:top-2 md:top-4 text-5xl sm:text-7xl md:text-8xl font-script text-[#DC143C] rotate-[-12deg] pointer-events-none drop-shadow-[0_4px_8px_rgba(201,29,55,0.3)] z-20"
              style={{ textShadow: '2px 2px 0px #FAF6EE, -2px -2px 0px #FAF6EE' }}
            >
              traced.
            </div>
          </div>

          {/* Monospace Subtitle & Mission Explanation */}
          <p className="mt-6 text-sm sm:text-base font-mono-tech text-[#1A1A1A] dark:text-[#FAF6EE] max-w-xl leading-relaxed bg-[#FAF6EE] dark:bg-transparent/90 p-4 border-l-4 border-[#C5A945] shadow-md torn-paper-card">
            When spacecraft systems fail in rapid succession, alarms look identical.
            <strong className="text-[#DC143C] font-bold"> Genealogy Tracer</strong> maps physical dependencies to isolate the single root cause and prove counterfactual prevention.
          </p>

          {/* Quick CTAs / Action Buttons */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              onClick={onOpenDossier}
              className="px-5 py-3 text-xs sm:text-sm font-mono-tech uppercase tracking-wider text-[#1A1A1A] dark:text-[#FAF6EE] bg-[#FAF6EE] dark:bg-transparent border-2 border-[#1A1A1A]/30 dark:border-[#FAF6EE]/30 dark:border-[#FAF6EE]/30 hover:border-[#1A1A1A] hover:bg-[#FAF6EE] dark:bg-transparent/80 shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>CASE DOSSIER</span>
              <span className="text-[#C5A945] font-bold">#GT-8849</span>
            </button>
            {onOpenMissionLab && (
              <button
                onClick={onOpenMissionLab}
                className="btn-dossier-crimson px-5 py-3 text-xs sm:text-sm font-mono-tech flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Beaker className="w-4 h-4" />
                <span>MISSION LAB</span>
              </button>
            )}
          </div>

          {/* Small Telemetry Status Pill */}
          <div className="mt-5 flex items-center gap-3 text-[11px] font-mono-tech text-[#625A50] dark:text-[#94A3B8] dark:text-[#94A3B8] font-bold">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#DC143C] animate-ping"></span>
            <span>TIMELINE: 6 EVENTS · 5 CAUSAL LINKS IDENTIFIED</span>
          </div>

        </div>

        {/* Right Column: Central Graphic (Halftone Diagram Fragment with Red String Teaser) */}
        <div className="lg:col-span-5 relative flex justify-center items-center py-6">
          
          {/* Physical Dossier Paper Backing Card */}
          <div className={`relative w-full max-w-md paper-texture p-5 sm:p-6 torn-paper-card shadow-[0_20px_50px_rgba(26,24,21,0.25)] rotate-[-1.5deg] border-2 border-[#1A1A1A]/20 dark:border-[#FAF6EE]/20 dark:border-[#FAF6EE]/20 transition-transform ${
            jitterEnabled ? 'hover:rotate-0' : ''
          }`}>
            
            {/* Push Pin Motif at Top Corner */}
            <div className="absolute -top-3 left-6 pin-motif z-30"></div>
            <div className="absolute -top-3 right-6 pin-gold z-30"></div>

            {/* Evidence Tag Header */}
            <div className="flex items-center justify-between border-b-2 border-[#1A1A1A] pb-2 mb-3">
              <div className="flex items-center gap-1.5">
                <span className="font-headline font-black text-sm text-[#1A1A1A] dark:text-[#FAF6EE] tracking-wider">
                  FIG 01. CUBESAT SUBSYSTEM TOPOLOGY
                </span>
              </div>
              <span className="text-[10px] font-mono-tech bg-[#DC143C] text-[#FAF6EE] px-1.5 py-0.5 font-bold uppercase">
                EXHIBIT #1
              </span>
            </div>

            {/* Halftone Processed Diagram Canvas */}
            <div className="relative bg-[#1A1A1A] dark:bg-[#1A1A1A]/60 dark:backdrop-blur-sm dark:border dark:border-[#FAF6EE]/30 p-4 border border-[#1A1A1A] text-[#FAF6EE] overflow-hidden">
              
              {/* Halftone & Scanline Overlays */}
              <div className="absolute inset-0 bg-halftone opacity-40 pointer-events-none"></div>
              <div className="absolute inset-0 bg-circuit-pattern opacity-20 pointer-events-none"></div>

              {/* Subsystem Interactive Nodes */}
              <div className="relative z-10 space-y-3 text-xs font-mono-tech">
                
                {/* Node 1: Origin */}
                <div 
                  onMouseEnter={() => setHoveredNode('frag-1')}
                  onMouseLeave={() => setHoveredNode(null)}
                  className="p-2.5 bg-[#DC143C]/20 border-2 border-[#DC143C] flex items-center justify-between cursor-pointer hover:bg-[#DC143C]/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#DC143C]">P1-THM</span>
                    <span className="text-xs font-headline tracking-wide">THERMAL SENSOR</span>
                  </div>
                  <span className="text-[10px] bg-[#DC143C] text-[#FAF6EE] px-1 font-bold">ORIGIN (T-00:14:02)</span>
                </div>

                {/* SVG Red String Connecting Node 1 to Node 2 */}
                <div className="relative h-6 flex items-center justify-center">
                  <div className="absolute inset-x-12 h-0.5 bg-[#DC143C] shadow-[0_0_8px_#DC143C]"></div>
                  <div className="w-2 h-2 rounded-full bg-[#DC143C] border border-[#FAF6EE] z-10"></div>
                  <span className="absolute right-4 text-[9px] text-[#C5A945] font-mono-tech italic font-bold">
                    false demand +42s
                  </span>
                </div>

                {/* Node 2: Heater Lock */}
                <div 
                  onMouseEnter={() => setHoveredNode('frag-2')}
                  onMouseLeave={() => setHoveredNode(null)}
                  className="p-2.5 bg-[#272420] border border-[#FAF6EE]/30 flex items-center justify-between cursor-pointer hover:border-[#DC143C]"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#C5A945]">E2-HTR</span>
                    <span className="text-xs font-headline tracking-wide">THERMAL HEATER</span>
                  </div>
                  <span className="text-[10px] text-[#DC143C]">100% SATURATION</span>
                </div>

                {/* Downward String Teaser to subsequent alarms */}
                <div className="relative h-6 flex items-center justify-center">
                  <div className="h-full w-0.5 bg-dashed border-l border-dashed border-[#DC143C]/80"></div>
                  <span className="absolute left-8 text-[9px] text-[#FAF6EE]/60 font-mono-tech">
                    [cascade continues → 4 more alarms]
                  </span>
                </div>

                {/* Downstream collapsed summary */}
                <div className="p-2 bg-[#1A1A1A] dark:bg-[#1A1A1A]/60 dark:backdrop-blur-sm dark:border dark:border-[#FAF6EE]/30 border border-dashed border-[#FAF6EE]/20 flex items-center justify-between text-[#FAF6EE]/60 text-[10px]">
                  <span>BATTERY → FUSE → 5V BUS → COMM</span>
                  <span className="text-[#DC143C] font-bold">TOTAL SILENCE</span>
                </div>

              </div>

              {/* Hand-drawn Marginal Annotation Note */}
              <div className="mt-3 pt-2 border-t border-[#FAF6EE]/15 flex items-center justify-between text-[10px] font-mono-tech text-[#C5A945]">
                <span>ANNOTATION: T+149s LOS</span>
                <span className="font-script text-sm text-[#DC143C] rotate-[-2deg]">verified.</span>
              </div>
            </div>

            {/* Handwritten note at bottom edge of evidence card */}
            <div className="mt-2 text-right">
              <span className="font-script-marker text-xs text-[#1A1A1A] dark:text-[#FAF6EE] font-bold">
                "Initial ground logs blamed RF comms. They were looking 5 steps too late."
              </span>
            </div>

          </div>

          {/* Floating Stamp Accent */}
          <div className="absolute -bottom-4 -right-2 sm:right-2 rubber-stamp rotate-[8deg] bg-[#FAF6EE] dark:bg-transparent text-[11px] sm:text-xs z-30 shadow-lg pointer-events-none">
            DOSSIER VERIFIED
          </div>

        </div>

      </div>

      {/* Scroll Down Indicator */}
      <div className="text-center mt-2 z-10">
        <button
          onClick={onScrollToIncident}
          className="inline-flex flex-col items-center gap-1 text-[11px] font-mono-tech text-[#1A1A1A] dark:text-[#FAF6EE]/70 hover:text-[#DC143C] transition-colors font-bold"
        >
          <span>SCROLL TO UNPACK THE CASE</span>
          <ArrowDown className="w-3.5 h-3.5 animate-bounce text-[#DC143C]" />
        </button>
      </div>

    </section>
  );
};
