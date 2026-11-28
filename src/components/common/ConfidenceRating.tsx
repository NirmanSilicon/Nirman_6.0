import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Info,
  Star,
  Activity,
  Layers,
  Camera,
  Compass,
  FileCheck,
  Clock,
  Award,
  ChevronRight,
  X,
} from 'lucide-react';

export interface ConfidenceFactor {
  label: string;
  weight: string;
  score: number; // 0-100
  status: 'VERIFIED' | 'PASS' | 'ADVISORY' | 'PENDING';
  description: string;
  iconName?: 'shield' | 'camera' | 'sensor' | 'users' | 'ruler';
}

export interface ConfidenceRatingProps {
  score: number; // 0 - 100
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'stars' | 'meter' | 'compact' | 'pill';
  showModalOnClick?: boolean;
  label?: string;
  auditorName?: string;
  verifiedDate?: string;
  entityName?: string;
  entityType?: 'DESTINATION' | 'ROUTE' | 'HOTEL' | 'BARRIER' | 'AUDIT';
  customFactors?: ConfidenceFactor[];
  className?: string;
}

export const ConfidenceRating: React.FC<ConfidenceRatingProps> = ({
  score,
  size = 'sm',
  variant = 'badge',
  showModalOnClick = true,
  label,
  auditorName = 'ISO-21542 Certified Field Evaluator',
  verifiedDate = 'Aug 2026',
  entityName = 'Accessibility Pathway',
  entityType = 'DESTINATION',
  customFactors,
  className = '',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Confidence Tier Calculations
  const getTier = (s: number) => {
    if (s >= 92) {
      return {
        level: 'CERTIFIED_HIGH',
        label: 'Certified High Confidence',
        stars: 5,
        color: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-50 dark:bg-emerald-950/60',
        borderColor: 'border-emerald-300 dark:border-emerald-800',
        ringColor: 'stroke-emerald-500',
        badgeBg: 'bg-emerald-600 text-white',
        icon: ShieldCheck,
      };
    } else if (s >= 80) {
      return {
        level: 'HIGH_CONSENSUS',
        label: 'High Consensus Rating',
        stars: 4,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-950/60',
        borderColor: 'border-blue-300 dark:border-blue-800',
        ringColor: 'stroke-blue-500',
        badgeBg: 'bg-blue-600 text-white',
        icon: CheckCircle2,
      };
    } else if (s >= 65) {
      return {
        level: 'COMMUNITY_VERIFIED',
        label: 'Community Monitored',
        stars: 3,
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-50 dark:bg-amber-950/60',
        borderColor: 'border-amber-300 dark:border-amber-800',
        ringColor: 'stroke-amber-500',
        badgeBg: 'bg-amber-600 text-white',
        icon: AlertCircle,
      };
    } else {
      return {
        level: 'PROVISIONAL',
        label: 'Provisional / Needs Audit',
        stars: 2,
        color: 'text-rose-600 dark:text-rose-400',
        bgColor: 'bg-rose-50 dark:bg-rose-950/60',
        borderColor: 'border-rose-300 dark:border-rose-800',
        ringColor: 'stroke-rose-500',
        badgeBg: 'bg-rose-600 text-white',
        icon: HelpCircle,
      };
    }
  };

  const tier = getTier(score);
  const Icon = tier.icon;

  // Default Factors if not provided
  const defaultFactors: ConfidenceFactor[] = [
    {
      label: 'On-Site Laser Gradient & 1:12 Slope Audit',
      weight: '35% Weight',
      score: Math.min(100, score + 4),
      status: score >= 80 ? 'VERIFIED' : 'ADVISORY',
      description: 'Physical field measurement with digital inclinometer conforming to ISO-21542 ramp standards.',
      iconName: 'ruler',
    },
    {
      label: 'Geotagged Photographic & Video Evidence',
      weight: '25% Weight',
      score: Math.min(100, score + 2),
      status: 'VERIFIED',
      description: 'Recent high-resolution photo evidence of zero-threshold entrances, grab rails, and elevators.',
      iconName: 'camera',
    },
    {
      label: 'Community Traveler Feedback & Consensus',
      weight: '20% Weight',
      score: Math.max(70, score - 5),
      status: 'PASS',
      description: 'Cross-validated ratings and zero-barrier check-ins from verified wheelchair and PRM travelers.',
      iconName: 'users',
    },
    {
      label: 'Live Telemetry & Sensor Verification',
      weight: '20% Weight',
      score: Math.min(100, score),
      status: score >= 75 ? 'VERIFIED' : 'PENDING',
      description: 'Real-time elevator operational status and obstacle-free route confirmation.',
      iconName: 'sensor',
    },
  ];

  const factorsToUse = customFactors && customFactors.length > 0 ? customFactors : defaultFactors;

  const handleClick = (e: React.MouseEvent) => {
    if (showModalOnClick) {
      e.stopPropagation();
      setIsModalOpen(true);
    }
  };

  // Render Star Icons
  const renderStars = () => {
    return (
      <div className="flex items-center gap-0.5" title={`${tier.stars} of 5 Star Confidence`}>
        {[1, 2, 3, 4, 5].map((starIdx) => (
          <Star
            key={starIdx}
            className={`w-3 h-3 ${
              starIdx <= tier.stars
                ? 'text-amber-400 fill-amber-400'
                : 'text-slate-300 dark:text-slate-600'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      {/* 1. BADGE VARIANT */}
      {variant === 'badge' && (
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold transition-all shadow-xs hover:scale-105 active:scale-95 cursor-pointer ${tier.bgColor} ${tier.borderColor} ${tier.color} ${className}`}
          title="Click to view full Accessibility Confidence Rating Breakdown"
        >
          <Icon className="w-3.5 h-3.5 shrink-0" />
          <span>{score}% Confidence</span>
          {size !== 'xs' && (
            <span className="opacity-75 text-[10px] font-semibold hidden sm:inline">
              • {tier.label.split(' ')[0]}
            </span>
          )}
        </button>
      )}

      {/* 2. STARS VARIANT */}
      {variant === 'stars' && (
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border transition-all text-xs font-bold shadow-xs hover:shadow-md cursor-pointer ${tier.bgColor} ${tier.borderColor} ${className}`}
          title="Click to view confidence audit"
        >
          <div className="flex items-center gap-1">
            <span className={`font-black ${tier.color}`}>{score}%</span>
            <span className="text-[10px] text-slate-500 font-semibold">Confidence</span>
          </div>
          {renderStars()}
        </button>
      )}

      {/* 3. METER VARIANT */}
      {variant === 'meter' && (
        <button
          type="button"
          onClick={handleClick}
          className={`w-full p-3 rounded-2xl border text-left transition-all hover:border-slate-400 dark:hover:border-slate-600 cursor-pointer ${tier.bgColor} ${tier.borderColor} ${className}`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Icon className={`w-4 h-4 ${tier.color}`} />
              <span className="text-xs font-black text-slate-900 dark:text-white">
                {label || 'Accessibility Confidence Rating'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {renderStars()}
              <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${tier.badgeBg}`}>
                {score}%
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                score >= 90
                  ? 'bg-emerald-500'
                  : score >= 75
                  ? 'bg-blue-500'
                  : score >= 60
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${score}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
            <span>Verified by {auditorName}</span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-0.5">
              View Audit Metrics <ChevronRight className="w-2.5 h-2.5" />
            </span>
          </div>
        </button>
      )}

      {/* 4. PILL VARIANT */}
      {variant === 'pill' && (
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border shadow-xs cursor-pointer ${tier.bgColor} ${tier.borderColor} ${tier.color} ${className}`}
        >
          <Icon className="w-3 h-3" />
          <span>{score}% Conf</span>
        </button>
      )}

      {/* 5. COMPACT VARIANT */}
      {variant === 'compact' && (
        <span
          onClick={handleClick}
          className={`inline-flex items-center gap-1 text-xs font-bold cursor-pointer hover:underline ${tier.color} ${className}`}
        >
          <Icon className="w-3.5 h-3.5" />
          <span>{score}%</span>
        </span>
      )}

      {/* ========================================================
          DETAILED CONFIDENCE RATING & AUDIT BREAKDOWN MODAL
          ======================================================== */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={(e) => {
            e.stopPropagation();
            setIsModalOpen(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-5 p-6 sm:p-8 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl ${tier.bgColor} ${tier.borderColor} border`}>
                  <Icon className={`w-6 h-6 ${tier.color}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Accessibility Ground-Truth Audit
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${tier.badgeBg}`}>
                      {tier.label}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                    Confidence Rating: {score}%
                  </h3>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">
                    Evaluated for: <strong className="text-slate-800 dark:text-slate-200">{entityName}</strong>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Top Score Summary Banner */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Confidence Score & Reliability
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {renderStars()}
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {tier.stars}.0 / 5.0 Rating
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-500">Inspector Sign-Off</div>
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>ISO 21542 Validated</span>
                </div>
              </div>
            </div>

            {/* Criteria Breakdown List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Confidence Scoring Criteria & Weighting:
              </h4>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {factorsToUse.map((factor, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>{factor.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">{factor.weight}</span>
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-black rounded-lg text-[11px]">
                          {factor.score}%
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      {factor.description}
                    </p>

                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{ width: `${factor.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Certification Footer */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Last Verified: {verifiedDate}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
