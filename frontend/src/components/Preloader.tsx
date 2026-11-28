import React, { useState, useEffect, useRef } from 'react';

interface PreloaderProps {
  theme?: 'light' | 'dark';
  onComplete: () => void;
}

export const Preloader: React.FC<PreloaderProps> = ({ theme = 'light', onComplete }) => {
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [telemetryIndex, setTelemetryIndex] = useState<number>(0);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);
  const [isFadingOutReduced, setIsFadingOutReduced] = useState<boolean>(false);

  const startTimeRef = useRef<number | null>(null);
  const reqFrameRef = useRef<number | null>(null);

  // Total smooth animation duration: 4.4 seconds (4400ms)
  const TOTAL_DURATION = 4400;

  // Stepped hex telemetry digit pool for right solar wing (cycling smoothly every 320ms)
  const TELEMETRY_FRAMES = [
    ['0x4A', '9F', 'E1', '2B', '7C', 'A0'],
    ['0x8C', '14', 'FF', '08', 'D3', '5E'],
    ['0x3B', '72', 'A9', 'F4', '1C', '88'],
    ['0x6E', 'D0', '45', '9A', 'E7', '31'],
    ['0x1F', 'B8', '62', 'CC', '50', '8F'],
    ['0x94', '2E', '77', '0B', 'F6', '4D'],
  ];

  // 8 Hand-inked radiating dash marks with fluid staggered entrance
  const DASH_MARKS = [
    { angle: -80, radius: 82, len: 14, width: 2.2, delay: 800 },
    { angle: -55, radius: 88, len: 16, width: 2.0, delay: 880 },
    { angle: -30, radius: 84, len: 12, width: 2.4, delay: 960 },
    { angle: -5,  radius: 86, len: 15, width: 2.1, delay: 1040 },
    { angle: 20,  radius: 83, len: 13, width: 2.3, delay: 1120 },
    { angle: 45,  radius: 89, len: 17, width: 2.0, delay: 1200 },
    { angle: 70,  radius: 82, len: 14, width: 2.2, delay: 1280 },
    { angle: 95,  radius: 80, len: 12, width: 2.0, delay: 1360 },
  ];

  // Check prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setIsReducedMotion(true);
      const timer = setTimeout(() => {
        setIsFadingOutReduced(true);
        setTimeout(() => {
          onComplete();
        }, 350);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [onComplete]);

  // Cycling Telemetry Digits
  useEffect(() => {
    if (isReducedMotion) return;
    const interval = setInterval(() => {
      setTelemetryIndex((prev) => (prev + 1) % TELEMETRY_FRAMES.length);
    }, 320);
    return () => clearInterval(interval);
  }, [isReducedMotion, TELEMETRY_FRAMES.length]);

  // Master frame ticker
  useEffect(() => {
    if (isReducedMotion) return;

    const tick = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      const elapsed = timestamp - startTimeRef.current;
      setElapsedMs(elapsed);

      if (elapsed < TOTAL_DURATION) {
        reqFrameRef.current = requestAnimationFrame(tick);
      } else {
        onComplete();
      }
    };

    reqFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (reqFrameRef.current) {
        cancelAnimationFrame(reqFrameRef.current);
      }
    };
  }, [isReducedMotion, onComplete]);

  // Click or Key to Skip
  const handleSkip = () => {
    onComplete();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Smooth easing helper: Cubic Out (smooth deceleration)
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
  
  // Smooth easing helper: Cubic In-Out (luxurious smooth ease)
  const easeInOutCubic = (t: number) => {
    const clamped = Math.min(Math.max(t, 0), 1);
    return clamped < 0.5 
      ? 4 * clamped * clamped * clamped 
      : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
  };

  // Smooth easing helper: Expo In-Out for dramatic fluid curtain tear reveal
  const easeInOutQuart = (t: number) => {
    const clamped = Math.min(Math.max(t, 0), 1);
    return clamped < 0.5 ? 8 * clamped * clamped * clamped * clamped : 1 - Math.pow(-2 * clamped + 2, 4) / 2;
  };

  // =========================================================================
  // SMOOTH FLUID TIMING CALCULATIONS (0 to 4400ms)
  // =========================================================================

  // 1. (0.0s - 0.9s): CubeSat Smooth Float & Scale In
  const iconEntranceProgress = easeOutCubic(elapsedMs / 900);
  const iconScale = 0.85 + (iconEntranceProgress * 0.15); // smoothly zooms from 0.85 to 1.0
  const iconTranslateY = (1 - iconEntranceProgress) * 28; // slides up smoothly from 28px
  const iconOpacity = Math.min(1, elapsedMs / 500); // smooth fade in

  // Gentle continuous floating levitation (orbit hover effect after entrance)
  const hoverOffset = elapsedMs >= 900 
    ? Math.sin((elapsedMs - 900) * 0.003) * 3.5 
    : 0;
  const hoverRotation = elapsedMs >= 900 
    ? Math.sin((elapsedMs - 900) * 0.002) * 0.7 
    : (1 - iconEntranceProgress) * -3;

  // 2. (0.9s - 1.8s): Antenna Beacon Smooth Glowing Pulse & Radar Rings
  const isBeaconActive = elapsedMs >= 900 && elapsedMs < 3800;
  const beaconCycle = isBeaconActive ? ((elapsedMs - 900) % 1200) / 1200 : 0;
  const beaconScale = isBeaconActive ? 1 + Math.sin(beaconCycle * Math.PI) * 0.45 : 1;
  const radarRadius = isBeaconActive ? beaconCycle * 28 : 0;
  const radarOpacity = isBeaconActive ? (1 - beaconCycle) * 0.85 : 0;

  // 3. (1.3s - 2.3s): Typography "GENEALOGY TRACER" Fluid Reveal
  const textEntranceProgress = easeOutCubic(Math.max(0, elapsedMs - 1300) / 800);
  const textTranslateY = (1 - textEntranceProgress) * 16;
  const textOpacity = textEntranceProgress;
  const textLetterSpacing = 0.02 + (1 - textEntranceProgress) * 0.08;

  // 4. (2.0s - 2.9s): Sub-elements (Badge, Hand-Drawn Rule, Caption) Smooth Fluid Fade
  const subEntranceProgress = easeOutCubic(Math.max(0, elapsedMs - 2000) / 700);
  const subOpacity = subEntranceProgress;
  const subTranslateY = (1 - subEntranceProgress) * 12;
  const lineDrawScaleX = subEntranceProgress;

  // 5. (3.7s - 4.4s): Fluid Smooth Paper Tear & Curtain Slide-Away Reveal
  const tearStartMs = 3700;
  const tearProgress = elapsedMs >= tearStartMs 
    ? easeInOutQuart((elapsedMs - tearStartMs) / (TOTAL_DURATION - tearStartMs)) 
    : 0;
  const isTearPhase = tearProgress > 0;

  // Smooth curtain slide-away displacements
  const leftPanelX = -tearProgress * 115; // smooth slide left in vw
  const leftPanelY = -tearProgress * 45;  // smooth slide up in vh
  const leftPanelRotate = -tearProgress * 18; // smooth rotation in deg
  
  const rightPanelX = tearProgress * 115; // smooth slide right in vw
  const rightPanelY = tearProgress * 55;  // smooth slide down in vh
  const rightPanelRotate = tearProgress * 16;

  // Overall curtain opacity fade during the final 200ms
  const curtainOpacity = elapsedMs >= 4150 
    ? Math.max(0, 1 - (elapsedMs - 4150) / 250) 
    : 1;

  // Reduced motion mode fallback
  if (isReducedMotion) {
    return (
      <div 
        className={`fixed inset-0 z-50 flex items-center justify-center bg-[#F0EAD6] text-[#1A1A1A] transition-opacity duration-500 ${
          isFadingOutReduced ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="flex flex-col items-center justify-center p-8 text-center max-w-lg">
          <StaticCubeSatIcon activeTelemetry={TELEMETRY_FRAMES[0]} />
          <h1 className="text-4xl font-headline font-black tracking-tighter text-[#1A1A1A] mt-6">
            GENEALOGY TRACER
          </h1>
          <div className="w-48 h-0.5 bg-[#DC143C] my-3"></div>
          <p className="text-xs font-mono-tech tracking-[0.25em] text-[#1A1A1A] font-bold uppercase">
            TELEMETRY SYNCHRONIZED.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden select-none cursor-pointer"
      onClick={handleSkip}
      title="Click or press Space to skip"
      style={{ opacity: curtainOpacity }}
    >
      
      {/* ===================================================================== */}
      {/* TORN SHEET FRAGMENT 1: TOP-LEFT JAGGED COVER SHEET                   */}
      {/* ===================================================================== */}
      <div
        className="absolute inset-0 bg-[#F0EAD6] text-[#1A1A1A] overflow-hidden"
        style={{
          clipPath: isTearPhase
            ? 'polygon(0% 0%, 100% 0%, 100% 36%, 86% 43%, 72% 38%, 60% 47%, 45% 40%, 30% 51%, 16% 42%, 0% 57%)'
            : 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
          transform: isTearPhase
            ? `translate3d(${leftPanelX}vw, ${leftPanelY}vh, 0) rotate(${leftPanelRotate}deg)`
            : 'none',
          boxShadow: isTearPhase ? '15px 15px 40px rgba(0,0,0,0.35)' : 'none',
          willChange: 'transform, clip-path, opacity',
        }}
      >
        {/* Background Dot-Grid Texture & Grunge Paper Layer */}
        <div className="absolute inset-0 bg-halftone opacity-25 pointer-events-none"></div>
        <div className="absolute inset-0 bg-circuit-pattern opacity-15 pointer-events-none"></div>
        <div className="grunge-overlay pointer-events-none opacity-30"></div>

        {/* Content Rendered Inside Top-Left Fragment */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <PreloaderCoreContent
            elapsedMs={elapsedMs}
            iconScale={iconScale}
            iconTranslateY={iconTranslateY + hoverOffset}
            iconRotate={hoverRotation}
            iconOpacity={iconOpacity}
            beaconScale={beaconScale}
            radarRadius={radarRadius}
            radarOpacity={radarOpacity}
            textOpacity={textOpacity}
            textTranslateY={textTranslateY}
            textLetterSpacing={textLetterSpacing}
            subOpacity={subOpacity}
            subTranslateY={subTranslateY}
            lineDrawScaleX={lineDrawScaleX}
            activeTelemetry={TELEMETRY_FRAMES[telemetryIndex]}
            dashMarks={DASH_MARKS}
            easeOutCubic={easeOutCubic}
          />
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TORN SHEET FRAGMENT 2: BOTTOM-RIGHT JAGGED COVER SHEET (Active on Tear) */}
      {/* ===================================================================== */}
      {isTearPhase && (
        <div
          className="absolute inset-0 bg-[#F0EAD6] text-[#1A1A1A] overflow-hidden"
          style={{
            clipPath: 'polygon(0% 57%, 16% 42%, 30% 51%, 45% 40%, 60% 47%, 72% 38%, 86% 43%, 100% 36%, 100% 100%, 0% 100%)',
            transform: `translate3d(${rightPanelX}vw, ${rightPanelY}vh, 0) rotate(${rightPanelRotate}deg)`,
            boxShadow: '-15px -15px 40px rgba(0,0,0,0.35)',
            willChange: 'transform',
          }}
        >
          <div className="absolute inset-0 bg-halftone opacity-25 pointer-events-none"></div>
          <div className="absolute inset-0 bg-circuit-pattern opacity-15 pointer-events-none"></div>
          <div className="grunge-overlay pointer-events-none opacity-30"></div>

          {/* Jagged Deckled Edge Drop Shadow line on the rip */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <polyline 
              points="0,570 160,420 300,510 450,400 600,470 720,380 860,430 1000,360" 
              fill="none" 
              stroke="#1A1A1A" 
              strokeWidth="2.5" 
              strokeDasharray="5 3"
              opacity="0.6"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <PreloaderCoreContent
              elapsedMs={elapsedMs}
              iconScale={iconScale}
              iconTranslateY={iconTranslateY + hoverOffset}
              iconRotate={hoverRotation}
              iconOpacity={iconOpacity}
              beaconScale={beaconScale}
              radarRadius={radarRadius}
              radarOpacity={radarOpacity}
              textOpacity={textOpacity}
              textTranslateY={textTranslateY}
              textLetterSpacing={textLetterSpacing}
              subOpacity={subOpacity}
              subTranslateY={subTranslateY}
              lineDrawScaleX={lineDrawScaleX}
              activeTelemetry={TELEMETRY_FRAMES[telemetryIndex]}
              dashMarks={DASH_MARKS}
              easeOutCubic={easeOutCubic}
            />
          </div>
        </div>
      )}

      {/* Discrete subtle skip prompt at bottom */}
      <div 
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-mono-tech tracking-[0.2em] uppercase text-[#1A1A1A]/40 transition-opacity duration-500 pointer-events-none"
        style={{ opacity: elapsedMs > 1500 && !isTearPhase ? 0.75 : 0 }}
      >
        CLICK OR PRESS [SPACE] TO SKIP
      </div>

    </div>
  );
};

// =============================================================================
// PRELOADER CORE CONTENT: CubeSat, Radiating Pings, Wordmark & Caption
// =============================================================================

interface PreloaderCoreProps {
  elapsedMs: number;
  iconScale: number;
  iconTranslateY: number;
  iconRotate: number;
  iconOpacity: number;
  beaconScale: number;
  radarRadius: number;
  radarOpacity: number;
  textOpacity: number;
  textTranslateY: number;
  textLetterSpacing: number;
  subOpacity: number;
  subTranslateY: number;
  lineDrawScaleX: number;
  activeTelemetry: string[];
  dashMarks: Array<{ angle: number; radius: number; len: number; width: number; delay: number }>;
  easeOutCubic: (t: number) => number;
}

const PreloaderCoreContent: React.FC<PreloaderCoreProps> = ({
  elapsedMs,
  iconScale,
  iconTranslateY,
  iconRotate,
  iconOpacity,
  beaconScale,
  radarRadius,
  radarOpacity,
  textOpacity,
  textTranslateY,
  textLetterSpacing,
  subOpacity,
  subTranslateY,
  lineDrawScaleX,
  activeTelemetry,
  dashMarks,
  easeOutCubic,
}) => {
  return (
    <div className="relative flex flex-col items-center justify-center px-4 max-w-xl mx-auto">
      
      {/* ------------------------------------------------------------------- */}
      {/* CUBESAT ICON STAGE WITH FLUID RADIATING DASH MARKS & RADAR PINGS    */}
      {/* ------------------------------------------------------------------- */}
      <div className="relative w-64 h-56 flex items-center justify-center">
        
        {/* Radiating Dash Marks (Smooth Fluid Staggered Expansion) */}
        <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
          <g transform="translate(128, 112)">
            {dashMarks.map((dash, i) => {
              if (elapsedMs < dash.delay) return null;
              
              // Smooth fluid ease for each dash expansion
              const dashProgress = easeOutCubic(Math.min(1, (elapsedMs - dash.delay) / 450));
              const currentLen = dash.len * dashProgress;
              const currentRadius = dash.radius - (1 - dashProgress) * 8;
              const dashOpacity = dashProgress * 0.9;

              const rad = (dash.angle * Math.PI) / 180;
              const x1 = currentRadius * Math.cos(rad);
              const y1 = currentRadius * Math.sin(rad);
              const x2 = (currentRadius + currentLen) * Math.cos(rad);
              const y2 = (currentRadius + currentLen) * Math.sin(rad);

              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#1A1A1A"
                  strokeWidth={dash.width}
                  strokeLinecap="round"
                  opacity={dashOpacity}
                />
              );
            })}
          </g>
        </svg>

        {/* Flat Vector CubeSat Body Assembly */}
        <div
          style={{
            transform: `translate3d(0, ${iconTranslateY}px, 0) scale(${iconScale}) rotate(${iconRotate}deg)`,
            opacity: iconOpacity,
            willChange: 'transform, opacity',
          }}
          className="relative drop-shadow-[0_8px_16px_rgba(26,24,21,0.14)]"
        >
          <svg width="220" height="110" viewBox="0 0 220 110" className="overflow-visible">
            <defs>
              {/* Left Wing Crimson Tone */}
              <linearGradient id="smoothLeftWingCrimson" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E62544" />
                <stop offset="100%" stopColor="#DC143C" />
              </linearGradient>

              {/* Right Wing Muted Gold Tone */}
              <linearGradient id="smoothRightWingGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#D8BC54" />
                <stop offset="100%" stopColor="#C5A945" />
              </linearGradient>

              {/* Chassis Texture Pattern */}
              <pattern id="chassisDotGridSmooth" width="4" height="4" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="0.5" fill="#1A1A1A" opacity="0.3" />
              </pattern>
            </defs>

            {/* --------------------------------------------------------------- */}
            {/* 1. LEFT SOLAR WING (Crimson Red with Fine Circuit Traces)        */}
            {/* --------------------------------------------------------------- */}
            <g transform="translate(12, 32)">
              {/* Wing Hinge Mount to Body */}
              <rect x="68" y="16" width="6" height="14" fill="#1A1A1A" rx="1" />
              <circle cx="71" cy="23" r="1.5" fill="#FAF6EE" />

              {/* Crimson Solar Substrate */}
              <rect
                x="0"
                y="0"
                width="68"
                height="46"
                fill="url(#smoothLeftWingCrimson)"
                stroke="#1A1A1A"
                strokeWidth="2.4"
                rx="2"
              />

              {/* 2x3 Cell Grid Dividers */}
              <line x1="23" y1="0" x2="23" y2="46" stroke="#1A1A1A" strokeWidth="1.2" />
              <line x1="46" y1="0" x2="46" y2="46" stroke="#1A1A1A" strokeWidth="1.2" />
              <line x1="0" y1="23" x2="68" y2="23" stroke="#1A1A1A" strokeWidth="1.2" />

              {/* Etched Circuit-Trace Linework in Cells */}
              <g stroke="#FAF6EE" strokeWidth="1.0" fill="none" opacity="0.9">
                {/* Cell 1: Bus line with via */}
                <polyline points="4,8 14,8 18,12 18,18" />
                <circle cx="4" cy="8" r="1.3" fill="#FAF6EE" />
                
                {/* Cell 2: Diagonal step trace */}
                <polyline points="27,18 33,18 39,12 42,12" />
                <circle cx="42" cy="12" r="1.3" fill="#FAF6EE" />

                {/* Cell 3: Angular PCB trace */}
                <polyline points="50,6 56,12 64,12" />
                <circle cx="50" cy="6" r="1.3" fill="#FAF6EE" />

                {/* Cell 4: Lower loop trace */}
                <polyline points="6,38 12,38 16,30 20,30" />
                <circle cx="20" cy="30" r="1.3" fill="#FAF6EE" />

                {/* Cell 5: Solder pad line */}
                <line x1="28" y1="36" x2="41" y2="36" />
                <circle cx="28" cy="36" r="1.3" fill="#FAF6EE" />
                <circle cx="41" cy="36" r="1.3" fill="#FAF6EE" />

                {/* Cell 6: Step-down trace */}
                <polyline points="50,30 56,38 64,38" />
                <circle cx="64" cy="38" r="1.3" fill="#FAF6EE" />
              </g>
            </g>

            {/* --------------------------------------------------------------- */}
            {/* 2. RIGHT SOLAR WING (Muted Gold with Telemetry Digits)           */}
            {/* --------------------------------------------------------------- */}
            <g transform="translate(140, 32)">
              {/* Wing Hinge Mount to Body */}
              <rect x="-6" y="16" width="6" height="14" fill="#1A1A1A" rx="1" />
              <circle cx="-3" cy="23" r="1.5" fill="#FAF6EE" />

              {/* Muted Gold Solar Substrate */}
              <rect
                x="0"
                y="0"
                width="68"
                height="46"
                fill="url(#smoothRightWingGold)"
                stroke="#1A1A1A"
                strokeWidth="2.4"
                rx="2"
              />

              {/* 2x3 Cell Grid Dividers */}
              <line x1="23" y1="0" x2="23" y2="46" stroke="#1A1A1A" strokeWidth="1.2" />
              <line x1="46" y1="0" x2="46" y2="46" stroke="#1A1A1A" strokeWidth="1.2" />
              <line x1="0" y1="23" x2="68" y2="23" stroke="#1A1A1A" strokeWidth="1.2" />

              {/* Stepped Telemetry Digits / Hex Codes */}
              <g 
                fill="#1A1A1A" 
                fontFamily="'Roboto Mono', monospace" 
                fontSize="8.5" 
                fontWeight="700" 
                textAnchor="middle"
                className="select-none pointer-events-none"
              >
                <text x="11.5" y="15" className="transition-all duration-200">{activeTelemetry[0] || '0x4A'}</text>
                <text x="34.5" y="15" className="transition-all duration-200">{activeTelemetry[1] || '9F'}</text>
                <text x="57" y="15" className="transition-all duration-200">{activeTelemetry[2] || 'E1'}</text>
                <text x="11.5" y="37" className="transition-all duration-200">{activeTelemetry[3] || '2B'}</text>
                <text x="34.5" y="37" className="transition-all duration-200">{activeTelemetry[4] || '7C'}</text>
                <text x="57" y="37" className="transition-all duration-200">{activeTelemetry[5] || 'A0'}</text>
              </g>
            </g>

            {/* --------------------------------------------------------------- */}
            {/* 3. RECTANGULAR CHARCOAL-OUTLINED CUBESAT BODY & ANTENNA STUB     */}
            {/* --------------------------------------------------------------- */}
            <g transform="translate(86, 26)">
              {/* Short Antenna Stub on Top */}
              <g transform="translate(24, 0)">
                <line x1="0" y1="0" x2="0" y2="-18" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
                
                {/* Expanding Smooth Radar Ping Ring */}
                {radarRadius > 0 && (
                  <circle 
                    cx="0" 
                    cy="-20" 
                    r={radarRadius} 
                    fill="none" 
                    stroke="#DC143C" 
                    strokeWidth="1.6" 
                    strokeDasharray="3 3"
                    opacity={radarOpacity} 
                  />
                )}

                {/* Antenna Beacon Tip with Smooth Breathing Scale */}
                <g 
                  transform={`translate(0, -20) scale(${beaconScale})`}
                  style={{ transformOrigin: 'center center' }}
                >
                  <circle cx="0" cy="0" r="4.5" fill="#DC143C" stroke="#1A1A1A" strokeWidth="1.5" />
                  <circle cx="0" cy="0" r="1.8" fill="#FAF6EE" />
                </g>
              </g>

              {/* Main CubeSat Body Box */}
              <rect
                x="0"
                y="0"
                width="48"
                height="58"
                fill="#F0EAD6"
                stroke="#1A1A1A"
                strokeWidth="3.2"
                rx="2"
              />

              {/* Internal Texture Overlay */}
              <rect x="2" y="2" width="44" height="54" fill="url(#chassisDotGridSmooth)" />

              {/* Corner Screw Rivets */}
              <circle cx="5" cy="5" r="1.5" fill="#1A1A1A" />
              <circle cx="43" cy="5" r="1.5" fill="#1A1A1A" />
              <circle cx="5" cy="53" r="1.5" fill="#1A1A1A" />
              <circle cx="43" cy="53" r="1.5" fill="#1A1A1A" />

              {/* Center Avionics / Sensor Lens Panel */}
              <rect
                x="10"
                y="14"
                width="28"
                height="30"
                fill="#1A1A1A"
                rx="2"
              />
              <rect
                x="12"
                y="16"
                width="24"
                height="26"
                fill="#272420"
                stroke="#C5A945"
                strokeWidth="1"
              />

              {/* Center Crosshair / Diagnostic Sensor Eye */}
              <circle cx="24" cy="29" r="6" fill="none" stroke="#FAF6EE" strokeWidth="1" strokeDasharray="3 2" />
              <circle cx="24" cy="29" r="2.5" fill="#DC143C" />
              <line x1="16" y1="29" x2="32" y2="29" stroke="#C5A945" strokeWidth="0.8" />
              <line x1="24" y1="21" x2="24" y2="37" stroke="#C5A945" strokeWidth="0.8" />
            </g>
          </svg>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 4. DISTRESSED BLOCK-LETTER WORDMARK: "GENEALOGY TRACER"             */}
      {/* ------------------------------------------------------------------- */}
      <div 
        className="relative mt-3 flex flex-col items-center"
        style={{
          opacity: textOpacity,
          transform: `translate3d(0, ${textTranslateY}px, 0)`,
          willChange: 'transform, opacity',
        }}
      >
        <h1 
          className="text-3xl sm:text-4xl md:text-5xl font-headline font-black tracking-tighter text-[#1A1A1A] text-center"
          style={{ letterSpacing: `${textLetterSpacing}em` }}
        >
          GENEALOGY TRACER
        </h1>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 5. TORN-TAB BADGE, HAND-DRAWN RULE & CAPTION                        */}
      {/* ------------------------------------------------------------------- */}
      <div 
        className="flex flex-col items-center mt-3 w-full max-w-sm"
        style={{
          opacity: subOpacity,
          transform: `translate3d(0, ${subTranslateY}px, 0)`,
          willChange: 'transform, opacity',
        }}
      >
        {/* Torn-Tab Case-File Stamp */}
        <div className="flex items-center gap-2 mb-2">
          <span className="torn-paper-strip bg-[#DC143C] text-[#FAF6EE] text-[10px] sm:text-xs font-mono-tech px-2.5 py-0.5 font-bold uppercase tracking-widest shadow-xs">
            INCIDENT REF: #GT-8849
          </span>
          <span className="text-[10px] sm:text-xs font-mono-tech font-bold text-[#C5A945] uppercase tracking-wider">
            [ 1U CUBESAT BUS ]
          </span>
        </div>

        {/* Smooth Drawing Hand-Drawn Horizontal Rule */}
        <svg 
          width="220" 
          height="8" 
          viewBox="0 0 220 8" 
          className="w-48 sm:w-64 my-1 overflow-visible"
          style={{
            transform: `scaleX(${lineDrawScaleX})`,
            transformOrigin: 'center center',
            transition: 'transform 0.1s linear',
          }}
        >
          <path
            d="M 2,4 Q 55,2 110,5 T 218,3"
            fill="none"
            stroke="#1A1A1A"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>

        {/* Tracked-Out Uppercase Mono Caption */}
        <p className="text-[11px] sm:text-xs font-mono-tech font-bold tracking-[0.28em] text-[#1A1A1A] uppercase mt-1 text-center">
          TELEMETRY SYNCHRONIZED.
        </p>
      </div>

    </div>
  );
};

// Static Icon Fallback for Reduced-Motion Mode
const StaticCubeSatIcon: React.FC<{ activeTelemetry: string[] }> = ({ activeTelemetry }) => (
  <div className="relative">
    <svg width="180" height="90" viewBox="0 0 220 110">
      {/* Left Crimson Wing */}
      <rect x="12" y="32" width="68" height="46" fill="#DC143C" stroke="#1A1A1A" strokeWidth="2.4" rx="2" />
      <line x1="35" y1="32" x2="35" y2="78" stroke="#1A1A1A" strokeWidth="1.2" />
      <line x1="58" y1="32" x2="58" y2="78" stroke="#1A1A1A" strokeWidth="1.2" />
      <line x1="12" y1="55" x2="80" y2="55" stroke="#1A1A1A" strokeWidth="1.2" />
      {/* Right Gold Wing */}
      <rect x="140" y="32" width="68" height="46" fill="#C5A945" stroke="#1A1A1A" strokeWidth="2.4" rx="2" />
      <line x1="163" y1="32" x2="163" y2="78" stroke="#1A1A1A" strokeWidth="1.2" />
      <line x1="186" y1="32" x2="186" y2="78" stroke="#1A1A1A" strokeWidth="1.2" />
      <line x1="140" y1="55" x2="208" y2="55" stroke="#1A1A1A" strokeWidth="1.2" />
      {/* Body & Antenna */}
      <line x1="110" y1="26" x2="110" y2="6" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
      <circle cx="110" cy="4" r="4" fill="#DC143C" stroke="#1A1A1A" strokeWidth="1.5" />
      <rect x="86" y="26" width="48" height="58" fill="#F0EAD6" stroke="#1A1A1A" strokeWidth="3.2" rx="2" />
      <rect x="96" y="40" width="28" height="30" fill="#1A1A1A" rx="2" />
      <circle cx="110" cy="55" r="3" fill="#DC143C" />
    </svg>
  </div>
);
