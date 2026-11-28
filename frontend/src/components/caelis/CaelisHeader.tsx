import React from 'react';
import { Cpu, Orbit } from 'lucide-react';
import { CubeSatViewer } from '../CubeSatViewer';

interface CaelisHeaderProps {
  theme?: 'light' | 'dark';
}

export const CaelisHeader: React.FC<CaelisHeaderProps> = ({ theme }) => {
  return (
    <div className="relative mb-10 pb-8 border-b-2 border-[#1A1A1A]/20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        
        {/* Left Side: Text Content */}
        <div className="flex-1">
          {/* Top Categorization Pill and Tech Tag */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
            <span className="text-xs font-mono-tech bg-[#DC143C] text-[#FAF6EE] px-2.5 py-0.5 font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
              <Cpu className="w-3.5 h-3.5" />
              <span>TELEMETRY ANALYSIS // CAELIS AI</span>
            </span>
            <span className="text-xs font-mono-tech text-[#C5A945] font-bold tracking-wider">
              SUBSYSTEM PATTERN DETECTOR
            </span>
            <span className="text-[10px] font-mono-tech px-2 py-0.5 border border-[#1A1A1A]/30 bg-[#FAF6EE] text-[#1A1A1A]/80 font-bold">
              AI ENSEMBLE + ESP32 TINYML READY
            </span>
          </div>

          {/* Main Massive Headline */}
          <div className="relative">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-headline font-black text-[#1A1A1A] tracking-tighter leading-[0.95] mb-4">
              TELEMETRY ANALYSIS &amp; <br />
              <span className="text-[#DC143C]">ANOMALY RECOGNITION.</span>
            </h1>
          </div>

          {/* Narrative Subtitle */}
          <div className="mt-6">
            <p className="text-sm sm:text-base font-mono-tech text-[#1A1A1A]/85 max-w-3xl leading-relaxed">
              High-frequency raw satellite telemetry and edge microcontroller data are continuously monitored across rolling temporal windows. 
              The AI ensemble flags statistical and physical anomalies as <strong className="text-[#DC143C]">Candidate Events</strong> with real-time SHAP attributions and discrete physics residual checks.
            </p>
          </div>
        </div>

        {/* Right Side: 3D CubeSat Model */}
        <div className="w-full md:w-[350px] lg:w-[450px] h-[300px] shrink-0 relative">
          <CubeSatViewer theme={theme} />
        </div>
      </div>
    </div>
  );
};


