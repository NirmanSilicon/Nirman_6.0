import { useEffect, useRef, useState } from "react";
import { BellRing, Download, FileSpreadsheet } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { analyzeAlarmLog } from "../api/client";
import {
  formatNumber,
  formatPct,
  formatTimestamp,
  getSeverityBadgeClass,
} from "../utils/formatters";

function buildSampleAlarmLogCsv() {
  const rows = [
    "event_id,timestamp,plant_id,tag,severity,value,threshold,unit,state,message",
    "ALM-2001,2026-11-28T14:00:00,alpha_plant,COOLANT_FLOW_LPM,LOW,108.4,112.0,L/min,ACTIVE,COOLANT_FLOW_LPM LOW limit breached",
    "ALM-2002,2026-11-28T14:00:00,alpha_plant,REACTOR_TEMP_C,HIGH,185.2,184.0,deg C,ACTIVE,REACTOR_TEMP_C HIGH limit breached",
    "ALM-2003,2026-11-28T14:03:00,alpha_plant,COOLANT_FLOW_LPM,LOW_LOW,97.5,100.0,L/min,ACTIVE,COOLANT_FLOW_LPM LOW_LOW limit breached",
    "ALM-2004,2026-11-28T14:03:00,alpha_plant,REACTOR_TEMP_C,HIGH,191.1,184.0,deg C,ACTIVE,REACTOR_TEMP_C HIGH limit breached",
    "ALM-2005,2026-11-28T14:03:00,alpha_plant,REACTOR_PRESS_BAR,HIGH,15.8,15.2,bar,ACTIVE,REACTOR_PRESS_BAR HIGH limit breached",
    "ALM-2006,2026-11-28T14:06:00,alpha_plant,COOLANT_FLOW_LPM,LOW_LOW,90.2,100.0,L/min,ACTIVE,COOLANT_FLOW_LPM LOW_LOW limit breached",
    "ALM-2007,2026-11-28T14:06:00,alpha_plant,REACTOR_TEMP_C,HIGH_HIGH,198.4,195.0,deg C,ACTIVE,REACTOR_TEMP_C HIGH_HIGH limit breached",
    "ALM-2008,2026-11-28T14:06:00,alpha_plant,REACTOR_PRESS_BAR,HIGH,16.7,15.2,bar,ACTIVE,REACTOR_PRESS_BAR HIGH limit breached",
    "ALM-2009,2026-11-28T14:09:00,alpha_plant,COOLANT_FLOW_LPM,LOW_LOW,82.1,100.0,L/min,ACTIVE,COOLANT_FLOW_LPM LOW_LOW limit breached",
    "ALM-2010,2026-11-28T14:09:00,alpha_plant,REACTOR_TEMP_C,HIGH_HIGH,206.3,195.0,deg C,ACTIVE,REACTOR_TEMP_C HIGH_HIGH limit breached",
    "ALM-2011,2026-11-28T14:09:00,alpha_plant,REACTOR_PRESS_BAR,HIGH_HIGH,17.9,17.0,bar,ACTIVE,REACTOR_PRESS_BAR HIGH_HIGH limit breached",
    "ALM-2012,2026-11-28T14:12:00,alpha_plant,COOLANT_FLOW_LPM,LOW_LOW,76.4,100.0,L/min,ACTIVE,COOLANT_FLOW_LPM LOW_LOW limit breached",
    "ALM-2013,2026-11-28T14:12:00,alpha_plant,REACTOR_TEMP_C,HIGH_HIGH,214.0,195.0,deg C,ACTIVE,REACTOR_TEMP_C HIGH_HIGH limit breached",
    "ALM-2014,2026-11-28T14:12:00,alpha_plant,REACTOR_PRESS_BAR,HIGH_HIGH,18.9,17.0,bar,ACTIVE,REACTOR_PRESS_BAR HIGH_HIGH limit breached",
    "ALM-2015,2026-11-28T14:15:00,alpha_plant,COOLANT_FLOW_LPM,LOW_LOW,75.8,100.0,L/min,ACTIVE,COOLANT_FLOW_LPM LOW_LOW limit breached",
    "ALM-2016,2026-11-28T14:15:00,alpha_plant,REACTOR_TEMP_C,HIGH_HIGH,219.2,195.0,deg C,ACTIVE,REACTOR_TEMP_C HIGH_HIGH limit breached",
    "ALM-2017,2026-11-28T14:15:00,alpha_plant,REACTOR_PRESS_BAR,HIGH_HIGH,19.7,17.0,bar,ACTIVE,REACTOR_PRESS_BAR HIGH_HIGH limit breached",
    "ALM-2018,2026-11-28T14:18:00,alpha_plant,COOLANT_FLOW_LPM,LOW_LOW,76.1,100.0,L/min,ACTIVE,COOLANT_FLOW_LPM LOW_LOW limit breached",
    "ALM-2019,2026-11-28T14:18:00,alpha_plant,REACTOR_TEMP_C,HIGH_HIGH,220.1,195.0,deg C,ACTIVE,REACTOR_TEMP_C HIGH_HIGH limit breached",
    "ALM-2020,2026-11-28T14:18:00,alpha_plant,REACTOR_PRESS_BAR,HIGH_HIGH,20.1,17.0,bar,ACTIVE,REACTOR_PRESS_BAR HIGH_HIGH limit breached",
  ];
  return rows.join("\n");
}

