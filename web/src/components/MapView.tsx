import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Recycler } from "../types";

interface Props {
  items: Recycler[]; selectedId: number | null; savedIds: number[]; visitedIds: number[];
  center: { lat: number; lng: number }; user: { lat: number; lng: number } | null;
  fitKey: string; onSelect: (id: number) => void;
}

const style = (sel: boolean, saved: boolean, visited: boolean): L.CircleMarkerOptions =>
  sel ? { radius: 12, fillColor: "#f26a1b", color: "#0e0d0c", weight: 4, fillOpacity: 1 }
  : visited ? { radius: 8, fillColor: "#f26a1b", color: "#fff", weight: 2, fillOpacity: 1 }
  : saved ? { radius: 8, fillColor: "#f5a623", color: "#0e0d0c", weight: 2, fillOpacity: 1 }
  : { radius: 6, fillColor: "#0e0d0c", color: "#f26a1b", weight: 2, fillOpacity: 0.95 };

/** Canvas-rendered markers: stays smooth with the full national list. Loaded lazily with the Map route only. */
export default function MapView({ items, selectedId, savedIds, visitedIds, center, user, fitKey, onSelect }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const markers = useRef(new Map<number, L.CircleMarker>());
  const userMarker = useRef<L.CircleMarker | null>(null);
  const cb = useRef(onSelect); cb.current = onSelect;

  useEffect(() => {
    const m = L.map(el.current!, { preferCanvas: true, zoomControl: false }).setView([center.lat, center.lng], 7);
    L.control.zoom({ position: "bottomright" }).addTo(m);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 18 }).addTo(m);
    layer.current = L.layerGroup().addTo(m); map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize()); ro.observe(el.current!);
    return () => { ro.disconnect(); m.remove(); map.current = null; };
  }, []); // eslint-disable-line

  useEffect(() => {
    const g = layer.current!; g.clearLayers(); markers.current.clear();
    items.forEach((r) => {
      const mk = L.circleMarker([r.lat, r.lng], style(false, false, false)).addTo(g);
      mk.bindTooltip(r.name, { direction: "top" }); mk.on("click", () => cb.current(r.id)); markers.current.set(r.id, mk);
    });
    const pts = items.map((r) => [r.lat, r.lng] as L.LatLngTuple);
    if (user) pts.push([user.lat, user.lng]);
    if (pts.length) map.current!.fitBounds(pts, { padding: [40, 40], maxZoom: 11 });
    // eslint-disable-next-line
  }, [items.length, fitKey]);

  useEffect(() => {
    markers.current.forEach((mk, id) => {
      const sel = id === selectedId;
      mk.setStyle(style(sel, savedIds.includes(id), visitedIds.includes(id)));
      if (sel) mk.bringToFront();
    });
    const mk = selectedId != null ? markers.current.get(selectedId) : null;
    if (mk) map.current!.flyTo(mk.getLatLng(), Math.max(map.current!.getZoom(), 11), { duration: 0.6 });
  }, [selectedId, savedIds, visitedIds, items.length, fitKey]);

  useEffect(() => {
    userMarker.current?.remove();
    if (user && map.current) userMarker.current = L.circleMarker([user.lat, user.lng], { radius: 8, color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }).addTo(map.current).bindTooltip("You");
  }, [user?.lat, user?.lng]); // eslint-disable-line

  return <div ref={el} className="h-full w-full" />;
}
