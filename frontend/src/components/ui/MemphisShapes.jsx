import React from 'react';

export function CoralTriangle({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      className={`pointer-events-none select-none ${className}`}
      fill="none"
    >
      <polygon
        points="32,6 58,54 6,54"
        fill="#B5728A"
        stroke="#17140D"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TealQuarterArc({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      className={`pointer-events-none select-none ${className}`}
      fill="none"
    >
      <path
        d="M8 56 A48 48 0 0 1 56 8 L56 56 Z"
        fill="#AABAAE"
        stroke="#17140D"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MustardDottedCircle({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      className={`pointer-events-none select-none ${className}`}
      fill="none"
    >
      <circle
        cx="32"
        cy="32"
        r="24"
        fill="#933B5B"
        stroke="#17140D"
        strokeWidth="3.5"
      />
      <circle cx="24" cy="24" r="2.5" fill="#FFFFFF" />
      <circle cx="38" cy="24" r="2.5" fill="#FFFFFF" />
      <circle cx="32" cy="34" r="2.5" fill="#FFFFFF" />
      <circle cx="22" cy="40" r="2.5" fill="#FFFFFF" />
      <circle cx="40" cy="40" r="2.5" fill="#FFFFFF" />
    </svg>
  );
}

export function VioletPlus({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 56 56"
      className={`pointer-events-none select-none ${className}`}
      fill="none"
    >
      <path
        d="M22 6 H34 V22 H50 V34 H34 V50 H22 V34 H6 V22 H22 Z"
        fill="#9F9679"
        stroke="#17140D"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BlackSquiggle({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 32"
      className={`pointer-events-none select-none ${className}`}
      fill="none"
    >
      <path
        d="M4 20 Q 16 4, 28 20 T 52 20 T 76 20 T 100 20 T 116 14"
        stroke="#17140D"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function SkyZigzag({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 36"
      className={`pointer-events-none select-none ${className}`}
      fill="none"
    >
      <polyline
        points="4,28 20,8 36,28 52,8 68,28 84,8 96,24"
        stroke="#B5728A"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="4,28 20,8 36,28 52,8 68,28 84,8 96,24"
        stroke="#17140D"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MustardHalfCircle({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 80 44"
      className={`pointer-events-none select-none ${className}`}
      fill="none"
    >
      <path
        d="M6 38 A34 34 0 0 1 74 38 Z"
        fill="#AABAAE"
        stroke="#17140D"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
