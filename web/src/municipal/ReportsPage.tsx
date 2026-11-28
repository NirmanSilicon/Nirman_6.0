import React, { useState, useEffect } from "react";
import { api, describeApiError, API_BASE, tokenStore } from "../api/client";
import type { ZoneOut, Page, ReportTable, Provenance } from "../api/types";
import { DataBadge } from "../components/DataBadge";
import { useAuth } from "../auth/AuthContext";

type ReportType =
  | "occupancy-summary"
  | "peak-hours"
  | "reservations-summary"
  | "data-quality"
  | "forecast-evaluation";

// TODO: Confirm response schema with Himani's openapi.json.
// Adapts both:
// Shape A (spec / ReportTable): { columns: string[]; rows: unknown[][]; notes?: string[]; provenance: Provenance }
// Shape B (router / row objects): { items?: Record<string, unknown>[]; rows?: Record<string, unknown>[]; columns?: string[]; provenance?: Provenance; generated_at?: string; notes?: string[] }
export function adaptReportResponse(raw: unknown): ReportTable {
  if (!raw || typeof raw !== "object") {
    return { columns: [], rows: [], notes: [], provenance: "simulated" };
  }

  const obj = raw as Record<string, unknown>;

  // Check if it's already Shape A: rows is an array of arrays
  if (Array.isArray(obj.rows) && (obj.rows.length === 0 || Array.isArray(obj.rows[0]))) {
    return {
      columns: Array.isArray(obj.columns) ? (obj.columns as string[]) : [],
      rows: obj.rows as unknown[][],
      notes: Array.isArray(obj.notes) ? (obj.notes as string[]) : [],
      provenance: (obj.provenance as Provenance) ?? "simulated",
    };
  }

  // Shape B: items or rows is an array of objects
  const list = Array.isArray(obj.items)
    ? (obj.items as Record<string, unknown>[])
    : Array.isArray(obj.rows)
    ? (obj.rows as Record<string, unknown>[])
    : Array.isArray(raw)
    ? (raw as Record<string, unknown>[])
    : [];

  let columns: string[] = Array.isArray(obj.columns) ? (obj.columns as string[]) : [];
  if (columns.length === 0 && list.length > 0 && typeof list[0] === "object" && list[0] !== null) {
    columns = Object.keys(list[0]);
  }

  const rows: unknown[][] = list.map((item) => {
    if (Array.isArray(item)) return item;
    return columns.map((col) => item[col] ?? null);
  });

  return {
    columns,
    rows,
    notes: Array.isArray(obj.notes) ? (obj.notes as string[]) : [],
    provenance: (obj.provenance as Provenance) ?? "simulated",
  };
}

