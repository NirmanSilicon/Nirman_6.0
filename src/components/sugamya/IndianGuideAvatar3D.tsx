import React, { useState, useEffect, useRef } from 'react';

export interface IndianGuideAvatar3DProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  isSpeaking?: boolean;
  isListening?: boolean;
  isHappy?: boolean;
  interactive?: boolean;
  showBadge?: boolean;
  showHalo?: boolean;
  tooltipText?: string;
  className?: string;
  onClick?: () => void;
}

/**
 * 3D Indian Tour Guide Avatar
 * Replicates the authentic Indian Guide character with red/yellow/green decorated safa (turban),
 * classic mustache, yellow kurta, and namaste greeting hands.
 * Features 3D cursor-tracking physics, realistic parallax depth, and smooth rotation.
 */
export const IndianGuideAvatar3D: React.FC<IndianGuideAvatar3DProps> = ({
  size = 'md',
  isSpeaking = false,
  isListening = false,
  isHappy = false,
  interactive = true,
  showBadge = true,
  showHalo = true,
  tooltipText,
  className = '',
  onClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [targetRot, setTargetRot] = useState({ x: 0, y: 0 });
  const [currentRot, setCurrentRot] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [speakCycle, setSpeakCycle] = useState(0);

  // Compact, well-proportioned pixel sizes
  const pixelSize = typeof size === 'number'
    ? size
    : size === 'xs'
    ? 28
    : size === 'sm'
    ? 38
    : size === 'md'
    ? 50
    : size === 'lg'
    ? 64
    : 100;

  // Natural subtle blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 180);
    }, 4000 + Math.random() * 2500);

    return () => clearInterval(blinkInterval);
  }, []);

  // Speaking mouth movement loop
  useEffect(() => {
    if (!isSpeaking) {
      setSpeakCycle(0);
      return;
    }
    const speakInterval = setInterval(() => {
      setSpeakCycle((prev) => (prev + 1) % 4);
    }, 130);
    return () => clearInterval(speakInterval);
  }, [isSpeaking]);

  // Global mouse tracking for cursor tracking
  useEffect(() => {
    if (!interactive) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;

      const maxDistanceX = window.innerWidth / 1.6;
      const maxDistanceY = window.innerHeight / 1.6;

      const normX = Math.max(-1, Math.min(1, deltaX / maxDistanceX));
      const normY = Math.max(-1, Math.min(1, deltaY / maxDistanceY));

      setMousePos({ x: normX, y: normY });
      setTargetRot({
        x: -normY * 20, // Tilt up/down
        y: normX * 24,  // Turn left/right
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!containerRef.current || e.touches.length === 0) return;
      const touch = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = touch.clientX - centerX;
      const deltaY = touch.clientY - centerY;

      const normX = Math.max(-1, Math.min(1, deltaX / (window.innerWidth / 2)));
      const normY = Math.max(-1, Math.min(1, deltaY / (window.innerHeight / 2)));

      setMousePos({ x: normX, y: normY });
      setTargetRot({
        x: -normY * 20,
        y: normX * 24,
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [interactive]);

  // Smooth 60fps lerp animation frame loop
  useEffect(() => {
    let animId: number;
    const animate = () => {
      setCurrentRot((prev) => ({
        x: prev.x + (targetRot.x - prev.x) * 0.14,
        y: prev.y + (targetRot.y - prev.y) * 0.14,
      }));
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [targetRot]);

  // Parallax offsets for 3D depth layers
  const turbanX = mousePos.x * 2.8;
  const turbanY = mousePos.y * 2.2;
  const faceX = mousePos.x * 1.8;
  const faceY = mousePos.y * 1.5;
  const mustacheX = mousePos.x * 2.4;
  const mustacheY = mousePos.y * 1.8;
  const handsX = mousePos.x * 1.2;
  const handsY = mousePos.y * 1.0;

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      style={{
        width: pixelSize,
        height: pixelSize,
        perspective: '800px',
      }}
      className={`relative inline-flex items-center justify-center select-none cursor-pointer group ${className}`}
      title={tooltipText || 'Sugamya 3D Indian Tour Guide - Moves with your cursor'}
      aria-label="Sugamya 3D Indian Guide Avatar"
    >
      {/* Ambient Halo Ring */}
      {showHalo && (
        <div
          className={`absolute -inset-1 rounded-full transition-opacity duration-300 pointer-events-none ${
            isSpeaking
              ? 'bg-gradient-to-tr from-amber-400/60 via-red-500/40 to-yellow-300/60 animate-pulse opacity-95'
              : isListening
              ? 'bg-gradient-to-tr from-red-500/50 via-rose-400/40 to-amber-400/50 animate-ping opacity-85'
              : isHovered
              ? 'bg-gradient-to-tr from-amber-500/40 via-orange-500/30 to-yellow-400/40 opacity-90 scale-105'
              : 'bg-gradient-to-tr from-amber-500/20 via-red-500/15 to-yellow-500/20 opacity-60'
          }`}
          style={{
            filter: 'blur(3px)',
            transform: `translate3d(${-mousePos.x * 3}px, ${-mousePos.y * 3}px, -15px)`,
          }}
        />
      )}

      {/* 3D Stage Container */}
      <div
        style={{
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transform: `rotateX(${currentRot.x}deg) rotateY(${currentRot.y}deg) scale(${
            isHovered ? 1.04 : 1
          })`,
          transition: 'transform 0.08s ease-out',
          filter: `drop-shadow(${-mousePos.x * 5}px ${Math.max(3, -mousePos.y * 5 + 4)}px 10px rgba(0, 0, 0, 0.25))`,
        }}
        className="relative rounded-full flex items-center justify-center overflow-visible bg-white/90 dark:bg-slate-900/90 border border-amber-400/30 shadow-md"
      >
        {/* Exact Vector Replica of the Indian Tour Guide Character */}
        <svg
          viewBox="0 0 400 400"
          className="w-[112%] h-[112%] overflow-visible z-10"
          style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.15))' }}
        >
          <defs>
            {/* Soft Shadow Filter */}
            <filter id="softGazeShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* ============================================================== */}
          {/* LAYER 1: YELLOW KURTA BODY & SHOULDERS                         */}
          {/* ============================================================== */}
          <g transform={`translate(${handsX * 0.5}, ${handsY * 0.4})`}>
            {/* Yellow Kurta Chest/Torso */}
            <path
              d="M 100 350 C 110 275, 290 275, 300 350 C 290 380, 110 380, 100 350 Z"
              fill="#F7B100"
              stroke="#000000"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            {/* Kurta Collar Crease Lines */}
            <path
              d="M 135 315 C 160 305, 175 325, 175 345"
              fill="none"
              stroke="#000000"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M 265 315 C 240 305, 225 325, 225 345"
              fill="none"
              stroke="#000000"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>

          {/* ============================================================== */}
          {/* LAYER 2: EARS & HEAD SHAPE                                     */}
          {/* ============================================================== */}
          <g transform={`translate(${faceX}, ${faceY})`}>
            {/* Left Ear */}
            <path
              d="M 135 180 C 100 180, 100 215, 135 215 Z"
              fill="#E5A67A"
              stroke="#000000"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            {/* Left Ear Inner Detail */}
            <path
              d="M 125 192 C 120 197, 120 205, 127 207"
              fill="none"
              stroke="#000000"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Right Ear */}
            <path
              d="M 265 180 C 300 180, 300 215, 265 215 Z"
              fill="#E5A67A"
              stroke="#000000"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            {/* Right Ear Inner Detail */}
            <path
              d="M 275 192 C 280 197, 280 205, 273 207"
              fill="none"
              stroke="#000000"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Face Shape */}
            <path
              d="M 135 145 L 135 235 C 135 285, 265 285, 265 235 L 265 145 Z"
              fill="#E5A67A"
              stroke="#000000"
              strokeWidth="5"
              strokeLinejoin="round"
            />

            {/* Eyebrows */}
            <path
              d="M 142 180 C 150 165, 175 165, 183 180"
              fill="#000000"
              stroke="#000000"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d="M 217 180 C 225 165, 250 165, 258 180"
              fill="#000000"
              stroke="#000000"
              strokeWidth="7"
              strokeLinecap="round"
            />

            {/* Eyes (Peaceful curved arcs matching character image, openable on hover/motion) */}
            {isBlinking ? (
              // Straight closed lash
              <>
                <line x1="152" y1="195" x2="173" y2="195" stroke="#000000" strokeWidth="5" strokeLinecap="round" />
                <line x1="227" y1="195" x2="248" y2="195" stroke="#000000" strokeWidth="5" strokeLinecap="round" />
              </>
            ) : (
              // Iconic curved eyes from the uploaded image with 3D eye pupils that gaze at cursor
              <>
                <path
                  d="M 152 188 C 152 208, 173 208, 173 188"
                  fill="none"
                  stroke="#000000"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <path
                  d="M 227 188 C 227 208, 248 208, 248 188"
                  fill="none"
                  stroke="#000000"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </>
            )}

            {/* Nose (Prominent bridge from forehead down to round tip) */}
            <path
              d="M 190 152 L 190 220 C 180 238, 220 238, 210 220 L 210 152"
              fill="#E5A67A"
              stroke="#000000"
              strokeWidth="5"
              strokeLinejoin="round"
            />
          </g>

          {/* ============================================================== */}
          {/* LAYER 3: MUSTACHE & SMILING MOUTH                             */}
          {/* ============================================================== */}
          <g transform={`translate(${mustacheX}, ${mustacheY})`}>
            {/* Smiling Open Mouth with White Teeth */}
            <path
              d="M 183 252 Q 200 270 217 252 Z"
              fill="#FFFFFF"
              stroke="#000000"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            {/* Speaking animation mouth interior */}
            {isSpeaking && (
              <path
                d={
                  speakCycle === 0
                    ? "M 188 256 Q 200 268 212 256 Z"
                    : speakCycle === 1
                    ? "M 186 256 Q 200 272 214 256 Z"
                    : "M 188 256 Q 200 266 212 256 Z"
                }
                fill="#C62828"
              />
            )}

            {/* Grand Curved Black Indian Mustache */}
            <path
              d="M 200 240 C 170 215, 110 215, 90 218 C 115 260, 160 262, 200 248 C 240 262, 285 260, 310 218 C 290 215, 230 215, 200 240 Z"
              fill="#000000"
              stroke="#000000"
              strokeWidth="4"
              strokeLinejoin="round"
            />
          </g>

          {/* ============================================================== */}
          {/* LAYER 4: NAMASTE HANDS (Front Depth)                          */}
          {/* ============================================================== */}
          <g transform={`translate(${handsX}, ${handsY})`}>
            {/* Left Hand / Fingers joined in Namaste */}
            <path
              d="M 168 325 C 165 348, 178 355, 185 345 L 198 270 C 199 265, 196 265, 194 270 Z"
              fill="#E5A67A"
              stroke="#000000"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            {/* Right Hand / Fingers joined in Namaste */}
            <path
              d="M 232 325 C 235 348, 222 355, 215 345 L 202 270 C 201 265, 204 265, 206 270 Z"
              fill="#E5A67A"
              stroke="#000000"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            {/* Center line between hands */}
            <line x1="200" y1="268" x2="200" y2="335" stroke="#000000" strokeWidth="4" strokeLinecap="round" />
          </g>

          {/* ============================================================== */}
          {/* LAYER 5: AUTHENTIC DECORATED RAJASTHANI TURBAN (SAFA)         */}
          {/* ============================================================== */}
          <g transform={`translate(${turbanX}, ${turbanY})`}>
            {/* Turban Outer Black Outline / Silhouette */}
            {/* 1. Main Top Dome (Red with yellow & white dots) */}
            <path
              d="M 115 145 C 50 115, 60 70, 115 70 C 135 30, 265 30, 285 70 C 340 70, 350 115, 285 145 C 345 165, 335 220, 275 178 L 125 178 C 65 220, 55 165, 115 145 Z"
              fill="#E51E2B"
              stroke="#000000"
              strokeWidth="5"
              strokeLinejoin="round"
            />

            {/* 2. Top-left Dome Wrap (Red) */}
            <path
              d="M 115 70 C 135 32, 265 32, 285 70 C 235 70, 165 70, 115 70 Z"
              fill="#E51E2B"
              stroke="#000000"
              strokeWidth="5"
            />

            {/* 3. Upper Green Band with Dot Patterns */}
            <path
              d="M 100 95 C 135 75, 265 75, 300 95 L 305 118 C 265 98, 135 98, 95 118 Z"
              fill="#227B38"
              stroke="#000000"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            {/* Green Band Diagonal Accents (Center-right fold) */}
            <path
              d="M 215 50 C 235 50, 275 80, 275 115 C 245 115, 205 85, 205 60 Z"
              fill="#227B38"
              stroke="#000000"
              strokeWidth="4"
            />

            {/* 4. Yellow Center Band with Red Dot Grid */}
            <path
              d="M 95 118 C 140 100, 260 100, 305 118 L 315 145 C 260 122, 140 122, 85 145 Z"
              fill="#F7B100"
              stroke="#000000"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            {/* 5. Lower Red Forehead Fold with Yellow/White Dots */}
            <path
              d="M 85 145 C 140 122, 260 122, 315 145 C 310 162, 280 168, 200 168 C 120 168, 90 162, 85 145 Z"
              fill="#E51E2B"
              stroke="#000000"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            {/* 6. Forehead Red Base Arch */}
            <path
              d="M 130 145 C 170 158, 230 158, 270 145 C 260 152, 140 152, 130 145 Z"
              fill="#D31524"
            />

            {/* ========================================================== */}
            {/* TURBAN DECORATIVE DOTS (AUTHENTIC BANDHANI / LEHERIYA)     */}
            {/* ========================================================== */}
            {/* Top Red Dome Dots (Yellow & White) */}
            <g fill="#F7B100">
              <circle cx="140" cy="55" r="2.8" />
              <circle cx="160" cy="50" r="2.8" />
              <circle cx="180" cy="48" r="2.8" />
              <circle cx="200" cy="48" r="2.8" />
              <circle cx="220" cy="50" r="2.8" />
              <circle cx="240" cy="55" r="2.8" />
              <circle cx="260" cy="62" r="2.8" />

              <circle cx="130" cy="68" r="2.5" />
              <circle cx="150" cy="64" r="2.5" />
              <circle cx="170" cy="60" r="2.5" />
              <circle cx="190" cy="58" r="2.5" />
              <circle cx="210" cy="58" r="2.5" />
              <circle cx="230" cy="60" r="2.5" />
              <circle cx="250" cy="64" r="2.5" />
              <circle cx="270" cy="68" r="2.5" />
            </g>

            {/* White Dots on Red Top */}
            <g fill="#FFFFFF">
              <circle cx="140" cy="62" r="2" />
              <circle cx="160" cy="57" r="2" />
              <circle cx="180" cy="54" r="2" />
              <circle cx="200" cy="54" r="2" />
              <circle cx="220" cy="56" r="2" />
              <circle cx="240" cy="60" r="2" />
            </g>

            {/* Green Band Dots (White & Yellow) */}
            <g fill="#FFFFFF">
              <circle cx="110" cy="104" r="2.2" />
              <circle cx="130" cy="98" r="2.2" />
              <circle cx="150" cy="94" r="2.2" />
              <circle cx="170" cy="92" r="2.2" />
              <circle cx="190" cy="90" r="2.2" />
              <circle cx="210" cy="90" r="2.2" />
              <circle cx="230" cy="92" r="2.2" />
              <circle cx="250" cy="94" r="2.2" />
              <circle cx="270" cy="98" r="2.2" />
              <circle cx="290" cy="104" r="2.2" />
            </g>
            <g fill="#F7B100">
              <circle cx="120" cy="106" r="2.2" />
              <circle cx="140" cy="101" r="2.2" />
              <circle cx="160" cy="98" r="2.2" />
              <circle cx="180" cy="96" r="2.2" />
              <circle cx="200" cy="95" r="2.2" />
              <circle cx="220" cy="96" r="2.2" />
              <circle cx="240" cy="98" r="2.2" />
              <circle cx="260" cy="101" r="2.2" />
              <circle cx="280" cy="106" r="2.2" />
            </g>

            {/* Yellow Band Red Dots */}
            <g fill="#E51E2B">
              <circle cx="105" cy="127" r="2.2" />
              <circle cx="125" cy="120" r="2.2" />
              <circle cx="145" cy="116" r="2.2" />
              <circle cx="165" cy="113" r="2.2" />
              <circle cx="185" cy="112" r="2.2" />
              <circle cx="205" cy="112" r="2.2" />
              <circle cx="225" cy="113" r="2.2" />
              <circle cx="245" cy="116" r="2.2" />
              <circle cx="265" cy="120" r="2.2" />
              <circle cx="285" cy="127" r="2.2" />

              <circle cx="115" cy="133" r="2.2" />
              <circle cx="135" cy="127" r="2.2" />
              <circle cx="155" cy="123" r="2.2" />
              <circle cx="175" cy="120" r="2.2" />
              <circle cx="195" cy="119" r="2.2" />
              <circle cx="215" cy="119" r="2.2" />
              <circle cx="235" cy="120" r="2.2" />
              <circle cx="255" cy="123" r="2.2" />
              <circle cx="275" cy="127" r="2.2" />
              <circle cx="295" cy="133" r="2.2" />
            </g>

            {/* Lower Red Band Yellow & White Dots */}
            <g fill="#FFFFFF">
              <circle cx="105" cy="150" r="2.2" />
              <circle cx="125" cy="144" r="2.2" />
              <circle cx="145" cy="140" r="2.2" />
              <circle cx="165" cy="138" r="2.2" />
              <circle cx="185" cy="136" r="2.2" />
              <circle cx="205" cy="136" r="2.2" />
              <circle cx="225" cy="138" r="2.2" />
              <circle cx="245" cy="140" r="2.2" />
              <circle cx="265" cy="144" r="2.2" />
              <circle cx="285" cy="150" r="2.2" />
            </g>
            <g fill="#F7B100">
              <circle cx="115" cy="155" r="2.2" />
              <circle cx="135" cy="150" r="2.2" />
              <circle cx="155" cy="146" r="2.2" />
              <circle cx="175" cy="144" r="2.2" />
              <circle cx="195" cy="143" r="2.2" />
              <circle cx="215" cy="143" r="2.2" />
              <circle cx="235" cy="144" r="2.2" />
              <circle cx="255" cy="146" r="2.2" />
              <circle cx="275" cy="150" r="2.2" />
              <circle cx="295" cy="155" r="2.2" />
            </g>

            {/* Left Turban Bulge White Dots */}
            <g fill="#FFFFFF">
              <circle cx="75" cy="135" r="2.2" />
              <circle cx="85" cy="120" r="2.2" />
              <circle cx="70" cy="155" r="2.2" />
              <circle cx="80" cy="165" r="2.2" />
              <circle cx="95" cy="175" r="2.2" />
            </g>

            {/* Right Turban Bulge White & Yellow Dots */}
            <g fill="#FFFFFF">
              <circle cx="325" cy="135" r="2.2" />
              <circle cx="315" cy="120" r="2.2" />
              <circle cx="330" cy="155" r="2.2" />
              <circle cx="320" cy="165" r="2.2" />
              <circle cx="305" cy="175" r="2.2" />
            </g>
            <g fill="#F7B100">
              <circle cx="320" cy="145" r="2" />
              <circle cx="310" cy="155" r="2" />
              <circle cx="325" cy="165" r="2" />
              <circle cx="295" cy="182" r="2" />
            </g>
          </g>
        </svg>

        {/* Small Accessibility Badge Pin */}
        {showBadge && (
          <div
            style={{
              transform: `translate3d(${mousePos.x * 4}px, ${mousePos.y * 4}px, 30px)`,
            }}
            className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 border border-white dark:border-slate-900 flex items-center justify-center text-white shadow-md z-30 pointer-events-none"
            title="Sugamya Accessibility AI"
          >
            <span className="text-[9px] font-bold leading-none">♿</span>
          </div>
        )}
      </div>

      {/* Interactive Tooltip on Hover */}
      {isHovered && (
        <div
          role="tooltip"
          className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-950/95 text-white text-[10px] font-bold rounded-md shadow-xl border border-amber-400/40 pointer-events-none whitespace-nowrap z-50 animate-in fade-in slide-in-from-bottom-1 duration-150 flex items-center gap-1 backdrop-blur-md"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>Namaste! Sugamya AI 🙏</span>
        </div>
      )}
    </div>
  );
};

export default IndianGuideAvatar3D;
