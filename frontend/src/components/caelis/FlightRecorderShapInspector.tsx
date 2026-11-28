import React, { useState, useRef, useEffect } from 'react';
import { AiEvent, FeatureVector } from '../../types/caelis';
import { mockEventStream, mockAiEvents } from '../../data/caelisMock';
import { motion, AnimatePresence } from 'motion/react';
import { getLenis } from '../../hooks/useSmoothScroll';
import { 
  BarChart3, 
  Radio, 
  Cpu, 
  ChevronRight, 
  ChevronLeft,
  ArrowLeft, 
  Info, 
  Check, 
  X, 
  Sliders,
  Layers,
  LayoutGrid,
  Columns
} from 'lucide-react';

interface FlightRecorderShapInspectorProps {
  aiEvent: AiEvent | null;
  selectedEventId: string;
  onSelectEvent: (eventId: string) => void;
  processing: boolean;
}

const FEATURE_NAMES: Record<keyof FeatureVector, string> = {
  feat_rate_of_change: 'RATE OF CHANGE (dY/dt)',
  feat_mean: 'WINDOW MEAN DRIFT',
  feat_std: 'SAMPLE VARIANCE / STD DEV',
  feat_range: 'PEAK-TO-PEAK SPREAD',
  feat_skewness: 'DISTRIBUTION SKEWNESS',
  feat_max: 'UPPER SATURATION LIMIT',
  feat_min: 'LOWER FLOOR LIMIT',
  feat_predicted: 'PHYSICAL MODEL PREDICTION',
  feat_residual: 'PHYSICAL RESIDUAL (OBS - PRED)',
  feat_residual_normalized: 'NORMALIZED RESIDUAL (Z-RES)',
  feat_is_physically_inconsistent: 'PHYSICS INCONSISTENCY FLAG'
};

const FEATURE_DESCRIPTIONS: Record<keyof FeatureVector, string> = {
  feat_rate_of_change: 'The telemetry aperture contains an unnatural sudden steep transition between consecutive sensor polls.',
  feat_mean: 'The floating average signal value has shifted significantly away from the nominal orbital steady-state baseline.',
  feat_std: 'High-frequency jitter variance is unusually elevated compared to nominal quiescent operating parameters.',
  feat_range: 'The absolute divergence between maximum and minimum recorded values exceeds the standard 3-sigma corridor.',
  feat_skewness: 'The distribution profile is strongly asymmetrical, indicating persistent one-directional sensor drift.',
  feat_max: 'The upper circuit safety envelope was breached within the 128-sample window.',
  feat_min: 'The lower sensor calibration threshold was breached within the 128-sample window.',
  feat_predicted: 'Expected physics-informed baseline derived from low-order discrete state equations and adjacent subsystem cross-coupling.',
  feat_residual: 'Discrepancy between raw sensor observations and expected physical laws (e.g. thermal dissipation or Ohm/Kirchhoff coupling).',
  feat_residual_normalized: 'Residual divergence scaled by channel standard deviation to gauge statistical severity of the physical violation.',
  feat_is_physically_inconsistent: 'Binary or continuous indicator flagging non-compliant thermodynamic or electrical state behavior.'
};

