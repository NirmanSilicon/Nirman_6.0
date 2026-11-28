import React from 'react';
import { Play, ChevronDown, Sliders } from 'lucide-react';

interface ScenarioSelectorProps {
  currentScenario: string;
  onSelectScenario: (scenarioId: string) => void;
  onRunDemo: () => void;
  processing: boolean;
}

const SCENARIOS = [
  { id: 'thermal_sensor', label: '1. THERMAL SENSOR FAILURE', tag: 'ORIGIN BIAS', type: 'anomaly' },
  { id: 'nominal_window', label: '2. NOMINAL WINDOW', tag: 'BASELINE', type: 'nominal' },
  { id: 'heater_anomaly', label: '3. HEATER OVER-CYCLE', tag: 'CASCADED', type: 'anomaly' },
  { id: 'battery_anomaly', label: '4. BATTERY BUS DROP', tag: 'SECONDARY', type: 'anomaly' },
  { id: 'power_bus_drop', label: '5. EPS TRIP COLLAPSE', tag: 'COLLAPSE', type: 'anomaly' },
  { id: 'comms_loss', label: '6. COMMS LOSS (FALSE NEG)', tag: 'SYMPTOM', type: 'nominal' },
  { id: 'payload_failure', label: '7. PAYLOAD BUS TRIP', tag: 'EFFECT', type: 'anomaly' },
  { id: 'esp32_live', label: '8. ESP32 TINYML LIVE INGESTION', tag: 'ESP32 / IOT', type: 'esp32' },
];

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({ 
  currentScenario, 
  onSelectScenario,
  onRunDemo,
  processing
}) => {
  return (
    <div className="p-4 sm:p-5 mb-8 bg-[#FAF6EE] border-2 border-[#1A1A1A] shadow-md torn-paper-card">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Scenario Selection Header & Dropdown / Quick Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-grow">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#DC143C]" />
            <span className="text-xs font-mono-tech text-[#1A1A1A] font-bold uppercase tracking-widest whitespace-nowrap">
              TELEMETRY CHANNEL:
            </span>
          </div>
          
          <div className="relative flex-grow max-w-xl">
            <select 
              value={currentScenario}
              onChange={(e) => onSelectScenario(e.target.value)}
              disabled={processing}
              className="w-full appearance-none bg-[#F0EAD6] border-2 border-[#1A1A1A] text-[#1A1A1A] font-mono-tech text-xs py-2.5 pl-4 pr-10 rounded-none focus:outline-none focus:border-[#DC143C] hover:bg-[#FAF6EE] disabled:opacity-50 transition-colors font-bold uppercase cursor-pointer"
            >
              {SCENARIOS.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#FAF6EE] py-1 text-xs">
                  {s.label} [{s.tag}]
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#1A1A1A]">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Quick Scenario Preset Chips */}
        <div className="hidden xl:flex items-center gap-2">
          {SCENARIOS.slice(0, 3).map((s) => {
            const isSelected = currentScenario === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onSelectScenario(s.id)}
                disabled={processing}
                className={`text-[10px] font-mono-tech px-2.5 py-1.5 border-2 transition-all font-bold cursor-pointer ${
                  isSelected
                    ? 'bg-[#DC143C] text-[#FAF6EE] border-[#DC143C] shadow-sm -translate-y-0.5'
                    : 'bg-[#F0EAD6] text-[#1A1A1A] border-[#1A1A1A]/30 hover:border-[#DC143C]'
                }`}
              >
                {s.tag}
              </button>
            );
          })}
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-3">
          <button 
            onClick={onRunDemo}
            disabled={processing}
            className="btn-dossier-crimson px-5 py-2.5 text-xs font-mono-tech flex items-center gap-2 shadow-md w-full sm:w-auto justify-center cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 ${processing ? 'animate-spin' : ''}`} />
            <span>{processing ? 'ANALYZING SIGNAL...' : 'EXECUTE PATTERN SCAN'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};

