import { useCallback, useEffect, useRef, useState } from "react";
import { simulateFault } from "../api/client";

/**
 * Custom hook orchestrating TEP fault simulation, live smooth replay,
 * custom analysis results, and immutable session activity history.
 */
export function useSimulation({ activePlantId, onNotification }) {
  const [faultId, setFaultIdState] = useState(6);
  const [episodeIndex, setEpisodeIndex] = useState(0);
  const [preFaultSteps, setPreFaultSteps] = useState(10);
  const [stepIndex, setStepIndex] = useState(0);
  const [windowSize, setWindowSize] = useState(20);

  const [result, setResult] = useState(null);
  const [lastSource, setLastSource] = useState(null); // "simulation" | "analyze"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activityLog, setActivityLog] = useState([]);

  const playingRef = useRef(false);
  const playSessionIdRef = useRef(0);
  const timerRef = useRef(null);
  const paramsRef = useRef({
    faultId,
    episodeIndex,
    preFaultSteps,
    stepIndex,
    windowSize,
  });

  useEffect(() => {
    paramsRef.current = {
      faultId,
      episodeIndex,
      preFaultSteps,
      stepIndex,
      windowSize,
    };
  }, [faultId, episodeIndex, preFaultSteps, stepIndex, windowSize]);

  const appendActivity = useCallback((entry) => {
    setActivityLog((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        ...entry,
      },
      ...prev,
    ].slice(0, 20));
  }, []);

  const stopPlayback = useCallback(() => {
    playingRef.current = false;
    playSessionIdRef.current += 1;
    setIsPlaying(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const setFaultId = useCallback(
    (nextFaultId) => {
      stopPlayback();
      setFaultIdState(nextFaultId);
      setEpisodeIndex(0);
      setStepIndex(0);
      setError(null);
    },
    [stopPlayback],
  );

  // Stop replay automatically when switching away from TEP
  useEffect(() => {
    if (activePlantId && activePlantId !== "tep" && playingRef.current) {
      stopPlayback();
    }
  }, [activePlantId, stopPlayback]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const runSimulationAt = useCallback(
    async ({
      nextFaultId,
      nextEpisodeIndex,
      nextPreFaultSteps,
      nextStepIndex,
      nextWindowSize,
      smoothSteps = 1,
      logActivity = true,
    }) => {
      setLoading(true);
      setError(null);
      try {
        const data = await simulateFault(nextFaultId, {
          episode_index: nextEpisodeIndex,
          pre_fault_steps: nextPreFaultSteps,
          step_index: nextStepIndex,
          window_size: nextWindowSize,
          smooth_steps: smoothSteps,
        });
        setResult(data);
        setLastSource("simulation");
        setStepIndex(data.step_index);

        if (logActivity) {
          appendActivity({
            type: "simulation",
            title: `Simulated Fault ${data.simulated_fault_id} → ${data.root_cause.name}`,
            detail: `Ep #${data.episode_id}, step ${data.step_index} • ${(data.root_cause.confidence * 100).toFixed(1)}% conf • ${data.reduction_pct.toFixed(1)}% flood reduction`,
            severity: data.root_cause.severity_level,
          });
        }
        return data;
      } catch (err) {
        const msg = err?.message || "Simulation failed.";
        setError(msg);
        onNotification?.({ type: "error", message: msg });
        stopPlayback();
        return null;
      } finally {
        setLoading(false);
      }
    },
    [appendActivity, onNotification, stopPlayback],
  );

  const runNow = useCallback(async () => {
    stopPlayback();
    const p = paramsRef.current;
    return runSimulationAt({
      nextFaultId: p.faultId,
      nextEpisodeIndex: p.episodeIndex,
      nextPreFaultSteps: p.preFaultSteps,
      nextStepIndex: p.stepIndex,
      nextWindowSize: p.windowSize,
      smoothSteps: p.stepIndex > 0 ? 3 : 1,
      logActivity: true,
    });
  }, [runSimulationAt, stopPlayback]);

  const stepForward = useCallback(async () => {
    const p = paramsRef.current;
    const maxStep = result
      ? Math.max(0, result.episode_total_steps - result.window_size)
      : p.stepIndex + 5;
    const nextStep = Math.min(p.stepIndex + 2, maxStep);
    return runSimulationAt({
      nextFaultId: p.faultId,
      nextEpisodeIndex: p.episodeIndex,
      nextPreFaultSteps: p.preFaultSteps,
      nextStepIndex: nextStep,
      nextWindowSize: p.windowSize,
      smoothSteps: 3,
      logActivity: false,
    });
  }, [result, runSimulationAt]);

  const resetSimulation = useCallback(async () => {
    stopPlayback();
    setStepIndex(0);
    const p = paramsRef.current;
    return runSimulationAt({
      nextFaultId: p.faultId,
      nextEpisodeIndex: p.episodeIndex,
      nextPreFaultSteps: p.preFaultSteps,
      nextStepIndex: 0,
      nextWindowSize: p.windowSize,
      smoothSteps: 1,
      logActivity: true,
    });
  }, [runSimulationAt, stopPlayback]);

  const scheduleNextTick = useCallback(
    (latestData, sessionId) => {
      if (!playingRef.current || playSessionIdRef.current !== sessionId) return;
      const p = paramsRef.current;
      const maxStart = latestData
        ? Math.max(0, latestData.episode_total_steps - latestData.window_size)
        : 200;
      const nextStep = (latestData ? latestData.step_index : p.stepIndex) + 2;

      if (latestData && latestData.step_index >= maxStart) {
        stopPlayback();
        appendActivity({
          type: "simulation",
          title: `Completed live replay for Fault ${latestData.simulated_fault_id}`,
          detail: `Reached end of episode #${latestData.episode_id} at step ${latestData.step_index}`,
          severity: latestData.root_cause.severity_level,
        });
        return;
      }

      timerRef.current = setTimeout(async () => {
        if (!playingRef.current || playSessionIdRef.current !== sessionId) return;
        const curr = paramsRef.current;
        const data = await runSimulationAt({
          nextFaultId: curr.faultId,
          nextEpisodeIndex: curr.episodeIndex,
          nextPreFaultSteps: curr.preFaultSteps,
          nextStepIndex: Math.min(nextStep, maxStart),
          nextWindowSize: curr.windowSize,
          smoothSteps: 3,
          logActivity: false,
        });
        if (data && playingRef.current && playSessionIdRef.current === sessionId) {
          scheduleNextTick(data, sessionId);
        }
      }, 900);
    },
    [appendActivity, runSimulationAt, stopPlayback],
  );

  const togglePlay = useCallback(async () => {
    if (playingRef.current) {
      stopPlayback();
      return;
    }
    const sessionId = ++playSessionIdRef.current;
    playingRef.current = true;
    setIsPlaying(true);
    const p = paramsRef.current;
    const initial = await runSimulationAt({
      nextFaultId: p.faultId,
      nextEpisodeIndex: p.episodeIndex,
      nextPreFaultSteps: p.preFaultSteps,
      nextStepIndex: p.stepIndex,
      nextWindowSize: p.windowSize,
      smoothSteps: 3,
      logActivity: true,
    });
    if (initial && playingRef.current && playSessionIdRef.current === sessionId) {
      scheduleNextTick(initial, sessionId);
    }
  }, [runSimulationAt, scheduleNextTick, stopPlayback]);

  const setAnalysisResult = useCallback(
    (analysisData, sourceLabel = "Custom window") => {
      stopPlayback();
      setError(null);
      setResult(analysisData);
      setLastSource("analyze");
      appendActivity({
        type: "analyze",
        title: `Analyzed ${sourceLabel} → ${analysisData.root_cause.name}`,
        detail: `${(analysisData.root_cause.confidence * 100).toFixed(1)}% conf • ${analysisData.confirmed_alarm_count} confirmed alarms`,
        severity: analysisData.root_cause.severity_level,
      });
    },
    [appendActivity, stopPlayback],
  );

  return {
    faultId,
    setFaultId,
    episodeIndex,
    setEpisodeIndex,
    preFaultSteps,
    setPreFaultSteps,
    stepIndex,
    setStepIndex,
    windowSize,
    setWindowSize,
    result,
    lastSource,
    loading,
    error,
    isPlaying,
    activityLog,
    appendActivity,
    runNow,
    stepForward,
    resetSimulation,
    togglePlay,
    stopPlayback,
    setAnalysisResult,
  };
}
