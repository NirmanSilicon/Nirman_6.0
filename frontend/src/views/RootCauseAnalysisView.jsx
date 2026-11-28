import { ArrowRight, Cpu, GitCommitHorizontal } from "lucide-react";
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
 * Displays TreeSHAP feature attributions and Granger causal propagation links.
 */
export function RootCauseAnalysisView({ result, loading, onRunSimulation }) {
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

  const shapItems = (result.shap_evidence || []).map((ev) => ({
    ...ev,
    displayName: `${ev.sensor} (${ev.stat})`,
  }));
  const causalLinks = result.causal_links || [];

  return (
    <div className="space-y-6">
      {/* TreeSHAP Feature Attributions */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#00A8B5]/12 text-[#00A8B5] flex items-center justify-center">
            <Cpu className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">
              TreeSHAP Feature Attributions
            </h2>
            <p className="text-xs text-slate-500">
              Top rolling-window sensor features driving the diagnosis of{" "}
              <strong className="text-[#0F172A]">{result.root_cause.name}</strong>
            </p>
          </div>
        </div>

        {shapItems.length === 0 ? (
          <p className="py-6 text-sm text-slate-500 text-center">
            No SHAP attributions returned for this window.
          </p>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-center">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={shapItems}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 16, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="displayName"
                    width={145}
                    tick={{ fontSize: 11, fill: "#0F172A" }}
                  />
                  <ReferenceLine x={0} stroke="#94A3B8" />
                  <Tooltip
                    formatter={(val) => [formatNumber(val, 4), "SHAP Value"]}
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderColor: "#E2E8F0",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="shap_value" radius={[0, 8, 8, 0]} barSize={24}>
                    {shapItems.map((entry) => (
                      <Cell
                        key={entry.feature}
                        fill={entry.shap_value >= 0 ? "#00A8B5" : "#F43F5E"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-2.5">Sensor / Stat</th>
                    <th className="py-2.5 px-2.5">Label</th>
                    <th className="py-2.5 px-2.5 text-right">Value</th>
                    <th className="py-2.5 px-2.5 text-right">SHAP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shapItems.map((ev) => (
                    <tr key={ev.feature} className="hover:bg-[#F4F8FB]/70">
                      <td className="py-2.5 px-2.5 font-mono text-xs font-semibold text-[#0F172A]">
                        {ev.feature}
                      </td>
                      <td className="py-2.5 px-2.5 text-xs text-slate-600">
                        {ev.label || ev.sensor}{" "}
                        {ev.unit ? <span className="font-mono text-slate-400">({ev.unit})</span> : ""}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-xs tabular-nums">
                        {formatNumber(ev.feature_value, 4)}
                      </td>
                      <td
                        className={`py-2.5 px-2.5 text-right font-mono text-xs font-bold tabular-nums ${
                          ev.shap_value >= 0 ? "text-[#008B96]" : "text-rose-600"
                        }`}
                      >
                        {ev.shap_value >= 0 ? "+" : ""}
                        {formatNumber(ev.shap_value, 4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Granger Causal Propagation Links */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <GitCommitHorizontal className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">
              Granger Causal Propagation Chain
            </h2>
            <p className="text-xs text-slate-500">
              Directed lagged propagation links between priority alarm and SHAP-driving variables
            </p>
          </div>
        </div>

        {causalLinks.length === 0 ? (
          <p className="py-6 text-sm text-slate-500 text-center">
            No statistically significant lagged propagation links detected in this window (normal steady state or constant series).
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {causalLinks.map((link, idx) => (
              <article
                key={`${link.source}-${link.target}-${idx}`}
                className="rounded-2xl border border-slate-200/80 bg-[#F4F8FB]/70 p-4 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[#0F172A]">
                    {link.method}
                  </span>
                  <span className="text-xs font-semibold text-[#008B96] tabular-nums">
                    Strength {formatNumber(link.strength * 100, 1)}% • Lag {link.lag_minutes} min ({link.best_lag_steps} steps)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-[#0F172A]">
                  <span className="bg-white px-2.5 py-1 rounded-xl border border-slate-200">
                    {link.source_label || link.source}{" "}
                    <span className="font-mono text-xs text-slate-500">({link.source})</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-[#00A8B5] shrink-0" />
                  <span className="bg-white px-2.5 py-1 rounded-xl border border-slate-200">
                    {link.target_label || link.target}{" "}
                    <span className="font-mono text-xs text-slate-500">({link.target})</span>
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{link.explanation}</p>

                <div className="flex flex-wrap gap-4 text-[11px] font-mono text-slate-500 pt-1">
                  <span>r = {formatNumber(link.correlation, 3)}</span>
                  <span>
                    Granger p = {link.p_value !== null && link.p_value !== undefined ? formatNumber(link.p_value, 4) : "N/A"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
