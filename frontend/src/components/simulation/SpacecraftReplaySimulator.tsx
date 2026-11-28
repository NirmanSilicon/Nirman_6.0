/**
 * frontend/src/components/simulation/SpacecraftReplaySimulator.tsx
 *
 * Spacecraft Mission Operations Replay Simulator.
 * Provides a high-fidelity, chronological replay of the spacecraft anomaly cascade,
 * supporting dual-mode replay (Observed Telemetry vs. Structural Counterfactual Intervention).
 *
 * Features:
 * - Scrubbable timeline with MET (T+mm:ss) and UTC timestamps
 * - Play / Pause, step-forward, step-backward, speed selection (0.5x, 1x, 2x, 5x)
 * - "Jump to Root Cause" quick navigation
 * - Subsystem State Matrix (Thermal, Power/EPS, Battery, OBC/FDIR, Comms RF, ADCS, Payload)
 * - Causal edge illumination upon propagation
 * - Observable vs Inferred vs Counterfactual visual distinction
 * - Dual-mode comparison: Observed Cascade vs Counterfactual Mitigated
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Target,
  Zap,
  Thermometer,
  Radio,
  Cpu,
  Compass,
  Eye,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Layers,
  ArrowRight,
  GitFork,
  HelpCircle,
  Clock
} from 'lucide-react';
import { useAnalysis } from '../../context/AnalysisContext';
import { MissionCausalNode, MissionCausalEdge } from '../../types/missionArchitecture';

interface SubsystemInfo {
  id: string;
  name: string;
  icon: React.ReactNode;
  components: string[];
}

const SUBSYSTEM_DEFS: SubsystemInfo[] = [
  {
    id: 'thermal',
    name: 'Thermal Control (TCS)',
    icon: <Thermometer className="w-4 h-4 text-amber-400" />,
    components: ['thermal_sensor', 'heater_controller', 'radiator_panel', 'node-thm-001', 'node-htr-002']
  },
  {
    id: 'eps',
    name: 'Electrical Power (EPS)',
    icon: <Zap className="w-4 h-4 text-cyan-400" />,
    components: ['battery_cell_2', 'power_bus_5v', 'shunt_regulator', 'node-bat-003', 'node-bus-005']
  },
  {
    id: 'fdir',
    name: 'Protection & FDIR',
    icon: <ShieldAlert className="w-4 h-4 text-purple-400" />,
    components: ['breaker_ss1', 'crowbar_circuit', 'fdir_manager', 'node-prt-004']
  },
  {
    id: 'comms',
    name: 'RF Communications',
    icon: <Radio className="w-4 h-4 text-rose-400" />,
    components: ['sband_transponder', 'rf_amp', 'antenna_deployer', 'node-com-006']
  },
  {
    id: 'obc',
    name: 'On-Board Computer (OBC)',
    icon: <Cpu className="w-4 h-4 text-blue-400" />,
    components: ['obc_core', 'watchdog_timer', 'flight_software']
  },
  {
    id: 'adcs',
    name: 'Attitude Determination (ADCS)',
    icon: <Compass className="w-4 h-4 text-emerald-400" />,
    components: ['reaction_wheel_z', 'sun_sensor', 'magnetorquer']
  },
  {
    id: 'payload',
    name: 'Mission Payload',
    icon: <Eye className="w-4 h-4 text-indigo-400" />,
    components: ['hyperspectral_imager', 'payload_sensor', 'payload_data_recorder']
  }
];

export const SpacecraftReplaySimulator: React.FC = () => {
  const { analysis, counterfactualResult, isCounterfactualLoading, runCounterfactual, nextBestEvidence } = useAnalysis();

  // Mode: 'OBSERVED' vs 'COUNTERFACTUAL'
  const [replayMode, setReplayMode] = useState<'OBSERVED' | 'COUNTERFACTUAL'>('OBSERVED');

  // Animation & Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Timeline bounds and playhead (in seconds relative to start T0)
  const timelineNodes = useMemo(() => {
    if (!analysis?.causal_graph?.nodes) return [];
    // Sort nodes chronologically
    return [...analysis.causal_graph.nodes].sort((a, b) => {
      const timeA = a.timestamp_epoch || (a.timestamp ? new Date(a.timestamp).getTime() : 0);
      const timeB = b.timestamp_epoch || (b.timestamp ? new Date(b.timestamp).getTime() : 0);
      return timeA - timeB;
    });
  }, [analysis]);

  // Derive start and end timestamps
  const { startEpoch, endEpoch, totalDurationSec, rootCauseNode } = useMemo(() => {
    if (timelineNodes.length === 0) {
      const now = Date.now();
      return { startEpoch: now, endEpoch: now + 180000, totalDurationSec: 180, rootCauseNode: null };
    }

    const firstTime = timelineNodes[0].timestamp_epoch || (timelineNodes[0].timestamp ? new Date(timelineNodes[0].timestamp).getTime() : Date.now());
    const lastTime = timelineNodes[timelineNodes.length - 1].timestamp_epoch || (timelineNodes[timelineNodes.length - 1].timestamp ? new Date(timelineNodes[timelineNodes.length - 1].timestamp).getTime() : firstTime + 180000);
    
    // Duration in seconds (minimum 60s for smooth scrub)
    const rawDuration = Math.max((lastTime - firstTime) / 1000, 60);
    const paddedDuration = rawDuration + 15; // extra 15s padding at end

    const root = timelineNodes.find(n => n.role === 'primary') || timelineNodes[0];

    return {
      startEpoch: firstTime,
      endEpoch: firstTime + paddedDuration * 1000,
      totalDurationSec: paddedDuration,
      rootCauseNode: root
    };
  }, [timelineNodes]);

  // Current playhead in seconds from start
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);

  // Animation frame loop
  const lastFrameRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isPlaying) {
      lastFrameRef.current = null;
      return;
    }

    let animId: number;

    const tick = (timestamp: number) => {
      if (lastFrameRef.current !== null) {
        const deltaSec = (timestamp - lastFrameRef.current) / 1000;
        setCurrentTimeSec((prev) => {
          const next = prev + deltaSec * playbackSpeed;
          if (next >= totalDurationSec) {
            setIsPlaying(false);
            return totalDurationSec;
          }
          return next;
        });
      }
      lastFrameRef.current = timestamp;
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, playbackSpeed, totalDurationSec]);

  // Current UTC time
  const currentUtcIso = useMemo(() => {
    const currentEpoch = startEpoch + currentTimeSec * 1000;
    return new Date(currentEpoch).toISOString();
  }, [startEpoch, currentTimeSec]);

  // Current MET string (T+mm:ss.s)
  const currentMetString = useMemo(() => {
    const mins = Math.floor(currentTimeSec / 60);
    const secs = (currentTimeSec % 60).toFixed(1);
    const padMins = mins.toString().padStart(2, '0');
    const padSecs = parseFloat(secs) < 10 ? `0${secs}` : secs;
    return `T+${padMins}:${padSecs}`;
  }, [currentTimeSec]);

  // Jump to root cause
  const jumpToRootCause = useCallback(() => {
    if (!rootCauseNode) return;
    const rootEpoch = rootCauseNode.timestamp_epoch || (rootCauseNode.timestamp ? new Date(rootCauseNode.timestamp).getTime() : startEpoch);
    const offsetSec = Math.max(0, (rootEpoch - startEpoch) / 1000);
    setCurrentTimeSec(offsetSec);
    setSelectedNodeId(rootCauseNode.event_id);
  }, [rootCauseNode, startEpoch]);

  // Rewind
  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentTimeSec(0);
  }, []);

  // Step +/-
  const handleStep = useCallback((delta: number) => {
    setIsPlaying(false);
    setCurrentTimeSec(prev => Math.min(Math.max(0, prev + delta), totalDurationSec));
  }, [totalDurationSec]);

  // Determine active nodes up to currentTimeSec
  const activeNodeIds = useMemo(() => {
    const active = new Set<string>();
    timelineNodes.forEach((node) => {
      const nodeEpoch = node.timestamp_epoch || (node.timestamp ? new Date(node.timestamp).getTime() : startEpoch);
      const nodeOffsetSec = (nodeEpoch - startEpoch) / 1000;
      if (currentTimeSec >= nodeOffsetSec) {
        active.add(node.event_id);
      }
    });
    return active;
  }, [timelineNodes, currentTimeSec, startEpoch]);

  // Nodes prevented by counterfactual intervention
  const preventedNodeIds = useMemo(() => {
    if (replayMode !== 'COUNTERFACTUAL' || !counterfactualResult) return new Set<string>();
    return new Set(counterfactualResult.prevented_nodes || []);
  }, [replayMode, counterfactualResult]);

  // Determine active causal edges
  const activeEdgeIds = useMemo(() => {
    if (!analysis?.causal_graph?.edges) return new Set<string>();
    const activeEdges = new Set<string>();
    
    analysis.causal_graph.edges.forEach((edge) => {
      const sourceActive = activeNodeIds.has(edge.source_event_id);
      const targetActive = activeNodeIds.has(edge.target_event_id);
      
      // If counterfactual prevented either source or target, edge does not propagate
      if (replayMode === 'COUNTERFACTUAL') {
        if (preventedNodeIds.has(edge.source_event_id) || preventedNodeIds.has(edge.target_event_id)) {
          return;
        }
      }

      if (sourceActive && targetActive) {
        activeEdges.add(edge.id);
      }
    });

    return activeEdges;
  }, [analysis, activeNodeIds, replayMode, preventedNodeIds]);

  // Compute status for each Subsystem at current playhead
  const subsystemStates = useMemo(() => {
    return SUBSYSTEM_DEFS.map((subsys) => {
      // Find any active nodes belonging to this subsystem
      const activeInSubsys = timelineNodes.filter((node) => {
        if (!activeNodeIds.has(node.event_id)) return false;
        const comp = node.component.toLowerCase();
        return (
          subsys.components.some(c => comp.includes(c.toLowerCase())) ||
          (node.subsystem && node.subsystem.toLowerCase().includes(subsys.id.toLowerCase()))
        );
      });

      if (activeInSubsys.length === 0) {
        return {
          ...subsys,
          status: 'NOMINAL' as const,
          label: 'NOMINAL',
          color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30',
          activeNode: null
        };
      }

      // Check if prevented in counterfactual
      const areAllPrevented = activeInSubsys.every(n => preventedNodeIds.has(n.event_id));
      if (replayMode === 'COUNTERFACTUAL' && areAllPrevented) {
        return {
          ...subsys,
          status: 'PREVENTED' as const,
          label: 'CASCADE PREVENTED',
          color: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/40',
          activeNode: activeInSubsys[activeInSubsys.length - 1]
        };
      }

      // Latest active node
      const latest = activeInSubsys[activeInSubsys.length - 1];

      if (latest.role === 'primary') {
        return {
          ...subsys,
          status: 'ROOT_ANOMALY' as const,
          label: 'ROOT ANOMALY DETECTED',
          color: 'text-rose-400 bg-rose-950/60 border-rose-500/60 animate-pulse',
          activeNode: latest
        };
      } else if (latest.event_type === 'critical_drop' || latest.event_type === 'carrier_loss') {
        return {
          ...subsys,
          status: 'COLLAPSE' as const,
          label: 'CASCADE COLLAPSE',
          color: 'text-red-400 bg-red-950/50 border-red-500/50',
          activeNode: latest
        };
      } else if (latest.event_type === 'state_change') {
        return {
          ...subsys,
          status: 'TRIPPED' as const,
          label: 'PROTECTION TRIPPED',
          color: 'text-amber-400 bg-amber-950/40 border-amber-500/40',
          activeNode: latest
        };
      } else {
        return {
          ...subsys,
          status: 'PROPAGATION' as const,
          label: 'FAULT PROPAGATING',
          color: 'text-amber-300 bg-amber-950/30 border-amber-500/30',
          activeNode: latest
        };
      }
    });
  }, [timelineNodes, activeNodeIds, preventedNodeIds, replayMode]);

  // Selected node details
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return timelineNodes.find(n => n.event_id === selectedNodeId) || null;
  }, [selectedNodeId, timelineNodes]);

  return (
    <div className="w-full bg-[#080C14] border border-slate-800/80 rounded-xl overflow-hidden shadow-2xl flex flex-col font-sans">
      {/* Top Header Bar */}
      <div className="bg-[#0D131F] px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <h3 className="text-base font-semibold text-slate-100 uppercase tracking-wider font-mono">
            Spacecraft Mission Operations Replay
          </h3>
          <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
            {analysis?.mission_id || 'MISSION-ORBIT-LEO'}
          </span>
        </div>

        {/* Dual Mode Switch */}
        <div className="flex items-center bg-[#070A0F] p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setReplayMode('OBSERVED')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-colors flex items-center space-x-1.5 ${
              replayMode === 'OBSERVED'
                ? 'bg-rose-950/60 text-rose-300 border border-rose-600/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Observed Telemetry</span>
          </button>
          <button
            onClick={() => {
              setReplayMode('COUNTERFACTUAL');
              if (!counterfactualResult && !isCounterfactualLoading) {
                // Auto trigger default counterfactual simulation
                runCounterfactual({
                  target_component: 'breaker_ss1',
                  intervention_type: 'TRIP_EARLY',
                  target_time_offset: 15
                });
              }
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-colors flex items-center space-x-1.5 ${
              replayMode === 'COUNTERFACTUAL'
                ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>Counterfactual Intervention</span>
          </button>
        </div>
      </div>

      {/* Main Simulation Viewport */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#080C14]">
        {/* Left Column: Subsystem Matrix & Visual State (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-5">
          {/* Replay HUD / Time Bar */}
          <div className="bg-[#0D131F] border border-slate-800/80 rounded-lg p-4 flex items-center justify-between font-mono">
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Mission Elapsed Time</div>
              <div className="text-2xl font-bold text-cyan-400">{currentMetString}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 uppercase tracking-wider">Telemetry UTC Stamp</div>
              <div className="text-sm font-semibold text-slate-300">{currentUtcIso}</div>
            </div>
            <div className="hidden sm:block text-right">
              <div className="text-xs text-slate-500 uppercase tracking-wider">Active Anomalies</div>
              <div className="text-lg font-bold text-amber-400">
                {activeNodeIds.size} <span className="text-xs text-slate-500 font-normal">/ {timelineNodes.length}</span>
              </div>
            </div>
          </div>

          {/* Subsystem State Matrix */}
          <div className="bg-[#0D131F] border border-slate-800/80 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Spacecraft Subsystem Telemetry Bus Matrix</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Mode: {replayMode === 'OBSERVED' ? 'HISTORICAL CASCADE' : 'INTERVENTION BRANCH'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {subsystemStates.map((subsys) => (
                <div
                  key={subsys.id}
                  onClick={() => subsys.activeNode && setSelectedNodeId(subsys.activeNode.event_id)}
                  className={`border rounded-lg p-2.5 flex items-center justify-between cursor-pointer transition-all duration-200 ${subsys.color}`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="p-1.5 rounded bg-slate-900/60 border border-slate-800 flex-shrink-0">
                      {subsys.icon}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-slate-200 truncate">{subsys.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {subsys.activeNode ? subsys.activeNode.component : 'NOMINAL TELEMETRY'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-tight block">
                      {subsys.label}
                    </span>
                    {subsys.activeNode && subsys.activeNode.value !== undefined && subsys.activeNode.value !== null && (
                      <span className="text-[10px] font-mono text-slate-400">
                        val: {subsys.activeNode.value}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Causal Propagation Sequence Flow */}
          <div className="bg-[#0D131F] border border-slate-800/80 rounded-lg p-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                <Activity className="w-3.5 h-3.5 text-slate-400" />
                <span>Causal Propagation Pathway</span>
              </span>
              <div className="flex items-center space-x-3 text-[10px] font-mono text-slate-500">
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                  <span>Root Trigger</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  <span>Propagated</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                  <span>Prevented</span>
                </span>
              </div>
            </div>

            {/* Horizontal Flow of Causal Nodes */}
            <div className="flex items-center space-x-2 overflow-x-auto py-3 px-1 flex-1">
              {timelineNodes.map((node, index) => {
                const isActive = activeNodeIds.has(node.event_id);
                const isPrevented = preventedNodeIds.has(node.event_id);
                const isSelected = selectedNodeId === node.event_id;
                const isRoot = node.role === 'primary';

                let nodeStyle = 'bg-slate-900/60 border-slate-800 text-slate-500 opacity-40';
                if (isActive) {
                  if (replayMode === 'COUNTERFACTUAL' && isPrevented) {
                    nodeStyle = 'bg-cyan-950/80 border-cyan-500 text-cyan-300 opacity-90 shadow-cyan-900/20 shadow-lg';
                  } else if (isRoot) {
                    nodeStyle = 'bg-rose-950 border-rose-500 text-rose-200 opacity-100 shadow-rose-950/50 shadow-lg animate-pulse';
                  } else {
                    nodeStyle = 'bg-amber-950/80 border-amber-500 text-amber-200 opacity-100 shadow-amber-950/30 shadow-lg';
                  }
                }

                if (isSelected) {
                  nodeStyle += ' ring-2 ring-cyan-400';
                }

                return (
                  <React.Fragment key={node.event_id}>
                    <button
                      onClick={() => setSelectedNodeId(node.event_id)}
                      className={`flex-shrink-0 p-3 rounded-lg border text-left transition-all duration-200 w-44 font-mono ${nodeStyle}`}
                    >
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="font-bold uppercase tracking-wider truncate">
                          {isRoot ? 'ROOT TRIGGER' : isPrevented && replayMode === 'COUNTERFACTUAL' ? 'PREVENTED' : `T+${index + 1}`}
                        </span>
                        <span>{node.confidence ? `${(node.confidence * 100).toFixed(0)}%` : ''}</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-100 truncate mb-1">
                        {node.component}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {node.event_type || 'anomaly'}
                      </div>
                    </button>
                    {index < timelineNodes.length - 1 && (
                      <ArrowRight
                        className={`w-4 h-4 flex-shrink-0 transition-colors ${
                          activeEdgeIds.has(analysis?.causal_graph?.edges?.[index]?.id || '')
                            ? 'text-amber-400 animate-pulse'
                            : 'text-slate-800'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Active Node Inspector & Next Best Evidence (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-5">
          {/* Selected Event Inspector */}
          <div className="bg-[#0D131F] border border-slate-800/80 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2 font-mono">
              <span className="text-xs uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                <Target className="w-3.5 h-3.5 text-cyan-400" />
                <span>Telemetry Node Telemetry Audit</span>
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {selectedNode ? selectedNode.event_id : 'SELECT NODE'}
              </span>
            </div>

            {selectedNode ? (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center bg-[#070A0F] p-2.5 rounded border border-slate-800">
                  <span className="text-slate-400">Target Component:</span>
                  <span className="text-slate-100 font-bold">{selectedNode.component}</span>
                </div>
                <div className="flex justify-between items-center bg-[#070A0F] p-2.5 rounded border border-slate-800">
                  <span className="text-slate-400">Causal Role:</span>
                  <span
                    className={`font-bold uppercase ${
                      selectedNode.role === 'primary' ? 'text-rose-400' : 'text-amber-400'
                    }`}
                  >
                    {selectedNode.role}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-[#070A0F] p-2.5 rounded border border-slate-800">
                  <span className="text-slate-400">Event Signature:</span>
                  <span className="text-slate-200">{selectedNode.event_type || 'State Transition'}</span>
                </div>
                <div className="flex justify-between items-center bg-[#070A0F] p-2.5 rounded border border-slate-800">
                  <span className="text-slate-400">Causal Confidence:</span>
                  <span className="text-emerald-400 font-bold">
                    {((selectedNode.confidence || 0.95) * 100).toFixed(1)}% ({selectedNode.confidence_tier || 'HIGH'})
                  </span>
                </div>
                <div className="flex justify-between items-center bg-[#070A0F] p-2.5 rounded border border-slate-800">
                  <span className="text-slate-400">Timestamp:</span>
                  <span className="text-slate-300">{selectedNode.timestamp || currentUtcIso}</span>
                </div>
                {selectedNode.value !== undefined && selectedNode.value !== null && (
                  <div className="flex justify-between items-center bg-[#070A0F] p-2.5 rounded border border-slate-800">
                    <span className="text-slate-400">Sensor Telemetry Value:</span>
                    <span className="text-cyan-400 font-bold">{selectedNode.value}</span>
                  </div>
                )}
                {selectedNode.is_out_of_distribution && (
                  <div className="p-2 rounded bg-amber-950/40 border border-amber-500/50 text-amber-300 text-[11px]">
                    Note: Anomaly pattern flagged as Out-of-Distribution relative to training catalog.
                  </div>
                )}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-500 font-mono text-xs">
                Click any node or scrub the playhead to inspect flight telemetry parameters.
              </div>
            )}
          </div>

          {/* Next Best Evidence (NBE) Action Card */}
          {nextBestEvidence && (
            <div className="bg-[#0D131F] border border-cyan-500/30 rounded-lg p-5">
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>Next Best Evidence Recommendation</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  IG: {(nextBestEvidence.information_gain_shannons ?? nextBestEvidence.expected_information_gain ?? 0).toFixed(2)} bits
                </span>
              </div>

              <div className="space-y-2.5 font-mono text-xs">
                <div className="bg-[#070A0F] p-2.5 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Recommended Command / Telemetry Request:</div>
                  <div className="text-cyan-300 font-semibold mt-0.5">
                    {nextBestEvidence.observation_command || nextBestEvidence.recommended_observation}
                  </div>
                </div>

                <div className="bg-[#070A0F] p-2.5 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Diagnostic Rationale:</div>
                  <div className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                    {nextBestEvidence.rationale}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Target Signal: <strong className="text-slate-200">{nextBestEvidence.target_signal}</strong></span>
                  <span>Telemetry Cost: <strong className="text-slate-200">{nextBestEvidence.telemetry_cost}</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* Counterfactual Summary Card (When Counterfactual Mode Active) */}
          {replayMode === 'COUNTERFACTUAL' && counterfactualResult && (
            <div className="bg-[#0D131F] border border-emerald-500/40 rounded-lg p-5">
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2 font-mono">
                <span className="text-xs uppercase tracking-wider text-emerald-400 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Counterfactual Outcome</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                  {counterfactualResult.cascade_prevented ? 'CASCADE MITIGATED' : 'PARTIAL MITIGATION'}
                </span>
              </div>

              <div className="space-y-2 font-mono text-xs">
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {counterfactualResult.mitigation_summary ||
                    'Intervention prevented thermal runaway propagation and isolated the power bus prior to carrier loss.'}
                </p>
                <div className="flex justify-between items-center text-[11px] pt-2 border-t border-slate-800/80">
                  <span className="text-slate-400">Prevented Components:</span>
                  <span className="text-cyan-300 font-semibold">
                    {counterfactualResult.prevented_nodes?.length || 3} subsystems saved
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Transport Controls & Timeline Scrubber */}
      <div className="bg-[#0A0E18] px-6 py-4 border-t border-slate-800 flex flex-col space-y-3">
        {/* Timeline Scrub Slider with Event Markers */}
        <div className="relative flex items-center">
          <input
            type="range"
            min={0}
            max={totalDurationSec}
            step={0.5}
            value={currentTimeSec}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentTimeSec(parseFloat(e.target.value));
            }}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
          />

          {/* Event Markers along Timeline */}
          {timelineNodes.map((node) => {
            const nodeEpoch = node.timestamp_epoch || (node.timestamp ? new Date(node.timestamp).getTime() : startEpoch);
            const offsetSec = (nodeEpoch - startEpoch) / 1000;
            const percent = Math.min(100, Math.max(0, (offsetSec / totalDurationSec) * 100));
            const isRoot = node.role === 'primary';

            return (
              <div
                key={`marker-${node.event_id}`}
                onClick={() => {
                  setCurrentTimeSec(offsetSec);
                  setSelectedNodeId(node.event_id);
                }}
                title={`${node.component} (${node.event_type}) at T+${offsetSec.toFixed(0)}s`}
                style={{ left: `${percent}%` }}
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer transition-transform hover:scale-125 ${
                  isRoot
                    ? 'w-3.5 h-3.5 bg-rose-500 rotate-45 border border-white shadow-rose-500/50 shadow'
                    : 'w-2.5 h-2.5 rounded-full bg-amber-400 border border-slate-900'
                }`}
              />
            );
          })}
        </div>

        {/* Transport Buttons Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
          {/* Playback Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleReset}
              className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Reset to T+00:00"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleStep(-5)}
              className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Step -5s"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors flex items-center space-x-2"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'PAUSE' : 'REPLAY'}</span>
            </button>
            <button
              onClick={() => handleStep(5)}
              className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Step +5s"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Jump to Root Cause */}
          <button
            onClick={jumpToRootCause}
            className="px-3 py-1.5 rounded bg-rose-950/70 border border-rose-600/50 hover:bg-rose-900/80 text-rose-300 font-semibold transition-colors flex items-center space-x-2"
          >
            <Target className="w-3.5 h-3.5" />
            <span>Jump to Root Cause</span>
          </button>

          {/* Speed Multiplier */}
          <div className="flex items-center space-x-1 bg-[#070A0F] p-1 rounded border border-slate-800">
            <span className="text-slate-500 px-2 text-[10px] uppercase">Speed:</span>
            {[0.5, 1.0, 2.0, 5.0].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                  playbackSpeed === speed
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
