
import { useMemo, useState } from "react";
import {
  Download,
  FileBarChart2,
  Printer,
  RefreshCw,
} from "lucide-react";

import {
  formatNumber,
  formatPct,
  formatTimestamp,
  getSeverityBadgeClass,
} from "../utils/formatters";

/**
 * View 8 — Reports.
 *
 * Features:
 * 1. Printable diagnostic report
 * 2. JSON report export
 * 3. Root cause and model confidence summary
 * 4. TreeSHAP feature evidence
 * 5. Causal relationship evidence
 * 6. Operator feedback audit log
 */

export function ReportsView({
  activePlant,
  health,
  result,
  feedbackSummary,
  onRefreshFeedback,
}) {
  const [exportError, setExportError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // --------------------------------------------------
  // 1. SAFE DATA
  // --------------------------------------------------

  const rootCause = result?.root_cause || {};

  const shapEvidence = Array.isArray(result?.shap_evidence)
    ? result.shap_evidence
    : [];

  const causalLinks = Array.isArray(result?.causal_links)
    ? result.causal_links
    : [];

  const feedbackEntries = Array.isArray(
    feedbackSummary?.recent_entries
  )
    ? feedbackSummary.recent_entries
    : [];

  const recentEntries = useMemo(() => {
    return [...feedbackEntries]
      .filter(
        (entry) =>
          entry !== null &&
          typeof entry === "object"
      )
      .sort((a, b) => {
        const dateA = new Date(a.timestamp || 0).getTime();
        const dateB = new Date(b.timestamp || 0).getTime();

        return (
          (Number.isFinite(dateB) ? dateB : 0) -
          (Number.isFinite(dateA) ? dateA : 0)
        );
      });
  }, [feedbackEntries]);

  // --------------------------------------------------
  // 2. PLANT INFORMATION
  // --------------------------------------------------

  const plant = {
    plant_id:
      activePlant?.plant_id ||
      health?.active_plant_id ||
      "tep",

    plant_name:
      activePlant?.plant_name ||
      health?.active_plant_name ||
      "Tennessee Eastman Process",

    n_sensors:
      activePlant?.n_sensors ??
      health?.n_sensors ??
      52,
  };

  // --------------------------------------------------
  // 3. JSON REPORT EXPORT
  // --------------------------------------------------

  const handleExportJson = () => {
    setExportError(null);

    try {
      const payload = {
        report_type: "AlarmSense Diagnostic Report",

        generated_at: new Date().toISOString(),

        plant,

        system_health: health || null,

        diagnosis: result
          ? {
              ...result,
              root_cause: rootCause,
              shap_evidence: shapEvidence,
              causal_links: causalLinks,
            }
          : null,

        feedback_summary: feedbackSummary || null,
      };

      const jsonContent = JSON.stringify(
        payload,
        null,
        2
      );

      const blob = new Blob([jsonContent], {
        type: "application/json;charset=utf-8",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      const timestamp = new Date()
        .toISOString()
        .replace(/:/g, "-")
        .replace(/\..+/, "");

      link.href = url;
      link.download = `alarmsense-report-${timestamp}.json`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      // Give the browser time to begin downloading.
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      setExportError(
        error?.message || "Unable to export the JSON report."
      );
    }
  };

  // --------------------------------------------------
  // 4. REFRESH FEEDBACK LOG
  // --------------------------------------------------

  const handleRefreshFeedback = async () => {
    if (
      typeof onRefreshFeedback !== "function" ||
      refreshing
    ) {
      return;
    }

    setRefreshing(true);

    try {
      await onRefreshFeedback();
    } catch (error) {
      setExportError(
        error?.message || "Unable to refresh the feedback log."
      );
    } finally {
      setRefreshing(false);
    }
  };

  // --------------------------------------------------
  // 5. PRINT REPORT
  // --------------------------------------------------

  const handlePrint = () => {
    window.print();
  };

  // --------------------------------------------------
  // 6. SAFE METRICS
  // --------------------------------------------------

  const totalFeedback = Number(
    feedbackSummary?.total_feedback_count
  );

  const confirmedFeedback = Number(
    feedbackSummary?.confirmed_count
  );

  const rejectedFeedback = Number(
    feedbackSummary?.rejected_count
  );

  const safeTotalFeedback = Number.isFinite(totalFeedback)
    ? totalFeedback
    : 0;

  const safeConfirmedFeedback = Number.isFinite(
    confirmedFeedback
  )
    ? confirmedFeedback
    : 0;

  const safeRejectedFeedback = Number.isFinite(
    rejectedFeedback
  )
    ? rejectedFeedback
    : 0;

  // --------------------------------------------------
  // 7. RENDER
  // --------------------------------------------------

  return (
    <div className="space-y-6">

      {/* ==============================================
          HEADER & EXPORT TOOLBAR
      ============================================== */}

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-wrap items-center justify-between gap-4 no-print">

        <div className="flex items-center gap-3">

          <div className="w-10 h-10 rounded-xl bg-[#00A8B5]/12 text-[#00A8B5] flex items-center justify-center">
            <FileBarChart2
              className="w-5 h-5"
              aria-hidden="true"
            />
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

        {/* ACTION BUTTONS */}

        <div className="flex flex-wrap items-center gap-2.5">

          <button
            type="button"
            onClick={handleRefreshFeedback}
            disabled={
              refreshing ||
              typeof onRefreshFeedback !== "function"
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                refreshing ? "animate-spin" : ""
              }`}
            />

            {refreshing ? "Refreshing..." : "Refresh Log"}
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
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00A8B5] hover:bg-[#008B96] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>

        </div>

      </div>

      {/* EXPORT / REFRESH ERROR */}

      {exportError && (
        <div
          role="alert"
          className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs text-rose-700 no-print"
        >
          {exportError}
        </div>
      )}

      {/* ==============================================
          DIAGNOSTIC SUMMARY
      ============================================== */}

      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">

        {/* REPORT HEADER */}

        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100">

          <div>

            <h3 className="text-base font-bold text-[#0F172A]">
              Active Window Diagnostic Summary
            </h3>

            <p className="text-xs text-slate-500 mt-0.5">
              Plant: {plant.plant_name} ({plant.plant_id})
            </p>

            <p className="text-[11px] text-slate-400 mt-1">
              Generated: {new Date().toLocaleString()}
            </p>

          </div>

          {result && (
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getSeverityBadgeClass(
                rootCause.severity_level
              )}`}
            >
              {rootCause.severity_level || "UNKNOWN"}
            </span>
          )}

        </div>

        {/* EMPTY DIAGNOSIS */}

        {!result ? (

          <p className="py-4 text-sm text-slate-500">
            No simulation or custom analysis result loaded in the current session.
            Run a simulation from the Dashboard to include telemetry diagnostics
            in the exported report.
          </p>

        ) : (

          <div className="space-y-4">

            {/* KPI CARDS */}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

              <div className="rounded-xl bg-[#F4F8FB] p-3.5">

                <div className="text-[11px] font-semibold text-slate-500">
                  Diagnosed Fault
                </div>

                <div className="mt-1 text-sm font-bold text-[#0F172A]">
                  {rootCause.fault_id ?? "—"} —{" "}
                  {rootCause.name || "Unknown"}
                </div>

              </div>

              <div className="rounded-xl bg-[#F4F8FB] p-3.5">

                <div className="text-[11px] font-semibold text-slate-500">
                  Confidence
                </div>

                <div className="mt-1 text-sm font-bold text-[#008B96] tabular-nums">
                  {formatPct(rootCause.confidence, true)}
                </div>

              </div>

              <div className="rounded-xl bg-[#F4F8FB] p-3.5">

                <div className="text-[11px] font-semibold text-slate-500">
                  Flood Consolidation
                </div>

                <div className="mt-1 text-sm font-bold text-[#0F172A] tabular-nums">
                  {result.raw_alarm_count ?? "—"} →{" "}
                  {result.confirmed_alarm_count ?? "—"} (
                  {formatPct(result.reduction_pct)})
                </div>

              </div>

              <div className="rounded-xl bg-[#F4F8FB] p-3.5">

                <div className="text-[11px] font-semibold text-slate-500">
                  Latency
                </div>

                <div className="mt-1 text-sm font-bold font-mono text-[#0F172A] tabular-nums">
                  {formatNumber(result.latency_ms, 2)} ms
                </div>

              </div>

            </div>

            {/* ENGINEERING SUMMARY */}

            <div className="rounded-xl border border-slate-200/80 p-4">

              <div className="font-bold text-[#0F172A] mb-2 text-sm">
                Engineering Summary
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {rootCause.summary ||
                  "No engineering summary available for this diagnosis."}
              </p>

            </div>

            {/* EXPLAINABILITY + CAUSAL EVIDENCE */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">

              {/* TREESHAP */}

              <div className="rounded-xl border border-slate-200/80 p-4">

                <div className="font-bold text-[#0F172A] mb-2">
                  Top TreeSHAP Drivers
                </div>

                {shapEvidence.length === 0 ? (

                  <p className="text-slate-500">
                    No SHAP evidence available for this window.
                  </p>

                ) : (

                  <ul className="space-y-1.5 text-slate-600">

                    {shapEvidence.map((evidence, index) => {

                      const shapValue = Number(
                        evidence?.shap_value
                      );

                      const validValue =
                        Number.isFinite(shapValue);

                      return (

                        <li
                          key={
                            evidence?.feature ??
                            `shap-${index}`
                          }
                          className="flex justify-between gap-2"
                        >

                          <span className="font-mono min-w-0 break-words">
                            {evidence?.feature || "Unknown Feature"}{" "}
                            (
                            {evidence?.label ||
                              evidence?.sensor ||
                              "Sensor"}
                            )
                          </span>

                          <span className="font-mono font-semibold text-[#008B96] shrink-0">
                            {validValue && shapValue >= 0
                              ? "+"
                              : ""}
                            {validValue
                              ? formatNumber(shapValue, 4)
                              : "—"}
                          </span>

                        </li>

                      );
                    })}

                  </ul>

                )}

              </div>

              {/* CAUSAL LINKS */}

              <div className="rounded-xl border border-slate-200/80 p-4">

                <div className="font-bold text-[#0F172A] mb-2">
                  Top Causal Links
                </div>

                {causalLinks.length === 0 ? (

                  <p className="text-slate-500">
                    No causal propagation links for this window.
                  </p>

                ) : (

                  <ul className="space-y-2 text-slate-600">

                    {causalLinks.slice(0, 3).map((link, index) => {

                      const strength = Number(link?.strength);
                      const lag = Number(link?.lag_minutes);

                      return (

                        <li
                          key={`causal-${index}`}
                          className="break-words"
                        >

                          <span className="font-semibold text-[#0F172A]">
                            {link?.source || "Unknown"} →{" "}
                            {link?.target || "Unknown"}
                          </span>

                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Lag:{" "}
                            {Number.isFinite(lag) ? lag : "—"}m
                            {" • "}
                            Strength:{" "}
                            {Number.isFinite(strength)
                              ? formatNumber(strength * 100, 1)
                              : "—"}
                            %
                          </p>

                        </li>

                      );
                    })}

                  </ul>

                )}

              </div>

            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed">
              Diagnostic evidence supports investigation. Statistical or
              model-derived relationships should not be interpreted as
              independently verified physical causation.
            </p>

          </div>

        )}

      </section>

      {/* ==============================================
          OPERATOR FEEDBACK AUDIT LOG
      ============================================== */}

      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">

        {/* AUDIT HEADER */}

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">

          <div>

            <h3 className="text-base font-bold text-[#0F172A]">
              Operator Feedback Audit Log
            </h3>

            <p className="text-xs text-slate-500">
              Persisted backend summary from{" "}
              <code className="font-mono">
                GET /api/v1/feedback/summary
              </code>
            </p>

          </div>

          {/* FEEDBACK COUNTS */}

          <div className="flex flex-wrap gap-2 text-xs font-semibold tabular-nums">

            <span className="px-2.5 py-1 rounded-full bg-[#F4F8FB] text-[#0F172A]">
              Total: {safeTotalFeedback}
            </span>

            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Confirmed: {safeConfirmedFeedback}
            </span>

            <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Rejected: {safeRejectedFeedback}
            </span>

          </div>

        </div>

        {/* EMPTY AUDIT LOG */}

        {recentEntries.length === 0 ? (

          <p className="py-6 text-sm text-slate-500 text-center">
            No operator feedback entries recorded yet.
            Verify a diagnosis in the Recommendations tab.
          </p>

        ) : (

          /* AUDIT TABLE */

          <div className="overflow-x-auto">

            <table className="w-full text-left border-collapse text-xs sm:text-sm">

              <thead>

                <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">

                  <th className="py-2.5 px-3">
                    Timestamp
                  </th>

                  <th className="py-2.5 px-3">
                    Predicted Fault
                  </th>

                  <th className="py-2.5 px-3">
                    Action
                  </th>

                  <th className="py-2.5 px-3">
                    Corrected ID
                  </th>

                  <th className="py-2.5 px-3">
                    Episode / Step
                  </th>

                  <th className="py-2.5 px-3">
                    Notes
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {recentEntries.map((entry, index) => {

                  const isConfirmed =
                    entry.action === "confirm";

                  return (

                    <tr
                      key={
                        `${entry.timestamp || "entry"}-${index}`
                      }
                      className="hover:bg-[#F4F8FB]/70"
                    >

                      <td className="py-2.5 px-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                        {formatTimestamp(entry.timestamp)}
                      </td>

                      <td className="py-2.5 px-3 font-medium text-[#0F172A]">
                        {entry.fault_id ?? "—"} —{" "}
                        {entry.fault_name || "Unknown"}
                      </td>

                      <td className="py-2.5 px-3">

                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            isConfirmed
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {entry.action || "Unknown"}
                        </span>

                      </td>

                      <td className="py-2.5 px-3 font-mono text-xs text-slate-700">
                        {entry.corrected_fault_id ?? "—"}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-xs text-slate-500">
                        {entry.episode_id ?? "—"} /{" "}
                        {entry.step_index ?? "—"}
                      </td>

                      <td className="py-2.5 px-3 text-xs text-slate-600 max-w-xs truncate">
                        {entry.notes || "—"}
                      </td>

                    </tr>

                  );
                })}

              </tbody>

            </table>

          </div>

        )}

      </section>

    </div>
  );
}
