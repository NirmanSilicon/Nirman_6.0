import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { Expand, Home, Minus, Plus } from 'lucide-react';
import { CityMap2D } from './CityMap2D';
import type { Project } from '../types/domain';

interface CityMap3DProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (project: Project) => void;
  showBoundaries: boolean;
  flyToCoords?: { lat: number; lng: number } | null;
}

const STATUS_HEX: Record<string, string> = {
  verified: '#299764',
  completed_claimed: '#C5A46D',
  under_verification: '#527C91',
  in_progress: '#285B45',
  halted: '#A34F37',
  planned: '#344C59',
};

export function CityMap3D({
  projects,
  selectedProjectId,
  onSelectProject,
  showBoundaries,
  flyToCoords,
}: CityMap3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const [cesiumError, setCesiumError] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    let viewer: Cesium.Viewer | null = null;
    try {
      const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
      if (ionToken) Cesium.Ion.defaultAccessToken = ionToken;

      const osmProvider = new Cesium.OpenStreetMapImageryProvider({
        url: 'https://tile.openstreetmap.org/',
      });

      viewer = new Cesium.Viewer(containerRef.current, {
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: true,
        navigationHelpButton: false,
        animation: false,
        timeline: false,
        fullscreenButton: false,
        infoBox: false,
        selectionIndicator: true,
        baseLayer: new Cesium.ImageryLayer(osmProvider),
      });

      viewer.scene.screenSpaceCameraController.enableRotate = true;
      viewer.scene.screenSpaceCameraController.enableTilt = true;
      viewer.scene.screenSpaceCameraController.enableZoom = true;
      viewer.scene.screenSpaceCameraController.inertiaSpin = 0.88;
      viewer.scene.screenSpaceCameraController.inertiaZoom = 0.78;
      viewer.scene.screenSpaceCameraController.minimumZoomDistance = 35;
      const activeViewer = viewer;
      if (ionToken) {
        Cesium.createOsmBuildingsAsync()
          .then((buildings) => {
            if (!activeViewer.isDestroyed()) activeViewer.scene.primitives.add(buildings);
          })
          .catch((error: unknown) => console.error('Cesium OSM 3D buildings are unavailable.', error));
      }
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(85.8245, 20.2961, 16500),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-48),
          roll: 0,
        },
      });
      viewerRef.current = viewer;

      const handleResize = () => activeViewer.resize();
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(containerRef.current);
      window.addEventListener('resize', handleResize);

      return () => {
        resizeObserver.disconnect();
        window.removeEventListener('resize', handleResize);
        activeViewer.destroy();
        viewerRef.current = null;
      };
    } catch (error) {
      console.error('Cesium initialization failed; using the 2D map fallback.', error);
      viewer?.destroy();
      setCesiumError(true);
    }
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    viewer.entities.removeAll();

    for (const p of projects) {
      const colorCss = STATUS_HEX[p.status] || '#527C91';
      const color = Cesium.Color.fromCssColorString(colorCss);
      const isSelected = p.id === selectedProjectId;

      viewer.entities.add({
        id: `marker:${p.id}`,
        name: p.name,
        position: Cesium.Cartesian3.fromDegrees(p.lng, p.lat, 35),
        point: {
          pixelSize: isSelected ? 16 : 12,
          color,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        },
        label: {
          text: p.project_code,
          font: '600 12px Inter, sans-serif',
          fillColor: Cesium.Color.WHITE,
          showBackground: true,
          backgroundColor: Cesium.Color.fromCssColorString('#183D32').withAlpha(0.85),
          pixelOffset: new Cesium.Cartesian2(0, -22),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 28000),
        },
      });

      if (showBoundaries && p.boundary_geojson?.coordinates?.[0]) {
        const coords = p.boundary_geojson.coordinates[0].flatMap(([lng, lat]) => [lng, lat]);
        viewer.entities.add({
          id: `boundary:${p.id}`,
          polygon: {
            hierarchy: Cesium.Cartesian3.fromDegreesArray(coords),
            material: color.withAlpha(isSelected ? 0.35 : 0.18),
            outline: true,
            outlineColor: color,
            height: 0,
            extrudedHeight: isSelected ? 18 : 6,
          },
        });
      }
    }

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((movement: { position: Cesium.Cartesian2 }) => {
      const picked = viewer.scene.pick(movement.position);
      if (Cesium.defined(picked) && picked.id?.id) {
        const rawId = String(picked.id.id);
        const projId = rawId.replace(/^(marker|boundary):/, '');
        const match = projects.find((item) => item.id === projId);
        if (match) onSelectProject(match);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
    };
  }, [projects, selectedProjectId, showBoundaries, onSelectProject]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !flyToCoords) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(flyToCoords.lng, flyToCoords.lat, 3800),
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-45),
        roll: 0,
      },
      duration: 1.1,
    });
  }, [flyToCoords]);

  if (cesiumError) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-dark-blue-grey">3D globe unavailable; showing the interactive 2D map fallback.</p>
        <CityMap2D
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={onSelectProject}
          showBoundaries={showBoundaries}
          flyToCoords={flyToCoords}
        />
      </div>
    );
  }

  const resetView = () => {
    viewerRef.current?.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(85.8245, 20.2961, 16500),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-48), roll: 0 },
      duration: 1,
    });
  };

  return (
    <div className="relative w-full h-[460px] lg:h-[580px] rounded-lg overflow-hidden border border-charcoal/15 bg-dark-blue-grey">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 rounded-lg bg-white/95 p-1 shadow">
        <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => viewerRef.current?.camera.zoomIn(1200)} className="rounded p-2 text-forest-green hover:bg-warm-ivory">
          <Plus className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => viewerRef.current?.camera.zoomOut(1200)} className="rounded p-2 text-forest-green hover:bg-warm-ivory">
          <Minus className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Reset view" title="Reset view" onClick={resetView} className="rounded p-2 text-forest-green hover:bg-warm-ivory">
          <Home className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Fullscreen" title="Fullscreen" onClick={() => void containerRef.current?.requestFullscreen()} className="rounded p-2 text-forest-green hover:bg-warm-ivory">
          <Expand className="h-4 w-4" />
        </button>
      </div>
      <div className="absolute bottom-2 left-2 z-10 bg-white/95 text-[11px] text-charcoal px-2.5 py-1 rounded border border-charcoal/15">
        OpenStreetMap roads &copy; contributors | CesiumJS 3D globe
      </div>
    </div>
  );
}
