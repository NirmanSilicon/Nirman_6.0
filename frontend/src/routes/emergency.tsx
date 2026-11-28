import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Siren, MapPin, Phone, Activity, CheckCircle2, Ambulance, AlertTriangle, Sparkles, Navigation, UserCheck } from "lucide-react";
import { hospitals } from "@/lib/mockData";

export const Route = createFileRoute("/emergency")({
  head: () => ({
    meta: [
      { title: "Emergency SOS — Sanjeevani" },
      { name: "description", content: "AI-powered emergency response. Auto-locate, alert nearest hospital and dispatch ambulance in seconds." },
    ],
  }),
  component: EmergencyPage,
});

function EmergencyPage() {
  const [stage, setStage] = useState<"idle" | "locating" | "alerting" | "dispatched">("idle");
  const [location, setLocation] = useState<string>("");
  const [selectedHospitalAlert, setSelectedHospitalAlert] = useState<string | null>(null);

  useEffect(() => {
    if (stage === "locating") {
      const t = setTimeout(() => { 
        setLocation("19.0760° N, 72.8777° E · Bandra West, Mumbai"); 
        setStage("alerting"); 
      }, 1600);
      return () => clearTimeout(t);
    }
    if (stage === "alerting") {
      const t = setTimeout(() => {
        setStage("dispatched");
        // Automatically save an Emergency incident to localStorage userRecords
        const incidentId = `EM-${Math.floor(1000 + Math.random() * 9000)}`;
        const newRecord = {
          id: `r_sos_${Date.now()}`,
          type: "discharge" as const, // using discharge as medical incident category
          title: `Emergency SOS Alert (#${incidentId})`,
          doctor: "Ambulance Unit Dispatcher (Sandeep)",
          hospital: hospitals[0].name,
          date: new Date().toISOString().split("T")[0],
          summary: `SOS triggered at Bandra West, Mumbai. Nearest facility ${hospitals[0].name} alerted. Ambulance unit MH-12-AB-4521 dispatched under 6 minutes.`,
        };

        const localRecords = JSON.parse(localStorage.getItem("userRecords") || "[]");
        localStorage.setItem("userRecords", JSON.stringify([newRecord, ...localRecords]));
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [stage]);

  const nearest = hospitals.slice(0, 3);

  const handleManualAlert = (hospitalName: string) => {
    setSelectedHospitalAlert(hospitalName);
    
    // Save to userRecords as manual alert
    const incidentId = `EM-MAN-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRecord = {
      id: `r_manual_sos_${Date.now()}`,
      type: "discharge" as const,
      title: `Manual Hospital Alert (#${incidentId})`,
      doctor: "AI Emergency Triage Center",
      hospital: hospitalName,
      date: new Date().toISOString().split("T")[0],
      summary: `Manual SOS broadcast sent to ${hospitalName}. ICUs requested, triage team set to standby mode.`,
    };

    const localRecords = JSON.parse(localStorage.getItem("userRecords") || "[]");
    localStorage.setItem("userRecords", JSON.stringify([newRecord, ...localRecords]));

    setTimeout(() => {
      setSelectedHospitalAlert(null);
    }, 3000);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-gradient-emergency p-8 text-white shadow-glow sm:p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.03] bg-[size:24px_24px]" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-200">
            <AlertTriangle className="h-4 w-4 animate-bounce" /> Emergency SOS Center
          </div>
          <h1 className="mt-4 font-display text-4xl font-extrabold sm:text-5xl leading-tight">One tap. Help on its way.</h1>
          <p className="mt-3 max-w-2xl text-white/80 text-sm leading-relaxed">Our AI engine triages your situation, auto-detects your live location, alerts the nearest emergency-ready hospital, and dispatches an ambulance — in seconds.</p>

          <div className="mt-10 flex flex-col items-center gap-6">
            <button
              onClick={() => stage === "idle" && setStage("locating")}
              disabled={stage !== "idle"}
              className={`relative grid h-44 w-44 place-items-center rounded-full bg-white text-destructive shadow-glow transition duration-300 disabled:cursor-default sm:h-56 sm:w-56 cursor-pointer ${stage === "idle" ? "hover:scale-105 active:scale-95" : ""}`}
            >
              {stage === "idle" && (
                <>
                  <span className="absolute inset-0 rounded-full animate-ping bg-white/20" />
                  <span className="absolute -inset-4 rounded-full animate-pulse bg-white/5" />
                </>
              )}
              <div className="flex flex-col items-center z-10">
                <Siren className={`h-14 w-14 ${stage === "idle" ? "text-destructive" : "text-destructive animate-pulse"}`} />
                <span className="mt-2.5 font-display text-base font-extrabold uppercase tracking-widest text-navy">
                  {stage === "idle" ? "SOS" : stage === "locating" ? "Locating…" : stage === "alerting" ? "Alerting…" : "Dispatched"}
                </span>
              </div>
            </button>
            <p className="text-xs text-white/75 font-semibold bg-black/10 px-4 py-2 rounded-full backdrop-blur-xs">By tapping, you consent to share your live location with the nearest hospital.</p>
          </div>
        </div>
      </div>

      {/* Live status */}
      {stage !== "idle" && (
        <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8 animate-fade-up">
          <h2 className="font-display text-lg font-bold text-navy flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-destructive animate-ping" />
            Live Response Timeline
          </h2>
          
          <ol className="mt-6 space-y-5">
            {[
              { key: "locating", label: "Auto-detected your location", desc: location || "Acquiring GPS coordinates…", done: stage !== "locating" },
              { key: "alerting", label: "AI triaged & alerted nearest hospitals", desc: "3 emergency-ready hospitals notified in a 5km radius", done: stage === "dispatched" },
              { key: "dispatched", label: "Ambulance dispatched successfully", desc: stage === "dispatched" ? "ETA 6 minutes · Driver: Sandeep · Unit MH-12-AB-4521" : "Waiting for dispatcher approval…", done: stage === "dispatched" },
            ].map((s) => (
              <li key={s.key} className="flex items-start gap-4">
                <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors ${s.done ? "bg-success text-white shadow-glow" : "bg-muted text-muted-foreground animate-pulse"}`}>
                  {s.done ? <CheckCircle2 className="h-4.5 w-4.5" /> : <Navigation className="h-4 w-4 animate-spin text-teal" />}
                </span>
                <div>
                  <div className="font-bold text-navy text-sm">{s.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.desc}</div>
                </div>
              </li>
            ))}
          </ol>

          {stage === "dispatched" && (
            <div className="mt-8 grid gap-4 rounded-2xl bg-gradient-teal p-6 text-white sm:grid-cols-3 animate-scale-in">
              <div className="flex flex-col justify-center">
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/80">Estimated Arrival</div>
                <div className="font-display text-3xl font-extrabold mt-1">6 min</div>
              </div>
              <div className="flex flex-col justify-center border-t border-white/10 pt-3 sm:border-t-0 sm:pt-0 sm:px-4 sm:border-x sm:border-white/10">
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/80">Responding Facility</div>
                <div className="font-display text-sm font-bold mt-1 truncate">{nearest[0].name}</div>
              </div>
              <div className="flex items-center pt-3 sm:pt-0">
                <a href="tel:108" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-bold text-navy shadow hover:bg-muted transition cursor-pointer">
                  <Phone className="h-4 w-4 text-teal" /> Call Ambulance Driver
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual alerts confirmation */}
      {selectedHospitalAlert && (
        <div className="fixed bottom-6 left-6 z-50 rounded-2xl bg-navy text-white px-5 py-4 shadow-2xl flex items-center gap-3 animate-slide-up">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-success/20 text-success"><UserCheck className="h-4 w-4" /></div>
          <div>
            <div className="text-xs font-bold">SOS Broadcast Sent</div>
            <div className="text-[10px] text-white/70">{selectedHospitalAlert} alerted manually</div>
          </div>
        </div>
      )}

      {/* Nearest hospitals */}
      <div className="mt-8">
        <div className="flex items-center gap-2 text-navy border-b border-border/40 pb-4">
          <Sparkles className="h-5 w-5 text-teal" />
          <h2 className="font-display text-xl font-bold">Nearest Emergency-Ready Hospitals</h2>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {nearest.map((h, i) => (
            <div key={h.id} className="rounded-2xl border border-border bg-card p-5 shadow-card hover:shadow-glow transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-[10px] font-bold text-success">{["1.2", "2.4", "3.8"][i]} km</span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-success animate-pulse"><Activity className="h-3.5 w-3.5" /> LIVE</span>
                </div>
                <h3 className="mt-3 font-display text-base font-bold text-navy line-clamp-1">{h.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-muted-foreground/60" /> {h.city}</p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-muted/50 p-2.5"><div className="font-extrabold text-success">{h.beds.available}</div><div className="text-[10px] text-muted-foreground mt-0.5">Beds Free</div></div>
                  <div className="rounded-xl bg-muted/50 p-2.5"><div className="font-extrabold text-teal">{h.beds.icuAvailable}</div><div className="text-[10px] text-muted-foreground mt-0.5">ICU Free</div></div>
                </div>
              </div>
              
              <button 
                onClick={() => handleManualAlert(h.name)}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-teal px-4 py-2.5 text-xs font-bold text-white shadow-glow-teal hover:opacity-95 transition cursor-pointer"
              >
                <Ambulance className="h-3.5 w-3.5" /> Alert Hospital
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
