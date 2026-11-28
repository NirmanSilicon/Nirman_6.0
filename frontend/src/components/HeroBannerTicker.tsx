import React from 'react';

interface HeroBannerTickerProps {
  variant?: 'crimson' | 'charcoal';
  text?: string;
}

export const HeroBannerTicker: React.FC<HeroBannerTickerProps> = ({
  variant = 'crimson',
  text = "INCIDENT T+00:00 · CAUSE UNKNOWN · TRACE IN PROGRESS · ANOMALY: CUBESAT POWER BUS COLLAPSE · 6 UNRESOLVED ALARMS · CAUSAL TOPOLOGY ACTIVE · RECONSTRUCTING TIMELINE · SENSOR SANITY MISMATCH · "
}) => {
  const isCrimson = variant === 'crimson';

  return (
    <div className="relative w-full overflow-hidden my-1 select-none z-20">
      {/* Torn Banner Container */}
      <div 
        className={`w-full py-2.5 px-4 torn-edge-t-b relative border-y ${
          isCrimson 
            ? 'bg-[#DC143C] text-[#FAF6EE] border-[#FAF6EE]/30 shadow-md' 
            : 'bg-[#1A1A1A] text-[#C5A945] border-[#DC143C]/40 shadow-md'
        }`}
      >
        {/* Subtle Scanlines & Halftone Texture inside banner */}
        <div className="absolute inset-0 bg-halftone opacity-20 pointer-events-none"></div>
        <div className="absolute inset-0 scanlines opacity-20 pointer-events-none"></div>

        {/* Stepped Jitter Ticker Content */}
        <div className="flex whitespace-nowrap animate-ticker-steps w-max">
          <div className="flex items-center space-x-6 text-[11px] sm:text-xs font-mono-tech uppercase font-bold tracking-widest">
            <span>⚠ {text}</span>
            <span className="text-[#FAF6EE]/80">★ REF #GT-8849</span>
            <span>⚠ {text}</span>
            <span className="text-[#FAF6EE]/80">★ REF #GT-8849</span>
          </div>
          <div className="flex items-center space-x-6 text-[11px] sm:text-xs font-mono-tech uppercase font-bold tracking-widest pl-6">
            <span>⚠ {text}</span>
            <span className="text-[#FAF6EE]/80">★ REF #GT-8849</span>
            <span>⚠ {text}</span>
            <span className="text-[#FAF6EE]/80">★ REF #GT-8849</span>
          </div>
        </div>
      </div>
    </div>
  );
};
