import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import RiskMap from "./RiskMap";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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

const HIGH_RISK_AREAS = [
  { name: "Tawang Sector", state: "Arunachal", lat: 27.5861, lon: 91.8653, risk: "VERY HIGH", p: "94.5%", reason: "Steep glaciated mountain terrain, NH-13 corridor" },
  { name: "Mangan District", state: "Sikkim", lat: 27.5113, lon: 88.5342, risk: "VERY HIGH", p: "89.9%", reason: "Teesta basin shear zone, high monsoon debris flow" },
  { name: "Dima Hasao (Haflong)", state: "Assam", lat: 25.1764, lon: 93.0238, risk: "VERY HIGH", p: "83.3%", reason: "Barail range hill section, railway & highway severance zone" },
  { name: "Gangtok Ridge", state: "Sikkim", lat: 27.3389, lon: 88.6065, risk: "HIGH", p: "78.2%", reason: "High elevation urban slope load, Rani Khola catchment" },
  { name: "Cherrapunji (Sohra)", state: "Meghalaya", lat: 25.2702, lon: 91.7323, risk: "HIGH", p: "76.4%", reason: "Extreme rainfall saturation zone, karst slope erosion" },
  { name: "Tamenglong Hills", state: "Manipur", lat: 24.9859, lon: 93.4939, risk: "HIGH", p: "74.1%", reason: "Shale formation, NH-37 landslide hotspot" },
  { name: "Mokokchung Pass", state: "Nagaland", lat: 26.3255, lon: 94.5204, risk: "HIGH", p: "73.5%", reason: "Weathered sedimentary ridge, active soil creep" },
  { name: "Champhai Ridge", state: "Mizoram", lat: 23.4735, lon: 93.3283, risk: "HIGH", p: "72.8%", reason: "High relief fold belt, monsoon slip plane" },
  { name: "Bomdila Pass", state: "Arunachal", lat: 27.2645, lon: 92.4229, risk: "HIGH", p: "71.9%", reason: "Steep sub-Himalayan incline, tectonic fault zone" },
  { name: "Kohima Saddle", state: "Nagaland", lat: 25.6751, lon: 94.1086, risk: "HIGH", p: "70.2%", reason: "Naga Hills fault line, NH-29 sinking zone" },
];

