import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { api, describeApiError } from "../api/client";
import type {
  CameraOut,
  CameraCreated,
  MappingOut,
  DeviceHealthOut,
  ZoneOut,
  Page,
  LiveEvent,
} from "../api/types";
import { useLiveStream } from "../realtime/useLiveStream";
import { DataBadge, dataProvenance } from "../components/DataBadge";
import { DemoVideosPanel } from "../components/DemoVideosPanel";

export default function DevicesPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const filterZoneParam = searchParams.get("zone") ?? "";

  const [cameras, setCameras] = useState<CameraOut[]>([]);
  const [zones, setZones] = useState<ZoneOut[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [mappings, setMappings] = useState<MappingOut[]>([]);
  const [healthEvents, setHealthEvents] = useState<DeviceHealthOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filters
  const [zoneFilter, setZoneFilter] = useState<string>(filterZoneParam);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // One-time secret modal (held in component state only, cleared on close)
  const [secretModal, setSecretModal] = useState<{
    zoneId: string;
    cameraId: string;
    secret: string;
    isRotate?: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Modals & form state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    zone_id: "",
    name: "",
    interval_s: 10,
    conf_threshold: 0.5,
    area_m2: null as number | null,
  });

  const [showRotateConfirm, setShowRotateConfirm] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [configForm, setConfigForm] = useState({
    interval_s: 10,
    conf_threshold: 0.5,
    area_m2: null as number | null,
  });

  // ROI Mapping form state
  const [roiBayId, setRoiBayId] = useState("");
  const [roiJson, setRoiJson] = useState("");
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [mappingSuccess, setMappingSuccess] = useState<string | null>(null);

  const loadCameras = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [camList, zonesPage] = await Promise.all([
        api<CameraOut[]>("/devices/cameras"),
        api<Page<ZoneOut>>("/zones?limit=200").catch(() => ({ items: [] as ZoneOut[], total: 0, limit: 200, offset: 0 })),
      ]);

      setCameras(camList ?? []);
      setZones(zonesPage.items ?? []);

      if (camList && camList.length > 0 && !selectedCameraId) {
        // If query param matches a camera in that zone, select it
        const match = filterZoneParam ? camList.find((c) => c.zone_id === filterZoneParam) : null;
        setSelectedCameraId(match ? match.id : camList[0]!.id);
      }
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setLoading(false);
    }
  }, [filterZoneParam, selectedCameraId]);

  useEffect(() => {
    void loadCameras();
  }, [loadCameras]);

  const loadCameraDetails = useCallback(async (cameraId: string) => {
    try {
      setDetailLoading(true);
      setActionError(null);

      const [maps, hList] = await Promise.all([
        api<MappingOut[]>(`/devices/cameras/${cameraId}/mappings`).catch(() => []),
        api<DeviceHealthOut[]>(`/devices/cameras/${cameraId}/health?limit=50`).catch(() => []),
      ]);

      setMappings(maps ?? []);
      setHealthEvents(hList ?? []);
    } catch (err) {
      setActionError(describeApiError(err));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCameraId) {
      void loadCameraDetails(selectedCameraId);
      const cam = cameras.find((c) => c.id === selectedCameraId);
      if (cam) {
        setConfigForm({
          interval_s: cam.config.interval_s,
          conf_threshold: cam.config.conf_threshold,
          area_m2: cam.config.area_m2,
        });
      }
    } else {
      setMappings([]);
      setHealthEvents([]);
    }
  }, [selectedCameraId, cameras, loadCameraDetails]);

  // Live SSE stream handler
  const handleLiveEvent = useCallback((e: LiveEvent) => {
    if (e.event === "device_health") {
      const { camera_id, state } = e.data;
      setCameras((prev) =>
        prev.map((c) => (c.id === camera_id ? { ...c, status: state, last_seen_at: new Date().toISOString() } : c))
      );
    }
  }, []);

  useLiveStream({
    onEvent: handleLiveEvent,
    onResync: loadCameras,
  });

  const selectedCamera = useMemo(() => {
    return cameras.find((c) => c.id === selectedCameraId) ?? null;
  }, [cameras, selectedCameraId]);

  const filteredCameras = useMemo(() => {
    return cameras.filter((c) => {
      if (zoneFilter && c.zone_id !== zoneFilter) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      return true;
    });
  }, [cameras, zoneFilter, statusFilter]);

  // Camera Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      const created = await api<CameraCreated>("/devices/cameras", {
        method: "POST",
        body: {
          zone_id: registerForm.zone_id || (zones[0]?.id ?? ""),
          name: registerForm.name,
          config: {
            interval_s: Number(registerForm.interval_s),
            conf_threshold: Number(registerForm.conf_threshold),
            area_m2: registerForm.area_m2 !== null ? Number(registerForm.area_m2) : null,
          },
        },
      });

      setShowRegisterModal(false);
      setCameras((prev) => [...prev, created.camera]);
      setSelectedCameraId(created.camera.id);

      // Show one-time secret modal
      setSecretModal({
        zoneId: created.camera.zone_id,
        cameraId: created.camera.id,
        secret: created.device_secret,
        isRotate: false,
      });
      setCopied(false);
    } catch (err) {
      setActionError(describeApiError(err));
    }
  };

  // Rotate Secret
  const handleRotateSecret = async () => {
    if (!selectedCamera) return;
    setActionError(null);
    try {
      const result = await api<{ device_secret: string }>(
        `/devices/cameras/${selectedCamera.id}/rotate-secret`,
        { method: "POST" }
      );
      setShowRotateConfirm(false);
      setSecretModal({
        zoneId: selectedCamera.zone_id,
        cameraId: selectedCamera.id,
        secret: result.device_secret,
        isRotate: true,
      });
      setCopied(false);
    } catch (err) {
      setActionError(describeApiError(err));
    }
  };

  // Update Config
  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCamera) return;
    setActionError(null);
    try {
      const updated = await api<CameraOut>(`/devices/cameras/${selectedCamera.id}/config`, {
        method: "PATCH",
        body: {
          interval_s: Number(configForm.interval_s),
          conf_threshold: Number(configForm.conf_threshold),
          area_m2: configForm.area_m2 !== null ? Number(configForm.area_m2) : null,
        },
      });
      setCameras((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setIsEditingConfig(false);
    } catch (err) {
      setActionError(describeApiError(err));
    }
  };

  // Add / Update ROI Mapping
  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCamera || !roiBayId.trim()) return;
    setMappingError(null);
    setMappingSuccess(null);

    let polygon: [number, number][];
    try {
      const parsed = JSON.parse(roiJson);
      if (Array.isArray(parsed)) {
        polygon = parsed;
      } else if (parsed && Array.isArray(parsed.roi_polygon)) {
        polygon = parsed.roi_polygon;
      } else {
        throw new Error("JSON must contain an array of coordinates or an object with roi_polygon array.");
      }
    } catch (err) {
      setMappingError(`Invalid ROI JSON: ${err instanceof Error ? err.message : "Malformed JSON"}`);
      return;
    }

    try {
      const newMap = await api<MappingOut>(
        `/devices/cameras/${selectedCamera.id}/mappings/${encodeURIComponent(roiBayId.trim())}`,
        {
          method: "PUT",
          body: { roi_polygon: polygon },
        }
      );

      setMappings((prev) => {
        const idx = prev.findIndex((m) => m.bay_id === newMap.bay_id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = newMap;
          return next;
        }
        return [...prev, newMap];
      });

      setMappingSuccess(`Bay ${roiBayId} ROI mapping saved successfully.`);
      setRoiBayId("");
      setRoiJson("");
    } catch (err) {
      setMappingError(describeApiError(err));
    }
  };

  // Delete Mapping
  const handleDeleteMapping = async (bayId: string) => {
    if (!selectedCamera) return;
    if (!window.confirm(`Delete ROI mapping for bay ${bayId}?`)) return;
    try {
      await api(`/devices/cameras/${selectedCamera.id}/mappings/${encodeURIComponent(bayId)}`, {
        method: "DELETE",
      });
      setMappings((prev) => prev.filter((m) => m.bay_id !== bayId));
    } catch (err) {
      setActionError(describeApiError(err));
    }
  };

  // Deactivate Camera
  const handleDeactivate = async () => {
    if (!selectedCamera) return;
    setActionError(null);
    try {
      await api(`/devices/cameras/${selectedCamera.id}`, { method: "DELETE" });
      setCameras((prev) =>
        prev.map((c) => (c.id === selectedCamera.id ? { ...c, is_active: false, status: "offline" } : c))
      );
      setShowDeactivateConfirm(false);
    } catch (err) {
      setActionError(describeApiError(err));
    }
  };

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Loading field devices…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: "1.5rem", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "8px" }}>
        <h3>Error loading cameras</h3>
        <p>{error}</p>
        <button type="button" onClick={() => void loadCameras()} style={btnStyle}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <DemoVideosPanel />
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>Field Devices & Cameras</h1>
          <p style={{ color: "#64748b", margin: "0.25rem 0 0 0", fontSize: "0.9rem" }}>
            Camera registration, edge telemetry configuration, ROI calibration mappings, and health telemetry
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setRegisterForm({
              zone_id: zones[0]?.id ?? "",
              name: "",
              interval_s: 10,
              conf_threshold: 0.5,
              area_m2: null,
            });
            setShowRegisterModal(true);
          }}
          style={{ ...btnStyle, backgroundColor: "#2563eb", color: "#ffffff" }}
        >
          + Register Camera
        </button>
      </div>

      {actionError && (
        <div style={{ padding: "0.75rem 1rem", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "6px", fontSize: "0.85rem" }}>
          {actionError}
        </div>
      )}

      {/* Main Layout: Left Camera Table, Right Inspector */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(420px, 1.4fr)", gap: "1.25rem", alignItems: "start" }}>
        {/* Left: Camera List */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          {/* Filter Bar */}
          <div style={{ padding: "0.75rem 1rem", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              style={inputStyle}
            >
              <option value="">All Zones</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={inputStyle}
            >
              <option value="all">All Statuses</option>
              <option value="online">Online</option>
              <option value="degraded">Degraded</option>
              <option value="offline">Offline</option>
              <option value="maintenance">Maintenance</option>
              <option value="provisioned">Provisioned</option>
            </select>
          </div>

          <div style={{ maxHeight: "600px", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <thead>
                <tr style={{ backgroundColor: "#f1f5f9", color: "#475569", textAlign: "left" }}>
                  <th style={thStyle}>Camera</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {filteredCameras.map((cam) => {
                  const isSelected = cam.id === selectedCameraId;
                  const zone = zones.find((z) => z.id === cam.zone_id);
                  return (
                    <tr
                      key={cam.id}
                      onClick={() => setSelectedCameraId(cam.id)}
                      style={{
                        cursor: "pointer",
                        backgroundColor: isSelected ? "#eff6ff" : "transparent",
                        borderBottom: "1px solid #f1f5f9",
                        opacity: cam.is_active ? 1 : 0.6,
                      }}
                    >
                      <td style={{ ...tdStyle, fontWeight: isSelected ? 700 : 500 }}>
                        <div>{cam.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{zone?.name ?? cam.zone_id}</div>
                      </td>
                      <td style={tdStyle}>
                        <DataBadge
                          dataState={cam.status === "online" ? "live" : cam.status === "degraded" ? "stale" : "unavailable"}
                          provenance={dataProvenance()}
                          compact
                        />
                      </td>
                      <td style={{ ...tdStyle, color: "#64748b", whiteSpace: "nowrap" }}>
                        {cam.last_seen_at ? new Date(cam.last_seen_at).toLocaleTimeString() : "Never"}
                      </td>
                    </tr>
                  );
                })}
                {filteredCameras.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8" }}>
                      No cameras found matching filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Camera Details & Tabs */}
        {selectedCamera ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Camera Overview Card */}
            <div style={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>{selectedCamera.name}</h2>
                  <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.2rem" }}>
                    ID: <code>{selectedCamera.id}</code> | Zone: <code>{selectedCamera.zone_id}</code>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => setShowRotateConfirm(true)}
                    style={{ ...btnStyle, backgroundColor: "#f59e0b", color: "#ffffff", fontSize: "0.75rem" }}
                  >
                    Rotate Secret
                  </button>
                  {selectedCamera.is_active && (
                    <button
                      type="button"
                      onClick={() => setShowDeactivateConfirm(true)}
                      style={{ ...btnStyle, backgroundColor: "#ef4444", color: "#ffffff", fontSize: "0.75rem" }}
                    >
                      Deactivate
                    </button>
                  )}
                </div>
              </div>

              {/* Config details */}
              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem", fontSize: "0.85rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span style={{ fontWeight: 700, color: "#334155" }}>Telemetry Configuration</span>
                  {!isEditingConfig && (
                    <button
                      type="button"
                      onClick={() => setIsEditingConfig(true)}
                      style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}
                    >
                      Edit Config
                    </button>
                  )}
                </div>

                {isEditingConfig ? (
                  <form onSubmit={(e) => void handleUpdateConfig(e)} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                      <div>
                        <label style={labelStyle}>Interval (s)</label>
                        <input
                          type="number"
                          value={configForm.interval_s}
                          onChange={(e) => setConfigForm({ ...configForm, interval_s: Number(e.target.value) })}
                          style={inputStyle}
                          required
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Conf Threshold</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={configForm.conf_threshold}
                          onChange={(e) => setConfigForm({ ...configForm, conf_threshold: Number(e.target.value) })}
                          style={inputStyle}
                          required
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Area (m²)</label>
                        <input
                          type="number"
                          value={configForm.area_m2 ?? ""}
                          onChange={(e) => setConfigForm({ ...configForm, area_m2: e.target.value ? Number(e.target.value) : null })}
                          style={inputStyle}
                        />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button type="submit" style={{ ...btnStyle, backgroundColor: "#16a34a", color: "#ffffff" }}>Save Config</button>
                      <button type="button" onClick={() => setIsEditingConfig(false)} style={btnStyle}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div style={{ display: "flex", gap: "1.5rem", color: "#475569" }}>
                    <div>Interval: <strong>{selectedCamera.config.interval_s}s</strong></div>
                    <div>Confidence: <strong>{selectedCamera.config.conf_threshold}</strong></div>
                    <div>Area: <strong>{selectedCamera.config.area_m2 ? `${selectedCamera.config.area_m2} m²` : "—"}</strong></div>
                    <div>Active: <strong>{selectedCamera.is_active ? "Yes" : "Deactivated"}</strong></div>
                  </div>
                )}
              </div>
            </div>

            {/* Bay ROI Mappings Card */}
            <div style={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", padding: "1.25rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#0f172a" }}>
                Bay ROI Mappings ({mappings.length})
              </h3>
              <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0 0 0.75rem 0" }}>
                Calibrated spatial bounding polygon coordinates for mapped bays
              </p>

              {mappings.length > 0 ? (
                <div style={{ overflowX: "auto", marginBottom: "1rem" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f8fafc", color: "#475569", textAlign: "left" }}>
                        <th style={thStyle}>Bay ID</th>
                        <th style={thStyle}>ROI Polygon</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mappings.map((m) => (
                        <tr key={m.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ ...tdStyle, fontWeight: 700 }}>{m.bay_id}</td>
                          <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "0.75rem", color: "#475569" }}>
                            {JSON.stringify(m.roi_polygon)}
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right" }}>
                            <button
                              type="button"
                              onClick={() => void handleDeleteMapping(m.bay_id)}
                              style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: 600, fontSize: "0.75rem" }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: "0.75rem", color: "#94a3b8", fontSize: "0.85rem", fontStyle: "italic" }}>
                  No ROI mappings configured for this camera yet.
                </div>
              )}

              {/* Form to paste ROI JSON from calibration tool */}
              <form onSubmit={(e) => void handleSaveMapping(e)} style={{ borderTop: "1px dashed #e2e8f0", paddingTop: "0.75rem" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem", color: "#334155" }}>
                  Import ROI Mapping from Edge Calibration Tool
                </div>

                {mappingError && (
                  <div style={{ padding: "0.5rem", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "4px", fontSize: "0.8rem", marginBottom: "0.5rem" }}>
                    {mappingError}
                  </div>
                )}
                {mappingSuccess && (
                  <div style={{ padding: "0.5rem", backgroundColor: "#dcfce7", color: "#166534", borderRadius: "4px", fontSize: "0.8rem", marginBottom: "0.5rem" }}>
                    {mappingSuccess}
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div>
                    <label style={labelStyle}>Bay Identifier</label>
                    <input
                      type="text"
                      placeholder="e.g. a0000001-0000-4000-8000-000000000001"
                      value={roiBayId}
                      onChange={(e) => setRoiBayId(e.target.value)}
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Calibration Output JSON</label>
                    <textarea
                      placeholder='e.g. {"roi_polygon": [[100, 100], [200, 100], [200, 200], [100, 200]]}'
                      value={roiJson}
                      onChange={(e) => setRoiJson(e.target.value)}
                      style={{ ...inputStyle, minHeight: "65px", fontFamily: "monospace" }}
                      required
                    />
                  </div>
                  <button type="submit" style={{ ...btnStyle, backgroundColor: "#2563eb", color: "#ffffff", alignSelf: "flex-start" }}>
                    Save ROI Mapping
                  </button>
                </div>
              </form>
            </div>

            {/* Health Events Card */}
            <div style={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", padding: "1.25rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#0f172a" }}>
                Recent Health Events (Last 50)
              </h3>
              {detailLoading ? (
                <div style={{ padding: "1rem", color: "#64748b" }}>Loading telemetry logs…</div>
              ) : healthEvents.length === 0 ? (
                <div style={{ padding: "0.75rem", color: "#94a3b8", fontSize: "0.85rem" }}>No health records for this camera.</div>
              ) : (
                <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f8fafc", color: "#475569", textAlign: "left" }}>
                        <th style={thStyle}>Timestamp</th>
                        <th style={thStyle}>State</th>
                        <th style={thStyle}>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {healthEvents.map((h, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ ...tdStyle, color: "#64748b", whiteSpace: "nowrap" }}>
                            {new Date(h.observed_at).toLocaleTimeString()}
                          </td>
                          <td style={tdStyle}>
                            <DataBadge
                              dataState={h.state === "online" ? "live" : h.state === "degraded" ? "stale" : "unavailable"}
                              provenance={dataProvenance()}
                              compact
                            />
                          </td>
                          <td style={{ ...tdStyle, fontFamily: "monospace", color: "#475569" }}>
                            {h.detail ? JSON.stringify(h.detail) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", padding: "2rem", textAlign: "center", color: "#64748b" }}>
            Select a camera to inspect configuration and telemetry.
          </div>
        )}
      </div>

      {/* Modal: One-Time Secret Display */}
      {secretModal && (
        <div style={modalBackdropStyle}>
          <div style={modalContentStyle}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, margin: "0 0 0.5rem 0", color: "#0f172a" }}>
              {secretModal.isRotate ? "Secret Rotated Successfully" : "Camera Registered Successfully"}
            </h2>

            {secretModal.isRotate && (
              <div style={{ padding: "0.6rem 0.8rem", backgroundColor: "#fffbeb", color: "#92400e", borderRadius: "6px", fontSize: "0.8rem", marginBottom: "0.75rem", border: "1px solid #fde68a" }}>
                ⚠️ Warning: The previous secret has stopped working immediately for HTTP ingest.
              </div>
            )}

            <p style={{ fontSize: "0.85rem", color: "#334155", lineHeight: 1.4, margin: "0 0 1rem 0" }}>
              Shown once. Add the MQTT credential to the broker password file (username{" "}
              <code>{secretModal.zoneId}/{secretModal.cameraId}</code>) and reload the broker; this is not automatic.
            </p>

            <div style={{ backgroundColor: "#f1f5f9", padding: "0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <code style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", wordBreak: "break-all" }}>
                {secretModal.secret}
              </code>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(secretModal.secret);
                  setCopied(true);
                }}
                style={{ ...btnStyle, backgroundColor: "#2563eb", color: "#ffffff", marginLeft: "0.5rem" }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setSecretModal(null)}
                style={{ ...btnStyle, backgroundColor: "#1e293b", color: "#ffffff" }}
              >
                Close & Clear Secret
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Register Camera */}
      {showRegisterModal && (
        <div style={modalBackdropStyle}>
          <div style={modalContentStyle}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, margin: "0 0 0.75rem 0" }}>Register New Camera</h2>
            <form onSubmit={(e) => void handleRegister(e)} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label style={labelStyle}>Target Zone</label>
                <select
                  value={registerForm.zone_id}
                  onChange={(e) => setRegisterForm({ ...registerForm, zone_id: e.target.value })}
                  style={inputStyle}
                  required
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Camera Name / Label</label>
                <input
                  type="text"
                  placeholder="e.g. CAM-MC-02 (West Entrance)"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <div>
                  <label style={labelStyle}>Capture Interval (s)</label>
                  <input
                    type="number"
                    value={registerForm.interval_s}
                    onChange={(e) => setRegisterForm({ ...registerForm, interval_s: Number(e.target.value) })}
                    style={inputStyle}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Conf Threshold</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={registerForm.conf_threshold}
                    onChange={(e) => setRegisterForm({ ...registerForm, conf_threshold: Number(e.target.value) })}
                    style={inputStyle}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button type="button" onClick={() => setShowRegisterModal(false)} style={btnStyle}>Cancel</button>
                <button type="submit" style={{ ...btnStyle, backgroundColor: "#2563eb", color: "#ffffff" }}>Register</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation: Rotate Secret */}
      {showRotateConfirm && (
        <div style={modalBackdropStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ margin: "0 0 0.5rem 0" }}>Confirm Secret Rotation</h3>
            <p style={{ fontSize: "0.85rem", color: "#475569" }}>
              Are you sure you want to rotate the credential for camera <strong>{selectedCamera?.name}</strong>?
              The current secret will stop working immediately for telemetry ingest.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
              <button type="button" onClick={() => setShowRotateConfirm(false)} style={btnStyle}>Cancel</button>
              <button type="button" onClick={() => void handleRotateSecret()} style={{ ...btnStyle, backgroundColor: "#f59e0b", color: "#ffffff" }}>
                Yes, Rotate Secret
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation: Deactivate Camera */}
      {showDeactivateConfirm && (
        <div style={modalBackdropStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#991b1b" }}>Deactivate Camera</h3>
            <p style={{ fontSize: "0.85rem", color: "#475569" }}>
              Are you sure you want to deactivate camera <strong>{selectedCamera?.name}</strong>? It will stop publishing live bay occupancy.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
              <button type="button" onClick={() => setShowDeactivateConfirm(false)} style={btnStyle}>Cancel</button>
              <button type="button" onClick={() => void handleDeactivate()} style={{ ...btnStyle, backgroundColor: "#ef4444", color: "#ffffff" }}>
                Deactivate Camera
              </button>
            </div>
          </div>
        </div>
      )}
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
  padding: "0.55rem 0.75rem",
  fontSize: "0.75rem",
  fontWeight: 600,
  borderBottom: "1px solid #e2e8f0",
};

const tdStyle: React.CSSProperties = {
  padding: "0.55rem 0.75rem",
};

const modalBackdropStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  padding: "1.5rem",
  maxWidth: "500px",
  width: "90%",
  boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
};
