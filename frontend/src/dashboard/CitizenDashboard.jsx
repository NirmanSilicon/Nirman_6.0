import React, { useEffect, useState } from "react";
import axios from "axios";
import RiskMap from "./RiskMap";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const NER_LOCATIONS = [
  { name: "Itanagar", state: "Arunachal", lat: 27.0844, lon: 93.6053 },
  { name: "Tawang", state: "Arunachal", lat: 27.5861, lon: 91.8653 },
  { name: "Pasighat", state: "Arunachal", lat: 28.0619, lon: 95.3260 },
  { name: "Ziro", state: "Arunachal", lat: 27.5949, lon: 93.8385 },
  { name: "Bomdila", state: "Arunachal", lat: 27.2645, lon: 92.4229 },
  { name: "Shillong", state: "Meghalaya", lat: 25.5788, lon: 91.8933 },
  { name: "Cherrapunji", state: "Meghalaya", lat: 25.2702, lon: 91.7323 },
  { name: "Guwahati", state: "Assam", lat: 26.1445, lon: 91.7362 },
  { name: "Silchar", state: "Assam", lat: 24.8333, lon: 92.7789 },
  { name: "Gangtok", state: "Sikkim", lat: 27.3389, lon: 88.6065 },
  { name: "Kohima", state: "Nagaland", lat: 25.6751, lon: 94.1086 },
  { name: "Mon", state: "Nagaland", lat: 26.7483, lon: 95.0600 },
  { name: "Aizawl", state: "Mizoram", lat: 23.7271, lon: 92.7176 },
  { name: "Imphal", state: "Manipur", lat: 24.8170, lon: 93.9368 },
  { name: "Agartala", state: "Tripura", lat: 23.8315, lon: 91.2868 },
];

function getRiskReason(point) {
  if (!point || !point.factors) return "Awaiting terrain telemetry.";
  const f = point.factors;
  const slope = f.slope_deg ?? f.slope ?? 0;
  const rain7d = f.rainfall_7d_mm ?? f.rainfall_7d ?? 0;
  const rain1d = f.rainfall_1d_mm ?? f.rainfall_1d ?? 0;
  const riverKm = f.river_distance_km ?? 99;
  const mineKm = f.mine_distance_km ?? 99;
  const elev = f.elevation_m ?? f.elevation ?? 0;
  const lc = (f.land_cover || "").toLowerCase();
  
  const escalators = [];
  const mitigating = [];

  // 1. Slope factor
  if (slope >= 25) {
    escalators.push(`steep mountain slope (${slope}°) exceeding gravitational stability threshold`);
  } else if (slope >= 15) {
    escalators.push(`moderate-to-steep incline (${slope}°) susceptible to gravitational shear`);
  } else if (slope >= 8) {
    mitigating.push(`relatively gentle local slope (${slope}°)`);
  } else {
    mitigating.push(`flat / low-angle terrain (${slope}°) resistant to slope failure`);
  }

  // 2. Rainfall factor
  if (rain7d >= 150) {
    escalators.push(`heavy cumulative 7-day rainfall (${rain7d} mm) causing critical pore-water saturation`);
  } else if (rain7d >= 100) {
    escalators.push(`monsoon rainfall saturation (${rain7d} mm over 7 days) increasing subsurface pore pressure`);
  } else if (rain7d < 50) {
    mitigating.push(`low cumulative rainfall (${rain7d} mm)`);
  }

  if (rain1d >= 40) {
    escalators.push(`intense 24-hr rain spike (${rain1d} mm) acting as a flash trigger`);
  }

  // 3. Elevation & High Relief
  if (elev >= 1200) {
    escalators.push(`high Himalayan elevation (${elev} m) with weathered mountainous bedrock and regional tectonic fragility`);
  } else if (elev < 300) {
    mitigating.push(`low plain elevation (${elev} m)`);
  }

  // 4. Land cover & human disturbance
  if (lc.includes("built")) {
    escalators.push(`built-up urban surcharge and artificial slope cuts with reduced root anchorage`);
  } else if (lc.includes("bare") || lc.includes("sparse")) {
    escalators.push(`sparse vegetation cover with poor soil retention`);
  } else if (lc.includes("tree") || lc.includes("forest")) {
    mitigating.push(`natural tree canopy with deep root reinforcement`);
  }

  // 5. River & Drainage proximity
  if (riverKm < 0.8) {
    escalators.push(`close proximity to river channel (${riverKm} km) causing slope toe erosion`);
  } else if (riverKm > 5.0) {
    mitigating.push(`safe buffer from river toe erosion (${riverKm} km)`);
  }

  // 6. Mining proximity
  if (mineKm < 2.0) {
    escalators.push(`close proximity to active excavation/mining zones (${mineKm} km)`);
  } else if (mineKm > 10.0) {
    mitigating.push(`adequate distance from mining disturbances (${mineKm} km)`);
  }

  if (point.risk_level === "VERY HIGH" || point.risk_level === "HIGH") {
    let explanation = `Risk is elevated primarily by ${escalators.slice(0, 3).join(", and ")}.`;
    if (slope < 15) {
      explanation += ` (Note: While immediate local slope is gentle at ${slope}°, the model identifies high regional vulnerability due to high mountain altitude (${elev} m), monsoon ground saturation, and urban hillside load).`;
    }
    return explanation;
  } else if (point.risk_level === "MODERATE") {
    let explanation = `Moderate risk driven by ${escalators.slice(0, 2).join(" combined with ") || "regional elevation and rainfall"}.`;
    if (mitigating.length > 0) {
      explanation += ` Partially buffered by ${mitigating.slice(0, 2).join(" and ")}.`;
    }
    return explanation;
  } else {
    return `Low risk area. Ground stability is maintained by ${mitigating.slice(0, 3).join(", ") || "favorable slope and adequate drainage buffer"}.`;
  }
}

