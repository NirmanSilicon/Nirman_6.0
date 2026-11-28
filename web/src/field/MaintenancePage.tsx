import { useState, useEffect, useCallback, useMemo } from "react";
import { api, describeApiError } from "../api/client";
import type {
  MaintenanceEventOut,
  CameraOut,
  LiveEvent,
} from "../api/types";
import { useLiveStream } from "../realtime/useLiveStream";
import { DataBadge, dataProvenance } from "../components/DataBadge";

export default function MaintenancePage(): JSX.Element {
  const [events, setEvents] = useState<MaintenanceEventOut[]>([]);
  const [cameras, setCameras] = useState<Record<string, CameraOut>>({});
  const [openOnly, setOpenOnly] = useState(true);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [maintList, camList] = await Promise.all([
        api<MaintenanceEventOut[]>(`/devices/maintenance?open_only=${openOnly}`),
        api<CameraOut[]>("/devices/cameras").catch(() => []),
      ]);

      const camMap: Record<string, CameraOut> = {};
      for (const cam of camList) {
        camMap[cam.id] = cam;
      }

      setEvents(maintList ?? []);
      setCameras(camMap);

      if (!selectedCameraId && camList.length > 0) {
        setSelectedCameraId(camList[0]!.id);
      }
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setLoading(false);
    }
  }, [openOnly, selectedCameraId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Live updates
  const handleLiveEvent = useCallback((e: LiveEvent) => {
    if (e.event === "maintenance_changed" || e.event === "device_health") {
      void loadData();
    }
  }, [loadData]);

  useLiveStream({
    onEvent: handleLiveEvent,
    onResync: loadData,
  });

  // Start maintenance
  const handleStartMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCameraId) return;
    if (description.trim().length < 3 || description.trim().length > 500) {
      setFormError("Description must be between 3 and 500 characters.");
      return;
    }

    setFormError(null);
    setBusyId("start");
    try {
      const newEv = await api<MaintenanceEventOut>(
        `/devices/cameras/${selectedCameraId}/maintenance`,
        {
          method: "POST",
          body: { description: description.trim() },
        }
      );

      setEvents((prev) => [newEv, ...prev]);
      setDescription("");

      // Update camera status to maintenance locally
      setCameras((prev) => {
        const existing = prev[selectedCameraId];
        if (!existing) return prev;
        return {
          ...prev,
          [selectedCameraId]: {
            ...existing,
            status: "maintenance",
          },
        };
      });
    } catch (err) {
      setFormError(describeApiError(err));
    } finally {
      setBusyId(null);
    }
  };

  // Resolve maintenance
  const handleResolve = async (camId: string, eventId: string) => {
    setBusyId(eventId);
    setFormError(null);
    try {
      const resolved = await api<MaintenanceEventOut>(
        `/devices/cameras/${camId}/maintenance/resolve`,
        { method: "POST" }
      );

      setEvents((prev) =>
        prev.map((ev) => (ev.id === resolved.id ? resolved : ev))
      );

      if (openOnly) {
        // If viewing open only, filter out resolved
        setEvents((prev) => prev.filter((ev) => ev.id !== resolved.id));
      }
    } catch (err) {
      setFormError(describeApiError(err));
    } finally {
      setBusyId(null);
    }
  };

  const cameraList = useMemo(() => Object.values(cameras), [cameras]);

  // Check if any camera is in "maintenance" status with NO open maintenance event
  const camerasWaitingHeartbeat = useMemo(() => {
    const openCamIds = new Set(
      events.filter((ev) => ev.resolved_at === null && ev.camera_id).map((ev) => ev.camera_id!)
    );
    return cameraList.filter((c) => c.status === "maintenance" && !openCamIds.has(c.id));
  }, [cameraList, events]);

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
        Loading maintenance workflow…
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: "1.5rem",
          backgroundColor: "#fef2f2",
          color: "#991b1b",
          borderRadius: "8px",
        }}
      >
        <h3 style={{ margin: "0 0 0.5rem 0" }}>Failed to load maintenance records</h3>
        <p style={{ margin: "0 0 1rem 0" }}>{error}</p>
        <button
          type="button"
          onClick={() => void loadData()}
          style={btnStyle}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Top Header */}
      <div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
          Device Maintenance Operations
        </h1>
        <p style={{ color: "#64748b", margin: "0.25rem 0 0 0", fontSize: "0.9rem" }}>
          Manage camera repair workflows, watchdog alerts, and restore edge telemetry
        </p>
      </div>

      {formError && (
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "#fef2f2",
            color: "#991b1b",
            borderRadius: "6px",
            fontSize: "0.85rem",
          }}
        >
          {formError}
        </div>
      )}

      {/* Waiting for Heartbeat Notice */}
      {camerasWaitingHeartbeat.length > 0 && (
        <div
          style={{
            padding: "0.85rem 1rem",
            backgroundColor: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "6px",
            color: "#92400e",
            fontSize: "0.85rem",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: "0.3rem" }}>
            ⏳ Waiting for heartbeat
          </div>
          <div>
            The following camera maintenance was marked resolved. The camera remains in status{" "}
            <code>maintenance</code> until its next device heartbeat:
          </div>
          <ul style={{ margin: "0.35rem 0 0 1rem", padding: 0 }}>
            {camerasWaitingHeartbeat.map((c) => (
              <li key={c.id}>
                <strong>{c.name}</strong> (ID: {c.id}) — Waiting for heartbeat
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Grid: Left Form to Start Maintenance, Right Events Table */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(300px, 1fr) minmax(450px, 1.8fr)",
          gap: "1.25rem",
          alignItems: "start",
        }}
      >
        {/* Start Maintenance Form */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            padding: "1.25rem",
          }}
        >
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#0f172a" }}>
            Start Camera Maintenance
          </h2>
          <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0 0 1rem 0" }}>
            Flag a camera under scheduled repair or calibration.
          </p>

          <form onSubmit={(e) => void handleStartMaintenance(e)} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div>
              <label style={labelStyle}>Select Camera</label>
              <select
                value={selectedCameraId ?? ""}
                onChange={(e) => setSelectedCameraId(e.target.value)}
                style={inputStyle}
                required
              >
                {cameraList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Issue Description (3 - 500 characters)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe why maintenance is being initiated (e.g. Lens cleaning, ROI recalibration, power cycle)..."
                rows={4}
                style={{ ...inputStyle, resize: "vertical" }}
                required
              />
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", textAlign: "right", marginTop: "0.2rem" }}>
                {description.length} / 500
              </div>
            </div>

            {/* Stated consequence next to the button */}
            <div
              style={{
                fontSize: "0.75rem",
                color: "#b45309",
                backgroundColor: "#fef3c7",
                padding: "0.6rem 0.75rem",
                borderRadius: "5px",
                lineHeight: 1.35,
              }}
            >
              ⚠️ <strong>Consequence:</strong> Starting maintenance will set camera status to{" "}
              <code>maintenance</code> and all associated bays will report{" "}
              <code>data_state = unavailable</code>.
            </div>

            <button
              type="submit"
              disabled={busyId === "start"}
              style={{
                ...btnStyle,
                backgroundColor: "#d97706",
                color: "#ffffff",
                padding: "0.55rem 1rem",
                fontWeight: 700,
              }}
            >
              {busyId === "start" ? "Starting…" : "Start Maintenance"}
            </button>
          </form>
        </div>

        {/* Maintenance Events Table */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "0.75rem 1.25rem",
              backgroundColor: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "#334155" }}>
              Maintenance Log
            </h2>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.8rem", color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <input
                  type="checkbox"
                  checked={openOnly}
                  onChange={(e) => setOpenOnly(e.target.checked)}
                />
                Show open events only
              </label>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <thead>
                <tr style={{ backgroundColor: "#f1f5f9", color: "#475569", textAlign: "left" }}>
                  <th style={thStyle}>Event Kind</th>
                  <th style={thStyle}>Camera</th>
                  <th style={thStyle}>Description</th>
                  <th style={thStyle}>Opened By</th>
                  <th style={thStyle}>Opened At</th>
                  <th style={thStyle}>Status / Action</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => {
                  const cam = ev.camera_id ? cameras[ev.camera_id] : null;
                  const isResolved = ev.resolved_at !== null;
                  const isBusy = busyId === ev.id;

                  return (
                    <tr
                      key={ev.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        backgroundColor: isResolved ? "#fcfcfd" : "#ffffff",
                      }}
                    >
                      <td style={{ ...tdStyle, fontWeight: 700 }}>
                        <span
                          style={{
                            padding: "0.15rem 0.4rem",
                            borderRadius: "4px",
                            backgroundColor:
                              ev.kind === "camera_down"
                                ? "#fee2e2"
                                : ev.kind === "stale_data"
                                  ? "#fef3c7"
                                  : "#e0f2fe",
                            color:
                              ev.kind === "camera_down"
                                ? "#b91c1c"
                                : ev.kind === "stale_data"
                                  ? "#92400e"
                                  : "#0369a1",
                            fontSize: "0.75rem",
                            textTransform: "capitalize",
                          }}
                        >
                          {ev.kind.replace("_", " ")}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div>{cam?.name ?? ev.camera_id ?? "All cameras"}</div>
                        {cam && (
                          <div style={{ marginTop: "0.15rem" }}>
                            <DataBadge
                              dataState={
                                cam.status === "online"
                                  ? "live"
                                  : cam.status === "degraded"
                                    ? "stale"
                                    : "unavailable"
                              }
                              provenance={dataProvenance()}
                              compact
                            />
                          </div>
                        )}
                      </td>
                      <td style={{ ...tdStyle, maxWidth: "240px", lineHeight: 1.35 }}>
                        {ev.description}
                      </td>
                      <td style={{ ...tdStyle, color: "#64748b" }}>
                        {/* Rule: show 'opened by system' when opened_by is null */}
                        {ev.opened_by === null ? (
                          <span style={{ fontStyle: "italic", color: "#6b7280" }}>
                            opened by system
                          </span>
                        ) : (
                          <span>{ev.opened_by.slice(0, 8)}…</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, color: "#64748b", whiteSpace: "nowrap" }}>
                        {new Date(ev.opened_at).toLocaleTimeString()}
                      </td>
                      <td style={tdStyle}>
                        {isResolved ? (
                          <span
                            style={{
                              color: "#16a34a",
                              fontWeight: 600,
                              fontSize: "0.75rem",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.2rem",
                            }}
                          >
                            <span>✓</span>
                            <span>Resolved ({new Date(ev.resolved_at!).toLocaleTimeString()})</span>
                          </span>
                        ) : ev.camera_id ? (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleResolve(ev.camera_id!, ev.id)}
                            style={{
                              ...btnStyle,
                              backgroundColor: "#16a34a",
                              color: "#ffffff",
                              fontSize: "0.75rem",
                            }}
                          >
                            {isBusy ? "Resolving…" : "Resolve"}
                          </button>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>Open</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {events.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                      No {openOnly ? "open " : ""}maintenance events recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "0.4rem 0.8rem",
  borderRadius: "5px",
  border: "1px solid #cbd5e1",
  backgroundColor: "#f8fafc",
  fontSize: "0.8rem",
  fontWeight: 600,
  cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.4rem 0.6rem",
  borderRadius: "5px",
  border: "1px solid #cbd5e1",
  fontSize: "0.8rem",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#475569",
  marginBottom: "0.2rem",
};

const thStyle: React.CSSProperties = {
  padding: "0.6rem 0.8rem",
  fontSize: "0.75rem",
  fontWeight: 600,
  borderBottom: "1px solid #e2e8f0",
};

const tdStyle: React.CSSProperties = {
  padding: "0.6rem 0.8rem",
};
