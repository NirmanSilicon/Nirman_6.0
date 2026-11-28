import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { ZoneOut, ZoneLiveOut, LatLon } from "../api/types";

export interface ZoneMapProps {
  zones: ZoneOut[];
  live?: Record<string, ZoneLiveOut>;
  selectedId?: string | null;
  onSelect?(zoneId: string): void;
  center?: LatLon;
  zoom?: number;
  height?: number | string;
}

function toLngLat(ll: LatLon): [number, number] {
  return [ll.lon, ll.lat];
}

export function ZoneMap({
  zones,
  live = {},
  selectedId,
  onSelect,
  center = { lat: 20.2961, lon: 85.8245 }, // Default Bhubaneswar
  zoom = 12,
  height = "450px",
}: ZoneMapProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, { marker: maplibregl.Marker; el: HTMLButtonElement }>>(new Map());
  const [basemapUnavailable, setBasemapUnavailable] = useState(false);

  // Initialize MapLibre instance
  useEffect(() => {
    if (!containerRef.current) return;

    const styleOverride = typeof import.meta.env !== "undefined" ? import.meta.env.VITE_MAP_STYLE_URL : undefined;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleOverride ?? {
        version: 8,
        sources: {
          "osm-raster": {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "osm-raster-layer",
            type: "raster",
            source: "osm-raster",
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: toLngLat(center),
      zoom,
    });

    map.on("error", (e) => {
      // Check for tile/source load error
      if (e.error) {
        setBasemapUnavailable(true);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update center/zoom if map exists and no zones
  useEffect(() => {
    if (!mapRef.current || zones.length > 0) return;
    mapRef.current.setCenter(toLngLat(center));
    mapRef.current.setZoom(zoom);
  }, [center.lat, center.lon, zoom, zones.length]);

  // Fit bounds when zone IDs set changes
  const zoneIdsKey = zones.map((z) => z.id).sort().join(",");
  useEffect(() => {
    const map = mapRef.current;
    if (!map || zones.length === 0) return;

    const firstZone = zones[0];
    if (!firstZone) return;
    const bounds = new maplibregl.LngLatBounds(toLngLat(firstZone.centroid), toLngLat(firstZone.centroid));
    for (const z of zones) {
      bounds.extend(toLngLat(z.centroid));
    }
    map.fitBounds(bounds, { padding: 40, maxZoom: 15 });
  }, [zoneIdsKey]);

  // Diff and update DOM markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentMap = markersRef.current;
    const newZoneIds = new Set(zones.map((z) => z.id));

    // Remove markers that no longer exist
    for (const [id, item] of currentMap.entries()) {
      if (!newZoneIds.has(id)) {
        item.marker.remove();
        currentMap.delete(id);
      }
    }

    // Add or update markers
    for (const zone of zones) {
      const liveData = live[zone.id];
      const dataState = liveData?.data_state ?? "unknown";
      const availableBays = liveData?.available_bays;
      const labelText = availableBays !== null && availableBays !== undefined ? `${availableBays}` : "no data";
      const ariaText = `${zone.name}, ${availableBays !== null && availableBays !== undefined ? `${availableBays} bays available` : "no data"}`;
      const isSelected = selectedId === zone.id;

      let entry = currentMap.get(zone.id);
      if (!entry) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px 8px;
          border-radius: 9999px;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.25);
          transition: transform 0.15s ease;
        `;
        btn.addEventListener("click", () => {
          onSelect?.(zone.id);
        });

        const marker = new maplibregl.Marker({ element: btn }).setLngLat(toLngLat(zone.centroid)).addTo(map);
        entry = { marker, el: btn };
        currentMap.set(zone.id, entry);
      }

      // Update styling based on dataState & selection
      const btn = entry.el;
      btn.setAttribute("aria-label", ariaText);
      btn.innerText = labelText;

      let bg = "#ffffff";
      let color = "#1f2937";
      let border = "2px solid #6b7280";

      if (dataState === "live") {
        bg = "#16a34a";
        color = "#ffffff";
        border = "2px solid #14532d";
      } else if (dataState === "stale") {
        bg = "repeating-linear-gradient(45deg, #f59e0b, #f59e0b 6px, #d97706 6px, #d97706 12px)";
        color = "#ffffff";
        border = "2px solid #b45309";
      } else if (dataState === "unavailable") {
        bg = "#9ca3af";
        color = "#ffffff";
        border = "2px solid #6b7280";
      } else {
        // unknown
        bg = "#ffffff";
        color = "#374151";
        border = "2px dashed #9ca3af";
      }

      btn.style.background = bg;
      btn.style.color = color;
      btn.style.border = isSelected ? "3px solid #2563eb" : border;
      btn.style.transform = isSelected ? "scale(1.2)" : "scale(1)";
      entry.marker.setLngLat(toLngLat(zone.centroid));
    }
  }, [zones, live, selectedId, onSelect]);

  return (
    <div style={{ position: "relative", width: "100%", height, borderRadius: "8px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
      {basemapUnavailable && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            right: "10px",
            zIndex: 10,
            backgroundColor: "#fef2f2",
            color: "#991b1b",
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #fecaca",
            fontSize: "13px",
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          Basemap unavailable
        </div>
      )}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
