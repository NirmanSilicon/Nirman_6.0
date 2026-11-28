import React from 'react';

const VARIANT_STYLES = {
  green: 'bg-[#AABAAE] text-[#17140D] border-[#17140D]',
  emerald: 'bg-[#E3D6BF] text-[#17140D] border-[#17140D]',
  yellow: 'bg-[#9F9679] text-[#17140D] border-[#17140D]',
  orange: 'bg-[#B5728A] text-[#17140D] border-[#17140D]',
  red: 'bg-[#933B5B] text-white border-[#17140D]',
  violet: 'bg-[#933B5B] text-white border-[#17140D]',
  sky: 'bg-[#AABAAE] text-[#17140D] border-[#17140D]',
  neutral: 'bg-[#E3D6BF] text-[#17140D] border-[#17140D]',
};

export function Badge({ children, variant = 'neutral', dot = false, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border-2 ${VARIANT_STYLES[variant] || VARIANT_STYLES.neutral
        } ${className}`}
    >
      {dot && (
        <span
          className={`w-2 h-2 rounded-full border border-[#17140D] ${variant === 'red' || variant === 'violet'
            ? 'bg-white'
            : 'bg-[#17140D]'
            }`}
        />
      )}
      {children}
    </span>
  );
}
