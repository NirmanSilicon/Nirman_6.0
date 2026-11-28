import { useMemo, useState } from "react";
import { Activity, Radio } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyStatePrompt } from "../components/EmptyStatePrompt";
import { CHART_COLORS, formatNumber } from "../utils/formatters";

/**
 * View 4 — Anomaly Detection.
 * Multi-sensor sensor_trends visualization with sensor toggles and regime indicators.
 */
export function AnomalyDetectionView({ result, loading, onRunSimulation }) {
  const [hiddenSensors, setHiddenSensors] = useState([]);

  const sensorTrends = result?.sensor_trends || null;
  const sensorKeys = useMemo(
    () => (sensorTrends ? Object.keys(sensorTrends) : []),
    [sensorTrends],
  );

  const sensorLabelMap = useMemo(() => {
    const map = {};
    if (result?.first_triggered_tag && result?.first_triggered_label) {
      map[result.first_triggered_tag] = result.first_triggered_label;
    }
    for (const ev of result?.shap_evidence || []) {
      if (ev.sensor && ev.label) map[ev.sensor] = ev.label;
    }
    for (const al of result?.priority_alarms || []) {
      if (al.tag && al.label) map[al.tag] = al.label;
    }
    return map;
  }, [result]);

  const chartData = useMemo(() => {
    if (!sensorTrends || sensorKeys.length === 0) return [];
    const len = sensorTrends[sensorKeys[0]]?.length || 0;
    const baseStep = typeof result?.step_index === "number" ? result.step_index : 0;
    return Array.from({ length: len }, (_, idx) => {
      const point = { offset: idx, step: baseStep + idx };
      for (const key of sensorKeys) {
        point[key] = sensorTrends[key][idx];
      }
      return point;
    });
  }, [result?.step_index, sensorKeys, sensorTrends]);

  const summaryRows = useMemo(() => {
    if (!sensorTrends) return [];
    return sensorKeys.map((key, idx) => {
      const vals = sensorTrends[key] || [];
      const min = vals.length ? Math.min(...vals) : 0;
      const max = vals.length ? Math.max(...vals) : 0;
      const first = vals.length ? vals[0] : 0;
      const latest = vals.length ? vals[vals.length - 1] : 0;
      return {
        tag: key,
        label: sensorLabelMap[key] || "Process Variable",
        color: CHART_COLORS[idx % CHART_COLORS.length],
        min,
        max,
        latest,
        delta: latest - first,
      };
    });
  }, [sensorKeys, sensorLabelMap, sensorTrends]);

  if (!result) {
    return (
      <EmptyStatePrompt
        title="No Anomaly Telemetry Window Loaded"
        description="Run a fault simulation above to inspect multi-sensor anomaly trajectories, first-triggered sensor tags, and fault regime transitions."
        onRun={onRunSimulation}
        loading={loading}
      />
    );
  }

  const toggleSensor = (tag) => {
    setHiddenSensors((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag],
    );
  };

  const inFaultRegime = Boolean(result.in_fault_regime);
  const onsetOffset = result.onset_offset_in_window;

  return (
    <div className="space-y-6">
      {/* Regime & First Triggered Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Operating Regime Status
            </p>
            <div className="mt-2 flex items-center gap-2.5">
              <span
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                  inFaultRegime
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    inFaultRegime ? "bg-rose-500" : "bg-emerald-500"
                  }`}
                />
                {inFaultRegime ? "Fault Regime Detected" : "Normal Baseline Regime"}
              </span>
              {onsetOffset !== null && onsetOffset !== undefined && (
                <span className="text-xs font-medium text-slate-600">
                  Transition at window offset +{onsetOffset}
                </span>
              )}
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#00A8B5]/12 text-[#00A8B5] flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              First Triggered Anomaly Tag
            </p>
            <h2 className="mt-1.5 text-lg font-bold text-[#0F172A] truncate">
              {result.first_triggered_label || "No Initial Breach"}
            </h2>
            <p className="text-xs font-mono text-slate-500 mt-0.5">
              {result.first_triggered_tag || "All sensors within ±3σ normal bounds"}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Multi-Sensor Trends Chart */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">
              Multi-Sensor Anomaly Trajectories
            </h2>
            <p className="text-xs text-slate-500">
              Toggle individual sensors below to isolate anomalies across the active window
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {sensorKeys.map((tag, idx) => {
              const hidden = hiddenSensors.includes(tag);
              const color = CHART_COLORS[idx % CHART_COLORS.length];
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleSensor(tag)}
                  aria-pressed={!hidden}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                    hidden
                      ? "bg-slate-50 text-slate-400 border-slate-200"
                      : "bg-white text-[#0F172A] border-slate-200 shadow-2xs"
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: hidden ? "#CBD5E1" : color }}
                  />
                  <span className="font-mono">{tag}</span>
                </button>
              );
            })}
          </div>
        </div>

        {chartData.length === 0 ? (
          <p className="py-8 text-sm text-slate-500 text-center">
            No <code className="font-mono">sensor_trends</code> data available for this payload.
          </p>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 14, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="step"
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  tickLine={false}
                  axisLine={{ stroke: "#CBD5E1" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  tickLine={false}
                  axisLine={{ stroke: "#CBD5E1" }}
                  width={54}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    borderColor: "#E2E8F0",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                {onsetOffset !== null && onsetOffset !== undefined && (
                  <ReferenceLine
                    x={chartData[onsetOffset]?.step}
                    stroke="#DC2626"
                    strokeDasharray="4 4"
                    label={{
                      value: "Fault Onset",
                      position: "top",
                      fill: "#DC2626",
                      fontSize: 11,
                    }}
                  />
                )}
                {sensorKeys
                  .filter((tag) => !hiddenSensors.includes(tag))
                  .map((tag) => {
                    const colorIdx = sensorKeys.indexOf(tag);
                    return (
                      <Line
                        key={tag}
                        type="monotone"
                        dataKey={tag}
                        name={sensorLabelMap[tag] ? `${tag} (${sensorLabelMap[tag]})` : tag}
                        stroke={CHART_COLORS[colorIdx % CHART_COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    );
                  })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Accessible Numeric Summary Table */}
      {summaryRows.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
          <h3 className="text-sm font-bold text-[#0F172A] mb-3">
            Window Sensor Range Summary
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-3">Sensor</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Min</th>
                  <th className="py-2.5 px-3 text-right">Max</th>
                  <th className="py-2.5 px-3 text-right">Latest</th>
                  <th className="py-2.5 px-3 text-right">Window Δ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summaryRows.map((row) => (
                  <tr key={row.tag} className="hover:bg-[#F4F8FB]/70">
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#0F172A] flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: row.color }}
                      />
                      {row.tag}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{row.label}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {formatNumber(row.min, 3)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {formatNumber(row.max, 3)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums">
                      {formatNumber(row.latest, 3)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-semibold tabular-nums ${
                        row.delta >= 0 ? "text-emerald-700" : "text-rose-600"
                      }`}
                    >
                      {row.delta >= 0 ? "+" : ""}
                      {formatNumber(row.delta, 3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