export default function ReportsPage(): JSX.Element {
  const { roles } = useAuth();
  const isFieldOnly = roles.has("field_operator") && !roles.has("municipal_admin") && !roles.has("system_admin");

  const [zones, setZones] = useState<ZoneOut[]>([]);
  const [reportType, setReportType] = useState<ReportType>(isFieldOnly ? "data-quality" : "occupancy-summary");

  // Filter params
  const [zoneId, setZoneId] = useState<string>("");
  const [fromTime, setFromTime] = useState<string>(() => {
    const d = new Date(Date.now() - 7 * 86400000);
    return d.toISOString().slice(0, 10);
  });
  const [toTime, setToTime] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [intervalMin, setIntervalMin] = useState<number>(15);
  const [metric, setMetric] = useState<string>("vehicles");
  const [days, setDays] = useState<number>(28);
  const [resKind, setResKind] = useState<string>("all");
  const [target, setTarget] = useState<string>("occupancy_pct");

  const [preview, setPreview] = useState<ReportTable | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load zones list
  useEffect(() => {
    let active = true;
    async function fetchZones() {
      try {
        const res = await api<Page<ZoneOut>>("/zones?limit=200");
        if (active) {
          setZones(res.items);
          if (res.items.length > 0 && res.items[0] && !zoneId) {
            setZoneId(res.items[0].id);
          }
        }
      } catch {
        // ignore
      }
    }
    fetchZones();
    return () => {
      active = false;
    };
  }, [zoneId]);

  // Build query string based on selected report
  const buildQuery = (format: "json" | "csv") => {
    const params = new URLSearchParams();
    params.set("format", format);

    if (zoneId) params.set("zone_id", zoneId);

    if (reportType === "occupancy-summary") {
      params.set("from", new Date(fromTime).toISOString());
      params.set("to", new Date(toTime).toISOString());
      params.set("interval_min", String(intervalMin));
    } else if (reportType === "peak-hours") {
      params.set("metric", metric);
      params.set("days", String(days));
    } else if (reportType === "reservations-summary") {
      params.set("from", new Date(fromTime).toISOString());
      params.set("to", new Date(toTime).toISOString());
      params.set("kind", resKind);
    } else if (reportType === "data-quality") {
      params.set("from", new Date(fromTime).toISOString());
      params.set("to", new Date(toTime).toISOString());
    } else if (reportType === "forecast-evaluation") {
      params.set("from", new Date(fromTime).toISOString());
      params.set("to", new Date(toTime).toISOString());
      params.set("target", target);
    }

    return params.toString();
  };

  const validateInputs = (): string | null => {
    if (reportType !== "peak-hours") {
      const fromD = new Date(fromTime);
      const toD = new Date(toTime);
      if (isNaN(fromD.getTime()) || isNaN(toD.getTime())) {
        return "Invalid date selection";
      }
      if (fromD >= toD) {
        return "Start date must be before end date";
      }
      const diffDays = (toD.getTime() - fromD.getTime()) / 86400000;
      if (diffDays > 366) {
        return "Narrow the range: time range must be 366 days or fewer";
      }
    }
    return null;
  };

  // Preview report handler
  const handleGeneratePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    const valErr = validateInputs();
    if (valErr) {
      setError(valErr);
      return;
    }

    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const qs = buildQuery("json");
      const res = await api<unknown>(`/reports/${reportType}?${qs}`);
      const adapted = adaptReportResponse(res);
      setPreview(adapted);
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setLoading(false);
    }
  };

  // Download CSV handler
  const handleDownloadCsv = async () => {
    const valErr = validateInputs();
    if (valErr) {
      setError(valErr);
      return;
    }

    setDownloading(true);
    setError(null);

    try {
      const qs = buildQuery("csv");
      const path = `/reports/${reportType}?${qs}`;

      const res = await fetch(`${API_BASE}${path}`, {
        headers: {
          Authorization: `Bearer ${tokenStore.access ?? ""}`,
        },
      });

      if (res.status === 422) {
        setError("Narrow the range: request exceeded maximum data export threshold");
        return;
      }

      if (!res.ok) {
        throw new Error(`Failed to export report: ${res.statusText}`);
      }

      const blob = await res.blob();

      // Trigger temporary download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${reportType}-${fromTime}-${toTime}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "2rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ margin: "0 0 0.25rem 0", fontSize: "1.6rem", color: "#0f172a", fontWeight: 700 }}>
          Planning &amp; Operational Reports
        </h1>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "#64748b" }}>
          Generate tabular previews and authenticated CSV exports for municipal auditing and transit planning
        </p>
      </div>

      {/* Prominent Simulated Data Citation Warning */}
      <div
        style={{
          padding: "0.75rem 1rem",
          borderRadius: "6px",
          backgroundColor: "#eff6ff",
          border: "1px solid #bfdbfe",
          color: "#1e40af",
          fontSize: "0.825rem",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <span style={{ fontSize: "1.1rem" }}>ℹ️</span>
        <span>
          <strong>Advisory:</strong> Reports built from simulated data are labelled and must not be cited as empirical
          measurements in planning filings.
        </span>
      </div>

      {/* Report Configuration Form */}
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
        <form onSubmit={handleGeneratePreview}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
            {/* Report Type Selector */}
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.3rem" }}>
                Report Dataset
              </label>
              <select
                value={reportType}
                onChange={(e) => {
                  setReportType(e.target.value as ReportType);
                  setPreview(null);
                  setError(null);
                }}
                style={{ width: "100%", padding: "0.45rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.875rem" }}
              >
                {!isFieldOnly && <option value="occupancy-summary">Occupancy Summary</option>}
                {!isFieldOnly && <option value="peak-hours">Peak Hours Distribution</option>}
                {!isFieldOnly && <option value="reservations-summary">Reservations &amp; Loading Summary</option>}
                <option value="data-quality">Data Quality &amp; Device Coverage</option>
                {!isFieldOnly && <option value="forecast-evaluation">Forecast Model Evaluation</option>}
              </select>
            </div>

            {/* Zone Selector */}
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.3rem" }}>
                Target Zone {reportType === "data-quality" && "(Optional)"}
              </label>
              <select
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                style={{ width: "100%", padding: "0.45rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.875rem" }}
              >
                {reportType === "data-quality" && <option value="">All Zones</option>}
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Conditional Date Pickers */}
            {reportType !== "peak-hours" ? (
              <>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.3rem" }}>
                    From Date
                  </label>
                  <input
                    type="date"
                    required
                    value={fromTime}
                    onChange={(e) => setFromTime(e.target.value)}
                    style={{ width: "100%", padding: "0.45rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.875rem", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.3rem" }}>
                    To Date (≤ 366 days)
                  </label>
                  <input
                    type="date"
                    required
                    value={toTime}
                    onChange={(e) => setToTime(e.target.value)}
                    style={{ width: "100%", padding: "0.45rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.875rem", boxSizing: "border-box" }}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.3rem" }}>
                    Peak Metric
                  </label>
                  <select
                    value={metric}
                    onChange={(e) => setMetric(e.target.value)}
                    style={{ width: "100%", padding: "0.45rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.875rem" }}
                  >
                    <option value="vehicles">Vehicles</option>
                    <option value="pedestrians">Pedestrians</option>
                    <option value="occupancy_pct">Occupancy Rate (%)</option>
                    <option value="density">Density</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.3rem" }}>
                    Lookback Days
                  </label>
                  <select
                    value={days}
                    onChange={(e) => setDays(parseInt(e.target.value, 10))}
                    style={{ width: "100%", padding: "0.45rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.875rem" }}
                  >
                    <option value={7}>7 Days</option>
                    <option value={14}>14 Days</option>
                    <option value={28}>28 Days</option>
                    <option value={60}>60 Days</option>
                    <option value={90}>90 Days</option>
                  </select>
                </div>
              </>
            )}

            {/* Custom Options per report */}
            {reportType === "occupancy-summary" && (
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.3rem" }}>
                  Aggregation Interval
                </label>
                <select
                  value={intervalMin}
                  onChange={(e) => setIntervalMin(parseInt(e.target.value, 10))}
                  style={{ width: "100%", padding: "0.45rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.875rem" }}
                >
                  <option value={5}>5 Minutes</option>
                  <option value={15}>15 Minutes</option>
                  <option value={60}>60 Minutes</option>
                </select>
              </div>
            )}

            {reportType === "reservations-summary" && (
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.3rem" }}>
                  Reservation Kind
                </label>
                <select
                  value={resKind}
                  onChange={(e) => setResKind(e.target.value)}
                  style={{ width: "100%", padding: "0.45rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.875rem" }}
                >
                  <option value="all">All Reservations</option>
                  <option value="parking">Parking</option>
                  <option value="loading">Loading</option>
                </select>
              </div>
            )}

            {reportType === "forecast-evaluation" && (
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.3rem" }}>
                  Evaluation Target
                </label>
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  style={{ width: "100%", padding: "0.45rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.875rem" }}
                >
                  <option value="occupancy_pct">Occupancy Rate (%)</option>
                  <option value="vehicle_count">Vehicle Count</option>
                  <option value="pedestrian_count">Pedestrian Count</option>
                </select>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "0.55rem 1.25rem",
                borderRadius: "6px",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                border: "none",
                fontWeight: 600,
                fontSize: "0.875rem",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Generating..." : "Generate Preview"}
            </button>

            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={downloading}
              style={{
                padding: "0.55rem 1.25rem",
                borderRadius: "6px",
                backgroundColor: "#059669",
                color: "#ffffff",
                border: "none",
                fontWeight: 600,
                fontSize: "0.875rem",
                cursor: downloading ? "not-allowed" : "pointer",
              }}
            >
              {downloading ? "Exporting..." : "Download Full CSV"}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div style={{ padding: "0.75rem", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "6px", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}

      {/* Preview Table Card */}
      {preview && (
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
              <h2 style={{ margin: "0 0 0.25rem 0", fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>
                Report Preview (First {Math.min(preview.rows.length, 200)} Rows)
              </h2>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                Total preview records: {preview.rows.length}
              </span>
            </div>
            <DataBadge dataState="live" provenance={preview.provenance} />
          </div>

          {preview.rows.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8", fontSize: "0.875rem" }}>
              No records returned for the selected filter parameters.
            </div>
          ) : (
            <div style={{ overflowX: "auto", marginBottom: "1.25rem" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                    {preview.columns.map((col, idx) => (
                      <th key={idx} style={{ padding: "0.6rem 0.75rem", color: "#475569", whiteSpace: "nowrap" }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 200).map((row, rIdx) => (
                    <tr key={rIdx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      {row.map((val, cIdx) => (
                        <td key={cIdx} style={{ padding: "0.55rem 0.75rem", color: "#334155" }}>
                          {/* Rule: empty cells shown as "n/a", never zero! */}
                          {val === null || val === undefined || val === "" ? (
                            <span style={{ color: "#94a3b8" }}>n/a</span>
                          ) : typeof val === "number" ? (
                            val.toLocaleString()
                          ) : (
                            String(val)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Notes list */}
          {preview.notes.length > 0 && (
            <div style={{ padding: "0.75rem", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "0.3rem" }}>
                Report Notes &amp; Assumptions:
              </div>
              <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.75rem", color: "#64748b" }}>
                {preview.notes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
