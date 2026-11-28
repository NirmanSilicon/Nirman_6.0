import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { api, describeApiError } from "../api/client";
import type {
  Page,
  ZoneOut,
  ZoneLiveOut,
  CrowdCurrentOut,
  LiveEvent,
} from "../api/types";
import { useLiveStream } from "../realtime/useLiveStream";
import { DataBadge, CrowdChip } from "../components/DataBadge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

async function fetchWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const currentIndex = index++;
      const item = items[currentIndex];
      if (item !== undefined) {
        results[currentIndex] = await fn(item);
      }
    }
  }
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

export default function OverviewPage(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zones, setZones] = useState<ZoneOut[]>([]);
  const [live, setLive] = useState<Record<string, ZoneLiveOut>>({});
  const [crowd, setCrowd] = useState<Record<string, CrowdCurrentOut>>({});
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const debounceTimers = useRef<Record<string, number>>({});

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const zonesPage = await api<Page<ZoneOut>>("/zones?limit=200");
      const zoneList = zonesPage.items ?? [];

      const [crowdOverview, liveList] = await Promise.all([
        api<CrowdCurrentOut[]>("/crowd/overview").catch(() => []),
        fetchWithConcurrencyLimit(zoneList, 6, (z) =>
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
      for (const l of liveList) {
        liveMap[l.zone_id] = l;
      }

      setZones(zoneList);
      setCrowd(crowdMap);
      setLive(liveMap);
      setLoadedAt(new Date());
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
    return () => {
      for (const timer of Object.values(debounceTimers.current)) {
        window.clearTimeout(timer);
      }
    };
  }, [loadAll]);

  const refreshZoneData = useCallback(async (zoneId: string) => {
    try {
      const [liveData, crowdData] = await Promise.all([
        api<ZoneLiveOut>(`/zones/${zoneId}/live`).catch(() => null),
        api<CrowdCurrentOut>(`/crowd/zones/${zoneId}/current`).catch(() => null),
      ]);
      if (liveData) {
        setLive((prev) => ({ ...prev, [zoneId]: liveData }));
      }
      if (crowdData) {
        setCrowd((prev) => ({ ...prev, [zoneId]: crowdData }));
      }
    } catch {
      // Ignore background refresh failure
    }
  }, []);

  const handleEvent = useCallback(
    (e: LiveEvent) => {
      let zoneId: string | undefined;
      if (e.event === "bay_changed") {
        zoneId = e.data.zone_id;
      } else if (e.event === "zone_summary" || e.event === "crowd_changed") {
        zoneId = e.data.zone_id;
      }
      if (zoneId) {
        if (debounceTimers.current[zoneId]) {
          window.clearTimeout(debounceTimers.current[zoneId]);
        }
        debounceTimers.current[zoneId] = window.setTimeout(() => {
          void refreshZoneData(zoneId!);
        }, 500);
      }
    },
    [refreshZoneData]
  );

  const { connected } = useLiveStream({
    onEvent: handleEvent,
    onResync: loadAll,
  });

  // KPI calculations
  const kpis = useMemo(() => {
    let zonesLive = 0;
    let zonesStale = 0;
    let zonesUnavailable = 0;
    let zonesUnknown = 0;
    let highOrVeryHigh = 0;

    for (const z of zones) {
      const l = live[z.id];
      const state = l?.data_state ?? "unknown";
      if (state === "live") zonesLive++;
      else if (state === "stale") zonesStale++;
      else if (state === "unavailable") zonesUnavailable++;
      else zonesUnknown++;

      const c = crowd[z.id];
      if (c && (c.level === "high" || c.level === "very_high")) {
        highOrVeryHigh++;
      }
    }

    const validZones = zones.filter((z) => {
      const l = live[z.id];
      return l && l.occupied_bays !== null && l.available_bays !== null;
    });

    let cityOccupancyDisplay = "n/a";
    if (validZones.length > 0) {
      const totalOccupied = validZones.reduce(
        (sum, z) => sum + (live[z.id]!.occupied_bays ?? 0),
        0
      );
      const totalAvailable = validZones.reduce(
        (sum, z) => sum + (live[z.id]!.available_bays ?? 0),
        0
      );
      const total = totalOccupied + totalAvailable;
      if (total > 0) {
        cityOccupancyDisplay = `${Math.round((totalOccupied / total) * 100)}%`;
      }
    }

    return {
      zonesTotal: zones.length,
      zonesLive,
      zonesStale,
      zonesUnavailable,
      zonesUnknown,
      highOrVeryHigh,
      cityOccupancyDisplay,
    };
  }, [zones, live, crowd]);

  const sortedZones = useMemo(() => {
    return [...zones].sort((a, b) => a.name.localeCompare(b.name));
  }, [zones]);

  const liveZonesForChart = useMemo(() => {
    return sortedZones.filter((z) => live[z.id]?.data_state === "live");
  }, [sortedZones, live]);

  const chartData = useMemo(() => {
    return liveZonesForChart.map((z) => ({
      name: z.name.replace(/^DEMO\s+/, ""),
      fullName: z.name,
      Occupied: live[z.id]?.occupied_bays ?? null,
      Available: live[z.id]?.available_bays ?? null,
    }));
  }, [liveZonesForChart, live]);

  const nonLiveZones = useMemo(() => {
    return sortedZones.filter((z) => live[z.id]?.data_state !== "live");
  }, [sortedZones, live]);

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
        Loading municipal overview data…
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
        <h3 style={{ margin: "0 0 0.5rem 0" }}>Failed to load overview</h3>
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

  if (zones.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
        No parking or loading zones registered in the city.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header with Live Status Chip */}
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
            Municipal Overview
          </h1>
          <p style={{ color: "#64748b", margin: "0.25rem 0 0 0", fontSize: "0.9rem" }}>
            City-wide live parking metrics, crowd status, and zone operational telemetry
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {!connected ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.3rem 0.65rem",
                borderRadius: "9999px",
                backgroundColor: "#fef3c7",
                color: "#92400e",
                border: "1px solid #fde68a",
                fontSize: "0.8rem",
                fontWeight: 700,
              }}
            >
              <span>⏸</span>
              <span>Live updates paused</span>
            </span>
          ) : (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.3rem 0.65rem",
                borderRadius: "9999px",
                backgroundColor: "#dcfce7",
                color: "#166534",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              <span>●</span>
              <span>Live stream connected</span>
            </span>
          )}

          {loadedAt && (
            <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              Refreshed {loadedAt.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "1rem",
        }}
      >
        <div style={kpiCardStyle}>
          <div style={kpiLabelStyle}>Total Zones</div>
          <div style={kpiValueRowStyle}>
            <span style={kpiNumberStyle}>{kpis.zonesTotal}</span>
            <DataBadge provenance="simulated" compact />
          </div>
        </div>

        <div style={{ ...kpiCardStyle, borderLeft: "4px solid #16a34a" }}>
          <div style={kpiLabelStyle}>Live Zones</div>
          <div style={kpiValueRowStyle}>
            <span style={{ ...kpiNumberStyle, color: "#16a34a" }}>
              {kpis.zonesLive}
            </span>
            <DataBadge dataState="live" compact />
          </div>
        </div>

        <div style={{ ...kpiCardStyle, borderLeft: "4px solid #f59e0b" }}>
          <div style={kpiLabelStyle}>Stale Zones</div>
          <div style={kpiValueRowStyle}>
            <span style={{ ...kpiNumberStyle, color: "#d97706" }}>
              {kpis.zonesStale}
            </span>
            <DataBadge dataState="stale" compact />
          </div>
        </div>

        <div style={{ ...kpiCardStyle, borderLeft: "4px solid #ef4444" }}>
          <div style={kpiLabelStyle}>Unavailable Zones</div>
          <div style={kpiValueRowStyle}>
            <span style={{ ...kpiNumberStyle, color: "#dc2626" }}>
              {kpis.zonesUnavailable}
            </span>
            <DataBadge dataState="unavailable" compact />
          </div>
        </div>

        <div style={{ ...kpiCardStyle, borderLeft: "4px solid #94a3b8" }}>
          <div style={kpiLabelStyle}>Unknown State</div>
          <div style={kpiValueRowStyle}>
            <span style={{ ...kpiNumberStyle, color: "#64748b" }}>
              {kpis.zonesUnknown}
            </span>
            <DataBadge dataState="unknown" compact />
          </div>
        </div>

        <div style={{ ...kpiCardStyle, borderLeft: "4px solid #ea580c" }}>
          <div style={kpiLabelStyle}>High / Very High Crowd</div>
          <div style={kpiValueRowStyle}>
            <span style={{ ...kpiNumberStyle, color: "#ea580c" }}>
              {kpis.highOrVeryHigh}
            </span>
            <DataBadge provenance="simulated" compact />
          </div>
        </div>

        <div style={{ ...kpiCardStyle, borderLeft: "4px solid #2563eb" }}>
          <div style={kpiLabelStyle}>City-Wide Occupancy</div>
          <div style={kpiValueRowStyle}>
            <span style={{ ...kpiNumberStyle, color: "#2563eb" }}>
              {kpis.cityOccupancyDisplay}
            </span>
            <DataBadge provenance="simulated" compact />
          </div>
        </div>
      </div>

      {/* Chart: Occupied vs Available for LIVE zones only */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          padding: "1.25rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
              Live Zone Capacity Utilization
            </h2>
            <p style={{ margin: "0.2rem 0 0 0", color: "#64748b", fontSize: "0.8rem" }}>
              Active bays comparison for live reporting zones only
            </p>
          </div>
          <DataBadge dataState="live" provenance="simulated" compact />
        </div>

        {chartData.length > 0 ? (
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#475569" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#475569" }} />
                <Tooltip
                  content={({ active: tooltipActive, payload }) => {
                    if (tooltipActive && payload && payload.length) {
                      const data = payload[0]?.payload as { fullName: string; Occupied: number | null; Available: number | null };
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
                          <div style={{ fontWeight: 700, marginBottom: "4px" }}>
                            {data.fullName}
                          </div>
                          <div>Occupied: {data.Occupied !== null ? `${data.Occupied} bays` : "No live data"}</div>
                          <div>Available: {data.Available !== null ? `${data.Available} bays` : "No live data"}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="Occupied" fill="#ef4444" name="Occupied Bays" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Available" fill="#22c55e" name="Available Bays" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
            No zones are currently in a live data state.
          </div>
        )}

        {/* List stale/unavailable zones under the chart */}
        {nonLiveZones.length > 0 && (
          <div
            style={{
              marginTop: "1rem",
              paddingTop: "0.75rem",
              borderTop: "1px dashed #e2e8f0",
              fontSize: "0.85rem",
              color: "#64748b",
            }}
          >
            <span style={{ fontWeight: 600, color: "#b45309" }}>
              not shown: no live data:
            </span>{" "}
            {nonLiveZones.map((z, idx) => (
              <span key={z.id}>
                {z.name} ({live[z.id]?.data_state ?? "unknown"})
                {idx < nonLiveZones.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Zone Table Sorted by Name */}
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
            padding: "1rem 1.25rem",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
            All Municipal Zones
          </h2>
          <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
            Sorted alphabetically by zone name
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", textAlign: "left", color: "#475569" }}>
                <th style={thStyle}>Zone Name</th>
                <th style={thStyle}>Kind</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Capacity</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Available</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Occupied</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Unknown</th>
                <th style={thStyle}>Crowd Level</th>
                <th style={thStyle}>Telemetry & State</th>
                <th style={thStyle}>Observed At</th>
              </tr>
            </thead>
            <tbody>
              {sortedZones.map((zone) => {
                const liveData = live[zone.id];
                const crowdData = crowd[zone.id];
                const dataState = liveData?.data_state ?? "unknown";
                const isLive = dataState === "live";

                return (
                  <tr
                    key={zone.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      backgroundColor: isLive ? "#ffffff" : "#fcfcfd",
                    }}
                  >
                    <td style={{ ...tdStyle, fontWeight: 600, color: "#0f172a" }}>
                      {zone.name}
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          textTransform: "capitalize",
                          padding: "0.15rem 0.4rem",
                          borderRadius: "4px",
                          backgroundColor: "#f1f5f9",
                          fontSize: "0.75rem",
                        }}
                      >
                        {zone.kind}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>
                      {zone.capacity}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      {liveData?.available_bays !== null && liveData?.available_bays !== undefined ? (
                        <span style={{ color: "#16a34a", fontWeight: 700 }}>
                          {liveData.available_bays}
                        </span>
                      ) : (
                        <span title="no live data" style={{ color: "#94a3b8" }}>
                          —
                        </span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      {liveData?.occupied_bays !== null && liveData?.occupied_bays !== undefined ? (
                        <span style={{ color: "#dc2626", fontWeight: 700 }}>
                          {liveData.occupied_bays}
                        </span>
                      ) : (
                        <span title="no live data" style={{ color: "#94a3b8" }}>
                          —
                        </span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", color: "#64748b" }}>
                      {liveData?.unknown_bays != null ? liveData.unknown_bays : "-"}
                    </td>
                    <td style={tdStyle}>
                      <CrowdChip level={crowdData?.level ?? "unknown"} />
                    </td>
                    <td style={tdStyle}>
                      <DataBadge
                        dataState={dataState}
                        provenance={liveData?.provenance ?? "simulated"}
                        compact
                      />
                    </td>
                    <td style={{ ...tdStyle, color: "#64748b", whiteSpace: "nowrap" }}>
                      {liveData?.observed_at
                        ? new Date(liveData.observed_at).toLocaleTimeString()
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const kpiCardStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "1rem",
  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
};

const kpiLabelStyle: React.CSSProperties = {
  fontSize: "0.8rem",
  color: "#64748b",
  fontWeight: 600,
  marginBottom: "0.4rem",
};

const kpiValueRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
};

const kpiNumberStyle: React.CSSProperties = {
  fontSize: "1.6rem",
  fontWeight: 800,
  color: "#0f172a",
  lineHeight: 1,
};

const thStyle: React.CSSProperties = {
  padding: "0.75rem 1rem",
  fontWeight: 600,
  fontSize: "0.8rem",
  borderBottom: "1px solid #e2e8f0",
};

const tdStyle: React.CSSProperties = {
  padding: "0.75rem 1rem",
  fontSize: "0.85rem",
};
