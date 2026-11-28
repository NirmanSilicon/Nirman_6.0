import React, { useEffect, useRef, useState } from 'react';

export type SpecularButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface SpecularButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  size?: SpecularButtonSize;
  radius?: number;
  tint?: string;
  tintOpacity?: number;
  textColor?: string;
  lineColor?: string;
  baseColor?: string;
  surfaceColor?: string;
  intensity?: number;
  idleIntensity?: number;
  shineSize?: number;
  shineFade?: number;
  thickness?: number;
  glow?: number;
  followMouse?: boolean;
  proximity?: number;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16) || 255,
      g: parseInt(clean[1] + clean[1], 16) || 255,
      b: parseInt(clean[2] + clean[2], 16) || 255,
    };
  }
  if (clean.length >= 6) {
    return {
      r: parseInt(clean.slice(0, 2), 16) || 255,
      g: parseInt(clean.slice(2, 4), 16) || 255,
      b: parseInt(clean.slice(4, 6), 16) || 255,
    };
  }
  return { r: 255, g: 255, b: 255 };
}

function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

const SIZE_CLASSES: Record<SpecularButtonSize, string> = {
  xs: 'px-2.5 py-1 text-[11px] gap-1',
  sm: 'px-3.5 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-5 py-3 text-sm gap-2',
};

export const SpecularButton: React.FC<SpecularButtonProps> = ({
  size = 'lg',
  radius = 18,
  tint = '#ffffff',
  tintOpacity = 0.04,
  textColor = '#f5f5f5',
  lineColor = '#ffffff',
  baseColor = '#525252',
  surfaceColor = '#18181b',
  intensity = 1,
  idleIntensity = 0.35,
  shineSize = 10,
  shineFade = 34,
  thickness = 1.2,
  glow = 1,
  followMouse = true,
  proximity = 250,
  fullWidth = false,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...rest
}) => {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [coords, setCoords] = useState<{ x: number; y: number; factor: number }>({
    x: 0,
    y: 0,
    factor: idleIntensity,
  });
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!followMouse || disabled) return;

    const handleMove = (e: MouseEvent) => {
      const el = btnRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Closest point on rect to pointer
      const cx = Math.max(rect.left, Math.min(e.clientX, rect.right));
      const cy = Math.max(rect.top, Math.min(e.clientY, rect.bottom));
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);

      if (dist > proximity) {
        setCoords((prev) =>
          prev.factor === idleIntensity ? prev : { ...prev, factor: idleIntensity }
        );
        return;
      }

      const factor =
        idleIntensity +
        (intensity - idleIntensity) * Math.max(0, 1 - dist / Math.max(1, proximity));

      setCoords({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        factor,
      });
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMove);
  }, [followMouse, proximity, intensity, idleIntensity, disabled]);

  const activeFactor = disabled ? 0.15 : hovered ? intensity : coords.factor;
  const spotRadius = Math.max(40, (shineSize + shineFade) * 3.2);
  const innerRadius = Math.max(2, radius - thickness);

  const borderBg = followMouse
    ? `radial-gradient(${spotRadius}px circle at ${coords.x}px ${coords.y}px, ${rgba(
        lineColor,
        0.95 * activeFactor
      )} 0%, ${rgba(lineColor, 0.35 * activeFactor)} ${shineSize}%, ${rgba(
        baseColor,
        0.85
      )} ${shineSize + shineFade}%, ${baseColor} 100%)`
    : `linear-gradient(135deg, ${rgba(lineColor, 0.7 * activeFactor)}, ${baseColor})`;

  const innerSurface = `linear-gradient(180deg, ${rgba(
    tint,
    tintOpacity + (hovered ? 0.06 : 0)
  )} 0%, ${rgba(tint, tintOpacity * 0.5)} 100%), ${surfaceColor}`;

  return (
    <button
      ref={btnRef}
      type={type}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative inline-flex items-center justify-center font-semibold select-none transition-transform duration-150 active:scale-[0.98] disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      style={{
        borderRadius: `${radius}px`,
        padding: `${thickness}px`,
        background: borderBg,
        boxShadow:
          glow > 0 && !disabled
            ? `0 0 ${Math.round(14 * glow * activeFactor)}px ${rgba(
                lineColor,
                0.22 * glow * activeFactor
              )}, 0 4px 14px rgba(0, 0, 0, 0.14)`
            : undefined,
      }}
      {...rest}
    >
      <span
        className={`relative w-full h-full inline-flex items-center justify-center transition-colors duration-150 ${SIZE_CLASSES[size]}`}
        style={{
          borderRadius: `${innerRadius}px`,
          background: innerSurface,
          color: textColor,
        }}
      >
        {/* Subtle top specular sheen */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-3 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${rgba(
              lineColor,
              0.4 * activeFactor
            )}, transparent)`,
          }}
        />
        {children}
      </span>
    </button>
  );
};

export default SpecularButton;
