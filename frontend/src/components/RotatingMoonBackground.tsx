import React from 'react';

interface RotatingMoonBackgroundProps {
  className?: string;
  position?: 'fixed' | 'absolute';
  variant?: 'center' | 'top-right' | 'subtle';
  speed?: number; // seconds per rotation
  opacityClass?: string;
}

export const RotatingMoonBackground: React.FC<RotatingMoonBackgroundProps> = ({
  className = '',
  position = 'fixed',
  variant = 'center',
  speed = 120,
  opacityClass = 'opacity-92 sm:opacity-96 dark:opacity-100'
}) => {
  return (
    <div 
      className={`${position} inset-0 pointer-events-none select-none overflow-hidden z-0 flex items-center justify-center ${className}`}
      aria-hidden="true"
    >
      {/* Ambient background glow seamlessly matched with site warm/dark background */}
      <div className="absolute w-[420px] h-[420px] sm:w-[600px] sm:h-[600px] lg:w-[840px] lg:h-[840px] rounded-full bg-[#E5C76B]/30 dark:bg-[#E5C76B]/35 blur-3xl pointer-events-none" />
      
      {/* Orbital Alignment Rings */}
      <div 
        className="absolute w-[380px] h-[380px] sm:w-[560px] sm:h-[560px] md:w-[700px] md:h-[700px] lg:w-[840px] lg:h-[840px] rounded-full border-2 border-dashed border-[#1A1A1A]/20 dark:border-[#FAF6EE]/25 animate-[spin_220s_linear_infinite]"
      />
      <div 
        className="absolute w-[440px] h-[440px] sm:w-[640px] sm:h-[640px] md:w-[800px] md:h-[800px] lg:w-[960px] lg:h-[960px] rounded-full border border-dotted border-[#1A1A1A]/15 dark:border-[#FAF6EE]/20 animate-[spin_320s_linear_infinite_reverse]"
      />

      {/* Transparent Rotating Moon with High Visibility & Contrast */}
      <div 
        className={`relative w-[320px] h-[320px] sm:w-[460px] sm:h-[460px] md:w-[580px] md:h-[580px] lg:w-[720px] lg:h-[720px] xl:w-[800px] xl:h-[800px] ${opacityClass} transition-opacity duration-700`}
        style={{
          animation: `spin ${speed}s linear infinite`
        }}
      >
        <img 
          src="/images/moon2.png" 
          alt="Lunar Celestial Background"
          className="w-full h-full object-contain filter contrast-140 brightness-100 sepia-[0.05] dark:sepia-0 dark:brightness-105 drop-shadow-[0_0_40px_rgba(26,26,26,0.45)] drop-shadow-[0_0_75px_rgba(229,199,107,0.45)]"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/images/MOON%202.PNG';
          }}
        />
      </div>

      {/* Ephemeris Coordinate Watermark */}
      <div className="absolute font-mono-tech text-[9px] font-bold uppercase tracking-[0.3em] text-[#1A1A1A]/25 dark:text-[#FAF6EE]/30 top-1/2 -translate-y-1/2 -rotate-90 hidden lg:block pointer-events-none">
        EPHEMERIS // LUNAR GRAVITATIONAL VECTOR
      </div>
    </div>
  );
};
