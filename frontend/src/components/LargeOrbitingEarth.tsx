import React, { useState, useEffect, useRef } from 'react';

interface OrbitSatellite {
  id: number;
  type: 'cubesat' | 'telecom' | 'radar' | 'station' | 'gps' | 'micro' | 'probe';
  radiusX: number; // rx in px
  radiusY: number; // ry in px
  tilt: number; // rotation in deg of the orbital plane
  speed: number; // angular speed multiplier
  phase: number; // initial angle in radians
  color: string;
  size: number;
  eccentricity?: number;
}

// 24+ diverse realistic Earth satellites across various orbital planes
const SATELLITE_CONSTELLATION: OrbitSatellite[] = [
  // 1. Equatorial LEO Constellation (Fast low orbiters around larger Earth)
  { id: 1, type: 'cubesat', radiusX: 285, radiusY: 82, tilt: 0, speed: 0.95, phase: 0.2, color: '#E5C76B', size: 14 },
  { id: 2, type: 'micro', radiusX: 295, radiusY: 86, tilt: 3, speed: 0.88, phase: 2.1, color: '#38BDF8', size: 11 },
  { id: 3, type: 'telecom', radiusX: 305, radiusY: 88, tilt: -4, speed: 0.92, phase: 4.2, color: '#FAF6EE', size: 16 },
  { id: 4, type: 'cubesat', radiusX: 290, radiusY: 84, tilt: 2, speed: 0.85, phase: 5.5, color: '#DC143C', size: 13 },

  // 2. Mid-Inclination Orbital Plane (~28° to 35° like ISS / Shuttle)
  { id: 5, type: 'station', radiusX: 320, radiusY: 118, tilt: 28, speed: 0.72, phase: 0.8, color: '#FAF6EE', size: 18 },
  { id: 6, type: 'radar', radiusX: 330, radiusY: 122, tilt: 32, speed: 0.68, phase: 2.6, color: '#E5C76B', size: 15 },
  { id: 7, type: 'cubesat', radiusX: 325, radiusY: 120, tilt: 30, speed: 0.75, phase: 4.8, color: '#C5A945', size: 12 },
  { id: 8, type: 'telecom', radiusX: 335, radiusY: 125, tilt: 34, speed: 0.65, phase: 1.5, color: '#38BDF8', size: 16 },

  // 3. Polar & Sun-Synchronous (~75° to 90° North-South Sweepers)
  { id: 9, type: 'radar', radiusX: 345, radiusY: 140, tilt: 78, speed: 0.58, phase: 0.4, color: '#FAF6EE', size: 17 },
  { id: 10, type: 'probe', radiusX: 340, radiusY: 135, tilt: 82, speed: 0.62, phase: 2.3, color: '#DC143C', size: 14 },
  { id: 11, type: 'micro', radiusX: 350, radiusY: 145, tilt: 75, speed: 0.55, phase: 3.9, color: '#38BDF8', size: 11 },
  { id: 12, type: 'cubesat', radiusX: 335, radiusY: 132, tilt: 88, speed: 0.60, phase: 5.2, color: '#E5C76B', size: 12 },

  // 4. Retrograde Tilted Plane (~-45° to -55°)
  { id: 13, type: 'telecom', radiusX: 365, radiusY: 155, tilt: -48, speed: 0.52, phase: 1.1, color: '#FAF6EE', size: 17 },
  { id: 14, type: 'cubesat', radiusX: 370, radiusY: 160, tilt: -52, speed: 0.48, phase: 3.4, color: '#C5A945', size: 13 },
  { id: 15, type: 'gps', radiusX: 375, radiusY: 162, tilt: -45, speed: 0.50, phase: 5.0, color: '#38BDF8', size: 16 },
  { id: 16, type: 'radar', radiusX: 360, radiusY: 152, tilt: -55, speed: 0.54, phase: 2.0, color: '#C5A945', size: 15 },

  // 5. Medium Earth Orbit (MEO / Navigation Constellation, ~55°)
  { id: 17, type: 'gps', radiusX: 395, radiusY: 175, tilt: 55, speed: 0.38, phase: 0.6, color: '#FAF6EE', size: 16 },
  { id: 18, type: 'gps', radiusX: 400, radiusY: 178, tilt: 55, speed: 0.38, phase: 2.7, color: '#E5C76B', size: 16 },
  { id: 19, type: 'gps', radiusX: 405, radiusY: 180, tilt: 55, speed: 0.38, phase: 4.8, color: '#38BDF8', size: 16 },
  { id: 20, type: 'telecom', radiusX: 390, radiusY: 170, tilt: -30, speed: 0.42, phase: 1.8, color: '#DC143C', size: 15 },

  // 6. High Altitude / Geostationary Outer Ring (GEO, large orbit, slow majestic drift)
  { id: 21, type: 'telecom', radiusX: 440, radiusY: 200, tilt: -12, speed: 0.26, phase: 0.3, color: '#FAF6EE', size: 19 },
  { id: 22, type: 'station', radiusX: 450, radiusY: 205, tilt: 15, speed: 0.24, phase: 2.2, color: '#E5C76B', size: 20 },
  { id: 23, type: 'radar', radiusX: 445, radiusY: 202, tilt: -8, speed: 0.28, phase: 3.8, color: '#38BDF8', size: 16 },
  { id: 24, type: 'probe', radiusX: 455, radiusY: 208, tilt: 22, speed: 0.22, phase: 5.4, color: '#FAF6EE', size: 15 },
  { id: 25, type: 'cubesat', radiusX: 435, radiusY: 195, tilt: -20, speed: 0.30, phase: 1.2, color: '#C5A945', size: 12 },
  { id: 26, type: 'micro', radiusX: 460, radiusY: 212, tilt: 8, speed: 0.20, phase: 4.4, color: '#DC143C', size: 12 },
];

