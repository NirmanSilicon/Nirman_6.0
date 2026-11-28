import { Download, FileBarChart2, Printer, RefreshCw } from "lucide-react";
import { formatNumber, formatPct, formatTimestamp, getSeverityBadgeClass } from "../utils/formatters";

/**
 * View 8 — Reports.
 * Printable and JSON-exportable diagnostic report + operator feedback summary audit log.
 */
export function ReportsView({
  activePlant,
  health,
  result,
  feedbackSummary,
  onRefreshFeedback,
}) {
  const handleExportJson = () => {
    const payload = {
      generated_at: new Date().toISOString(),
      plant: activePlant || {
        plant_id: health?.active_plant_id || "tep",
        plant_name: health?.active_plant_name || "Tennessee Eastman Process",
      },
      diagnosis: result || null,
      feedback_summary: feedbackSummary || null,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `alarmsense-report-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const recentEntries = [...(feedbackSummary?.recent_entries || [])].reverse();

  return (
    <div className="space-y-6">
      {/* Header & Export Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00A8B5]/12 text-[#00A8B5] flex items-center justify-center">
            <FileBarChart2 className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">
              Shift Diagnostic & Feedback Report
            </h2>
            <p className="text-xs text-slate-500">
              Export structured JSON telemetry or print a formatted handover report
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onRefreshFeedback}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Log
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-[#F4F8FB] hover:bg-slate-100 text-xs font-semibold text-[#0F172A] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#00A8B5]" />
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00A8B5] hover:bg-[#008B96] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>
        </div>
      </div>

      {/* Printable Diagnosis Summary */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">
              Active Window Diagnostic Summary
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Plant: {activePlant?.plant_name || health?.active_plant_name || "Tennessee Eastman Process"} ({activePlant?.plant_id || "tep"})
            </p>
          </div>
          {result && (
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getSeverityBadgeClass(
                result.root_cause.severity_level,
              )}`}
            >
              {result.root_cause.severity_level}
            </span>
          )}
        </div>

        {!result ? (
          <p className="py-4 text-sm text-slate-500">
            No simulation or custom analysis result loaded in the current session. Run a simulation from the Dashboard to include telemetry diagnostics in the exported report.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl bg-[#F4F8FB] p-3.5">
                <div className="text-[11px] font-semibold text-slate-500">Diagnosed Fault</div>
                <div className="mt-1 text-sm font-bold text-[#0F172A]">
                  {result.root_cause.fault_id} — {result.root_cause.name}
                </div>
              </div>
              <div className="rounded-xl bg-[#F4F8FB] p-3.5">
                <div className="text-[11px] font-semibold text-slate-500">Confidence</div>
                <div className="mt-1 text-sm font-bold text-[#008B96] tabular-nums">
                  {formatPct(result.root_cause.confidence, true)}
                </div>
              </div>
              <div className="rounded-xl bg-[#F4F8FB] p-3.5">
                <div className="text-[11px] font-semibold text-slate-500">Flood Consolidation</div>
                <div className="mt-1 text-sm font-bold text-[#0F172A] tabular-nums">
                  {result.raw_alarm_count} → {result.confirmed_alarm_count} ({formatPct(result.reduction_pct)})
                </div>
              </div>
              <div className="rounded-xl bg-[#F4F8FB] p-3.5">
                <div className="text-[11px] font-semibold text-slate-500">Latency</div>
                <div className="mt-1 text-sm font-bold font-mono text-[#0F172A] tabular-nums">
                  {formatNumber(result.latency_ms, 2)} ms
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl border border-slate-200/80 p-4">
                <div className="font-bold text-[#0F172A] mb-2">Top TreeSHAP Drivers</div>
                <ul className="space-y-1.5 text-slate-600">
                  {(result.shap_evidence || []).map((ev) => (
                    <li key={ev.feature} className="flex justify-between gap-2">
                      <span className="font-mono">{ev.feature} ({ev.label || ev.sensor})</span>
                      <span className="font-mono font-semibold text-[#008B96]">
                        {ev.shap_value >= 0 ? "+" : ""}
                        {formatNumber(ev.shap_value, 4)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200/80 p-4">
                <div className="font-bold text-[#0F172A] mb-2">Top Causal Links</div>
                {result.causal_links?.length ? (
                  <ul className="space-y-1.5 text-slate-600">
                    {result.causal_links.slice(0, 3).map((link, idx) => (
                      <li key={idx}>
                        <span className="font-semibold text-[#0F172A]">
                          {link.source} → {link.target}
                        </span>{" "}
                        (lag {link.lag_minutes}m, strength {formatNumber(link.strength * 100, 1)}%)
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500">No causal propagation links for this window.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Persisted Operator Feedback Audit Log */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">
              Operator Feedback Audit Log
            </h3>
            <p className="text-xs text-slate-500">
              Persisted backend summary from <code className="font-mono">GET /api/v1/feedback/summary</code>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold tabular-nums">
            <span className="px-2.5 py-1 rounded-full bg-[#F4F8FB] text-[#0F172A]">
              Total: {feedbackSummary?.total_feedback_count ?? 0}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Confirmed: {feedbackSummary?.confirmed_count ?? 0}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Rejected: {feedbackSummary?.rejected_count ?? 0}
            </span>
          </div>
        </div>

        {recentEntries.length === 0 ? (
          <p className="py-6 text-sm text-slate-500 text-center">
            No operator feedback entries recorded yet. Verify a diagnosis in the Recommendations tab.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Predicted Fault</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Corrected ID</th>
                  <th className="py-2.5 px-3">Episode / Step</th>
                  <th className="py-2.5 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentEntries.map((entry, idx) => (
                  <tr key={`${entry.timestamp}-${idx}`} className="hover:bg-[#F4F8FB]/70">
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {formatTimestamp(entry.timestamp)}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[#0F172A]">
                      {entry.fault_id} — {entry.fault_name}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          entry.action === "confirm"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {entry.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-700">
                      {entry.corrected_fault_id ?? "—"}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-500">
                      {entry.episode_id ?? "—"} / {entry.step_index ?? "—"}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-slate-600 max-w-xs truncate">
                      {entry.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
