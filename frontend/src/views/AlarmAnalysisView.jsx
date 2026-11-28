
import { useId } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BellRing,
  ShieldAlert,
} from "lucide-react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyStatePrompt } from "../components/EmptyStatePrompt";
import {
  formatNumber,
  formatPct,
  getSeverityBadgeClass,
} from "../utils/formatters";

export function AlarmAnalysisView({
  result,
  loading,
  onRunSimulation,
}) {
  const chartId = useId().replace(/:/g, "");
  const gradientId = `alarmFloodGradient-${chartId}`;

  if (!result) {
    return (
      <EmptyStatePrompt
        title="No Alarm Flood Analysis Available"
        description="Run a simulation above to inspect threshold breaches, alarm consolidation, flood reduction, and priority alarms."
        onRun={onRunSimulation}
        loading={loading}
      />
    );
  }

  const alarmTrend = Array.isArray(result.alarm_trend)
    ? result.alarm_trend
    : [];

  const priorityAlarms = Array.isArray(result.priority_alarms)
    ? result.priority_alarms
    : [];

  const baseStep = Number.isFinite(Number(result.step_index))
    ? Number(result.step_index)
    : 0;

  const chartData = alarmTrend
    .map((count, index) => ({
      offset: index,
      step: baseStep + index,
      breaches: Number(count),
    }))
    .filter((item) => Number.isFinite(item.breaches));

  const onsetOffset = Number(result.onset_offset_in_window);

  const hasValidOnset =
    result.onset_offset_in_window !== null &&
    result.onset_offset_in_window !== undefined &&
    Number.isInteger(onsetOffset) &&
    onsetOffset >= 0 &&
    onsetOffset < chartData.length;

  const onsetStep = hasValidOnset
    ? chartData[onsetOffset].step
    : null;

  const rawAlarmCount = result.raw_alarm_count;
  const confirmedAlarmCount = result.confirmed_alarm_count;

  const hasAlarmData =
    Array.isArray(result.priority_alarms);

  const hasTrendData = chartData.length > 0;

  return (
    <div className="space-y-6">

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-semibold text-slate-500">
            Raw Threshold Breaches
          </p>
          <p className="mt-1.5 text-2xl font-bold text-[#0F172A] tabular-nums">
            {formatNumber(rawAlarmCount, 0)}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-semibold text-slate-500">
            Confirmed Priority Alarms
          </p>
          <p className="mt-1.5 text-2xl font-bold text-rose-600 tabular-nums">
            {formatNumber(confirmedAlarmCount, 0)}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-semibold text-slate-500">
            Flood Reduction
          </p>
          <p className="mt-1.5 text-2xl font-bold text-[#00A8B5] tabular-nums">
            {formatPct(result.reduction_pct)}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-semibold text-slate-500">
            First Triggered Sensor
          </p>

          <p className="mt-1.5 text-sm font-bold text-[#0F172A] truncate">
            {result.first_triggered_label ||
              result.first_triggered_tag ||
              "None"}
          </p>

          {result.first_triggered_tag && (
            <p className="text-[11px] font-mono text-slate-500">
              {result.first_triggered_tag}
            </p>
          )}
        </div>
      </div>

      {/* Alarm Trend Chart */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">

        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">

            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <BellRing className="w-[18px] h-[18px]" aria-hidden="true" />
            </div>

            <div>
              <h2 className="text-base font-bold text-[#0F172A]">
                Raw Threshold Breach Trend (|z| ≥ 3.0)
              </h2>

              <p className="text-xs text-slate-500">
                Per-step active raw alarms across the{" "}
                {result.window_size ?? alarmTrend.length}-step replay window
              </p>
            </div>
          </div>

          {hasValidOnset && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Fault Onset @ Step {onsetStep}
            </span>
          )}
        </div>

        {!hasTrendData ? (
          <p className="py-8 text-sm text-slate-500 text-center">
            No valid per-step alarm trend telemetry was returned.
            Run a TEP simulation to inspect step-by-step breaches.
          </p>
        ) : (
          <div
            className="h-72 w-full"
            role="img"
            aria-label="Area chart showing raw threshold breaches across the simulation window"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{
                  top: 14,
                  right: 16,
                  left: 0,
                  bottom: 4,
                }}
              >
                <defs>
                  <linearGradient
                    id={gradientId}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#F43F5E"
                      stopOpacity={0.28}
                    />
                    <stop
                      offset="95%"
                      stopColor="#F43F5E"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>

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
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  tickLine={false}
                  axisLine={{ stroke: "#CBD5E1" }}
                  width={42}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    borderColor: "#E2E8F0",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [
                    formatNumber(value, 0),
                    "Raw Breaches",
                  ]}
                  labelFormatter={(label) => `Step ${label}`}
                />

                {hasValidOnset && (
                  <ReferenceLine
                    x={onsetStep}
                    stroke="#DC2626"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    label={{
                      value: "Fault Onset",
                      position: "top",
                      fill: "#DC2626",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  />
                )}

                <Area
                  type="monotone"
                  dataKey="breaches"
                  name="Raw Breaches"
                  stroke="#E11D48"
                  strokeWidth={2.5}
                  fill={`url(#${gradientId})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Priority Alarms Table */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">

        <div className="flex items-center gap-2.5 mb-4">

          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <ShieldAlert className="w-[18px] h-[18px]" aria-hidden="true" />
          </div>

          <div>
            <h2 className="text-base font-bold text-[#0F172A]">
              ISA-18.2 Priority Alarms (Consolidated)
            </h2>

            <p className="text-xs text-slate-500">
              Alarm events ranked by severity and peak Z-score
            </p>
          </div>
        </div>

        {!hasAlarmData ? (
          <p className="py-6 text-sm text-slate-500 text-center">
            Priority alarm data is unavailable for this analysis.
          </p>
        ) : priorityAlarms.length === 0 ? (
          <p className="py-6 text-sm text-slate-500 text-center">
            Zero confirmed priority alarms in this window.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">

              <caption className="sr-only">
                Consolidated priority alarms with tag, label, unit,
                direction, severity, first step, and peak Z-score.
              </caption>

              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th scope="col" className="py-3 px-3">Tag</th>
                  <th scope="col" className="py-3 px-3">Label</th>
                  <th scope="col" className="py-3 px-3">Unit</th>
                  <th scope="col" className="py-3 px-3">Direction</th>
                  <th scope="col" className="py-3 px-3">Severity</th>
                  <th scope="col" className="py-3 px-3 text-right">First Step</th>
                  <th scope="col" className="py-3 px-3 text-right">Peak |z|</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {priorityAlarms.map((alarm, index) => {
                  const direction = String(
                    alarm.direction || "UNKNOWN"
                  ).toUpperCase();

                  const DirectionIcon =
                    direction === "HIGH"
                      ? ArrowUpRight
                      : direction === "LOW"
                        ? ArrowDownRight
                        : null;

                  return (
                    <tr
                      key={`${alarm.tag || "alarm"}-${alarm.first_step ?? index}`}
                      className="hover:bg-[#F4F8FB]/70"
                    >
                      <td className="py-3 px-3 font-mono text-xs font-semibold text-[#0F172A]">
                        {alarm.tag || "—"}
                      </td>

                      <td className="py-3 px-3 text-xs sm:text-sm font-medium text-[#0F172A]">
                        {alarm.label || "—"}
                      </td>

                      <td className="py-3 px-3 text-xs text-slate-500 font-mono">
                        {alarm.unit || "—"}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold ${
                            direction === "HIGH"
                              ? "text-rose-600"
                              : direction === "LOW"
                                ? "text-sky-600"
                                : "text-slate-500"
                          }`}
                        >
                          {DirectionIcon && (
                            <DirectionIcon
                              className="w-3.5 h-3.5"
                              aria-hidden="true"
                            />
                          )}
                          {direction}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getSeverityBadgeClass(
                            alarm.severity
                          )}`}
                        >
                          {alarm.severity || "UNKNOWN"}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-xs text-slate-700 tabular-nums">
                        {formatNumber(alarm.first_step, 0)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-xs font-bold text-[#0F172A] tabular-nums">
                        {formatNumber(alarm.peak_z, 2)}
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
