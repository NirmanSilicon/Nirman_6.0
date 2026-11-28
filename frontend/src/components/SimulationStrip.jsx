
import {
  AlertCircle,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Zap,
  LoaderCircle,
} from "lucide-react";

/**
 * Compact Live Simulation Control Strip.
 * Supports TEP fault replay and episode navigation.
 */
export function SimulationStrip({
  faults = [],
  faultId,
  onFaultIdChange,
  episodeIndex,
  onEpisodeIndexChange,
  preFaultSteps = 0,
  onPreFaultStepsChange,
  isPlaying = false,
  loading = false,
  result,
  error,
  activePlantId = "tep",
  onActivateTep,
  onRun,
  onTogglePlay,
  onStep,
  onReset,
}) {
  const isCustomPlant = activePlantId !== "tep";

  const safeFaults = Array.isArray(faults) ? faults : [];

  const maxEpisodes = Number.isFinite(result?.available_episodes)
    ? result.available_episodes
    : null;

  const episodeMax = maxEpisodes !== null && maxEpisodes > 0
    ? maxEpisodes - 1
    : 99;

  const safeEpisodeIndex = Math.min(
    episodeMax,
    Math.max(0, Number(episodeIndex) || 0)
  );

  const errorMessage =
    typeof error === "string"
      ? error
      : error?.message || (error ? "An unexpected simulation error occurred." : "");

  const hasResult =
    result && typeof result === "object" && "episode_id" in result;

  const hasFaultOnset =
    Number.isFinite(result?.onset_offset_in_window);

  const handleEpisodeChange = (value) => {
    const nextValue = Math.min(
      episodeMax,
      Math.max(0, Number(value) || 0)
    );

    onEpisodeIndexChange?.(nextValue);
  };

  const handlePreFaultChange = (value) => {
    const nextValue = Math.min(
      100,
      Math.max(0, Number(value) || 0)
    );

    onPreFaultStepsChange?.(nextValue);
  };

  return (
    <section
      aria-label="Live Simulation Controls"
      aria-busy={loading}
      className="bg-white rounded-2xl border border-slate-200/80 shadow-xs px-4 py-3.5"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">

        {/* Parameter Controls */}
        <div className="flex flex-wrap items-end gap-3">

          {/* Fault Selector */}
          <div className="min-w-[220px]">
            <label
              htmlFor="sim-fault-select"
              className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1"
            >
              TEP Fault Scenario
            </label>

            <select
              id="sim-fault-select"
              value={faultId ?? 6}
              disabled={loading || isPlaying || isCustomPlant}
              onChange={(e) =>
                onFaultIdChange?.(Number(e.target.value))
              }
              className="w-full bg-[#F4F8FB] border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#00A8B5] disabled:opacity-50"
            >
              {safeFaults.length === 0 ? (
                <option value={6}>Fault 6 — A Feed Loss</option>
              ) : (
                safeFaults.map((fault) => (
                  <option
                    key={fault.fault_id}
                    value={fault.fault_id}
                  >
                    {fault.fault_id === 0
                      ? "0 — Normal Operation"
                      : `Fault ${fault.fault_id} — ${fault.name}`}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Episode Index */}
          <div className="w-24">
            <label
              htmlFor="sim-episode-index"
              className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1"
            >
              Episode {maxEpisodes ? `(0–${episodeMax})` : ""}
            </label>

            <input
              id="sim-episode-index"
              type="number"
              min={0}
              max={episodeMax}
              value={safeEpisodeIndex}
              disabled={loading || isPlaying || isCustomPlant}
              onChange={(e) => handleEpisodeChange(e.target.value)}
              className="w-full bg-[#F4F8FB] border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono text-[#0F172A] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#00A8B5] disabled:opacity-50"
            />
          </div>

          {/* Pre-Fault Steps */}
          <div className="w-36">
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="sim-prefault-steps"
                className="text-[11px] font-semibold uppercase tracking-wider text-slate-500"
              >
                Pre-Fault Steps
              </label>

              <button
                type="button"
                disabled={loading || isPlaying || isCustomPlant}
                onClick={() =>
                  handlePreFaultChange(preFaultSteps > 0 ? 0 : 20)
                }
                className="text-[10px] font-semibold text-[#008B96] hover:underline cursor-pointer disabled:opacity-50"
              >
                {preFaultSteps > 0 ? "Disable" : "Use 20"}
              </button>
            </div>

            <input
              id="sim-prefault-steps"
              type="number"
              min={0}
              max={100}
              value={preFaultSteps}
              disabled={loading || isPlaying || isCustomPlant}
              onChange={(e) => handlePreFaultChange(e.target.value)}
              className="w-full bg-[#F4F8FB] border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono text-[#0F172A] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#00A8B5] disabled:opacity-50"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">

          {/* Run */}
          <button
            type="button"
            onClick={onRun}
            disabled={loading || isPlaying || isCustomPlant}
            aria-busy={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00A8B5] text-white text-xs sm:text-sm font-semibold hover:bg-[#008B96] disabled:opacity-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5] focus-visible:ring-offset-1"
          >
            {loading ? (
              <LoaderCircle className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" aria-hidden="true" />
            )}

            <span>{loading ? "Running..." : "Run"}</span>
          </button>

          {/* Play / Pause */}
          <button
            type="button"
            onClick={onTogglePlay}
            disabled={loading || isCustomPlant}
            aria-label={isPlaying ? "Pause simulation" : "Play simulation"}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5] ${
              isPlaying
                ? "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100"
                : "bg-white border-slate-200 text-[#0F172A] hover:bg-slate-50"
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" aria-hidden="true" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-[#00A8B5]" aria-hidden="true" />
                <span>Play</span>
              </>
            )}
          </button>

          {/* Step */}
          <button
            type="button"
            onClick={onStep}
            disabled={loading || isPlaying || isCustomPlant}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5]"
          >
            <SkipForward className="w-4 h-4" aria-hidden="true" />
            <span>Step</span>
          </button>

          {/* Reset */}
          <button
            type="button"
            onClick={onReset}
            disabled={loading || isCustomPlant}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5]"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Metadata / Error / Custom Plant Alert */}
      {(hasResult || isCustomPlant || errorMessage) && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">

          {/* Custom Plant */}
          {isCustomPlant ? (
            <div className="flex flex-wrap items-center gap-2 text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 w-full">
              <AlertCircle className="w-4 h-4 shrink-0" />

              <span className="flex-1">
                Active plant is{" "}
                <strong className="font-mono">{activePlantId}</strong>.
                TEP simulation replay requires the built-in{" "}
                <strong className="font-mono">tep</strong> model.
                Use Data Upload to test custom data.
              </span>

              {onActivateTep && (
                <button
                  type="button"
                  onClick={onActivateTep}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 shrink-0 cursor-pointer"
                >
                  Switch to TEP
                </button>
              )}
            </div>

          ) : errorMessage ? (
            <div role="alert" className="flex items-center gap-2 text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>

          ) : hasResult ? (
            <>
              {/* Episode Metadata */}
              <div className="flex flex-wrap items-center gap-3 text-slate-600">
                <span>
                  Episode{" "}
                  <strong className="font-mono text-[#0F172A]">
                    #{result.episode_id}
                  </strong>
                </span>

                {Number.isFinite(result.step_index) &&
                  Number.isFinite(result.window_size) && (
                    <>
                      <span className="text-slate-300">•</span>

                      <span className="tabular-nums">
                        Window Step{" "}
                        <strong className="font-mono text-[#0F172A]">
                          {result.step_index}–
                          {result.step_index + result.window_size - 1}
                        </strong>

                        {Number.isFinite(result.episode_total_steps) &&
                          ` of ${result.episode_total_steps}`}
                      </span>
                    </>
                  )}

                {hasFaultOnset && (
                  <>
                    <span className="text-slate-300">•</span>

                    <span className="text-[#008B96] font-medium">
                      Fault Onset at window offset +{result.onset_offset_in_window}
                    </span>
                  </>
                )}
              </div>

              {/* Regime Status */}
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                    result.in_fault_regime
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      result.in_fault_regime
                        ? "bg-rose-500"
                        : "bg-emerald-500"
                    }`}
                  />

                  {result.in_fault_regime
                    ? "Fault Regime"
                    : "Normal Pre-Fault"}
                </span>

                {isPlaying && (
                  <span className="text-[11px] font-medium text-[#008B96]">
                    Live Replay (smooth_steps=3)
                  </span>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}
    </section>
  );
}
