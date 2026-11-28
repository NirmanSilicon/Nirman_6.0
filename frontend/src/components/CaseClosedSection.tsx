import React from 'react';
import { MISSION_INFO } from '../data/incidentData';
import { FolderCheck, Lock, Download, ExternalLink, ArrowUp, ShieldCheck } from 'lucide-react';
import { LargeOrbitingEarth } from './LargeOrbitingEarth';

interface CaseClosedSectionProps {
  onOpenDossier?: () => void;
  onOpenMissionLab?: () => void;
  onOpenIncidentReport?: () => void;
  onScrollToTop: () => void;
  jitterEnabled: boolean;
}

export const CaseClosedSection: React.FC<CaseClosedSectionProps> = ({
  onOpenDossier,
  onOpenMissionLab,
  onOpenIncidentReport,
  onScrollToTop,
  jitterEnabled
}) => {
  return (
    <section 
      id="case-closed"
      className="relative pt-12 pb-12 px-4 sm:px-6 lg:px-8 bg-transparent dark:bg-transparent border-t-4 border-[#DC143C] overflow-hidden flex flex-col justify-between items-center"
    >
      {/* Background Subtle Halftone & Grid Texture */}
      <div className="absolute inset-0 bg-circuit-pattern opacity-10 pointer-events-none"></div>
      <div className="absolute inset-0 bg-halftone opacity-10 pointer-events-none"></div>

      <div className="max-w-5xl w-full mx-auto relative z-10 text-center flex flex-col items-center">
        
        {/* 1. TOP BLOCK: DOSSIER SEAL & "CLOSE THE CASE" HEADLINE */}
        <div className="w-16 h-16 rounded-full bg-transparent dark:bg-transparent border-3 border-[#DC143C] flex items-center justify-center mb-5 shadow-xl">
          <FolderCheck className="w-8 h-8 text-[#DC143C]" />
        </div>

        <div className="relative mb-3">
          <h2 className="text-5xl sm:text-7xl md:text-8xl font-headline font-black text-[#1A1A1A] dark:text-[#FAF6EE] tracking-tighter leading-tight">
            CLOSE THE <span className="text-[#DC143C]">CASE.</span>
          </h2>
          <div className="absolute -bottom-3 sm:-bottom-4 right-2 sm:right-6 text-3xl sm:text-5xl font-script text-[#C5A945] rotate-[-6deg] pointer-events-none font-bold">
            resolved.
          </div>
        </div>

        {/* 2. SUPPORTING PARAGRAPH */}
        <p className="mt-4 text-sm sm:text-base md:text-lg font-mono-tech text-[#1A1A1A] dark:text-[#FAF6EE]/90 max-w-2xl leading-relaxed">
          Stop sifting through hundreds of concurrent warning logs. 
          Deploy <strong className="text-[#1A1A1A] dark:text-[#FAF6EE] font-bold">Genealogy Tracer</strong> to automatically isolate the physical origin of orbital anomalies in seconds.
        </p>

        {/* 3. EARTH MODEL IN BETWEEN (BIG, CRISP, AND REVOLVING WITH 24+ SATELLITES) */}
        <div className="w-full relative my-2 sm:my-4 flex items-center justify-center pointer-events-none">
          <LargeOrbitingEarth />
        </div>

        {/* 4. REST OF THE TEXT, CALL-TO-ACTION & METADATA */}
        <div className="flex flex-col items-center gap-4 mt-2">
          
          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* Big Crimson Primary CTA Button */}
            <button
              onClick={() => {
                if (onOpenMissionLab) {
                  onOpenMissionLab();
                } else if (onOpenDossier) {
                  onOpenDossier();
                }
              }}
              className="btn-dossier-crimson px-8 sm:px-10 py-4 sm:py-5 text-base sm:text-lg font-bold flex items-center gap-3 shadow-2xl group hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer z-20"
            >
              <FolderCheck className="w-5 h-5 text-[#FAF6EE]" />
              <span>LAUNCH ROOT-CAUSE TRACER</span>
            </button>

            {onOpenIncidentReport && (
              <button
                onClick={onOpenIncidentReport}
                className="px-8 sm:px-10 py-4 sm:py-5 text-base sm:text-lg font-bold flex items-center gap-3 shadow-2xl border-3 border-[#1A1A1A] bg-transparent dark:bg-transparent text-[#1A1A1A] dark:text-[#FAF6EE] hover:bg-[#1A1A1A] dark:bg-[#1A1A1A]/60 dark:backdrop-blur-sm dark:border dark:border-[#FAF6EE]/30 hover:text-[#FAF6EE] font-mono-tech transition-all cursor-pointer z-20"
              >
                <Download className="w-5 h-5 text-[#DC143C]" />
                <span>08 · INCIDENT REPORT</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </section>
  );
};