export const LargeOrbitingEarth: React.FC = () => {
  const [earthAngle, setEarthAngle] = useState(0);
  const [time, setTime] = useState(0);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    const animate = (now: number) => {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      setEarthAngle((prev) => (prev + dt * 10) % 360);
      setTime((prev) => prev + dt);

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  // Compute 3D satellite positions
  const computedSats = SATELLITE_CONSTELLATION.map((sat) => {
    const angle = (time * sat.speed + sat.phase) % (Math.PI * 2);
    
    // Position in untilted orbital plane (Z represents depth into screen)
    const unRotX = sat.radiusX * Math.cos(angle);
    const unRotY = sat.radiusY * Math.sin(angle);
    const z = Math.sin(angle); // Positive = in front, Negative = behind Earth

    // Apply 2D tilt rotation around center
    const tiltRad = (sat.tilt * Math.PI) / 180;
    const cosTilt = Math.cos(tiltRad);
    const sinTilt = Math.sin(tiltRad);

    const x = unRotX * cosTilt - unRotY * sinTilt;
    const y = unRotX * sinTilt + unRotY * cosTilt;

    // Heading calculation along orbit tangent
    const nextAngle = angle + 0.05;
    const nextUnRotX = sat.radiusX * Math.cos(nextAngle);
    const nextUnRotY = sat.radiusY * Math.sin(nextAngle);
    const nextX = nextUnRotX * cosTilt - nextUnRotY * sinTilt;
    const nextY = nextUnRotX * sinTilt + nextUnRotY * cosTilt;
    const heading = (Math.atan2(nextY - y, nextX - x) * 180) / Math.PI;

    return {
      ...sat,
      x: 400 + x,
      y: 400 + y,
      z,
      heading,
      isBehind: z < -0.15 && Math.hypot(x, y) < 215,
    };
  });

  // Dedicated Orbital Moon (Luna) Calculation
  const moonAngle = (time * 0.16 + 1.8) % (Math.PI * 2);
  const moonRx = 490;
  const moonRy = 225;
  const moonTilt = -25;
  const moonTiltRad = (moonTilt * Math.PI) / 180;
  const moonUnRotX = moonRx * Math.cos(moonAngle);
  const moonUnRotY = moonRy * Math.sin(moonAngle);
  const moonZ = Math.sin(moonAngle);
  const moonX = 450 + (moonUnRotX * Math.cos(moonTiltRad) - moonUnRotY * Math.sin(moonTiltRad));
  const moonY = 450 + (moonUnRotX * Math.sin(moonTiltRad) + moonUnRotY * Math.cos(moonTiltRad));
  const moonSpin = (time * 24) % 360; // Luna axial rotation

  // Separate background satellites (behind Earth) and foreground satellites (in front)
  const backSats = computedSats.filter((s) => s.z < 0);
  const frontSats = computedSats.filter((s) => s.z >= 0);

  // Render Moon SVG Component
  const renderMoon = () => {
    const isFront = moonZ >= 0;
    const opacity = isFront ? 1 : 0.7;
    const scale = isFront ? 1.05 : 0.95;

    return (
      <g
        key="orbital-luna"
        transform={`translate(${moonX}, ${moonY}) scale(${scale})`}
        opacity={opacity}
        className="pointer-events-none select-none"
      >
        {/* Shaded Seamless Moon Sphere */}
        <g clipPath="url(#moonClipCircle)">
          {/* Base Highlands Tone */}
          <circle cx="0" cy="0" r="14" fill="#D0C8B8" />
          
          {/* Rotating Lunar Maria Pattern */}
          <ellipse 
            cx={-3 + Math.sin((moonSpin * Math.PI) / 180) * 8} 
            cy="-2" 
            rx="5" 
            ry="4" 
            fill="#5E574D" 
            opacity="0.65" 
          />
          <ellipse 
            cx={4 + Math.sin(((moonSpin + 90) * Math.PI) / 180) * 8} 
            cy="3" 
            rx="6" 
            ry="4.5" 
            fill="#524C43" 
            opacity="0.7" 
          />
          <circle 
            cx={Math.sin(((moonSpin + 180) * Math.PI) / 180) * 8} 
            cy="-5" 
            r="3.5" 
            fill="#645C52" 
            opacity="0.6" 
          />

          {/* Smooth Terminator Shading */}
          <path d="M 0,-14 A 14 14 0 0 1 0,14 Q -7,0 0,-14 Z" fill="#1A1A1A" opacity="0.6" />
        </g>
      </g>
    );
  };

  // Render individual satellite glyphs based on type
  const renderSatShape = (sat: typeof computedSats[0]) => {
    const isFront = sat.z >= 0;
    const scale = (sat.size / 14) * (isFront ? 1 + sat.z * 0.15 : 0.85);
    const opacity = isFront ? 0.95 : 0.45;

    return (
      <g
        key={sat.id}
        transform={`translate(${sat.x}, ${sat.y}) rotate(${sat.heading}) scale(${scale})`}
        opacity={sat.isBehind ? 0.08 : opacity}
        className="transition-opacity duration-300 pointer-events-none"
      >
        {/* Subtle glow filter when in foreground */}
        {isFront && (
          <circle cx="0" cy="0" r="12" fill={sat.color} opacity="0.15" />
        )}

        {sat.type === 'station' && (
          <g>
            {/* Long Truss */}
            <line x1="-16" y1="0" x2="16" y2="0" stroke="#FAF6EE" strokeWidth="1.8" />
            {/* Solar Arrays Quad */}
            <rect x="-14" y="-8" width="5" height="16" rx="0.5" fill="#1D4A66" stroke="#FAF6EE" strokeWidth="0.6" />
            <rect x="-8" y="-8" width="5" height="16" rx="0.5" fill="#1D4A66" stroke="#FAF6EE" strokeWidth="0.6" />
            <rect x="3" y="-8" width="5" height="16" rx="0.5" fill="#1D4A66" stroke="#FAF6EE" strokeWidth="0.6" />
            <rect x="9" y="-8" width="5" height="16" rx="0.5" fill="#1D4A66" stroke="#FAF6EE" strokeWidth="0.6" />
            {/* Central Pressurized Module & Cupola */}
            <rect x="-3" y="-3.5" width="6" height="7" rx="1.5" fill="#FAF6EE" stroke="#1A1A1A" strokeWidth="0.8" />
            <circle cx="0" cy="0" r="1.5" fill="#DC143C" />
          </g>
        )}

        {sat.type === 'telecom' && (
          <g>
            {/* Left Solar Panel */}
            <rect x="-12" y="-3" width="7" height="6" rx="0.5" fill="#1D4A66" stroke="#FAF6EE" strokeWidth="0.5" />
            {/* Right Solar Panel */}
            <rect x="5" y="-3" width="7" height="6" rx="0.5" fill="#1D4A66" stroke="#FAF6EE" strokeWidth="0.5" />
            {/* Gold Chassis */}
            <rect x="-4" y="-4" width="8" height="8" rx="1" fill="#C5A945" stroke="#1A1A1A" strokeWidth="0.8" />
            {/* Dish */}
            <path d="M 0,-4 Q 3,-7 6,-4" stroke="#FAF6EE" strokeWidth="0.8" fill="none" />
            <circle cx="0" cy="0" r="1.2" fill={sat.color} />
          </g>
        )}

        {sat.type === 'radar' && (
          <g>
            {/* Synthetic Aperture Radar (SAR) Long Panel */}
            <rect x="-14" y="-2" width="28" height="4" rx="0.8" fill="#E5C76B" stroke="#1A1A1A" strokeWidth="0.7" />
            <rect x="-4" y="-5" width="8" height="10" rx="1" fill="#25323A" stroke="#FAF6EE" strokeWidth="0.6" />
            <circle cx="0" cy="0" r="1.2" fill="#38BDF8" />
          </g>
        )}

        {sat.type === 'gps' && (
          <g>
            <rect x="-10" y="-2.5" width="6" height="5" rx="0.5" fill="#1D4A66" stroke="#FAF6EE" strokeWidth="0.5" />
            <rect x="4" y="-2.5" width="6" height="5" rx="0.5" fill="#1D4A66" stroke="#FAF6EE" strokeWidth="0.5" />
            <polygon points="-3,-3 3,-3 4,3 -4,3" fill="#FAF6EE" stroke="#1A1A1A" strokeWidth="0.8" />
            <circle cx="0" cy="0" r="1.2" fill="#DC143C" />
          </g>
        )}

        {sat.type === 'cubesat' && (
          <g>
            {/* 3U/6U CubeSat Body */}
            <rect x="-5" y="-5" width="10" height="10" rx="1" fill="#C5A945" stroke="#1A1A1A" strokeWidth="0.8" />
            {/* Solar Surface Cells */}
            <rect x="-3.5" y="-3.5" width="7" height="7" fill="#164E63" />
            <line x1="0" y1="-3.5" x2="0" y2="3.5" stroke="#FAF6EE" strokeWidth="0.5" />
            <circle cx="0" cy="0" r="1" fill="#FAF6EE" />
          </g>
        )}

        {sat.type === 'micro' && (
          <g>
            <circle cx="0" cy="0" r="3.5" fill={sat.color} stroke="#1A1A1A" strokeWidth="0.8" />
            <line x1="-5" y1="0" x2="5" y2="0" stroke="#FAF6EE" strokeWidth="0.6" />
          </g>
        )}

        {sat.type === 'probe' && (
          <g>
            <polygon points="0,-6 5,4 -5,4" fill="#FAF6EE" stroke="#1A1A1A" strokeWidth="0.8" />
            <line x1="0" y1="4" x2="0" y2="8" stroke="#DC143C" strokeWidth="0.8" />
            <circle cx="0" cy="0" r="1.2" fill="#FFE58F" />
          </g>
        )}
      </g>
    );
  };

  return (
    <div className="relative w-full max-w-[1050px] h-[580px] sm:h-[660px] md:h-[720px] mx-auto flex items-center justify-center pointer-events-none select-none overflow-visible my-2">
      
      {/* Anchor element for the two background satellites to track and orbit */}
      <div 
        id="large-earth-center" 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 pointer-events-none" 
      />

      <svg 
        viewBox="0 0 900 900" 
        className="w-full h-full max-w-[900px] max-h-[900px] overflow-visible drop-shadow-[0_20px_40px_rgba(26,24,21,0.25)]"
      >
        <defs>
          {/* Deep Spherical Ocean Radial Gradient */}
          <radialGradient id="largeEarthAtmosphere" cx="35%" cy="30%" r="72%">
            <stop offset="0%" stopColor="#3F5A6F" />
            <stop offset="35%" stopColor="#253C4C" />
            <stop offset="70%" stopColor="#172733" />
            <stop offset="90%" stopColor="#0F1A22" />
            <stop offset="100%" stopColor="#091016" />
          </radialGradient>

          {/* Atmospheric Halo Glow */}
          <radialGradient id="outerAtmosphereGlow" cx="50%" cy="50%" r="50%">
            <stop offset="65%" stopColor="#38BDF8" stopOpacity="0" />
            <stop offset="82%" stopColor="#38BDF8" stopOpacity="0.25" />
            <stop offset="93%" stopColor="#C5A945" stopOpacity="0.4" />
            <stop offset="98%" stopColor="#FAF6EE" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#FAF6EE" stopOpacity="0" />
          </radialGradient>

          {/* Sphere Clip Path for revolving surface continents (Larger Radius r=215) */}
          <clipPath id="largeEarthSphereClip">
            <circle cx="450" cy="450" r="215" />
          </clipPath>

          {/* Moon Sphere Clip Path */}
          <clipPath id="moonClipCircle">
            <circle cx="0" cy="0" r="14" />
          </clipPath>

          {/* Landmass Shading Linear Gradient */}
          <linearGradient id="landmassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#678A5C" />
            <stop offset="50%" stopColor="#4D6B44" />
            <stop offset="100%" stopColor="#374F30" />
          </linearGradient>
        </defs>

        {/* 1. FAINT ORBITAL TRACK RINGS */}
        <g className="opacity-45">
          {/* Equatorial Orbit */}
          <ellipse cx="450" cy="450" rx="290" ry="84" fill="none" stroke="#C5A945" strokeWidth="1" strokeDasharray="4 5" />
          {/* Tilted ISS Orbit */}
          <ellipse cx="450" cy="450" rx="325" ry="120" fill="none" stroke="#C5A945" strokeWidth="1.1" strokeDasharray="4 5" transform="rotate(30, 450, 450)" />
          {/* Polar Orbit */}
          <ellipse cx="450" cy="450" rx="345" ry="140" fill="none" stroke="#DC143C" strokeWidth="1.3" strokeDasharray="3 5" transform="rotate(78, 450, 450)" />
          {/* Retrograde Orbit */}
          <ellipse cx="450" cy="450" rx="370" ry="160" fill="none" stroke="#C5A945" strokeWidth="1.1" strokeDasharray="5 5" transform="rotate(-50, 450, 450)" />
          {/* MEO GPS Orbit */}
          <ellipse cx="450" cy="450" rx="400" ry="178" fill="none" stroke="#38BDF8" strokeWidth="1.1" strokeDasharray="3 6" transform="rotate(55, 450, 450)" />
          {/* GEO Outer Ring */}
          <ellipse cx="450" cy="450" rx="450" ry="205" fill="none" stroke="#FAF6EE" strokeWidth="1" strokeDasharray="5 7" transform="rotate(15, 450, 450)" />
          {/* Lunar Distance Orbit Track (Luna) */}
          <ellipse cx="450" cy="450" rx="490" ry="225" fill="none" stroke="#FAF6EE" strokeWidth="1.2" strokeDasharray="4 8" opacity="0.75" transform="rotate(-25, 450, 450)" />
        </g>

        {/* 2. BACKGROUND SATELLITES & MOON (BEHIND EARTH) */}
        <g transform="translate(50, 50)">{backSats.map(renderSatShape)}</g>
        {moonZ < 0 && renderMoon()}

        {/* 3. EARTH ATMOSPHERE HALO & SOFT OUTER GLOW */}
        <circle cx="450" cy="450" r="248" fill="url(#outerAtmosphereGlow)" />
        <circle cx="450" cy="450" r="226" fill="none" stroke="#38BDF8" strokeWidth="2" strokeDasharray="6 4" opacity="0.8" />
        <circle cx="450" cy="450" r="220" fill="none" stroke="#C5A945" strokeWidth="1" opacity="0.9" />
        
        {/* 4. EARTH MAIN SPHERE BASE (OCEAN) */}
        <circle 
          cx="450" 
          cy="450" 
          r="215" 
          fill="url(#largeEarthAtmosphere)" 
          stroke="#1A1A1A" 
          strokeWidth="4" 
        />

        {/* 5. EARTH CONTINENTS & BOUNDARIES (EXACT WESTERN HEMISPHERE ICON GEOMETRY) */}
        <g clipPath="url(#largeEarthSphereClip)">
          {/* Ocean Grid Background */}
          <rect x="200" y="200" width="500" height="500" fill="#1C303E" opacity="0.6" />

          {/* Revolving Longitude Meridian Arcs */}
          {[-80, -60, -40, -20, 0, 20, 40, 60, 80, 100, 120].map((offset, i) => {
            const dynOffsetAngle = (earthAngle * 1.5 + offset * 3) % 360;
            const dynRad = (dynOffsetAngle * Math.PI) / 180;
            const dynX = 450 + Math.sin(dynRad) * 195;
            const rxVal = Math.abs(Math.cos(dynRad) * 60) + 2;

            return (
              <ellipse
                key={i}
                cx={dynX}
                cy="450"
                rx={rxVal}
                ry="214"
                fill="none"
                stroke="#E5C76B"
                strokeWidth="1"
                strokeDasharray="3 4"
                className="opacity-45"
              />
            );
          })}

          {/* Latitude Concentric Rings */}
          {[-150, -100, -50, 0, 50, 100, 150].map((latOffset, i) => (
            <line
              key={i}
              x1="240"
              y1={450 + latOffset}
              x2="660"
              y2={450 + latOffset}
              stroke="#C5A945"
              strokeWidth="0.9"
              strokeDasharray="2 4"
              className="opacity-40"
            />
          ))}

          {/* Latitude Equator Line (Tilted Red Line) */}
          <line x1="235" y1="450" x2="665" y2="450" stroke="#DC143C" strokeWidth="2" className="opacity-90" />

          {/* REVOLVING REALISTIC WESTERN & GLOBAL CONTINENTS FROM EARTH-WEST SVGREPO */}
          {[0, 230, 460].map((shift, idx) => {
            const shiftX = (earthAngle * 1.8 + shift) % 690;
            return (
              <g key={idx} transform={`translate(${100 + shiftX}, 0)`} className="opacity-95">
                
                {/* 1. NORTH AMERICA CONTINENT (Icon exact boundaries) */}
                <path
                  d="M 120,330 
                     C 105,335 95,350 110,365 
                     C 120,375 140,360 155,345 
                     C 175,325 185,305 210,310 
                     C 225,315 240,335 250,355 
                     C 260,375 255,395 245,410 
                     C 230,430 210,435 215,455 
                     C 220,470 240,480 250,495 
                     C 255,505 250,515 240,515 
                     C 225,515 220,495 205,485 
                     C 195,475 180,480 175,470 
                     C 165,450 175,430 160,415 
                     C 145,400 130,410 120,395 
                     C 110,380 90,385 85,370 
                     C 80,355 100,340 120,330 Z"
                  fill="url(#landmassGradient)"
                  stroke="#8EAF83"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />

                {/* 2. GREENLAND ISLAND (Icon boundary) */}
                <path
                  d="M 270,290 
                     C 285,280 310,285 320,305 
                     C 325,320 310,340 295,345 
                     C 280,350 265,335 260,320 
                     C 255,305 260,295 270,290 Z"
                  fill="url(#landmassGradient)"
                  stroke="#FAF6EE"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />

                {/* 3. SOUTH AMERICA CONTINENT (Icon exact boundaries) */}
                <path
                  d="M 240,515 
                     C 265,525 295,545 315,570 
                     C 335,600 340,635 325,665 
                     C 310,695 285,720 270,755 
                     C 260,775 250,800 245,820 
                     C 240,810 235,785 235,760 
                     C 235,730 245,700 240,670 
                     C 235,640 215,615 210,585 
                     C 205,555 220,530 240,515 Z"
                  fill="url(#landmassGradient)"
                  stroke="#8EAF83"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />

                {/* 4. ANTARCTICA BOTTOM CONTINENT */}
                <path
                  d="M 180,845 
                     C 210,825 250,815 290,830 
                     C 330,845 370,835 410,855 
                     C 430,865 390,890 350,895 
                     C 300,900 240,895 190,885 Z"
                  fill="#FAF6EE"
                  stroke="#38BDF8"
                  strokeWidth="1.5"
                  opacity="0.9"
                />

                {/* 5. EURASIA & AFRICA (Western coast contour visible on horizon) */}
                <path
                  d="M 390,320 
                     C 420,305 455,325 480,355 
                     C 505,390 495,435 465,470 
                     C 475,520 455,580 420,620 
                     C 395,650 370,620 365,580 
                     C 360,540 380,500 375,460 
                     C 370,420 355,390 360,350 
                     C 365,330 375,325 390,320 Z"
                  fill="url(#landmassGradient)"
                  stroke="#8EAF83"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />

                {/* Oceanic Archipelagos & Caribbean Islands */}
                <circle cx="230" cy="495" r="4.5" fill="#C5A945" stroke="#1A1A1A" strokeWidth="0.6" />
                <circle cx="245" cy="505" r="3.5" fill="#C5A945" stroke="#1A1A1A" strokeWidth="0.6" />
                <circle cx="160" cy="335" r="5" fill="#8EAF83" />
                <circle cx="140" cy="320" r="4" fill="#8EAF83" />
              </g>
            );
          })}

          {/* North Polar Ice Cap */}
          <ellipse cx="450" cy="245" rx="90" ry="24" fill="#FAF6EE" opacity="0.9" stroke="#38BDF8" strokeWidth="1" />

          {/* Atmospheric Terminator Day/Night Soft Curved Shadow */}
          <path
            d="M 450,235 A 215 215 0 0 1 450,665 Q 340,450 450,235 Z"
            fill="#06090D"
            opacity="0.45"
          />
        </g>

        {/* 6. BOLD ICON OUTER RING (Matching earth-west svgrepo icon rim) */}
        <circle 
          cx="450" 
          cy="450" 
          r="215" 
          fill="none" 
          stroke="#1A1A1A" 
          strokeWidth="14" 
        />
        <circle 
          cx="450" 
          cy="450" 
          r="222" 
          fill="none" 
          stroke="#C5A945" 
          strokeWidth="1.5" 
          opacity="0.8" 
        />

        {/* 7. FOREGROUND SATELLITES & MOON (REVOLVING IN FRONT OF EARTH) */}
        <g transform="translate(50, 50)">{frontSats.map(renderSatShape)}</g>
        {moonZ >= 0 && renderMoon()}

      </svg>
    </div>
  );
};
