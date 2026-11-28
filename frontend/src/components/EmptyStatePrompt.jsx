import { Activity, Play } from "lucide-react";

/**
 * Clean empty-state prompt displayed before the first simulation or analysis runs.
 */
export function EmptyStatePrompt({
  title = "No Telemetry Window Loaded",
  description = "Run a Tennessee Eastman Process fault simulation above (or test a custom window in Data Upload) to populate ISA-18.2 alarm consolidation, SHAP attributions, and causal propagation.",
  onRun,
  loading = false,
  actionLabel = "Run Fault 6 Simulation",
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8 text-center">
      <div className="w-12 h-12 rounded-2xl bg-[#00A8B5]/10 text-[#00A8B5] flex items-center justify-center mx-auto mb-4">
        <Activity className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-[#0F172A]">{title}</h3>
      <p className="mt-2 max-w-xl mx-auto text-sm text-slate-600 leading-relaxed">
        {description}
      </p>
      {onRun && (
        <button
          type="button"
          onClick={onRun}
          disabled={loading}
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00A8B5] text-white text-sm font-semibold shadow-xs hover:bg-[#008B96] disabled:opacity-60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5] focus-visible:ring-offset-2"
        >
          <Play className="w-4 h-4" />
          {loading ? "Running Simulation..." : actionLabel}
        </button>
      )}
    </div>
  );
}
