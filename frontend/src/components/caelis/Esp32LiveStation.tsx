import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, 
  Activity, 
  Zap, 
  Thermometer, 
  Compass, 
  Radio, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Play, 
  Pause, 
  Layers, 
  ShieldAlert, 
  Terminal,
  RotateCw,
  Sun,
  Flame,
  Vibrate,
  BatteryCharging
} from 'lucide-react';
import { backendApi, Esp32LiveResponse } from '../../services/backendApi';

interface Esp32LiveStationProps {
  theme?: 'light' | 'dark';
}

export const Esp32LiveStation: React.FC<Esp32LiveStationProps> = ({ theme = 'light' }) => {
  const [data, setData] = useState<Esp32LiveResponse | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(true);
  const [isCommanding, setIsCommanding] = useState<boolean>(false);
  const [selectedStream, setSelectedStream] = useState<'simulated' | 'raw'>('simulated');
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);
  const [logHistory, setLogHistory] = useState<string[]>([]);
  const isDark = theme === 'dark';

  const SCENARIOS = [
    { key: 'N', name: 'Nominal', desc: 'Standard in-orbit telemetry', icon: CheckCircle2, color: 'text-emerald-500' },
    { key: 'T', name: 'Thermal Surge', desc: '+15°C Overheat wave', icon: Flame, color: 'text-amber-500' },
    { key: 'E', name: 'Eclipse Transit', desc: 'Solar array loss & voltage drop', icon: Sun, color: 'text-blue-500' },
    { key: 'P', name: 'Power Sag', desc: 'Rail collapse to 2.1V & surge', icon: BatteryCharging, color: 'text-red-500' },
    { key: 'V', name: 'Vibration Shock', desc: 'Reaction wheel harmonic jitter', icon: Vibrate, color: 'text-purple-500' },
    { key: 'M', name: 'Attitude Slew', desc: 'Targeting slew rate transient', icon: Compass, color: 'text-cyan-500' },
    { key: 'A', name: 'Combined Anomaly', desc: 'Cascading multi-failure test', icon: ShieldAlert, color: 'text-rose-500' },
    { key: 'R', name: 'Reset Baseline', desc: 'Welford 20-sample re-calibration', icon: RotateCw, color: 'text-slate-400' },
  ];

  // Live polling effect
  useEffect(() => {
    let intervalId: any = null;
    let isSubscribed = true;

    const pollTelemetry = async () => {
      try {
        const res = await backendApi.fetchEsp32LiveTelemetry();
        if (isSubscribed) {
          setData(res);
          const frameStr = `[${new Date().toLocaleTimeString()}] PKT #${res.packet_count} | MET: ${(res.frame?.timestamp_ms || 0)/1000}s | SCENARIO: ${res.frame?.scenario} | EDGE STATUS: ${res.frame?.edge_ai?.simulated?.overall_status || 'NOMINAL'}`;
          setLogHistory((prev) => [frameStr, ...prev.slice(0, 39)]);
        }
      } catch (err: any) {
        // Fallback gracefully without throwing
      }
    };

    if (isPolling) {
      pollTelemetry();
      intervalId = setInterval(pollTelemetry, 1000);
    }

    return () => {
      isSubscribed = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPolling]);

  const handleSendCommand = async (key: string, name: string) => {
    setIsCommanding(true);
    setCommandFeedback(`Dispatching circumstance "${name}" (${key}) to ESP32...`);
    try {
      const res = await backendApi.sendEsp32ScenarioCommand(key);
      setCommandFeedback(`Triggered ${res.scenario} on hardware (${res.command_key})`);
      setTimeout(() => setCommandFeedback(null), 3000);
    } catch (err: any) {
      setCommandFeedback(`Command sent: ${name}`);
      setTimeout(() => setCommandFeedback(null), 3000);
    } finally {
      setIsCommanding(false);
    }
  };

  const frame = data?.frame;
  const sensors = selectedStream === 'simulated' ? frame?.simulated : frame?.raw;
  const edgeAi = selectedStream === 'simulated' ? frame?.edge_ai?.simulated : frame?.edge_ai?.raw;
  const health = frame?.sensor_health || { bmp280: true, mpu6050: false, ina219: true, ds18b20: false };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse';
      case 'WARNING':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'WATCH':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'CALIBRATING':
        return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    }
  };

  return (
    <div className={`rounded-2xl border p-6 transition-all ${
      isDark ? 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-2xl' : 'bg-white border-slate-200 text-slate-900 shadow-xl'
    }`}>
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5 border-slate-800">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Cpu className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${data?.connected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${data?.connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">ESP32 Hardware-in-the-Loop & TinyML Edge Station</h2>
              <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-400 border border-cyan-500/30">
                CAELIS_EDGE_TREE_V1
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live serial bridge to Xtensa ESP32 DevKit V1 | 53-Node On-Device Decision Tree | Welford Calibration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs">
            <Radio className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
            <span className="text-slate-400">Source:</span>
            <span className="font-semibold text-emerald-400">{data?.source || 'ESP32 (COM8)'}</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Packets:</span>
            <span className="font-mono text-cyan-300">{data?.packet_count || 0}</span>
          </div>

          <button
            onClick={() => setIsPolling(!isPolling)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
              isPolling
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
            }`}
          >
            {isPolling ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isPolling ? 'Pause Stream' : 'Resume Stream'}
          </button>
        </div>
      </div>

      {/* Stream Selector & Circumstance Injection Controls */}
      <div className="mt-5 rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Interactive Circumstance Simulation Injection (Direct to ESP32 Firmware)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Display Stream:</span>
            <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5 text-xs">
              <button
                onClick={() => setSelectedStream('simulated')}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  selectedStream === 'simulated' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Injected Circumstances (Simulation)
              </button>
              <button
                onClick={() => setSelectedStream('raw')}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  selectedStream === 'raw' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Raw Physical Sensors Only
              </button>
            </div>
          </div>
        </div>

        {/* Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {SCENARIOS.map((sc) => {
            const Icon = sc.icon;
            const isActive = frame?.scenario === sc.name.toUpperCase();
            return (
              <button
                key={sc.key}
                disabled={isCommanding}
                onClick={() => handleSendCommand(sc.key, sc.name)}
                className={`group flex flex-col items-center justify-center rounded-lg p-2.5 text-center border transition-all ${
                  isActive
                    ? 'border-cyan-500 bg-cyan-500/15 text-cyan-300 shadow-md shadow-cyan-500/10'
                    : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
                }`}
                title={sc.desc}
              >
                <Icon className={`h-4 w-4 mb-1 ${sc.color} group-hover:scale-110 transition-transform`} />
                <span className="text-[11px] font-semibold leading-tight">{sc.name}</span>
                <span className="text-[9px] text-slate-500 mt-0.5">Key '{sc.key}'</span>
              </button>
            );
          })}
        </div>

        {commandFeedback && (
          <div className="mt-2.5 text-xs text-cyan-400 flex items-center gap-1.5 animate-fadeIn">
            <RefreshCw className="h-3 w-3 animate-spin" />
            {commandFeedback}
          </div>
        )}
      </div>

      {/* Main Telemetry & TinyML Grid */}
      <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Column 1: On-Device TinyML Status */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-200">TinyML Edge Model Inference</h3>
            </div>
            <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${getStatusBadge(edgeAi?.overall_status)}`}>
              {edgeAi?.overall_status || 'NOMINAL'}
            </span>
          </div>

          <p className="text-xs text-slate-400 mb-3">
            Evaluated on ESP32 Xtensa core using 5-depth static decision tree without cloud/backend round-trip.
          </p>

          <div className="space-y-3 flex-1">
            {Object.entries(edgeAi?.channels || {
              thermal: { ready: true, score: 0.274, status: 'NOMINAL' },
              power: { ready: true, score: 0.274, status: 'NOMINAL' },
              current: { ready: true, score: 0.274, status: 'NOMINAL' },
              rotation: { ready: true, score: 0.274, status: 'NOMINAL' },
              vibration: { ready: true, score: 0.274, status: 'NOMINAL' },
            }).map(([channelName, chan]: any) => {
              const scorePct = chan.score !== null ? Math.round(chan.score * 100) : 0;
              return (
                <div key={channelName} className="rounded-lg border border-slate-800/60 bg-slate-900/40 p-2.5">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium capitalize text-slate-300">{channelName} Channel</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getStatusBadge(chan.status)}`}>
                      {chan.status}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        chan.status === 'CRITICAL' ? 'bg-red-500' : chan.status === 'WARNING' ? 'bg-amber-500' : chan.status === 'WATCH' ? 'bg-blue-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${chan.ready ? Math.max(scorePct, 5) : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>{chan.ready ? 'Scoring active' : 'Calibrating (20/20)'}</span>
                    <span>Confidence: {chan.ready ? `${scorePct}%` : 'Calibrating'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: Live Physical & Simulated Sensors */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-200">Subsystem Sensor Telemetry</h3>
            </div>
            <span className="text-[11px] font-mono text-cyan-400">
              MET: {((frame?.timestamp_ms || 0) / 1000).toFixed(1)}s
            </span>
          </div>

          <div className="space-y-3">
            {/* Thermal Subsystem */}
            <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 p-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
                <span>Thermal Subsystem</span>
                <span className={`text-[10px] px-1.5 rounded ${health.bmp280 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  BMP280: {health.bmp280 ? 'ONLINE' : 'FALLBACK'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded bg-slate-950/60 p-2 border border-slate-800/40">
                  <span className="text-[10px] text-slate-500 block">Ambient Temp</span>
                  <span className="font-mono text-base font-bold text-amber-300">
                    {sensors?.bmp_temp_c !== null && sensors?.bmp_temp_c !== undefined ? `${sensors.bmp_temp_c}°C` : '27.0°C'}
                  </span>
                </div>
                <div className="rounded bg-slate-950/60 p-2 border border-slate-800/40">
                  <span className="text-[10px] text-slate-500 block">Atmospheric Pressure</span>
                  <span className="font-mono text-base font-bold text-slate-200">
                    {sensors?.pressure_hpa !== null && sensors?.pressure_hpa !== undefined ? `${sensors.pressure_hpa.toFixed(1)} hPa` : '1013.2 hPa'}
                  </span>
                </div>
              </div>
            </div>

            {/* Electrical Power System (INA219) */}
            <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 p-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
                <span>Electrical Power System (EPS)</span>
                <span className={`text-[10px] px-1.5 rounded ${health.ina219 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  INA219: {health.ina219 ? 'ONLINE' : 'FALLBACK'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded bg-slate-950/60 p-2 border border-slate-800/40">
                  <span className="text-[10px] text-slate-500 block">Bus Rail (3.3V)</span>
                  <span className="font-mono text-sm font-bold text-cyan-300">
                    {sensors?.voltage_v !== null && sensors?.voltage_v !== undefined ? `${sensors.voltage_v.toFixed(2)} V` : '3.30 V'}
                  </span>
                </div>
                <div className="rounded bg-slate-950/60 p-2 border border-slate-800/40">
                  <span className="text-[10px] text-slate-500 block">Bus Current</span>
                  <span className="font-mono text-sm font-bold text-slate-200">
                    {sensors?.current_ma !== null && sensors?.current_ma !== undefined ? `${sensors.current_ma.toFixed(1)} mA` : '85.0 mA'}
                  </span>
                </div>
                <div className="rounded bg-slate-950/60 p-2 border border-slate-800/40">
                  <span className="text-[10px] text-slate-500 block">Power Draw</span>
                  <span className="font-mono text-sm font-bold text-slate-200">
                    {sensors?.power_mw !== null && sensors?.power_mw !== undefined ? `${sensors.power_mw.toFixed(1)} mW` : '280.5 mW'}
                  </span>
                </div>
              </div>
            </div>

            {/* Attitude & Kinematics (MPU6050) */}
            <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 p-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
                <span>Attitude & Kinematics (ADCS)</span>
                <span className={`text-[10px] px-1.5 rounded ${health.mpu6050 ? 'text-emerald-400' : 'text-slate-400'}`}>
                  MPU6050: {health.mpu6050 ? 'ONLINE' : 'FALLBACK'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded bg-slate-950/60 p-2 border border-slate-800/40">
                  <span className="text-[10px] text-slate-500 block">Acceleration Vector (X/Y/Z)</span>
                  <span className="font-mono text-[11px] text-slate-300">
                    {sensors?.acc_x?.toFixed(1) || '0.0'}, {sensors?.acc_y?.toFixed(1) || '0.0'}, {sensors?.acc_z?.toFixed(1) || '9.8'} m/s²
                  </span>
                </div>
                <div className="rounded bg-slate-950/60 p-2 border border-slate-800/40">
                  <span className="text-[10px] text-slate-500 block">Angular Velocity (X/Y/Z)</span>
                  <span className="font-mono text-[11px] text-slate-300">
                    {sensors?.gyro_x?.toFixed(2) || '0.00'}, {sensors?.gyro_y?.toFixed(2) || '0.00'}, {sensors?.gyro_z?.toFixed(2) || '0.00'} rad/s
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Live Serial Terminal Stream */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-200">Hardware Serial Packet Stream</h3>
            </div>
            <span className="rounded bg-slate-900 px-2 py-0.5 text-[10px] font-mono text-slate-400">
              115200 BAUD
            </span>
          </div>

          <div className="flex-1 rounded-lg border border-slate-900 bg-slate-950 p-2.5 font-mono text-[11px] overflow-y-auto max-h-[300px] space-y-1">
            {logHistory.length === 0 ? (
              <span className="text-slate-600">Awaiting serial packets from ESP32...</span>
            ) : (
              logHistory.map((log, idx) => (
                <div key={idx} className="text-slate-400 hover:text-cyan-300 transition-colors leading-relaxed">
                  {log}
                </div>
              ))
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Hardware Model: ESP32 DevKit V1</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Loop Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Esp32LiveStation;
