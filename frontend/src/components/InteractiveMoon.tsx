import React, { useState, useEffect, useRef } from 'react';

interface InteractiveMoonProps {
  size?: number; // diameter in pixels (default 48)
  initialSpinSpeed?: number; // degrees per second
  sunAngle?: number; // angle of directional light in degrees (default 60)
  interactive?: boolean; // allow drag/hover interaction
  className?: string;
}

// Lunar Maria and major craters for realistic 360° spherical projection
interface LunarFeature {
  name: string;
  lat: number; // -90 to +90
  lon: number; // -180 to +180
  radius: number; // relative size 0.05 - 0.45
  opacity: number;
}

const SEAMLESS_LUNAR_FEATURES: LunarFeature[] = [
  // Near-side Maria (Dark basaltic lowlands)
  { name: 'Oceanus Procellarum', lat: 18, lon: -57, radius: 0.38, opacity: 0.55 },
  { name: 'Mare Imbrium', lat: 33, lon: -16, radius: 0.28, opacity: 0.6 },
  { name: 'Mare Serenitatis', lat: 28, lon: 17, radius: 0.22, opacity: 0.58 },
  { name: 'Mare Tranquillitatis', lat: 8, lon: 31, radius: 0.24, opacity: 0.62 },
  { name: 'Mare Fecunditatis', lat: -7, lon: 51, radius: 0.20, opacity: 0.55 },
  { name: 'Mare Crisium', lat: 17, lon: 59, radius: 0.15, opacity: 0.65 },
  { name: 'Mare Nubium', lat: -21, lon: -16, radius: 0.22, opacity: 0.58 },
  { name: 'Mare Humorum', lat: -24, lon: -38, radius: 0.14, opacity: 0.6 },
  { name: 'Mare Nectaris', lat: -15, lon: 35, radius: 0.13, opacity: 0.55 },

  // Far-side Maria & major basins (Ensures completely seamless 360° rotation)
  { name: 'Mare Orientale', lat: -19, lon: -92, radius: 0.24, opacity: 0.6 },
  { name: 'Mare Moscoviense', lat: 27, lon: 147, radius: 0.19, opacity: 0.58 },
  { name: 'Mare Ingenii', lat: -33, lon: 163, radius: 0.18, opacity: 0.56 },
  { name: 'Tsiolkovskiy', lat: -20, lon: 129, radius: 0.12, opacity: 0.68 },
  { name: 'Hertzsprung', lat: 2, lon: -128, radius: 0.25, opacity: 0.52 },
  { name: 'Korolev', lat: -4, lon: -157, radius: 0.22, opacity: 0.54 },
  { name: 'Mendeleev', lat: 6, lon: 141, radius: 0.20, opacity: 0.5 },
  { name: 'South Pole-Aitken', lat: -53, lon: 170, radius: 0.35, opacity: 0.5 },
];

