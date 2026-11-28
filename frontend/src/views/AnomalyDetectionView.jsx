
import { useMemo, useState } from "react";
import { Activity, Radio, Eye, EyeOff } from "lucide-react";

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

export function AnomalyDetectionView({
  result,
  loading,
  onRunSimulation,
}) {
  const [hiddenSensors, setHiddenSensors] = useState([]);

  const sensorTrends = result?.sensor_trends;

  const hasSensorTrends =
    sensorTrends !== null &&
    typeof sensorTrends === "object" &&
    !Array.isArray(sensorTrends);

  const sensorKeys = useMemo(
    () =>
      hasSensorTrends
        ? Object.keys(sensorTrends).filter(
            (key) => Array.isArray(sensorTrends[key])
          )
        : [],
    [hasSensorTrends, sensorTrends]
  );

  // Map sensor tags to readable descriptions.
  const sensorLabelMap = useMemo(() => {
    const map = {};

    if (result?.first_triggered_tag && result?.first_triggered_label) {
      map[result.first_triggered_tag] = result.first_triggered_label;
    }

    for (const evidence of result?.shap_evidence || []) {
      if (evidence?.sensor && evidence?.label) {
        map[evidence.sensor] = evidence.label;
      }
    }

    for (const alarm of result?.priority_alarms || []) {
      if (alarm?.tag && alarm?.label) {
        map[alarm.tag] = alarm.label;
      }
    }

    return map;
  }, [result]);

  // Prepare chart data while preserving missing readings as null.
  const chartData = useMemo(() => {
    if (sensorKeys.length === 0) return [];

    const maxLength = Math.max(
      0,
      ...sensorKeys.map((key) => sensorTrends[key].length)
    );

    const baseStep = Number.isFinite(Number(result?.step_index))
      ? Number(result.step_index)
      : 0;

    return Array.from({ length: maxLength }, (_, index) => {
      const point = {
        offset: index,
        step: baseStep + index,
      };

      for (const key of sensorKeys) {
        const value = sensorTrends[key][index];

        point[key] =
          value !== null &&
          value !== undefined &&
          value !== "" &&
          Number.isFinite(Number(value))
            ? Number(value)
            : null;
      }

      return point;
    });
  }, [result?.step_index, sensorKeys, sensorTrends]);

  // Calculate sensor statistics safely.
  const summaryRows = useMemo(() => {
    return sensorKeys.map((key, index) => {
      const values = sensorTrends[key]
        .map(Number)
        .filter(Number.isFinite);

      const min = values.length
        ? values.reduce((a, b) => Math.min(a, b), Infinity)
        : null;

      const max = values.length
        ? values.reduce((a, b) => Math.max(a, b), -Infinity)
        : null;

      const first = values.length ? values[0] : null;
      const latest = values.length
        ? values[values.length - 1]
        : null;

      return {
        tag: key,
        label: sensorLabelMap[key] || "Process Variable",
        color: CHART_COLORS[index % CHART_COLORS.length],
        min,
        max,
        latest,
        delta:
          first !== null && latest !== null
            ? latest - first
            : null,
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
    setHiddenSensors((previous) =>
      previous.includes(tag)
        ? previous.filter((item) => item !== tag)
        : [...previous, tag]
    );
  };

  const visibleSensors = sensorKeys.filter(
    (tag) => !hiddenSensors.includes(tag)
  );

  const inFaultRegime = Boolean(result.in_fault_regime);

  const onsetOffset =
    result.onset_offset_in_window;

  const hasValidOnset =
    onsetOffset !== null &&
    onsetOffset !== undefined &&
    Number.isInteger(Number(onsetOffset)) &&
    Number(onsetOffset) >= 0 &&
    Number(onsetOffset) < chartData.length;

  const onsetStep = hasValidOnset
    ? chartData[Number(onsetOffset)]?.step
    : null;

  const allSensorsVisible =
    hiddenSensors.length === 0 || visibleSensors.length === sensorKeys.length;

  return (
    <div className="space-y-6">

      {/* Operating Regime and First Triggered Sensor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Operating Regime Status
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <span
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                  inFaultRegime
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    inFaultRegime
                      ? "bg-rose-500"
                      : "bg-emerald-500"
                  }`}
                />

                {inFaultRegime
                  ? "Fault Regime Detected"
                  : "Normal Baseline Regime"}
              </span>

              {hasValidOnset && (
                <span className="text-xs font-medium text-slate-600">
                  Transition at window offset +{onsetOffset}
                </span>
              )}
            </div>
          </div>

          <div className="w-11 h-11 rounded-2xl bg-[#00A8B5]/10 text-[#00A8B5] flex items-center justify-center shrink-0">
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
              {result.first_triggered_tag ||
                "All sensors within ±3σ normal bounds"}
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
              Toggle individual sensors to isolate anomalies across the active window.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {sensorKeys.map((tag, index) => {
              const hidden = hiddenSensors.includes(tag);
              const color = CHART_COLORS[index % CHART_COLORS.length];

              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleSensor(tag)}
                  aria-pressed={!hidden}
                  aria-label={`${hidden ? "Show" : "Hide"} sensor ${tag}`}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5] ${
                    hidden
                      ? "bg-slate-50 text-slate-400 border-slate-200"
                      : "bg-white text-[#0F172A] border-slate-200 shadow-sm"
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: hidden ? "#CBD5E1" : color,
                    }}
                  />

                  <span className="font-mono">{tag}</span>
                </button>
              );
            })}

            {sensorKeys.length > 0 && (
              <button
                type="button"
                onClick={() => setHiddenSensors([])}
                disabled={allSensorsVisible}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-[#008B96] hover:bg-[#00A8B5]/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Eye className="w-3.5 h-3.5" />
                Show all
              </button>
            )}
          </div>
        </div>

        {chartData.length === 0 ? (
          <p className="py-8 text-sm text-slate-500 text-center">
            No valid sensor trend data is available for this payload.
          </p>
        ) : visibleSensors.length === 0 ? (
          <div className="py-8 text-center">
            <EyeOff className="w-6 h-6 mx-auto text-slate-400 mb-2" />
            <p className="text-sm text-slate-500">
              All sensors are hidden. Select a sensor or use Show all.
            </p>
          </div>
        ) : (
          <div
            className="h-80 w-full"
            role="img"
            aria-label="Multi-sensor line chart showing process sensor values across the simulation window."
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{
                  top: 14,
                  right: 16,
                  left: 0,
                  bottom: 4,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#E2E8F0"
                />

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
                  labelFormatter={(label) => `Step ${label}`}
                  formatter={(value, name) => [
                    formatNumber(value, 3),
                    name,
                  ]}
                />

                <Legend wrapperStyle={{ fontSize: "12px" }} />

                {hasValidOnset && (
                  <ReferenceLine
                    x={onsetStep}
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

                {visibleSensors.map((tag) => {
                  const colorIndex = sensorKeys.indexOf(tag);

                  return (
                    <Line
                      key={tag}
                      type="monotone"
                      dataKey={tag}
                      name={
                        sensorLabelMap[tag]
                          ? `${tag} (${sensorLabelMap[tag]})`
                          : tag
                      }
                      stroke={
                        CHART_COLORS[
                          colorIndex % CHART_COLORS.length
                        ]
                      }
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      connectNulls={false}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Sensor Range Summary */}
      {summaryRows.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
          <h3 className="text-sm font-bold text-[#0F172A] mb-3">
            Window Sensor Range Summary
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <caption className="sr-only">
                Sensor minimum, maximum, latest value and window change.
              </caption>

              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th scope="col" className="py-2.5 px-3">Sensor</th>
                  <th scope="col" className="py-2.5 px-3">Description</th>
                  <th scope="col" className="py-2.5 px-3 text-right">Min</th>
                  <th scope="col" className="py-2.5 px-3 text-right">Max</th>
                  <th scope="col" className="py-2.5 px-3 text-right">Latest</th>
                  <th scope="col" className="py-2.5 px-3 text-right">Window Δ</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {summaryRows.map((row) => (
                  <tr
                    key={row.tag}
                    className="hover:bg-[#F4F8FB]/70"
                  >
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#0F172A]">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: row.color }}
                        />
                        {row.tag}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-700">
                      {row.label}
                    </td>

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
                        row.delta === null
                          ? "text-slate-500"
                          : row.delta >= 0
                            ? "text-emerald-700"
                            : "text-rose-600"
                      }`}
                    >
                      {row.delta === null
                        ? "—"
                        : `${row.delta >= 0 ? "+" : ""}${formatNumber(row.delta, 3)}`}
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

