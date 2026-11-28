import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, GeoJSON, useMap, useMapEvents } from "react-leaflet";
import axios from "axios";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

const riskColor = {
  high: "red",
  medium: "orange",
  low: "green"
};

const nerStates = ["assam","arunachal-pradesh","manipur","meghalaya","mizoram","nagaland","tripura","sikkim"];

const NER_BOUNDS = [[21.5, 88.0], [29.5, 97.5]];

function FixSize() {
  const map = useMap();
  useEffect(() => {
    const fit = () => {
      map.invalidateSize();
      map.fitBounds(NER_BOUNDS, { animate: false });
      console.log("MAP", { zoom: map.getZoom(), center: map.getCenter(), size: map.getSize() });
    };
    const t1 = setTimeout(fit, 0);
    const t2 = setTimeout(fit, 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [map]);
  return null;
}

function HeatLayer({ points, highRiskOnly = false }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const activePoints = highRiskOnly
      ? points.filter((p) => (p[2] || 0) >= 0.70)
      : points;
    if (!activePoints.length) return;
    const heat = L.heatLayer(activePoints, {
      radius: highRiskOnly ? 22 : 15,
      blur: highRiskOnly ? 15 : 20,
      maxZoom: 10,
      gradient: highRiskOnly ? { 0.3: "#f97316", 0.6: "#ef4444", 1.0: "#7f1d1d" } : undefined
    }).addTo(map);
    return () => map.removeLayer(heat);
  }, [points, highRiskOnly, map]);
  return null;
}

function ClickHandler({ onResult, cfg }) {
  useMapEvents({
    click(e) {
      axios.post("http://127.0.0.1:8000/predict/latlon", {
        lat: e.latlng.lat,
        lon: e.latlng.lng,
      }, cfg).then((res) => onResult({ ...res.data, lat: e.latlng.lat, lon: e.latlng.lng }))
        .catch((err) => console.error(err));
    },
  });
  return null;
}

function MapFlyTo({ targetCoord }) {
  const map = useMap();
  useEffect(() => {
    if (targetCoord && targetCoord.lat && targetCoord.lon) {
      map.flyTo([targetCoord.lat, targetCoord.lon], 11, { duration: 1.2 });
    }
  }, [targetCoord, map]);
  return null;
}

function RiskMap({
  token,
  height = "100%",
  onSelectPoint,
  selectedPoint,
  targetCoord,
  highRiskOnly = false,
  onToggleHighRisk,
  highRiskZones = [],
  onInspectZone,
}) {
  const [points, setPoints] = useState([]);
  const [boundaries, setBoundaries] = useState([]);
  const [heatPoints, setHeatPoints] = useState([]);
  const [clickResult, setClickResult] = useState(null);

  const cfg = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

  const handleResult = (res) => {
    setClickResult(res);
    if (onSelectPoint) onSelectPoint(res);
  };

  useEffect(() => {
    if (selectedPoint) {
      setClickResult(selectedPoint);
    }
  }, [selectedPoint]);

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/risk/points", cfg)
      .then((res) => setPoints(res.data.features))
      .catch((err) => console.error(err));

    axios.get("http://127.0.0.1:8000/risk/heatmap", cfg)
      .then((res) => { console.log("HEATPOINTS:", res.data.length); setHeatPoints(res.data); })
      .catch((err) => console.error("HEATMAP FETCH FAIL", err));

    Promise.all(
      nerStates.map((s) =>
        fetch(`https://cdn.jsdelivr.net/gh/udit-001/india-maps-data@main/geojson/states/${s}.geojson`)
          .then((r) => r.json())
      )
    ).then(setBoundaries).catch((err) => console.error(err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div style={{ position: "relative", height, width: "100%" }}>
      {onToggleHighRisk && (
        <div className="absolute top-3 right-3 z-[1000] flex gap-2">
          <button
            type="button"
            onClick={onToggleHighRisk}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 backdrop-blur-md cursor-pointer border ${
              highRiskOnly
                ? "bg-red-600 text-white border-red-700 ring-2 ring-red-400/50"
                : "bg-background/90 text-foreground hover:bg-background border-border"
            }`}
          >
            <span>🔥</span>
            {highRiskOnly ? "High-Risk Heatmap: ON (P ≥ 70%)" : "Show High-Risk Heatmap Only"}
          </button>
        </div>
      )}

      <MapContainer
        bounds={NER_BOUNDS}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <FixSize />
        <MapFlyTo targetCoord={targetCoord} />

        {boundaries.map((geo, i) => (
          <GeoJSON key={i} data={geo} style={{ color: "#444", weight: 1, fillOpacity: 0 }} />
        ))}

        <HeatLayer points={heatPoints} highRiskOnly={highRiskOnly} />
        <ClickHandler onResult={handleResult} cfg={cfg} />

        {/* High Risk Hotspot Markers (for Official Dashboard) */}
        {highRiskZones.map((z) => (
          <CircleMarker
            key={z.name}
            center={[z.lat, z.lon]}
            radius={z.risk === "VERY HIGH" ? 9 : 7}
            pathOptions={{
              color: "#ffffff",
              fillColor: z.risk === "VERY HIGH" ? "#dc2626" : "#ea580c",
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Popup>
              <div className="p-1 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <b className="text-sm">{z.name}</b>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${
                      z.risk === "VERY HIGH" ? "bg-red-600" : "bg-orange-500"
                    }`}
                  >
                    {z.risk}
                  </span>
                </div>
                <p className="text-muted-foreground text-[11px]">{z.state} • Risk: {z.p || "Elevated"}</p>
                <p className="text-foreground text-[11px]">{z.desc || z.reason}</p>
                {onInspectZone && (
                  <button
                    type="button"
                    onClick={() => onInspectZone(z)}
                    className="w-full mt-2 rounded bg-primary text-primary-foreground py-1 text-[11px] font-medium hover:bg-primary/90"
                  >
                    🔍 Inspect Telemetry & Draft Alert
                  </button>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {clickResult && clickResult.lat && clickResult.lon && (
          <CircleMarker
            center={[clickResult.lat, clickResult.lon]}
            radius={10}
            pathOptions={{ color: "#ffffff", fillColor: "#ef4444", fillOpacity: 0.9, weight: 2 }}
          >
            <Popup>
              <b>Selected Location</b><br />
              Lat: {clickResult.lat.toFixed(4)}, Lon: {clickResult.lon.toFixed(4)}<br />
              Risk: <b>{clickResult.risk_level}</b> ({(clickResult.probability * 100).toFixed(1)}%)
            </Popup>
          </CircleMarker>
        )}

        {points.map((f) => (
          <CircleMarker
            key={f.properties.event_id}
            center={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
            radius={8}
            color={riskColor[f.properties.risk_level] || "gray"}
          >
            <Popup>
              <b>{f.properties.category}</b><br />
              State: {f.properties.state}<br />
              District: {f.properties.admin_division}<br />
              Risk: {f.properties.risk_level}<br />
              Date: {f.properties.event_date}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

export default RiskMap;
