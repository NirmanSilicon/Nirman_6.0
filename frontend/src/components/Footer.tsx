import React from 'react';
import { ArrowUp, Satellite, ShieldCheck, ChevronUp } from 'lucide-react';

interface FooterProps {
  onNavigateSection?: (sectionId: string) => void;
  onOpenPage?: (page: string) => void;
  onScrollToTop: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigateSection,
  onOpenPage,
  onScrollToTop
}) => {
  return (
    <footer 
      id="site-footer"
      className="w-full bg-[#1A1A1A] text-[#FAF6EE] border-t-4 border-[#DC143C] py-6 px-4 sm:px-6 lg:px-8 relative z-20"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono-tech">
        
        {/* Left: Brand / System info */}
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#DC143C] animate-pulse"></div>
          <span className="font-headline font-bold text-sm text-[#FAF6EE] tracking-wider">
            GENEALOGY TRACER
          </span>
          <span className="text-[10px] bg-[#FAF6EE]/10 border border-[#FAF6EE]/20 px-2 py-0.5 text-[#E6C687] font-bold uppercase tracking-widest">
            v2.4 ORBITAL
          </span>
        </div>

        {/* Center: Quick navigation links */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[#FAF6EE]/80">
          <a 
            href="#incident" 
            className="hover:text-[#FAF6EE] transition-colors"
          >
            Incident
          </a>
          <a 
            href="#trace" 
            className="hover:text-[#FAF6EE] transition-colors"
          >
            Trace
          </a>
          <a 
            href="#evidence" 
            className="hover:text-[#FAF6EE] transition-colors"
          >
            Evidence
          </a>
          <a 
            href="#origin" 
            className="hover:text-[#FAF6EE] transition-colors"
          >
            Origin
          </a>
          <span className="text-[#FAF6EE]/20 hidden sm:inline">|</span>
          {onOpenPage && (
            <button 
              onClick={() => onOpenPage('telemetry')}
              className="hover:text-[#FAF6EE] text-[#E6C687] font-bold transition-colors cursor-pointer"
            >
              Telemetry Analysis
            </button>
          )}
        </div>

        {/* Right: Status & Back to Top */}
        <div className="flex items-center gap-4 text-[#FAF6EE]/70">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Satellite className="w-3.5 h-3.5 text-[#E6C687]" />
            <span>LEO 510km SSO</span>
          </div>

          <button
            onClick={onScrollToTop}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF6EE]/10 hover:bg-[#FAF6EE]/20 border border-[#FAF6EE]/20 text-[#FAF6EE] transition-all rounded text-[11px] font-bold cursor-pointer group"
          >
            <span>TOP</span>
            <ChevronUp className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>

      </div>

      {/* Bottom Sub-strip */}
      <div className="max-w-7xl mx-auto mt-4 pt-3 border-t border-[#FAF6EE]/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono-tech text-[#FAF6EE]/50">
        <span>Spacecraft Telemetry Lineage & Root Cause Analysis Engine</span>
        <span>Deterministic Physical Causal Graph · Autonomous Verification</span>
      </div>
    </footer>
  );
};
