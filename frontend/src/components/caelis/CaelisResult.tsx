import React, { useEffect, useRef, useState } from 'react';
import { AiEvent } from '../../types/caelis';
import { ShieldAlert, Cpu, CheckCircle2, AlertCircle, FileText, Zap, Radio, Scan } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CaelisResultProps {
  aiEvent: AiEvent | null;
  processing: boolean;
  scanState?: 'idle' | 'animating' | 'complete';
  onAnimationComplete?: () => void;
}

export const CaelisResult: React.FC<CaelisResultProps> = ({ 
  aiEvent, 
  processing,
  scanState = processing ? 'animating' : aiEvent ? 'complete' : 'idle',
  onAnimationComplete 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Configure video playback speed to target ~6.67 seconds (10s source / 1.5x)
  useEffect(() => {
    if (scanState === 'animating' && videoRef.current) {
      const video = videoRef.current;
      video.playbackRate = 1.5;
      video.currentTime = 0;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Video autoPlay prevented, fallback handler active:', err);
        });
      }

      // Safety timeout in case of unexpected video stalls (~7 seconds)
      const safetyTimer = setTimeout(() => {
        if (onAnimationComplete) {
          onAnimationComplete();
        }
      }, 7000);

      return () => {
        clearTimeout(safetyTimer);
      };
    }
  }, [scanState, onAnimationComplete]);

  const handleVideoEnded = () => {
    if (onAnimationComplete) {
      onAnimationComplete();
    }
  };

  return (
    <div className="bg-[#FAF6EE] border-2 border-[#1A1A1A] shadow-md torn-paper-card flex flex-col h-full overflow-hidden min-h-[420px] transition-all">
      <AnimatePresence mode="wait">
        
        {/* ── STATE 1: IDLE ────────────────────────────────────────── */}
        {scanState === 'idle' && (
          <motion.div
            key="state-idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b-2 border-[#1A1A1A]/20 bg-[#F0EAD6] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#DC143C]" />
                <h3 className="font-headline font-black text-xl text-[#1A1A1A] tracking-tight">
                  AI COGNITION EVALUATION
                </h3>
              </div>
              <span className="text-[10px] font-mono-tech font-bold uppercase bg-[#1A1A1A] text-[#FAF6EE] px-2 py-0.5">
                STANDBY
              </span>
            </div>

            {/* Body */}
            <div className="flex-grow p-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-none border-2 border-[#1A1A1A] bg-[#F0EAD6] flex items-center justify-center text-[#DC143C] shadow-sm">
                <Scan className="w-6 h-6 animate-pulse" />
              </div>

              <div className="space-y-1 max-w-xs">
                <div className="font-mono-tech text-xs font-black uppercase text-[#1A1A1A]">
                  AWAITING PATTERN SCAN
                </div>
                <div className="text-[11px] font-mono-tech text-[#625A50] leading-relaxed">
                  Click <strong className="text-[#DC143C]">"EXECUTE PATTERN SCAN"</strong> above to evaluate 128 telemetry samples and compute SHAP attributions.
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STATE 2: ANALYZING / VIDEO (IN-PLACE PATTERN SCAN ANIMATION) ── */}
        {scanState === 'animating' && (
          <motion.div
            key="state-animating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b-2 border-[#1A1A1A]/20 bg-[#F0EAD6] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#DC143C] animate-pulse" />
                <h3 className="font-headline font-black text-xl text-[#1A1A1A] tracking-tight">
                  AI COGNITION EVALUATION
                </h3>
              </div>
              <span className="text-[10px] font-mono-tech font-bold uppercase bg-[#DC143C] text-[#FAF6EE] px-2 py-0.5 animate-pulse">
                PATTERN SCANNING
              </span>
            </div>

            {/* Video Container (Preserving Exact Animation) */}
            <div className="relative w-full flex-grow bg-black min-h-[260px] sm:min-h-[300px] flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                src="/images/REMOVE_EVERY_TEXT_FROM_THE_VID.mp4"
                autoPlay
                muted
                playsInline
                onEnded={handleVideoEnded}
                className="w-full h-full object-cover select-none"
              />
            </div>

            {/* Bottom Status Info Strip */}
            <div className="p-3 bg-[#F0EAD6] border-t-2 border-[#1A1A1A]/20 flex items-center justify-between text-xs font-mono-tech">
              <div className="flex items-center gap-2 text-[#1A1A1A] font-bold">
                <Cpu className="w-3.5 h-3.5 text-[#DC143C] animate-spin" />
                <span>EVALUATING 128 SAMPLES...</span>
              </div>
              <div className="text-[10px] text-[#625A50] font-bold">
                CALCULATING SHAP MATRIX
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STATE 3: RESULT (AUTHORITATIVE CAELIS ASSESSMENT) ───── */}
        {scanState === 'complete' && aiEvent && (
          <motion.div
            key="state-complete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col h-full"
          >
            {/* Result Header */}
            <div className="p-4 sm:p-5 border-b-2 border-[#1A1A1A]/20 bg-[#F0EAD6] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#DC143C]" />
                <h3 className="font-headline font-black text-xl text-[#1A1A1A] tracking-tight">
                  CAELIS AI ASSESSMENT
                </h3>
              </div>
              
              {aiEvent.is_anomaly ? (
                <span className="text-[10px] font-mono-tech font-bold uppercase bg-[#DC143C] text-[#FAF6EE] px-2 py-0.5 shadow-sm">
                  ANOMALY CANDIDATE
                </span>
              ) : (
                <span className="text-[10px] font-mono-tech font-bold uppercase bg-emerald-800 text-white px-2 py-0.5 shadow-sm">
                  NOMINAL
                </span>
              )}
            </div>
            
            {/* Parameter Matrix */}
            <div className="p-5 flex-grow space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs font-mono-tech">
                <div className="p-2.5 bg-[#FAF6EE] border border-[#1A1A1A]/20">
                  <span className="text-[10px] text-[#625A50] block mb-0.5">COMPONENT</span>
                  <strong className="text-[#1A1A1A] text-xs uppercase">{aiEvent.component}</strong>
                </div>
                <div className="p-2.5 bg-[#FAF6EE] border border-[#1A1A1A]/20">
                  <span className="text-[10px] text-[#625A50] block mb-0.5">CLASSIFIED EVENT</span>
                  <strong className="text-[#1A1A1A] text-xs">{aiEvent.event_type}</strong>
                </div>
                <div className="p-2.5 bg-[#FAF6EE] border border-[#1A1A1A]/20">
                  <span className="text-[10px] text-[#625A50] block mb-0.5">TIMESTAMP</span>
                  <strong className="text-[#C5A945] text-xs">{aiEvent.timestamp}</strong>
                </div>
                <div className="p-2.5 bg-[#FAF6EE] border border-[#1A1A1A]/20">
                  <span className="text-[10px] text-[#625A50] block mb-0.5">DETECTION STACK</span>
                  <strong className="text-[#1A1A1A] text-xs uppercase">{aiEvent.source.replace(/_/g, ' ')}</strong>
                </div>
              </div>

              {/* Confidence Meter Box - Warm Paper Dossier Card */}
              <div className="p-4 bg-[#F0EAD6] text-[#1A1A1A] border-2 border-[#1A1A1A]/30 shadow-inner">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-mono-tech text-[#625A50] uppercase tracking-wider font-bold">
                    MODEL CONFIDENCE SCORE
                  </span>
                  <span className={`text-base font-mono-tech font-bold ${aiEvent.is_anomaly ? 'text-[#DC143C]' : 'text-[#C5A945]'}`}>
                    {(aiEvent.confidence * 100).toFixed(1)}%
                  </span>
                </div>

                {/* Tactical Meter Progress */}
                <div className="w-full bg-[#1A1A1A]/15 h-2 rounded-none overflow-hidden mb-2">
                  <div 
                    className={`h-full transition-all duration-500 ${aiEvent.is_anomaly ? 'bg-[#DC143C]' : 'bg-[#C5A945]'}`}
                    style={{ width: `${(aiEvent.confidence * 100).toFixed(1)}%` }}
                  ></div>
                </div>

                <div className="font-mono-tech text-[10px] tracking-widest text-[#C5A945] break-all leading-none">
                  {Array.from({ length: 20 }).map((_, i) => i < Math.round(aiEvent.confidence * 20) ? '█' : '░').join('')}
                </div>
              </div>

              {/* Operational Guidance note */}
              <div className="p-3 bg-[#F0EAD6]/70 border-l-4 border-[#DC143C] text-xs font-typewriter text-[#1A1A1A]/90 leading-relaxed">
                {aiEvent.is_anomaly ? (
                  <p>
                    <strong>AI Candidate Generated:</strong> Signal deviation matches known failure precursor signatures. Hand off to Causal Validation to confirm if this event is root origin or cascaded effect.
                  </p>
                ) : (
                  <p>
                    <strong>Nominal Range:</strong> Signal parameters remain within 2.5 sigma bounds. If downstream subsystem alarms fire, perform causal root-cause search for un-flagged bias.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};