function formatAxisTime(rawTimestamp) {
  if (!rawTimestamp || rawTimestamp === "Unstamped") {
    return rawTimestamp || "—";
  }
  const parsed = new Date(rawTimestamp);
  if (Number.isNaN(parsed.getTime())) {
    return String(rawTimestamp);
  }
  return parsed.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AlarmLogAnalyzerCard({ onDownloadTextFile, onAlarmLogAnalyzed }) {
  const [logFile, setLogFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const abortControllerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleDownloadSample = () => {
    if (typeof onDownloadTextFile === "function") {
      onDownloadTextFile(
        buildSampleAlarmLogCsv(),
        "sample_alarm_log.csv",
        "text/csv;charset=utf-8;"
      );
    }
  };

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0] || null;
    setLogFile(null);
    setError(null);
    setResult(null);

    if (!selected) {
      return;
    }

    const lowerName = selected.name.toLowerCase();
    const isSupported =
      lowerName.endsWith(".csv") ||
      lowerName.endsWith(".json") ||
      selected.type === "text/csv" ||
      selected.type === "application/json";

    if (!isSupported) {
      setError("Please select a .csv or .json alarm log file.");
      event.target.value = "";
      return;
    }

    if (selected.size === 0) {
      setError("The selected alarm log file is empty.");
      event.target.value = "";
      return;
    }

    setLogFile(selected);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!logFile) {
      setError("Please select a CSV or JSON alarm log file to upload.");
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setAnalyzing(true);
    try {
      const response = await analyzeAlarmLog(logFile, {
        signal: controller.signal,
      });

      if (!mountedRef.current) return;

      if (!response || typeof response !== "object") {
        throw new Error("Invalid response returned by alarm log analyzer.");
      }

      setResult(response);
      if (typeof onAlarmLogAnalyzed === "function") {
        onAlarmLogAnalyzed(response);
      }
    } catch (err) {
      if (!mountedRef.current || controller.signal.aborted) {
        return;
      }
      setError(err?.message || "Failed to analyze alarm event log.");
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      if (mountedRef.current) {
        setAnalyzing(false);
      }
    }
  };

  const severityEntries = Object.entries(result?.severity_breakdown || {});
  const timeline = Array.isArray(result?.alarm_timeline)
    ? result.alarm_timeline
    : [];
  const priorityAlarms = Array.isArray(result?.priority_alarms)
    ? result.priority_alarms
    : [];

  return (
    <section className="xl:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-rose-600 border border-amber-200/70 flex items-center justify-center shrink-0">
            <BellRing className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">
              Alarm Log Flood Analyzer
            </h2>
            <p className="text-xs text-slate-500">
              Upload a raw alarm event log (.csv or .json) to suppress chatter
              and rank consolidated priority alarms
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownloadSample}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-[#F4F8FB] hover:bg-slate-100 text-xs font-semibold text-[#0F172A] transition-colors cursor-pointer shrink-0"
        >
          <Download className="w-3.5 h-3.5 text-[#00A8B5]" aria-hidden="true" />
          Sample Alarm Log
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div
            id="alarm-log-upload-heading"
            className="block text-xs font-semibold text-[#0F172A] mb-1.5"
          >
            Raw Alarm Event Log File
          </div>

          <label
            htmlFor="alarm-log-upload-input"
            className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-[#00A8B5] focus-within:border-[#00A8B5] focus-within:ring-2 focus-within:ring-[#00A8B5]/30 rounded-2xl bg-[#F4F8FB]/60 p-5 cursor-pointer transition-colors"
          >
            <FileSpreadsheet className="w-7 h-7 text-[#00A8B5] mb-2" aria-hidden="true" />
            <span className="text-xs font-semibold text-[#0F172A] text-center break-all">
              {logFile
                ? logFile.name
                : "Choose CSV or JSON alarm log (comma, semicolon, array, or {alarms})"}
            </span>
            <span
              id="alarm-log-upload-hint"
              className="text-[11px] text-slate-500 mt-1 text-center"
            >
              Supports flexible headers: tag/sensor, timestamp/time, severity/priority, value, threshold, unit, message
            </span>
            <input
              id="alarm-log-upload-input"
              type="file"
              accept=".csv,.json,text/csv,application/json"
              onChange={handleFileChange}
              aria-labelledby="alarm-log-upload-heading"
              aria-describedby="alarm-log-upload-hint"
              className="sr-only"
              disabled={analyzing}
            />
          </label>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={analyzing}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00A8B5] hover:bg-[#008B96] text-white text-sm font-semibold shadow-xs disabled:opacity-60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5] focus-visible:ring-offset-2"
        >
          <BellRing className="w-4 h-4" aria-hidden="true" />
          {analyzing ? "Analyzing Alarm Log..." : "Analyze Alarm Log"}
        </button>
      </form>

      {result && (
        <div className="mt-6 space-y-5">
          {/* KPI CHIPS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="rounded-2xl bg-[#F4F8FB] border border-slate-200 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Raw Events
              </div>
              <div className="text-2xl font-bold text-[#0F172A] mt-1 tabular-nums">
                {formatNumber(result.raw_event_count, 0)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 truncate">
                {String(result.format || "log").toUpperCase()} • {result.filename}
              </div>
            </div>

            <div className="rounded-2xl bg-[#F4F8FB] border border-slate-200 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Consolidated Alarms
              </div>
              <div className="text-2xl font-bold text-[#008B96] mt-1 tabular-nums">
                {formatNumber(result.consolidated_alarm_count, 0)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
                {formatNumber(result.suppressed_event_count, 0)} repeats suppressed
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
                Flood Reduction %
              </div>
              <div className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">
                {formatPct(result.reduction_pct)}
              </div>
              <div className="text-[11px] text-emerald-700/80 mt-1">
                Chatter deduplication ratio
              </div>
            </div>

            <div className="rounded-2xl bg-[#F4F8FB] border border-slate-200 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                First-Triggered Tag
              </div>
              <div className="text-lg font-bold font-mono text-[#0F172A] mt-1 truncate">
                {result.first_triggered_tag || "—"}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 truncate">
                {result.first_triggered_timestamp
                  ? formatTimestamp(result.first_triggered_timestamp)
                  : "Chronological onset"}
              </div>
            </div>
          </div>

          {/* SEVERITY BREAKDOWN PILLS */}
          {severityEntries.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 mr-1">
                Raw Event Severity Breakdown:
              </span>
              {severityEntries.map(([sev, count]) => (
                <span
                  key={sev}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tabular-nums ${getSeverityBadgeClass(
                    sev
                  )}`}
                >
                  <span>{sev}</span>
                  <span>({formatNumber(count, 0)})</span>
                </span>
              ))}
            </div>
          )}

          {/* ALARM TIMELINE CHART */}
          {timeline.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-[#F4F8FB]/50 p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Raw Alarm Flood Timeline
                </h3>
                <span className="text-[11px] text-slate-500">
                  Teal = total events • Rose = Critical / HH / LL events
                </span>
              </div>

              <figure className="h-56 w-full">
                <figcaption className="sr-only">
                  Bar chart showing alarm event counts grouped by timestamp
                </figcaption>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart
                    data={timeline}
                    margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={formatAxisTime}
                      tick={{ fontSize: 11, fill: "#64748B" }}
                      tickLine={false}
                      axisLine={{ stroke: "#CBD5E1" }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#64748B" }}
                      tickLine={false}
                      axisLine={{ stroke: "#CBD5E1" }}
                      width={36}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        borderColor: "#E2E8F0",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                      labelFormatter={(label) =>
                        label === "Unstamped"
                          ? "Unstamped"
                          : formatTimestamp(label)
                      }
                    />
                    <Bar
                      dataKey="count"
                      name="Raw Events"
                      fill="#00A8B5"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="critical_count"
                      name="Critical / HH / LL"
                      fill="#F43F5E"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </figure>
            </div>
          )}

          {/* CONSOLIDATED PRIORITY ALARMS TABLE */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left border-collapse text-sm">
              <caption className="sr-only">
                Consolidated alarm groups ranked by severity tier, event count,
                and earliest timestamp.
              </caption>
              <thead>
                <tr className="bg-[#F4F8FB] border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th scope="col" className="py-3 px-3">#</th>
                  <th scope="col" className="py-3 px-3">Tag</th>
                  <th scope="col" className="py-3 px-3">Severity</th>
                  <th scope="col" className="py-3 px-3 text-right">Raw Count</th>
                  <th scope="col" className="py-3 px-3 text-right">Suppressed</th>
                  <th scope="col" className="py-3 px-3">First Triggered</th>
                  <th scope="col" className="py-3 px-3">Last Seen</th>
                  <th scope="col" className="py-3 px-3 text-right">Latest Value</th>
                  <th scope="col" className="py-3 px-3">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {priorityAlarms.map((alarm, index) => (
                  <tr
                    key={`${alarm.tag}-${alarm.severity}`}
                    className="hover:bg-[#F4F8FB]/70"
                  >
                    <td className="py-3 px-3 text-xs font-mono text-slate-500 tabular-nums">
                      {index + 1}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-mono text-xs font-semibold text-[#0F172A]">
                        {alarm.tag}
                      </div>
                      {alarm.label && (
                        <div className="text-[11px] text-slate-500">
                          {alarm.label}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getSeverityBadgeClass(
                          alarm.severity
                        )}`}
                      >
                        {alarm.severity}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs font-semibold text-[#0F172A] tabular-nums">
                      {formatNumber(alarm.event_count, 0)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs text-emerald-700 tabular-nums">
                      {formatNumber(alarm.suppressed_count, 0)}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {alarm.first_timestamp
                        ? formatTimestamp(alarm.first_timestamp)
                        : "—"}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {alarm.last_timestamp
                        ? formatTimestamp(alarm.last_timestamp)
                        : "—"}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs text-slate-700 whitespace-nowrap tabular-nums">
                      {alarm.latest_value !== null && alarm.latest_value !== undefined
                        ? `${formatNumber(alarm.latest_value, 2)}${
                            alarm.unit ? ` ${alarm.unit}` : ""
                          }`
                        : "—"}
                    </td>
                    <td
                      title={alarm.message || undefined}
                      className="py-3 px-3 text-xs text-slate-600 max-w-xs truncate"
                    >
                      {alarm.message || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
