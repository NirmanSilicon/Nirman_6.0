import React from 'react';
import { FailureModeScenario } from '../../data/reconstructionData';
import { 
  AlertTriangle, 
  ShieldCheck, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  RotateCcw, 
  Layers, 
  BookOpen, 
  Camera, 
  CheckCircle2,
  Clock,
  Zap,
  Radio
} from 'lucide-react';

interface IncidentHeaderBarProps {
  scenario: FailureModeScenario;
  onOpenLibrary: () => void;
  isMinimumCausalOnly: boolean;
  onToggleMinimumCausal: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentStepIndex: number;
  totalSteps: number;
  onStepForward: () => void;
  onStepBackward: () => void;
  onResetPlayback: () => void;
  onCaptureScreenshot: () => void;
  theme?: 'light' | 'dark';
}

export const IncidentHeaderBar: React.FC<IncidentHeaderBarProps> = ({
  scenario,
  onOpenLibrary,
  isMinimumCausalOnly,
  onToggleMinimumCausal,
  isPlaying,
  onTogglePlay,
  currentStepIndex,
  totalSteps,
  onStepForward,
  onStepBackward,
  onResetPlayback,
  onCaptureScreenshot,
  theme
}) => {
  const isDark = theme === 'dark';

  return (
    <div className="bg-[#1A1A1A] text-[#FAF6EE] border-2 border-[#1A1A1A] shadow-xl p-4 sm:p-5 select-none relative overflow-hidden">
      
      {/* Background Subtle Wire Grid */}
      <div className="absolute inset-0 bg-circuit-pattern opacity-10 pointer-events-none"></div>

      {/* Top Banner Row: Incident Timestamp Range + Confidence Badge + Quick Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#FAF6EE]/20 pb-4 relative z-10">
        
        {/* Left: Incident Reference, Title & Timestamp */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#DC143C] animate-pulse shadow-[0_0_8px_#DC143C]"></span>
            <span className="text-xs sm:text-sm font-mono-tech font-bold uppercase tracking-wider text-[#DC143C]">
              INCIDENT / {scenario.incidentTimeRange}
            </span>
          </div>

          <span className="hidden sm:inline text-[#FAF6EE]/30">|</span>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono-tech text-[#E5C76B] font-bold px-2 py-0.5 bg-[#E5C76B]/15 border border-[#E5C76B]/30 rounded-xs">
              {scenario.code}
            </span>
            <span className="text-xs font-mono-tech text-[#FAF6EE]/80 truncate max-w-xs sm:max-w-md" title={scenario.title}>
              {scenario.title}
            </span>
          </div>
        </div>

        {/* Right: Overall Bayesian Confidence Rating */}
        <div className="flex items-center gap-3 self-start lg:self-center">
          <div className="flex items-center gap-2 bg-[#26221F] border border-[#FAF6EE]/20 px-3 py-1.5 rounded-xs">
            <span className="text-[10px] font-mono-tech text-[#FAF6EE]/60 uppercase tracking-widest font-bold">
              BAYESIAN POSTERIOR
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-mono-tech font-bold text-[#E5C76B]">CONF</span>
              <span className="text-base sm:text-lg font-headline font-black text-emerald-400">
                {scenario.overallConfidence.toFixed(2)}
              </span>
            </div>
            <span className="text-[9px] font-mono-tech text-[#FAF6EE]/50">
              ({scenario.uncertainty})
            </span>
          </div>

          {/* Failure Mode Library Button */}
          <button
            onClick={onOpenLibrary}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono-tech font-bold uppercase bg-[#FAF6EE] text-[#1A1A1A] hover:bg-[#E5C76B] border border-[#FAF6EE] transition-colors shadow-sm cursor-pointer"
            title="Browse Spacecraft Failure-Mode Library"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#DC143C]" />
            <span className="hidden sm:inline">FAILURE-MODE LIBRARY</span>
            <span className="sm:hidden">LIBRARY</span>
          </button>
        </div>

      </div>

      {/* Second Row: Feature Controls (Minimum Causal Explanation Toggle + Temporal Timeline Player) */}
      <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        
        {/* Feature 12: Minimum Causal Explanation Mode (Occam's DAG Pruning Toggle) */}
        <div className="flex items-center gap-3">
          <div 
            onClick={onToggleMinimumCausal}
            className="flex items-center gap-2.5 px-3 py-1.5 bg-[#26221F] border border-[#FAF6EE]/25 hover:border-[#E5C76B] cursor-pointer transition-all rounded-xs group"
          >
            <div className={`w-4 h-4 rounded-xs flex items-center justify-center border transition-colors ${
              isMinimumCausalOnly 
                ? 'bg-[#DC143C] border-[#DC143C] text-white' 
                : 'border-[#FAF6EE]/40 bg-transparent'
            }`}>
              {isMinimumCausalOnly && <CheckCircle2 className="w-3 h-3" />}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-xs font-mono-tech font-bold text-[#FAF6EE] group-hover:text-[#E5C76B]">
                <Layers className="w-3 h-3 text-[#E5C76B]" />
                <span>MINIMUM CAUSAL EXPLANATION</span>
                <span className="text-[9px] px-1 bg-[#DC143C] text-[#FAF6EE] font-bold">
                  OCCAM'S DAG
                </span>
              </div>
              <span className="text-[10px] font-mono-tech text-[#FAF6EE]/60">
                {isMinimumCausalOnly 
                  ? 'Pruned 3 non-causal feedback echoes · Showing irreducible path' 
                  : 'Displaying complete coupled multi-subsystem topology'}
              </span>
            </div>
          </div>
        </div>

        {/* Feature 11: Temporal Ordering / Timeline Playback Controller */}
        <div className="flex items-center gap-2 bg-[#26221F] border border-[#FAF6EE]/20 px-3 py-1.5 rounded-xs self-start md:self-center">
          <div className="flex items-center gap-1.5 text-xs font-mono-tech text-[#FAF6EE]/80 mr-2">
            <Clock className="w-3.5 h-3.5 text-[#E5C76B]" />
            <span className="font-bold">TEMPORAL PROPAGATION:</span>
            <span className="text-[#E5C76B] font-bold">
              STEP {currentStepIndex + 1}/{totalSteps}
            </span>
          </div>

          <button
            onClick={onStepBackward}
            disabled={currentStepIndex === 0}
            className="p-1 text-[#FAF6EE]/70 hover:text-[#FAF6EE] disabled:opacity-30 transition-colors cursor-pointer"
            title="Previous Causal Step"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onTogglePlay}
            className="px-2 py-1 bg-[#FAF6EE] text-[#1A1A1A] hover:bg-[#E5C76B] font-mono-tech font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
            title={isPlaying ? "Pause Causal Wave" : "Play Causal Sequence"}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3 h-3 text-[#DC143C]" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 text-[#DC143C] fill-[#DC143C]" />
                <span>TRACE</span>
              </>
            )}
          </button>

          <button
            onClick={onStepForward}
            disabled={currentStepIndex >= totalSteps - 1}
            className="p-1 text-[#FAF6EE]/70 hover:text-[#FAF6EE] disabled:opacity-30 transition-colors cursor-pointer"
            title="Next Causal Step"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onResetPlayback}
            className="p-1 text-[#FAF6EE]/70 hover:text-[#FAF6EE] transition-colors cursor-pointer ml-1"
            title="Reset Timeline to Origin"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Screenshot / Dossier Export */}
          <button
            onClick={onCaptureScreenshot}
            className="ml-2 pl-2 border-l border-[#FAF6EE]/20 text-[#FAF6EE]/80 hover:text-[#E5C76B] text-[11px] font-mono-tech flex items-center gap-1 cursor-pointer transition-colors"
            title="Export Evidence Dossier"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">SNAPSHOT</span>
          </button>
        </div>

      </div>

    </div>
  );
};
