
import { useId, useMemo, useState } from "react";
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
 *
 * Displays:
 * 1. Plant and API health
 * 2. Current fault diagnosis
 * 3. Alarm consolidation metrics
 * 4. Process variable trends
 * 5. Recent simulation and operator activity
 */

export function DashboardView({
  health,
  activePlant,
  result,
  loading = false,
  onRunSimulation,
  activityLog = [],
  feedbackSummary,
}) {
  const [selectedSensor, setSelectedSensor] = useState("ALL");

  // Unique gradient ID prevents conflicts if multiple dashboard
  // instances are rendered on the same page.
  const chartId = useId().replace(/:/g, "");
  const gradientId = `tealAreaGradient-${chartId}`;

  // --------------------------------------------------
  // 1. ROOT CAUSE DATA
  // --------------------------------------------------

  const rootCause = result?.root_cause || {};

  // --------------------------------------------------
  // 2. SENSOR DATA
  // --------------------------------------------------

  const sensorTrends = result?.sensor_trends || null;

  const sensorKeys = useMemo(() => {
    if (
      !sensorTrends ||
      typeof sensorTrends !== "object" ||
      Array.isArray(sensorTrends)
    ) {
      return [];
    }

    return Object.keys(sensorTrends).filter(
      (key) => Array.isArray(sensorTrends[key])
    );
  }, [sensorTrends]);

  // Build sensor -> human-readable label map.
  // Labels can come from first-triggered sensor,
  // SHAP evidence, and priority alarms.

  const sensorLabelMap = useMemo(() => {
    const map = {};

    if (
      result?.first_triggered_tag &&
      result?.first_triggered_label
    ) {
      map[result.first_triggered_tag] =
        result.first_triggered_label;
    }

    const shapEvidence = Array.isArray(result?.shap_evidence)
      ? result.shap_evidence
      : [];

    for (const evidence of shapEvidence) {
      if (evidence?.sensor && evidence?.label) {
        map[evidence.sensor] = evidence.label;
      }
    }

    const priorityAlarms = Array.isArray(result?.priority_alarms)
      ? result.priority_alarms
      : [];

    for (const alarm of priorityAlarms) {
      if (alarm?.tag && alarm?.label) {
        map[alarm.tag] = alarm.label;
      }
    }

    return map;
  }, [result]);

  // Reset invalid selections automatically when the sensor
  // list changes after a new analysis.

  const effectiveSelection =
    selectedSensor !== "ALL" &&
    sensorKeys.includes(selectedSensor)
      ? selectedSensor
      : "ALL";

  // --------------------------------------------------
  // 3. PREPARE CHART DATA
  // --------------------------------------------------

  const chartData = useMemo(() => {
    if (sensorKeys.length === 0) {
      return [];
    }

    // Use the longest sensor array instead of assuming
    // every sensor has the same number of readings.

    const maxLength = Math.max(
      0,
      ...sensorKeys.map((key) => sensorTrends[key].length)
    );

    const rawStep = Number(result?.step_index);

    const baseStep = Number.isFinite(rawStep)
      ? rawStep
      : 0;

    return Array.from({ length: maxLength }, (_, index) => {
      const point = {
        offset: index,
        step: baseStep + index,
      };

      for (const key of sensorKeys) {
        const value = sensorTrends[key][index];

        // Preserve missing readings as null instead of
        // incorrectly converting them to zero.

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

  // --------------------------------------------------
  // 4. FAULT ONSET MARKER
  // --------------------------------------------------

  const rawOnsetOffset = result?.onset_offset_in_window;

  const onsetOffset =
    rawOnsetOffset !== null &&
    rawOnsetOffset !== undefined &&
    rawOnsetOffset !== "" &&
    Number.isInteger(Number(rawOnsetOffset))
      ? Number(rawOnsetOffset)
      : -1;

  const hasValidOnset =
    onsetOffset >= 0 &&
    onsetOffset < chartData.length;

  const onsetStep = hasValidOnset
    ? chartData[onsetOffset]?.step
    : null;

  // --------------------------------------------------
  // 5. RECENT ACTIVITY + FEEDBACK
  // --------------------------------------------------

  const mergedActivity = useMemo(() => {
    const safeActivity = Array.isArray(activityLog)
      ? activityLog
      : [];

    const recentEntries = Array.isArray(
      feedbackSummary?.recent_entries
    )
      ? feedbackSummary.recent_entries
      : [];

    const feedbackItems = recentEntries.map((entry, index) => ({
      id: `fb-${entry.timestamp || index}`,
      type: "feedback",
      timestamp: entry.timestamp,

      title: `Operator ${
        entry.action === "confirm" ? "confirmed" : "rejected"
      } Fault ${entry.fault_id ?? "—"} (${
        entry.fault_name || "Unknown"
      })`,

      detail:
        entry.notes ||
        (entry.corrected_fault_id !== null &&
        entry.corrected_fault_id !== undefined
          ? `Corrected to Fault ${entry.corrected_fault_id}`
          : `Episode ${entry.episode_id ?? "—"} • Step ${
              entry.step_index ?? "—"
            }`),

      severity:
        entry.action === "confirm" ? "NORMAL" : "HIGH",
    }));

    return [...safeActivity, ...feedbackItems]
      .sort((a, b) => {
        const dateA = new Date(
          a.timestamp || 0
        ).getTime();

        const dateB = new Date(
          b.timestamp || 0
        ).getTime();

        const safeDateA = Number.isFinite(dateA) ? dateA : 0;
        const safeDateB = Number.isFinite(dateB) ? dateB : 0;

        return safeDateB - safeDateA;
      })
      .slice(0, 12);
  }, [activityLog, feedbackSummary]);

  // --------------------------------------------------
  // 6. PLANT HEALTH
  // --------------------------------------------------

  const isHealthy =
    health?.status === "ok" &&
    health?.model_loaded === true;

  const healthLabel = isHealthy
    ? "API Healthy"
    : health?.status === "ok"
      ? "Model Unavailable"
      : "API Unavailable";

  // --------------------------------------------------
  // 7. SAFE KPI VALUES
  // --------------------------------------------------

  const rawAlarmCount = Number(result?.raw_alarm_count);
  const confirmedAlarmCount = Number(
    result?.confirmed_alarm_count
  );

  const safeRawAlarmCount = Number.isFinite(rawAlarmCount)
    ? rawAlarmCount
    : 0;

  const safeConfirmedAlarmCount = Number.isFinite(
    confirmedAlarmCount
  )
    ? confirmedAlarmCount
    : 0;

  const feedbackCount = Number(
    feedbackSummary?.total_feedback_count
  );

  // --------------------------------------------------
  // 8. RENDER DASHBOARD
  // --------------------------------------------------

  return (
    <div className="space-y-6">

      {/* ==============================================
          TOP STATUS CARDS
      ============================================== */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* CARD 1 — DATA STATUS */}

        <article className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex items-start justify-between gap-4">

          <div className="min-w-0">

            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Data Status
            </p>

            <h2 className="mt-1.5 text-lg font-bold text-[#0F172A] truncate">
              {activePlant?.plant_name ||
                health?.active_plant_name ||
                "Tennessee Eastman Process"}
            </h2>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">

              <span className="font-mono font-semibold text-[#008B96] tabular-nums">
                {activePlant?.n_sensors ?? 52} sensors
              </span>

              <span className="text-slate-300">•</span>

              <span>
                {health?.supported_faults ?? 12} classes
              </span>

              <span className="text-slate-300">•</span>

              <span
                className={`inline-flex items-center gap-1 font-semibold ${
                  isHealthy
                    ? "text-emerald-700"
                    : "text-amber-700"
                }`}
              >

                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isHealthy
                      ? "bg-emerald-500"
                      : "bg-amber-500"
                  }`}
                />

                {healthLabel}

              </span>

            </div>
          </div>

          <div className="w-11 h-11 rounded-2xl bg-[#00A8B5]/12 text-[#00A8B5] flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" aria-hidden="true" />
          </div>

        </article>

        {/* CARD 2 — FAULT STATUS */}

        <article className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex items-start justify-between gap-4">

          <div className="min-w-0">

            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Fault Status
            </p>

            <h2 className="mt-1.5 text-lg font-bold text-[#0F172A] truncate">
              {rootCause.name || "Awaiting Diagnosis"}
            </h2>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">

              {result ? (
                <>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${getSeverityBadgeClass(
                      rootCause.severity_level
                    )}`}
                  >
                    {rootCause.severity_level || "UNKNOWN"}
                  </span>

                  <span className="font-semibold text-[#0F172A] tabular-nums">
                    {formatPct(rootCause.confidence, true)} confidence
                  </span>
                </>
              ) : (
                <span className="text-slate-500">
                  Run a simulation to diagnose active fault
                </span>
              )}

            </div>

          </div>

          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              result && rootCause.fault_id !== 0
                ? "bg-rose-50 text-rose-500"
                : "bg-amber-50 text-amber-500"
            }`}
          >
            <AlertTriangle
              className="w-5 h-5"
              aria-hidden="true"
            />
          </div>

        </article>

        {/* CARD 3 — RECENT ANALYSIS */}

        <article className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex items-start justify-between gap-4">

          <div className="min-w-0">

            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Recent Analysis
            </p>

            <h2 className="mt-1.5 text-lg font-bold text-[#0F172A] tabular-nums">
              {result
                ? `${safeRawAlarmCount} → ${safeConfirmedAlarmCount} alarms`
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
                <span className="text-slate-500">
                  Run analysis to view consolidation metrics
                </span>
              )}

            </div>

          </div>

          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" aria-hidden="true" />
          </div>

        </article>

      </div>

      {/* ==============================================
          MAIN CONTENT GRID
      ============================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ============================================
            PROCESS VARIABLE TREND
        ============================================ */}

        <section className="xl:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">

          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">

            <div>

              <h3 className="text-base font-bold text-[#0F172A]">
                Process Variable Trend
              </h3>

              <p className="text-xs text-slate-500 mt-0.5">
                Top diagnostic sensors driving the active window
                (3-min sampling steps)
              </p>

            </div>

            {/* SENSOR SELECTOR */}

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
                onChange={(event) =>
                  setSelectedSensor(event.target.value)
                }
                className="bg-[#F4F8FB] border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#00A8B5] disabled:opacity-60"
              >

                <option value="ALL">
                  All Top Sensors
                </option>

                {sensorKeys.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                    {sensorLabelMap[tag]
                      ? ` — ${sensorLabelMap[tag]}`
                      : ""}
                  </option>
                ))}

              </select>

            </div>

          </div>

          {/* EMPTY CHART STATE */}

          {chartData.length === 0 ? (

            <EmptyStatePrompt
              title="Ready to Stream Process Variables"
              description="Run a simulation to inspect process sensor trajectories and identify changes around fault onset."
              onRun={onRunSimulation}
              loading={loading}
            />

          ) : (

            <div className="h-80 w-full">

              <ResponsiveContainer width="100%" height="100%">

                {/* ALL SENSOR VIEW */}

                {effectiveSelection === "ALL" ? (

                  <LineChart
                    data={chartData}
                    margin={{
                      top: 10,
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
                      tick={{
                        fontSize: 11,
                        fill: "#64748B",
                      }}
                      tickLine={false}
                      axisLine={{
                        stroke: "#CBD5E1",
                      }}
                    />

                    <YAxis
                      tick={{
                        fontSize: 11,
                        fill: "#64748B",
                      }}
                      tickLine={false}
                      axisLine={{
                        stroke: "#CBD5E1",
                      }}
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

                    <Legend
                      wrapperStyle={{
                        fontSize: "12px",
                      }}
                    />

                    {/* FAULT ONSET */}

                    {hasValidOnset && (
                      <ReferenceLine
                        x={onsetStep}
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

                    {/* SENSOR LINES */}

                    {sensorKeys.map((key, index) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        name={
                          sensorLabelMap[key]
                            ? `${key} (${sensorLabelMap[key]})`
                            : key
                        }
                        stroke={
                          CHART_COLORS[
                            index % CHART_COLORS.length
                          ]
                        }
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                        connectNulls={false}
                      />
                    ))}

                  </LineChart>

                ) : (

                  /* SINGLE SENSOR VIEW */

                  <AreaChart
                    data={chartData}
                    margin={{
                      top: 10,
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
                          stopColor="#00A8B5"
                          stopOpacity={0.28}
                        />

                        <stop
                          offset="95%"
                          stopColor="#00A8B5"
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
                      tick={{
                        fontSize: 11,
                        fill: "#64748B",
                      }}
                      tickLine={false}
                      axisLine={{
                        stroke: "#CBD5E1",
                      }}
                    />

                    <YAxis
                      tick={{
                        fontSize: 11,
                        fill: "#64748B",
                      }}
                      tickLine={false}
                      axisLine={{
                        stroke: "#CBD5E1",
                      }}
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

                    {/* FAULT ONSET */}

                    {hasValidOnset && (
                      <ReferenceLine
                        x={onsetStep}
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
                      fill={`url(#${gradientId})`}
                      connectNulls={false}
                    />

                  </AreaChart>

                )}

              </ResponsiveContainer>

            </div>

          )}

        </section>

        {/* ============================================
            RECENT ACTIVITY
        ============================================ */}

        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col">

          <div className="flex items-center justify-between gap-2 mb-4">

            <div>

              <h3 className="text-base font-bold text-[#0F172A]">
                Recent Activity
              </h3>

              <p className="text-xs text-slate-500 mt-0.5">
                Simulations, plant retrains & operator feedback
              </p>

            </div>

            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#F4F8FB] text-slate-600 tabular-nums">
              {Number.isFinite(feedbackCount)
                ? feedbackCount
                : 0} logged
            </span>

          </div>

          {/* NO ACTIVITY */}

          {mergedActivity.length === 0 ? (

            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 text-slate-500">

              <Clock className="w-8 h-8 text-slate-300 mb-2" />

              <p className="text-sm font-medium text-slate-600">
                No recent activity yet
              </p>

              <p className="text-xs text-slate-400 mt-1">
                Simulations, model retrains, and feedback entries
                appear here.
              </p>

            </div>

          ) : (

            /* ACTIVITY LIST */

            <ul className="space-y-3 overflow-y-auto max-h-80 pr-1">

              {mergedActivity.map((item, index) => {

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
                    key={item.id ?? `${item.type}-${index}`}
                    className="flex items-start gap-3 p-2.5 rounded-xl bg-[#F4F8FB]/70 border border-slate-100"
                  >

                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${badgeTone}`}
                    >
                      <Icon
                        className="w-4 h-4"
                        aria-hidden="true"
                      />
                    </div>

                    <div className="min-w-0 flex-1">

                      <p className="text-xs font-semibold text-[#0F172A] leading-snug">
                        {item.title || "Activity recorded"}
                      </p>

                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {item.detail || "No additional details"}
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