export const FlightRecorderShapInspector: React.FC<FlightRecorderShapInspectorProps> = ({
  aiEvent,
  selectedEventId,
  onSelectEvent,
  processing
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<'select_record' | 'view_shap'>('select_record');
  const [selectedFeature, setSelectedFeature] = useState<keyof FeatureVector | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'reel'>('grid');

  const reelScrollRef = useRef<HTMLDivElement>(null);

  // Pause Lenis global smooth scroll when modal is open to ensure native modal scrolling works flawlessly
  useEffect(() => {
    if (isOpen) {
      const lenis = getLenis();
      lenis?.stop();
      return () => {
        lenis?.start();
      };
    }
  }, [isOpen]);

  // Find the selected event record details from mockEventStream
  const currentRecord = mockEventStream.find(e => e.id === selectedEventId) || mockEventStream[0];

  // Helper to get matching AI event if aiEvent doesn't match yet
  const displayedAiEvent = aiEvent || mockAiEvents['thermal_sensor'];

  // Features transformed and sorted by absolute SHAP weight
  const features = Object.entries(displayedAiEvent.feature_vector).map(([key, value]) => ({
    key: key as keyof FeatureVector,
    name: FEATURE_NAMES[key as keyof FeatureVector],
    value: value as number,
    absVal: Math.abs(value as number)
  })).sort((a, b) => b.absVal - a.absVal);

  const maxAbs = Math.max(...features.map(f => f.absVal), 1);

  const handleRecordClick = (eventId: string) => {
    onSelectEvent(eventId);
    // Smoothly advance to Step 2 to view SHAP attribution
    setActiveStep('view_shap');
  };

  const handleScrollReel = (direction: 'left' | 'right') => {
    if (reelScrollRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      reelScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full">
      {/* ── COMPRESSED BUTTON & TRIGGER CARD ──────────────────────────── */}
      <div className="p-5 sm:p-6 bg-[#FAF6EE] border-2 border-[#1A1A1A] shadow-md torn-paper-card transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#1A1A1A] text-[#FAF6EE] text-[10px] font-mono-tech font-bold uppercase tracking-wider">
                <Radio className="w-3 h-3 text-[#DC143C] animate-pulse" />
                MODULE 04 // COMBINED XAI SUITE
              </span>
              <span className="text-[10px] font-mono-tech text-[#625A50] font-bold">
                8 FLIGHT RECORDS SYNCHRONIZED
              </span>
            </div>

            <h3 className="font-headline font-black text-xl sm:text-2xl text-[#1A1A1A] tracking-tight">
              FLIGHT RECORDER & SHAP ATTRIBUTION MATRIX
            </h3>

            <p className="text-xs font-mono-tech text-[#625A50] max-w-2xl">
              Combined flight recorder replay and explainable AI matrix. First select an archival flight record packet to inspect, then decompose its 128-sample SHAP feature attribution weights.
            </p>
          </div>

          {/* Primary Action Button */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="hidden sm:flex flex-col text-right font-mono-tech">
              <span className="text-[9px] text-[#625A50] uppercase">ACTIVE TELEMETRY TARGET</span>
              <span className="text-xs font-bold text-[#DC143C]">
                {currentRecord ? `[${currentRecord.time}] ${currentRecord.component}` : 'SELECT TO INSPECT'}
              </span>
            </div>

            <button
              onClick={() => {
                setIsOpen(true);
                setActiveStep('select_record');
              }}
              className="inline-flex items-center gap-2.5 px-5 py-3 bg-[#DC143C] hover:bg-[#B01030] text-[#FAF6EE] font-mono-tech font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer transform hover:-translate-y-0.5 border border-[#1A1A1A]"
            >
              <Sliders className="w-4 h-4" />
              <span>INSPECT FLIGHT RECORD & SHAP</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* ── EXPANDED 2-STEP MODAL / DOSSIER WORKFLOW (GUARANTEED VISIBILITY & ROBUST SCROLL) ─── */}
      <AnimatePresence>
        {isOpen && (
          <div 
            className="fixed inset-0 z-50 overflow-y-auto bg-[#1A1A1A]/90 backdrop-blur-xs p-2 sm:p-4 md:p-6 flex flex-col items-center justify-start sm:justify-center min-h-screen"
            data-lenis-prevent="true"
          >
            {/* Modal Backdrop Click */}
            <div 
              className="fixed inset-0 -z-10" 
              onClick={() => setIsOpen(false)} 
              aria-hidden="true" 
            />

            {/* Modal Dialog Card (Guaranteed inside viewport, full header visibility, native scrolling) */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-5xl my-auto max-h-[88vh] sm:max-h-[84vh] flex flex-col bg-[#FAF6EE] border-2 border-[#1A1A1A] shadow-2xl z-10 overflow-hidden"
              data-lenis-prevent="true"
            >
              {/* Modal Top Header (Fixed flex-shrink-0 with clear spacing) */}
              <div className="flex-shrink-0 px-4 sm:px-6 py-3.5 sm:py-4 bg-[#F0EAD6] border-b-2 border-[#1A1A1A] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-3 h-3 bg-[#DC143C] flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono-tech font-bold text-[#625A50] tracking-wider uppercase">
                      AEROSPACE TELEMETRY AUDIT · CAELIS AI ENGINE
                    </div>
                    <h2 className="font-headline font-black text-base sm:text-xl md:text-2xl text-[#1A1A1A] tracking-tight truncate">
                      FLIGHT RECORDER & SHAP XAI DECOMPOSITION
                    </h2>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 sm:p-2 bg-[#FAF6EE] hover:bg-[#DC143C] text-[#1A1A1A] hover:text-[#FAF6EE] border-2 border-[#1A1A1A] transition-colors cursor-pointer flex-shrink-0"
                  title="Close Inspector"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Step Navigation Bar (Fixed flex-shrink-0) */}
              <div className="flex-shrink-0 px-4 sm:px-6 py-2 bg-[#EAE2CE] border-b-2 border-[#1A1A1A]/20 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tech">
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Step 1 Tab Button */}
                  <button
                    onClick={() => setActiveStep('select_record')}
                    className={`flex items-center gap-2 px-3 py-1 border font-bold transition-all cursor-pointer text-xs ${
                      activeStep === 'select_record'
                        ? 'bg-[#1A1A1A] text-[#FAF6EE] border-[#1A1A1A]'
                        : 'bg-[#FAF6EE] text-[#1A1A1A] border-[#1A1A1A]/30 hover:border-[#1A1A1A]'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-[#DC143C] text-[#FAF6EE] text-[9px] flex items-center justify-center font-black">
                      1
                    </span>
                    <span>STEP 1: SELECT FLIGHT RECORD</span>
                  </button>

                  <ChevronRight className="w-3.5 h-3.5 text-[#625A50] hidden sm:block" />

                  {/* Step 2 Tab Button */}
                  <button
                    onClick={() => setActiveStep('view_shap')}
                    className={`flex items-center gap-2 px-3 py-1 border font-bold transition-all cursor-pointer text-xs ${
                      activeStep === 'view_shap'
                        ? 'bg-[#DC143C] text-[#FAF6EE] border-[#DC143C]'
                        : 'bg-[#FAF6EE] text-[#1A1A1A] border-[#1A1A1A]/30 hover:border-[#1A1A1A]'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-[#FAF6EE] text-[#1A1A1A] text-[9px] flex items-center justify-center font-black">
                      2
                    </span>
                    <span>STEP 2: SHAP ATTRIBUTION MATRIX</span>
                  </button>
                </div>

                <div className="text-[11px] font-mono-tech text-[#625A50]">
                  ACTIVE PACKET: <strong className="text-[#1A1A1A]">[{currentRecord.time}] {currentRecord.component}</strong>
                </div>
              </div>

              {/* Scrollable Modal Content Body (flex-1 min-h-0 overflow-y-auto) */}
              <div 
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5"
                data-lenis-prevent="true"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#DC143C #EAE2CE' }}
              >
                
                {/* ── STEP 1: SELECT FLIGHT RECORD ──────────────────────── */}
                {activeStep === 'select_record' && (
                  <motion.div
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 6 }}
                    className="space-y-4"
                  >
                    {/* Header with View Mode and Scrolling Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1A1A1A]/20 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Radio className="w-4 h-4 text-[#DC143C]" />
                          <h4 className="font-headline font-black text-lg text-[#1A1A1A] leading-tight">
                            SELECT FLIGHT RECORDER TELEMETRY PACKET
                          </h4>
                        </div>
                        <p className="text-xs font-mono-tech text-[#625A50] mt-0.5">
                          Click any archival telemetry packet from the stream below to load its raw signal and inspect its SHAP feature vector.
                        </p>
                      </div>

                      {/* View Switcher & Scroll Controls */}
                      <div className="flex items-center gap-2">
                        {viewMode === 'reel' && (
                          <div className="flex items-center gap-1 mr-2">
                            <button
                              onClick={() => handleScrollReel('left')}
                              className="p-1 bg-[#FAF6EE] hover:bg-[#1A1A1A] text-[#1A1A1A] hover:text-[#FAF6EE] border border-[#1A1A1A] transition-colors cursor-pointer"
                              title="Scroll Left"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleScrollReel('right')}
                              className="p-1 bg-[#FAF6EE] hover:bg-[#1A1A1A] text-[#1A1A1A] hover:text-[#FAF6EE] border border-[#1A1A1A] transition-colors cursor-pointer"
                              title="Scroll Right"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        <div className="flex items-center border border-[#1A1A1A] bg-[#FAF6EE] text-[10px] font-mono-tech font-bold">
                          <button
                            onClick={() => setViewMode('grid')}
                            className={`px-2.5 py-1 flex items-center gap-1.5 cursor-pointer ${
                              viewMode === 'grid' ? 'bg-[#1A1A1A] text-[#FAF6EE]' : 'text-[#1A1A1A] hover:bg-[#EAE2CE]'
                            }`}
                          >
                            <LayoutGrid className="w-3 h-3" />
                            <span>GRID</span>
                          </button>
                          <button
                            onClick={() => setViewMode('reel')}
                            className={`px-2.5 py-1 flex items-center gap-1.5 cursor-pointer ${
                              viewMode === 'reel' ? 'bg-[#1A1A1A] text-[#FAF6EE]' : 'text-[#1A1A1A] hover:bg-[#EAE2CE]'
                            }`}
                          >
                            <Columns className="w-3 h-3" />
                            <span>TAPE REEL</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* GRID VIEW (Compact, perfectly proportioned, all 8 items visible) */}
                    {viewMode === 'grid' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                        {mockEventStream.map((evt, idx) => {
                          const isSelected = evt.id === selectedEventId;
                          const isAnomaly = evt.event === 'ANOMALY' || evt.event === 'CRITICAL' || evt.event === 'LOSS' || evt.event === 'OFFLINE';

                          return (
                            <div
                              key={`grid-${evt.id}-${idx}`}
                              onClick={() => handleRecordClick(evt.id)}
                              className={`p-3 border-2 transition-all cursor-pointer flex flex-col justify-between min-h-[135px] ${
                                isSelected
                                  ? 'bg-[#1A1A1A] text-[#FAF6EE] border-[#DC143C] shadow-md -translate-y-0.5'
                                  : 'bg-[#F0EAD6] text-[#1A1A1A] border-[#1A1A1A]/30 hover:border-[#DC143C] hover:bg-[#FAF6EE]'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className={`text-[10px] font-mono-tech font-bold px-1.5 py-0.5 ${
                                    isSelected ? 'bg-[#DC143C] text-[#FAF6EE]' : 'bg-[#FAF6EE] text-[#1A1A1A] border border-[#1A1A1A]/20'
                                  }`}>
                                    {evt.time}
                                  </span>

                                  <span className={`text-[8px] font-mono-tech font-bold uppercase px-1.5 py-0.5 ${
                                    isAnomaly 
                                      ? isSelected ? 'text-[#FAF6EE] bg-[#DC143C]' : 'text-[#DC143C] bg-[#DC143C]/10 border border-[#DC143C]/30'
                                      : isSelected ? 'text-[#FAF6EE] bg-[#C5A945]' : 'text-[#C5A945] bg-[#C5A945]/10 border border-[#C5A945]/30'
                                  }`}>
                                    {evt.event}
                                  </span>
                                </div>

                                <div className="font-mono-tech text-xs font-black uppercase mb-1 truncate">
                                  {evt.component}
                                </div>

                                <div className={`text-[10px] font-mono-tech leading-tight line-clamp-2 ${
                                  isSelected ? 'text-[#FAF6EE]/80' : 'text-[#625A50]'
                                }`}>
                                  Telemetry stream payload packet recorded at {evt.time}.
                                </div>
                              </div>

                              <div className="pt-1.5 border-t border-current/15 flex items-center justify-between text-[9px] font-mono-tech font-bold">
                                <span>{isSelected ? 'SELECTED TARGET' : 'CLICK TO SELECT'}</span>
                                <ChevronRight className="w-3 h-3" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* REEL SCROLLING VIEW (Horizontal Tape Stream with Navigation) */
                      <div className="relative pt-1" data-lenis-prevent="true">
                        <div className="flex items-center justify-between text-[10px] font-mono-tech text-[#625A50] mb-2 px-1">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#DC143C] animate-pulse" />
                            CHRONOLOGICAL FLIGHT RECORDER TAPE (SCROLL HORIZONTALLY)
                          </span>
                          <span>8 OF 8 FRAMES LOADED</span>
                        </div>

                        {/* Scrollable Horizontal Tape */}
                        <div 
                          ref={reelScrollRef}
                          data-lenis-prevent="true"
                          className="flex overflow-x-auto pb-3 pt-1 gap-3 scroll-smooth"
                          style={{ scrollbarWidth: 'thin', scrollbarColor: '#DC143C #EAE2CE' }}
                        >
                          {mockEventStream.map((evt, idx) => {
                            const isSelected = evt.id === selectedEventId;
                            const isAnomaly = evt.event === 'ANOMALY' || evt.event === 'CRITICAL' || evt.event === 'LOSS' || evt.event === 'OFFLINE';

                            return (
                              <div
                                key={`reel-${evt.id}-${idx}`}
                                onClick={() => handleRecordClick(evt.id)}
                                className={`flex-shrink-0 w-[220px] p-3.5 border-2 transition-all cursor-pointer flex flex-col justify-between min-h-[145px] ${
                                  isSelected
                                    ? 'bg-[#1A1A1A] text-[#FAF6EE] border-[#DC143C] shadow-md -translate-y-0.5'
                                    : 'bg-[#F0EAD6] text-[#1A1A1A] border-[#1A1A1A]/30 hover:border-[#DC143C] hover:bg-[#FAF6EE]'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className={`text-[10px] font-mono-tech font-bold px-1.5 py-0.5 ${
                                      isSelected ? 'bg-[#DC143C] text-[#FAF6EE]' : 'bg-[#FAF6EE] text-[#1A1A1A] border border-[#1A1A1A]/20'
                                    }`}>
                                      {evt.time}
                                    </span>

                                    <span className={`text-[8px] font-mono-tech font-bold uppercase px-1.5 py-0.5 ${
                                      isAnomaly 
                                        ? isSelected ? 'text-[#FAF6EE] bg-[#DC143C]' : 'text-[#DC143C] bg-[#DC143C]/10 border border-[#DC143C]/30'
                                        : isSelected ? 'text-[#FAF6EE] bg-[#C5A945]' : 'text-[#C5A945] bg-[#C5A945]/10 border border-[#C5A945]/30'
                                    }`}>
                                      {evt.event}
                                    </span>
                                  </div>

                                  <div className="font-mono-tech text-xs font-black uppercase mb-1 truncate">
                                    {evt.component}
                                  </div>

                                  <div className={`text-[10px] font-mono-tech leading-snug line-clamp-2 ${
                                    isSelected ? 'text-[#FAF6EE]/80' : 'text-[#625A50]'
                                  }`}>
                                    Continuous flight bus telemetry stream indexed at {evt.time}.
                                  </div>
                                </div>

                                <div className="pt-2 mt-1 border-t border-current/15 flex items-center justify-between text-[9px] font-mono-tech font-bold">
                                  <span>{isSelected ? 'SELECTED TARGET' : 'CLICK TO SELECT'}</span>
                                  <ChevronRight className="w-3 h-3" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── STEP 2: SHAP ATTRIBUTION MATRIX ────────────────────── */}
                {activeStep === 'view_shap' && (
                  <motion.div
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    className="space-y-4"
                  >
                    {/* Active Flight Record Header & Quick Switcher Strip */}
                    <div className="p-3 bg-[#F0EAD6] border-2 border-[#1A1A1A] flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => setActiveStep('select_record')}
                          className="px-2 py-1 bg-[#FAF6EE] hover:bg-[#1A1A1A] text-[#1A1A1A] hover:text-[#FAF6EE] border border-[#1A1A1A] text-xs font-mono-tech font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <ArrowLeft className="w-3 h-3" />
                          <span>CHANGE RECORD</span>
                        </button>

                        <div>
                          <div className="text-[9px] font-mono-tech text-[#625A50] font-bold">
                            CURRENTLY INSPECTING FLIGHT PACKET
                          </div>
                          <div className="text-xs font-mono-tech font-black text-[#1A1A1A] flex items-center gap-1.5">
                            <span className="text-[#DC143C]">[{currentRecord.time}]</span>
                            <span>{currentRecord.component}</span>
                            <span className="text-[10px] px-1 py-0.2 bg-[#1A1A1A] text-[#FAF6EE]">
                              {currentRecord.event}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quick horizontal packet switcher */}
                      <div 
                        className="flex items-center gap-1 overflow-x-auto pb-0.5 max-w-full"
                        data-lenis-prevent="true"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#DC143C #EAE2CE' }}
                      >
                        <span className="text-[9px] font-mono-tech text-[#625A50] font-bold mr-1 hidden lg:inline">
                          QUICK JUMP:
                        </span>
                        {mockEventStream.map((evt) => (
                          <button
                            key={`quick-${evt.id}`}
                            onClick={() => onSelectEvent(evt.id)}
                            className={`px-1.5 py-0.5 text-[9px] font-mono-tech font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                              evt.id === selectedEventId
                                ? 'bg-[#DC143C] text-[#FAF6EE] border-[#DC143C]'
                                : 'bg-[#FAF6EE] text-[#1A1A1A] border-[#1A1A1A]/30 hover:border-[#1A1A1A]'
                            }`}
                          >
                            {evt.time}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* SHAP Matrix Visual Decomposition Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                      
                      {/* Left: Feature Bars List */}
                      <div className="lg:col-span-7 space-y-2">
                        <div className="flex items-center justify-between font-mono-tech text-[10px] text-[#625A50] px-1">
                          <span>MATHEMATICAL FEATURE / APERTURE METRIC</span>
                          <span>SHAP WEIGHT</span>
                        </div>

                        {features.map((feat) => {
                          const widthPct = Math.min((feat.absVal / maxAbs) * 100, 100);
                          const isPositive = feat.value >= 0;
                          const isSelected = selectedFeature === feat.key;
                          
                          return (
                            <div 
                              key={feat.key} 
                              className={`cursor-pointer transition-all p-2.5 border-2 ${
                                isSelected 
                                  ? 'bg-[#F0EAD6] border-[#DC143C] shadow-xs -translate-y-0.5' 
                                  : 'bg-[#FAF6EE] border-[#1A1A1A]/20 hover:border-[#1A1A1A]'
                              }`}
                              onClick={() => setSelectedFeature(isSelected ? null : feat.key)}
                            >
                              <div className="flex justify-between items-center mb-1 font-mono-tech text-xs">
                                <div className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
                                  <span className={`w-1.5 h-1.5 rounded-full ${isPositive ? 'bg-[#DC143C]' : 'bg-[#C5A945]'}`}></span>
                                  <span className="text-xs">{feat.name}</span>
                                </div>
                                <div className={`font-bold text-xs ${isPositive ? 'text-[#DC143C]' : 'text-[#625A50]'}`}>
                                  {isPositive ? '+' : ''}{feat.value.toFixed(3)}
                                </div>
                              </div>

                              {/* Tactical Progress Meter */}
                              <div className="w-full bg-[#1A1A1A]/10 h-1.5 overflow-hidden flex">
                                <div 
                                  className={`h-full transition-all duration-300 ${isPositive ? 'bg-[#DC143C]' : 'bg-[#C5A945]'}`}
                                  style={{ width: `${widthPct}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Right: Feature Detail Deep Dive & Engineering Notes */}
                      <div className="lg:col-span-5 flex flex-col gap-3">
                        <AnimatePresence mode="wait">
                          {selectedFeature ? (
                            <motion.div 
                              key={selectedFeature}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              className="p-4 bg-[#F0EAD6] text-[#1A1A1A] border-2 border-[#1A1A1A] shadow-xs flex flex-col justify-between h-full min-h-[200px]"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 border-b border-[#1A1A1A]/20 pb-1.5 mb-2.5">
                                  <span className="text-[9px] font-mono-tech text-[#C5A945] font-bold uppercase tracking-wider">
                                    FORMULA & METRIC DEEP DIVE
                                  </span>
                                  <span className="text-[9px] font-mono-tech bg-[#DC143C] text-[#FAF6EE] px-1 py-0.2 font-bold">
                                    INSPECTED
                                  </span>
                                </div>

                                <h4 className="font-headline font-black text-base text-[#1A1A1A] tracking-tight mb-1.5">
                                  {FEATURE_NAMES[selectedFeature]}
                                </h4>

                                <p className="font-mono-tech text-xs text-[#1A1A1A]/80 leading-relaxed mb-3">
                                  {FEATURE_DESCRIPTIONS[selectedFeature]}
                                </p>
                              </div>

                              <div className="pt-2 border-t border-[#1A1A1A]/20 flex justify-between items-center text-xs font-mono-tech">
                                <span className="text-[#625A50]">LOCAL NET WEIGHT:</span>
                                <span className={`font-bold ${displayedAiEvent.feature_vector[selectedFeature] >= 0 ? 'text-[#DC143C]' : 'text-[#C5A945]'}`}>
                                  {displayedAiEvent.feature_vector[selectedFeature] >= 0 ? '+' : ''}{displayedAiEvent.feature_vector[selectedFeature].toFixed(3)}
                                </span>
                              </div>
                            </motion.div>
                          ) : (
                            <div className="p-4 bg-[#F0EAD6] border-2 border-[#1A1A1A]/20 text-xs font-mono-tech flex flex-col justify-between h-full min-h-[200px] text-[#1A1A1A]/90 leading-relaxed">
                              <div>
                                <div className="flex items-center gap-2 mb-2 font-mono-tech text-xs font-bold text-[#DC143C]">
                                  <Info className="w-3.5 h-3.5" />
                                  <span>XAI EXPLANATION SUMMARY</span>
                                </div>
                                <p className="mb-3 text-xs font-typewriter">
                                  {displayedAiEvent.is_anomaly 
                                    ? `For recording [${currentRecord.time}] on ${currentRecord.component}, the statistical profile is heavily dominated by rate-of-change and mean shift, corroborating an unexpected jump in raw sensor telemetry.`
                                    : `For recording [${currentRecord.time}], mathematical parameters remain within the normal 3-sigma corridor. Anomaly probability is low.`}
                                </p>
                              </div>

                              <div className="pt-2 border-t border-[#1A1A1A]/20 flex justify-between items-center text-[10px] font-mono-tech text-[#625A50]">
                                <span>STATUS:</span>
                                <span className="font-bold text-[#1A1A1A]">
                                  {displayedAiEvent.is_anomaly ? 'ANOMALOUS APERTURE' : 'NOMINAL TELEMETRY'}
                                </span>
                              </div>
                            </div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                )}

              </div>

              {/* Fixed Bottom Footer Action Bar (flex-shrink-0) */}
              <div className="flex-shrink-0 px-4 sm:px-6 py-3 bg-[#F0EAD6] border-t-2 border-[#1A1A1A] flex flex-wrap items-center justify-between gap-3">
                {activeStep === 'select_record' ? (
                  <>
                    <span className="text-[10px] font-mono-tech text-[#625A50]">
                      CLICK ANY PACKET ABOVE TO DECOMPOSE SHAP WEIGHTS
                    </span>
                    
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => setIsOpen(false)}
                        className="px-3.5 py-1.5 bg-[#FAF6EE] hover:bg-[#EAE2CE] text-[#1A1A1A] border-2 border-[#1A1A1A] font-mono-tech text-xs font-bold cursor-pointer"
                      >
                        CLOSE
                      </button>

                      <button
                        onClick={() => setActiveStep('view_shap')}
                        className="px-4 py-1.5 bg-[#DC143C] hover:bg-[#B01030] text-[#FAF6EE] font-mono-tech font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer border border-[#1A1A1A]"
                      >
                        <span>PROCEED TO SHAP MATRIX</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setActiveStep('select_record')}
                      className="px-3.5 py-1.5 bg-[#FAF6EE] hover:bg-[#EAE2CE] text-[#1A1A1A] border-2 border-[#1A1A1A] font-mono-tech text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>BACK TO FLIGHT RECORDS</span>
                    </button>

                    <button
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-1.5 bg-[#1A1A1A] hover:bg-[#333] text-[#FAF6EE] font-mono-tech text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                      CLOSE INSPECTOR
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
