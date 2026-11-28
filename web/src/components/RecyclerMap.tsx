import { useEffect, useRef } from "react";
import L from "leaflet";
import type { Recycler } from "../types";

export default function RecyclerMap({ center, items }: { center: { lat: number; lng: number }; items: Recycler[] }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!el.current) return;
    const map = L.map(el.current).setView([center.lat, center.lng], 11);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 18 }).addTo(map);
    L.circleMarker([center.lat, center.lng], { radius: 8, color: "#2563eb", fillOpacity: 0.9 }).addTo(map).bindTooltip("You");
    const pts: L.LatLngTuple[] = [[center.lat, center.lng]];
    items.forEach((r) => {
      L.circleMarker([r.lat, r.lng], { radius: 9, color: "#0e0d0c", fillColor: "#f26a1b", fillOpacity: 0.9 }).addTo(map)
        .bindPopup(`<b>${r.name.replace(/</g, "&lt;")}</b><br/>${r.distance_km} km`);
      pts.push([r.lat, r.lng]);
    });
    if (pts.length > 1) map.fitBounds(pts, { padding: [30, 30], maxZoom: 13 });
    return () => { map.remove(); };
  }, [center.lat, center.lng, items]);
  return <div ref={el} className="h-64 w-full rounded-xl" />;
}
