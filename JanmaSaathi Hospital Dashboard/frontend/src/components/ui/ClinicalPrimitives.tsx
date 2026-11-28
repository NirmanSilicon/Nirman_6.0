import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Zero-pill clinical status typography:
 * Conveys semantic clinical state through crisp text + clear semantic ink color,
 * never rounded candy pills or hue-only dots.
 */
export type SemanticTone = 'critical' | 'high' | 'moderate' | 'positive' | 'cherry' | 'neutral';

const TONE_CLASSES: Record<SemanticTone, string> = {
  critical: 'text-[#B91C1C] font-semibold',
  high: 'text-[#B45309] font-semibold',
  moderate: 'text-[#92400E] font-medium',
  positive: 'text-[#15803D] font-medium',
  cherry: 'text-[#890149] font-semibold',
  neutral: 'text-[#665860] font-normal',
};

export const StatusText: React.FC<{
  label: string;
  tone: SemanticTone;
  prefix?: string;
  className?: string;
}> = ({ label, tone, prefix, className = '' }) => {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap ${TONE_CLASSES[tone]} ${className}`}>
      {prefix && <span className="text-[#665860] font-normal">{prefix}</span>}
      <span>{label}</span>
    </span>
  );
};

export function toneForRisk(risk: string): SemanticTone {
  switch (risk) {
    case 'Critical':
      return 'critical';
    case 'High Priority':
      return 'high';
    case 'Moderate':
      return 'moderate';
    case 'Routine':
      return 'positive';
    default:
      return 'neutral';
  }
}

export function toneForAlertStatus(status: string): SemanticTone {
  switch (status) {
    case 'Critical':
    case 'NEW':
    case 'New':
      return 'critical';
    case 'High Priority':
    case 'ACKNOWLEDGED':
    case 'Acknowledged':
      return 'high';
    case 'Moderate':
      return 'moderate';
    case 'IN PROGRESS':
    case 'REFERRED / ACTION TAKEN':
    case 'Under Review':
      return 'cherry';
    case 'RESOLVED':
    case 'Resolved':
    case 'Low':
      return 'positive';
    case 'CLOSED':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function toneForReferralStatus(status: string): SemanticTone {
  switch (status) {
    case 'Pending':
      return 'high';
    case 'In Transit':
      return 'critical';
    case 'Accepted':
    case 'Admitted':
      return 'cherry';
    case 'Completed':
      return 'positive';
    case 'Declined':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function toneForAppointmentStatus(status: string): SemanticTone {
  switch (status) {
    case 'Follow-up Due':
      return 'high';
    case 'Missed':
      return 'critical';
    case 'Upcoming':
      return 'cherry';
    case 'Completed':
      return 'positive';
    default:
      return 'neutral';
  }
}

/**
 * Clean architectural Hospital Crest SVG placeholder
 */
export const HospitalCrest: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect x="1" y="1" width="34" height="34" rx="6" fill="#F3F3E7" stroke="#D9A2B5" strokeWidth="1.5" />
    <path d="M18 8L27 12.5V15H9V12.5L18 8Z" fill="#890149" />
    <path d="M11 17H14V25H11V17ZM16.5 17H19.5V25H16.5V17ZM22 17H25V25H22V17Z" fill="#30232A" />
    <rect x="8" y="26" width="20" height="2" rx="1" fill="#890149" />
  </svg>
);

export const SectionHeader: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}> = ({ title, subtitle, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#DDD8CB]">
    <div className="min-w-0">
      <h1 className="font-serif text-[28px] leading-tight text-[#30232A] tracking-[-0.01em]">
        {title}
      </h1>
      {subtitle && <p className="mt-1 text-sm text-[#665860] max-w-2xl">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
  </div>
);

export const SlideOverDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  widthClass?: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, subtitle, widthClass = 'max-w-2xl', children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div
        className="fixed inset-0 bg-[#30232A]/35 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative z-10 w-full ${widthClass} bg-white h-full border-l border-[#DDD8CB] shadow-xl flex flex-col`}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[#DDD8CB] bg-[#FBFBF7]">
          <div className="min-w-0">
            <h2 className="font-serif text-xl text-[#30232A] leading-snug">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-[#665860]">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#665860] hover:text-[#30232A] hover:bg-[#F3F3E7] rounded-md transition-colors shrink-0"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
};

export const ModalDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidthClass?: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, subtitle, maxWidthClass = 'max-w-lg', children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div
        className="fixed inset-0 bg-[#30232A]/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative z-10 w-full ${maxWidthClass} bg-white rounded-lg border border-[#DDD8CB] shadow-xl overflow-hidden flex flex-col max-h-[90vh]`}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[#DDD8CB] bg-[#FBFBF7]">
          <div>
            <h2 className="font-serif text-xl text-[#30232A]">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-[#665860]">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#665860] hover:text-[#30232A] hover:bg-[#F3F3E7] rounded-md transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ title, description, action }) => (
  <div className="py-12 px-6 text-center bg-white border border-[#DDD8CB] rounded-lg">
    <p className="font-serif text-lg text-[#30232A]">{title}</p>
    <p className="mt-1 text-sm text-[#665860] max-w-md mx-auto">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

/**
 * Refined, dignified notice clearly distinguishing synthetic demo data from live patient records.
 */
export const DemoDatasetNote: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="text-[11px] leading-snug text-[#665860] border-t border-[#DDD8CB] pt-3">
        <span className="font-semibold text-[#890149]">Synthetic Demo Dataset</span>
        <span className="mx-1.5" aria-hidden="true">·</span>
        <span>Not live patient records</span>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#FBFBF7] border border-[#DDD8CB] rounded-md text-xs text-[#665860]">
      <div>
        <span className="font-semibold text-[#890149]">Synthetic Demonstration Records</span>
        <span className="mx-2 text-[#D9A2B5]" aria-hidden="true">/</span>
        <span>
          All maternal profiles, vitals, alerts, and referrals shown in this interface are realistic synthetic demo data for UI evaluation — not live hospital patient records.
        </span>
      </div>
    </div>
  );
};
