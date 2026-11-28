
import { useMemo } from "react";
import {
  ArrowRight,
  Cpu,
  GitCommitHorizontal,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyStatePrompt } from "../components/EmptyStatePrompt";

import { formatNumber } from "../utils/formatters";

/**
 * View 6 — Root Cause Analysis.
 *
 * Displays:
 * 1. TreeSHAP feature attributions
 * 2. Granger causal propagation links
 * 3. Feature values and contribution direction
 * 4. Lag, correlation and statistical significance evidence
 *
 * Note:
 * SHAP explains model predictions.
 * Granger causality identifies statistical temporal relationships.
 * Neither independently proves physical causation.
 */

function isValidNumber(value) {
  return (
    value !== null &&
    value !== undefined &&
    value !== "" &&
    Number.isFinite(Number(value))
  );
}

function safeNumber(value, decimals = 3) {
  return isValidNumber(value)
    ? formatNumber(Number(value), decimals)
    : "N/A";
}

export function RootCauseAnalysisView({
  result,
  loading,
  onRunSimulation,
}) {
  // --------------------------------------------------
  // 1. EMPTY STATE
  // --------------------------------------------------

  if (!result) {
    return (
      <EmptyStatePrompt
        title="No Root Cause Explainability Data"
        description="Run a simulation or custom window analysis to inspect TreeSHAP feature contributions and Granger causal propagation chains."
        onRun={onRunSimulation}
        loading={loading}
      />
    );
  }

  // --------------------------------------------------
  // 2. SAFE ROOT CAUSE DATA
  // --------------------------------------------------

  const rootCause = result.root_cause || {};

  // --------------------------------------------------
  // 3. SHAP FEATURE ATTRIBUTIONS
  // --------------------------------------------------

  const shapItems = useMemo(() => {
    const evidence = Array.isArray(result.shap_evidence)
      ? result.shap_evidence
      : [];

    return evidence
      .filter(
        (item) =>
          item &&
          typeof item === "object" &&
          isValidNumber(item.shap_value)
      )
      .map((item, index) => ({
        ...item,

        shap_value: Number(item.shap_value),

        feature_value: isValidNumber(item.feature_value)
          ? Number(item.feature_value)
          : null,

        displayName:
          item.feature ||
          item.sensor ||
          `Feature ${index + 1}`,

        sensorName:
          item.sensor ||
          item.feature ||
          `Unknown Sensor ${index + 1}`,

        statName: item.stat || "Value",
      }));
  }, [result.shap_evidence]);

  // --------------------------------------------------
  // 4. CAUSAL PROPAGATION LINKS
  // --------------------------------------------------

  const causalLinks = useMemo(() => {
    return Array.isArray(result.causal_links)
      ? result.causal_links.filter(
          (link) =>
            link &&
            typeof link === "object" &&
            typeof link.source === "string" &&
            typeof link.target === "string"
        )
      : [];
  }, [result.causal_links]);

  // --------------------------------------------------
  // 5. RENDER
  // --------------------------------------------------

  return (
    <div className="space-y-6">

      {/* ==============================================
          TREESHAP FEATURE ATTRIBUTIONS
      ============================================== */}

      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">

        {/* SECTION HEADER */}

        <div className="flex items-center gap-2.5 mb-5">

          <div className="w-10 h-10 rounded-xl bg-[#00A8B5]/12 text-[#00A8B5] flex items-center justify-center">
            <Cpu
              className="w-5 h-5"
              aria-hidden="true"
            />
          </div>

          <div>

            <h2 className="text-base font-bold text-[#0F172A]">
              TreeSHAP Feature Attributions
            </h2>

            <p className="text-xs text-slate-500">
              Top rolling-window sensor features driving the diagnosis of{" "}
              <strong className="text-[#0F172A]">
                {rootCause.name || "Unknown Fault"}
              </strong>
            </p>

          </div>

        </div>

        {/* SHAP EMPTY STATE */}

        {shapItems.length === 0 ? (

          <p className="py-6 text-sm text-slate-500 text-center">
            No valid SHAP attributions returned for this window.
          </p>

        ) : (

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-center">

            {/* SHAP BAR CHART */}

            <div
              className="h-64 w-full"
              role="img"
              aria-label="Horizontal bar chart showing positive and negative SHAP feature contributions"
            >

              <ResponsiveContainer width="100%" height="100%">

                <BarChart
                  data={shapItems}
                  layout="vertical"
                  margin={{
                    top: 8,
                    right: 24,
                    left: 16,
                    bottom: 8,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E2E8F0"
                    horizontal={false}
                  />

                  <XAxis
                    type="number"
                    tick={{
                      fontSize: 11,
                      fill: "#64748B",
                    }}
                  />

                  <YAxis
                    type="category"
                    dataKey="displayName"
                    width={145}
                    tick={{
                      fontSize: 11,
                      fill: "#0F172A",
                    }}
                  />

                  <ReferenceLine
                    x={0}
                    stroke="#94A3B8"
                  />

                  <Tooltip
                    formatter={(value) => [
                      safeNumber(value, 4),
                      "SHAP Value",
                    ]}
                    labelFormatter={(label) =>
                      `Feature: ${label}`
                    }
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderColor: "#E2E8F0",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />

                  <Bar
                    dataKey="shap_value"
                    radius={[0, 8, 8, 0]}
                    barSize={24}
                  >

                    {shapItems.map((entry, index) => (

                      <Cell
                        key={
                          entry.feature ||
                          `shap-cell-${index}`
                        }
                        fill={
                          entry.shap_value >= 0
                            ? "#00A8B5"
                            : "#F43F5E"
                        }
                      />

                    ))}

                  </Bar>

                </BarChart>

              </ResponsiveContainer>

            </div>

            {/* SHAP TABLE */}

            <div className="overflow-x-auto">

              <table className="w-full text-left border-collapse text-xs sm:text-sm">

                <thead>

                  <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">

                    <th className="py-2.5 px-2.5">
                      Sensor / Stat
                    </th>

                    <th className="py-2.5 px-2.5">
                      Label
                    </th>

                    <th className="py-2.5 px-2.5 text-right">
                      Value
                    </th>

                    <th className="py-2.5 px-2.5 text-right">
                      SHAP
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100">

                  {shapItems.map((item, index) => (

                    <tr
                      key={
                        item.feature ||
                        `shap-row-${index}`
                      }
                      className="hover:bg-[#F4F8FB]/70"
                    >

                      <td className="py-2.5 px-2.5 font-mono text-xs font-semibold text-[#0F172A]">
                        {item.feature || item.sensor || "—"}
                      </td>

                      <td className="py-2.5 px-2.5 text-xs text-slate-600">
                        {item.label || item.sensor || "—"}

                        {item.unit && (
                          <span className="font-mono text-slate-400">
                            {" "}({item.unit})
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-2.5 text-right font-mono text-xs tabular-nums">
                        {item.feature_value !== null
                          ? safeNumber(item.feature_value, 4)
                          : "N/A"}
                      </td>

                      <td
                        className={`py-2.5 px-2.5 text-right font-mono text-xs font-bold tabular-nums ${
                          item.shap_value >= 0
                            ? "text-[#008B96]"
                            : "text-rose-600"
                        }`}
                      >

                        {item.shap_value >= 0 ? "+" : ""}

                        {safeNumber(item.shap_value, 4)}

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </div>

        )}

        {/* SHAP LEGEND */}

        {shapItems.length > 0 && (

          <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-slate-100 text-[11px] text-slate-500">

            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#00A8B5]" />
              Positive SHAP contribution
            </span>

            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
              Negative SHAP contribution
            </span>

          </div>

        )}

      </section>

      {/* ==============================================
          GRANGER CAUSAL PROPAGATION LINKS
      ============================================== */}

      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">

        {/* SECTION HEADER */}

        <div className="flex items-center gap-2.5 mb-5">

          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <GitCommitHorizontal
              className="w-5 h-5"
              aria-hidden="true"
            />
          </div>

          <div>

            <h2 className="text-base font-bold text-[#0F172A]">
              Granger Causal Propagation Chain
            </h2>

            <p className="text-xs text-slate-500">
              Directed lagged statistical relationships between priority alarm and SHAP-driving variables
            </p>

          </div>

        </div>

        {/* CAUSAL LINKS EMPTY STATE */}

        {causalLinks.length === 0 ? (

          <p className="py-6 text-sm text-slate-500 text-center">
            No valid lagged propagation links detected in this window.
            This may occur during steady-state operation or when
            available signals do not show statistically significant
            relationships.
          </p>

        ) : (

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {causalLinks.map((link, index) => {

              const strength = Number(link.strength);

              const correlation = Number(link.correlation);

              const lag = Number(link.lag_minutes);

              const lagSteps = Number(link.best_lag_steps);

              const pValue = Number(link.p_value);

              return (

                <article
                  key={`${link.source}-${link.target}-${index}`}
                  className="rounded-2xl border border-slate-200/80 bg-[#F4F8FB]/70 p-4 space-y-2.5"
                >

                  {/* METHOD AND STRENGTH */}

                  <div className="flex flex-wrap items-center justify-between gap-2">

                    <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[#0F172A]">
                      {link.method || "Granger"}
                    </span>

                    <span className="text-xs font-semibold text-[#008B96] tabular-nums">

                      Strength{" "}
                      {Number.isFinite(strength)
                        ? `${safeNumber(strength * 100, 1)}%`
                        : "N/A"}

                      {" • "}

                      Lag{" "}
                      {Number.isFinite(lag)
                        ? `${safeNumber(lag, 1)} min`
                        : "N/A"}

                      {" ("}

                      {Number.isFinite(lagSteps)
                        ? `${safeNumber(lagSteps, 0)} steps`
                        : "N/A"}

                      {")"}

                    </span>

                  </div>

                  {/* SOURCE → TARGET */}

                  <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-[#0F172A]">

                    <span className="bg-white px-2.5 py-1 rounded-xl border border-slate-200 break-words">

                      {link.source_label || link.source}

                      <span className="font-mono text-xs text-slate-500">
                        {" "}({link.source})
                      </span>

                    </span>

                    <ArrowRight
                      className="w-4 h-4 text-[#00A8B5] shrink-0"
                      aria-label="leads to"
                    />

                    <span className="bg-white px-2.5 py-1 rounded-xl border border-slate-200 break-words">

                      {link.target_label || link.target}

                      <span className="font-mono text-xs text-slate-500">
                        {" "}({link.target})
                      </span>

                    </span>

                  </div>

                  {/* EXPLANATION */}

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {link.explanation ||
                      "No additional explanation available for this relationship."}
                  </p>

                  {/* STATISTICAL EVIDENCE */}

                  <div className="flex flex-wrap gap-4 text-[11px] font-mono text-slate-500 pt-1">

                    <span>
                      r = {safeNumber(correlation, 3)}
                    </span>

                    <span>
                      Granger p ={" "}
                      {isValidNumber(link.p_value)
                        ? safeNumber(pValue, 4)
                        : "N/A"}
                    </span>

                  </div>

                </article>

              );
            })}

          </div>

        )}

        {/* SCIENTIFIC INTERPRETATION NOTE */}

        <div className="mt-5 pt-4 border-t border-slate-100">

          <p className="text-[11px] text-slate-500 leading-relaxed">
            <strong className="text-slate-700">
              Interpretation note:
            </strong>{" "}
            Granger causality indicates whether past values of one
            variable provide statistical predictive information about
            another variable. It does not independently establish
            physical causation or confirm the actual root cause of an
            industrial fault.
          </p>

        </div>

      </section>

    </div>
  );
}

