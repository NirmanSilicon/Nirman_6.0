import React, { useState } from 'react';
import { TELEMETRY_FRAGMENTS, CAUSAL_EDGES, MISSION_INFO } from '../data/incidentData';
import { TelemetryFragment } from '../types';
import { Target, CheckCircle2, ChevronRight, Stamp, AlertCircle, Orbit } from 'lucide-react';
import { InteractiveMoon } from './InteractiveMoon';

interface OriginSectionProps {
  onSelectFragment: (fragment: TelemetryFragment) => void;
  onProceedToFix: () => void;
  jitterEnabled: boolean;
}

export const OriginSection: React.FC<OriginSectionProps> = ({
  onSelectFragment,
  onProceedToFix,
  jitterEnabled
}) => {
  const originNode = TELEMETRY_FRAGMENTS.find(f => f.isOrigin)!;

  return (
    <section 
      id="origin"
      className="relative py-10 sm:py-14 px-4 sm:px-6 lg:px-8 bg-transparent dark:bg-transparent border-b-2 border-[#1A1A1A]/20 dark:border-[#FAF6EE]/20 overflow-hidden"
    >
      {/* Heavy Grunge & Watermark Background */}
      <div className="absolute inset-0 bg-circuit-pattern opacity-20 pointer-events-none"></div>
      <div className="absolute inset-0 bg-halftone opacity-20 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12">
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono-tech bg-[#DC143C] text-[#FAF6EE] px-2 py-0.5 font-bold uppercase tracking-widest">
                SECTION 04 // THE VERIFIED ORIGIN
              </span>
              <span className="text-xs font-mono-tech text-[#C5A945] font-bold">
                ZERO-POINT ROOT DISCOVERY
              </span>
            </div>

            <div className="relative">
              <h2 className="text-4xl sm:text-6xl md:text-7xl font-headline font-black text-[#1A1A1A] dark:text-[#FAF6EE] tracking-tighter leading-tight">
                THE ORIGIN WAS NEVER <span className="text-[#DC143C]">THE ALARM.</span>
              </h2>
              
              {/* Hand-drawn Script Overlay */}
              <div className="absolute -bottom-6 right-0 sm:right-20 text-4xl sm:text-6xl font-script text-[#DC143C] rotate-[-8deg] pointer-events-none drop-shadow-sm">
                found.
              </div>
            </div>

            <p className="mt-4 text-xs sm:text-sm font-mono-tech text-[#1A1A1A] dark:text-[#FAF6EE]/90 max-w-2xl leading-relaxed">
              Transmitter blackout occurred 149 seconds after eclipse exit, but the root defect began 14 minutes earlier: an analog thermistor drifted unnoticed until it locked emergency heaters on.
            </p>
          </div>

          {/* Seamless Spinning Moon */}
          <div className="hidden sm:flex self-start lg:self-center">
            <InteractiveMoon 
              size={48} 
              initialSpinSpeed={8}
              sunAngle={200}
            />
          </div>
        </div>

        {/* The Fully Assembled Evidence Board */}
        <div className="relative p-6 sm:p-10 bg-transparent dark:bg-transparent border-4 border-[#1A1A1A] shadow-[0_25px_60px_rgba(26,24,21,0.25)] overflow-hidden torn-paper-card">
          
          {/* Subtle Cork & Grid Pattern inside board */}
          <div className="absolute inset-0 bg-halftone opacity-20 pointer-events-none"></div>

          {/* Board Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#1A1A1A]/20 dark:border-[#FAF6EE]/20 pb-4 mb-8">
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6 text-[#DC143C]" />
              <div>
                <span className="text-[10px] font-mono-tech text-[#C5A945] font-bold uppercase tracking-widest">
                  CASE BOARD COMPLETE // 6 OF 6 SUB-SYSTEMS CORRELATED
                </span>
                <h3 className="font-headline font-black text-2xl text-[#1A1A1A] dark:text-[#FAF6EE]">
                  ROOT CAUSE ISOLATION MATRIX
                </h3>
              </div>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-2 border-[#DC143C] text-xs font-mono-tech text-[#DC143C] font-bold bg-transparent dark:bg-transparent shadow-sm">
              <Stamp className="w-3.5 h-3.5" />
              <span>ROOT VERIFIED</span>
            </div>
          </div>

          {/* Grid Layout of the 6 Nodes with Causal Strings */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
            {TELEMETRY_FRAGMENTS.map((frag, idx) => {
              const isOrigin = frag.isOrigin;

              return (
                <div
                  key={frag.id}
                  className={`relative p-5 paper-texture torn-paper-card shadow-md transition-all ${
                    isOrigin
                      ? 'border-4 border-[#DC143C] shadow-xl z-20'
                      : 'border-2 border-[#1A1A1A]/30 dark:border-[#FAF6EE]/30 z-10'
                  }`}
                >
                  {/* Pushpin */}
                  <div className={`absolute -top-3 ${isOrigin ? 'left-6 pin-motif' : 'left-4 pin-gold'} z-20`}></div>

                  {/* If Origin: Draw Heavy Hand-Drawn Marker Circle Overlay */}
                  {isOrigin && (
                    <div className="absolute -inset-2 border-4 border-dashed border-[#DC143C] rounded-xl pointer-events-none opacity-90"></div>
                  )}

                  {/* Header Badge */}
                  <div className="flex items-center justify-between border-b border-current/20 pb-2 mb-2">
                    <span className={`text-xs font-mono-tech font-bold px-1.5 py-0.5 ${
                      isOrigin ? 'bg-[#DC143C] text-[#FAF6EE]' : 'bg-[#1A1A1A] dark:bg-[#1A1A1A]/60 dark:backdrop-blur-sm dark:border dark:border-[#FAF6EE]/30 text-[#FAF6EE]'
                    }`}>
                      {frag.subsystemId}
                    </span>
                    <span className="text-xs font-mono-tech font-bold text-[#DC143C]">
                      {frag.timestamp}
                    </span>
                  </div>

                  {/* Subsystem Name */}
                  <h4 className="font-headline font-bold text-xl leading-tight text-[#1A1A1A] dark:text-[#FAF6EE]">
                    {frag.subsystemName}
                  </h4>

                  <p className="text-xs font-mono-tech text-[#DC143C] font-bold mt-1">
                    {frag.alarmTitle}
                  </p>

                  <div className="mt-3 text-[11px] font-mono-tech p-2 bg-[#1A1A1A] dark:bg-[#1A1A1A]/60 dark:backdrop-blur-sm dark:border dark:border-[#FAF6EE]/30 text-[#FAF6EE] border border-[#1A1A1A]">
                    <code>{frag.rawReading}</code>
                  </div>

                  {/* Callout Footer */}
                  <div className="mt-3 pt-2 border-t border-current/20 flex items-center justify-between text-[11px] font-mono-tech">
                    {isOrigin ? (
                      <span className="font-headline font-black text-sm text-[#DC143C] tracking-wide">
                        ★ ROOT INITIATOR
                      </span>
                    ) : (
                      <span className="text-[#625A50] dark:text-[#94A3B8] font-bold">
                        Induced Cascade Victim
                      </span>
                    )}
                    <span className="text-[10px] text-[#625A50] dark:text-[#94A3B8] font-mono-tech">
                      {isOrigin ? 'Origin Event' : 'Downstream Failure'}
                    </span>
                  </div>

                  {/* Red String Line connector indicator */}
                  {idx < 5 && (
                    <div className="hidden lg:block absolute -bottom-5 left-1/2 -translate-x-1/2 w-1 h-6 bg-[#DC143C] z-30"></div>
                  )}
                </div>
              );
            })}
          </div>

          {/* THE RUBBER STAMP IMPACT MOMENT */}
          <div className="mt-12 flex justify-center items-center py-4 relative z-30">
            <div className="rubber-stamp bg-transparent dark:bg-transparent text-xl sm:text-3xl md:text-4xl shadow-xl py-3 px-8 sm:px-12 border-4 sm:border-8 border-[#DC143C] text-[#DC143C] select-none rotate-[-4deg]">
              ★ ROOT CAUSE FOUND ★
            </div>
          </div>

          {/* Origin Detailed Verdict Card */}
          <div className="mt-10 p-6 paper-texture torn-paper-strip border-2 border-[#1A1A1A] shadow-xl text-[#1A1A1A] dark:text-[#FAF6EE]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono-tech font-bold text-[#DC143C] uppercase tracking-wider block mb-1">
                  OFFICIAL INVESTIGATION VERDICT:
                </span>
                <p className="text-sm font-mono-tech font-bold text-[#1A1A1A] dark:text-[#FAF6EE] leading-snug">
                  The CubeSat was lost because the thermal manager trusted an out-of-range sensor reading (-64.2°C) without sanity-check fallback. 
                  All subsequent battery drain, fuse trips, and radio mutes were 100% deterministic consequences.
                </p>
              </div>

              <button
                onClick={onProceedToFix}
                className="px-6 py-3 text-xs sm:text-sm font-mono-tech font-bold uppercase tracking-wider bg-[#DC143C] text-[#FAF6EE] hover:bg-[#A8152B] transition-colors whitespace-nowrap flex items-center gap-2 self-end md:self-center shadow-md cursor-pointer"
              >
                <span>SIMULATE THE FIX</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
