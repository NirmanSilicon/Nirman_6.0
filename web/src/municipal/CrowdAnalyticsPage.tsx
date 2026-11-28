import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { api, describeApiError } from "../api/client";
import type {
  ZoneOut,
  Page,
  CrowdCurrentOut,
  SeriesOut,
  PeakHoursOut,
  LiveEvent,
} from "../api/types";
import { DataBadge } from "../components/DataBadge";
import { useLiveStream } from "../realtime/useLiveStream";

const METRIC_LABELS: Record<string, { label: string; unit: string }> = {
  vehicles: { label: "Vehicles", unit: "vehicles" },
  pedestrians: { label: "Pedestrians", unit: "pedestrians" },
  occupancy_pct: { label: "Occupancy", unit: "%" },
  density: { label: "Density", unit: "veh/m²" },
};

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CrowdAnalyticsPage(): JSX.Element {
  const [zones, setZones] = useState<ZoneOut[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");
  const [metric, setMetric] = useState<"vehicles" | "pedestrians" | "occupancy_pct" | "density">("vehicles");

  // Default range: last 7 days
  const [fromTime, setFromTime] = useState<string>(() => {
    const d = new Date(Date.now() - 7 * 86400000);
    return d.toISOString().slice(0, 16);
  });
  const [toTime, setToTime] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 16);
  });
  const [intervalMin, setIntervalMin] = useState<number>(15);

  const [current, setCurrent] = useState<CrowdCurrentOut | null>(null);
  const [series, setSeries] = useState<SeriesOut | null>(null);
  const [peaks, setPeaks] = useState<PeakHoursOut | null>(null);

  const [loadingZones, setLoadingZones] = useState<boolean>(true);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);

  const debounceTimerRef = useRef<number | null>(null);

  // Load zone list
  useEffect(() => {
    let active = true;
    async function fetchZones() {
      try {
        setLoadingZones(true);
        const res = await api<Page<ZoneOut>>("/zones?limit=200");
        if (active) {
          setZones(res.items);
          if (res.items.length > 0 && res.items[0] && !selectedZoneId) {
            setSelectedZoneId(res.items[0].id);
          }
        }
      } catch (err) {
        if (active) setError(describeApiError(err));
      } finally {
        if (active) setLoadingZones(false);
      }
    }
    fetchZones();
    return () => {
      active = false;
    };
  }, [selectedZoneId]);

  // Load analytics data for selected zone
  const loadZoneData = useCallback(
    async (zoneId: string, metricVal: typeof metric, fromVal: string, toVal: string, intervalVal: number) => {
      if (!zoneId) return;

      const fromIso = new Date(fromVal).toISOString();
      const toIso = new Date(toVal).toISOString();

      if (new Date(fromVal) >= new Date(toVal)) {
        setRangeError("Start time must be before end time");
        return;
      }
      const daysDiff = (new Date(toVal).getTime() - new Date(fromVal).getTime()) / 86400000;
      if (daysDiff > 31) {
        setRangeError("Date range cannot exceed 31 days");
        return;
      }
      setRangeError(null);
      setError(null);
      setLoadingData(true);

      try {
        const [currRes, seriesRes, peaksRes] = await Promise.all([
          api<CrowdCurrentOut>(`/crowd/zones/${zoneId}/current`),
          api<SeriesOut>(
            `/crowd/zones/${zoneId}/series?metric=${metricVal}&from=${encodeURIComponent(
              fromIso
            )}&to=${encodeURIComponent(toIso)}&interval_min=${intervalVal}`
          ),
          api<PeakHoursOut>(`/crowd/zones/${zoneId}/peak-hours?metric=${metricVal}&days=28`),
        ]);

        setCurrent(currRes);
        setSeries(seriesRes);
        setPeaks(peaksRes);
      } catch (err) {
        setError(describeApiError(err));
        setSeries(null);
        setPeaks(null);
      } finally {
        setLoadingData(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedZoneId) {
      loadZoneData(selectedZoneId, metric, fromTime, toTime, intervalMin);
    }
  }, [selectedZoneId, metric, fromTime, toTime, intervalMin, loadZoneData]);

  // Refetch current crowd only (debounced)
  const refreshCurrentOnly = useCallback(async () => {
    if (!selectedZoneId) return;
    try {
      const curr = await api<CrowdCurrentOut>(`/crowd/zones/${selectedZoneId}/current`);
      setCurrent(curr);
    } catch {
      // ignore transient live refresh errors
    }
  }, [selectedZoneId]);

  // SSE live stream hook
  const handleLiveEvent = useCallback(
    (e: LiveEvent) => {
      if (e.event === "crowd_changed") {
        const data = (e as unknown as { data: { zone_id?: string } }).data;
        if (data?.zone_id === selectedZoneId) {
          if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = window.setTimeout(() => {
            refreshCurrentOnly();
          }, 500);
        }
      }
    },
    [selectedZoneId, refreshCurrentOnly]
  );

  const handleResync = useCallback(() => {
    refreshCurrentOnly();
  }, [refreshCurrentOnly]);

  const { connected } = useLiveStream({
    onEvent: handleLiveEvent,
    onResync: handleResync,
    enabled: Boolean(selectedZoneId),
  });

  // Prepare series chart data
  const chartData = (series?.points ?? []).map((pt) => {
    const d = new Date(pt.ts);
    const label = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()
    ).padStart(2, "0")}`;
    return {
      label,
      value: pt.value,
      quality: pt.quality,
    };
  });

  const selectedZone = zones.find((z) => z.id === selectedZoneId);

  // Check peak history sufficiency
  const notEnoughHistory = Boolean(peaks && (peaks.n_days < 14 || peaks.by_hour.some((h) => h.p90 === null)));

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "2rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div>
          <h1 style={{ margin: "0 0 0.25rem 0", fontSize: "1.6rem", color: "#0f172a", fontWeight: 700 }}>
            Crowd &amp; Traffic Analytics
          </h1>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#64748b" }}>
            Municipal crowd telemetry, time series analysis, and peak hour distribution
          </p>
        </div>

        {!connected && (
          <div
            style={{
              padding: "0.35rem 0.75rem",
              borderRadius: "9999px",
              backgroundColor: "#fef3c7",
              color: "#92400e",
              fontSize: "0.8rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#d97706" }} />
            Live updates paused
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "flex-end",
          backgroundColor: "#f8fafc",
          padding: "1rem",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ minWidth: "220px", flex: "1 1 200px" }}>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.3rem" }}>
            Select Zone
          </label>
          <select
            value={selectedZoneId}
            onChange={(e) => setSelectedZoneId(e.target.value)}
            disabled={loadingZones}
            style={{ width: "100%", padding: "0.45rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.875rem" }}
          >
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name} ({z.kind})
              </option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: "160px", flex: "0 1 160px" }}>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.3rem" }}>
            Metric
          </label>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as typeof metric)}
            style={{ width: "100%", padding: "0.45rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.875rem" }}
          >
            <option value="vehicles">Vehicles</option>
            <option value="pedestrians">Pedestrians</option>
            <option value="occupancy_pct">Occupancy (%)</option>
            <option value="density">Density</option>
          </select>
        </div>

        <div style={{ minWidth: "180px", flex: "0 1 180px" }}>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.3rem" }}>
            From
          </label>
          <input
            type="datetime-local"
            value={fromTime}
            onChange={(e) => setFromTime(e.target.value)}
            style={{ width: "100%", padding: "0.45rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.875rem" }}
          />
        </div>

        <div style={{ minWidth: "180px", flex: "0 1 180px" }}>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.3rem" }}>
            To
          </label>
          <input
            type="datetime-local"
            value={toTime}
            onChange={(e) => setToTime(e.target.value)}
            style={{ width: "100%", padding: "0.45rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.875rem" }}
          />
        </div>

        <div style={{ minWidth: "110px", flex: "0 1 110px" }}>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.3rem" }}>
            Interval
          </label>
          <select
            value={intervalMin}
            onChange={(e) => setIntervalMin(parseInt(e.target.value, 10))}
            style={{ width: "100%", padding: "0.45rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.875rem" }}
          >
            <option value={5}>5 min</option>
            <option value={15}>15 min</option>
            <option value={60}>60 min</option>
          </select>
        </div>

        <div>
          <button
            type="button"
            onClick={() => loadZoneData(selectedZoneId, metric, fromTime, toTime, intervalMin)}
            disabled={loadingData}
            style={{
              padding: "0.48rem 1rem",
              borderRadius: "6px",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: loadingData ? "not-allowed" : "pointer",
            }}
          >
            {loadingData ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Inline Range or API Error */}
      {rangeError && (
        <div style={{ padding: "0.75rem", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "6px", marginBottom: "1rem", fontSize: "0.875rem" }}>
          {rangeError}
        </div>
      )}
      {error && (
        <div style={{ padding: "0.75rem", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "6px", marginBottom: "1rem", fontSize: "0.875rem" }}>
          Error loading crowd data: {error}
        </div>
      )}

      {/* Current Crowd Status Card */}
      {current && (
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            padding: "1.25rem",
            marginBottom: "1.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>
              Current Status — {selectedZone?.name ?? "Zone"}
            </h2>
            <DataBadge dataState={current.data_state} provenance={current.provenance} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
            {/* Level Card */}
            <div style={{ padding: "0.75rem", borderRadius: "6px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Crowd Level</div>
              <div style={{ marginTop: "0.4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span
                  style={{
                    padding: "0.25rem 0.6rem",
                    borderRadius: "4px",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    backgroundColor:
                      current.level === "high" || current.level === "very_high"
                        ? "#fee2e2"
                        : current.level === "moderate"
                        ? "#fef3c7"
                        : current.level === "low"
                        ? "#dcfce7"
                        : "#f1f5f9",
                    color:
                      current.level === "high" || current.level === "very_high"
                        ? "#991b1b"
                        : current.level === "moderate"
                        ? "#92400e"
                        : current.level === "low"
                        ? "#166534"
                        : "#475569",
                  }}
                >
                  {current.level.toUpperCase()}
                </span>
                {current.level === "unknown" && (
                  <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                    {current.data_state === "live" ? "Thresholds not configured" : "No live data"}
                  </span>
                )}
              </div>
            </div>

            {/* Vehicles (separate number) */}
            <div style={{ padding: "0.75rem", borderRadius: "6px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Vehicles</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#0f172a", marginTop: "0.2rem" }}>
                {current.vehicles !== null ? current.vehicles.toLocaleString() : "—"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Observed count</div>
            </div>

            {/* Pedestrians (separate number, never summed!) */}
            <div style={{ padding: "0.75rem", borderRadius: "6px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Pedestrians</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#0f172a", marginTop: "0.2rem" }}>
                {current.pedestrians !== null ? current.pedestrians.toLocaleString() : "—"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Observed count</div>
            </div>

            {/* Occupancy Pct */}
            <div style={{ padding: "0.75rem", borderRadius: "6px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Occupancy Rate</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#0f172a", marginTop: "0.2rem" }}>
                {current.occupancy_pct !== null ? `${current.occupancy_pct.toFixed(1)}%` : "—"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Live bays</div>
            </div>

            {/* Observed At */}
            <div style={{ padding: "0.75rem", borderRadius: "6px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Last Observed</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#334155", marginTop: "0.4rem" }}>
                {current.observed_at ? new Date(current.observed_at).toLocaleTimeString() : "No live data"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                {current.observed_at ? new Date(current.observed_at).toLocaleDateString() : "—"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Series Chart Card */}
      {!rangeError && series && (
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            padding: "1.25rem",
            marginBottom: "1.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
                Time Series: {METRIC_LABELS[metric]?.label ?? metric}
              </h3>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                Provenance: {series.provenance === "simulated" ? "Simulated data" : "Historical observed data"}
              </span>
            </div>
            <DataBadge dataState="live" provenance={series.provenance} />
          </div>

          {chartData.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#94a3b8", fontSize: "0.9rem" }}>
              No time series data points for the selected range.
            </div>
          ) : (
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} interval="preserveStartEnd" />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    domain={metric === "occupancy_pct" ? [0, 100] : ["auto", "auto"]}
                    unit={metric === "occupancy_pct" ? "%" : ""}
                  />
                  <Tooltip
                    content={({ active: tActive, payload }) => {
                      if (tActive && payload && payload.length) {
                        const pt = payload[0]?.payload as { label: string; value: number | null; quality?: string };
                        const suffix = pt.quality === "partial" ? " (partial coverage)" : "";
                        return (
                          <div
                            style={{
                              backgroundColor: "#1e293b",
                              color: "#ffffff",
                              padding: "8px 12px",
                              borderRadius: "6px",
                              fontSize: "12px",
                            }}
                          >
                            <div style={{ fontWeight: 600 }}>{pt.label}</div>
                            <div>
                              {METRIC_LABELS[metric]?.label}: {pt.value !== null ? `${pt.value} ${METRIC_LABELS[metric]?.unit}${suffix}` : "—"}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  {/* connectNulls={false}: Points with null value are rendered as gaps! */}
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={`${METRIC_LABELS[metric]?.label} (${METRIC_LABELS[metric]?.unit})`}
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Peak Hours Statistics */}
      {peaks && (
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            padding: "1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
                Peak Hours &amp; Day Distribution ({METRIC_LABELS[metric]?.label ?? metric})
              </h3>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                Calculated over {peaks.n_days} days of history
              </span>
            </div>
            <DataBadge dataState="live" provenance={peaks.provenance} />
          </div>

          {notEnoughHistory ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                backgroundColor: "#fffbeb",
                border: "1px dashed #f59e0b",
                borderRadius: "6px",
                color: "#92400e",
                fontSize: "0.9rem",
                fontWeight: 600,
              }}
            >
              ⚠️ Not enough history for peak statistics (minimum 14 days of telemetry required).
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              {/* 24-Hour Bar Chart */}
              <div>
                <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.85rem", color: "#475569" }}>By Hour of Day (0 - 23)</h4>
                <div style={{ width: "100%", height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={peaks.by_hour.map((h) => ({
                        hour: `${h.hour}:00`,
                        mean: h.mean,
                        p90: h.p90,
                      }))}
                      margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                      <XAxis dataKey="hour" fontSize={10} stroke="#94a3b8" interval={2} />
                      <YAxis fontSize={10} stroke="#94a3b8" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="mean" name="Mean" fill="#3b82f6" />
                      <Bar dataKey="p90" name="90th Percentile" fill="#93c5fd" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 7-Weekday Bar Chart */}
              <div>
                <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.85rem", color: "#475569" }}>By Day of Week</h4>
                <div style={{ width: "100%", height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={peaks.by_weekday.map((w) => ({
                        weekday: WEEKDAY_NAMES[w.weekday] ?? `D${w.weekday}`,
                        mean: w.mean,
                      }))}
                      margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                      <XAxis dataKey="weekday" fontSize={10} stroke="#94a3b8" />
                      <YAxis fontSize={10} stroke="#94a3b8" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="mean" name="Mean by Weekday" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
