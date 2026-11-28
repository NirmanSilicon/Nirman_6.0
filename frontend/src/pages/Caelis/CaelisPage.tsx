import React, { useState, useEffect, useRef } from 'react';
import { AiEvent, CausalValidationResult, SyntheticMissionData } from '../../types/caelis';
import { MockCaelisClient } from '../../services/caelis/caelisClient';
import { CaelisHeader } from '../../components/caelis/CaelisHeader';
import { TelemetryWindow } from '../../components/caelis/TelemetryWindow';
import { CaelisResult } from '../../components/caelis/CaelisResult';
import { FlightRecorderShapInspector } from '../../components/caelis/FlightRecorderShapInspector';
import { CausalValidation } from '../../components/caelis/CausalValidation';
import { ScenarioSelector } from '../../components/caelis/ScenarioSelector';
import { Esp32LiveStation } from '../../components/caelis/Esp32LiveStation';
import { ArrowLeft, ChevronRight, CornerDownRight, Target, ShieldAlert, Cpu, Beaker, Radio } from 'lucide-react';
import { mockAiEvents } from '../../data/caelisMock';
import { useAnalysis } from '../../context/AnalysisContext';

const client = new MockCaelisClient();

interface CaelisPageProps {
  onBack: () => void;
  theme?: 'light' | 'dark';
  onNavigateToSection?: (sectionId: string) => void;
  activeSyntheticData?: SyntheticMissionData | null;
  onOpenMissionLab?: () => void;
  onOpenReconstruction?: () => void;
}

