
import { useMemo, useState } from "react";
import {
  Layers,
  Search,
  ShieldCheck,
} from "lucide-react";

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
import {
  CHART_COLORS,
  formatPct,
  getSeverityBadgeClass,
} from "../utils/formatters";

/**
 * View 5 — Fault Classification.
 *
 * Features:
 * 1. Primary diagnosed fault summary
 * 2. XGBoost top fault probability chart
 * 3. Searchable TEP fault catalog
 * 4. Severity-based filtering
 * 5. Active diagnosis highlighting
 */

export function FaultClassificationView({
  result,
  faults = [],
  loading = false,
  onRunSimulation,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");

  // --------------------------------------------------
  // 1. SAFE DATA
  // --------------------------------------------------

  const rootCause = result?.root_cause || {};

  const safeFaults = Array.isArray(faults)
    ? faults.filter(
        (fault) =>
          fault !== null &&
          typeof fault === "object"
      )
    : [];

  // --------------------------------------------------
  // 2. TOP FAULT PROBABILITIES
  // --------------------------------------------------

  const topCausesData = useMemo(() => {
    const causes = Array.isArray(result?.top_causes)
      ? result.top_causes
      : [];

    return causes
      .filter(
        (item) =>
          item &&
          Number.isFinite(Number(item.probability))
      )
      .map((item) => {
        const probability = Number(item.probability);

        return {
          ...item,
          label: `Fault ${item.fault_id ?? "—"}: ${
            item.name || "Unknown Fault"
          }`,
          pct: Number(
            (Math.max(0, Math.min(1, probability)) * 100).toFixed(2)
          ),
        };
      });
  }, [result]);

  // --------------------------------------------------
  // 3. SEARCH AND SEVERITY FILTER
  // --------------------------------------------------

  const filteredFaults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return safeFaults.filter((fault) => {
      const severity = String(
        fault.severity_level || "UNKNOWN"
      ).toUpperCase();

      const matchesSeverity =
        severityFilter === "ALL" ||
        severity === severityFilter;

      if (!matchesSeverity) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchableFields = [
        fault.fault_id,
        fault.name,
        fault.unit,
        fault.equipment_unit,
        fault.type,
        fault.description,
        fault.severity_level,
      ];

      return searchableFields.some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [safeFaults, searchTerm, severityFilter]);

  // --------------------------------------------------
  // 4. DIAGNOSIS STATE
  // --------------------------------------------------

  const hasDiagnosis = Boolean(result?.root_cause);

  const diagnosedFaultId = rootCause.fault_id;

  // --------------------------------------------------
  // 5. RENDER
  // --------------------------------------------------

  return (
    <div className="space-y-6">

      {/* ==============================================
          PRIMARY DIAGNOSIS + PROBABILITY CHART
      ============================================== */}

      {!hasDiagnosis ? (

        <EmptyStatePrompt
          title="No Active Fault Classification"
          description="Run a simulation to inspect multi-class XGBoost fault probabilities alongside the searchable TEP fault catalog below."
          onRun={onRunSimulation}
          loading={loading}
        />

      ) : (

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ==========================================
              PRIMARY DIAGNOSED FAULT
          ========================================== */}

          <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 flex flex-col justify-between">

            <div>

              <div className="flex items-center justify-between gap-2">

                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Primary Diagnosis
                </span>

                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${getSeverityBadgeClass(
                    rootCause.severity_level
                  )}`}
                >
                  {rootCause.severity_level || "UNKNOWN"}
                </span>

              </div>

              <h2 className="mt-2 text-xl font-bold text-[#0F172A]">
                Fault {rootCause.fault_id ?? "—"} —{" "}
                {rootCause.name || "Unknown Fault"}
              </h2>

              <p className="mt-1 text-xs font-medium text-[#008B96]">
                Equipment Unit:{" "}
                {rootCause.equipment_unit ||
                  rootCause.unit ||
                  "Not specified"}
              </p>

              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                {rootCause.summary ||
                  "No additional fault summary is available."}
              </p>

            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">

              <span className="text-xs font-medium text-slate-500">
                Model Confidence
              </span>

              <span className="text-2xl font-bold text-[#00A8B5] tabular-nums">
                {formatPct(rootCause.confidence, true)}
              </span>

            </div>

          </section>

          {/* ==========================================
              TOP FAULT PROBABILITY CHART
          ========================================== */}

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

            {topCausesData.length === 0 ? (

              <div className="h-56 flex items-center justify-center text-center px-4">

                <div>
                  <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />

                  <p className="text-sm font-semibold text-slate-600">
                    No probability data available
                  </p>

                  <p className="text-xs text-slate-400 mt-1">
                    The API did not return valid top fault candidates.
                  </p>
                </div>

              </div>

            ) : (

              <div
                className="h-56 w-full"
                role="img"
                aria-label="Horizontal bar chart showing XGBoost fault probability candidates"
              >

                <ResponsiveContainer width="100%" height="100%">

                  <BarChart
                    data={topCausesData}
                    layout="vertical"
                    margin={{
                      top: 4,
                      right: 24,
                      left: 12,
                      bottom: 4,
                    }}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#E2E8F0"
                      horizontal={false}
                    />

                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      unit="%"
                      tick={{
                        fontSize: 11,
                        fill: "#64748B",
                      }}
                    />

                    <YAxis
                      type="category"
                      dataKey="label"
                      width={190}
                      tick={{
                        fontSize: 11,
                        fill: "#0F172A",
                      }}
                    />

                    <Tooltip
                      formatter={(value) => [
                        `${Number(value).toFixed(2)}%`,
                        "Probability",
                      ]}
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        borderColor: "#E2E8F0",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                    />

                    <Bar
                      dataKey="pct"
                      radius={[0, 8, 8, 0]}
                      barSize={24}
                    >

                      {topCausesData.map((entry, index) => (
                        <Cell
                          key={`cause-${entry.fault_id ?? index}`}
                          fill={
                            CHART_COLORS[
                              index % CHART_COLORS.length
                            ]
                          }
                        />
                      ))}

                    </Bar>

                  </BarChart>

                </ResponsiveContainer>

              </div>

            )}

          </section>

        </div>

      )}

      {/* ==============================================
          SEARCHABLE TEP FAULT CATALOG
      ============================================== */}

      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">

        {/* HEADER */}

        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">

          <div className="flex items-center gap-2.5">

            <div className="w-9 h-9 rounded-xl bg-[#00A8B5]/12 text-[#00A8B5] flex items-center justify-center">
              <ShieldCheck className="w-4.5 h-4.5" aria-hidden="true" />
            </div>

            <div>

              <h3 className="text-base font-bold text-[#0F172A]">
                TEP Fault & Operating State Catalog (
                {filteredFaults.length}/{safeFaults.length})
              </h3>

              <p className="text-xs text-slate-500">
                Browse supported Tennessee Eastman Process classes and equipment units
              </p>

            </div>

          </div>

          {/* SEARCH + FILTER */}

          <div className="flex flex-wrap items-center gap-2.5">

            {/* SEARCH */}

            <div className="relative">

              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />

              <label
                htmlFor="fault-catalog-search"
                className="sr-only"
              >
                Search fault catalog
              </label>

              <input
                id="fault-catalog-search"
                type="search"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="Search fault name, unit, type..."
                className="pl-9 pr-3 py-1.5 rounded-xl bg-[#F4F8FB] border border-slate-200 text-xs sm:text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#00A8B5] w-60"
              />

            </div>

            {/* SEVERITY FILTER */}

            <div
              className="flex flex-wrap gap-1.5"
              aria-label="Filter faults by severity"
            >

              {[
                "ALL",
                "CRITICAL",
                "HIGH",
                "MEDIUM",
                "NORMAL",
              ].map((severity) => (

                <button
                  key={severity}
                  type="button"
                  onClick={() => setSeverityFilter(severity)}
                  aria-pressed={severityFilter === severity}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer ${
                    severityFilter === severity
                      ? "bg-[#00A8B5] text-white"
                      : "bg-[#F4F8FB] text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {severity}
                </button>

              ))}

            </div>

          </div>

        </div>

        {/* FAULT CARDS */}

        {filteredFaults.length === 0 ? (

          <div className="py-12 text-center">

            <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />

            <p className="text-sm font-semibold text-slate-600">
              No matching faults found
            </p>

            <p className="text-xs text-slate-400 mt-1">
              Try another search term or severity filter.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSeverityFilter("ALL");
              }}
              className="mt-3 text-xs font-semibold text-[#008B96] hover:underline"
            >
              Clear filters
            </button>

          </div>

        ) : (

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

            {filteredFaults.map((fault, index) => {

              const isDiagnosed =
                diagnosedFaultId !== undefined &&
                String(diagnosedFaultId) === String(fault.fault_id);

              const severity =
                fault.severity_level || "UNKNOWN";

              return (

                <article
                  key={fault.fault_id ?? `fault-${index}`}
                  className={`rounded-2xl p-4 border transition-colors ${
                    isDiagnosed
                      ? "bg-[#00A8B5]/5 border-[#00A8B5]"
                      : "bg-[#F4F8FB]/60 border-slate-200/80"
                  }`}
                >

                  {/* FAULT ID + SEVERITY */}

                  <div className="flex items-center justify-between gap-2">

                    <span className="font-mono text-xs font-bold text-[#008B96]">
                      STATUS {fault.fault_id ?? "—"} •{" "}
                      {fault.type || "Unknown"}
                    </span>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getSeverityBadgeClass(
                        severity
                      )}`}
                    >
                      {severity}
                    </span>

                  </div>

                  {/* FAULT NAME */}

                  <h4 className="mt-1.5 text-sm font-bold text-[#0F172A]">
                    {fault.name || "Unnamed Fault"}
                  </h4>

                  {/* DESCRIPTION */}

                  <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                    {fault.description || "No description available."}
                  </p>

                  {/* EQUIPMENT UNIT */}

                  <div className="mt-3 pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2 text-[11px] text-slate-500">

                    <span>
                      {fault.equipment_unit ||
                        fault.unit ||
                        "Equipment unit not specified"}
                    </span>

                    {isDiagnosed && (
                      <span className="font-bold text-[#008B96] shrink-0">
                        Active Match
                      </span>
                    )}

                  </div>

                </article>

              );
            })}

          </div>

        )}

      </section>

    </div>
  );
}
