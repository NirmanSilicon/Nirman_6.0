import React, { useState } from 'react';
import { TELEMETRY_FRAGMENTS, MISSION_INFO } from '../data/incidentData';
import { TelemetryFragment } from '../types';
import { AlertOctagon, HelpCircle, Shuffle, ChevronRight, Eye, Orbit } from 'lucide-react';
import { InteractiveMoon } from './InteractiveMoon';

interface IncidentSectionProps {
  onSelectFragment?: (fragment: TelemetryFragment) => void;
  onProceedToTrace: () => void;
  jitterEnabled: boolean;
}

export const IncidentSection: React.FC<IncidentSectionProps> = ({
  onProceedToTrace,
  jitterEnabled
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'voltage'>('all');

  return (
    <section 
      id="incident"
      className="relative py-10 sm:py-14 px-4 sm:px-6 lg:px-8 bg-transparent dark:bg-transparent border-t-2 border-b-2 border-[#1A1A1A]/20 dark:border-[#FAF6EE]/20 dark:border-[#FAF6EE]/20 overflow-hidden"
    >
      {/* Background Grunge Texture */}
      <div className="absolute inset-0 bg-circuit-pattern opacity-15 pointer-events-none"></div>
      <div className="absolute inset-0 bg-halftone opacity-25 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section Header with Integrated Orbital Occultation Moon Widget */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12 border-b-2 border-[#1A1A1A]/15 dark:border-[#FAF6EE]/15 dark:border-[#FAF6EE]/15 pb-8">
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono-tech bg-[#DC143C] text-[#FAF6EE] px-2 py-0.5 font-bold uppercase tracking-widest">
                SECTION 01 // RAW LOG DUMP
              </span>
            </div>

            {/* Distressed Headline */}
            <div className="relative">
              <h2 className="text-4xl sm:text-6xl md:text-7xl font-headline font-black text-[#1A1A1A] dark:text-[#FAF6EE] dark:text-[#FAF6EE] tracking-tighter leading-tight">
                SIX FAILURES. <span className="bg-[#DC143C] text-[#FAF6EE] px-2 py-0.5 inline-block torn-paper-strip">UNDIFFERENTIATED.</span>
              </h2>
            </div>

            {/* Descriptive Mission Context */}
            <p className="mt-4 text-xs sm:text-sm font-mono-tech text-[#1A1A1A] dark:text-[#FAF6EE] dark:text-[#FAF6EE]/90 max-w-2xl leading-relaxed">
              At T+0149s, ground stations received 6 concurrent critical alarms. Without causal tracing, operators could not identify which subsystem triggered the collapse.
            </p>
          </div>

          {/* Seamless Spinning Moon */}
          <div className="flex-shrink-0 self-start lg:self-center">
            <InteractiveMoon 
              size={52} 
              initialSpinSpeed={10}
              sunAngle={110}
            />
          </div>
        </div>

        {/* The Chaotic Pile: 6 Scattered/Overlapping Torn Telemetry Printout Strips */}
        <div className="relative mt-8 p-6 sm:p-8 bg-transparent dark:bg-transparent border-3 border-dashed border-[#1A1A1A]/30 dark:border-[#FAF6EE]/30 dark:border-[#FAF6EE]/30 rounded-none shadow-2xl overflow-hidden min-h-[520px]">
          
          {/* Label on Corkboard */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#1A1A1A]/20 dark:border-[#FAF6EE]/20 dark:border-[#FAF6EE]/20 pb-4 mb-6">
            <div className="flex items-center gap-2 text-xs font-mono-tech text-[#1A1A1A] dark:text-[#FAF6EE] dark:text-[#FAF6EE] font-bold">
              <AlertOctagon className="w-4 h-4 text-[#DC143C]" />
              <span>RAW TELEMETRY TELETYPE PRINTOUTS (UNORDERED ARRIVAL STREAM)</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono-tech text-[#C5A945] font-bold">CLICK ANY STRIP TO INSPECT EVIDENCE</span>
            </div>
          </div>

          {/* Scattered Layout Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
            {TELEMETRY_FRAGMENTS.map((frag) => {
              return (
                <div
                  key={frag.id}
                  className="relative paper-texture p-4 sm:p-5 torn-paper-card shadow-xl border border-[#1A1A1A]/20 dark:border-[#FAF6EE]/20 dark:border-[#FAF6EE]/20 hover:border-[#1A1A1A]/40 dark:border-[#FAF6EE]/40 dark:border-[#FAF6EE]/40"
                >
                  {/* Push Pin Top Center */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 pin-motif z-10"></div>

                  {/* Strip Header with Alarm Code */}
                  <div className="flex items-center justify-between border-b border-[#1A1A1A]/30 dark:border-[#FAF6EE]/30 dark:border-[#FAF6EE]/30 pb-2 mb-2">
                    <span className="font-mono-tech font-bold text-xs bg-[#1A1A1A] dark:bg-[#1A1A1A]/60 dark:backdrop-blur-sm dark:border dark:border-[#FAF6EE]/30 text-[#FAF6EE] px-1.5 py-0.5">
                      {frag.subsystemId}
                    </span>
                    <span className="font-mono-tech text-[10px] text-[#DC143C] font-bold">
                      {frag.timestamp}
                    </span>
                  </div>

                  {/* Subsystem Name in Distressed Oswald Style */}
                  <h4 className="font-headline font-bold text-lg text-[#1A1A1A] dark:text-[#FAF6EE] dark:text-[#FAF6EE] leading-tight">
                    {frag.subsystemName}
                  </h4>

                  {/* Alarm Title */}
                  <p className="text-xs font-mono-tech text-[#DC143C] font-bold mt-1">
                    {frag.alarmTitle}
                  </p>

                  {/* Raw Monospace Telemetry Line */}
                  <div className="mt-3 p-2 bg-[#1A1A1A] dark:bg-[#1A1A1A]/60 dark:backdrop-blur-sm dark:border dark:border-[#FAF6EE]/30 text-[#FAF6EE] font-mono-tech text-[10px] leading-tight overflow-x-auto border border-[#1A1A1A]/50 dark:border-[#FAF6EE]/50">
                    <code>{frag.telemetryLine}</code>
                  </div>

                  {/* Reading vs Nominal */}
                  <div className="mt-2 text-[10px] font-mono-tech text-[#1A1A1A] dark:text-[#FAF6EE] dark:text-[#FAF6EE]/80 flex justify-between border-t border-[#1A1A1A]/20 dark:border-[#FAF6EE]/20 dark:border-[#FAF6EE]/20 pt-1.5">
                    <span>RAW: <strong>{frag.rawReading}</strong></span>
                    <span className="text-[#DC143C] font-bold">ALARM ACTIVE</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hand-scrawled investigator note pinned across the bottom */}
          <div className="mt-8 p-4 bg-[#1A1A1A] dark:bg-[#1A1A1A]/60 dark:backdrop-blur-sm dark:border dark:border-[#FAF6EE]/30 border-l-4 border-[#DC143C] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div>
              <span className="text-xs font-mono-tech text-[#C5A945] font-bold block mb-1">
                INVESTIGATOR CASE NOTE:
              </span>
              <p className="text-xs font-typewriter text-[#FAF6EE]/90 italic">
                "Ground controllers initially assumed the RF Transponder burned out. But why did the 5V bus dip? Why did the fuse blow? We have to trace upstream."
              </p>
            </div>
            
            <button
              onClick={onProceedToTrace}
              className="px-5 py-2.5 text-xs font-mono-tech font-bold uppercase tracking-wider bg-[#DC143C] text-[#FAF6EE] hover:bg-[#A8152B] transition-colors whitespace-nowrap flex items-center gap-2 self-end sm:self-center cursor-pointer shadow-md"
            >
              <span>TRACE THE CAUSAL LINEAGE</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
    </section>
  );
};
