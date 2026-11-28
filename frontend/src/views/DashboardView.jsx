import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Layers,
  MessageSquare,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import {
  Area,
  AreaChart,
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
import {
  CHART_COLORS,
  formatNumber,
  formatPct,
  formatTimestamp,
  getSeverityBadgeClass,
} from "../utils/formatters";

/**
 * View 1 — Plant Overview (Dashboard).
 * Displays 3 status cards, Process Variable Trend chart, and Recent Activity feed.
 */
export function DashboardView({
  health,
  activePlant,
  result,
  loading,
  onRunSimulation,
  activityLog,
  feedbackSummary,
}) {
  const [selectedSensor, setSelectedSensor] = useState("ALL");

  const sensorTrends = result?.sensor_trends || null;
  const sensorKeys = useMemo(
    () => (sensorTrends ? Object.keys(sensorTrends) : []),
    [sensorTrends],
  );

  // Build sensor -> human label map from priority_alarms and shap_evidence
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

  const effectiveSelection =
    selectedSensor !== "ALL" && sensorKeys.includes(selectedSensor)
      ? selectedSensor
      : "ALL";

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

  const mergedActivity = useMemo(() => {
    const feedbackItems = (feedbackSummary?.recent_entries || []).map((entry, idx) => ({
      id: `fb-${entry.timestamp || idx}`,
      type: "feedback",
      timestamp: entry.timestamp,
      title: `Operator ${entry.action === "confirm" ? "confirmed" : "rejected"} Fault ${entry.fault_id} (${entry.fault_name})`,
      detail:
        entry.notes ||
        (entry.corrected_fault_id !== null && entry.corrected_fault_id !== undefined
          ? `Corrected to Fault ${entry.corrected_fault_id}`
          : `Episode ${entry.episode_id ?? "—"} • Step ${entry.step_index ?? "—"}`),
      severity: entry.action === "confirm" ? "NORMAL" : "HIGH",
    }));

    return [...activityLog, ...feedbackItems]
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
      .slice(0, 12);
  }, [activityLog, feedbackSummary]);

  const isHealthy = health?.status === "ok" && health?.model_loaded;
  const onsetOffset = result?.onset_offset_in_window;

  return (
    <div className="space-y-6">
      {/* 3 Top Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Data Status */}
        <article className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Data Status
            </p>
            <h2 className="mt-1.5 text-lg font-bold text-[#0F172A] truncate">
              {activePlant?.plant_name || health?.active_plant_name || "Tennessee Eastman Process"}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="font-mono font-semibold text-[#008B96] tabular-nums">
                {activePlant?.n_sensors ?? 52} sensors
              </span>
              <span className="text-slate-300">•</span>
              <span>{health?.supported_faults ?? 12} classes</span>
              <span className="text-slate-300">•</span>
              <span
                className={`inline-flex items-center gap-1 font-semibold ${
                  isHealthy ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isHealthy ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                {isHealthy ? "API Healthy" : "Disconnected"}
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#00A8B5]/12 text-[#00A8B5] flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" aria-hidden="true" />
          </div>
        </article>

        {/* Card 2: Fault Status */}
        <article className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Fault Status
            </p>
            <h2 className="mt-1.5 text-lg font-bold text-[#0F172A] truncate">
              {result ? result.root_cause.name : "Awaiting Diagnosis"}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {result ? (
                <>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${getSeverityBadgeClass(
                      result.root_cause.severity_level,
                    )}`}
                  >
                    {result.root_cause.severity_level}
                  </span>
                  <span className="font-semibold text-[#0F172A] tabular-nums">
                    {formatPct(result.root_cause.confidence, true)} confidence
                  </span>
                </>
              ) : (
                <span className="text-slate-500">Run a simulation to diagnose active fault</span>
              )}
            </div>
          </div>
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              result && result.root_cause.fault_id !== 0
                ? "bg-rose-50 text-rose-500"
                : "bg-amber-50 text-amber-500"
            }`}
          >
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          </div>
        </article>

        {/* Card 3: Recent Analysis */}
        <article className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Recent Analysis
            </p>
            <h2 className="mt-1.5 text-lg font-bold text-[#0F172A] tabular-nums">
              {result
                ? `${result.raw_alarm_count} → ${result.confirmed_alarm_count} alarms`
                : "0 → 0 alarms"}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600 tabular-nums">
              {result ? (
                <>
                  <span className="font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                    {formatPct(result.reduction_pct)} flood reduction
                  </span>
                  <span className="font-mono text-slate-500">
                    {formatNumber(result.latency_ms, 1)} ms
                  </span>
                </>
              ) : (
                <span className="text-slate-500">ISA-18.2 consolidation metrics ready</span>
              )}
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" aria-hidden="true" />
          </div>
        </article>
      </div>

      {/* Main Content Grid: Process Variable Trend + Recent Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Process Variable Trend Card */}
        <section className="xl:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">
                Process Variable Trend
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Top diagnostic sensors driving the active window (3-min sampling steps)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label
                htmlFor="dashboard-variable-select"
                className="text-xs font-medium text-slate-500"
              >
                Select Variable
              </label>
              <select
                id="dashboard-variable-select"
                value={effectiveSelection}
                disabled={sensorKeys.length === 0}
                onChange={(e) => setSelectedSensor(e.target.value)}
                className="bg-[#F4F8FB] border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#00A8B5] disabled:opacity-60"
              >
                <option value="ALL">All Top Sensors</option>
                {sensorKeys.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag} {sensorLabelMap[tag] ? `— ${sensorLabelMap[tag]}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {chartData.length === 0 ? (
            <EmptyStatePrompt
              title="Ready to Stream Process Variables"
              description="Click Run above (or below) to replay Fault 6 — A Feed Loss with 20 pre-fault baseline steps and inspect sensor trajectories."
              onRun={onRunSimulation}
              loading={loading}
            />
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {effectiveSelection === "ALL" ? (
                  <LineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
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
                      width={52}
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
                        stroke="#EF4444"
                        strokeDasharray="4 4"
                        label={{
                          value: "Fault Onset",
                          position: "top",
                          fill: "#DC2626",
                          fontSize: 11,
                        }}
                      />
                    )}
                    {sensorKeys.map((key, idx) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        name={sensorLabelMap[key] ? `${key} (${sensorLabelMap[key]})` : key}
                        stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    ))}
                  </LineChart>
                ) : (
                  <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                    <defs>
                      <linearGradient id="tealAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00A8B5" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#00A8B5" stopOpacity={0.02} />
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
                      tick={{ fontSize: 11, fill: "#64748B" }}
                      tickLine={false}
                      axisLine={{ stroke: "#CBD5E1" }}
                      width={52}
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
                        stroke="#EF4444"
                        strokeDasharray="4 4"
                        label={{
                          value: "Fault Onset",
                          position: "top",
                          fill: "#DC2626",
                          fontSize: 11,
                        }}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey={effectiveSelection}
                      name={
                        sensorLabelMap[effectiveSelection]
                          ? `${effectiveSelection} (${sensorLabelMap[effectiveSelection]})`
                          : effectiveSelection
                      }
                      stroke="#00A8B5"
                      strokeWidth={2.5}
                      fill="url(#tealAreaGradient)"
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Recent Activity Card */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">Recent Activity</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Simulations, plant retrains & operator feedback
              </p>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#F4F8FB] text-slate-600 tabular-nums">
              {feedbackSummary?.total_feedback_count ?? 0} logged
            </span>
          </div>

          {mergedActivity.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 text-slate-500">
              <Clock className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-600">No recent activity yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Simulations, model retrains, and feedback entries appear here live.
              </p>
            </div>
          ) : (
            <ul className="space-y-3 overflow-y-auto max-h-80 pr-1">
              {mergedActivity.map((item) => {
                const Icon =
                  item.type === "retrain"
                    ? UploadCloud
                    : item.type === "feedback"
                      ? MessageSquare
                      : item.type === "plant"
                        ? CheckCircle2
                        : Sparkles;
                const badgeTone =
                  item.type === "retrain"
                    ? "bg-purple-50 text-purple-600"
                    : item.type === "feedback"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-[#00A8B5]/12 text-[#00A8B5]";

                return (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 p-2.5 rounded-xl bg-[#F4F8FB]/70 border border-slate-100"
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${badgeTone}`}>
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#0F172A] leading-snug">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {item.detail}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 mt-1">
                        {formatTimestamp(item.timestamp)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
