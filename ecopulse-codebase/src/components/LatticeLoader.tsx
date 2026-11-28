import React, { useEffect, useMemo, useRef, useState } from 'react';

export type LatticeStatus = 'working' | 'done' | 'error';
export type LatticePattern = 'orbit' | 'wave' | 'pulse' | 'diagonal';
export type LatticeShape = 'round' | 'square' | 'diamond';

export interface LatticeLoaderProps {
  status?: LatticeStatus;
  label?: string;
  doneLabel?: string;
  errorLabel?: string;
  pattern?: LatticePattern;
  grid?: number;
  shape?: LatticeShape;
  color?: string;
  doneColor?: string;
  errorColor?: string;
  cellSize?: number;
  gap?: number;
  fontSize?: number;
  step?: number;
  idleOpacity?: number;
  glow?: boolean;
  glowColor?: string;
  showTimer?: boolean;
  className?: string;
}

function buildOrbitSequence(n: number): number[] {
  if (n <= 1) return [0];
  const seq: number[] = [];
  for (let c = 0; c < n; c++) seq.push(c);
  for (let r = 1; r < n; r++) seq.push(r * n + (n - 1));
  for (let c = n - 2; c >= 0; c--) seq.push((n - 1) * n + c);
  for (let r = n - 2; r >= 1; r--) seq.push(r * n);
  return seq;
}

export const LatticeLoader: React.FC<LatticeLoaderProps> = ({
  status = 'working',
  label = 'Thinking',
  doneLabel = 'Done in',
  errorLabel = 'Failed after',
  pattern = 'orbit',
  grid = 3,
  shape = 'round',
  color = '#10b981',
  doneColor = '#22c55e',
  errorColor = '#ef4444',
  cellSize = 6,
  gap = 2,
  fontSize = 14,
  step = 90,
  idleOpacity = 0.15,
  glow = false,
  glowColor = '',
  showTimer = false,
  className = '',
}) => {
  const [tick, setTick] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startRef = useRef<number>(Date.now());
  const prevStatusRef = useRef<LatticeStatus>(status);

  useEffect(() => {
    if (status === 'working' && prevStatusRef.current !== 'working') {
      startRef.current = Date.now();
      setElapsedMs(0);
    }
    prevStatusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (status !== 'working') {
      setElapsedMs(Date.now() - startRef.current);
      return;
    }

    const animTimer = window.setInterval(() => {
      setTick((t) => t + 1);
    }, step);

    const clockTimer = showTimer
      ? window.setInterval(() => {
          setElapsedMs(Date.now() - startRef.current);
        }, 100)
      : undefined;

    return () => {
      window.clearInterval(animTimer);
      if (clockTimer) window.clearInterval(clockTimer);
    };
  }, [status, step, showTimer]);

  const orbitSeq = useMemo(() => buildOrbitSequence(grid), [grid]);
  const totalCells = grid * grid;

  const activeColor =
    status === 'done' ? doneColor : status === 'error' ? errorColor : color;

  const effectiveGlow = glow ? glowColor || activeColor : '';

  const getCellOpacity = (idx: number): number => {
    if (status === 'done') return 1;
    if (status === 'error') {
      const r = Math.floor(idx / grid);
      const c = idx % grid;
      return r === c || r + c === grid - 1 ? 1 : idleOpacity;
    }

    const r = Math.floor(idx / grid);
    const c = idx % grid;

    if (pattern === 'orbit') {
      const pos = orbitSeq.indexOf(idx);
      if (pos === -1) return idleOpacity + 0.15; // center cell subtle anchor
      const head = tick % orbitSeq.length;
      const dist = (head - pos + orbitSeq.length) % orbitSeq.length;
      if (dist === 0) return 1;
      if (dist === 1) return 0.72;
      if (dist === 2) return 0.42;
      return idleOpacity;
    }

    if (pattern === 'diagonal') {
      const band = (r + c) % (grid * 2 - 1);
      const head = tick % (grid * 2 - 1);
      return band === head ? 1 : Math.abs(band - head) === 1 ? 0.45 : idleOpacity;
    }

    if (pattern === 'wave') {
      const head = tick % grid;
      return c === head ? 1 : Math.abs(c - head) === 1 ? 0.5 : idleOpacity;
    }

    // pulse
    const center = Math.floor(grid / 2);
    const ring = Math.max(Math.abs(r - center), Math.abs(c - center));
    return ring === tick % (center + 1) ? 1 : idleOpacity;
  };

  const formattedTime = `${(elapsedMs / 1000).toFixed(1)}s`;
  const text =
    status === 'done'
      ? showTimer
        ? `${doneLabel} ${formattedTime}`
        : doneLabel
      : status === 'error'
        ? showTimer
          ? `${errorLabel} ${formattedTime}`
          : errorLabel
        : showTimer && elapsedMs > 0
          ? `${label} (${formattedTime})`
          : label;

  const radiusStyle =
    shape === 'round' ? '9999px' : shape === 'diamond' ? '1px' : '2px';

  return (
    <span
      className={`inline-flex items-center gap-2.5 select-none ${className}`}
      style={{ fontSize: `${fontSize}px` }}
    >
      <span
        className="inline-grid shrink-0"
        style={{
          gridTemplateColumns: `repeat(${grid}, ${cellSize}px)`,
          gap: `${gap}px`,
        }}
        aria-hidden="true"
      >
        {Array.from({ length: totalCells }).map((_, idx) => {
          const opacity = getCellOpacity(idx);
          return (
            <span
              key={idx}
              style={{
                width: `${cellSize}px`,
                height: `${cellSize}px`,
                borderRadius: radiusStyle,
                transform: shape === 'diamond' ? 'rotate(45deg)' : undefined,
                backgroundColor: activeColor,
                opacity,
                boxShadow:
                  effectiveGlow && opacity > 0.5
                    ? `0 0 ${Math.max(4, cellSize)}px ${effectiveGlow}`
                    : undefined,
                transition: `opacity ${Math.max(60, step)}ms ease, background-color 200ms ease`,
              }}
            />
          );
        })}
      </span>

      <span className="font-medium leading-none">
        {text}
      </span>
    </span>
  );
};

export default LatticeLoader;
