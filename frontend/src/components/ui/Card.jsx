import React from 'react';

export function Card({ children, className = '', padding = 'p-5' }) {
  return (
    <div
      className={`bg-white rounded-[18px] border-[3px] border-[#17140D] shadow-[6px_6px_0_#17140D] ${padding} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 mb-4 ${className}`}>
      <div>
        <h3 className="font-display text-[17px] font-extrabold text-[#17140D] tracking-tight leading-snug">
          {title}
        </h3>
        {subtitle && <p className="text-xs font-medium text-[#5A523D] mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
