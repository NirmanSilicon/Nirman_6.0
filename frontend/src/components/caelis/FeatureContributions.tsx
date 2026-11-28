import React, { useState } from 'react';
import { AiEvent, FeatureVector } from '../../types/caelis';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart3, HelpCircle, Check, Info } from 'lucide-react';

interface FeatureContributionsProps {
  aiEvent: AiEvent | null;
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

export const FeatureContributions: React.FC<FeatureContributionsProps> = ({ aiEvent }) => {
  const [selectedFeature, setSelectedFeature] = useState<keyof FeatureVector | null>(null);

  if (!aiEvent) return null;

  // Transform and sort features by absolute value for SHAP-like display
  const features = Object.entries(aiEvent.feature_vector).map(([key, value]) => ({
    key: key as keyof FeatureVector,
    name: FEATURE_NAMES[key as keyof FeatureVector],
    value: value as number,
    absVal: Math.abs(value as number)
  })).sort((a, b) => b.absVal - a.absVal);

  const maxAbs = Math.max(...features.map(f => f.absVal), 1);

  return (
    <div className="p-6 sm:p-8 bg-[#FAF6EE] border-2 border-[#1A1A1A] shadow-md torn-paper-card">
      
      {/* Feature Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b-2 border-[#1A1A1A]/20">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#DC143C]" />
            <h3 className="font-headline font-black text-2xl text-[#1A1A1A] tracking-tight">
              SHAP ATTRIBUTION MATRIX // FEATURE WEIGHTS
            </h3>
          </div>
          <div className="text-[11px] font-mono-tech text-[#625A50] mt-0.5">
            EXPLAINABLE AI DECOMPOSITION OF 128-SAMPLE SENSOR APERTURE
          </div>
        </div>

        <span className="text-[10px] font-mono-tech px-2.5 py-1 bg-[#F0EAD6] border border-[#1A1A1A]/30 text-[#1A1A1A] font-bold">
          CLICK ANY FEATURE TO INSPECT FORMULA
        </span>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Feature Bars List */}
        <div className="lg:col-span-7 space-y-3">
          {features.map((feat) => {
            const widthPct = Math.min((feat.absVal / maxAbs) * 100, 100);
            const isPositive = feat.value >= 0;
            const isSelected = selectedFeature === feat.key;
            
            return (
              <div 
                key={feat.key} 
                className={`cursor-pointer transition-all p-3 border-2 ${
                  isSelected 
                    ? 'bg-[#F0EAD6] border-[#DC143C] shadow-sm -translate-y-0.5' 
                    : 'bg-[#FAF6EE] border-[#1A1A1A]/20 hover:border-[#1A1A1A]'
                }`}
                onClick={() => setSelectedFeature(isSelected ? null : feat.key)}
              >
                <div className="flex justify-between items-center mb-1.5 font-mono-tech text-xs">
                  <div className="font-bold text-[#1A1A1A] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DC143C]"></span>
                    <span>{feat.name}</span>
                  </div>
                  <div className={`font-bold ${isPositive ? 'text-[#DC143C]' : 'text-[#625A50]'}`}>
                    {isPositive ? '+' : ''}{feat.value.toFixed(3)}
                  </div>
                </div>

                {/* Tactical Progress Meter */}
                <div className="w-full bg-[#1A1A1A]/10 h-2 overflow-hidden flex">
                  <div 
                    className={`h-full transition-all duration-300 ${isPositive ? 'bg-[#DC143C]' : 'bg-[#C5A945]'}`}
                    style={{ width: `${widthPct}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Right Column: Dynamic Deep Dive Card */}
        <div className="lg:col-span-5 flex flex-col">
          <AnimatePresence mode="wait">
            {selectedFeature ? (
              <motion.div 
                key={selectedFeature}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="p-5 bg-[#F0EAD6] text-[#1A1A1A] border-2 border-[#1A1A1A] shadow-md flex flex-col justify-between h-full"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-[#1A1A1A]/20 pb-2 mb-3">
                    <span className="text-[10px] font-mono-tech text-[#C5A945] font-bold uppercase tracking-wider">
                      FEATURE DETAIL ANALYSIS
                    </span>
                    <span className="text-[10px] font-mono-tech bg-[#DC143C] text-[#FAF6EE] px-1.5 py-0.5 font-bold">
                      SHAP WEIGHT
                    </span>
                  </div>

                  <h4 className="font-headline font-black text-xl text-[#1A1A1A] tracking-tight mb-2">
                    {FEATURE_NAMES[selectedFeature]}
                  </h4>

                  <p className="font-mono-tech text-xs text-[#1A1A1A]/80 leading-relaxed mb-4">
                    {FEATURE_DESCRIPTIONS[selectedFeature]}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#1A1A1A]/20 flex justify-between items-center text-xs font-mono-tech">
                  <span className="text-[#625A50]">NET CONTRIBUTION:</span>
                  <span className={`font-bold text-sm ${aiEvent.feature_vector[selectedFeature] >= 0 ? 'text-[#DC143C]' : 'text-[#C5A945]'}`}>
                    {aiEvent.feature_vector[selectedFeature] >= 0 ? '+' : ''}{aiEvent.feature_vector[selectedFeature].toFixed(3)}
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="insight"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-6 bg-[#F0EAD6] border-2 border-[#1A1A1A]/20 text-xs font-typewriter flex flex-col justify-between h-full text-[#1A1A1A]/90 leading-relaxed"
              >
                <div>
                  <div className="flex items-center gap-2 mb-3 font-mono-tech text-xs font-bold text-[#DC143C]">
                    <Info className="w-4 h-4" />
                    <span>ENGINEERING OBSERVATION</span>
                  </div>
                  <p className="mb-4">
                    {aiEvent.is_anomaly 
                      ? "The statistical footprint is dominated by extreme rate-of-change and mean divergence. This pattern is characteristic of sudden analog sensor bias rather than environmental thermal fluctuation."
                      : "All seven mathematical descriptors sit squarely inside the nominal envelope. No candidate anomaly will be dispatched to the causal reasoning graph."}
                  </p>
                </div>
                <div className="pt-3 border-t border-[#1A1A1A]/20 font-mono-tech text-[10px] text-[#625A50]">
                  SELECT A FEATURE AT LEFT FOR DETAILED DESCRIPTIONS
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
};

