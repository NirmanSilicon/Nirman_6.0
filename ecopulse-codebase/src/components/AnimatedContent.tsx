import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

export type AnimatedDirection = 'vertical' | 'horizontal';

export interface AnimatedContentProps {
  children: React.ReactNode;
  distance?: number;
  direction?: AnimatedDirection;
  reverse?: boolean;
  duration?: number;
  ease?: string;
  initialOpacity?: number;
  animateOpacity?: boolean;
  scale?: number;
  blur?: number;
  stagger?: number;
  threshold?: number;
  delay?: number;
  className?: string;
  childClassName?: string;
}

type BezierTuple = readonly [number, number, number, number];

const EASE_MAP: Record<string, BezierTuple> = {
  'power3.out': [0.215, 0.61, 0.355, 1],
  'power2.out': [0.25, 0.46, 0.45, 0.94],
  'power4.out': [0.165, 0.84, 0.44, 1],
  'expo.out': [0.16, 1, 0.3, 1],
  'back.out': [0.34, 1.56, 0.64, 1],
  linear: [0, 0, 1, 1],
};

export const AnimatedContent: React.FC<AnimatedContentProps> = ({
  children,
  distance = 100,
  direction = 'vertical',
  reverse = false,
  duration = 0.8,
  ease = 'power3.out',
  initialOpacity = 0,
  animateOpacity = true,
  scale = 1,
  blur = 0,
  stagger = 0.08,
  threshold = 0.1,
  delay = 0,
  className = '',
  childClassName = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Trigger immediately if already in or above viewport
    const rect = el.getBoundingClientRect();
    if (rect.top <= window.innerHeight * 0.96) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.boundingClientRect.top <= window.innerHeight) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: Math.min(Math.max(threshold, 0), 0.5) }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const offset = reverse ? -distance : distance;
  const xOffset = direction === 'horizontal' ? offset : 0;
  const yOffset = direction === 'vertical' ? offset : 0;
  const cubicEase = EASE_MAP[ease] ?? EASE_MAP['power3.out'];

  const childArray = React.Children.toArray(children);

  return (
    <div ref={containerRef} className={className}>
      {childArray.map((child, idx) => (
        <motion.div
          key={
            React.isValidElement(child) && child.key !== null
              ? child.key
              : `anim-item-${idx}`
          }
          className={childClassName}
          initial={{
            x: xOffset,
            y: yOffset,
            opacity: animateOpacity ? initialOpacity : 1,
            scale,
            filter: blur > 0 ? `blur(${blur}px)` : 'blur(0px)',
          }}
          animate={
            visible
              ? {
                  x: 0,
                  y: 0,
                  opacity: 1,
                  scale: 1,
                  filter: 'blur(0px)',
                }
              : {
                  x: xOffset,
                  y: yOffset,
                  opacity: animateOpacity ? initialOpacity : 1,
                  scale,
                  filter: blur > 0 ? `blur(${blur}px)` : 'blur(0px)',
                }
          }
          transition={{
            duration,
            delay: delay + idx * stagger,
            ease: cubicEase,
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
};

export default AnimatedContent;
