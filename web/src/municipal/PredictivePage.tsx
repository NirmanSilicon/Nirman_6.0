import React, { useState, useEffect, useCallback } from "react";
import {
  ComposedChart,
  Line,
  Area,
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
  ForecastOut,
  AvailabilityOut,
  ModelVersionOut,
} from "../api/types";
import { DataBadge } from "../components/DataBadge";

const TARGET_LABELS: Record<string, { label: string; unit: string }> = {
  occupancy_pct: { label: "Occupancy Rate", unit: "%" },
  vehicle_count: { label: "Vehicle Count", unit: "vehicles" },
  pedestrian_count: { label: "Pedestrian Count", unit: "pedestrians" },
};

export default function PredictivePage(): JSX.Element {
  const [zones, setZones] = useState<ZoneOut[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");
  const [target, setTarget] = useState<"occupancy_pct" | "vehicle_count" | "pedestrian_count">("occupancy_pct");
  const [horizonH, setHorizonH] = useState<number>(24);

  const [forecast, setForecast] = useState<ForecastOut | null>(null);
  const [models, setModels] = useState<ModelVersionOut[]>([]);

  // Arrival availability estimate state
  const [arrivalTime, setArrivalTime] = useState<string>(() => {
    const d = new Date(Date.now() + 2 * 3600000);
    return d.toISOString().slice(0, 16);
  });
  const [availability, setAvailability] = useState<AvailabilityOut | null>(null);
  const [availLoading, setAvailLoading] = useState<boolean>(false);
  const [availError, setAvailError] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load zone list
  useEffect(() => {
    let active = true;
    async function fetchZones() {
      try {
        const res = await api<Page<ZoneOut>>("/zones?limit=200");
        if (active) {
          setZones(res.items);
          if (res.items.length > 0 && res.items[0] && !selectedZoneId) {
            setSelectedZoneId(res.items[0].id);
          }
        }
      } catch (err) {
        if (active) setError(describeApiError(err));
      }
    }
    fetchZones();
    return () => {
      active = false;
    };
  }, [selectedZoneId]);

  // Load forecast & models registry
  const loadForecastAndModels = useCallback(
    async (zoneId: string, targetMetric: typeof target, horizon: number) => {
      if (!zoneId) return;
      setLoading(true);
      setError(null);

      try {
        const [forecastRes, modelsRes] = await Promise.all([
          api<ForecastOut>(`/forecast/zones/${zoneId}?target=${targetMetric}&horizon_h=${horizon}`),
          api<ModelVersionOut[]>(`/forecast/models?target=${targetMetric}`),
        ]);
        setForecast(forecastRes);
        setModels(modelsRes);
      } catch (err) {
        setError(describeApiError(err));
        setForecast(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedZoneId) {
      loadForecastAndModels(selectedZoneId, target, horizonH);
    }
  }, [selectedZoneId, target, horizonH, loadForecastAndModels]);

  // Estimate availability handler
  const handleEstimateAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedZoneId || !arrivalTime) return;

    setAvailLoading(true);
    setAvailError(null);
    try {
      const isoArrival = new Date(arrivalTime).toISOString();
      const res = await api<AvailabilityOut>("/availability/estimate", {
        method: "POST",
        body: {
          zone_id: selectedZoneId,
          arrival_time: isoArrival,
        },
      });
      setAvailability(res);
    } catch (err) {
      setAvailError(describeApiError(err));
      setAvailability(null);
    } finally {
      setAvailLoading(false);
    }
  };

  const selectedZone = zones.find((z) => z.id === selectedZoneId);

  // Transform forecast data points for Recharts
  const chartPoints = (forecast?.points ?? []).map((pt) => {
    const d = new Date(pt.target_ts);
    const label = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:00`;
    const hasBand = pt.lower !== null && pt.upper !== null;
    return {
      label,
      mean: pt.mean,
      lower: hasBand ? pt.lower : null,
      upper: hasBand ? pt.upper : null,
    };
  });

  const hasSimulatedModels = models.some((m) => m.trained_on === "simulated" || m.trained_on === "mixed");

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "2rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ margin: "0 0 0.25rem 0", fontSize: "1.6rem", color: "#0f172a", fontWeight: 700 }}>
          Predictive Analytics &amp; Demand Forecasting
        </h1>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "#64748b" }}>
          Short-to-medium horizon baseline forecasts, availability simulations, and model performance registry
        </p>
      </div>

      {/* Control Bar */}
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
            style={{ width: "100%", padding: "0.45rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.875rem" }}
          >
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name} ({z.kind})
              </option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: "180px", flex: "0 1 180px" }}>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.3rem" }}>
            Forecast Target
          </label>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value as typeof target)}
            style={{ width: "100%", padding: "0.45rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.875rem" }}
          >
            <option value="occupancy_pct">Occupancy Rate (%)</option>
            <option value="vehicle_count">Vehicle Count</option>
            <option value="pedestrian_count">Pedestrian Count</option>
          </select>
        </div>

        <div style={{ minWidth: "140px", flex: "0 1 140px" }}>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.3rem" }}>
            Forecast Horizon
          </label>
          <select
            value={horizonH}
            onChange={(e) => setHorizonH(parseInt(e.target.value, 10))}
            style={{ width: "100%", padding: "0.45rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.875rem" }}
          >
            <option value={12}>12 Hours</option>
            <option value={24}>24 Hours (1 Day)</option>
            <option value={48}>48 Hours (2 Days)</option>
            <option value={72}>72 Hours (3 Days)</option>
            <option value={168}>168 Hours (1 Week)</option>
          </select>
        </div>

        <div>
          <button
            type="button"
            onClick={() => loadForecastAndModels(selectedZoneId, target, horizonH)}
            disabled={loading}
            style={{
              padding: "0.48rem 1rem",
              borderRadius: "6px",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Loading..." : "Update Forecast"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "0.75rem", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "6px", marginBottom: "1rem", fontSize: "0.875rem" }}>
          Error loading forecast: {error}
        </div>
      )}

      {/* Forecast Card */}
      {forecast && (
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
          {/* Header Metadata */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
            <div>
              <h2 style={{ margin: "0 0 0.25rem 0", fontSize: "1.15rem", fontWeight: 700, color: "#1e293b" }}>
                Demand Forecast: {TARGET_LABELS[target]?.label ?? target} — {selectedZone?.name ?? "Zone"}
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", fontSize: "0.8rem", color: "#64748b" }}>
                <span><strong>Model:</strong> {forecast.model_version ?? "—"}</span>
                <span><strong>Confidence:</strong> {forecast.interval_level !== null ? `${forecast.interval_level}% Interval` : "—"}</span>
                <span><strong>Generated:</strong> {forecast.generated_at ? new Date(forecast.generated_at).toLocaleString() : "—"}</span>
              </div>
            </div>
            <DataBadge dataState="live" provenance={forecast.provenance} />
          </div>

          {/* Prominent Training Labels */}
          {forecast.trained_on === "simulated" && (
            <div
              style={{
                padding: "0.6rem 0.9rem",
                borderRadius: "6px",
                backgroundColor: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1e40af",
                fontSize: "0.825rem",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span style={{ fontWeight: 700 }}>Trained on simulated data.</span>
              <span>Accuracy on real traffic is unverified.</span>
            </div>
          )}
          {forecast.trained_on === "none" && (
            <div
              style={{
                padding: "0.6rem 0.9rem",
                borderRadius: "6px",
                backgroundColor: "#fef3c7",
                border: "1px solid #fde68a",
                color: "#92400e",
                fontSize: "0.825rem",
                marginBottom: "1rem",
                fontWeight: 600,
              }}
            >
              Seasonal baseline, no local training data.
            </div>
          )}

          {/* If status === "unavailable", show notice and NO chart! */}
          {forecast.status === "unavailable" ? (
            <div
              style={{
                padding: "2.5rem",
                textAlign: "center",
                backgroundColor: "#f8fafc",
                borderRadius: "6px",
                border: "1px dashed #cbd5e1",
                color: "#64748b",
              }}
            >
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#991b1b", marginBottom: "0.5rem" }}>
                Forecast Unavailable
              </div>
              <p style={{ margin: 0, fontSize: "0.875rem" }}>
                {forecast.reason ?? "Telemetry is insufficient or offline to generate reliable predictions."}
              </p>
            </div>
          ) : (
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartPoints} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} interval="preserveStartEnd" />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    domain={target === "occupancy_pct" ? [0, 100] : ["auto", "auto"]}
                    unit={target === "occupancy_pct" ? "%" : ""}
                  />
                  <Tooltip
                    content={({ active: tActive, payload }) => {
                      if (tActive && payload && payload.length) {
                        const pt = payload[0]?.payload as { label: string; mean: number; lower: number | null; upper: number | null };
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
                            <div>Mean: {pt.mean} {TARGET_LABELS[target]?.unit}</div>
                            {pt.lower !== null && pt.upper !== null && (
                              <div style={{ fontSize: "11px", color: "#93c5fd" }}>
                                Range: {pt.lower} - {pt.upper} {TARGET_LABELS[target]?.unit}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  {/* Shaded confidence band between lower and upper */}
                  <Area
                    type="monotone"
                    dataKey="upper"
                    name="Upper Bound (90%)"
                    stroke="none"
                    fill="#93c5fd"
                    fillOpacity={0.25}
                    connectNulls={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="lower"
                    name="Lower Bound (90%)"
                    stroke="none"
                    fill="#ffffff"
                    fillOpacity={1}
                    connectNulls={false}
                  />
                  {/* Mean Forecast Line */}
                  <Line
                    type="monotone"
                    dataKey="mean"
                    name={`Forecast Mean (${TARGET_LABELS[target]?.unit})`}
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Arrival Availability Estimate Simulator */}
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
        <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.05rem", fontWeight: 700, color: "#1e293b" }}>
          Arrival Availability Monte Carlo Simulation
        </h3>
        <p style={{ margin: "0 0 1rem 0", fontSize: "0.85rem", color: "#64748b" }}>
          Simulates arrival bay vacancy probability and uncertainty distribution for a scheduled future arrival time.
        </p>

        <form onSubmit={handleEstimateAvailability} style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.25rem" }}>
              Estimated Arrival Time
            </label>
            <input
              type="datetime-local"
              required
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
              style={{ padding: "0.45rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.875rem" }}
            />
          </div>

          <button
            type="submit"
            disabled={availLoading || !selectedZoneId}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "6px",
              backgroundColor: "#059669",
              color: "#ffffff",
              border: "none",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: availLoading ? "not-allowed" : "pointer",
            }}
          >
            {availLoading ? "Simulating..." : "Estimate Availability"}
          </button>
        </form>

        {availError && (
          <div style={{ marginTop: "1rem", padding: "0.75rem", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "6px", fontSize: "0.85rem" }}>
            {availError}
          </div>
        )}

        {/* Availability Result Card */}
        {availability && (
          <div
            style={{
              marginTop: "1.25rem",
              padding: "1rem",
              borderRadius: "6px",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1e293b" }}>
                Simulation Result: {availability.status.toUpperCase()}
              </div>
              <DataBadge dataState={availability.data_state} provenance={availability.provenance} />
            </div>

            {availability.status === "unavailable" ? (
              <div style={{ color: "#991b1b", fontSize: "0.875rem" }}>
                <strong>Estimate unavailable:</strong> {availability.reason ?? "No live telemetry available"}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem" }}>
                {/* Probability */}
                <div style={{ padding: "0.5rem", borderRadius: "4px", backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Vacancy Probability</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#059669" }}>
                    {availability.probability !== null ? `${availability.probability.toFixed(1)}%` : "Estimate unavailable"}
                  </div>
                </div>

                {/* Expected Available */}
                <div style={{ padding: "0.5rem", borderRadius: "4px", backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Expected Available</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1e293b" }}>
                    {availability.expected_available !== null ? availability.expected_available : "—"}
                  </div>
                </div>

                {/* Uncertainty 10th-90th */}
                <div style={{ padding: "0.5rem", borderRadius: "4px", backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Uncertainty (P10 - P90)</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#1e293b" }}>
                    {availability.uncertainty && availability.uncertainty.lower !== null && availability.uncertainty.upper !== null
                      ? `${availability.uncertainty.lower} - ${availability.uncertainty.upper} bays`
                      : "—"}
                  </div>
                </div>

                {/* Reliability */}
                <div style={{ padding: "0.5rem", borderRadius: "4px", backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Reliability</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#334155" }}>
                    {availability.reliability}
                  </div>
                </div>

                {/* Simulations & Method */}
                <div style={{ padding: "0.5rem", borderRadius: "4px", backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Method &amp; Iterations</div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>
                    {availability.method} ({availability.n_simulations ?? "—"} runs)
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                    Freshness: {availability.data_freshness_s !== null ? `${availability.data_freshness_s}s` : "—"}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Model Performance Registry Table */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          padding: "1.25rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ marginBottom: "0.75rem" }}>
          <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1.05rem", fontWeight: 700, color: "#1e293b" }}>
            Model Registry &amp; Evaluation Metrics
          </h3>
          {hasSimulatedModels && (
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b", fontStyle: "italic" }}>
              Note: Metrics on simulated data are not evidence of real-world accuracy.
            </p>
          )}
        </div>

        {models.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8", fontSize: "0.875rem" }}>
            No models registered for target {target}.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                  <th style={{ padding: "0.6rem 0.75rem", color: "#475569" }}>Name</th>
                  <th style={{ padding: "0.6rem 0.75rem", color: "#475569" }}>Version</th>
                  <th style={{ padding: "0.6rem 0.75rem", color: "#475569" }}>Kind</th>
                  <th style={{ padding: "0.6rem 0.75rem", color: "#475569" }}>Trained On</th>
                  <th style={{ padding: "0.6rem 0.75rem", color: "#475569" }}>Status</th>
                  <th style={{ padding: "0.6rem 0.75rem", color: "#475569" }}>MAE</th>
                  <th style={{ padding: "0.6rem 0.75rem", color: "#475569" }}>RMSE</th>
                  <th style={{ padding: "0.6rem 0.75rem", color: "#475569" }}>MAPE (%)</th>
                  <th style={{ padding: "0.6rem 0.75rem", color: "#475569" }}>Coverage</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "0.6rem 0.75rem", fontWeight: 600, color: "#1e293b" }}>{m.name}</td>
                    <td style={{ padding: "0.6rem 0.75rem", color: "#64748b" }}>{m.version}</td>
                    <td style={{ padding: "0.6rem 0.75rem", color: "#64748b" }}>{m.kind}</td>
                    <td style={{ padding: "0.6rem 0.75rem", color: "#64748b" }}>{m.trained_on}</td>
                    <td style={{ padding: "0.6rem 0.75rem" }}>
                      <span
                        style={{
                          padding: "0.2rem 0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          backgroundColor: "#f1f5f9",
                          color: "#334155",
                        }}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", color: "#334155" }}>
                      {m.metrics.mae !== undefined ? String(m.metrics.mae) : "—"}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", color: "#334155" }}>
                      {m.metrics.rmse !== undefined ? String(m.metrics.rmse) : "—"}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", color: "#334155" }}>
                      {m.metrics.mape !== undefined ? `${m.metrics.mape}%` : "—"}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", color: "#334155" }}>
                      {m.metrics.coverage !== undefined ? String(m.metrics.coverage) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
