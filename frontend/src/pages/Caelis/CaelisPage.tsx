import React, { useState, useEffect, useRef } from 'react';
import { AiEvent, CausalValidationResult, SyntheticMissionData } from '../../types/caelis';
import { MockCaelisClient } from '../../services/caelis/caelisClient';
import { CaelisHeader } from '../../components/caelis/CaelisHeader';
import { TelemetryWindow } from '../../components/caelis/TelemetryWindow';
import { CaelisResult } from '../../components/caelis/CaelisResult';
import { FlightRecorderShapInspector } from '../../components/caelis/FlightRecorderShapInspector';
import { CausalValidation } from '../../components/caelis/CausalValidation';
import { ScenarioSelector } from '../../components/caelis/ScenarioSelector';
import { ArrowLeft, ChevronRight, CornerDownRight, Target, ShieldAlert, Cpu, Beaker, Wifi, RefreshCw } from 'lucide-react';
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
  const { activeSimulation, runAnalysis } = useAnalysis();

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
  const [esp32Polling, setEsp32Polling] = useState<boolean>(false);
  const [esp32Packet, setEsp32Packet] = useState<any>(null);
  const [esp32Testing, setEsp32Testing] = useState<boolean>(false);

  // Send test telemetry payload to backend ESP32 ingestion endpoint
  const handleTestEsp32 = async (isAnomaly: boolean = true) => {
    setEsp32Testing(true);
    try {
      const val = isAnomaly ? 48.7 + Math.random() * 5.0 : 22.4 + (Math.random() - 0.5) * 1.2;
      const res = await fetch('/api/telemetry/esp32/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: 'ESP32-S3-TINYML',
          component: 'thermal_sensor',
          value: Number(val.toFixed(2)),
          tinyml_prediction: isAnomaly ? 1 : 0,
          tinyml_confidence: isAnomaly ? 0.94 : 0.91,
          timestamp: new Date().toISOString()
        })
      });
      if (res.ok) {
        const data = await res.json();
        setEsp32Packet(data);
        if (data.packet) {
          const transformedEvent: AiEvent = {
            id: data.packet.id || `evt-esp32-${Date.now().toString(16)}`,
            component: data.packet.component || 'thermal_sensor',
            timestamp: 'T+04:55',
            event_type: 'threshold',
            value: data.packet.latest_value || val,
            source: 'ai_pattern_match',
            confidence: data.packet.confidence || (isAnomaly ? 0.94 : 0.12),
            is_anomaly: data.packet.is_anomaly,
            anomaly_classification: (data.packet.anomaly_classification as any) || (isAnomaly ? 'statistical_only' : 'nominal'),
            feature_vector: data.packet.features || {
              feat_mean: val,
              feat_std: isAnomaly ? 3.4 : 0.45,
              feat_min: val - 2,
              feat_max: val + 2,
              feat_range: 4,
              feat_rate_of_change: isAnomaly ? 1.85 : 0.08,
              feat_skewness: 0.18
            },
            ood_rationale: `ESP32 TinyML edge node streamed reading (${val.toFixed(1)}°C). Server AI ensemble consensus: ${data.packet.is_anomaly ? 'CONFIRMED ANOMALY' : 'NOMINAL BASELINE'}.`
          };
          setAiEvent(transformedEvent);
          setScanState('complete');
        }
      }
    } catch (err) {
      console.warn('ESP32 local endpoint ping failed:', err);
    } finally {
      setEsp32Testing(false);
    }
  };

  // Poll for latest ESP32 packets if polling is active
  useEffect(() => {
    if (!esp32Polling) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/telemetry/esp32/');
        if (res.ok) {
          const data = await res.json();
          if (data.latest_packet) {
            setEsp32Packet(data.latest_packet);
          }
        }
      } catch (err) {
        // silent
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [esp32Polling]);

  // References to handle video timing synchronization with backend API
  const pendingEventRef = useRef<AiEvent | null>(null);
  const videoDoneRef = useRef<boolean>(false);
  const apiDoneRef = useRef<boolean>(false);

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

    try {
      const result = await client.analyzeWindow({ 
        scenarioId, 
        windowStart: 'T+04:55', 
        windowEnd: 'T+05:05' 
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
      'evt_pay_01': 'payload_failure'
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
        
        {/* Navigation Bar back to Home */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-mono-tech font-bold text-[#1A1A1A] hover:text-[#DC143C] transition-colors cursor-pointer py-1 px-2.5 border border-[#1A1A1A]/30 bg-[#FAF6EE] shadow-sm hover:border-[#DC143C]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← RETURN TO FLIGHT OVERVIEW</span>
          </button>
          
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span className="text-[11px] font-mono-tech font-bold uppercase text-[#1A1A1A]/80">
              TELEMETRY ANALYSIS MODE ACTIVE
            </span>
          </div>
        </div>

        {/* Section Header */}
        <CaelisHeader theme={theme} />

        {/* ESP32 & TinyML Microcontroller Live Edge Gateway */}
        <div className="mb-6 p-4 bg-[#FAF6EE] border-2 border-[#1A1A1A] shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block animate-ping absolute"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block relative"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono-tech font-bold uppercase tracking-wider text-[#1A1A1A]">
                  ESP32 TINYML EDGE GATEWAY:
                </span>
                <span className="text-[10px] font-mono-tech px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold border border-emerald-500/40">
                  ONLINE (PORT 8000)
                </span>
              </div>
              <p className="text-[11px] font-mono-tech text-[#1A1A1A]/70 mt-0.5">
                Listening for microcontroller POST telemetry at <code className="bg-[#1A1A1A]/10 px-1 py-0.5 rounded text-[10px] font-bold">/api/telemetry/esp32/</code>
                {esp32Packet?.packet?.device_id && (
                  <span className="ml-2 font-bold text-emerald-800">
                    · Last node: {esp32Packet.packet.device_id} ({esp32Packet.packet.latest_value})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleTestEsp32(true)}
              disabled={esp32Testing}
              className="px-3 py-1.5 text-xs font-mono-tech font-bold bg-[#DC143C] text-[#FAF6EE] hover:bg-[#B01030] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
              title="Simulate ESP32 sending an anomalous telemetry burst"
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>TEST ESP32 ANOMALY</span>
            </button>
            <button
              onClick={() => handleTestEsp32(false)}
              disabled={esp32Testing}
              className="px-3 py-1.5 text-xs font-mono-tech font-bold bg-[#FAF6EE] border-2 border-[#1A1A1A] hover:bg-[#F0EAD6] text-[#1A1A1A] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Simulate ESP32 streaming nominal baseline data"
            >
              <span>TEST ESP32 NOMINAL</span>
            </button>
            <button
              onClick={() => setEsp32Polling(!esp32Polling)}
              className={`px-3 py-1.5 text-xs font-mono-tech font-bold border-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                esp32Polling
                  ? 'bg-emerald-700 text-white border-emerald-800'
                  : 'bg-[#F0EAD6] text-[#1A1A1A] border-[#1A1A1A]/40 hover:border-[#1A1A1A]'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${esp32Polling ? 'animate-spin' : ''}`} />
              <span>{esp32Polling ? 'STREAM POLLING ON' : 'AUTO-POLL STREAM'}</span>
            </button>
          </div>
        </div>
        
        {/* Interactive Scenario Selector & Analysis Trigger */}
        <ScenarioSelector 
          currentScenario={scenario}
          onSelectScenario={handleSelectScenario}
          onRunDemo={() => runPatternScan(scenario)}
          processing={processing || validating}
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

      </div>
    </div>
  );
};
