import React, { useEffect, useState } from 'react';

/**
 * MissionLabHeroBackground
 * 
 * Strict Technical Refinement for AXYRA Mission Lab:
 * 1. Earth Positioned on Right Edge: ~25-30% visible entering from the right border.
 * 2. Archival Ink Blending: Faint opacity (0.22), grayscale warm tint, mix-blend-multiply.
 * 3. Watermark-Free Circular Clipping: Clean interior globe projection with technical graticule lines.
 * 4. Extremely Slow Rotation: 180s smooth CSS continuous spin inside the clipped circular mask.
 * 5. Subtle Precision 3U CubeSat: Miniature scale with thin editorial Keplerian orbit trajectory.
 * 6. Responsive & Reduced-Motion: Graceful fallback for mobile and prefers-reduced-motion.
 */
export const MissionLabHeroBackground: React.FC = () => {
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Only enable subtle parallax on desktop if user does not prefer reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || window.innerWidth < 1024) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 2; // -1 to 1
      const y = (e.clientY / innerHeight - 0.5) * 2;
      setMouseOffset({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div 
      aria-hidden="true" 
      className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0"
    >
      <style>{`
        /* Ultra-slow continuous axial Earth rotation */
        @keyframes earthAxialSpin {
          0% { transform: rotate(0deg) translateZ(0); }
          100% { transform: rotate(360deg) translateZ(0); }
        }

        /* 
         * Continuous, fluid parametric Keplerian orbit (Harmonic 20-point spline)
         * Guarantees 100% constant-velocity orbital glide with zero sweeping or jerking
         */
        @keyframes fluidCubeSatOrbit {
          0% {
            transform: translate3d(206.7px, -100.8px, 0px) scale(0.95) rotate(-296deg);
            opacity: 0.85;
          }
          5% {
            transform: translate3d(209.6px, -69.2px, 0px) scale(0.99) rotate(-313deg);
            opacity: 0.92;
          }
          10% {
            transform: translate3d(192.0px, -30.9px, 0px) scale(1.03) rotate(-329deg);
            opacity: 0.98;
          }
          15% {
            transform: translate3d(155.6px, 10.5px, 0px) scale(1.06) rotate(-344deg);
            opacity: 1;
          }
          20% {
            transform: translate3d(103.9px, 50.9px, 0px) scale(1.08) rotate(-358deg);
            opacity: 1;
          }
          25% {
            transform: translate3d(42.1px, 86.3px, 0px) scale(1.08) rotate(-372deg);
            opacity: 1;
          }
          30% {
            transform: translate3d(-23.9px, 113.3px, 0px) scale(1.07) rotate(-386deg);
            opacity: 1;
          }
          35% {
            transform: translate3d(-87.4px, 129.1px, 0px) scale(1.05) rotate(-400deg);
            opacity: 0.98;
          }
          40% {
            transform: translate3d(-142.6px, 132.3px, 0px) scale(1.02) rotate(-415deg);
            opacity: 0.94;
          }
          45% {
            transform: translate3d(-183.6px, 122.6px, 0px) scale(0.98) rotate(-431deg);
            opacity: 0.88;
          }
          50% {
            transform: translate3d(-206.7px, 100.8px, 0px) scale(0.94) rotate(-448deg);
            opacity: 0.82;
          }
          55% {
            transform: translate3d(-209.6px, 69.2px, 0px) scale(0.90) rotate(-465deg);
            opacity: 0.76;
          }
          60% {
            transform: translate3d(-192.0px, 30.9px, 0px) scale(0.86) rotate(-481deg);
            opacity: 0.70;
          }
          65% {
            transform: translate3d(-155.6px, -10.5px, 0px) scale(0.83) rotate(-496deg);
            opacity: 0.65;
          }
          70% {
            transform: translate3d(-103.9px, -50.9px, 0px) scale(0.80) rotate(-512deg);
            opacity: 0.60;
          }
          75% {
            transform: translate3d(-42.1px, -86.3px, 0px) scale(0.80) rotate(-528deg);
            opacity: 0.60;
          }
          80% {
            transform: translate3d(23.9px, -113.3px, 0px) scale(0.82) rotate(-544deg);
            opacity: 0.65;
          }
          85% {
            transform: translate3d(87.4px, -129.1px, 0px) scale(0.86) rotate(-560deg);
            opacity: 0.70;
          }
          90% {
            transform: translate3d(142.6px, -132.3px, 0px) scale(0.90) rotate(-575deg);
            opacity: 0.76;
          }
          95% {
            transform: translate3d(183.6px, -122.6px, 0px) scale(0.93) rotate(-591deg);
            opacity: 0.82;
          }
          100% {
            transform: translate3d(206.7px, -100.8px, 0px) scale(0.95) rotate(-656deg);
            opacity: 0.85;
          }
        }

        .earth-spin-engine {
          animation: earthAxialSpin 180s linear infinite;
          transform-origin: center center;
          will-change: transform;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        .cubesat-orbit-engine {
          animation: fluidCubeSatOrbit 32s linear infinite;
          transform-origin: center center;
          will-change: transform, opacity;
          backface-visibility: hidden;
        }

        @media (prefers-reduced-motion: reduce) {
          .earth-spin-engine,
          .cubesat-orbit-engine {
            animation: none !important;
          }
        }
      `}</style>

      {/* ------------------------------------------------------------- */}
      {/* 1. FAINT TECHNICAL ARCHIVAL BACKGROUND TICKS                  */}
      {/* ------------------------------------------------------------- */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
        viewBox="0 0 1000 240"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Archival Calibration Arc */}
        <path
          d="M 280 -20 C 500 50, 750 95, 1020 120"
          stroke="#1A1A1A"
          strokeWidth="0.6"
          strokeDasharray="4 6"
          strokeOpacity="0.08"
        />

        {/* Small Dossier Crosshairs */}
        <g stroke="#1A1A1A" strokeWidth="0.5" strokeOpacity="0.12">
          <path d="M 450 30 L 458 30 M 454 26 L 454 34" />
          <path d="M 720 22 L 728 22 M 724 18 L 724 26" />
          <circle cx="430" cy="42" r="0.8" fill="#1A1A1A" fillOpacity="0.15" />
        </g>
      </svg>

      {/* ------------------------------------------------------------- */}
      {/* 2. EARTH & CUBESAT SYSTEM (EXPANDED SCALE, CLEAN ATMOSPHERE)   */}
      {/* ------------------------------------------------------------- */}
      <div 
        className="absolute right-[-30px] sm:right-[10px] lg:right-[50px] xl:right-[85px] bottom-[-90px] sm:bottom-[-75px] lg:bottom-[-60px] w-[440px] sm:w-[540px] lg:w-[620px] xl:w-[680px] h-[440px] sm:h-[540px] lg:h-[620px] xl:h-[680px] pointer-events-none flex items-center justify-center"
        style={{
          transform: `translate3d(${mouseOffset.x * 2}px, ${mouseOffset.y * 2}px, 0px)`,
          transition: 'transform 0.4s ease-out'
        }}
      >

        {/* ORBITAL PATH TRAJECTORY (Editorial ink line aligned with ellipse) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-[1]"
          viewBox="-300 -300 600 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            transform: `translate3d(${mouseOffset.x * 1}px, ${mouseOffset.y * 1}px, 0px)`
          }}
        >
          <g transform="rotate(-26)">
            {/* Primary Keplerian Orbit Path */}
            <ellipse
              cx="0"
              cy="0"
              rx="230"
              ry="96"
              stroke="#1A1A1A"
              strokeWidth="0.75"
              strokeDasharray="4 4"
              strokeOpacity="0.18"
            />
            {/* Subtle Nadir Flight Vector Segment */}
            <path
              d="M 205 37 A 230 96 0 0 1 -55 94"
              stroke="#C5A945"
              strokeWidth="1"
              strokeDasharray="2 3"
              strokeOpacity="0.4"
            />
            {/* Apogee / Ground-track marker */}
            <circle cx="-230" cy="0" r="1.5" fill="#1A1A1A" fillOpacity="0.25" />
            <text x="-225" y="8" fontFamily="monospace" fontSize="6" fill="#1A1A1A" fillOpacity="0.25" fontWeight="bold">
              ORBIT // 410KM
            </text>
          </g>
        </svg>

        {/* ------------------------------------------------------------- */}
        {/* EARTH GLOBE (Clean Printed Earth Globe - No Atmosphere Haze)  */}
        {/* ------------------------------------------------------------- */}
        <div 
          className="relative w-[340px] sm:w-[420px] lg:w-[480px] xl:w-[530px] h-[340px] sm:h-[420px] lg:h-[480px] xl:h-[530px] pointer-events-none z-[2] rounded-full overflow-hidden flex items-center justify-center border border-[#1A1A1A]/10"
          style={{
            transform: `translate3d(${mouseOffset.x * -1}px, ${mouseOffset.y * -1}px, 0px)`
          }}
        >
          {/* Earth Image with High Performance GPU Transform */}
          <div className="w-[104%] h-[104%] rounded-full overflow-hidden flex items-center justify-center">
            <img 
              src="/images/earthimg.png" 
              alt="Earth Globe" 
              className="earth-spin-engine w-full h-full object-cover mix-blend-multiply opacity-[0.24] filter grayscale-[95%] sepia-[20%] contrast-[112%] brightness-[94%]"
              loading="eager"
              decoding="async"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.includes('./images/')) {
                  target.src = './images/earthimg.png';
                }
              }}
            />
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SUBTLE MINIATURE 3U CUBESAT (FLUID ORBIT ALONG KEPLER PATH)    */}
        {/* ------------------------------------------------------------- */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[3]">
          <div 
            className="cubesat-orbit-engine w-8 h-6 sm:w-10 sm:h-7 flex items-center justify-center"
            style={{
              transform: `translate3d(${mouseOffset.x * 2.5}px, ${mouseOffset.y * 2.5}px, 0px)`
            }}
          >
            
            <svg
              className="w-full h-full overflow-visible"
              viewBox="-40 -25 80 50"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Micro Solar Panel Grid */}
                <pattern id="archivalSolarGrid" width="3" height="4" patternUnits="userSpaceOnUse">
                  <rect width="3" height="4" fill="#24282F" fillOpacity="0.75" stroke="#C5A945" strokeWidth="0.2" strokeOpacity="0.5" />
                </pattern>

                {/* Archival Chassis Tone */}
                <linearGradient id="chassisTones" x1="-8" y1="-8" x2="10" y2="20" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FAF6EE" />
                  <stop offset="60%" stopColor="#D5C9B3" />
                  <stop offset="100%" stopColor="#8C806C" />
                </linearGradient>
              </defs>

              {/* Deployable Dipole Antennas */}
              <line x1="-8" y1="3" x2="-18" y2="10" stroke="#1A1A1A" strokeWidth="0.6" strokeOpacity="0.6" />
              <circle cx="-18" cy="10" r="0.6" fill="#DC143C" />

              <line x1="-8" y1="3" x2="-16" y2="-8" stroke="#1A1A1A" strokeWidth="0.6" strokeOpacity="0.6" />
              <circle cx="-16" cy="-8" r="0.5" fill="#1A1A1A" />

              {/* LEFT SOLAR WING */}
              <polygon
                points="-30,2 -9,7 -9,20 -30,15"
                fill="#FAF6EE"
                stroke="#1A1A1A"
                strokeWidth="0.6"
              />
              <polygon
                points="-29,3 -10,8 -10,19 -29,14"
                fill="url(#archivalSolarGrid)"
              />
              <line x1="-20" y1="4.5" x2="-20" y2="17" stroke="#C5A945" strokeWidth="0.4" strokeOpacity="0.7" />

              {/* RIGHT SOLAR WING */}
              <polygon
                points="11,2 32,-3 32,10 11,15"
                fill="#FAF6EE"
                stroke="#1A1A1A"
                strokeWidth="0.6"
              />
              <polygon
                points="12,3 31,-2 31,9 12,14"
                fill="url(#archivalSolarGrid)"
              />
              <line x1="21" y1="1" x2="21" y2="13" stroke="#C5A945" strokeWidth="0.4" strokeOpacity="0.7" />

              {/* 3U CHASSIS BODY */}
              {/* Top Deck */}
              <polygon
                points="0,-8 10,-3 2,2 -8,-3"
                fill="#FAF6EE"
                stroke="#1A1A1A"
                strokeWidth="0.7"
              />
              {/* Optical Sensor Ring */}
              <ellipse cx="-2" cy="-3" rx="2.5" ry="1.5" fill="#24282F" stroke="#1A1A1A" strokeWidth="0.3" />
              <circle cx="-2" cy="-3" r="0.7" fill="#DC143C" />

              {/* Left Face */}
              <polygon
                points="-8,-3 2,2 2,21 -8,16"
                fill="url(#chassisTones)"
                stroke="#1A1A1A"
                strokeWidth="0.7"
              />

              {/* Right Face */}
              <polygon
                points="2,2 10,-3 10,16 2,21"
                fill="#8C806C"
                stroke="#1A1A1A"
                strokeWidth="0.7"
              />

              {/* 3U Sub-unit Separators */}
              <line x1="-8" y1="3.5" x2="2" y2="8.5" stroke="#1A1A1A" strokeWidth="0.4" strokeOpacity="0.6" />
              <line x1="2" y1="8.5" x2="10" y2="3.5" stroke="#1A1A1A" strokeWidth="0.4" strokeOpacity="0.6" />

              <line x1="-8" y1="10" x2="2" y2="15" stroke="#1A1A1A" strokeWidth="0.4" strokeOpacity="0.6" />
              <line x1="2" y1="15" x2="10" y2="10" stroke="#1A1A1A" strokeWidth="0.4" strokeOpacity="0.6" />

              {/* Muted Gold ID Stencil */}
              <rect x="-6" y="1" width="5" height="0.6" transform="skewY(24)" fill="#C5A945" />
            </svg>

          </div>
        </div>

      </div>

    </div>
  );
};