export const InteractiveMoon: React.FC<InteractiveMoonProps> = ({
  size = 48,
  initialSpinSpeed = 15, // deg/sec
  sunAngle = 45,
  interactive = true,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [rotationY, setRotationY] = useState<number>(0);
  const [rotationX, setRotationX] = useState<number>(6.68); // Moon's axial tilt
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const dragStartRef = useRef<{ x: number; y: number; rotY: number; rotX: number }>({ x: 0, y: 0, rotY: 0, rotX: 0 });
  const lastTimeRef = useRef<number>(performance.now());
  const reqFrameRef = useRef<number>(0);

  // Mouse / Touch handlers for subtle organic drag rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!interactive) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      rotY: rotationY,
      rotX: rotationX,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !interactive) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const sensitivity = 0.5;
    setRotationY(dragStartRef.current.rotY + dx * sensitivity);
    setRotationX(Math.max(-45, Math.min(45, dragStartRef.current.rotX - dy * sensitivity)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rotY = rotationY;
    let rotX = rotationX;

    const render = (now: number) => {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      // Smooth continuous spin when not actively dragging
      if (!isDragging) {
        const speed = isHovered ? initialSpinSpeed * 1.5 : initialSpinSpeed;
        rotY = (rotY + dt * speed) % 360;
        setRotationY(rotY);
      } else {
        rotY = rotationY;
        rotX = rotationX;
      }

      // Crisp rendering using device pixel ratio
      const dpr = window.devicePixelRatio || 1;
      const width = size;
      const height = size;
      
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.resetTransform();
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const radius = (Math.min(width, height) / 2) - 1; // tight fit, zero borders

      // 1. Clip exactly to the lunar sphere (NO outer borders, NO strokes)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      // 2. Base Regolith Sphere Gradient (highlands tone)
      const baseGrad = ctx.createRadialGradient(
        cx - radius * 0.35,
        cy - radius * 0.35,
        radius * 0.05,
        cx,
        cy,
        radius
      );
      baseGrad.addColorStop(0, '#EAE4D6'); // Bright highlands sunward
      baseGrad.addColorStop(0.55, '#C8C0AF'); // Midtone regolith
      baseGrad.addColorStop(1, '#8A8272'); // Limb shadow
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, width, height);

      // 3. Realistic 3D Orthographic Projection of Lunar Maria Plains
      const radRotY = (rotY * Math.PI) / 180;
      const radRotX = (rotX * Math.PI) / 180;

      SEAMLESS_LUNAR_FEATURES.forEach((feature) => {
        const phi = (feature.lat * Math.PI) / 180;
        const lambda = (feature.lon * Math.PI) / 180;

        // 3D Cartesian coordinates on unit sphere
        const x0 = Math.cos(phi) * Math.sin(lambda);
        const y0 = -Math.sin(phi);
        const z0 = Math.cos(phi) * Math.cos(lambda);

        // Rotation around Y (spin)
        const x1 = x0 * Math.cos(radRotY) + z0 * Math.sin(radRotY);
        const y1 = y0;
        const z1 = -x0 * Math.sin(radRotY) + z0 * Math.cos(radRotY);

        // Rotation around X (tilt)
        const x2 = x1;
        const y2 = y1 * Math.cos(radRotX) - z1 * Math.sin(radRotX);
        const z2 = y1 * Math.sin(radRotX) + z1 * Math.cos(radRotX);

        // Draw only on visible hemisphere
        if (z2 > -0.05) {
          const screenX = cx + x2 * radius;
          const screenY = cy + y2 * radius;
          const foreshortening = Math.max(0.15, z2);
          const fRadius = radius * feature.radius * foreshortening;

          // Soft organic mare bed gradient
          const mareGrad = ctx.createRadialGradient(
            screenX,
            screenY,
            fRadius * 0.1,
            screenX,
            screenY,
            Math.max(1, fRadius)
          );
          mareGrad.addColorStop(0, `rgba(40, 36, 30, ${feature.opacity})`);
          mareGrad.addColorStop(0.7, `rgba(50, 46, 38, ${feature.opacity * 0.6})`);
          mareGrad.addColorStop(1, 'rgba(60, 56, 48, 0)');

          ctx.fillStyle = mareGrad;
          ctx.beginPath();
          ctx.arc(screenX, screenY, Math.max(1, fRadius), 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 4. Subtle Micro-Crater Ray Highlights (e.g. Tycho/Copernicus ejecta)
      const craterPositions = [
        { lat: -43, lon: -11, size: 0.06 }, // Tycho
        { lat: 10, lon: -20, size: 0.05 },  // Copernicus
        { lat: 23, lon: -47, size: 0.04 },  // Aristarchus
      ];

      craterPositions.forEach((c) => {
        const phi = (c.lat * Math.PI) / 180;
        const lambda = (c.lon * Math.PI) / 180;
        const x0 = Math.cos(phi) * Math.sin(lambda);
        const y0 = -Math.sin(phi);
        const z0 = Math.cos(phi) * Math.cos(lambda);

        const x1 = x0 * Math.cos(radRotY) + z0 * Math.sin(radRotY);
        const y1 = y0;
        const z1 = -x0 * Math.sin(radRotY) + z0 * Math.cos(radRotY);

        const x2 = x1;
        const y2 = y1 * Math.cos(radRotX) - z1 * Math.sin(radRotX);
        const z2 = y1 * Math.sin(radRotX) + z1 * Math.cos(radRotX);

        if (z2 > 0) {
          const sx = cx + x2 * radius;
          const sy = cy + y2 * radius;
          ctx.fillStyle = `rgba(250, 246, 238, ${0.45 * z2})`;
          ctx.beginPath();
          ctx.arc(sx, sy, Math.max(1, radius * c.size * z2), 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 5. Natural Terminator Sunlight & Night Phase Shading (Seamless 3D sphere volume)
      const sunRad = (sunAngle * Math.PI) / 180;
      const termGrad = ctx.createLinearGradient(
        cx - Math.cos(sunRad) * radius * 1.05,
        cy - Math.sin(sunRad) * radius * 1.05,
        cx + Math.cos(sunRad) * radius * 1.05,
        cy + Math.sin(sunRad) * radius * 1.05
      );

      termGrad.addColorStop(0, 'rgba(18, 16, 14, 0.92)'); // Nightside deep shadow
      termGrad.addColorStop(0.42, 'rgba(25, 23, 20, 0.7)'); // Umbra transition
      termGrad.addColorStop(0.56, 'rgba(30, 28, 24, 0.2)'); // Penumbra
      termGrad.addColorStop(0.72, 'rgba(255, 255, 255, 0)'); // Sunlight
      termGrad.addColorStop(1, 'rgba(255, 255, 255, 0.08)'); // Subtle crest sheen

      ctx.fillStyle = termGrad;
      ctx.fillRect(0, 0, width, height);

      ctx.restore(); // End sphere clip (Zero strokes, zero borders, zero details around it)

      reqFrameRef.current = requestAnimationFrame(render);
    };

    reqFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (reqFrameRef.current) {
        cancelAnimationFrame(reqFrameRef.current);
      }
    };
  }, [size, initialSpinSpeed, isDragging, isHovered, rotationY, rotationX, sunAngle, interactive]);

  // Window mouse up listener for smooth drag release
  useEffect(() => {
    const onWindowMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', onWindowMouseUp);
    return () => window.removeEventListener('mouseup', onWindowMouseUp);
  }, []);

  return (
    <div 
      className={`inline-block select-none ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ width: size, height: size }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size, display: 'block' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="rounded-full cursor-grab active:cursor-grabbing"
      />
    </div>
  );
};
