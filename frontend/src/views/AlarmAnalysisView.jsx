import { ArrowDownRight, ArrowUpRight, BellRing, ShieldAlert } from "lucide-react";
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
import { formatNumber, formatPct, getSeverityBadgeClass } from "../utils/formatters";

/**
 * View 3 — Alarm Analysis.
 * Visualizes ISA-18.2 alarm_trend with Fault Onset marker and ranked priority_alarms table.
 */
export function AlarmAnalysisView({ result, loading, onRunSimulation }) {
  if (!result) {
    return (
      <EmptyStatePrompt
        title="No Alarm Flood Analysis Available"
        description="Run a simulation above to compute ISA-18.2 on-delay suppression, alarm flood reduction percentage, and ranked priority alarms."
        onRun={onRunSimulation}
        loading={loading}
      />
    );
  }

  const alarmTrend = result.alarm_trend || [];
  const baseStep = typeof result.step_index === "number" ? result.step_index : 0;
  const chartData = alarmTrend.map((count, idx) => ({
    offset: idx,
    step: baseStep + idx,
    breaches: count,
  }));

  const onsetOffset = result.onset_offset_in_window;
  const priorityAlarms = result.priority_alarms || [];

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-semibold text-slate-500">Raw Threshold Breaches</p>
          <p className="mt-1.5 text-2xl font-bold text-[#0F172A] tabular-nums">
            {result.raw_alarm_count}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-semibold text-slate-500">Confirmed Priority Alarms</p>
          <p className="mt-1.5 text-2xl font-bold text-rose-600 tabular-nums">
            {result.confirmed_alarm_count}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-semibold text-slate-500">Flood Reduction</p>
          <p className="mt-1.5 text-2xl font-bold text-[#00A8B5] tabular-nums">
            {formatPct(result.reduction_pct)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-semibold text-slate-500">First Triggered Sensor</p>
          <p className="mt-1.5 text-sm font-bold text-[#0F172A] truncate">
            {result.first_triggered_label || result.first_triggered_tag || "None"}
          </p>
          {result.first_triggered_tag && (
            <p className="text-[11px] font-mono text-slate-500">{result.first_triggered_tag}</p>
          )}
        </div>
      </div>

      {/* Alarm Trend Chart */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <BellRing className="w-4.5 h-4.5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">
                Raw Threshold Breach Trend (|z| ≥ 3.0)
              </h2>
              <p className="text-xs text-slate-500">
                Per-step active raw alarms across the {result.window_size ?? alarmTrend.length}-step replay window
              </p>
            </div>
          </div>
          {onsetOffset !== null && onsetOffset !== undefined && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Fault Onset @ Step {chartData[onsetOffset]?.step}
            </span>
          )}
        </div>

        {chartData.length === 0 ? (
          <p className="py-8 text-sm text-slate-500 text-center">
            No per-step <code className="font-mono">alarm_trend</code> telemetry returned (run a TEP simulation to view step-by-step breaches).
          </p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 14, right: 16, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="alarmFloodGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
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
                />
                {onsetOffset !== null && onsetOffset !== undefined && (
                  <ReferenceLine
                    x={chartData[onsetOffset]?.step}
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
                  fill="url(#alarmFloodGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Ranked Priority Alarms Table */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <ShieldAlert className="w-4.5 h-4.5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">
              ISA-18.2 Priority Alarms (Consolidated)
            </h2>
            <p className="text-xs text-slate-500">
              Chattering suppressed via dynamic on-delay timers & ranked by severity and peak Z-score
            </p>
          </div>
        </div>

        {priorityAlarms.length === 0 ? (
          <p className="py-6 text-sm text-slate-500 text-center">
            Zero confirmed priority alarms in this window (normal steady-state operation).
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-3">Tag</th>
                  <th className="py-3 px-3">Label</th>
                  <th className="py-3 px-3">Unit</th>
                  <th className="py-3 px-3">Direction</th>
                  <th className="py-3 px-3">Severity</th>
                  <th className="py-3 px-3 text-right">First Step</th>
                  <th className="py-3 px-3 text-right">Peak |z|</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {priorityAlarms.map((alarm) => (
                  <tr key={`${alarm.tag}-${alarm.first_step}`} className="hover:bg-[#F4F8FB]/70">
                    <td className="py-3 px-3 font-mono text-xs font-semibold text-[#0F172A]">
                      {alarm.tag}
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
                          alarm.direction === "HIGH" ? "text-rose-600" : "text-sky-600"
                        }`}
                      >
                        {alarm.direction === "HIGH" ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        )}
                        {alarm.direction}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getSeverityBadgeClass(
                          alarm.severity,
                        )}`}
                      >
                        {alarm.severity}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {alarm.first_step}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs font-bold text-[#0F172A] tabular-nums">
                      {formatNumber(alarm.peak_z, 2)}
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
