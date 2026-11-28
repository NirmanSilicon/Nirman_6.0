import { useEffect, useRef, useCallback } from 'react';
import Lenis from 'lenis';

// Global Lenis singleton reference for global programmatic scrolling
let globalLenis: Lenis | null = null;

export function getLenis(): Lenis | null {
  return globalLenis;
}

export function scrollToTarget(target: string | HTMLElement | number, offset: number = -70, duration: number = 0.8): void {
  if (globalLenis) {
    globalLenis.scrollTo(target, {
      offset,
      duration,
      easing: (t) => 1 - Math.pow(1 - t, 4), // Quartic ease out for snappier programmatic scroll
      lock: false,
    });
  } else {
    if (typeof target === 'string') {
      const el = document.querySelector(target.startsWith('#') ? target : `#${target}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (typeof target === 'number') {
      window.scrollTo({ top: target, behavior: 'smooth' });
    } else if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

export function useSmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Initialize Lenis with snappy, optimized momentum curve
    const lenis = new Lenis({
      lerp: 0.15, // Using lerp instead of duration for a much more responsive and snappy feel
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.2, // Slightly increased for faster response
      touchMultiplier: 2.0, // Increased for snappier mobile touch scrolling
      infinite: false,
    });

    lenisRef.current = lenis;
    globalLenis = lenis;

    // Connect Lenis to requestAnimationFrame loop for continuous 60-120fps sync
    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    // Recalculate dimensions on window resize or load
    const handleResize = () => {
      lenis.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      window.removeEventListener('resize', handleResize);
      if (globalLenis === lenis) {
        globalLenis = null;
      }
    };
  }, []);

  const smoothScrollTo = useCallback((target: string | HTMLElement | number, offset?: number) => {
    scrollToTarget(target, offset);
  }, []);

  return {
    smoothScrollTo,
    lenis: lenisRef.current,
  };
}
