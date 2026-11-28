import { useMemo, useState } from "react";
import { Layers, Search, ShieldCheck } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyStatePrompt } from "../components/EmptyStatePrompt";
import { CHART_COLORS, formatPct, getSeverityBadgeClass } from "../utils/formatters";

/**
 * View 5 — Fault Classification.
 * Shows root_cause summary, top_causes Recharts probability chart, and searchable fault catalog.
 */
export function FaultClassificationView({
  result,
  faults,
  loading,
  onRunSimulation,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");

  const topCausesData = useMemo(() => {
    if (!result?.top_causes) return [];
    return result.top_causes.map((item) => ({
      ...item,
      label: `Fault ${item.fault_id}: ${item.name}`,
      pct: Number((item.probability * 100).toFixed(2)),
    }));
  }, [result]);

  const filteredFaults = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return (faults || []).filter((f) => {
      const matchesSeverity =
        severityFilter === "ALL" ||
        String(f.severity_level).toUpperCase() === severityFilter;
      if (!matchesSeverity) return false;
      if (!q) return true;
      return (
        String(f.fault_id).includes(q) ||
        f.name.toLowerCase().includes(q) ||
        f.unit.toLowerCase().includes(q) ||
        f.type.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q)
      );
    });
  }, [faults, searchTerm, severityFilter]);

  return (
    <div className="space-y-6">
      {!result ? (
        <EmptyStatePrompt
          title="No Active Fault Classification"
          description="Run a simulation to inspect multi-class XGBoost fault probabilities alongside the searchable TEP fault catalog below."
          onRun={onRunSimulation}
          loading={loading}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Primary Diagnosed Fault Summary */}
          <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Primary Diagnosis
                </span>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${getSeverityBadgeClass(
                    result.root_cause.severity_level,
                  )}`}
                >
                  {result.root_cause.severity_level}
                </span>
              </div>
              <h2 className="mt-2 text-xl font-bold text-[#0F172A]">
                Fault {result.root_cause.fault_id} — {result.root_cause.name}
              </h2>
              <p className="mt-1 text-xs font-medium text-[#008B96]">
                Equipment Unit: {result.root_cause.equipment_unit}
              </p>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                {result.root_cause.summary}
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Model Confidence</span>
              <span className="text-2xl font-bold text-[#00A8B5] tabular-nums">
                {formatPct(result.root_cause.confidence, true)}
              </span>
            </div>
          </section>

          {/* Top Causes Probability Bar Chart */}
          <section className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Layers className="w-4.5 h-4.5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">
                  Top Fault Probability Candidates
                </h3>
                <p className="text-xs text-slate-500">
                  XGBoost multi-class posterior probability ranking (%)
                </p>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topCausesData}
                  layout="vertical"
                  margin={{ top: 4, right: 24, left: 12, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    unit="%"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={190}
                    tick={{ fontSize: 11, fill: "#0F172A" }}
                  />
                  <Tooltip
                    formatter={(value) => [`${Number(value).toFixed(2)}%`, "Probability"]}
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderColor: "#E2E8F0",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="pct" radius={[0, 8, 8, 0]} barSize={24}>
                    {topCausesData.map((entry, idx) => (
                      <Cell
                        key={`cause-${entry.fault_id}`}
                        fill={CHART_COLORS[idx % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}

      {/* Searchable TEP Fault Catalog */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#00A8B5]/12 text-[#00A8B5] flex items-center justify-center">
              <ShieldCheck className="w-4.5 h-4.5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">
                TEP Fault & Operating State Catalog ({filteredFaults.length}/{faults.length})
              </h3>
              <p className="text-xs text-slate-500">
                Browse supported Tennessee Eastman Process classes and equipment units
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <label htmlFor="fault-catalog-search" className="sr-only">
                Search fault catalog
              </label>
              <input
                id="fault-catalog-search"
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search fault name, unit, type..."
                className="pl-9 pr-3 py-1.5 rounded-xl bg-[#F4F8FB] border border-slate-200 text-xs sm:text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#00A8B5] w-60"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {["ALL", "CRITICAL", "HIGH", "MEDIUM", "NORMAL"].map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer ${
                    severityFilter === sev
                      ? "bg-[#00A8B5] text-white"
                      : "bg-[#F4F8FB] text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredFaults.map((f) => {
            const isDiagnosed = result?.root_cause?.fault_id === f.fault_id;
            return (
              <article
                key={f.fault_id}
                className={`rounded-2xl p-4 border transition-colors ${
                  isDiagnosed
                    ? "bg-[#00A8B5]/5 border-[#00A8B5]"
                    : "bg-[#F4F8FB]/60 border-slate-200/80"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-[#008B96]">
                    STATUS {f.fault_id} • {f.type}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getSeverityBadgeClass(
                      f.severity_level,
                    )}`}
                  >
                    {f.severity_level}
                  </span>
                </div>
                <h4 className="mt-1.5 text-sm font-bold text-[#0F172A]">{f.name}</h4>
                <p className="mt-1 text-xs text-slate-600 line-clamp-2">{f.description}</p>
                <div className="mt-3 pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{f.equipment_unit}</span>
                  {isDiagnosed && (
                    <span className="font-bold text-[#008B96]">Active Match</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
