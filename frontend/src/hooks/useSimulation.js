
import { useCallback, useEffect, useRef, useState } from "react";
import { simulateFault } from "../api/client";

const PLAYBACK_INTERVAL = 900;
const PLAYBACK_STEP = 2;
const PLAYBACK_SMOOTH_STEPS = 3;
const MAX_ACTIVITY_ITEMS = 20;

export function useSimulation({ activePlantId, onNotification }) {
  const [faultId, setFaultIdState] = useState(6);
  const [episodeIndex, setEpisodeIndex] = useState(0);
  const [preFaultSteps, setPreFaultSteps] = useState(10);
  const [stepIndex, setStepIndex] = useState(0);
  const [windowSize, setWindowSize] = useState(20);

  const [result, setResult] = useState(null);
  const [lastSource, setLastSource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activityLog, setActivityLog] = useState([]);

  const playingRef = useRef(false);
  const timerRef = useRef(null);
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  const paramsRef = useRef({
    faultId,
    episodeIndex,
    preFaultSteps,
    stepIndex,
    windowSize,
  });

  // Keep simulation parameters synchronised.
  useEffect(() => {
    paramsRef.current = {
      faultId,
      episodeIndex,
      preFaultSteps,
      stepIndex,
      windowSize,
    };
  }, [faultId, episodeIndex, preFaultSteps, stepIndex, windowSize]);

  // Track component lifecycle.
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      playingRef.current = false;
      requestIdRef.current += 1;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Immutable activity history.
  const appendActivity = useCallback((entry) => {
    if (!mountedRef.current) return;

    setActivityLog((previous) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        ...entry,
      },
      ...previous,
    ].slice(0, MAX_ACTIVITY_ITEMS));
  }, []);

  // Stop live playback and invalidate pending requests.
  const stopPlayback = useCallback(() => {
    playingRef.current = false;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    requestIdRef.current += 1;

    if (mountedRef.current) {
      setIsPlaying(false);
      setLoading(false);
    }
  }, []);

  // Update fault ID with state reset.
  const setFaultId = useCallback(
    (nextFaultId) => {
      stopPlayback();
      setError(null);
      setEpisodeIndex(0);
      setStepIndex(0);
      setFaultIdState(nextFaultId);
    },
    [stopPlayback],
  );

  // Stop playback when switching to a custom plant.
  useEffect(() => {
    if (activePlantId && activePlantId !== "tep") {
      stopPlayback();
    }
  }, [activePlantId, stopPlayback]);

  // Central simulation API handler.
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
      if (!mountedRef.current || inFlightRef.current) {
        return null;
      }

      const requestId = ++requestIdRef.current;

      inFlightRef.current = true;
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

        // Ignore stale or invalidated responses.
        if (
          !mountedRef.current ||
          requestId !== requestIdRef.current
        ) {
          return null;
        }

        if (!data || typeof data !== "object") {
          throw new Error("Invalid simulation response.");
        }

        setResult(data);
        setLastSource("simulation");

        if (Number.isFinite(data.step_index)) {
          setStepIndex(data.step_index);
        }

        if (logActivity) {
          const rootCause = data.root_cause || {};
          const confidence = Number(rootCause.confidence);
          const reduction = Number(data.reduction_pct);

          appendActivity({
            type: "simulation",
            title: `Simulated Fault ${data.simulated_fault_id ?? nextFaultId} → ${rootCause.name || "Unknown Root Cause"}`,
            detail: [
              `Episode #${data.episode_id ?? nextEpisodeIndex}`,
              `step ${data.step_index ?? nextStepIndex}`,
              Number.isFinite(confidence)
                ? `${(confidence * 100).toFixed(1)}% confidence`
                : null,
              Number.isFinite(reduction)
                ? `${reduction.toFixed(1)}% flood reduction`
                : null,
            ].filter(Boolean).join(" • "),
            severity: rootCause.severity_level || "Unknown",
          });
        }

        return data;
      } catch (err) {
        if (
          !mountedRef.current ||
          requestId !== requestIdRef.current
        ) {
          return null;
        }

        const message =
          err?.message || "Simulation failed. Please try again.";

        setError(message);
        onNotification?.({
          type: "error",
          message,
        });

        if (playingRef.current) {
          playingRef.current = false;
          setIsPlaying(false);
        }

        return null;
      } finally {
        inFlightRef.current = false;

        if (
          mountedRef.current &&
          requestId === requestIdRef.current
        ) {
          setLoading(false);
        }
      }
    },
    [appendActivity, onNotification],
  );

  // Run current simulation.
  const runNow = useCallback(async () => {
    stopPlayback();

    const params = paramsRef.current;

    return runSimulationAt({
      nextFaultId: params.faultId,
      nextEpisodeIndex: params.episodeIndex,
      nextPreFaultSteps: params.preFaultSteps,
      nextStepIndex: params.stepIndex,
      nextWindowSize: params.windowSize,
      smoothSteps: params.stepIndex > 0 ? 3 : 1,
      logActivity: true,
    });
  }, [runSimulationAt, stopPlayback]);

  // Move simulation forward.
  const stepForward = useCallback(async () => {
    if (playingRef.current || inFlightRef.current) {
      return null;
    }

    const params = paramsRef.current;

    const maxStep = result
      ? Math.max(
          0,
          result.episode_total_steps - result.window_size
        )
      : params.stepIndex + PLAYBACK_STEP;

    const nextStep = Math.min(
      params.stepIndex + PLAYBACK_STEP,
      maxStep
    );

    return runSimulationAt({
      nextFaultId: params.faultId,
      nextEpisodeIndex: params.episodeIndex,
      nextPreFaultSteps: params.preFaultSteps,
      nextStepIndex: nextStep,
      nextWindowSize: params.windowSize,
      smoothSteps: PLAYBACK_SMOOTH_STEPS,
      logActivity: false,
    });
  }, [result, runSimulationAt]);

  // Reset simulation.
  const resetSimulation = useCallback(async () => {
    stopPlayback();

    setStepIndex(0);

    const params = paramsRef.current;

    return runSimulationAt({
      nextFaultId: params.faultId,
      nextEpisodeIndex: params.episodeIndex,
      nextPreFaultSteps: params.preFaultSteps,
      nextStepIndex: 0,
      nextWindowSize: params.windowSize,
      smoothSteps: 1,
      logActivity: true,
    });
  }, [runSimulationAt, stopPlayback]);

  // Schedule next playback frame.
  const scheduleNextTick = useCallback(
    (latestData) => {
      if (!playingRef.current || !latestData) return;

      const params = paramsRef.current;

      const totalSteps = Number(latestData.episode_total_steps);
      const currentStep = Number(latestData.step_index);
      const currentWindowSize = Number(latestData.window_size);

      if (
        !Number.isFinite(totalSteps) ||
        !Number.isFinite(currentStep) ||
        !Number.isFinite(currentWindowSize) ||
        currentWindowSize <= 0
      ) {
        stopPlayback();
        setError("Invalid episode metadata. Playback stopped.");
        return;
      }

      const maxStart = Math.max(
        0,
        totalSteps - currentWindowSize
      );

      if (currentStep >= maxStart) {
        stopPlayback();

        appendActivity({
          type: "simulation",
          title: `Completed live replay for Fault ${latestData.simulated_fault_id}`,
          detail: `Reached end of episode #${latestData.episode_id} at step ${currentStep}`,
          severity: latestData.root_cause?.severity_level || "Unknown",
        });

        return;
      }

      const nextStep = Math.min(
        currentStep + PLAYBACK_STEP,
        maxStart
      );

      timerRef.current = setTimeout(async () => {
        timerRef.current = null;

        if (!playingRef.current) return;

        const current = paramsRef.current;

        const data = await runSimulationAt({
          nextFaultId: current.faultId,
          nextEpisodeIndex: current.episodeIndex,
          nextPreFaultSteps: current.preFaultSteps,
          nextStepIndex: nextStep,
          nextWindowSize: current.windowSize,
          smoothSteps: PLAYBACK_SMOOTH_STEPS,
          logActivity: false,
        });

        if (data && playingRef.current) {
          scheduleNextTick(data);
        }
      }, PLAYBACK_INTERVAL);
    },
    [appendActivity, runSimulationAt, stopPlayback],
  );

  // Toggle live replay.
  const togglePlay = useCallback(async () => {
    if (playingRef.current) {
      stopPlayback();
      return;
    }

    if (inFlightRef.current || activePlantId !== "tep") {
      return;
    }

    playingRef.current = true;
    setIsPlaying(true);

    const params = paramsRef.current;

    const initial = await runSimulationAt({
      nextFaultId: params.faultId,
      nextEpisodeIndex: params.episodeIndex,
      nextPreFaultSteps: params.preFaultSteps,
      nextStepIndex: params.stepIndex,
      nextWindowSize: params.windowSize,
      smoothSteps: PLAYBACK_SMOOTH_STEPS,
      logActivity: true,
    });

    if (initial && playingRef.current) {
      scheduleNextTick(initial);
    } else if (!initial && playingRef.current) {
      stopPlayback();
    }
  }, [
    activePlantId,
    runSimulationAt,
    scheduleNextTick,
    stopPlayback,
  ]);

  // Accept custom Data Upload analysis results.
  const setAnalysisResult = useCallback(
    (analysisData, sourceLabel = "Custom window") => {
      stopPlayback();

      if (!analysisData || typeof analysisData !== "object") {
        setError("Invalid analysis result.");
        return;
      }

      setError(null);
      setResult(analysisData);
      setLastSource("analyze");

      const rootCause = analysisData.root_cause || {};
      const confidence = Number(rootCause.confidence);

      appendActivity({
        type: "analyze",
        title: `Analyzed ${sourceLabel} → ${rootCause.name || "Unknown Root Cause"}`,
        detail: [
          Number.isFinite(confidence)
            ? `${(confidence * 100).toFixed(1)}% confidence`
            : null,
          `${analysisData.confirmed_alarm_count ?? 0} confirmed alarms`,
        ].filter(Boolean).join(" • "),
        severity: rootCause.severity_level || "Unknown",
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

