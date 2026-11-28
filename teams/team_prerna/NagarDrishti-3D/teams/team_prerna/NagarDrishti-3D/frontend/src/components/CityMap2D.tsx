import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Project } from '../types/domain';

interface CityMap2DProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (project: Project) => void;
  showBoundaries: boolean;
  flyToCoords?: { lat: number; lng: number } | null;
}

const STATUS_COLORS: Record<string, string> = {
  verified: '#299764',
  completed_claimed: '#C5A46D',
  under_verification: '#527C91',
  in_progress: '#285B45',
  halted: '#A34F37',
  planned: '#344C59',
};

export function CityMap2D({
  projects,
  selectedProjectId,
  onSelectProject,
  showBoundaries,
  flyToCoords,
}: CityMap2DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, {
      center: [20.2961, 85.8245],
      zoom: 12,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = group;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const group = layerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    for (const p of projects) {
      const color = STATUS_COLORS[p.status] || '#527C91';
      const isSelected = p.id === selectedProjectId;

      if (showBoundaries && p.boundary_geojson?.coordinates?.[0]) {
        const latLngs = p.boundary_geojson.coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number]);
        const poly = L.polygon(latLngs, {
          color,
          weight: isSelected ? 3 : 1.5,
          fillOpacity: isSelected ? 0.3 : 0.14,
        });
        poly.on('click', () => onSelectProject(p));
        poly.addTo(group);
      }

      const marker = L.circleMarker([p.lat, p.lng], {
        radius: isSelected ? 10 : 7,
        color: '#FFFFFF',
        weight: 2,
        fillColor: color,
        fillOpacity: 0.95,
      });
      marker.bindTooltip(`${p.project_code}: ${p.name}`, { direction: 'top' });
      marker.on('click', () => onSelectProject(p));
      marker.addTo(group);
    }
  }, [projects, selectedProjectId, showBoundaries, onSelectProject]);

  useEffect(() => {
    if (mapRef.current && flyToCoords) {
      mapRef.current.flyTo([flyToCoords.lat, flyToCoords.lng], 15, { duration: 0.8 });
    }
  }, [flyToCoords]);

  return (
    <div className="w-full h-[460px] lg:h-[580px] rounded-lg overflow-hidden border border-charcoal/15">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