function CitizenDashboard({ token, onLogout }) {
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [msg, setMsg] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [targetCoord, setTargetCoord] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const handleSelectPoint = (pt) => {
    setSelectedPoint(pt);
    if (pt.lat !== undefined) setLat(pt.lat.toFixed(5));
    if (pt.lon !== undefined) setLon(pt.lon.toFixed(5));
  };

  const handleLocateCity = async (city) => {
    setSearchQuery(city.name);
    setSearchError("");
    setSearchLoading(true);
    try {
      setTargetCoord({ lat: city.lat, lon: city.lon });
      const res = await axios.post("http://127.0.0.1:8000/predict/latlon", {
        lat: city.lat,
        lon: city.lon,
      }, authHeader);
      handleSelectPoint({ ...res.data, lat: city.lat, lon: city.lon });
    } catch (err) {
      setSearchError(err.response?.data?.detail || "Location query failed");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchError("");
    setSearchLoading(true);

    const q = searchQuery.trim().toLowerCase();

    // 1. Check coordinates input: e.g. "27.08, 93.60" or "27.08 93.60"
    const coordMatch = q.match(/^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/);
    if (coordMatch) {
      const latVal = parseFloat(coordMatch[1]);
      const lonVal = parseFloat(coordMatch[3]);
      try {
        setTargetCoord({ lat: latVal, lon: lonVal });
        const res = await axios.post("http://127.0.0.1:8000/predict/latlon", {
          lat: latVal,
          lon: lonVal,
        }, authHeader);
        handleSelectPoint({ ...res.data, lat: latVal, lon: lonVal });
        setSearchLoading(false);
        return;
      } catch (err) {
        setSearchError(err.response?.data?.detail || "Coordinate query failed");
        setSearchLoading(false);
        return;
      }
    }

    // 2. Check offline NER location catalog
    const found = NER_LOCATIONS.find((loc) => loc.name.toLowerCase().includes(q) || q.includes(loc.name.toLowerCase()));
    if (found) {
      await handleLocateCity(found);
      return;
    }

    // 3. Fallback online search via Nominatim
    try {
      const nomRes = await axios.get(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery + ", India")}&format=json&limit=1`);
      if (nomRes.data && nomRes.data.length > 0) {
        const place = nomRes.data[0];
        const latVal = parseFloat(place.lat);
        const lonVal = parseFloat(place.lon);
        setTargetCoord({ lat: latVal, lon: lonVal });
        const res = await axios.post("http://127.0.0.1:8000/predict/latlon", {
          lat: latVal,
          lon: lonVal,
        }, authHeader);
        handleSelectPoint({ ...res.data, lat: latVal, lon: lonVal });
      } else {
        setSearchError("Location not found. Try Itanagar, Shillong, or coordinates.");
      }
    } catch {
      setSearchError("Could not locate place. Please use city name or coordinates.");
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    axios
      .get("http://127.0.0.1:8000/alerts")
      .then((res) => setAlerts(res.data))
      .catch(() => {});
  }, []);

  const submitReport = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        "http://127.0.0.1:8000/reports",
        {
          description,
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
        },
        authHeader
      );
      setMsg("Report submitted, pending verification.");
      setDescription("");
      setLat("");
      setLon("");
    } catch (err) {
      setMsg(err.response?.data?.detail || "failed");
    }
  };

  return (
    <div className="min-h-screen bg-muted p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Citizen Dashboard</h1>
        <Button variant="outline" onClick={onLogout}>Logout</Button>
      </div>

      <div className="flex gap-4" style={{ height: "calc(100vh - 5.5rem)", minHeight: 0 }}>
        {/* Left Sidebar with Search, Risk Details & Forms */}
        <div
          className="flex min-w-0 flex-[4] flex-col gap-3 overflow-y-auto max-h-full pr-2 pb-16 custom-scrollbar [&>*]:shrink-0"
          style={{ minHeight: 0, height: "100%", overflowY: "auto" }}
        >
          {/* 🔍 Search & Locate Bar */}
          <Card className="border shadow-sm shrink-0">
            <CardContent className="p-3">
              <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <Input
                  placeholder="Search city, district, or coordinates (e.g. Itanagar, Tawang)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs"
                />
                <Button type="submit" size="sm" disabled={searchLoading} className="shrink-0 text-xs">
                  {searchLoading ? "Locating..." : "🔍 Locate"}
                </Button>
              </form>
              {searchError && <p className="text-[11px] text-destructive mt-1.5">{searchError}</p>}
              
              {/* Quick Suggestion Pills */}
              <div className="flex flex-wrap gap-1 mt-2.5">
                <span className="text-[10px] text-muted-foreground mr-1 self-center">Quick:</span>
                {["Itanagar", "Tawang", "Pasighat", "Shillong", "Gangtok", "Kohima", "Guwahati", "Aizawl"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      const loc = NER_LOCATIONS.find((l) => l.name === c);
                      if (loc) handleLocateCity(loc);
                    }}
                    className="rounded-full bg-secondary hover:bg-secondary/80 px-2 py-0.5 text-[10px] font-medium text-secondary-foreground transition-colors"
                  >
                    📍 {c}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 📍 AI Risk Assessment Card for Clicked/Searched Location */}
          {selectedPoint ? (
            <Card className="border-2 border-primary/25 shadow-md shrink-0">
              <CardHeader className="p-3 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <span>📍</span> Location Risk Details
                  </CardTitle>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-sm ${
                      selectedPoint.risk_level === "VERY HIGH"
                        ? "bg-red-600"
                        : selectedPoint.risk_level === "HIGH"
                        ? "bg-orange-500"
                        : selectedPoint.risk_level === "MODERATE"
                        ? "bg-amber-500 text-black"
                        : "bg-emerald-600"
                    }`}
                  >
                    {selectedPoint.risk_level} RISK
                  </span>
                </div>
                <CardDescription className="text-xs">
                  Coordinates: <b>{selectedPoint.lat?.toFixed(4)}° N, {selectedPoint.lon?.toFixed(4)}° E</b>
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2.5 text-sm">
                <div className="rounded-lg bg-muted/70 p-2 flex items-center justify-between border">
                  <span className="font-medium text-muted-foreground text-xs">AI Predicted Probability</span>
                  <span className="text-base font-bold text-foreground">
                    {(selectedPoint.probability * 100).toFixed(1)}%
                    <span className="text-xs font-normal text-muted-foreground ml-1">({selectedPoint.probability})</span>
                  </span>
                </div>

                {selectedPoint.factors && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Terrain & Environmental Telemetry:
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded border bg-background p-2">
                        <span className="text-muted-foreground block text-[11px]">Slope Angle</span>
                        <span className="font-bold text-sm">
                          {selectedPoint.factors.slope_deg ?? selectedPoint.factors.slope}°
                        </span>
                        {((selectedPoint.factors.slope_deg ?? selectedPoint.factors.slope) > 15) ? (
                          <span className="text-[10px] text-amber-600 block font-medium">⚠️ Steep slope</span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 block">Stable incline</span>
                        )}
                      </div>

                      <div className="rounded border bg-background p-2">
                        <span className="text-muted-foreground block text-[11px]">Elevation</span>
                        <span className="font-bold text-sm">
                          {selectedPoint.factors.elevation_m ?? selectedPoint.factors.elevation} m
                        </span>
                        {(selectedPoint.factors.elevation_m ?? selectedPoint.factors.elevation) >= 1200 ? (
                          <span className="text-[10px] text-amber-600 block font-medium">⚠️ High-relief mountain</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground block">Above sea level</span>
                        )}
                      </div>

                      <div className="rounded border bg-background p-2">
                        <span className="text-muted-foreground block text-[11px]">7-Day Cumulative Rain</span>
                        <span className="font-bold text-sm">
                          {selectedPoint.factors.rainfall_7d_mm ?? selectedPoint.factors.rainfall_7d} mm
                        </span>
                        {(selectedPoint.factors.rainfall_7d_mm ?? selectedPoint.factors.rainfall_7d) >= 100 ? (
                          <span className="text-[10px] text-amber-600 block font-medium">⚠️ Saturated ground</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground block">Monsoon saturation</span>
                        )}
                      </div>

                      <div className="rounded border bg-background p-2">
                        <span className="text-muted-foreground block text-[11px]">Distance to River</span>
                        <span className="font-bold text-sm">
                          {selectedPoint.factors.river_distance_km} km
                        </span>
                        {selectedPoint.factors.river_distance_km < 1.0 ? (
                          <span className="text-[10px] text-red-500 block font-medium">⚠️ Toe erosion zone</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground block">Drainage buffer</span>
                        )}
                      </div>

                      <div className="rounded border bg-background p-2">
                        <span className="text-muted-foreground block text-[11px]">Mining Proximity</span>
                        <span className="font-bold text-sm">
                          {selectedPoint.factors.mine_distance_km} km
                        </span>
                        <span className="text-[10px] text-muted-foreground block">Excavation buffer</span>
                      </div>

                      <div className="rounded border bg-background p-2">
                        <span className="text-muted-foreground block text-[11px]">1-Day Rain Spike</span>
                        <span className="font-bold text-sm">
                          {selectedPoint.factors.rainfall_1d_mm ?? selectedPoint.factors.rainfall_1d} mm
                        </span>
                        <span className="text-[10px] text-muted-foreground block">Immediate trigger</span>
                      </div>

                      <div className="col-span-2 rounded border bg-background p-2 flex justify-between items-center text-xs">
                        <span className="text-muted-foreground text-[11px]">10m Satellite Land Cover:</span>
                        <span className="font-bold text-foreground">{selectedPoint.factors.land_cover}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-lg bg-primary/5 border border-primary/10 p-2.5 text-xs">
                  <p className="font-semibold text-foreground mb-1 flex items-center gap-1">
                    <span>💡</span> Why is this risk level assigned?
                  </p>
                  <p className="text-muted-foreground leading-relaxed text-[11.5px]">
                    {getRiskReason(selectedPoint)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed bg-muted/40 shrink-0">
              <CardContent className="p-4 text-center text-sm text-muted-foreground">
                <span className="text-2xl block mb-1">🗺️</span>
                <b className="text-foreground">Click map or search a city above</b>
                <p className="text-xs mt-1 text-muted-foreground">
                  The AI model will extract real-time elevation, slope gradient, 10m satellite land cover, and river distance to display the full risk analysis.
                </p>
              </CardContent>
            </Card>
          )}

          {/* 📝 Incident Reporting Form */}
          <Card className="shrink-0">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm font-semibold">Report a landslide</CardTitle>
              <CardDescription className="text-xs">Officials verify each report. (Coordinates auto-fill from map click or search)</CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <form onSubmit={submitReport} className="flex flex-col gap-2.5">
                <Textarea
                  placeholder="Describe slope cracks, falling debris, road obstruction..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-xs min-h-[60px]"
                />
                <div className="flex gap-2">
                  <Input placeholder="latitude" value={lat} onChange={(e) => setLat(e.target.value)} className="text-xs" />
                  <Input placeholder="longitude" value={lon} onChange={(e) => setLon(e.target.value)} className="text-xs" />
                </div>
                <Button type="submit" size="sm" className="w-full text-xs">Submit Report</Button>
                {msg && <p className="text-xs text-muted-foreground mt-1">{msg}</p>}
              </form>
            </CardContent>
          </Card>

          {/* 📢 Alerts / Warnings */}
          <Card className="shrink-0">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm font-semibold">Alerts & Early Warnings</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              {alerts.length === 0 && <p className="text-xs text-muted-foreground">No active emergency alerts.</p>}
              <ul className="flex flex-col gap-2">
                {alerts.map((a) => (
                  <li key={a.id} className="rounded-lg border p-2.5 text-xs">
                    <b>{a.title}</b> {a.risk_level && <span className="text-muted-foreground">({a.risk_level})</span>}
                    <p className="mt-1 text-muted-foreground">{a.message}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Right Map View */}
        <Card className="relative min-w-0 flex-[6] gap-0 overflow-hidden p-0">
          <div className="absolute inset-0">
            <RiskMap
              token={token}
              onSelectPoint={handleSelectPoint}
              selectedPoint={selectedPoint}
              targetCoord={targetCoord}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

export default CitizenDashboard;
