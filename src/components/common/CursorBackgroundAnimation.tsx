import React, { useEffect, useRef, useState } from 'react';
import { useAccessibility } from '../../context/AccessibilityContext';

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  pulseSpeed: number;
  pulseVal: number;
}

interface ClickRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

interface CursorTrailPoint {
  x: number;
  y: number;
  age: number;
  size: number;
}

export const CursorBackgroundAnimation: React.FC = () => {
  const { reducedMotion } = useAccessibility();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mouse coords with spring interpolation
  const mouseRef = useRef({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 500,
    targetX: typeof window !== 'undefined' ? window.innerWidth / 2 : 500,
    targetY: typeof window !== 'undefined' ? window.innerHeight / 2 : 500,
    isHovering: false,
    speed: 0,
    prevX: 0,
    prevY: 0,
  });

  const [mousePos, setMousePos] = useState({ x: -500, y: -500 });
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Detect dark mode from html class
  useEffect(() => {
    const checkDark = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Initialize particles
    const particleCount = Math.min(Math.floor((width * height) / 22000), 45);
    const particles: Particle[] = [];
    const colorPaletteDark = [
      'rgba(59, 130, 246, ', // blue
      'rgba(99, 102, 241, ', // indigo
      'rgba(14, 165, 233, ', // sky
      'rgba(20, 184, 166, ', // teal
      'rgba(168, 85, 247, ', // purple
    ];
    const colorPaletteLight = [
      'rgba(37, 99, 235, ', // blue
      'rgba(79, 70, 229, ', // indigo
      'rgba(2, 132, 199, ', // sky
      'rgba(13, 148, 136, ', // teal
    ];

    for (let i = 0; i < particleCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const palette = isDarkMode ? colorPaletteDark : colorPaletteLight;
      particles.push({
        x,
        y,
        baseX: x,
        baseY: y,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2.5 + 1.2,
        color: palette[Math.floor(Math.random() * palette.length)],
        alpha: Math.random() * 0.4 + 0.15,
        pulseSpeed: Math.random() * 0.03 + 0.01,
        pulseVal: Math.random() * Math.PI,
      });
    }

    const ripples: ClickRipple[] = [];
    const trailPoints: CursorTrailPoint[] = [];

    // Resize handler
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    // Pointer move listener
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      let clientX = 0;
      let clientY = 0;
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }

      mouseRef.current.targetX = clientX;
      mouseRef.current.targetY = clientY;
      mouseRef.current.isHovering = true;

      // Add to trail
      if (Math.random() > 0.3) {
        trailPoints.push({
          x: clientX,
          y: clientY,
          age: 0,
          size: Math.random() * 3 + 1.5,
        });
        if (trailPoints.length > 25) {
          trailPoints.shift();
        }
      }
    };

    const handlePointerLeave = () => {
      mouseRef.current.isHovering = false;
    };

    const handlePointerDown = (e: MouseEvent) => {
      ripples.push({
        x: e.clientX,
        y: e.clientY,
        radius: 0,
        maxRadius: Math.random() * 50 + 60,
        alpha: 0.6,
        color: isDarkMode ? 'rgba(96, 165, 250, ' : 'rgba(59, 130, 246, ',
      });
      if (ripples.length > 6) {
        ripples.shift();
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('touchstart', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('mouseleave', handlePointerLeave);
    window.addEventListener('mousedown', handlePointerDown);

    // Animation Loop
    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      // Smooth mouse interpolation (lerp)
      const mouse = mouseRef.current;
      const dx = mouse.targetX - mouse.x;
      const dy = mouse.targetY - mouse.y;
      mouse.x += dx * 0.09;
      mouse.y += dy * 0.09;

      // Calculate speed
      const moveDist = Math.hypot(mouse.x - mouse.prevX, mouse.y - mouse.prevY);
      mouse.speed = mouse.speed * 0.85 + moveDist * 0.15;
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;

      setMousePos({ x: mouse.x, y: mouse.y });

      // 1. Draw Cursor Halo / Dynamic Radiant Spotlight on Canvas
      if (mouse.x > 0 && mouse.y > 0) {
        const glowRadius = Math.min(260 + mouse.speed * 4, 380);
        const gradient = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          glowRadius
        );

        if (isDarkMode) {
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
          gradient.addColorStop(0.35, 'rgba(99, 102, 241, 0.08)');
          gradient.addColorStop(0.7, 'rgba(14, 165, 233, 0.03)');
          gradient.addColorStop(1, 'rgba(15, 23, 42, 0)');
        } else {
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.10)');
          gradient.addColorStop(0.4, 'rgba(99, 102, 241, 0.05)');
          gradient.addColorStop(0.75, 'rgba(147, 197, 253, 0.02)');
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Draw & Update Cursor Trail
      for (let i = trailPoints.length - 1; i >= 0; i--) {
        const pt = trailPoints[i];
        pt.age += dt * 1.8;
        if (pt.age >= 1) {
          trailPoints.splice(i, 1);
          continue;
        }

        const trailAlpha = (1 - pt.age) * (isDarkMode ? 0.35 : 0.2);
        const trailSize = pt.size * (1 - pt.age * 0.5);

        ctx.fillStyle = isDarkMode
          ? `rgba(96, 165, 250, ${trailAlpha})`
          : `rgba(37, 99, 235, ${trailAlpha})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, trailSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Draw & Update Click Ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rip = ripples[i];
        rip.radius += (rip.maxRadius - rip.radius) * 0.08 + 0.5;
        rip.alpha -= dt * 0.8;

        if (rip.alpha <= 0 || rip.radius >= rip.maxRadius) {
          ripples.splice(i, 1);
          continue;
        }

        ctx.strokeStyle = `${rip.color}${Math.max(0, rip.alpha)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Secondary inner echo
        if (rip.radius > 15) {
          ctx.strokeStyle = `${rip.color}${Math.max(0, rip.alpha * 0.5)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(rip.x, rip.y, rip.radius * 0.65, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // 4. Update & Draw Floating Particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Drift slowly
        p.x += p.vx;
        p.y += p.vy;

        // Pulse alpha
        p.pulseVal += p.pulseSpeed;
        const currentAlpha = p.alpha + Math.sin(p.pulseVal) * 0.1;

        // Wrap edges
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;

        // Cursor Interaction: Gentle magnetic elasticity / repulsion
        const distToMouse = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        const maxDist = 180;

        if (distToMouse < maxDist && distToMouse > 0) {
          const force = (1 - distToMouse / maxDist) * 35;
          const angle = Math.atan2(p.y - mouse.y, p.x - mouse.x);
          p.x += Math.cos(angle) * force * 0.05;
          p.y += Math.sin(angle) * force * 0.05;

          // Draw connector line from particle to cursor if close
          if (distToMouse < 130) {
            const lineAlpha = (1 - distToMouse / 130) * (isDarkMode ? 0.25 : 0.15);
            ctx.strokeStyle = isDarkMode
              ? `rgba(147, 197, 253, ${lineAlpha})`
              : `rgba(37, 99, 235, ${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }

        // Draw particle node
        ctx.fillStyle = `${p.color}${Math.max(0.05, currentAlpha)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Connect nearby particles to form subtle accessible navigation constellation
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const distBetween = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (distBetween < 110) {
            const linkAlpha = (1 - distBetween / 110) * (isDarkMode ? 0.08 : 0.04);
            ctx.strokeStyle = isDarkMode
              ? `rgba(99, 102, 241, ${linkAlpha})`
              : `rgba(37, 99, 235, ${linkAlpha})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchstart', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('mouseleave', handlePointerLeave);
      window.removeEventListener('mousedown', handlePointerDown);
    };
  }, [reducedMotion, isDarkMode]);

  if (reducedMotion) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* HTML5 High-Performance Canvas for Particle Mesh, Glows & Lines */}
      <canvas
        ref={canvasRef}
        className="w-full h-full absolute inset-0 pointer-events-none"
      />

      {/* Floating Dynamic CSS Radial Ambient Spheres that follow cursor with spring offset */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full blur-[110px] opacity-25 dark:opacity-20 pointer-events-none transition-transform duration-700 ease-out"
        style={{
          background: isDarkMode
            ? 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, rgba(99, 102, 241, 0.2) 50%, transparent 70%)'
            : 'radial-gradient(circle, rgba(96, 165, 250, 0.35) 0%, rgba(199, 210, 254, 0.25) 50%, transparent 70%)',
          left: `${mousePos.x - 250}px`,
          top: `${mousePos.y - 250}px`,
          transform: 'translate3d(0, 0, 0)',
        }}
      />

      {/* Secondary Counter-Balance Orb that drifts smoothly in slight parallax */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full blur-[130px] opacity-20 dark:opacity-15 pointer-events-none transition-transform duration-1000 ease-out"
        style={{
          background: isDarkMode
            ? 'radial-gradient(circle, rgba(20, 184, 166, 0.35) 0%, rgba(14, 165, 233, 0.15) 50%, transparent 70%)'
            : 'radial-gradient(circle, rgba(147, 197, 253, 0.3) 0%, rgba(224, 231, 255, 0.2) 50%, transparent 70%)',
          left: `${typeof window !== 'undefined' ? window.innerWidth - mousePos.x * 0.4 - 200 : 0}px`,
          top: `${mousePos.y * 0.6}px`,
          transform: 'translate3d(0, 0, 0)',
        }}
      />

      {/* Subtle Geometric Ambient Grid Lines that reflect cursor movement */}
      <div
        className="absolute inset-0 opacity-[0.025] dark:opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(100, 116, 139, 0.4) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(100, 116, 139, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          maskImage: `radial-gradient(circle 420px at ${mousePos.x}px ${mousePos.y}px, black 20%, transparent 80%)`,
          WebkitMaskImage: `radial-gradient(circle 420px at ${mousePos.x}px ${mousePos.y}px, black 20%, transparent 80%)`,
        }}
      />
    </div>
  );
};
