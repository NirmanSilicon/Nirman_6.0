import React, { useState, useEffect, useCallback } from "react";
import { api, describeApiError } from "../api/client";
import type {
  CameraOut,
  MaintenanceEventOut,
  NotificationOut,
  Occupancy,
  BayWithStatus,
  BayStatusOut,
  ZoneOut,
  Page,
  LiveEvent,
} from "../api/types";
import { DataBadge, dataProvenance } from "../components/DataBadge";
import { useLiveStream } from "../realtime/useLiveStream";
import { useAuth } from "../auth/AuthContext";

export default function OperationsPage(): JSX.Element {
  const { user } = useAuth();

  const [cameras, setCameras] = useState<CameraOut[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceEventOut[]>([]);
  const [notifications, setNotifications] = useState<NotificationOut[]>([]);
  const [zones, setZones] = useState<ZoneOut[]>([]);

  // Override Form state
  const [overrideZoneId, setOverrideZoneId] = useState<string>("");
  const [bays, setBays] = useState<BayWithStatus[]>([]);
  const [overrideBayId, setOverrideBayId] = useState<string>("");
  const [overrideState, setOverrideState] = useState<Occupancy>("occupied");
  const [overrideReason, setOverrideReason] = useState<string>("");
  const [overrideResult, setOverrideResult] = useState<BayStatusOut | null>(null);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initial data load
  const loadOperationsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [camRes, maintRes, notifRes, zonesRes] = await Promise.all([
        api<CameraOut[]>("/devices/cameras"),
        api<MaintenanceEventOut[]>("/devices/maintenance?open_only=true"),
        api<Page<NotificationOut>>("/notifications?unread_only=true&limit=20"),
        api<Page<ZoneOut>>("/zones?limit=200"),
      ]);

      setCameras(camRes);
      setMaintenance(maintRes);
      setNotifications(notifRes.items);
      setZones(zonesRes.items);
      if (zonesRes.items.length > 0 && zonesRes.items[0] && !overrideZoneId) {
        setOverrideZoneId(zonesRes.items[0].id);
      }
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setLoading(false);
    }
  }, [overrideZoneId]);

  useEffect(() => {
    loadOperationsData();
  }, [loadOperationsData]);

  // Load bays when override zone changes
  useEffect(() => {
    if (!overrideZoneId) {
      setBays([]);
      setOverrideBayId("");
      return;
    }

    let active = true;
    async function fetchBays() {
      try {
        const res = await api<BayWithStatus[]>(`/zones/${overrideZoneId}/bays`);
        if (active) {
          setBays(res);
          if (res.length > 0 && res[0]) {
            setOverrideBayId(res[0].bay.id);
          } else {
            setOverrideBayId("");
          }
        }
      } catch {
        if (active) setBays([]);
      }
    }
    fetchBays();
    return () => {
      active = false;
    };
  }, [overrideZoneId]);

  // SSE live events handler
  const handleLiveEvent = useCallback(
    (e: LiveEvent) => {
      if (e.event === "device_health") {
        api<CameraOut[]>("/devices/cameras")
          .then(setCameras)
          .catch(() => {});
      } else if (e.event === "maintenance_changed") {
        api<MaintenanceEventOut[]>("/devices/maintenance?open_only=true")
          .then(setMaintenance)
          .catch(() => {});
      } else if (e.event === "notification") {
        api<Page<NotificationOut>>("/notifications?unread_only=true&limit=20")
          .then((p) => setNotifications(p.items))
          .catch(() => {});
      }
    },
    []
  );

  const { connected } = useLiveStream({
    onEvent: handleLiveEvent,
    onResync: loadOperationsData,
  });

  // Handle manual override submission
  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideBayId) {
      setOverrideError("Please select a bay");
      return;
    }
    if (overrideReason.trim().length < 5 || overrideReason.trim().length > 300) {
      setOverrideError("Reason must be between 5 and 300 characters");
      return;
    }

    setSubmitting(true);
    setOverrideError(null);
    setOverrideResult(null);

    try {
      const res = await api<BayStatusOut>("/admin/occupancy-override", {
        method: "POST",
        body: {
          bay_id: overrideBayId,
          state: overrideState,
          reason: overrideReason.trim(),
        },
      });
      setOverrideResult(res);
      setOverrideReason("");
      // Update local bay status
      setBays((prev) =>
        prev.map((b) => (b.bay.id === res.bay_id ? { ...b, status: res } : b))
      );
    } catch (err) {
      setOverrideError(describeApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Notification actions
  const handleMarkNotificationRead = async (notifId: string) => {
    try {
      await api<NotificationOut>(`/notifications/${notifId}/read`, { method: "POST" });
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    } catch {
      // ignore
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await api<{ updated: number }>("/notifications/read-all", { method: "POST" });
      setNotifications([]);
    } catch {
      // ignore
    }
  };

  // Counts by camera status
  const counts = {
    provisioned: cameras.filter((c) => c.status === "provisioned").length,
    online: cameras.filter((c) => c.status === "online").length,
    degraded: cameras.filter((c) => c.status === "degraded").length,
    offline: cameras.filter((c) => c.status === "offline").length,
    maintenance: cameras.filter((c) => c.status === "maintenance").length,
  };

  // Helper to derive DataState for camera subsets based on status and last_seen_at recency (within 5 min)
  const getCameraGroupDataState = (cams: CameraOut[]): "live" | "stale" | "unavailable" | "unknown" => {
    if (cams.length === 0) return "unknown";
    const withSeen = cams.filter((c) => c.last_seen_at != null);
    if (withSeen.length === 0) return "unknown";
    const newestMs = Math.max(...withSeen.map((c) => new Date(c.last_seen_at!).getTime()));
    const ageSec = (Date.now() - newestMs) / 1000;
    if (ageSec <= 300) return "live";
    if (ageSec <= 900) return "stale";
    return "unavailable";
  };

  const onlineCameras = cameras.filter((c) => c.status === "online");
  const degradedCameras = cameras.filter((c) => c.status === "degraded");
  const offlineCameras = cameras.filter((c) => c.status === "offline");
  const maintenanceCameras = cameras.filter((c) => c.status === "maintenance");

  const onlineDataState = onlineCameras.length > 0 ? getCameraGroupDataState(onlineCameras) : "unknown";
  const degradedDataState = degradedCameras.length > 0
    ? (getCameraGroupDataState(degradedCameras) === "live" ? "stale" : getCameraGroupDataState(degradedCameras))
    : "unknown";
  const offlineDataState = offlineCameras.length > 0 ? "unavailable" : "unknown";
  const maintenanceDataState = maintenanceCameras.length > 0 ? "unknown" : "unknown";
  const ticketsDataState = maintenance.length > 0
    ? (() => {
        const newestMs = Math.max(...maintenance.map((m) => new Date(m.opened_at).getTime()));
        const ageSec = (Date.now() - newestMs) / 1000;
        return ageSec <= 86400 ? "live" : "stale";
      })()
    : "unknown";

  // Sort cameras: offline and degraded cameras listed first!
  const sortedCameras = [...cameras].sort((a, b) => {
    const priority: Record<string, number> = {
      offline: 0,
      degraded: 1,
      maintenance: 2,
      provisioned: 3,
      online: 4,
    };
    return (priority[a.status] ?? 5) - (priority[b.status] ?? 5);
  });

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "2rem" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div>
          <h1 style={{ margin: "0 0 0.25rem 0", fontSize: "1.6rem", color: "#0f172a", fontWeight: 700 }}>
            Operations Console
          </h1>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#64748b" }}>
            Live alerts, camera telemetry health, manual occupancy overrides, and notifications
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

      {error && (
        <div style={{ padding: "0.75rem", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "6px", marginBottom: "1rem", fontSize: "0.875rem" }}>
          Error loading operations telemetry: {error}
        </div>
      )}

      {/* KPI Cards / Summary Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ padding: "1rem", backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Online Cameras</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#166534", marginTop: "0.25rem" }}>{counts.online}</div>
          <div style={{ marginTop: "0.4rem" }}><DataBadge dataState={onlineDataState} provenance={dataProvenance()} compact /></div>
        </div>

        <div style={{ padding: "1rem", backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Degraded Cameras</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#b45309", marginTop: "0.25rem" }}>{counts.degraded}</div>
          <div style={{ marginTop: "0.4rem" }}><DataBadge dataState={degradedDataState} provenance={dataProvenance()} compact /></div>
        </div>

        <div style={{ padding: "1rem", backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Offline Cameras</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#991b1b", marginTop: "0.25rem" }}>{counts.offline}</div>
          <div style={{ marginTop: "0.4rem" }}><DataBadge dataState={offlineDataState} provenance={dataProvenance()} compact /></div>
        </div>

        <div style={{ padding: "1rem", backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>In Maintenance</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#7c3aed", marginTop: "0.25rem" }}>{counts.maintenance}</div>
          <div style={{ marginTop: "0.4rem" }}><DataBadge dataState={maintenanceDataState} provenance={dataProvenance()} compact /></div>
        </div>

        <div style={{ padding: "1rem", backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Open Tickets</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", marginTop: "0.25rem" }}>{maintenance.length}</div>
          <div style={{ marginTop: "0.4rem" }}><DataBadge dataState={ticketsDataState} provenance={dataProvenance()} compact /></div>
        </div>
      </div>

      {/* Main Grid: Device Summary & Manual Override */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
        {/* Left Column: Device Telemetry Health List */}
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
              <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>
                Device Telemetry Health
              </h2>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                Offline and degraded cameras prioritized
              </span>
            </div>
            <DataBadge dataState="live" provenance={dataProvenance()} />
          </div>

          {loading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>Loading cameras...</div>
          ) : sortedCameras.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>No devices provisioned.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                    <th style={{ padding: "0.5rem 0.6rem", color: "#475569" }}>Camera</th>
                    <th style={{ padding: "0.5rem 0.6rem", color: "#475569" }}>Status</th>
                    <th style={{ padding: "0.5rem 0.6rem", color: "#475569" }}>Last Seen</th>
                    <th style={{ padding: "0.5rem 0.6rem", color: "#475569" }}>Data State</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCameras.map((cam) => {
                    const isAlert = cam.status === "offline" || cam.status === "degraded";
                    return (
                      <tr
                        key={cam.id}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          backgroundColor: isAlert ? "#fffbeb" : "#ffffff",
                        }}
                      >
                        <td style={{ padding: "0.5rem 0.6rem" }}>
                          <div style={{ fontWeight: 600, color: "#1e293b" }}>{cam.name}</div>
                          <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{cam.id.slice(0, 8)}...</div>
                        </td>
                        <td style={{ padding: "0.5rem 0.6rem" }}>
                          <span
                            style={{
                              padding: "0.2rem 0.5rem",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              backgroundColor:
                                cam.status === "online"
                                  ? "#dcfce7"
                                  : cam.status === "offline"
                                  ? "#fee2e2"
                                  : cam.status === "degraded"
                                  ? "#fef3c7"
                                  : "#f1f5f9",
                              color:
                                cam.status === "online"
                                  ? "#166534"
                                  : cam.status === "offline"
                                  ? "#991b1b"
                                  : cam.status === "degraded"
                                  ? "#92400e"
                                  : "#475569",
                            }}
                          >
                            {cam.status}
                          </span>
                        </td>
                        <td style={{ padding: "0.5rem 0.6rem", color: "#64748b" }}>
                          {cam.last_seen_at ? new Date(cam.last_seen_at).toLocaleTimeString() : "Never"}
                        </td>
                        <td style={{ padding: "0.5rem 0.6rem" }}>
                          <DataBadge
                            dataState={
                              cam.status === "online"
                                ? "live"
                                : cam.status === "degraded"
                                ? "stale"
                                : "unavailable"
                            }
                            provenance={dataProvenance()}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Manual Occupancy Override Form */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            padding: "1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <h2 style={{ margin: "0 0 0.25rem 0", fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>
            Manual Bay Override
          </h2>
          <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.8rem", color: "#64748b" }}>
            Authorized override of single bay occupancy. All manual modifications are audited.
          </p>

          <div
            style={{
              padding: "0.6rem 0.8rem",
              borderRadius: "6px",
              backgroundColor: "#fef3c7",
              border: "1px solid #fde68a",
              color: "#92400e",
              fontSize: "0.75rem",
              marginBottom: "1rem",
              lineHeight: 1.4,
            }}
          >
            ⚠️ <strong>Notice:</strong> A later camera reading with a newer timestamp replaces the manual value.
          </div>

          <form onSubmit={handleOverrideSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.25rem" }}>
                1. Select Zone
              </label>
              <select
                value={overrideZoneId}
                onChange={(e) => setOverrideZoneId(e.target.value)}
                style={{ width: "100%", padding: "0.45rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.25rem" }}>
                2. Select Bay
              </label>
              <select
                value={overrideBayId}
                onChange={(e) => setOverrideBayId(e.target.value)}
                disabled={bays.length === 0}
                style={{ width: "100%", padding: "0.45rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
              >
                {bays.length === 0 ? (
                  <option value="">No bays in selected zone</option>
                ) : (
                  bays.map((b) => (
                    <option key={b.bay.id} value={b.bay.id}>
                      Bay {b.bay.code} ({b.bay.bay_type}) — Current: {b.status.occupancy}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.25rem" }}>
                3. Desired State
              </label>
              <select
                value={overrideState}
                onChange={(e) => setOverrideState(e.target.value as Occupancy)}
                style={{ width: "100%", padding: "0.45rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
              >
                <option value="occupied">Occupied</option>
                <option value="free">Free</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.25rem" }}>
                4. Reason (5 - 300 chars)
              </label>
              <textarea
                required
                rows={3}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g. Physical inspection confirmed vehicle parked without transponder reading"
                style={{
                  width: "100%",
                  padding: "0.45rem",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ fontSize: "0.7rem", color: "#94a3b8", textAlign: "right" }}>
                {overrideReason.trim().length}/300 characters
              </div>
            </div>

            {overrideError && (
              <div style={{ padding: "0.5rem", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "6px", fontSize: "0.8rem" }}>
                {overrideError}
              </div>
            )}

            {overrideResult && (
              <div
                style={{
                  padding: "0.6rem",
                  backgroundColor: "#f0fdf4",
                  color: "#166534",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong>Override Applied:</strong> Bay is now {overrideResult.occupancy}.
                </div>
                <DataBadge dataState={overrideResult.data_state} provenance={overrideResult.provenance} />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || bays.length === 0}
              style={{
                padding: "0.55rem 1rem",
                borderRadius: "6px",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                border: "none",
                fontWeight: 600,
                fontSize: "0.875rem",
                cursor: submitting || bays.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Applying Override..." : "Apply Manual Override"}
            </button>
          </form>
        </div>
      </div>

      {/* Recent Unread Notifications Panel */}
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
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#1e293b" }}>
              Operational Alerts &amp; Notifications ({notifications.length})
            </h3>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
              Logged-in operator alerts for {user?.full_name ?? "current user"}
            </span>
          </div>

          {notifications.length > 0 && (
            <button
              type="button"
              onClick={handleMarkAllNotificationsRead}
              style={{
                padding: "0.35rem 0.75rem",
                borderRadius: "6px",
                backgroundColor: "#f1f5f9",
                color: "#475569",
                border: "1px solid #cbd5e1",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
            No unread operational notifications.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "6px",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>{n.title}</span>
                    <span
                      style={{
                        padding: "0.15rem 0.4rem",
                        borderRadius: "4px",
                        fontSize: "0.7rem",
                        backgroundColor: "#e2e8f0",
                        color: "#475569",
                        textTransform: "uppercase",
                      }}
                    >
                      {n.kind}
                    </span>
                  </div>
                  <p style={{ margin: "0.25rem 0 0.35rem 0", fontSize: "0.825rem", color: "#475569" }}>{n.body}</p>
                  <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleMarkNotificationRead(n.id)}
                  style={{
                    padding: "0.25rem 0.5rem",
                    borderRadius: "4px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.75rem",
                    color: "#2563eb",
                    cursor: "pointer",
                  }}
                >
                  Mark read
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
