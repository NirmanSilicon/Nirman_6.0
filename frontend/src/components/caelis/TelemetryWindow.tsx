import React, { useState, useMemo, memo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import { AiEvent, SyntheticMissionData, SyntheticTelemetryPacket } from '../../types/caelis';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Terminal, 
  Cpu, 
  Sliders, 
  Sparkles, 
  RotateCw, 
  Beaker, 
  ShieldCheck, 
  Filter, 
  ArrowRight,
  Info,
  ChevronRight,
  Database,
  Radio
} from 'lucide-react';
import { generateSyntheticTelemetryDataset } from '../../data/syntheticTelemetry';
import { useAnalysis } from '../../context/AnalysisContext';

// Generates high-fidelity deterministic telemetry points for fluid oscillograph rendering
const generateTelemetry = (scenario: string, aiEvent: AiEvent | null) => {
  const data = [];
  const baseValue = aiEvent?.feature_vector.feat_mean || 21.4;
  const variance = (aiEvent?.feature_vector.feat_std || 1.8) * 0.45;
  const isAnomaly = aiEvent?.is_anomaly || false;
  
  // 64 high-fidelity sliding points to keep the curve organic, readable, and buttery-smooth
  const sampleCount = 64;
  for (let i = 0; i < sampleCount; i++) {
    // Deterministic harmonic formula (no Math.random to prevent jitter on re-renders)
    const harmonicA = Math.sin(i * 0.28) * 1.6;
    const harmonicB = Math.cos(i * 0.14) * 0.9;
    const harmonicC = Math.sin(i * 0.72) * 0.35;
    const deterministicMicro = Math.sin(i * 1.85 + 0.4) * (variance * 0.35);
    
    let val = baseValue + harmonicA + harmonicB + harmonicC + deterministicMicro;
    let state = "NOMINAL";
    
    // Smooth sigmoid drift on anomaly
    if (isAnomaly && i >= 36) {
      const progress = (i - 36) / (sampleCount - 36);
      const steepness = aiEvent?.feature_vector.feat_rate_of_change || 1.8;
      val += Math.pow(progress, 1.4) * (14.5 * (steepness / 1.5));
      state = "ANOMALOUS";
    }

    const totalSec = 285 + Math.floor(i * 0.3125);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const timeStr = `T+${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const subSec = ((i * 12) % 100).toString().padStart(2, '0');

    data.push({
      time: timeStr,
      subSec,
      fullTime: `${timeStr}.${subSec}s`,
      value: Number(val.toFixed(2)),
      state,
      index: i + 1,
      isDriftPoint: isAnomaly && i === 36,
    });
  }
  return data;
};

interface TelemetryWindowProps {
  scenarioId: string;
  aiEvent: AiEvent | null;
  syntheticData?: SyntheticMissionData | null;
  onOpenMissionLab?: () => void;
}

// Memoized high-performance tooltip
const CustomTooltip = memo(({ active, payload, componentName }: any) => {
  if (active && payload && payload.length) {
    const point = payload[0].payload;
    const isAnom = point.state === 'ANOMALOUS';

    return (
      <div className="bg-[#FAF6EE] border-2 border-[#1A1A1A] p-3 text-[#1A1A1A] text-xs font-mono-tech shadow-2xl min-w-[200px] pointer-events-none">
        <div className="flex items-center justify-between gap-3 mb-2 border-b border-[#1A1A1A]/20 pb-1.5">
          <span className="text-[#C5A945] font-bold text-xs">{point.fullTime}</span>
          <span className={`text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider ${
            isAnom ? 'bg-[#DC143C] text-[#FAF6EE]' : 'bg-emerald-800 text-white'
          }`}>
            {point.state}
          </span>
        </div>

        <div className="space-y-1 text-[11px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[#625A50]">
              <div className={`w-2 h-2 rounded-xs ${isAnom ? 'bg-[#DC143C]' : 'bg-[#C5A945]'}`} />
              <span>TELEMETRY:</span>
            </div>
            <span className="font-bold text-[#1A1A1A] tabular-nums">{point.value} V/K</span>
          </div>

          <div className="flex items-center justify-between text-[#625A50]">
            <span>SAMPLE APERTURE:</span>
            <span className="text-[#1A1A1A] font-semibold">#{point.index} of 64</span>
          </div>

          <div className="flex items-center justify-between text-[#625A50]">
            <span>BUS IDENT:</span>
            <span className="text-[#1A1A1A] font-semibold">{componentName || 'THERM_01'}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
});
CustomTooltip.displayName = 'CustomTooltip';

export const TelemetryWindow: React.FC<TelemetryWindowProps> = memo(({ 
  scenarioId, 
  aiEvent, 
  syntheticData: externalSyntheticData,
  onOpenMissionLab 
}) => {
  const { activeSimulation, activeTelemetry, analysis } = useAnalysis();

  const [activeConsoleTab, setActiveConsoleTab] = useState<'packets' | 'diff' | 'params'>('packets');
  const [filterSubsystem, setFilterSubsystem] = useState<string>('ALL');
  const [noisePerturbation, setNoisePerturbation] = useState<number>(0);
  const [selectedPacket, setSelectedPacket] = useState<any | null>(null);

  // Derive or generate the synthetic mission dataset
  const effectiveSyntheticData = useMemo(() => {
    if (externalSyntheticData && externalSyntheticData.scenarioId === scenarioId) {
      return externalSyntheticData;
    }
    return generateSyntheticTelemetryDataset(scenarioId);
  }, [externalSyntheticData, scenarioId]);

  // Derive available filter subsystems from backend telemetry
  const channelFilters = useMemo(() => {
    if (activeSimulation?.subsystems && activeSimulation.subsystems.length > 0) {
      return ['ALL', ...activeSimulation.subsystems];
    }
    if (activeTelemetry && activeTelemetry.length > 0) {
      const subs = Array.from(new Set(activeTelemetry.map(r => r.subsystem)));
      return ['ALL', ...subs];
    }
    return ['ALL', 'THERM', 'HTR', 'BATT', 'EPS'];
  }, [activeSimulation, activeTelemetry]);

  // Memoize data to prevent re-calculations during scroll or parent re-renders
  const data = useMemo(() => {
    if (activeTelemetry && activeTelemetry.length > 0) {
      let targetChannel = 'THM_TEMP_RAW';
      const availableChannels = Array.from(new Set(activeTelemetry.map(r => r.channel_id)));
      if (filterSubsystem !== 'ALL') {
        const subRec = activeTelemetry.find(r => r.subsystem.toUpperCase().includes(filterSubsystem.toUpperCase()) || r.channel_id.toUpperCase().includes(filterSubsystem.toUpperCase()));
        if (subRec) targetChannel = subRec.channel_id;
      } else if (aiEvent?.component) {
        const matching = availableChannels.find(ch => ch.toLowerCase().includes(aiEvent.component.toLowerCase()));
        if (matching) targetChannel = matching;
        else if (availableChannels.includes('THM_TEMP_RAW')) targetChannel = 'THM_TEMP_RAW';
        else if (availableChannels.includes('EPS_BUS_V')) targetChannel = 'EPS_BUS_V';
        else targetChannel = availableChannels[0];
      } else if (!availableChannels.includes(targetChannel) && availableChannels.length > 0) {
        targetChannel = availableChannels[0];
      }

      const channelRecords = activeTelemetry.filter(r => r.channel_id === targetChannel);
      const stride = Math.max(1, Math.floor(channelRecords.length / 64));
      const sampled = channelRecords.filter((_, idx) => idx % stride === 0).slice(0, 64);

      if (sampled.length > 0) {
        return sampled.map((r, i) => {
          const totalSec = Math.floor(r.mission_elapsed_time);
          const mins = Math.floor(totalSec / 60);
          const secs = totalSec % 60;
          const subSec = Math.floor((r.mission_elapsed_time % 1) * 100).toString().padStart(2, '0');
          const timeStr = `T+${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
          const isAnom = r.quality === 'CORRUPT' || r.quality === 'OUT_OF_BOUNDS';
          const isDrift = r.quality === 'DEGRADED';

          return {
            time: timeStr,
            subSec,
            fullTime: `${timeStr}.${subSec}s`,
            value: Number(r.value.toFixed(2)),
            expectedValue: r.expected_value !== undefined ? Number(r.expected_value.toFixed(2)) : undefined,
            state: isAnom ? 'ANOMALOUS' : isDrift ? 'DRIFT' : 'NOMINAL',
            index: i + 1,
            isDriftPoint: isAnom || isDrift,
            channel_id: r.channel_id,
            subsystem: r.subsystem,
          };
        });
      }
    }

    return generateTelemetry(scenarioId, aiEvent);
  }, [activeTelemetry, filterSubsystem, scenarioId, aiEvent]);

  const isAnomaly = aiEvent?.is_anomaly || data.some(d => d.state === 'ANOMALOUS');
  const driftPoint = useMemo(() => data.find(d => d.isDriftPoint), [data]);
  
  const { minVal, maxVal, deltaPct } = useMemo(() => {
    if (data.length === 0) return { minVal: 0, maxVal: 0, deltaPct: '0.0' };
    const min = Math.min(...data.map(d => d.value));
    const max = Math.max(...data.map(d => d.value));
    const first = data[0].value || 1.0;
    const delta = (((data[data.length - 1].value - first) / first) * 100).toFixed(1);
    return { minVal: min, maxVal: max, deltaPct: delta };
  }, [data]);

  const strokeColor = isAnomaly ? '#DC143C' : '#C5A945';
  const fillColor = isAnomaly ? '#DC143C' : '#C5A945';

  // Filtered synthetic packets
  const filteredPackets = useMemo(() => {
    if (activeTelemetry && activeTelemetry.length > 0) {
      let recs = activeTelemetry;
      if (filterSubsystem !== 'ALL') {
        recs = recs.filter(r => r.subsystem.toUpperCase().includes(filterSubsystem.toUpperCase()) || r.channel_id.toUpperCase().includes(filterSubsystem.toUpperCase()));
      }
      return recs.slice(0, 100).map((r) => {
        const isCrit = r.quality === 'CORRUPT' || r.quality === 'OUT_OF_BOUNDS';
        const isDrift = r.quality === 'DEGRADED';
        const mins = Math.floor(r.mission_elapsed_time / 60);
        const secs = Math.floor(r.mission_elapsed_time % 60);
        const timeStr = `T+${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        let aiClass = 'NOMINAL OPERATING BAND';
        if (isCrit) aiClass = 'ANOMALOUS (Confidence 95.4%)';
        else if (isDrift) aiClass = 'CASCADED DEVIATION';

        return {
          packetId: r.packet_id,
          timestamp: timeStr,
          fullTime: `${timeStr}.${Math.floor((r.mission_elapsed_time % 1) * 100).toString().padStart(2, '0')}s`,
          subsystem: r.subsystem,
          channel: r.channel_id,
          rawValue: r.value,
          rawUnit: r.unit,
          syntheticNoise: `±${((r.metadata?.noise_ratio || 1.0) * 1.0).toFixed(1)}%`,
          status: isCrit ? ('CRITICAL' as const) : isDrift ? ('DRIFT' as const) : ('NOMINAL' as const),
          aiClassification: aiClass,
          injectionNote: r.metadata?.step !== undefined ? `MET: ${r.mission_elapsed_time.toFixed(1)}s` : undefined
        };
      });
    }

    const packets = effectiveSyntheticData.packets;
    if (filterSubsystem === 'ALL') return packets;
    return packets.filter(p => p.subsystem.toUpperCase().includes(filterSubsystem.toUpperCase()));
  }, [activeTelemetry, effectiveSyntheticData, filterSubsystem]);

  const isCustomRun = Boolean(activeSimulation) || effectiveSyntheticData.source !== 'scenario_preset';

  return (
    <div 
      className="flex flex-col bg-[#FAF6EE] border-2 border-[#1A1A1A] shadow-xl overflow-hidden rounded-xs relative z-20"
      style={{ transform: 'translateZ(0)' }}
    >
      {/* ------------------------------------------------------------- */}
      {/* 1. Upper Light Flight Strip Header                           */}
      {/* ------------------------------------------------------------- */}
      <div className="p-4 sm:p-5 border-b-2 border-[#1A1A1A]/20 bg-[#F0EAD6] flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#DC143C]" />
            <h3 className="font-headline font-black text-xl sm:text-2xl text-[#1A1A1A] tracking-tight">
              RAW SENSOR TELEMETRY OSCILLOGRAPH
            </h3>
            
            {/* Dynamic Trend / Anomaly Badge */}
            {isAnomaly ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono-tech font-bold uppercase bg-[#DC143C] text-[#FAF6EE] px-2.5 py-0.5 shadow-xs ml-2">
                <AlertTriangle className="w-3 h-3" />
                <span>+{deltaPct}% DRIFT</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono-tech font-bold uppercase bg-emerald-800 text-white px-2.5 py-0.5 shadow-xs ml-2">
                <CheckCircle2 className="w-3 h-3" />
                <span>NOMINAL 0.0%</span>
              </span>
            )}
          </div>
          <div className="text-[11px] font-mono-tech text-[#625A50] flex items-center gap-2 mt-1">
            <span>FLIGHT RECORDER BUS TRACE</span>
            <span>·</span>
            <span className="text-[#C5A945] font-bold">SLIDING NATURAL APERTURE</span>
            <span>·</span>
            <span>SAMPLE RATE: 3.2 Hz</span>
          </div>
        </div>

        {/* Telemetry Header Specs Grid */}
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono-tech">
          <div className="px-2.5 py-1 bg-[#FAF6EE] border border-[#1A1A1A]/30 flex flex-col">
            <span className="text-[#625A50]">SUBSYSTEM</span>
            <span className="font-bold text-[#1A1A1A] uppercase">{aiEvent?.component || 'THERMAL'}</span>
          </div>
          <div className="px-2.5 py-1 bg-[#FAF6EE] border border-[#1A1A1A]/30 flex flex-col">
            <span className="text-[#625A50]">TIME WINDOW</span>
            <span className="font-bold text-[#1A1A1A]">T+04:45 → T+05:05</span>
          </div>
          <div className="px-2.5 py-1 bg-[#FAF6EE] border border-[#1A1A1A]/30 flex flex-col">
            <span className="text-[#625A50]">PEAK / VALLEY</span>
            <span className="font-bold text-[#C5A945]">{maxVal.toFixed(1)} / {minVal.toFixed(1)}</span>
          </div>
        </div>
      </div>
      
      {/* ------------------------------------------------------------- */}
      {/* 2. Oscillograph Recharts Canvas Area                          */}
      {/* ------------------------------------------------------------- */}
      <div className="p-3 sm:p-5 relative bg-[#FAF6EE]">
        
        {/* Anomaly Flag Watermark */}
        {isAnomaly && (
          <div className="absolute top-5 right-5 z-10 flex items-center gap-2 bg-[#DC143C] text-[#FAF6EE] px-3 py-1 text-xs font-mono-tech font-bold uppercase tracking-wider shadow-md border border-[#1A1A1A]">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>AI PATTERN FLAGGED [T+04:56]</span>
          </div>
        )}

        <div className="w-full h-[280px] sm:h-[300px]" style={{ contain: 'layout paint size' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={data} 
              margin={{ top: 22, right: 28, left: -4, bottom: 8 }}
            >
              <defs>
                {/* Optimized gradient fill */}
                <linearGradient id="telemetry-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={fillColor} stopOpacity={0.38} />
                  <stop offset="70%" stopColor={fillColor} stopOpacity={0.08} />
                  <stop offset="95%" stopColor={fillColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid 
                vertical={false} 
                strokeDasharray="3 3" 
                stroke="#1A1A1A" 
                opacity={0.15} 
              />

              <XAxis 
                dataKey="time" 
                stroke="#1A1A1A" 
                opacity={0.75} 
                fontSize={10} 
                tick={{ fontFamily: 'Roboto Mono', fill: '#1A1A1A' }} 
                tickLine={false}
                axisLine={{ stroke: '#1A1A1A', opacity: 0.3 }}
                tickMargin={10}
                interval={7}
              />

              <YAxis 
                stroke="#1A1A1A" 
                opacity={0.75} 
                fontSize={10} 
                tick={{ fontFamily: 'Roboto Mono', fill: '#1A1A1A' }} 
                tickLine={false}
                axisLine={false}
                domain={[(dataMin: number) => Math.floor(dataMin - 1.5), (dataMax: number) => Math.ceil(dataMax + 2)]}
                tickFormatter={(v) => `${v}`}
              />

              <Tooltip 
                content={<CustomTooltip componentName={aiEvent?.component} />} 
                cursor={{ 
                  stroke: isAnomaly ? '#DC143C' : '#C5A945', 
                  strokeWidth: 1.5, 
                  strokeDasharray: '4 4' 
                }} 
                isAnimationActive={false}
              />
              
              {driftPoint && (
                <ReferenceLine 
                  x={driftPoint.time} 
                  stroke="#DC143C" 
                  strokeWidth={2}
                  strokeDasharray="4 4" 
                  label={{ 
                    value: 'SIGMOID DRIFT EXCURSION', 
                    position: 'insideTopLeft', 
                    fill: '#DC143C', 
                    fontSize: 9.5, 
                    fontFamily: 'Roboto Mono', 
                    fontWeight: 'bold',
                    offset: 12
                  }} 
                />
              )}
              
              <Area 
                type="natural" 
                dataKey="value" 
                stroke={strokeColor} 
                strokeWidth={2.8} 
                fill="url(#telemetry-fill)"
                isAnimationActive={false}
                dot={false}
                activeDot={{ 
                  r: 6, 
                  fill: strokeColor, 
                  stroke: '#FAF6EE', 
                  strokeWidth: 2.5
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Oscillograph Footnote Bar */}
        <div className="mt-2 pt-2 border-t border-[#1A1A1A]/10 flex flex-wrap justify-between items-center text-[10px] font-mono-tech text-[#625A50]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-bold text-[#1A1A1A]">
              <span className={`w-3 h-1 ${isAnomaly ? 'bg-[#DC143C]' : 'bg-[#C5A945]'}`}></span> SENSOR WAVEFORM APERTURE
            </span>
            {isAnomaly && (
              <span className="flex items-center gap-1.5 text-[#DC143C] font-bold">
                <span className="w-2.5 h-0.5 bg-[#DC143C]"></span> ANOMALY REGION [CONFIDENCE 96.4%]
              </span>
            )}
          </div>
          <div className="text-[10px] text-[#625A50]">
            SIGNAL INTEGRITY: 99.8% · FLUID NATURAL SPLINE · ZERO FRAME LOSS
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. BLACK SPACE // SYNTHETIC DATA VS REAL AI DIFFERENTIATION   */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-[#121110] border-t-4 border-[#1A1A1A] text-[#FAF6EE] font-mono-tech p-4 sm:p-5 shadow-2xl">
        
        {/* Terminal Header & Differentiation Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-[#FAF6EE]/15">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C5A945] animate-ping absolute opacity-75"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#C5A945] relative"></span>
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#C5A945]" />
                <span className="font-bold text-xs sm:text-sm tracking-wide text-[#FAF6EE]">
                  SYNTHETIC TELEMETRY BUFFER // INGESTION DATASET
                </span>
                
                {isCustomRun ? (
                  <span className="text-[9.5px] px-2 py-0.5 bg-[#DC143C] text-[#FAF6EE] font-bold uppercase rounded-xs">
                    MISSION LAB RUN
                  </span>
                ) : (
                  <span className="text-[9.5px] px-2 py-0.5 bg-[#C5A945]/30 text-[#FAF6EE] border border-[#C5A945]/60 font-bold uppercase rounded-xs">
                    SYNTHETIC PRESET
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[#FAF6EE]/60 mt-0.5">
                Multi-channel simulated CubeSat sensor frames fed directly into Caelis AI inference pipeline
              </p>
            </div>
          </div>

          {/* Differentiator Visual Badges (Synthetic Input vs Real AI) */}
          <div className="flex items-center gap-2 text-[10px]">
            <div className="px-2.5 py-1 bg-[#1E1C1A] border border-[#C5A945]/40 text-[#C5A945] flex items-center gap-1.5 font-bold">
              <Database className="w-3 h-3" />
              <span>SYNTHETIC INPUT: {effectiveSyntheticData.totalPackets} FRAMES</span>
            </div>
            <div className="px-2.5 py-1 bg-[#1E1C1A] border border-[#DC143C]/40 text-[#DC143C] flex items-center gap-1.5 font-bold">
              <Cpu className="w-3 h-3" />
              <span>AI INFERENCE: ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher & Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-xs">
          <div className="flex items-center gap-1 bg-[#1E1C1A] p-1 border border-[#FAF6EE]/20">
            <button
              onClick={() => setActiveConsoleTab('packets')}
              className={`px-3 py-1 text-[11px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                activeConsoleTab === 'packets'
                  ? 'bg-[#C5A945] text-[#121110]'
                  : 'text-[#FAF6EE]/80 hover:text-[#FAF6EE] hover:bg-[#FAF6EE]/10'
              }`}
            >
              <Terminal className="w-3 h-3" />
              <span>1. RAW PACKET STREAM ({filteredPackets.length})</span>
            </button>
            
            <button
              onClick={() => setActiveConsoleTab('diff')}
              className={`px-3 py-1 text-[11px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                activeConsoleTab === 'diff'
                  ? 'bg-[#DC143C] text-[#FAF6EE]'
                  : 'text-[#FAF6EE]/80 hover:text-[#FAF6EE] hover:bg-[#FAF6EE]/10'
              }`}
            >
              <Cpu className="w-3 h-3" />
              <span>2. SYNTHETIC vs AI DIFF</span>
            </button>

            <button
              onClick={() => setActiveConsoleTab('params')}
              className={`px-3 py-1 text-[11px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                activeConsoleTab === 'params'
                  ? 'bg-[#FAF6EE] text-[#121110]'
                  : 'text-[#FAF6EE]/80 hover:text-[#FAF6EE] hover:bg-[#FAF6EE]/10'
              }`}
            >
              <Sliders className="w-3 h-3" />
              <span>3. SIMULATION PARAMS</span>
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {activeConsoleTab === 'packets' && (
              <div className="flex items-center gap-1 text-[10px] bg-[#1E1C1A] px-2 py-1 border border-[#FAF6EE]/20">
                <Filter className="w-3 h-3 text-[#C5A945]" />
                <span className="text-[#FAF6EE]/60">SUBSYSTEM:</span>
                {channelFilters.map(chn => (
                  <button
                    key={chn}
                    onClick={() => setFilterSubsystem(chn)}
                    className={`px-1.5 py-0.5 font-bold cursor-pointer uppercase ${
                      filterSubsystem === chn 
                        ? 'bg-[#C5A945] text-[#121110]' 
                        : 'text-[#FAF6EE]/70 hover:text-[#FAF6EE]'
                    }`}
                  >
                    {chn}
                  </button>
                ))}
              </div>
            )}

            {onOpenMissionLab && (
              <button
                onClick={onOpenMissionLab}
                className="px-2.5 py-1 bg-[#1E1C1A] hover:bg-[#FAF6EE] hover:text-[#121110] text-[#C5A945] text-[10px] font-bold uppercase border border-[#C5A945]/40 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Beaker className="w-3 h-3" />
                <span>MISSION LAB →</span>
              </button>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: RAW SYNTHETIC PACKET STREAM                            */}
        {/* ------------------------------------------------------------- */}
        {activeConsoleTab === 'packets' && (
          <div>
            {/* Explanatory Callout Banner */}
            <div className="p-2.5 bg-[#1A1A1A] border-l-3 border-[#C5A945] text-[10.5px] text-[#FAF6EE]/90 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-[#C5A945] shrink-0" />
                <span>
                  <strong className="text-[#C5A945]">SYNTHETIC DATA INGESTION:</strong> Below are the simulated raw flight recorder packets emitted for this scenario. Observe how Caelis AI autonomously classifies each unlabelled packet in real-time.
                </span>
              </div>
              <span className="text-[10px] text-[#FAF6EE]/50 font-bold shrink-0">
                RATE: 3.2 Hz · CHECKSUM OK
              </span>
            </div>

            {/* Terminal Table Container with Horizontal Scroll Protection */}
            <div className="overflow-x-auto border border-[#FAF6EE]/15 bg-[#171514]">
              {/* Terminal Table Header */}
              <div className="min-w-[720px] grid grid-cols-12 gap-3 text-[10px] font-bold text-[#FAF6EE]/60 px-3 py-2 bg-[#1E1C1A] border-b border-[#FAF6EE]/20 select-none">
                <div className="col-span-2">PKT ID / TIME</div>
                <div className="col-span-2">CHANNEL IDENT</div>
                <div className="col-span-2 text-left">SYNTHETIC VALUE</div>
                <div className="col-span-2 text-left">NOISE RATIO</div>
                <div className="col-span-1">STATUS</div>
                <div className="col-span-3 text-left">AI DEDUCTION & CLASSIFICATION</div>
              </div>

              {/* Scrollable Packet Log Terminal */}
              <div className="max-h-[290px] overflow-y-auto space-y-0.5 pr-1 font-mono-tech text-[11px] divide-y divide-[#FAF6EE]/5 min-w-[720px]">
                {filteredPackets.map((pkt) => {
                  const isSelected = selectedPacket?.packetId === pkt.packetId;
                  const isCrit = pkt.status === 'CRITICAL' || pkt.status === 'FAULT_INJECTED';
                  const isDrift = pkt.status === 'DRIFT';

                  return (
                    <div
                      key={pkt.packetId}
                      onClick={() => setSelectedPacket(isSelected ? null : pkt)}
                      className={`grid grid-cols-12 gap-3 items-center px-3 py-2 transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-[#C5A945]/25 text-[#FAF6EE] border-l-3 border-[#C5A945]' 
                          : isCrit
                            ? 'bg-[#DC143C]/15 hover:bg-[#DC143C]/25 text-[#FAF6EE]'
                            : isDrift
                              ? 'bg-[#C5A945]/10 hover:bg-[#C5A945]/20 text-[#FAF6EE]'
                              : 'hover:bg-[#FAF6EE]/5 text-[#FAF6EE]/85'
                      }`}
                    >
                      <div className="col-span-2 flex items-center gap-1.5 font-mono-tech">
                        <span className="text-[#C5A945] font-bold text-xs">{pkt.packetId}</span>
                        <span className="text-[10px] text-[#FAF6EE]/60">{pkt.timestamp}</span>
                      </div>

                      <div className="col-span-2 font-semibold text-[#FAF6EE] text-xs">
                        {pkt.channel}
                      </div>

                      <div className="col-span-2 text-left font-bold text-[#FAF6EE] tabular-nums text-xs">
                        {pkt.rawValue} <span className="text-[10px] text-[#FAF6EE]/70 font-normal">{pkt.rawUnit}</span>
                      </div>

                      <div className="col-span-2 text-[10.5px] text-[#FAF6EE]/70">
                        {pkt.syntheticNoise}
                      </div>

                      <div className="col-span-1">
                        <span className={`px-1.5 py-0.5 text-[9.5px] font-bold uppercase rounded-xs tracking-wider inline-block ${
                          isCrit 
                            ? 'bg-[#DC143C] text-[#FAF6EE]' 
                            : isDrift 
                              ? 'bg-[#C5A945] text-[#121110]' 
                              : 'bg-emerald-900/90 text-emerald-300'
                        }`}>
                          {pkt.status}
                        </span>
                      </div>

                      <div className="col-span-3 text-[10.5px] text-[#FAF6EE]/95">
                        {pkt.aiClassification.includes('Confidence') ? (
                          <span className="text-[#DC143C] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#DC143C] shrink-0 animate-pulse"></span>
                            <span>{pkt.aiClassification}</span>
                          </span>
                        ) : pkt.aiClassification.includes('CASCADED') ? (
                          <span className="text-[#E5C76B] font-semibold flex items-center gap-1">
                            <span className="text-xs">▲</span>
                            <span>{pkt.aiClassification}</span>
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-medium flex items-center gap-1">
                            <span className="text-xs">✔</span>
                            <span>{pkt.aiClassification}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Packet Inspection Tray */}
            {selectedPacket && (
              <div className="mt-3 p-3 bg-[#1E1C1A] border border-[#C5A945] text-xs flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#C5A945]">{selectedPacket.packetId} DETAIL</span>
                    <span className="text-[10px] text-[#FAF6EE]/70">Exact Ingestion Time: {selectedPacket.fullTime}</span>
                  </div>
                  <div className="text-[11px] text-[#FAF6EE]/90 mt-1">
                    Channel: <strong>{selectedPacket.channel}</strong> ({selectedPacket.subsystem}) · Raw Synthetic Reading: <strong>{selectedPacket.rawValue} {selectedPacket.rawUnit}</strong>
                    {selectedPacket.injectionNote && (
                      <span className="text-[#DC143C] ml-2 font-bold">[{selectedPacket.injectionNote}]</span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-[#FAF6EE]/60 block">AI INFERRED CLASSIFICATION:</span>
                  <span className="font-bold text-[#FAF6EE] text-xs">{selectedPacket.aiClassification}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: SYNTHETIC vs AI DIFFERENTIATION MATRIX                */}
        {/* ------------------------------------------------------------- */}
        {activeConsoleTab === 'diff' && (
          <div className="space-y-4">
            
            {/* High-level Differentiator Summary Banner */}
            <div className="p-3 bg-[#1A1A1A] border-l-4 border-[#DC143C] text-xs text-[#FAF6EE]/90">
              <div className="font-bold text-[#FAF6EE] flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-[#DC143C]" />
                <span>SYNTHETIC INPUT STREAM vs AUTONOMOUS CEALIS AI DISCOVERY</span>
              </div>
              <p className="text-[11px] text-[#FAF6EE]/70 leading-relaxed">
                The synthetic data (left column) was programmatically generated and fed into the AI as unlabelled telemetry. The Caelis AI engine (right column) received zero ground-truth hints, successfully inferring the root causal mechanism strictly from noisy cross-channel dependencies.
              </p>
            </div>

            {/* Side-by-Side Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Left Column: Synthetic Input Generation (Ground Truth) */}
              <div className="p-4 bg-[#1E1C1A] border-2 border-[#C5A945]/40 space-y-3">
                <div className="flex items-center justify-between border-b border-[#C5A945]/30 pb-2">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#C5A945]" />
                    <h4 className="font-bold text-xs text-[#C5A945] uppercase">
                      1. SYNTHETIC INPUT DATA (SIMULATION)
                    </h4>
                  </div>
                  <span className="text-[9.5px] px-1.5 py-0.5 bg-[#C5A945]/20 text-[#C5A945] font-bold">
                    INPUT PAYLOAD
                  </span>
                </div>

                <div className="space-y-2 text-[11px]">
                  <div>
                    <span className="text-[#FAF6EE]/60 block text-[10px]">SIMULATED GROUND TRUTH:</span>
                    <p className="text-[#FAF6EE] font-semibold">
                      {effectiveSyntheticData.aiDiffSummary.syntheticGenerationTruth}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#FAF6EE]/10 text-[10.5px]">
                    <div>
                      <span className="text-[#FAF6EE]/50 block">NOISE MODEL:</span>
                      <span className="font-bold text-[#FAF6EE]">{effectiveSyntheticData.noiseLevel}% Gaussian Jitter</span>
                    </div>
                    <div>
                      <span className="text-[#FAF6EE]/50 block">INJECTED FAULT:</span>
                      <span className="font-bold text-[#C5A945]">{effectiveSyntheticData.injectedFault || 'SIGMOID_RESISTIVE'}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#FAF6EE]/10 text-[10.5px]">
                    <span className="text-[#FAF6EE]/50 block">SIMULATION ENVIRONMENT:</span>
                    <span className="text-[#FAF6EE]">{effectiveSyntheticData.orbitAltitude} · 3U CubeSat</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Real Caelis AI Inference (Autonomous Analysis) */}
              <div className="p-4 bg-[#1E1C1A] border-2 border-[#DC143C]/40 space-y-3">
                <div className="flex items-center justify-between border-b border-[#DC143C]/30 pb-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[#DC143C]" />
                    <h4 className="font-bold text-xs text-[#DC143C] uppercase">
                      2. CEALIS AI ANALYSIS (INFERRED)
                    </h4>
                  </div>
                  <span className="text-[9.5px] px-1.5 py-0.5 bg-[#DC143C]/20 text-[#DC143C] font-bold">
                    AI COGNITION
                  </span>
                </div>

                <div className="space-y-2 text-[11px]">
                  <div>
                    <span className="text-[#FAF6EE]/60 block text-[10px]">AUTONOMOUS DIAGNOSIS:</span>
                    <p className="text-[#FAF6EE] font-semibold">
                      {effectiveSyntheticData.aiDiffSummary.aiInferredDiagnosis}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#FAF6EE]/10 text-[10.5px]">
                    <div>
                      <span className="text-[#FAF6EE]/50 block">CAUSAL ACCURACY:</span>
                      <span className="font-bold text-emerald-400">{effectiveSyntheticData.aiDiffSummary.causalDiscoveryAccuracy}</span>
                    </div>
                    <div>
                      <span className="text-[#FAF6EE]/50 block">NOISE DECOUPLING:</span>
                      <span className="font-bold text-[#FAF6EE]">{effectiveSyntheticData.aiDiffSummary.noiseFilteringRatio}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#FAF6EE]/10 text-[10.5px]">
                    <span className="text-[#FAF6EE]/50 block">COUNTERFACTUAL VERIFICATION:</span>
                    <span className="text-[#FAF6EE]">{effectiveSyntheticData.aiDiffSummary.counterfactualDeduction}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Proof Note */}
            <div className="p-2.5 bg-[#121110] border border-[#FAF6EE]/20 flex items-center justify-between text-[10.5px] text-[#FAF6EE]/80">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>
                  <strong>Independent Verification:</strong> Caelis validated that secondary alarms (Comms dropout, Battery depletion) were consequences, not causes.
                </span>
              </div>
              <span className="text-[#C5A945] font-bold">DAG EDGES: 5 CONFIRMED</span>
            </div>

          </div>
        )}

        {/* TAB 3: SIMULATION PARAMETERS & GENERATION METADATA            */}
        {/* ------------------------------------------------------------- */}
        {activeConsoleTab === 'params' && (
          <div className="p-4 bg-[#1E1C1A] border border-[#FAF6EE]/15 space-y-4">
            <div className="flex items-center justify-between border-b border-[#FAF6EE]/15 pb-2">
              <span className="font-bold text-xs text-[#FAF6EE]">SIMULATED MISSION FLIGHT PROFILE</span>
              <span className="text-[10px] text-[#C5A945]">
                INGESTION IDENT: {activeSimulation?.simulation_id || effectiveSyntheticData.id}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-[#121110] border border-[#FAF6EE]/10">
                <span className="text-[10px] text-[#FAF6EE]/50 block">ORBIT ALTITUDE:</span>
                <span className="font-bold text-[#FAF6EE]">
                  {activeSimulation?.parameters?.orbit_altitude_km ? `${activeSimulation.parameters.orbit_altitude_km} km LEO` : effectiveSyntheticData.orbitAltitude}
                </span>
              </div>
              <div className="p-2.5 bg-[#121110] border border-[#FAF6EE]/10">
                <span className="text-[10px] text-[#FAF6EE]/50 block">NOISE JITTER LEVEL:</span>
                <span className="font-bold text-[#C5A945]">
                  {activeSimulation?.parameters?.noise_level !== undefined ? `±${activeSimulation.parameters.noise_level}%` : `${effectiveSyntheticData.noiseLevel}% Standard Dev`}
                </span>
              </div>
              <div className="p-2.5 bg-[#121110] border border-[#FAF6EE]/10">
                <span className="text-[10px] text-[#FAF6EE]/50 block">SIMULATION SEED:</span>
                <span className="font-bold text-[#FAF6EE]">
                  {activeSimulation?.random_seed !== undefined ? `#${activeSimulation.random_seed}` : '3.2 Hz Natural Spline'}
                </span>
              </div>
              <div className="p-2.5 bg-[#121110] border border-[#FAF6EE]/10">
                <span className="text-[10px] text-[#FAF6EE]/50 block">TOTAL PACKETS:</span>
                <span className="font-bold text-[#DC143C]">
                  {activeSimulation?.total_packets ? `${activeSimulation.total_packets} Frames` : effectiveSyntheticData.propagationLatency}
                </span>
              </div>
            </div>

            {((activeSimulation?.logs && activeSimulation.logs.length > 0) || effectiveSyntheticData.rawLogs.length > 0) && (
              <div>
                <span className="text-[10px] text-[#FAF6EE]/60 block mb-1 font-bold">
                  SAMPLE RAW ASCII BUS PACKET EMISSIONS:
                </span>
                <div className="p-2.5 bg-[#121110] border border-[#FAF6EE]/10 space-y-1 text-[10.5px] text-[#C5A945]">
                  {((activeSimulation?.logs && activeSimulation.logs.length > 0) ? activeSimulation.logs : effectiveSyntheticData.rawLogs).slice(0, 6).map((log, i) => (
                    <div key={i} className="truncate">{log}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
});

TelemetryWindow.displayName = 'TelemetryWindow';
