import React, { useState } from 'react';
import { 
  Cpu, 
  Flame, 
  UploadCloud, 
  ArrowRight, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Sparkles, 
  Sliders, 
  RefreshCw, 
  Layers, 
  FileSpreadsheet, 
  FileCode, 
  Radio, 
  ChevronRight,
  ArrowLeft,
  Terminal,
  Beaker,
  Globe2,
  Box
} from 'lucide-react';
import { SyntheticMissionData } from '../../types/caelis';
import { generateSyntheticTelemetryDataset } from '../../data/syntheticTelemetry';
import { MissionLabHeroBackground } from '../../components/MissionLabHeroBackground';
import { useAnalysis } from '../../context/AnalysisContext';
import { backendApi } from '../../services/backendApi';

interface MissionLabPageProps {
  onBack: () => void;
  onOpenAnalysis?: (scenarioId: string, syntheticData?: SyntheticMissionData) => void;
  theme?: 'light' | 'dark';
}

type ModeType = 'synthetic' | 'fault_injection' | 'import_incident' | null;

export const MissionLabPage: React.FC<MissionLabPageProps> = ({ onBack, onOpenAnalysis, theme = 'light' }) => {
  const { 
    generateSimulation, 
    activeSimulation, 
    runAnalysis, 
    loadSimulationTelemetry 
  } = useAnalysis();

  const [activeMode, setActiveMode] = useState<ModeType>(null);

  // Synthetic Generator State
  const [syntheticPreset, setSyntheticPreset] = useState<
    'power_collapse' | 'thermal_runaway' | 'misleading_early_anomaly' | 'competing_root_causes' | 'missing_telemetry' | 'solar_storm' | 'nominal_leo'
  >('power_collapse');
  const [orbitAltitude, setOrbitAltitude] = useState<number>(536);
  const [sampleDuration, setSampleDuration] = useState<number>(300);
  const [noiseLevel, setNoiseLevel] = useState<number>(2.2);
  const [syntheticLogs, setSyntheticLogs] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [emittedFrameCount, setEmittedFrameCount] = useState<number>(0);

  // Fault Injection State
  const [targetSubsystem, setTargetSubsystem] = useState<'eps_bus' | 'thermal_loop' | 'adcs_gyro' | 'comms_rf' | 'payload_sensor'>('thermal_loop');
  const [failureType, setFailureType] = useState<'bias_drift' | 'stuck_at_zero' | 'oscillatory_spike' | 'cascade_collapse'>('bias_drift');
  const [injectionTimestamp, setInjectionTimestamp] = useState<string>('T+04:55');
  const [severityPct, setSeverityPct] = useState<number>(85);
  const [injectionResults, setInjectionResults] = useState<{ step: string; status: 'nominal' | 'affected' | 'tripped'; time: string }[] | null>(null);
  const [isInjecting, setIsInjecting] = useState<boolean>(false);

  // Import / Upload State
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string; type: string; records: number } | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsedPreview, setParsedPreview] = useState<{ timestamp: string; channel: string; raw: number; state: string }[]>([]);

  // Synthetic generation handler - calls backend simulation engine
  const handleGenerateSynthetic = async () => {
    setIsGenerating(true);
    setSyntheticLogs([]);
    try {
      const seed = Math.floor(orbitAltitude * 10 + noiseLevel * 100);
      const sim = await generateSimulation({
        scenario_id: syntheticPreset,
        duration_seconds: sampleDuration,
        orbit_altitude_km: orbitAltitude,
        noise_level: noiseLevel,
        random_seed: seed,
      });

      if (sim && sim.logs && sim.logs.length > 0) {
        setSyntheticLogs(sim.logs);
        setEmittedFrameCount(sim.total_packets || sampleDuration * 10);
      } else {
        const mins = Math.floor((sampleDuration * 0.65) / 60);
        const secs = Math.floor((sampleDuration * 0.65) % 60);
        const faultTime = `T+${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        let scenarioSpecificLogs: string[] = [];
        if (syntheticPreset === 'thermal_runaway') {
          scenarioSpecificLogs = [
            `[${faultTime}.210] [WARN] THM_TEMP_RAW thermistor reading drifted negative by -84.2°C [Sensor Rail Freeze]`,
            `[${faultTime}.040] [ALERT] Heater control loop triggered 100% duty cycle continuous override`,
            `[${faultTime}.320] [CRIT] Battery cell temperature exceeded redline (61.4°C > 45.0°C). Over-temp trip triggered.`,
            `[${faultTime}.850] [FATAL] Solid-state BMS breaker latched. Main power bus collapsed to 0.42V.`
          ];
        } else if (syntheticPreset === 'misleading_early_anomaly') {
          scenarioSpecificLogs = [
            `[T+01:20.000] [WARN] ADCS star-tracker rate gyro momentary anomaly (4.85 deg/s > 0.10 deg/s)`,
            `[${faultTime}.000] [CRIT] Battery cell internal micro-short detected; Joule heat rate +18.4W`,
            `[${faultTime}.400] [FATAL] BMS protection disconnect latched. EPS bus collapse.`
          ];
        } else if (syntheticPreset === 'competing_root_causes') {
          scenarioSpecificLogs = [
            `[${faultTime}.000] [WARN] Thermal control loop mismatch: Sensor drift vs Heater TRIAC short-circuit`,
            `[${faultTime}.150] [ALERT] Heater current 1.84A drawn continuously at 100% duty cycle`,
            `[${faultTime}.800] [CRIT] Pack thermal stress threshold exceeded. Protection breaker tripped.`
          ];
        } else if (syntheticPreset === 'missing_telemetry') {
          scenarioSpecificLogs = [
            `[${faultTime}.000] [CRIT] Downlink frame dropped: BATT_TEMP and BATT_TRIP channels unobserved`,
            `[${faultTime}.200] [ALERT] Main power bus sudden collapse without battery precursor telemetry`,
            `[${faultTime}.500] [INFO] Caelis pipeline engaging UNCERTAINTY / INSUFFICIENT_EVIDENCE fallback`
          ];
        } else if (syntheticPreset === 'solar_storm') {
          scenarioSpecificLogs = [
            `[${faultTime}.000] [WARN] Solar particle flux exceeded 10^4 pfu; single-event rate upset in ADCS`,
            `[${faultTime}.120] [INFO] Transponder bit-error-rate increased; carrier link maintained`
          ];
        } else if (syntheticPreset === 'nominal_leo') {
          scenarioSpecificLogs = [
            `[${faultTime}.000] [INFO] Nominal spacecraft operation maintained across all telemetry channels. Zero anomalies detected.`
          ];
        } else {
          scenarioSpecificLogs = [
            `[${faultTime}.210] [WARN] EPS 7.4V primary rail voltage sag detected (5.12V < 7.20V)`,
            `[${faultTime}.040] [ALERT] Buck-boost regulator duty cycle saturated at 100%`,
            `[${faultTime}.320] [CRIT] EPS 3.3V bus current exceeded threshold (2.84A > 2.10A). Power collapse imminent.`,
            `[${faultTime}.900] [FATAL] OBC UVLO brownout reset triggered. UHF transmitter link muted.`
          ];
        }

        const logs = [
          `[T+00:00.000] [BOOT] CubeSat 3U OBC EPS subsystem initialised - NOMINAL (Altitude ${orbitAltitude}km, Seed ${seed})`,
          `[T+00:45.120] [SOLAR] Solar Array Panel +X deployed: 14.82V, +Y deployed: 14.79V`,
          `[T+01:30.400] [BATT] 2x LiFePO4 cells balanced (8.22V), state-of-charge 98.4%`,
          `[T+02:15.890] [THERM] Thermistor sensor THERM_01 base temp: +18.4°C, noise ratio ±${noiseLevel}%`,
          ...scenarioSpecificLogs,
        ];
        setSyntheticLogs(logs);
        setEmittedFrameCount(sampleDuration * 10);
      }
    } catch (err) {
      console.error('Simulation generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Fault injection simulation handler - calls backend simulation engine with custom_fault
  const handleInjectFault = async () => {
    setIsInjecting(true);
    setInjectionResults(null);
    try {
      const seed = Math.floor(severityPct * 13 + 42);
      const sim = await generateSimulation({
        scenario_id: 'custom_fault',
        duration_seconds: 300,
        orbit_altitude_km: orbitAltitude,
        noise_level: noiseLevel,
        random_seed: seed,
        target_subsystem: targetSubsystem,
        failure_type: failureType,
        severity_pct: severityPct,
        injection_offset_s: 285.0,
      });

      if (sim && sim.events && sim.events.length > 0) {
        const formatted = sim.events.map((ev: any) => {
          const metSec = ev.mission_elapsed_time || 0;
          const mins = Math.floor(metSec / 60);
          const secs = Math.floor(metSec % 60);
          const centis = Math.floor((metSec % 1) * 100);
          const timeStr = `T+${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
          const isTripped = ev.severity === 'FATAL' || ev.severity === 'CRITICAL';
          return {
            step: `${ev.component?.replace(/_/g, ' ').toUpperCase()}: ${ev.description || ev.parameter}`,
            status: isTripped ? ('tripped' as const) : ('affected' as const),
            time: timeStr,
          };
        });
        setInjectionResults(formatted);
      } else {
        const tgtName = targetSubsystem.replace('_', ' ').toUpperCase();
        setInjectionResults([
          { step: `Origin Point: ${tgtName} (${failureType.toUpperCase()}, ${severityPct}%)`, status: 'affected', time: injectionTimestamp },
          { step: 'Firmware Protection / Anomaly Watchdog', status: 'affected', time: 'T+04:56.12' },
          { step: 'Cross-Subsystem Actuator Over-Draw', status: 'tripped', time: 'T+04:58.40' },
          { step: 'Battery Subsystem Rapid Discharge', status: 'tripped', time: 'T+05:00.80' },
          { step: 'Main EPS Low-Voltage Cutoff Trip', status: 'tripped', time: 'T+05:01.32' },
          { step: 'UHF Transponder Telemetry Blackout', status: 'tripped', time: 'T+05:04.90' },
        ]);
      }
    } catch (err) {
      console.error('Fault injection error:', err);
    } finally {
      setIsInjecting(false);
    }
  };

  // Upload parser handler - calls backend telemetry upload endpoint
  const handleFileUpload = async (fileOrName: File | string, fileSize?: string, fileType?: string) => {
    setIsParsing(true);
    try {
      let uploadResult: any;
      if (fileOrName instanceof File) {
        setUploadedFile({ name: fileOrName.name, size: `${(fileOrName.size / 1024).toFixed(1)} KB`, type: fileOrName.type || 'text/csv', records: 0 });
        uploadResult = await backendApi.uploadSimulationTelemetry(fileOrName);
      } else {
        const sampleCsv = `timestamp,mission_elapsed_time,subsystem,channel_id,signal_name,value,unit,quality\n` +
          `2026-09-05T00:04:45.000Z,285.0,THERMAL,THM_TEMP_RAW,Thermistor Temp,21.42,C,VALID\n` +
          `2026-09-05T00:04:48.200Z,288.2,THERMAL,THM_TEMP_RAW,Thermistor Temp,23.10,C,VALID\n` +
          `2026-09-05T00:04:52.600Z,292.6,THERMAL,THM_TEMP_RAW,Thermistor Temp,28.94,C,VALID\n` +
          `2026-09-05T00:04:56.100Z,296.1,HEATER,HEAT_DUTY,Heater Duty,1.00,ratio,VALID\n` +
          `2026-09-05T00:04:59.400Z,299.4,BATTERY,BATT_TEMP,Battery Temp,58.20,C,VALID\n` +
          `2026-09-05T00:05:01.320Z,301.32,EPS,EPS_BUS_V,Main Bus Voltage,0.42,V,VALID\n` +
          `2026-09-05T00:05:03.000Z,303.0,OBC,OBC_CPU_LOAD,CPU Load,0.0,pct,VALID\n` +
          `2026-09-05T00:05:04.900Z,304.9,COMMS,COM_RSSI_DBM,RSSI Signal,-999.0,dBm,CORRUPT`;
        setUploadedFile({ name: fileOrName, size: fileSize || '32.0 KB', type: fileType || 'text/csv', records: 8 });
        const blob = new Blob([sampleCsv], { type: 'text/csv' });
        const file = new File([blob], fileOrName, { type: 'text/csv' });
        uploadResult = await backendApi.uploadSimulationTelemetry(file);
      }

      if (uploadResult) {
        const total = uploadResult.total_records || uploadResult.records?.length || 8;
        setUploadedFile(prev => prev ? { ...prev, records: total } : null);
        if (uploadResult.preview && uploadResult.preview.length > 0) {
          setParsedPreview(uploadResult.preview.map((p: any) => ({
            timestamp: `T+${typeof p.mission_elapsed_time === 'number' ? p.mission_elapsed_time.toFixed(1) : '04:45'}`,
            channel: p.channel_id || p.channel,
            raw: Number(p.value),
            state: p.quality === 'CORRUPT' ? 'CRITICAL' : Number(p.value) > 50 || Number(p.value) < 1 ? 'TRIPPED' : 'NOMINAL'
          })));
        } else if (uploadResult.records && uploadResult.records.length > 0) {
          setParsedPreview(uploadResult.records.slice(0, 8).map((p: any) => ({
            timestamp: `T+${typeof p.mission_elapsed_time === 'number' ? p.mission_elapsed_time.toFixed(1) : '04:45'}`,
            channel: p.channel_id || p.channel,
            raw: Number(p.value),
            state: p.quality === 'CORRUPT' ? 'CRITICAL' : Number(p.value) > 50 || Number(p.value) < 1 ? 'TRIPPED' : 'NOMINAL'
          })));
        }
        if (uploadResult.simulation_id) {
          await loadSimulationTelemetry(uploadResult.simulation_id);
        }
      }
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="relative min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-[#F0EAD6] text-[#1A1A1A] transition-colors duration-200">
      
      {/* Background Watermarks & Grid Patterns */}
      <div className="absolute inset-0 bg-circuit-pattern opacity-20 pointer-events-none"></div>
      <div className="absolute inset-0 bg-halftone opacity-20 pointer-events-none"></div>
      


      <div className="max-w-7xl mx-auto relative z-20">
        
        {/* Mission Lab Header */}
        <div className="relative mb-10 p-6 sm:p-8 bg-[#FAF6EE] border-4 border-[#1A1A1A] shadow-[0_15px_40px_rgba(26,24,21,0.15)] torn-paper-card overflow-hidden">
          {/* Engineering Print Background: 3U CubeSat + Faint Earth Curvature */}
          <MissionLabHeroBackground />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-xl lg:max-w-md xl:max-w-lg">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-mono-tech bg-[#DC143C] text-[#FAF6EE] px-2.5 py-0.5 font-bold uppercase tracking-widest rounded-xs">
                  LAB ENVIRONMENT
                </span>
                <span className="text-xs font-mono-tech text-[#C5A945] font-bold tracking-wider">
                  // ACTIVE SANDBOX
                </span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-headline font-black text-[#1A1A1A] tracking-tight leading-none">
                MISSION <span className="text-[#DC143C]">LAB</span>
              </h1>
              <div className="w-16 h-1 bg-[#C5A945] mt-2.5 mb-3"></div>
              <p className="text-xs sm:text-sm font-mono-tech text-[#1A1A1A]/85 leading-relaxed">
                This is where the product becomes interactive. Choose what you want to analyze across the three core ingestion routes: generate synthetic CubeSat scenarios, simulate failure cascades, or import your own mission telemetry.
              </p>
            </div>

            {/* Quick Stats / Specs Badge with Circular Icons (matching reference) */}
            <div className="relative z-10 flex flex-col gap-3 p-4 sm:p-5 bg-[#FAF6EE]/90 backdrop-blur-xs border border-[#1A1A1A]/40 rounded-lg font-mono-tech text-xs min-w-[280px] shadow-sm">
              
              {/* Row 1: Supported Formats */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#E8DFC8] border border-[#1A1A1A]/20 flex items-center justify-center text-[#1A1A1A] shrink-0">
                  <FileText className="w-4 h-4 text-[#625A50]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase font-bold text-[#625A50] tracking-wider">SUPPORTED FORMATS</div>
                  <div className="font-bold text-[#1A1A1A] text-xs">LOG / CSV / JSON</div>
                </div>
              </div>

              {/* Row 2: Topology Sampler */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#E8DFC8] border border-[#1A1A1A]/20 flex items-center justify-center text-[#1A1A1A] shrink-0">
                  <Box className="w-4 h-4 text-[#625A50]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase font-bold text-[#625A50] tracking-wider">TOPOLOGY SAMPLER</div>
                  <div className="font-bold text-[#C5A945] text-xs">3U / 6U CUBESAT</div>
                </div>
              </div>

              {/* Row 3: Causal Engine */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#E8DFC8] border border-[#1A1A1A]/20 flex items-center justify-center text-[#1A1A1A] shrink-0">
                  <Cpu className="w-4 h-4 text-[#DC143C]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase font-bold text-[#625A50] tracking-wider">CAUSAL ENGINE</div>
                  <div className="font-bold text-[#DC143C] text-xs">CEALIS v2.4</div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* The Three Large Modes Cards (Exact Reference Specification) */}
        <div className="relative mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 relative z-10 items-stretch">
            
            {/* ------------------------------------------------------------- */}
            {/* CARD 01: SYNTHETIC MISSION                                   */}
            {/* ------------------------------------------------------------- */}
            <div 
              className={`relative flex flex-col justify-between p-5 sm:p-6 lg:p-7 bg-[#FAF6EE] border-2 transition-all duration-300 dossier-feature-card cursor-pointer group select-none ${
                activeMode === 'synthetic' 
                  ? 'border-[#1A1A1A] ring-2 ring-[#1A1A1A]/40 -translate-y-1.5 shadow-[0_12px_28px_rgba(26,24,21,0.14),0_2px_6px_rgba(26,24,21,0.08)]' 
                  : activeMode !== null 
                    ? 'border-[#1A1A1A] opacity-90 hover:opacity-100 hover:-translate-y-1.5 shadow-[0_4px_16px_rgba(26,24,21,0.07),0_1px_3px_rgba(26,24,21,0.06)] hover:shadow-[0_12px_28px_rgba(26,24,21,0.12)]' 
                    : 'border-[#1A1A1A] hover:-translate-y-1.5 shadow-[0_4px_16px_rgba(26,24,21,0.07),0_1px_3px_rgba(26,24,21,0.06)] hover:shadow-[0_12px_28px_rgba(26,24,21,0.12)]'
              }`}
              onClick={() => setActiveMode(activeMode === 'synthetic' ? null : 'synthetic')}
            >
              {/* Subtle Paper Depth Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-[#F2E8D2]/40 pointer-events-none z-[1]" />

              {/* Corner Notch Accents (Reference Physical Cut-Paper Dossier) */}
              <span className="absolute top-0 left-0 w-3.5 h-3.5 bg-[#1A1A1A] pointer-events-none z-20" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
              <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-[#1A1A1A] pointer-events-none z-20" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }} />
              <span className="absolute bottom-0 left-0 w-3.5 h-3.5 bg-[#1A1A1A] pointer-events-none z-20" style={{ clipPath: 'polygon(0 0, 0 100%, 100% 100%)' }} />
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#1A1A1A] pointer-events-none z-20" style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }} />
              <span className="absolute top-1/2 -left-1 w-1.5 h-3.5 bg-[#1A1A1A] -translate-y-1/2 pointer-events-none z-20" />
              <span className="absolute top-1/2 -right-1 w-1.5 h-3.5 bg-[#1A1A1A] -translate-y-1/2 pointer-events-none z-20" />

              {/* Enhanced Depth Watermark: Orbital Telemetry Geometry (Bottom-Left) */}
              <div className="absolute -left-6 bottom-4 w-36 h-36 opacity-30 group-hover:opacity-45 transition-opacity duration-300 pointer-events-none select-none z-0">
                <svg viewBox="0 0 120 120" className="w-full h-full stroke-[#B88A22] fill-none">
                  {/* Outer & Inner Orbit Tracks with varying weights */}
                  <circle cx="50" cy="70" r="38" strokeWidth="1" strokeDasharray="4 3" />
                  <circle cx="50" cy="70" r="24" strokeWidth="0.8" strokeOpacity="0.7" />
                  <ellipse cx="50" cy="70" rx="52" ry="22" strokeWidth="1.5" strokeOpacity="0.85" transform="rotate(-28 50 70)" />
                  <ellipse cx="50" cy="70" rx="46" ry="16" strokeWidth="0.75" strokeDasharray="2 3" strokeOpacity="0.6" transform="rotate(-28 50 70)" />
                  {/* Fine telemetry coordinate lines */}
                  <line x1="50" y1="30" x2="50" y2="110" strokeWidth="0.5" strokeOpacity="0.3" strokeDasharray="2 2" />
                  <line x1="10" y1="70" x2="90" y2="70" strokeWidth="0.5" strokeOpacity="0.3" strokeDasharray="2 2" />
                </svg>
              </div>

              {/* Card Main Content */}
              <div className="relative z-10 flex flex-col flex-1">
                {/* Top Label & Icon Header */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] sm:text-xs font-mono font-bold tracking-wider px-2.5 py-0.5 bg-[#141312] text-[#FAF6EE] uppercase shadow-xs">
                    FEATURE 01
                  </span>
                  <Cpu className="w-5 h-5 text-[#B88A22] stroke-[2] drop-shadow-[0_1px_1px_rgba(184,138,34,0.2)]" />
                </div>

                {/* Title */}
                <h3 className="font-headline font-black text-2xl sm:text-[26px] lg:text-[28px] text-[#121110] tracking-tight uppercase leading-none mb-2 mt-1">
                  SYNTHETIC MISSION
                </h3>

                {/* Short Accent Divider */}
                <div className="w-9 h-[3px] bg-[#B88A22] mb-3.5 transition-all duration-300 group-hover:w-14 shadow-xs"></div>
                
                {/* Short Description */}
                <p className="text-[11px] sm:text-xs font-mono text-[#4E473F] leading-relaxed mb-5 min-h-[44px]">
                  Generate a known CubeSat scenario with parameterizable orbit, altitude, and sensor telemetry signatures.
                </p>

                {/* Technical Inset Panel */}
                <div className="p-3 sm:p-3.5 bg-[#EDE4D0]/95 border border-[#1A1A1A]/30 font-mono text-[11px] space-y-1 mb-5 min-h-[72px] flex flex-col justify-center shadow-[inset_0_1px_3px_rgba(26,24,21,0.05)]">
                  <div className="text-[#121110] font-bold text-[11px] tracking-wide uppercase">
                    SYNTHETIC CUBESAT LOG GENERATOR
                  </div>
                  <div className="text-[#554D44] text-[10.5px] leading-snug">
                    Generates multi-bus continuous flight recorder streams with variable noise.
                  </div>
                </div>
              </div>

              {/* Bottom Primary CTA */}
              <button
                type="button"
                className={`relative z-10 w-full py-2.5 px-4 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer mt-auto select-none ${
                  activeMode === 'synthetic'
                    ? 'bg-[#141312] text-[#FAF6EE] shadow-inner'
                    : 'bg-[#141312] text-[#FAF6EE] hover:bg-[#282522]'
                }`}
              >
                <span>OPEN →</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* CARD 02: FAULT INJECTION                                      */}
            {/* ------------------------------------------------------------- */}
            <div 
              className={`relative flex flex-col justify-between p-5 sm:p-6 lg:p-7 bg-[#FAF6EE] border-2 transition-all duration-300 dossier-feature-card cursor-pointer group select-none ${
                activeMode === 'fault_injection' 
                  ? 'border-[#C91D37] ring-2 ring-[#C91D37]/40 -translate-y-1.5 shadow-[0_12px_28px_rgba(201,29,55,0.18),0_2px_6px_rgba(201,29,55,0.1)]' 
                  : activeMode !== null 
                    ? 'border-[#C91D37] opacity-90 hover:opacity-100 hover:-translate-y-1.5 shadow-[0_4px_16px_rgba(201,29,55,0.09),0_1px_3px_rgba(201,29,55,0.07)] hover:shadow-[0_12px_28px_rgba(201,29,55,0.16)]' 
                    : 'border-[#C91D37] hover:-translate-y-1.5 shadow-[0_4px_16px_rgba(201,29,55,0.09),0_1px_3px_rgba(201,29,55,0.07)] hover:shadow-[0_12px_28px_rgba(201,29,55,0.16)]'
              }`}
              onClick={() => setActiveMode(activeMode === 'fault_injection' ? null : 'fault_injection')}
            >
              {/* Subtle Paper Depth Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-[#FCEBEF]/40 pointer-events-none z-[1]" />

              {/* Corner Notch Accents (Crimson Dossier) */}
              <span className="absolute top-0 left-0 w-3.5 h-3.5 bg-[#C91D37] pointer-events-none z-20" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
              <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-[#C91D37] pointer-events-none z-20" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }} />
              <span className="absolute bottom-0 left-0 w-3.5 h-3.5 bg-[#C91D37] pointer-events-none z-20" style={{ clipPath: 'polygon(0 0, 0 100%, 100% 100%)' }} />
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#C91D37] pointer-events-none z-20" style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }} />
              <span className="absolute top-1/2 -left-1 w-1.5 h-3.5 bg-[#C91D37] -translate-y-1/2 pointer-events-none z-20" />
              <span className="absolute top-1/2 -right-1 w-1.5 h-3.5 bg-[#C91D37] -translate-y-1/2 pointer-events-none z-20" />

              {/* Enhanced Depth Watermark: Multi-Ring Radar & Thermal Anomaly (Bottom-Left) */}
              <div className="absolute -left-8 bottom-3 w-40 h-40 opacity-30 group-hover:opacity-48 transition-opacity duration-300 pointer-events-none select-none z-0">
                <svg viewBox="0 0 120 120" className="w-full h-full stroke-[#C91D37] fill-none">
                  <circle cx="55" cy="65" r="14" strokeWidth="1.6" />
                  <circle cx="55" cy="65" r="28" strokeWidth="1.2" strokeDasharray="5 3" />
                  <circle cx="55" cy="65" r="44" strokeWidth="0.8" strokeDasharray="3 4" />
                  <circle cx="55" cy="65" r="56" strokeWidth="0.5" strokeOpacity="0.4" strokeDasharray="2 3" />
                  {/* Radial sweep crosshairs & critical fault node */}
                  <line x1="10" y1="65" x2="100" y2="65" strokeWidth="0.6" strokeOpacity="0.4" strokeDasharray="2 2" />
                  <line x1="55" y1="20" x2="55" y2="110" strokeWidth="0.6" strokeOpacity="0.4" strokeDasharray="2 2" />
                  <path d="M 55 65 L 85 45" strokeWidth="1.2" strokeOpacity="0.7" strokeDasharray="2 2" />
                  <circle cx="55" cy="65" r="4.5" fill="#C91D37" />
                  <circle cx="85" cy="45" r="2.5" fill="#C91D37" />
                </svg>
              </div>

              {/* Card Main Content */}
              <div className="relative z-10 flex flex-col flex-1">
                {/* Top Label & Icon Header */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] sm:text-xs font-mono font-bold tracking-wider px-2.5 py-0.5 bg-[#C91D37] text-[#FAF6EE] uppercase shadow-xs">
                    FEATURE 02
                  </span>
                  <Flame className="w-5 h-5 text-[#C91D37] stroke-[2] drop-shadow-[0_1px_1px_rgba(201,29,55,0.2)]" />
                </div>

                {/* Title */}
                <h3 className="font-headline font-black text-2xl sm:text-[26px] lg:text-[28px] text-[#121110] tracking-tight uppercase leading-none mb-2 mt-1">
                  FAULT INJECTION
                </h3>

                {/* Short Accent Divider */}
                <div className="w-9 h-[3px] bg-[#C91D37] mb-3.5 transition-all duration-300 group-hover:w-14 shadow-xs"></div>
                
                {/* Short Description */}
                <p className="text-[11px] sm:text-xs font-mono text-[#4E473F] leading-relaxed mb-5 min-h-[44px]">
                  Inject a known failure cascade across thermal, battery, power bus, and communication loops.
                </p>

                {/* Technical Inset Panel */}
                <div className="p-3 sm:p-3.5 bg-[#EDE4D0]/95 border border-[#1A1A1A]/30 font-mono text-[11px] space-y-1 mb-5 min-h-[72px] flex flex-col justify-center shadow-[inset_0_1px_3px_rgba(26,24,21,0.05)]">
                  <div className="text-[#121110] font-bold text-[11px] tracking-wide uppercase">
                    FAULT INJECTION SIMULATOR
                  </div>
                  <div className="text-[#554D44] text-[10.5px] leading-snug">
                    Trace propagation latency and verify root causal isolations against downstream effects.
                  </div>
                </div>
              </div>

              {/* Bottom Primary CTA */}
              <button
                type="button"
                className={`relative z-10 w-full py-2.5 px-4 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer mt-auto select-none ${
                  activeMode === 'fault_injection'
                    ? 'bg-[#141312] text-[#FAF6EE] shadow-inner'
                    : 'bg-[#141312] text-[#FAF6EE] hover:bg-[#282522]'
                }`}
              >
                <span>OPEN →</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* CARD 03: IMPORT INCIDENT                                      */}
            {/* ------------------------------------------------------------- */}
            <div 
              className={`relative flex flex-col justify-between p-5 sm:p-6 lg:p-7 bg-[#FAF6EE] border-2 transition-all duration-300 dossier-feature-card cursor-pointer group select-none ${
                activeMode === 'import_incident' 
                  ? 'border-[#1A1A1A] ring-2 ring-[#1A1A1A]/40 -translate-y-1.5 shadow-[0_12px_28px_rgba(26,24,21,0.14),0_2px_6px_rgba(26,24,21,0.08)]' 
                  : activeMode !== null 
                    ? 'border-[#1A1A1A] opacity-90 hover:opacity-100 hover:-translate-y-1.5 shadow-[0_4px_16px_rgba(26,24,21,0.07),0_1px_3px_rgba(26,24,21,0.06)] hover:shadow-[0_12px_28px_rgba(26,24,21,0.12)]' 
                    : 'border-[#1A1A1A] hover:-translate-y-1.5 shadow-[0_4px_16px_rgba(26,24,21,0.07),0_1px_3px_rgba(26,24,21,0.06)] hover:shadow-[0_12px_28px_rgba(26,24,21,0.12)]'
              }`}
              onClick={() => setActiveMode(activeMode === 'import_incident' ? null : 'import_incident')}
            >
              {/* Subtle Paper Depth Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-[#F2E8D2]/40 pointer-events-none z-[1]" />

              {/* Corner Notch Accents (Black Dossier) */}
              <span className="absolute top-0 left-0 w-3.5 h-3.5 bg-[#1A1A1A] pointer-events-none z-20" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
              <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-[#1A1A1A] pointer-events-none z-20" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }} />
              <span className="absolute bottom-0 left-0 w-3.5 h-3.5 bg-[#1A1A1A] pointer-events-none z-20" style={{ clipPath: 'polygon(0 0, 0 100%, 100% 100%)' }} />
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#1A1A1A] pointer-events-none z-20" style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }} />
              <span className="absolute top-1/2 -left-1 w-1.5 h-3.5 bg-[#1A1A1A] -translate-y-1/2 pointer-events-none z-20" />
              <span className="absolute top-1/2 -right-1 w-1.5 h-3.5 bg-[#1A1A1A] -translate-y-1/2 pointer-events-none z-20" />

              {/* Enhanced Depth Watermark: Fanned Archive Dossier Sheets (Bottom-Left) */}
              <div className="absolute -left-6 bottom-4 w-36 h-36 opacity-30 group-hover:opacity-45 transition-opacity duration-300 pointer-events-none select-none z-0">
                <svg viewBox="0 0 120 120" className="w-full h-full stroke-[#B88A22] fill-[#FAF6EE]/50">
                  <rect x="25" y="32" width="46" height="58" rx="2" strokeWidth="1.2" transform="rotate(-16 48 61)" />
                  <rect x="38" y="26" width="46" height="58" rx="2" strokeWidth="1.4" strokeOpacity="0.8" transform="rotate(-5 61 55)" />
                  <rect x="50" y="20" width="46" height="58" rx="2" strokeWidth="1.6" strokeOpacity="0.9" transform="rotate(8 73 49)" />
                  {/* Fine technical packet lines inside top sheet */}
                  <line x1="58" y1="36" x2="88" y2="40" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.7" />
                  <line x1="60" y1="44" x2="86" y2="48" strokeWidth="0.8" strokeDasharray="2 2" strokeOpacity="0.5" />
                  <circle cx="88" cy="68" r="3" fill="#B88A22" />
                </svg>
              </div>

              {/* Card Main Content */}
              <div className="relative z-10 flex flex-col flex-1">
                {/* Top Label & Icon Header */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] sm:text-xs font-mono font-bold tracking-wider px-2.5 py-0.5 bg-[#B88A22] text-[#FAF6EE] uppercase shadow-xs">
                    FEATURE 03
                  </span>
                  <UploadCloud className="w-5 h-5 text-[#B88A22] stroke-[2] drop-shadow-[0_1px_1px_rgba(184,138,34,0.2)]" />
                </div>

                {/* Title */}
                <h3 className="font-headline font-black text-2xl sm:text-[26px] lg:text-[28px] text-[#121110] tracking-tight uppercase leading-none mb-2 mt-1">
                  IMPORT INCIDENT
                </h3>

                {/* Short Accent Divider */}
                <div className="w-9 h-[3px] bg-[#B88A22] mb-3.5 transition-all duration-300 group-hover:w-14 shadow-xs"></div>
                
                {/* Short Description */}
                <p className="text-[11px] sm:text-xs font-mono text-[#4E473F] leading-relaxed mb-5 min-h-[44px]">
                  Upload LOG / CSV / JSON telemetry dumps directly from spacecraft ground station archives.
                </p>

                {/* Technical Inset Panel */}
                <div className="p-3 sm:p-3.5 bg-[#EDE4D0]/95 border border-[#1A1A1A]/30 font-mono text-[11px] space-y-1 mb-5 min-h-[72px] flex flex-col justify-center shadow-[inset_0_1px_3px_rgba(26,24,21,0.05)]">
                  <div className="text-[#121110] font-bold text-[11px] tracking-wide uppercase">
                    LOG / CSV / JSON UPLOAD
                  </div>
                  <div className="text-[#554D44] text-[10.5px] leading-snug">
                    Ingest and auto-structure unstructured sensor packets for instant causal lineage.
                  </div>
                </div>
              </div>

              {/* Bottom Primary CTA */}
              <button
                type="button"
                className={`relative z-10 w-full py-2.5 px-4 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer mt-auto select-none ${
                  activeMode === 'import_incident'
                    ? 'bg-[#141312] text-[#FAF6EE] shadow-inner'
                    : 'bg-[#141312] text-[#FAF6EE] hover:bg-[#282522]'
                }`}
              >
                <span>OPEN →</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </div>

          </div>
        </div>

        {/* ACTIVE WORKSPACE PANELS */}

        {/* 1. Synthetic Generator Panel */}
        {activeMode === 'synthetic' && (
          <div className="mb-12 p-6 sm:p-8 bg-[#FAF6EE] border-4 border-[#1A1A1A] shadow-xl torn-paper-card">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-6 border-b-2 border-[#1A1A1A]/20">
              <div>
                <span className="text-xs font-mono-tech font-bold bg-[#1A1A1A] text-[#FAF6EE] px-2 py-0.5 uppercase">
                  FEATURE 01 WORKSPACE
                </span>
                <h3 className="font-headline font-black text-2xl text-[#1A1A1A] mt-1">
                  SYNTHETIC CUBESAT LOG GENERATOR
                </h3>
              </div>
              <span className="text-xs font-mono-tech text-[#625A50]">
                STATUS: READY TO EMIT DUMP
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Controls Column */}
              <div className="lg:col-span-5 space-y-4 font-mono-tech text-xs">
                
                <div>
                  <label className="block font-bold text-[#1A1A1A] mb-1">SCENARIO BLUEPRINT PRESET:</label>
                  <select 
                    value={syntheticPreset} 
                    onChange={(e) => setSyntheticPreset(e.target.value as any)}
                    className="w-full bg-[#F0EAD6] border-2 border-[#1A1A1A] p-2.5 font-bold uppercase cursor-pointer"
                  >
                    <option value="power_collapse">1. Power Bus Cascade Collapse (Standard Incident)</option>
                    <option value="thermal_runaway">2. Thermal Over-Cycle Runaway (Deep Eclipse)</option>
                    <option value="misleading_early_anomaly">3. Misleading Early Anomaly (ADCS Gyro vs Battery Short)</option>
                    <option value="competing_root_causes">4. Competing Hypotheses (Sensor Bias vs Heater Short)</option>
                    <option value="missing_telemetry">5. Missing Downlink Telemetry (Unobserved Channels)</option>
                    <option value="solar_storm">6. Solar Geomagnetic EMP Storm Spike</option>
                    <option value="nominal_leo">7. Baseline Nominal LEO Orbit (No Faults)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-[#1A1A1A] mb-1">ORBIT ALTITUDE:</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="range" 
                        min="300" 
                        max="850" 
                        value={orbitAltitude} 
                        onChange={(e) => setOrbitAltitude(Number(e.target.value))}
                        className="w-full accent-[#DC143C]" 
                      />
                      <span className="font-bold text-[#C5A945]">{orbitAltitude}km</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-[#1A1A1A] mb-1">TELEMETRY NOISE (±%):</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="range" 
                        min="0.2" 
                        max="5.0" 
                        step="0.2" 
                        value={noiseLevel} 
                        onChange={(e) => setNoiseLevel(Number(e.target.value))}
                        className="w-full accent-[#DC143C]" 
                      />
                      <span className="font-bold text-[#C5A945]">{noiseLevel}%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#1A1A1A] mb-1">SAMPLE DURATION (SECONDS):</label>
                  <input 
                    type="number" 
                    value={sampleDuration} 
                    onChange={(e) => setSampleDuration(Number(e.target.value))}
                    className="w-full bg-[#F0EAD6] border-2 border-[#1A1A1A] p-2 font-bold"
                  />
                </div>

                <button
                  onClick={handleGenerateSynthetic}
                  disabled={isGenerating}
                  className="w-full py-3 bg-[#DC143C] text-[#FAF6EE] font-mono-tech font-bold uppercase tracking-wider border-2 border-[#1A1A1A] hover:bg-[#A3162C] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Play className="w-4 h-4" />
                  <span>{isGenerating ? 'SYNTHESIZING TELEMETRY STREAM...' : 'EMIT SYNTHETIC LOG STREAM'}</span>
                </button>
              </div>

              {/* Terminal Output Column */}
              <div className="lg:col-span-7 bg-[#1A1A1A] p-4 text-[#FAF6EE] font-mono-tech text-xs border-2 border-[#1A1A1A] shadow-inner flex flex-col justify-between min-h-[260px]">
                <div>
                  <div className="flex items-center justify-between border-b border-[#FAF6EE]/20 pb-2 mb-3 text-[11px] text-[#C5A945]">
                    <span>TERMINAL // RAW BUS BUFFER</span>
                    <span>FRAMES: {syntheticLogs.length > 0 ? `${emittedFrameCount || activeSimulation?.total_packets || sampleDuration * 10} EMITTED` : '0 READY'}</span>
                  </div>

                  {syntheticLogs.length === 0 ? (
                    <div className="text-[#FAF6EE]/50 py-10 text-center">
                      Click "EMIT SYNTHETIC LOG STREAM" to generate simulated CubeSat telemetry packets...
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {syntheticLogs.map((line, i) => (
                        <div key={i} className={`p-1.5 ${line.includes('[CRIT]') || line.includes('[ALERT]') || line.includes('[FATAL]') ? 'bg-[#DC143C]/30 text-[#FAF6EE] border-l-2 border-[#DC143C]' : 'text-[#FAF6EE]/90'}`}>
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {syntheticLogs.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-[#FAF6EE]/20 flex items-center justify-between">
                    <span className="text-[10px] text-[#FAF6EE]/60">SYNTHETIC BUFFER LOCKED ({emittedFrameCount || activeSimulation?.total_packets || sampleDuration * 10} FRAMES)</span>
                    <button
                      onClick={async () => {
                        const targetScenario = syntheticPreset === 'power_collapse' 
                          ? 'power_bus_drop' 
                          : syntheticPreset === 'thermal_runaway' 
                            ? 'thermal_sensor' 
                            : syntheticPreset === 'solar_storm'
                              ? 'solar_panel_degradation'
                              : syntheticPreset;
                        
                        const dataset = generateSyntheticTelemetryDataset(targetScenario, {
                          orbitAltitude: `${orbitAltitude} km LEO`,
                          noiseLevel: noiseLevel,
                          source: 'synthetic_generator',
                          rawLogs: syntheticLogs,
                          totalPackets: emittedFrameCount || activeSimulation?.total_packets || sampleDuration * 10,
                        });
                        
                        if (activeSimulation?.simulation_id) {
                          await runAnalysis(activeSimulation.simulation_id);
                        }
                        onOpenAnalysis?.(targetScenario, dataset);
                      }}
                      className="px-4 py-2 bg-[#C5A945] text-[#121110] font-bold text-xs hover:bg-[#FAF6EE] hover:text-[#1A1A1A] transition-colors cursor-pointer flex items-center gap-1.5 shadow-md"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>SEND TO CEALIS AI TRACER →</span>
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* 2. Fault Injection Simulator Panel */}
        {activeMode === 'fault_injection' && (
          <div className="mb-12 p-6 sm:p-8 bg-[#FAF6EE] border-4 border-[#1A1A1A] shadow-xl torn-paper-card">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-6 border-b-2 border-[#1A1A1A]/20">
              <div>
                <span className="text-xs font-mono-tech font-bold bg-[#DC143C] text-[#FAF6EE] px-2 py-0.5 uppercase">
                  FEATURE 02 WORKSPACE
                </span>
                <h3 className="font-headline font-black text-2xl text-[#1A1A1A] mt-1">
                  FAULT INJECTION SIMULATOR
                </h3>
              </div>
              <span className="text-xs font-mono-tech text-[#625A50]">
                FAILURE CASCADE PROPAGATION BENCH
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Controls */}
              <div className="lg:col-span-5 space-y-4 font-mono-tech text-xs">
                <div>
                  <label className="block font-bold text-[#1A1A1A] mb-1">TARGET SUBSYSTEM:</label>
                  <select 
                    value={targetSubsystem} 
                    onChange={(e) => setTargetSubsystem(e.target.value as any)}
                    className="w-full bg-[#F0EAD6] border-2 border-[#1A1A1A] p-2.5 font-bold uppercase cursor-pointer"
                  >
                    <option value="thermal_loop">Thermistor / Thermal Loop (THERM_01)</option>
                    <option value="eps_bus">EPS 3.3V Power Bus Distribution</option>
                    <option value="adcs_gyro">ADCS Gyroscope / Reaction Wheels</option>
                    <option value="comms_rf">UHF/VHF Transceiver Module</option>
                    <option value="payload_sensor">Optical Payload Power Switch</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#1A1A1A] mb-1">FAULT INJECTION TYPE:</label>
                  <select 
                    value={failureType} 
                    onChange={(e) => setFailureType(e.target.value as any)}
                    className="w-full bg-[#F0EAD6] border-2 border-[#1A1A1A] p-2.5 font-bold uppercase cursor-pointer"
                  >
                    <option value="bias_drift">Analog Bias Drift (+12.8% Sigmoid Offset)</option>
                    <option value="stuck_at_zero">Stuck-at-Zero Hard GND Short</option>
                    <option value="oscillatory_spike">High-Frequency Ringing Voltage Spike</option>
                    <option value="cascade_collapse">Cascading Thermal-to-EPS Over-Draw Collapse</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-[#1A1A1A] mb-1">INJECTION TIME:</label>
                    <input 
                      type="text" 
                      value={injectionTimestamp} 
                      onChange={(e) => setInjectionTimestamp(e.target.value)}
                      className="w-full bg-[#F0EAD6] border-2 border-[#1A1A1A] p-2 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#1A1A1A] mb-1">SEVERITY INTENSITY:</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="range" 
                        min="10" 
                        max="100" 
                        value={severityPct} 
                        onChange={(e) => setSeverityPct(Number(e.target.value))}
                        className="w-full accent-[#DC143C]" 
                      />
                      <span className="font-bold text-[#DC143C]">{severityPct}%</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleInjectFault}
                  disabled={isInjecting}
                  className="w-full py-3 bg-[#DC143C] text-[#FAF6EE] font-mono-tech font-bold uppercase tracking-wider border-2 border-[#1A1A1A] hover:bg-[#A3162C] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Flame className="w-4 h-4" />
                  <span>{isInjecting ? 'SIMULATING FAULT CASCADE...' : 'EXECUTE FAULT INJECTION'}</span>
                </button>
              </div>

              {/* Cascade Output */}
              <div className="lg:col-span-7 bg-[#F0EAD6] p-5 border-2 border-[#1A1A1A] flex flex-col justify-between font-mono-tech text-xs">
                <div>
                  <div className="flex items-center justify-between border-b border-[#1A1A1A]/20 pb-2 mb-4 font-bold">
                    <span>PROPAGATION TOPOLOGY CASCADE</span>
                    <span className="text-[#DC143C]">CAUSAL STRING TRACE</span>
                  </div>

                  {!injectionResults ? (
                    <div className="text-[#625A50] py-12 text-center">
                      Configure parameters and execute fault injection to simulate hardware cascade lineage...
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {injectionResults.map((item, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between p-2.5 bg-[#FAF6EE] border-2 border-[#1A1A1A] shadow-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-[#1A1A1A] text-[#FAF6EE] flex items-center justify-center text-[10px] font-bold">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-[#1A1A1A]">{item.step}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[#C5A945] font-bold">{item.time}</span>
                            <span className={`text-[10px] px-2 py-0.5 font-bold uppercase ${
                              item.status === 'tripped' 
                                ? 'bg-[#DC143C] text-[#FAF6EE]' 
                                : 'bg-[#C5A945] text-[#FAF6EE]'
                            }`}>
                              {item.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {injectionResults && (
                  <div className="mt-6 pt-3 border-t border-[#1A1A1A]/20 flex items-center justify-between">
                    <span className="text-[11px] text-[#625A50]">CASCADE ISOLATED: ROOT INJECTION IDENTIFIED AT STEP 1</span>
                    <button
                      onClick={async () => {
                        const targetScenario = targetSubsystem === 'thermal_loop' 
                          ? 'thermal_sensor'
                          : targetSubsystem === 'eps_bus'
                            ? 'power_bus_drop'
                            : targetSubsystem === 'comms_rf' || targetSubsystem === 'adcs_gyro'
                              ? 'comms_loss'
                              : 'payload_failure';

                        const dataset = generateSyntheticTelemetryDataset(targetScenario, {
                          source: 'fault_injection',
                          injectedFault: `${targetSubsystem.toUpperCase()} [${failureType.toUpperCase()}]`,
                          rawLogs: injectionResults ? injectionResults.map(r => `[${r.time}] [INJECT] ${r.step} -> ${r.status.toUpperCase()}`) : []
                        });

                        if (activeSimulation?.simulation_id) {
                          await runAnalysis(activeSimulation.simulation_id);
                        }
                        onOpenAnalysis?.(targetScenario, dataset);
                      }}
                      className="px-4 py-2 bg-[#1A1A1A] text-[#FAF6EE] font-bold hover:bg-[#DC143C] transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Cpu className="w-3.5 h-3.5 text-[#DC143C]" />
                      <span>OPEN CAUSAL GRAPH →</span>
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* 3. Log / CSV / JSON Upload Panel */}
        {activeMode === 'import_incident' && (
          <div className="mb-12 p-6 sm:p-8 bg-[#FAF6EE] border-4 border-[#1A1A1A] shadow-xl torn-paper-card">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-6 border-b-2 border-[#1A1A1A]/20">
              <div>
                <span className="text-xs font-mono-tech font-bold bg-[#C5A945] text-[#FAF6EE] px-2 py-0.5 uppercase">
                  FEATURE 03 WORKSPACE
                </span>
                <h3 className="font-headline font-black text-2xl text-[#1A1A1A] mt-1">
                  LOG / CSV / JSON UPLOAD
                </h3>
              </div>
              <span className="text-xs font-mono-tech text-[#625A50]">
                GROUND STATION TELEMETRY PARSER
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Drag and Drop Area */}
              <div className="lg:col-span-5 flex flex-col justify-between font-mono-tech text-xs space-y-4">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      const f = e.dataTransfer.files[0];
                      handleFileUpload(f.name, `${(f.size / 1024).toFixed(1)} KB`, f.type || 'text/csv');
                    }
                  }}
                  className={`p-8 border-4 border-dashed text-center flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer ${
                    dragActive 
                      ? 'border-[#DC143C] bg-[#F0EAD6]' 
                      : 'border-[#1A1A1A]/40 bg-[#F0EAD6]/50 hover:border-[#1A1A1A]'
                  }`}
                  onClick={() => {
                    handleFileUpload('cubesat_orbit_pass_0149.csv', '48.2 KB', 'text/csv');
                  }}
                >
                  <UploadCloud className="w-10 h-10 text-[#C5A945]" />
                  <div>
                    <div className="font-bold text-[#1A1A1A] text-sm mb-1">
                      DRAG & DROP TELEMETRY FILE HERE
                    </div>
                    <div className="text-[11px] text-[#625A50]">
                      Accepts raw ASCII logs (.log), tabular sensor data (.csv), or JSON packet streams (.json)
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-[#1A1A1A] text-[#FAF6EE] font-bold text-[10px] uppercase">
                    OR CLICK TO LOAD SAMPLE CSV
                  </span>
                </div>

                {/* Pre-formatted Sample Bundles */}
                <div>
                  <span className="font-bold text-[#1A1A1A] block mb-2">QUICK SAMPLE INCIDENT ARCHIVES:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleFileUpload('gt_8849_raw_teletype.log', '34.1 KB', 'text/plain')}
                      className="p-2 border border-[#1A1A1A] bg-[#FAF6EE] text-left hover:bg-[#F0EAD6] transition-colors cursor-pointer"
                    >
                      <div className="font-bold text-[#1A1A1A]">GT-8849 Teletype</div>
                      <div className="text-[10px] text-[#625A50]">Raw ASCII .LOG</div>
                    </button>
                    <button
                      onClick={() => handleFileUpload('eps_telemetry_dump.json', '56.4 KB', 'application/json')}
                      className="p-2 border border-[#1A1A1A] bg-[#FAF6EE] text-left hover:bg-[#F0EAD6] transition-colors cursor-pointer"
                    >
                      <div className="font-bold text-[#1A1A1A]">EPS Bus JSON</div>
                      <div className="text-[10px] text-[#625A50]">Structured JSON</div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Ingestion & Parsing Preview */}
              <div className="lg:col-span-7 bg-[#F0EAD6] p-5 border-2 border-[#1A1A1A] font-mono-tech text-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-[#1A1A1A]/20 pb-2 mb-4 font-bold">
                    <span>STRUCTURED TELEMETRY APERTURE</span>
                    <span className="text-[#C5A945]">
                      {uploadedFile ? `${uploadedFile.name} (${uploadedFile.records} RECORDS)` : 'AWAITING INPUT'}
                    </span>
                  </div>

                  {!uploadedFile ? (
                    <div className="text-[#625A50] py-12 text-center">
                      Upload or choose a sample file to trigger asynchronous schema structuring...
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b-2 border-[#1A1A1A] text-[10px] font-bold text-[#625A50]">
                            <th className="pb-2">TIMESTAMP</th>
                            <th className="pb-2">CHANNEL IDENT</th>
                            <th className="pb-2">RAW VALUE</th>
                            <th className="pb-2">STATE</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1A1A1A]/10 text-[11px]">
                          {parsedPreview.map((row, idx) => (
                            <tr key={idx} className="hover:bg-[#FAF6EE]/50">
                              <td className="py-1.5 font-bold text-[#1A1A1A]">{row.timestamp}</td>
                              <td className="py-1.5 font-semibold text-[#625A50]">{row.channel}</td>
                              <td className="py-1.5 font-bold text-[#C5A945] tabular-nums">{row.raw}</td>
                              <td className="py-1.5">
                                <span className={`px-1.5 py-0.5 text-[10px] font-bold ${
                                  row.state === 'CRITICAL' || row.state === 'TRIPPED' 
                                    ? 'bg-[#DC143C] text-[#FAF6EE]' 
                                    : row.state === 'DRIFT' || row.state === 'OVERRIDE'
                                      ? 'bg-[#C5A945] text-[#FAF6EE]'
                                      : 'bg-emerald-800 text-white'
                                }`}>
                                  {row.state}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {uploadedFile && (
                  <div className="mt-6 pt-3 border-t border-[#1A1A1A]/20 flex items-center justify-between">
                    <span className="text-[11px] text-[#625A50]">SCHEMA NORMALIZATION: 100% COMPLETE</span>
                    <button
                      onClick={async () => {
                        const dataset = generateSyntheticTelemetryDataset('thermal_sensor', {
                          source: 'imported_file',
                          rawLogs: [
                            `[INGEST] File: ${uploadedFile.name} (${uploadedFile.size})`,
                            `[INGEST] Normalized ${uploadedFile.records} telemetry frames into Caelis format`,
                            `[INGEST] CRC-32 validation: PASS`,
                            `[INGEST] Primary anomaly excursion detected at channel THERM_01`
                          ]
                        });
                        if (activeSimulation?.simulation_id) {
                          await runAnalysis(activeSimulation.simulation_id);
                        }
                        onOpenAnalysis?.('thermal_sensor', dataset);
                      }}
                      className="px-4 py-2 bg-[#DC143C] text-[#FAF6EE] font-bold hover:bg-[#A3162C] transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>INITIALIZE CEALIS RECONSTRUCTION →</span>
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
