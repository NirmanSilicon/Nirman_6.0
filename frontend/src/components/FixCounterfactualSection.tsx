import React, { useState } from 'react';
import { 
  Activity, 
  Sliders, 
  Settings, 
  BarChart3, 
  FileCode2, 
  GitBranch, 
  Sparkles, 
  CheckCircle2, 
  Star, 
  Cpu, 
  ChevronRight, 
  ArrowRight,
  Database,
  Radio,
  FileText
} from 'lucide-react';
import { TelemetryFragment } from '../types';

interface FixCounterfactualSectionProps {
  onSelectFragment?: (fragment: TelemetryFragment) => void;
  onProceedToCaseClosed?: () => void;
  onOpenCaelis?: () => void;
  jitterEnabled?: boolean;
}

export const FixCounterfactualSection: React.FC<FixCounterfactualSectionProps> = ({
  onProceedToCaseClosed,
  onOpenCaelis,
  jitterEnabled
}) => {
  const [engineEngaged, setEngineEngaged] = useState<boolean>(true);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  const patternCards = [
    {
      id: 1,
      badge: "CAELIS-IN // 64Hz",
      badgeIcon: Activity,
      timestamp: "T-00:02.00",
      title: "HIGH-FREQUENCY SLIDING WINDOWING",
      subhead: "128-POINT CONTINUOUS BUFFER",
      description: "Continuously buffers time-series telemetry across V_BUS, THERM_BAT, GYRO_ATT, and RX_RSSI with zero packet degradation.",
      statusType: "check",
      statusHeading: "128 SAMPLES INGESTED",
      statusDetail: "WINDOW: [t-2.0s → t+0.0s] · CHANNELS: 16 BUS PINS · FIFO QUEUE ACTIVE"
    },
    {
      id: 2,
      badge: "FEAT-VEC // 7-D",
      badgeIcon: Sliders,
      timestamp: "T+00:04.12",
      title: "STATISTICAL FEATURE EXTRACTION",
      subhead: "INSTANTANEOUS RATE & SKEWNESS",
      description: "Extracts 7 core vector dimensions: rolling mean, standard deviation, peak excursion range, gradient rate-of-change, and skewness.",
      statusType: "check",
      statusHeading: "7-D VECTORS COMPUTED",
      statusDetail: "VECTOR: { mean: 28.4, std: 1.42, roc: +0.84, skew: -0.32, range: 4.8 }"
    },
    {
      id: 3,
      badge: "MODEL // V2.4-AERO",
      badgeIcon: Settings,
      timestamp: "T+00:08.50",
      title: "NEURAL PATTERN CLASSIFICATION",
      subhead: "ANOMALY SIGNATURE RECOGNITION",
      description: "Trained on 45,000+ deep-space telemetry anomalies to detect thermal gradient divergence, voltage collapse, and ADC jitter signatures.",
      statusType: "star",
      statusHeading: "94.2% ANOMALY CANDIDATE",
      statusDetail: "INFERENCE: PATTERN_MATCH_POS · CONF: 0.942 · SIGNATURE: THERM_DRIFT_0x0012",
      isHighlight: true
    },
    {
      id: 4,
      badge: "XAI // SHAP-WEIGHTS",
      badgeIcon: BarChart3,
      timestamp: "T+00:10.00",
      title: "EXPLAINABLE FEATURE ATTRIBUTION",
      subhead: "QUANTITATIVE CONTRIBUTION WEIGHTS",
      description: "Computes SHAP feature attributions so flight directors understand precisely why the neural model flagged the candidate event.",
      statusType: "check",
      statusHeading: "FULL FEATURE ATTRIBUTION",
      statusDetail: "SHAP: [Rate-of-Change: +42%, Range: +28%, Variance: +18%, Mean-Shift: +12%]"
    },
    {
      id: 5,
      badge: "EVENT-CONTRACT // SCHEMA",
      badgeIcon: FileCode2,
      timestamp: "T+00:12.00",
      title: "STANDARDIZED CANDIDATE CONTRACT",
      subhead: "SCHEMA-LOCKED HYPOTHESIS PACKET",
      description: "Packages the detected anomaly into a strict JSON candidate contract specifying subsystem, timestamp, magnitude, and confidence.",
      statusType: "check",
      statusHeading: "CONTRACT EMITTED",
      statusDetail: '{ id: "EVT-8849-01", comp: "THERM_BAT_02", offset: "+012s", conf: 0.942 }'
    },
    {
      id: 6,
      badge: "RULE // PEARL-DAG",
      badgeIcon: GitBranch,
      timestamp: "T+00:14.20",
      title: "PEARL DAG CAUSAL ENGINE HANDOFF",
      subhead: "ZERO CAUSAL HALLUCINATION RULE",
      description: "Strict architectural separation: CAELIS AI proposes candidate patterns; the Pearl Causal DAG Engine verifies temporal physical causality.",
      statusType: "star",
      statusHeading: "DAG HANDOFF ENGAGED",
      statusDetail: "RULE: CAELIS surfaces candidates → Pearl DAG validates physical causal chain"
    }
  ];

  return (
    <section 
      id="fix"
      className="relative py-10 sm:py-16 px-4 sm:px-6 lg:px-8 bg-transparent dark:bg-transparent border-b-2 border-[#1A1A1A]/20 dark:border-[#FAF6EE]/20 overflow-hidden"
    >
      {/* Background Circuit & Halftone Texture */}
      <div className="absolute inset-0 bg-circuit-pattern opacity-15 pointer-events-none"></div>
      <div className="absolute inset-0 bg-halftone opacity-20 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section Headline */}
        <div className="flex flex-col items-start mb-8">
          <div className="relative w-full">
            <h2 className="text-4xl sm:text-6xl md:text-7xl font-headline font-black text-[#1A1A1A] dark:text-[#FAF6EE] tracking-tight leading-none uppercase">
              CAELIS AI <span className="bg-[#DC143C] text-[#FAF6EE] px-3 py-0.5 inline-block torn-paper-strip">PATTERN RECOGNITION</span> ENGINE.
            </h2>
          </div>

          <p className="mt-4 text-xs sm:text-sm font-mono-tech text-[#1A1A1A] dark:text-[#FAF6EE]/90 max-w-3xl leading-relaxed">
            CAELIS AI continuously buffers spacecraft telemetry at 64Hz, identifies anomaly patterns, and hands verified hypothesis packets to the physical causal engine without hallucinations.
          </p>
        </div>

        {/* Metric Scoreboard / Control Ribbon */}
        <div className="p-4 sm:p-6 paper-texture border-2 border-[#1A1A1A]/30 dark:border-[#FAF6EE]/30 shadow-2xl mb-8 flex flex-col md:flex-row items-center justify-between gap-6 torn-paper-card">
          
          {/* Telemetry Stream to Neural Feature Extraction */}
          <div className="flex items-center gap-4 sm:gap-8">
            <div className="text-left">
              <span className="text-[10px] font-mono-tech text-[#625A50] dark:text-[#94A3B8] font-bold uppercase tracking-wider block">
                RAW TELEMETRY STREAM
              </span>
              <div className="text-3xl sm:text-5xl font-headline font-black text-[#DC143C] leading-none my-0.5">
                128 PTS
              </div>
              <span className="text-[10px] font-mono-tech text-[#DC143C] block font-bold">
                64Hz SLIDING WINDOW
              </span>
            </div>

            <div className="text-2xl sm:text-3xl font-headline font-black text-[#1A1A1A] dark:text-[#FAF6EE]/60">➔</div>

            <div className="text-left">
              <span className="text-[10px] font-mono-tech text-[#625A50] dark:text-[#94A3B8] font-bold uppercase tracking-wider block">
                NEURAL FEATURE EXTRACTION
              </span>
              <div className="text-3xl sm:text-5xl font-headline font-black text-[#C5A945] leading-none my-0.5">
                94.2%
              </div>
              <span className="text-[10px] font-mono-tech text-[#C5A945] block font-bold">
                CANDIDATE RECOGNIZED
              </span>
            </div>
          </div>

          {/* Engine Engaged Control Button */}
          <div className="flex items-center gap-3 bg-[#1A1A1A] dark:bg-[#1A1A1A]/60 dark:backdrop-blur-sm dark:border dark:border-[#FAF6EE]/30 p-2.5 sm:p-3 border border-[#1A1A1A]">
            <span className="text-xs font-mono-tech text-[#FAF6EE] font-bold">CAELIS ENGINE:</span>
            <button
              onClick={() => setEngineEngaged(!engineEngaged)}
              className={`px-3.5 py-2 text-xs font-mono-tech font-bold uppercase transition-all flex items-center gap-2 cursor-pointer ${
                engineEngaged
                  ? 'bg-[#C5A945] text-[#FAF6EE] shadow-md hover:bg-[#8A6A20]'
                  : 'bg-[#DC143C] text-[#FAF6EE] hover:bg-[#A8152B]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{engineEngaged ? '✨ NEURAL RECOGNITION (ENGAGED)' : '⏸ STANDBY (MANUAL)'}</span>
            </button>
          </div>

        </div>

        {/* The 6 Pattern Recognition Cards Grid (3x2) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
          {patternCards.map((card) => {
            const Icon = card.badgeIcon;
            const isSelected = selectedCard === card.id;

            return (
              <div
                key={card.id}
                onClick={() => setSelectedCard(isSelected ? null : card.id)}
                className={`relative p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between paper-texture torn-paper-card ${
                  card.isHighlight
                    ? 'border-2 border-dashed border-[#C5A945] shadow-xl ring-2 ring-[#C5A945]/30'
                    : isSelected
                    ? 'border-2 border-[#DC143C] shadow-xl scale-[1.01]'
                    : 'border-2 border-[#1A1A1A]/20 dark:border-[#FAF6EE]/20 shadow-md hover:border-[#1A1A1A]/50 dark:border-[#FAF6EE]/50'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-[#1A1A1A]/15 dark:border-[#FAF6EE]/15 pb-2 mb-3">
                    <div className="flex items-center gap-1.5 font-mono-tech text-[11px] font-bold px-2 py-0.5 bg-[#1A1A1A] dark:bg-[#1A1A1A]/60 dark:backdrop-blur-sm dark:border dark:border-[#FAF6EE]/30 text-[#FAF6EE]">
                      <Icon className="w-3 h-3 text-[#E5C76B]" />
                      <span>{card.badge}</span>
                    </div>
                    <span className="font-mono-tech text-xs text-[#DC143C] font-bold">
                      {card.timestamp}
                    </span>
                  </div>

                  {/* Title & Subhead */}
                  <h3 className="font-headline font-bold text-base sm:text-lg text-[#1A1A1A] dark:text-[#FAF6EE] leading-tight">
                    {card.title}
                  </h3>

                  <p className="text-[11px] font-mono-tech text-[#C5A945] font-bold uppercase mt-1 mb-2 tracking-wider">
                    {card.subhead}
                  </p>

                  <p className="text-xs font-mono-tech text-[#1A1A1A] dark:text-[#FAF6EE]/80 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                {/* Bottom Status Box */}
                <div className="mt-4 p-2.5 bg-[#1A1A1A] dark:bg-[#1A1A1A]/60 dark:backdrop-blur-sm dark:border dark:border-[#FAF6EE]/30 border border-[#1A1A1A] text-[10.5px] font-mono-tech">
                  <div className="flex items-center gap-1.5 font-bold mb-0.5">
                    {card.statusType === 'star' ? (
                      <span className="text-[#E5C76B]">★</span>
                    ) : (
                      <span className="text-emerald-400">✓</span>
                    )}
                    <span className={card.statusType === 'star' ? 'text-[#E5C76B]' : 'text-[#FAF6EE]'}>
                      {card.statusHeading}
                    </span>
                  </div>
                  <div className="text-[#FAF6EE]/60 truncate font-mono text-[10px]">
                    {card.statusDetail}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Engineering Summary Bar */}
        <div className="mt-8 p-6 bg-[#1A1A1A] dark:bg-[#1A1A1A]/60 dark:backdrop-blur-sm dark:border dark:border-[#FAF6EE]/30 border-l-4 border-[#C5A945] flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div>
            <span className="text-xs font-mono-tech text-[#C5A945] font-bold uppercase tracking-wider block mb-1">
              ENGINEERING SUMMARY // POWERED BY CAELIS AI:
            </span>
            <p className="text-xs sm:text-sm font-typewriter text-[#FAF6EE]/90">
              "By decoupling neural feature recognition from temporal Bayesian validation, CAELIS AI eliminates hallucinatory causal links while capturing microsecond anomaly precursors."
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onOpenCaelis && (
              <button
                onClick={onOpenCaelis}
                className="px-4 py-2.5 text-xs font-mono-tech font-bold uppercase bg-transparent dark:bg-transparent text-[#1A1A1A] dark:text-[#FAF6EE] border border-[#1A1A1A] hover:bg-[#E2D5C0] transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Cpu className="w-3.5 h-3.5 text-[#DC143C]" />
                <span>04 · CAELIS AI ARCHITECTURE</span>
              </button>
            )}

            {onProceedToCaseClosed && (
              <button
                onClick={onProceedToCaseClosed}
                className="btn-dossier-crimson px-5 py-2.5 text-xs font-mono-tech font-bold uppercase flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <span>CLOSE THE CASE</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>
    </section>
  );
};


