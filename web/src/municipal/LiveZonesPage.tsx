import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, describeApiError } from "../api/client";
import type {
  Page,
  ZoneOut,
  ZoneLiveOut,
  BayWithStatus,
  CrowdCurrentOut,
  DataState,
  CrowdLevel,
  LiveEvent,
} from "../api/types";
import { useLiveStream } from "../realtime/useLiveStream";
import { ZoneMap } from "../components/ZoneMap";
import { DataBadge, CrowdChip, dataProvenance } from "../components/DataBadge";

export default function LiveZonesPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const initialZoneId = searchParams.get("zone");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zones, setZones] = useState<ZoneOut[]>([]);
  const [live, setLive] = useState<Record<string, ZoneLiveOut>>({});
  const [crowd, setCrowd] = useState<Record<string, CrowdCurrentOut>>({});
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(initialZoneId);
  const [bays, setBays] = useState<BayWithStatus[]>([]);
  const [baysLoading, setBaysLoading] = useState(false);
  const [filter, setFilter] = useState<{
    state: DataState | "all";
    crowd: CrowdLevel | "all";
  }>({
    state: "all",
    crowd: "all",
  });

  const [now, setNow] = useState<number>(Date.now());
  const selectedZoneIdRef = useRef<string | null>(selectedZoneId);
  const debounceTimers = useRef<Record<string, number>>({});

  useEffect(() => {
    selectedZoneIdRef.current = selectedZoneId;
  }, [selectedZoneId]);

  // Keep clock ticking for age in seconds display
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const zonesPage = await api<Page<ZoneOut>>("/zones?limit=200");
      const zoneList = zonesPage.items ?? [];

      const [crowdOverview, ...liveResponses] = await Promise.all([
        api<CrowdCurrentOut[]>("/crowd/overview").catch(() => []),
        ...zoneList.map((z) =>
          api<ZoneLiveOut>(`/zones/${z.id}/live`).catch(() => ({
            zone_id: z.id,
            available_bays: null,
            occupied_bays: null,
            unknown_bays: z.capacity,
            data_state: "unknown" as const,
            observed_at: null,
            provenance: "simulated" as const,
          }))
        ),
      ]);

      const crowdMap: Record<string, CrowdCurrentOut> = {};
      for (const c of crowdOverview) {
        crowdMap[c.zone_id] = c;
      }

      const liveMap: Record<string, ZoneLiveOut> = {};
      for (const l of liveResponses) {
        liveMap[l.zone_id] = l;
      }

      setZones(zoneList);
      setCrowd(crowdMap);
      setLive(liveMap);

      if (!selectedZoneIdRef.current && zoneList.length > 0) {
        setSelectedZoneId(zoneList[0]!.id);
      }
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
    return () => {
      for (const t of Object.values(debounceTimers.current)) {
        window.clearTimeout(t);
      }
    };
  }, [loadAll]);

  // Fetch bays when selected zone changes
  useEffect(() => {
    if (!selectedZoneId) {
      setBays([]);
      return;
    }

    let active = true;
    setBaysLoading(true);

    api<BayWithStatus[]>(`/zones/${selectedZoneId}/bays`)
      .then((bayList) => {
        if (active) {
          setBays(bayList ?? []);
        }
      })
      .catch(() => {
        if (active) {
          setBays([]);
        }
      })
      .finally(() => {
        if (active) {
          setBaysLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedZoneId]);

  const handleEvent = useCallback((e: LiveEvent) => {
    if (e.event === "bay_changed") {
      const { bay_id, zone_id, occupancy, observed_at } = e.data;
      if (zone_id === selectedZoneIdRef.current) {
        // Patch bay row in-place
        setBays((prev) =>
          prev.map((item) => {
            if (item.bay.id === bay_id || item.status.bay_id === bay_id) {
              return {
                ...item,
                status: {
                  ...item.status,
                  occupancy,
                  observed_at,
                },
              };
            }
            return item;
          })
        );

        // Re-fetch zone live summary
        api<ZoneLiveOut>(`/zones/${zone_id}/live`)
          .then((liveData) => {
            setLive((prev) => ({ ...prev, [zone_id]: liveData }));
          })
          .catch(() => {});
      } else {
        // Debounced refresh of other zone
        if (debounceTimers.current[zone_id]) {
          window.clearTimeout(debounceTimers.current[zone_id]);
        }
        debounceTimers.current[zone_id] = window.setTimeout(() => {
          api<ZoneLiveOut>(`/zones/${zone_id}/live`)
            .then((liveData) => {
              setLive((prev) => ({ ...prev, [zone_id]: liveData }));
            })
            .catch(() => {});
        }, 500);
      }
    } else if (e.event === "zone_summary" || e.event === "crowd_changed") {
      const zone_id = e.data.zone_id;
      if (debounceTimers.current[zone_id]) {
        window.clearTimeout(debounceTimers.current[zone_id]);
      }
      debounceTimers.current[zone_id] = window.setTimeout(() => {
        api<ZoneLiveOut>(`/zones/${zone_id}/live`)
          .then((liveData) => {
            setLive((prev) => ({ ...prev, [zone_id]: liveData }));
          })
          .catch(() => {});
      }, 500);
    }
  }, []);

  useLiveStream({
    onEvent: handleEvent,
    onResync: loadAll,
  });

  // Client-side filtering
  const filteredZones = useMemo(() => {
    return zones.filter((z) => {
      const liveData = live[z.id];
      const dataState = liveData?.data_state ?? "unknown";
      const crowdData = crowd[z.id];
      const crowdLevel = crowdData?.level ?? "unknown";

      if (filter.state !== "all" && dataState !== filter.state) {
        return false;
      }
      if (filter.crowd !== "all" && crowdLevel !== filter.crowd) {
        return false;
      }
      return true;
    });
  }, [zones, live, crowd, filter]);

  const selectedZone = useMemo(() => {
    return zones.find((z) => z.id === selectedZoneId) ?? null;
  }, [zones, selectedZoneId]);

  const selectedLive = selectedZoneId ? live[selectedZoneId] : null;
  const isUnavailable = selectedLive?.data_state === "unavailable";

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
        Loading live zones telemetry…
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: "1.5rem",
          backgroundColor: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "8px",
          color: "#991b1b",
        }}
      >
        <h3 style={{ margin: "0 0 0.5rem 0" }}>Failed to load live zones</h3>
        <p style={{ margin: "0 0 1rem 0" }}>{error}</p>
        <button
          type="button"
          onClick={() => void loadAll()}
          style={{
            padding: "0.4rem 0.8rem",
            backgroundColor: "#ef4444",
            color: "#ffffff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Top Header & Filters */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "#0f172a",
              margin: 0,
            }}
          >
            Live Zones & Bays Inspector
          </h1>
          <p style={{ color: "#64748b", margin: "0.25rem 0 0 0", fontSize: "0.9rem" }}>
            Real-time geospatial map, degraded zone monitoring, and bay-level occupancy
          </p>
        </div>

        {/* Filter Controls (default 'all' so degraded zones are never hidden) */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <label
              htmlFor="filter-state"
              style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}
            >
              Data State:
            </label>
            <select
              id="filter-state"
              value={filter.state}
              onChange={(e) =>
                setFilter((prev) => ({
                  ...prev,
                  state: e.target.value as DataState | "all",
                }))
              }
              style={selectStyle}
            >
              <option value="all">All States</option>
              <option value="live">Live</option>
              <option value="stale">Stale</option>
              <option value="unavailable">Unavailable</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <label
              htmlFor="filter-crowd"
              style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}
            >
              Crowd:
            </label>
            <select
              id="filter-crowd"
              value={filter.crowd}
              onChange={(e) =>
                setFilter((prev) => ({
                  ...prev,
                  crowd: e.target.value as CrowdLevel | "all",
                }))
              }
              style={selectStyle}
            >
              <option value="all">All Levels</option>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
              <option value="very_high">Very High</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Map, Right Zones & Bays */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(350px, 1fr) minmax(400px, 1.2fr)",
          gap: "1.25rem",
          alignItems: "start",
        }}
      >
        {/* Left: ZoneMap */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            padding: "0.75rem",
          }}
        >
          <div style={{ marginBottom: "0.5rem", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>
              Geospatial Zone Map
            </span>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
              Showing {filteredZones.length} of {zones.length} zones
            </span>
          </div>
          <ZoneMap
            zones={filteredZones}
            live={live}
            selectedId={selectedZoneId}
            onSelect={(id) => setSelectedZoneId(id)}
            height="550px"
          />
        </div>

        {/* Right: Zones Table & Selected Zone Bay Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Filtered Zone Selection List */}
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
                padding: "0.75rem 1rem",
                backgroundColor: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                fontSize: "0.85rem",
                fontWeight: 700,
                color: "#334155",
              }}
            >
              Select a Zone
            </div>
            <div style={{ maxHeight: "200px", overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <tbody>
                  {filteredZones.map((z) => {
                    const isSelected = z.id === selectedZoneId;
                    const l = live[z.id];
                    const c = crowd[z.id];
                    return (
                      <tr
                        key={z.id}
                        onClick={() => setSelectedZoneId(z.id)}
                        style={{
                          cursor: "pointer",
                          backgroundColor: isSelected ? "#eff6ff" : "transparent",
                          borderBottom: "1px solid #f1f5f9",
                        }}
                      >
                        <td style={{ padding: "0.6rem 0.8rem", fontWeight: isSelected ? 700 : 500 }}>
                          {z.name}
                        </td>
                        <td style={{ padding: "0.6rem 0.8rem" }}>
                          <DataBadge dataState={l?.data_state} provenance={dataProvenance(l?.provenance)} compact />
                        </td>
                        <td style={{ padding: "0.6rem 0.8rem" }}>
                          <CrowdChip level={c?.level ?? "unknown"} />
                        </td>
                        <td style={{ padding: "0.6rem 0.8rem", textAlign: "right", color: "#475569" }}>
                          {l?.available_bays !== null && l?.available_bays !== undefined
                            ? `${l.available_bays} free / ${z.capacity}`
                            : `— / ${z.capacity}`}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredZones.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: "1rem", textAlign: "center", color: "#94a3b8" }}>
                        No zones match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Zone Bay Inspector */}
          {selectedZone ? (
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.85rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  borderBottom: "1px solid #f1f5f9",
                  paddingBottom: "0.75rem",
                }}
              >
                <div>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                    {selectedZone.name}
                  </h2>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      marginTop: "0.25rem",
                      fontSize: "0.8rem",
                      color: "#64748b",
                    }}
                  >
                    <span>Kind: {selectedZone.kind}</span>
                    <span>Capacity: {selectedZone.capacity} bays</span>
                    <span>
                      Coords: {selectedZone.centroid.lat.toFixed(4)}, {selectedZone.centroid.lon.toFixed(4)}
                    </span>
                  </div>
                </div>

                <DataBadge
                  dataState={selectedLive?.data_state}
                  provenance={dataProvenance(selectedLive?.provenance)}
                  observedAt={selectedLive?.observed_at}
                />
              </div>

              {/* Unavailable State Warning */}
              {isUnavailable && (
                <div
                  style={{
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "6px",
                    padding: "0.75rem 1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    color: "#991b1b",
                    fontSize: "0.85rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span>⚠️</span>
                    <span style={{ fontWeight: 600 }}>
                      Camera offline or data too old: occupancy is not shown
                    </span>
                  </div>
                  <Link
                    to={`/field/devices?zone=${selectedZone.id}`}
                    style={{
                      color: "#b91c1c",
                      fontWeight: 700,
                      textDecoration: "underline",
                      fontSize: "0.8rem",
                    }}
                  >
                    Inspect in Field Devices &rarr;
                  </Link>
                </div>
              )}

              {/* Bay List Table */}
              <div>
                <div
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    color: "#334155",
                    marginBottom: "0.5rem",
                  }}
                >
                  Bay Allocation & Status
                </div>

                {baysLoading ? (
                  <div style={{ padding: "1.5rem", textAlign: "center", color: "#64748b" }}>
                    Loading bays…
                  </div>
                ) : bays.length === 0 ? (
                  <div style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8" }}>
                    No bay telemetry available for this zone.
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "0.8rem",
                      }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: "#f8fafc", color: "#475569", textAlign: "left" }}>
                          <th style={bThStyle}>Code</th>
                          <th style={bThStyle}>Type</th>
                          <th style={bThStyle}>Occupancy</th>
                          <th style={bThStyle}>Reserved</th>
                          <th style={bThStyle}>State</th>
                          <th style={bThStyle}>Observed At</th>
                          <th style={bThStyle}>Age</th>
                          <th style={bThStyle}>Provenance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bays.map((item) => {
                          const bay = item.bay;
                          const st = item.status;
                          const zoneState = selectedLive?.data_state ?? st.data_state;
                          // Rule: Show "unknown" when data_state is unavailable or unknown
                          const displayOccupancy =
                            zoneState === "unavailable" || zoneState === "unknown"
                              ? "unknown"
                              : st.occupancy;

                          const ageSec = st.observed_at
                            ? Math.max(0, Math.floor((now - new Date(st.observed_at).getTime()) / 1000))
                            : null;

                          return (
                            <tr
                              key={bay.id}
                              style={{
                                borderBottom: "1px solid #f1f5f9",
                                backgroundColor: st.reserved ? "#fffbeb" : "#ffffff",
                              }}
                            >
                              <td style={{ ...bTdStyle, fontWeight: 700, color: "#0f172a" }}>
                                {bay.code}
                              </td>
                              <td style={bTdStyle}>
                                <span
                                  style={{
                                    textTransform: "capitalize",
                                    padding: "0.1rem 0.35rem",
                                    borderRadius: "3px",
                                    backgroundColor: "#f1f5f9",
                                    fontSize: "0.75rem",
                                  }}
                                >
                                  {bay.bay_type}
                                </span>
                              </td>
                              <td style={bTdStyle}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "0.15rem 0.45rem",
                                    borderRadius: "4px",
                                    fontWeight: 700,
                                    fontSize: "0.75rem",
                                    backgroundColor:
                                      displayOccupancy === "free"
                                        ? "#dcfce7"
                                        : displayOccupancy === "occupied"
                                          ? "#fee2e2"
                                          : "#f3f4f6",
                                    color:
                                      displayOccupancy === "free"
                                        ? "#15803d"
                                        : displayOccupancy === "occupied"
                                          ? "#b91c1c"
                                          : "#4b5563",
                                    border:
                                      displayOccupancy === "unknown"
                                        ? "1px dashed #9ca3af"
                                        : "1px solid transparent",
                                  }}
                                >
                                  {displayOccupancy}
                                </span>
                              </td>
                              <td style={bTdStyle}>
                                {st.reserved ? (
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "0.15rem 0.45rem",
                                      borderRadius: "4px",
                                      backgroundColor: "#fef3c7",
                                      color: "#92400e",
                                      fontWeight: 700,
                                      fontSize: "0.75rem",
                                      border: "1px solid #fde68a",
                                    }}
                                  >
                                    Reserved
                                  </span>
                                ) : (
                                  <span style={{ color: "#94a3b8" }}>—</span>
                                )}
                              </td>
                              <td style={bTdStyle}>
                                <DataBadge dataState={st.data_state} compact />
                              </td>
                              <td style={{ ...bTdStyle, color: "#475569", whiteSpace: "nowrap" }}>
                                {st.observed_at ? new Date(st.observed_at).toLocaleTimeString() : "—"}
                              </td>
                              <td style={{ ...bTdStyle, color: "#64748b", whiteSpace: "nowrap" }}>
                                {ageSec !== null ? `${ageSec}s ago` : "—"}
                              </td>
                              <td style={bTdStyle}>
                                <DataBadge provenance={st.provenance} compact />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                padding: "2rem",
                textAlign: "center",
                color: "#64748b",
              }}
            >
              Select a zone to view its live bay telemetry.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "0.3rem 0.6rem",
  borderRadius: "4px",
  border: "1px solid #cbd5e1",
  fontSize: "0.8rem",
  backgroundColor: "#ffffff",
  color: "#1e293b",
};

const bThStyle: React.CSSProperties = {
  padding: "0.5rem 0.65rem",
  fontWeight: 600,
  fontSize: "0.75rem",
  borderBottom: "1px solid #e2e8f0",
};

const bTdStyle: React.CSSProperties = {
  padding: "0.5rem 0.65rem",
  fontSize: "0.8rem",
};