function OfficialDashboard({ token, onLogout }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [msg, setMsg] = useState("");
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [targetCoord, setTargetCoord] = useState(null);
  const [highRiskOnly, setHighRiskOnly] = useState(false);
  const [stateFilter, setStateFilter] = useState("ALL");
  const [inspectLoading, setInspectLoading] = useState(false);

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const handleSelectPoint = (pt) => {
    setSelectedPoint(pt);
    if (pt.risk_level) setRiskLevel(pt.risk_level);
    if (pt.lat && pt.lon) {
      setTitle(`Advisory for ${pt.areaName ? pt.areaName : `${pt.lat.toFixed(3)}°N, ${pt.lon.toFixed(3)}°E`}`);
    }
  };

  const handleInspectArea = async (area) => {
    setInspectLoading(true);
    setTargetCoord({ lat: area.lat, lon: area.lon });
    try {
      const res = await axios.post("http://127.0.0.1:8000/predict/latlon", {
        lat: area.lat,
        lon: area.lon,
      }, authHeader);
      handleSelectPoint({ ...res.data, lat: area.lat, lon: area.lon, areaName: area.name });
    } catch (err) {
      console.error("Inspect failed", err);
    } finally {
      setInspectLoading(false);
    }
  };

  const handleDraftAdvisory = (areaOrPoint) => {
    const name = areaOrPoint.areaName || areaOrPoint.name || `Sector ${areaOrPoint.lat?.toFixed(3)}°N, ${areaOrPoint.lon?.toFixed(3)}°E`;
    const rLevel = areaOrPoint.risk_level || areaOrPoint.risk || "HIGH";
    const reasonText = areaOrPoint.reason || (areaOrPoint.factors ? getRiskReason(areaOrPoint) : "Ground saturation and steep mountain relief present immediate landslide hazards.");

    setTitle(`EMERGENCY ADVISORY: ${name}`);
    setMessage(
      `CRITICAL ALERT (${rLevel} RISK): ${reasonText} Citizens are advised to monitor slope cracks, avoid non-essential hillside transit, and follow local district disaster management directives.`
    );
    setRiskLevel(rLevel);

    const formEl = document.getElementById("alert-form-card");
    if (formEl) {
      formEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  const issueAlert = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://127.0.0.1:8000/alerts", {
        title, message, risk_level: riskLevel || null
      }, authHeader);
      setMsg("Alert issued.");
      setTitle(""); setMessage(""); setRiskLevel("");
    } catch (err) {
      setMsg(err.response?.data?.detail || "failed");
    }
  };

  const filteredAreas = stateFilter === "ALL"
    ? HIGH_RISK_AREAS
    : HIGH_RISK_AREAS.filter((a) => a.state.toLowerCase().includes(stateFilter.toLowerCase()));

  return (
    <div className="min-h-screen bg-muted p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Official Dashboard</h1>
        <div className="flex items-center gap-3">
          <Link
            to="/official/reports"
            className="inline-flex h-9 items-center justify-center rounded-full border bg-background px-4 text-sm font-medium hover:bg-accent"
          >
            Citizen reports
          </Link>
          <Button variant="outline" onClick={onLogout}>Logout</Button>
        </div>
      </div>

      <div className="flex gap-4" style={{ height: "calc(100vh - 5.5rem)", minHeight: 0 }}>
        <div
          className="flex min-w-0 flex-[4] flex-col gap-4 overflow-y-auto max-h-full pr-2.5 pb-16 custom-scrollbar [&>*]:shrink-0"
          style={{ minHeight: 0, height: "100%", overflowY: "auto" }}
        >
          {/* 🚨 Priority High-Risk Areas Card */}
          <Card className="border-2 border-red-500/30 shadow-md shrink-0">
            <CardHeader className="p-3 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-red-600 dark:text-red-400">
                  <span>🚨</span> Priority High-Risk Areas
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setHighRiskOnly(!highRiskOnly)}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${
                    highRiskOnly
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-muted text-muted-foreground border-border hover:bg-accent"
                  }`}
                >
                  🔥 {highRiskOnly ? "Filter: ON" : "Filter: OFF"}
                </button>
              </div>
              <CardDescription className="text-xs">
                Vulnerable landslide corridors across NER states. Click to inspect & alert.
              </CardDescription>

              {/* State Filter Chips */}
              <div className="flex flex-wrap gap-1 mt-2">
                {["ALL", "Arunachal", "Sikkim", "Assam", "Nagaland", "Meghalaya", "Manipur", "Mizoram"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStateFilter(st)}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      stateFilter === st
                        ? "bg-red-600 text-white"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="p-3 pt-0 space-y-2">
              <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredAreas.map((area) => (
                  <div
                    key={area.name}
                    className="rounded-lg border p-2 bg-card hover:border-red-500/50 transition-colors text-xs flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-foreground text-xs">{area.name}</span>
                        <span className="text-[10px] text-muted-foreground ml-1.5">({area.state})</span>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${
                          area.risk === "VERY HIGH" ? "bg-red-600" : "bg-orange-500"
                        }`}
                      >
                        {area.risk} ({area.p})
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground line-clamp-1">{area.reason}</p>

                    <div className="flex gap-1.5 pt-0.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={inspectLoading}
                        onClick={() => handleInspectArea(area)}
                        className="h-6 px-2 text-[10px] flex-1 font-medium"
                      >
                        📍 Inspect Telemetry
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDraftAdvisory(area)}
                        className="h-6 px-2 text-[10px] flex-1 font-medium bg-red-600 hover:bg-red-700"
                      >
                        📢 Draft Alert
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Risk Assessment Card for Clicked Location */}
          {selectedPoint ? (
            <Card className="border-2 border-primary/20 shadow-md shrink-0">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-1.5">
                    <span>📍</span> Location Telemetry
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
              <CardContent className="space-y-3 pt-0 text-sm">
                <div className="rounded-lg bg-muted/60 p-2.5 flex items-center justify-between border">
                  <span className="font-medium text-muted-foreground text-xs">AI Predicted Probability</span>
                  <span className="text-base font-bold text-foreground">
                    {(selectedPoint.probability * 100).toFixed(1)}%
                    <span className="text-xs font-normal text-muted-foreground ml-1">({selectedPoint.probability})</span>
                  </span>
                </div>

                {selectedPoint.factors && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Terrain & Hydrology Factors:
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

                      <div className="col-span-2 rounded border bg-background p-2 flex justify-between items-center text-xs">
                        <span className="text-muted-foreground text-[11px]">Land Cover (10m Satellite):</span>
                        <span className="font-semibold">{selectedPoint.factors.land_cover}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-lg bg-primary/5 border border-primary/10 p-2.5 text-xs">
                  <p className="font-semibold text-foreground mb-1 flex items-center gap-1">
                    <span>💡</span> Official Assessment Rationale:
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    {getRiskReason(selectedPoint)}
                  </p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDraftAdvisory(selectedPoint)}
                  className="w-full text-xs font-semibold bg-red-600 hover:bg-red-700"
                >
                  📢 Quick Draft Advisory For This Sector
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed bg-muted/40 shrink-0">
              <CardContent className="p-4 text-center text-sm text-muted-foreground">
                <span className="text-2xl block mb-1">🗺️</span>
                <b className="text-foreground">Click map or choose a High-Risk Sector above</b>
                <p className="text-xs mt-1 text-muted-foreground">
                  View instant slope, elevation, land cover, and pore pressure telemetry to draft geo-targeted alerts.
                </p>
              </CardContent>
            </Card>
          )}

          <Card id="alert-form-card" className="shrink-0 border-2 border-border shadow-sm">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <span>📢</span> Issue Alert / Warning
              </CardTitle>
              <CardDescription className="text-xs">
                Broadcast official disaster advisories directly to citizen dashboards.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <form onSubmit={issueAlert} className="flex flex-col gap-2.5">
                <Input
                  placeholder="title (e.g. EMERGENCY ADVISORY: Tawang Sector)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-xs"
                />
                <Textarea
                  placeholder="message (instructions for citizens, road closures, evacuation zones)..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="text-xs min-h-[75px]"
                />
                <Input
                  placeholder="risk level (VERY HIGH / HIGH / MODERATE)"
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value)}
                  className="text-xs"
                />
                <Button type="submit" size="sm" className="w-full text-xs font-semibold bg-red-600 hover:bg-red-700 text-white">
                  Broadcast Alert
                </Button>
                {msg && <p className="text-xs text-muted-foreground mt-1">{msg}</p>}
              </form>
            </CardContent>
          </Card>
        </div>

        <Card className="relative min-w-0 flex-[6] gap-0 overflow-hidden p-0">
          <div className="absolute inset-0">
            <RiskMap
              token={token}
              onSelectPoint={handleSelectPoint}
              selectedPoint={selectedPoint}
              targetCoord={targetCoord}
              highRiskOnly={highRiskOnly}
              onToggleHighRisk={() => setHighRiskOnly(!highRiskOnly)}
              highRiskZones={HIGH_RISK_AREAS}
              onInspectZone={handleInspectArea}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

export default OfficialDashboard;