export const CaelisPage: React.FC<CaelisPageProps> = ({ 
  onBack, 
  theme, 
  onNavigateToSection,
  activeSyntheticData,
  onOpenMissionLab,
  onOpenReconstruction
}) => {
  const { activeSimulation, activeTelemetry, runAnalysis } = useAnalysis();

  const [scenario, setScenario] = useState<string>(
    activeSimulation?.scenario_id || activeSyntheticData?.scenarioId || 'thermal_sensor'
  );
  // Initialize with initial scenario event so the UI is immediately coherent
  const [aiEvent, setAiEvent] = useState<AiEvent | null>(
    mockAiEvents[activeSimulation?.scenario_id || activeSyntheticData?.scenarioId || 'thermal_sensor'] || null
  );
  const [validationResult, setValidationResult] = useState<CausalValidationResult | null>(null);
  
  const [processing, setProcessing] = useState<boolean>(false);
  const [scanState, setScanState] = useState<'idle' | 'animating' | 'complete'>('complete');
  const [validating, setValidating] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'caelis' | 'esp32_edge'>('caelis');

  // References to handle video timing synchronization with backend API
  const pendingEventRef = useRef<AiEvent | null>(null);
  const videoDoneRef = useRef<boolean>(false);
  const apiDoneRef = useRef<boolean>(false);

  // Derive dynamic channels from live/simulated telemetry dataset
  const customChannels = React.useMemo(() => {
    if (!activeTelemetry || activeTelemetry.length === 0) return undefined;
    
    const channelMap = new Map<string, { channel_id: string; subsystem: string; hasAnomaly: boolean }>();
    activeTelemetry.forEach(r => {
      const existing = channelMap.get(r.channel_id);
      const isAnom = r.quality === 'CORRUPT' || r.quality === 'OUT_OF_BOUNDS' || r.quality === 'DEGRADED';
      if (!existing) {
        channelMap.set(r.channel_id, {
          channel_id: r.channel_id,
          subsystem: r.subsystem,
          hasAnomaly: isAnom
        });
      } else if (isAnom) {
        existing.hasAnomaly = true;
      }
    });

    return Array.from(channelMap.values()).map((ch, idx) => ({
      id: ch.channel_id,
      label: `${idx + 1}. [SIM] ${ch.channel_id.replace(/_/g, ' ')} (${ch.subsystem})`,
      tag: ch.hasAnomaly ? 'SIM ANOMALY' : 'SIM NOMINAL',
      type: (ch.hasAnomaly ? 'anomaly' : 'nominal') as 'anomaly' | 'nominal',
      subsystem: ch.subsystem,
      isSimulation: true
    }));
  }, [activeTelemetry]);

  // Sync if activeSyntheticData or activeSimulation changes
  useEffect(() => {
    const target = activeSimulation?.scenario_id || activeSyntheticData?.scenarioId;
    if (target && target !== scenario) {
      setScenario(target);
      runPatternScan(target);
    }
  }, [activeSyntheticData, activeSimulation]);

  const runPatternScan = async (scenarioId: string) => {
    if (processing) return;

    setProcessing(true);
    setScanState('animating');
    setValidationResult(null);

    pendingEventRef.current = null;
    videoDoneRef.current = false;
    apiDoneRef.current = false;

    // Extract real simulation values if available for this channel/scenario
    let customValues: number[] | undefined;
    let customComponent: string | undefined;

    if (activeTelemetry && activeTelemetry.length > 0) {
      const matching = activeTelemetry.filter(
        r => r.channel_id === scenarioId || 
             r.subsystem.toUpperCase() === scenarioId.toUpperCase() ||
             (scenarioId === 'thermal_sensor' && r.channel_id === 'THM_TEMP_RAW') ||
             (scenarioId === 'power_bus_drop' && r.channel_id === 'EPS_BUS_V') ||
             (scenarioId === 'battery_anomaly' && r.channel_id === 'BATT_V_RAW') ||
             (scenarioId === 'heater_anomaly' && r.channel_id === 'HTR_STATUS') ||
             (scenarioId === 'comms_loss' && r.channel_id === 'S_BAND_TX') ||
             (scenarioId === 'obc_watchdog' && r.channel_id === 'OBC_STATE')
      );

      if (matching.length > 0) {
        customValues = matching.map(r => r.value);
        customComponent = matching[0].channel_id;
      }
    }

    try {
      const result = await client.analyzeWindow({ 
        scenarioId, 
        windowStart: 'T+04:55', 
        windowEnd: 'T+05:05',
        customValues,
        customComponent
      });
      pendingEventRef.current = result;
      apiDoneRef.current = true;

      // If video already signaled completion, finalize state immediately
      if (videoDoneRef.current) {
        setAiEvent(result);
        setScanState('complete');
        setProcessing(false);
      }
    } catch (e) {
      console.error(e);
      // Fallback on error to mock data
      const fallback = mockAiEvents[scenarioId] || null;
      pendingEventRef.current = fallback;
      apiDoneRef.current = true;
      if (videoDoneRef.current) {
        setAiEvent(fallback);
        setScanState('complete');
        setProcessing(false);
      }
    }
  };

  const handleAnimationComplete = () => {
    videoDoneRef.current = true;
    // If backend API already finished, transition to complete state
    if (apiDoneRef.current && pendingEventRef.current) {
      setAiEvent(pendingEventRef.current);
      setScanState('complete');
      setProcessing(false);
    }
  };

  const handleSelectScenario = (newScenarioId: string) => {
    setScenario(newScenarioId);
    runPatternScan(newScenarioId);
  };

  const handleValidate = async () => {
    if (!aiEvent) return;
    setValidating(true);
    try {
      const result = await client.validateCandidate(aiEvent.id);
      setValidationResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setValidating(false);
    }
  };

  const handleEventSelect = (eventId: string) => {
    // Map event ID to scenario ID
    const eventToScenario: Record<string, string> = {
      'evt_therm_01': 'thermal_sensor',
      'evt_comms_01': 'comms_loss',
      'evt_batt_01': 'battery_anomaly',
      'evt_heat_01': 'heater_anomaly',
      'evt_pwr_01': 'power_bus_drop',
      'evt_pay_01': 'payload_failure',
      'evt_solar_01': 'solar_storm',
      'evt_obc_01': 'obc_watchdog',
      'evt_wheel_01': 'capstone_2022'
    };
    
    if (eventToScenario[eventId]) {
      handleSelectScenario(eventToScenario[eventId]);
    }
  };

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="relative min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-[#F0EAD6] text-[#1A1A1A] transition-colors duration-200 overflow-hidden">
      
      {/* Background Watermarks & Grid Patterns */}
      <div className="absolute inset-0 bg-circuit-pattern opacity-20 pointer-events-none"></div>
      <div className="absolute inset-0 bg-halftone opacity-20 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-20">
        
        {/* Section Header */}
        <CaelisHeader theme={theme} />

        {/* View Mode Switcher */}
        <div className="flex flex-wrap items-center gap-3 mb-6 bg-slate-900/10 dark:bg-slate-900/60 p-1.5 rounded-xl border border-slate-300 dark:border-slate-800 backdrop-blur w-fit">
          <button
            onClick={() => setViewMode('caelis')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'caelis'
                ? 'bg-slate-900 dark:bg-cyan-500 text-white dark:text-slate-950 shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Cpu className="h-4 w-4" />
            <span>Autonomous Causal Analysis & Pattern Scan</span>
          </button>

          <button
            onClick={() => setViewMode('esp32_edge')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'esp32_edge'
                ? 'bg-slate-900 dark:bg-cyan-500 text-white dark:text-slate-950 shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Radio className="h-4 w-4 text-emerald-500 animate-pulse" />
            <span>ESP32 Hardware-in-the-Loop & TinyML Live Station</span>
            <span className="relative flex h-2 w-2 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </button>
        </div>

        {viewMode === 'esp32_edge' ? (
          <div className="mb-8">
            <Esp32LiveStation theme={theme} />
          </div>
        ) : (
          <>
            {/* Interactive Scenario Selector & Analysis Trigger */}
            <ScenarioSelector 
              currentScenario={scenario}
              onSelectScenario={handleSelectScenario}
              onRunDemo={() => runPatternScan(scenario)}
              processing={processing || validating}
              customChannels={customChannels}
              simulationTitle={activeSimulation?.scenario_name || activeSimulation?.name}
            />

            {/* Primary 2-Column Working Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Oscillograph Telemetry Window & Black Synthetic Stream */}
              <div className="lg:col-span-8 flex flex-col">
                <TelemetryWindow 
                  scenarioId={scenario} 
                  aiEvent={aiEvent} 
                  syntheticData={activeSyntheticData}
                  onOpenMissionLab={onOpenMissionLab}
                />
              </div>
              
              {/* Right Column: AI Result Assessment & Causal Topology Validation (In-Place Video Animation) */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <CaelisResult 
                  aiEvent={aiEvent} 
                  processing={processing}
                  scanState={scanState}
                  onAnimationComplete={handleAnimationComplete}
                />
                
                <CausalValidation 
                  aiEvent={aiEvent}
                  validationResult={validationResult}
                  validating={validating}
                  onValidate={handleValidate}
                  processing={processing}
                />
              </div>
            </div>

            {/* Combined Flight Recorder & SHAP Attribution Matrix (Compressed Button & 2-Step Inspector) */}
            <div className="mt-6">
              <FlightRecorderShapInspector 
                aiEvent={aiEvent}
                selectedEventId={aiEvent?.id || ''}
                onSelectEvent={handleEventSelect}
                processing={processing || validating}
              />
            </div>
          </>
        )}

      </div>
    </div>
  );
};
