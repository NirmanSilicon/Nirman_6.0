import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  Activity, ShieldCheck, Heart, Users, Clock, ArrowRight, 
  MapPin, Calendar, BedDouble, FileText, Siren, Pill, 
  Building, Award, CheckCircle, Smartphone, Lock, Globe,
  Search, Check
} from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — What We Do | Sanjeevani" },
      { name: "description", content: "Learn about Sanjeevani, India's unified healthcare network. We connect patients, hospitals, and clinics for seamless care." },
    ],
  }),
  component: AboutPage,
});

// ─── SUB-COMPONENTS: INTERACTIVE SIMULATORS FOR SIX PILLARS ───

function GeospatialDiscoveryCard() {
  const [status, setStatus] = useState<"idle" | "searching" | "found">("idle");
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("searching");
    setTimeout(() => {
      setStatus("found");
    }, 1200);
  };

  return (
    <div className="group rounded-3xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-glow hover:-translate-y-1.5 flex flex-col justify-between h-full relative overflow-hidden">
      <div>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal/10 text-teal transition-transform group-hover:scale-105">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-teal uppercase tracking-wider">Pillar 01</span>
            <h3 className="font-display text-base font-bold text-navy">Geospatial Discovery</h3>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Find specialized care near you instantly. Aggregates over 12,000+ certified medical institutions across India with high-precision coords.
        </p>

        {/* Live Simulation Widget */}
        <div className="mt-5 bg-slate-50 border border-slate-100 rounded-2xl p-4 relative overflow-hidden">
          {status === "idle" && (
            <form onSubmit={handleSearch} className="space-y-3">
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs">
                <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <input 
                  type="text" 
                  readOnly 
                  value="Cardiologists near me..." 
                  className="bg-transparent text-xs text-navy outline-none w-full cursor-default"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-[#12a14b] hover:bg-emerald-700 text-white font-bold text-[10px] py-2 rounded-xl transition duration-200 shadow-xs cursor-pointer text-center"
              >
                Scan Area
              </button>
            </form>
          )}

          {status === "searching" && (
            <div className="flex flex-col items-center justify-center py-4 space-y-2">
              {/* Spinning Radar line */}
              <div className="relative w-16 h-16 rounded-full border border-teal/20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-dashed border-teal/40 animate-spin-slow" />
                <div className="absolute top-0 left-1/2 w-[2px] h-[32px] bg-gradient-to-t from-teal to-transparent origin-bottom animate-spin" />
                <MapPin className="h-4 w-4 text-teal animate-bounce" />
              </div>
              <span className="text-[9px] font-bold text-teal animate-pulse uppercase tracking-wider">Scanning satellites...</span>
            </div>
          )}

          {status === "found" && (
            <div className="space-y-2 animate-fade-in">
              <div className="flex items-center justify-between text-[10px] font-bold text-[#12a14b]">
                <span>✓ 2 Facilities Located</span>
                <button 
                  onClick={() => setStatus("idle")} 
                  className="text-slate-400 hover:text-navy transition cursor-pointer text-[9px] underline uppercase"
                >
                  Reset
                </button>
              </div>
              <div className="space-y-1.5">
                <div className="bg-white border border-slate-100 rounded-lg p-2 flex items-center justify-between shadow-xs">
                  <div>
                    <div className="text-[10px] font-bold text-navy leading-tight">Metro Heart Institute</div>
                    <div className="text-[8px] text-slate-400 mt-0.5">0.8 km • Sector 12</div>
                  </div>
                  <span className="bg-emerald-50 text-[#12a14b] text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#12a14b] animate-pulse" /> 3 Beds Free
                  </span>
                </div>
                <div className="bg-white border border-slate-100 rounded-lg p-2 flex items-center justify-between shadow-xs">
                  <div>
                    <div className="text-[10px] font-bold text-navy leading-tight">Apollo Heart Center</div>
                    <div className="text-[8px] text-slate-400 mt-0.5">1.4 km • Link Road</div>
                  </div>
                  <span className="bg-rose-50 text-red-600 text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-rose-100 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Full
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
        <span>Includes satellite routing</span>
        <span className="text-teal font-bold uppercase tracking-wider group-hover:translate-x-1 transition duration-200">Active Map →</span>
      </div>
    </div>
  );
}

function OPDTokenCard() {
  const [status, setStatus] = useState<"idle" | "booking" | "booked">("idle");
  const [tokenNo, setTokenNo] = useState(18);

  useEffect(() => {
    if (status !== "booked") return;
    const interval = setInterval(() => {
      setTokenNo(prev => prev + 1);
    }, 12000);
    return () => clearInterval(interval);
  }, [status]);

  const handleBook = () => {
    setStatus("booking");
    setTimeout(() => {
      setStatus("booked");
    }, 1000);
  };

  return (
    <div className="group rounded-3xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-glow hover:-translate-y-1.5 flex flex-col justify-between h-full relative overflow-hidden">
      <div>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-50 text-purple-600 transition-transform group-hover:scale-105">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Pillar 02</span>
            <h3 className="font-display text-base font-bold text-navy">Real-Time OPD Tokening</h3>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Skip the traditional morning lines. Coordinates with hospital systems to issue OPD tokens with live queue estimates.
        </p>

        {/* Live Simulation Widget */}
        <div className="mt-5 bg-slate-50 border border-slate-100 rounded-2xl p-4 relative overflow-hidden">
          {status === "idle" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-slate-500">Doctor Profile</span>
                <span className="bg-purple-100 text-purple-700 text-[8px] font-bold px-1.5 py-0.5 rounded">OPD Active</span>
              </div>
              <div className="bg-white border border-slate-100 rounded-lg p-2.5 shadow-xs">
                <div className="text-[10px] font-bold text-navy">Dr. A. K. Banerjee</div>
                <div className="text-[8px] text-slate-400 mt-0.5">Cardiologist • Room No. 204</div>
                <div className="mt-2 flex items-center justify-between text-[9px] font-bold text-purple-600 bg-purple-50/50 p-1.5 rounded border border-purple-100/30">
                  <span>Current Board: Token #14</span>
                  <span>Waitlist: 3 patients</span>
                </div>
              </div>
              <button 
                onClick={handleBook}
                className="w-full bg-[#12a14b] hover:bg-emerald-700 text-white font-bold text-[10px] py-2 rounded-xl transition duration-200 shadow-xs cursor-pointer text-center"
              >
                Join Queue
              </button>
            </div>
          )}

          {status === "booking" && (
            <div className="flex flex-col items-center justify-center py-6 space-y-2">
              <div className="h-6 w-6 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
              <span className="text-[9px] font-bold text-purple-600 uppercase tracking-wider animate-pulse">Requesting Slot...</span>
            </div>
          )}

          {status === "booked" && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between text-[10px] font-bold text-purple-600">
                <span>✓ Token Registered</span>
                <button 
                  onClick={() => setStatus("idle")} 
                  className="text-slate-400 hover:text-navy transition cursor-pointer text-[9px] underline uppercase"
                >
                  Cancel
                </button>
              </div>
              <div className="bg-white border border-slate-100 rounded-lg p-3 shadow-xs text-center space-y-1.5 relative overflow-hidden">
                <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Your Token Number</div>
                <div className="text-2xl font-black text-navy leading-none">#15</div>
                <div className="text-[8px] text-slate-500 font-semibold">
                  Estimated Consult: <span className="text-[#12a14b] font-bold">12 mins</span>
                </div>
                <div className="text-[8px] bg-slate-50 border border-slate-100 py-1 rounded text-slate-500 font-medium">
                  {tokenNo === 18 ? "Dr. Banerjee is currently seeing #14" : `Queue Advanced: seeing #${tokenNo - 4}`}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
        <span>Instant WhatsApp alert synced</span>
        <span className="text-purple-600 font-bold uppercase tracking-wider group-hover:translate-x-1 transition duration-200">Zero Wait →</span>
      </div>
    </div>
  );
}

function BedDirectoryCard() {
  const [icuBeds, setIcuBeds] = useState(4);
  const [ventBeds, setVentBeds] = useState(2);
  const [wardBeds, setWardBeds] = useState(14);
  const [lastUpdated, setLastUpdated] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(0);
      const rand = Math.random();
      if (rand < 0.3) {
        setIcuBeds(prev => Math.max(1, Math.min(10, prev + (Math.random() > 0.5 ? 1 : -1))));
      } else if (rand < 0.6) {
        setVentBeds(prev => Math.max(0, Math.min(5, prev + (Math.random() > 0.5 ? 1 : -1))));
      } else {
        setWardBeds(prev => Math.max(5, Math.min(30, prev + (Math.random() > 0.5 ? 2 : -2))));
      }
    }, 6000);

    const updateTimer = setInterval(() => {
      setLastUpdated(t => t + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(updateTimer);
    };
  }, []);

  return (
    <div className="group rounded-3xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-glow hover:-translate-y-1.5 flex flex-col justify-between h-full relative overflow-hidden">
      <div>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-105">
            <BedDouble className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Pillar 03</span>
            <h3 className="font-display text-base font-bold text-navy">Verified Bed Directory</h3>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Real-time bed directory with automated, minute-by-minute updates of ICU, ventilator, and ward status.
        </p>

        {/* Live Simulation Widget */}
        <div className="mt-5 bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold text-slate-500">Live Bed Board</span>
            <span className="bg-emerald-100 text-[#12a14b] text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#12a14b] animate-ping" />
              Synced {lastUpdated}s ago
            </span>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[9px] font-bold text-navy mb-1">
                <span>ICU Beds (Critical Care)</span>
                <span>{icuBeds} / 12 Available</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${(icuBeds / 12) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[9px] font-bold text-navy mb-1">
                <span>Ventilators</span>
                <span>{ventBeds} / 8 Available</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-teal rounded-full transition-all duration-500" style={{ width: `${(ventBeds / 8) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[9px] font-bold text-navy mb-1">
                <span>General Wards</span>
                <span>{wardBeds} / 40 Available</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#12a14b] rounded-full transition-all duration-500" style={{ width: `${(wardBeds / 40) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
        <span>Integrated with 820+ hospitals</span>
        <span className="text-[#12a14b] font-bold uppercase tracking-wider group-hover:translate-x-1 transition duration-200">Active Board →</span>
      </div>
    </div>
  );
}

function HealthVaultCard() {
  const [decrypted, setDecrypted] = useState(false);
  const [decrypting, setDecrypting] = useState(false);

  const toggleDecrypt = () => {
    if (decrypted) {
      setDecrypted(false);
    } else {
      setDecrypting(true);
      setTimeout(() => {
        setDecrypting(false);
        setDecrypted(true);
      }, 1000);
    }
  };

  return (
    <div className="group rounded-3xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-glow hover:-translate-y-1.5 flex flex-col justify-between h-full relative overflow-hidden">
      <div>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600 transition-transform group-hover:scale-105">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Pillar 04</span>
            <h3 className="font-display text-base font-bold text-navy">ABDM Health Vault</h3>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          ABDM-compliant health locker. Take control of your records and securely share them with clinical networks.
        </p>

        {/* Live Simulation Widget */}
        <div className="mt-5 bg-slate-50 border border-slate-100 rounded-2xl p-4 relative overflow-hidden min-h-[140px] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] mb-2">
            <span className="font-bold text-slate-500 flex items-center gap-1">
              <Lock className="h-3 w-3 text-slate-400" />
              AES-256 Vault
            </span>
            <button 
              onClick={toggleDecrypt}
              className={`text-[8px] font-black uppercase px-2 py-0.5 rounded cursor-pointer transition ${
                decrypted 
                  ? "bg-emerald-100 text-[#12a14b] border border-emerald-200" 
                  : decrypting 
                    ? "bg-amber-100 text-amber-700 animate-pulse border border-amber-200" 
                    : "bg-blue-100 text-blue-700 border border-blue-200"
              }`}
            >
              {decrypted ? "Decrypted" : decrypting ? "Decrypting..." : "Decrypt"}
            </button>
          </div>

          <div className="space-y-1.5 flex-1 flex flex-col justify-center">
            {decrypting ? (
              <div className="space-y-2 py-3 animate-pulse">
                <div className="h-3 bg-slate-200 rounded w-5/6" />
                <div className="h-3 bg-slate-200 rounded w-4/6" />
                <div className="h-3 bg-slate-200 rounded w-3/4" />
              </div>
            ) : decrypted ? (
              <div className="space-y-1.5 animate-fade-in">
                <div className="bg-white border border-emerald-100/60 rounded-lg p-2 flex items-center gap-2.5 shadow-xs">
                  <CheckCircle className="h-4 w-4 text-[#12a14b]" />
                  <div className="text-[9px]">
                    <div className="font-bold text-navy">Blood_Panel_June26.pdf</div>
                    <div className="text-slate-500 mt-0.5">Cholesterol: 185 mg/dL (Normal)</div>
                  </div>
                </div>
                <div className="bg-white border border-emerald-100/60 rounded-lg p-2 flex items-center gap-2.5 shadow-xs">
                  <CheckCircle className="h-4 w-4 text-[#12a14b]" />
                  <div className="text-[9px]">
                    <div className="font-bold text-navy">Rx_Banerjee_OPD.pdf</div>
                    <div className="text-slate-500 mt-0.5">Active Prescription: Atorvastatin 10mg</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 filter blur-[0.7px] opacity-75 font-mono select-none">
                <div className="bg-slate-200/50 border border-slate-200 rounded-lg p-2 flex items-center justify-between text-[8px] text-slate-500 truncate">
                  <span>U2FsdGVkX19aRjQ5Nisd782HAsnJ7s82k...</span>
                </div>
                <div className="bg-slate-200/50 border border-slate-200 rounded-lg p-2 flex items-center justify-between text-[8px] text-slate-500 truncate">
                  <span>U2FsdGVkX1+9bXF0WTV2n89aJsU1k91a...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
        <span>ABDM Sandboxed & Safe</span>
        <span className="text-blue-600 font-bold uppercase tracking-wider group-hover:translate-x-1 transition duration-200">Secure Vault →</span>
      </div>
    </div>
  );
}

function EmergencyRoutingCard() {
  const [sosActive, setSosActive] = useState(false);
  const [etaSeconds, setEtaSeconds] = useState(240); // 4 minutes
  const [dispatchStatus, setDispatchStatus] = useState("Acquiring GPS Signal...");

  useEffect(() => {
    if (!sosActive) return;
    
    const timeout1 = setTimeout(() => setDispatchStatus("GPS Locked. Dispatching nearest responder..."), 1000);
    const timeout2 = setTimeout(() => setDispatchStatus("Ambulance #110 Departed Base (ETA < 4m)..."), 2500);
    const timeout3 = setTimeout(() => setDispatchStatus("Hospital Trauma center prepared & ready..."), 4500);

    const interval = setInterval(() => {
      setEtaSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setDispatchStatus("Ambulance Arrived.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
      clearInterval(interval);
    };
  }, [sosActive]);

  const handleSOS = () => {
    setSosActive(true);
    setEtaSeconds(228);
    setDispatchStatus("Acquiring GPS Signal...");
  };

  const formatEta = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  return (
    <div className="group rounded-3xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-glow hover:-translate-y-1.5 flex flex-col justify-between h-full relative overflow-hidden">
      <div>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-red-600 transition-transform group-hover:scale-105">
            <Siren className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Pillar 05</span>
            <h3 className="font-display text-base font-bold text-navy">AI Emergency Routing</h3>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Pings distress signal geolocation, dispatches response vehicles, and prepares the closest trauma center.
        </p>

        {/* Live Simulation Widget */}
        <div className="mt-5 bg-slate-50 border border-slate-100 rounded-2xl p-4 relative overflow-hidden min-h-[140px] flex flex-col justify-center">
          {!sosActive ? (
            <div className="text-center py-3">
              <button 
                onClick={handleSOS}
                className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-glow-red animate-breathe cursor-pointer transition border-none"
              >
                SOS
              </button>
              <div className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-2.5">
                Press to test live dispatch routing
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 animate-fade-in text-left">
              <div className="flex items-center justify-between text-[10px] font-bold text-red-600">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
                  Distress Broadcast Active
                </span>
                <button 
                  onClick={() => setSosActive(false)} 
                  className="text-slate-400 hover:text-navy transition cursor-pointer text-[9px] underline uppercase"
                >
                  Reset
                </button>
              </div>
              <div className="bg-white border border-rose-100 rounded-lg p-2.5 shadow-xs text-center">
                <div className="text-[14px] font-black text-navy">{formatEta(etaSeconds)}</div>
                <div className="text-[8px] text-slate-400 uppercase tracking-wider mt-0.5">Ambulance ETA</div>
                <div className="text-[8px] text-[#12a14b] font-bold mt-1.5 leading-tight truncate">
                  {dispatchStatus}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
        <span>Average response under 4 mins</span>
        <span className="text-red-600 font-bold uppercase tracking-wider group-hover:translate-x-1 transition duration-200">SOS System →</span>
      </div>
    </div>
  );
}

function MedicineFulfillmentCard() {
  const [selectedMed, setSelectedMed] = useState("metformin");
  const [added, setAdded] = useState(false);

  const medData: Record<string, { name: string; type: string; mrp: number; price: number; savings: string }> = {
    metformin: { name: "Metformin 500mg", type: "Diabetes (15 tabs)", mrp: 180, price: 126, savings: "30%" },
    atorvastatin: { name: "Atorvastatin 10mg", type: "Cholesterol (10 tabs)", mrp: 210, price: 157, savings: "25%" },
    paracetamol: { name: "Paracetamol 650mg", type: "Fever (15 tabs)", mrp: 45, price: 31, savings: "31%" }
  };

  const handleAdd = () => {
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="group rounded-3xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-glow hover:-translate-y-1.5 flex flex-col justify-between h-full relative overflow-hidden">
      <div>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600 transition-transform group-hover:scale-105">
            <Pill className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pillar 06</span>
            <h3 className="font-display text-base font-bold text-navy">Medicine Fulfillment</h3>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Direct partnership with verified pharmacies to provide genuine medication with doorstep delivery.
        </p>

        {/* Live Simulation Widget */}
        <div className="mt-5 bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3 relative overflow-hidden">
          <div className="flex gap-1">
            {Object.keys(medData).map(key => (
              <button
                key={key}
                onClick={() => { setSelectedMed(key); setAdded(false); }}
                className={`flex-1 text-[8px] font-bold py-1 px-1.5 rounded transition border cursor-pointer text-center ${
                  selectedMed === key
                    ? "bg-amber-100 text-amber-700 border-amber-300"
                    : "bg-white text-slate-500 border-slate-100 hover:bg-slate-50"
                }`}
              >
                {medData[key].name.split(" ")[0]}
              </button>
            ))}
          </div>

          <div className="bg-white border border-slate-100 rounded-lg p-2 flex flex-col justify-between shadow-xs">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-[9px] font-bold text-navy">{medData[selectedMed].name}</div>
                <div className="text-[7.5px] text-slate-400 mt-0.5">{medData[selectedMed].type}</div>
              </div>
              <span className="bg-amber-50 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-100">
                Save {medData[selectedMed].savings}
              </span>
            </div>

            <div className="mt-2.5 flex items-center justify-between border-t border-slate-50 pt-2">
              <div className="flex gap-2.5 text-[9px] font-semibold">
                <span className="text-slate-400 line-through">MRP ₹{medData[selectedMed].mrp}</span>
                <span className="text-navy font-bold">Price: ₹{medData[selectedMed].price}</span>
              </div>
              <button 
                onClick={handleAdd}
                className="bg-[#12a14b] hover:bg-emerald-700 text-white text-[8px] font-bold px-2.5 py-1 rounded transition cursor-pointer"
              >
                {added ? "Added!" : "Get Discount"}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
        <span>Delivery within 24 hours</span>
        <span className="text-amber-600 font-bold uppercase tracking-wider group-hover:translate-x-1 transition duration-200">Shop Pharmacy →</span>
      </div>
    </div>
  );
}

function SanjeevaniMiddlewareDiagram() {
  return (
    <div className="bg-gradient-midnight border border-white/5 rounded-3xl p-8 relative overflow-hidden text-white shadow-xl-custom">
      <div className="absolute inset-0 bg-grid-white/[0.01] bg-[size:15px_15px] pointer-events-none" />
      <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-teal/10 blur-[80px] pointer-events-none" />
      <div className="absolute -left-24 -bottom-24 h-48 w-48 rounded-full bg-blue-500/10 blur-[80px] pointer-events-none" />

      <div className="relative z-10 text-center max-w-xl mx-auto mb-10">
        <span className="bg-teal/10 border border-teal/30 text-teal text-[8px] font-bold uppercase tracking-[0.2em] px-2.5 py-1 rounded-full">
          Real-Time Sync Engine
        </span>
        <h3 className="font-display text-xl font-bold mt-3">The Sanjeevani Middleware Architecture</h3>
        <p className="text-[11px] text-white/70 mt-2 leading-relaxed">
          How we securely orchestrate data flow between personal devices, hospital information systems (HIS), and federal ABDM registries.
        </p>
      </div>

      {/* Diagram container */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center max-w-4xl mx-auto">
        {/* Left Column: Input Nodes */}
        <div className="space-y-4">
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 backdrop-blur-md flex items-center gap-3.5 hover:border-teal/30 transition duration-300">
            <div className="h-10 w-10 rounded-xl bg-teal/10 flex items-center justify-center text-teal">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold">Patient Mobile App</div>
              <div className="text-[9px] text-white/50 mt-0.5">Token, Vault & Pharmacy UI</div>
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 backdrop-blur-md flex items-center gap-3.5 hover:border-red-500/30 transition duration-300">
            <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
              <Siren className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-bold">Emergency SOS Dispatch</div>
              <div className="text-[9px] text-white/50 mt-0.5">Active distress beacon</div>
            </div>
          </div>
        </div>

        {/* Middle Column: Central Bridge */}
        <div className="flex flex-col items-center justify-center relative py-6 md:py-0">
          {/* Animated Connecting SVG (Hidden on mobile, visible on MD) */}
          <div className="absolute inset-0 pointer-events-none hidden md:block w-full h-full">
            <svg className="w-full h-full" viewBox="0 0 200 100" fill="none">
              {/* Left-to-Center paths */}
              <path d="M5,25 Q50,25 90,50" stroke="rgba(13,242,217,0.15)" strokeWidth="1.5" strokeDasharray="4 4" />
              <path d="M5,75 Q50,75 90,50" stroke="rgba(239,68,68,0.15)" strokeWidth="1.5" strokeDasharray="4 4" />
              {/* Center-to-Right paths */}
              <path d="M110,50 Q150,20 195,20" stroke="rgba(13,242,217,0.15)" strokeWidth="1.5" strokeDasharray="4 4" />
              <path d="M110,50 Q150,40 195,40" stroke="rgba(13,242,217,0.15)" strokeWidth="1.5" strokeDasharray="4 4" />
              <path d="M110,50 Q150,60 195,60" stroke="rgba(13,242,217,0.15)" strokeWidth="1.5" strokeDasharray="4 4" />
              <path d="M110,50 Q150,80 195,80" stroke="rgba(13,242,217,0.15)" strokeWidth="1.5" strokeDasharray="4 4" />
            </svg>
          </div>

          <div className="relative z-10 h-28 w-28 rounded-full bg-gradient-teal p-[1.5px] shadow-glow-teal flex items-center justify-center animate-breathe">
            <div className="h-full w-full rounded-full bg-[#040e0c] flex flex-col items-center justify-center text-center p-3 relative overflow-hidden">
              <div className="absolute inset-0 bg-teal/5 animate-pulse" />
              <Activity className="h-7 w-7 text-teal" />
              <span className="text-[8px] font-black uppercase tracking-widest text-teal mt-1">SANJEEVANI</span>
              <span className="text-[7px] text-white/50 uppercase tracking-wider font-bold">Sync Gateway</span>
            </div>
          </div>
        </div>

        {/* Right Column: Outward Node Grid */}
        <div className="space-y-3">
          <div className="bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 backdrop-blur-md flex items-center gap-3 hover:border-teal/30 transition duration-300">
            <Building className="h-4.5 w-4.5 text-teal shrink-0" />
            <div>
              <div className="text-[10px] font-bold">Hospital HIS Database</div>
              <div className="text-[8px] text-white/40">OPD & Bed Sync via HL7 FHIR</div>
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 backdrop-blur-md flex items-center gap-3 hover:border-teal/30 transition duration-300">
            <Lock className="h-4.5 w-4.5 text-blue-400 shrink-0" />
            <div>
              <div className="text-[10px] font-bold">ABDM Health Locker</div>
              <div className="text-[8px] text-white/40">National Consent Gateway Sync</div>
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 backdrop-blur-md flex items-center gap-3 hover:border-red-500/30 transition duration-300">
            <MapPin className="h-4.5 w-4.5 text-red-500 shrink-0" />
            <div>
              <div className="text-[10px] font-bold">First Responder Network</div>
              <div className="text-[8px] text-white/40">GPS routing to active ambulances</div>
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 backdrop-blur-md flex items-center gap-3 hover:border-amber-500/30 transition duration-300">
            <Pill className="h-4.5 w-4.5 text-amber-500 shrink-0" />
            <div>
              <div className="text-[10px] font-bold">Pharmacy Inventory Node</div>
              <div className="text-[8px] text-white/40">Live inventory price match updates</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ABOUT PAGE COMPONENT ───

function AboutPage() {
  useScrollReveal();

  const milestones = [
    { year: "2024", title: "Foundation & Vision", desc: "Sanjeevani was founded with the aim of addressing fragmentation in Indian healthcare networks." },
    { year: "2025", title: "100+ City Expansion", desc: "Completed integrations with over 2,500 private and government hospitals, serving 500,000+ patients." },
    { year: "2026", title: "Unified ABDM Integration", desc: "Launched ABDM-compliant health locker systems and nationwide automated emergency SOS dispatch." },
  ];

  const COLLAGE_IMAGES = [
    "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1579154769741-62d55697b0a5?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1504813184591-0155787641df?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1542884748-2b87b36c6b90?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1631815541952-ddf71ab3d156?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1576765608622-467cd887869e?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1512678080530-7760d81faba6?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1590611380053-eef403428a68?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1607619056574-7b8f30413b46?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1579684275623-00916e7c62d5?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1504439468489-c8920d796a29?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1551884170-09fb70a3a2ed?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1624640356538-4001d84877b4?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1618019313230-724e19b8417c?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1576765608866-5b5104e106b9?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1596541223130-5d31a73fb6c6?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1543164904-8fa711019053?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1581093588401-f3c22d75ba21?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1583946959582-7e82b79a52ab?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1587854692152-cbe660dbbc88?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1631217818202-90ef4a851c58?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1550831107-1553da8c8464?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&w=300&q=80"
  ];

  return (
    <div className="bg-background">
      {/* ─── Page Hero ─── */}
      <section className="relative overflow-hidden bg-navy py-24 text-white noise">
        {/* Collage Background Grid */}
        <div className="absolute -inset-10 z-0 overflow-hidden pointer-events-none select-none opacity-60">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 p-4 -rotate-3 scale-105 w-full">
            {[...COLLAGE_IMAGES, ...COLLAGE_IMAGES].map((src, idx) => (
              <div 
                key={idx} 
                className="aspect-square rounded-2xl overflow-hidden border border-white/10 bg-slate-800 shadow-md transition-all duration-500 hover:scale-105"
              >
                <img src={src} className="h-full w-full object-cover" alt="" />
              </div>
            ))}
          </div>
          {/* Soft gradients to blend with pine green background */}
          <div className="absolute inset-0 bg-gradient-to-b from-navy/40 via-transparent to-navy/55" />
        </div>

        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:30px_30px]" />
        <div className="absolute -left-1/4 -top-1/4 h-96 w-96 rounded-full bg-teal/10 blur-[120px]" />
        <div className="absolute -right-1/4 -bottom-1/4 h-96 w-96 rounded-full bg-blue-600/10 blur-[120px]" />

        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="relative bg-navy/75 backdrop-blur-md border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl overflow-hidden">
            {/* Soft inner glow elements */}
            <div className="absolute -left-16 -top-16 h-32 w-32 rounded-full bg-teal/15 blur-2xl pointer-events-none" />
            <div className="absolute -right-16 -bottom-16 h-32 w-32 rounded-full bg-blue-500/15 blur-2xl pointer-events-none" />

            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-teal/30 bg-teal/10 px-4 py-1.5 text-xs font-bold text-teal animate-fade-up">
                What We Do
              </span>
              <h1 className="mt-6 font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight animate-fade-up delay-100">
                Unifying India's Healthcare Ecosystem
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-white/80 animate-fade-up delay-200">
                Sanjeevani is the digital infrastructure connecting patients, doctors, hospitals, and pharmacies into a single, seamless, and lightning-fast network.
              </p>

              {/* System Network Registry Ticker */}
              <div className="mx-auto max-w-3xl mt-10 bg-white/[0.04] border border-white/5 rounded-2xl p-4 flex flex-wrap gap-6 items-center justify-between text-xs animate-fade-up delay-300">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold text-white">System Status:</span>
                  <span className="text-emerald-400 font-semibold">Fully Operational</span>
                </div>
                <div className="h-4 w-px bg-white/10 hidden sm:block" />
                <div className="flex items-center gap-2">
                  <span className="text-white/50">Active Gateways:</span>
                  <span className="font-bold text-teal">12,418 Connected</span>
                </div>
                <div className="h-4 w-px bg-white/10 hidden sm:block" />
                <div className="flex items-center gap-2">
                  <span className="text-white/50">SOS Dispatch Nodes:</span>
                  <span className="font-bold text-teal">Online</span>
                </div>
                <div className="h-4 w-px bg-white/10 hidden sm:block" />
                <div className="flex items-center gap-2">
                  <span className="text-white/50">ABDM Registry Sync:</span>
                  <span className="font-bold text-emerald-400">100% Encrypted</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Our Mission Split ─── */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="reveal-left">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal/10 text-teal shadow-xs">
                <Heart className="h-6 w-6" />
              </div>
              <h2 className="mt-5 font-display text-3xl font-extrabold text-navy sm:text-4xl">
                Bridging the Gap in Indian Healthcare
              </h2>
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                In India, healthcare is highly fragmented. Patients face long OPD queues, lack of real-time ICU bed updates, scattered prescriptions, and delays in emergency responses. 
              </p>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Sanjeevani brings everyone onto a unified platform. Using advanced geospatial coordinates, secure cloud databases, and ABDM health records frameworks, we guarantee transparency, speed, and safety when you need it most.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-6 border-t border-border pt-8">
                <div>
                  <div className="font-display text-3xl font-extrabold text-navy">12,400+</div>
                  <div className="text-xs text-muted-foreground font-semibold mt-1">Verified Hospitals</div>
                </div>
                <div>
                  <div className="font-display text-3xl font-extrabold text-navy">4 Minutes</div>
                  <div className="text-xs text-muted-foreground font-semibold mt-1">Avg. Emergency response</div>
                </div>
              </div>
            </div>

            <div className="reveal-right relative rounded-3xl border border-border bg-gradient-midnight p-8 text-white shadow-xl-custom lg:p-10">
              <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
              <h3 className="relative z-10 font-display text-xl font-bold">Our Core Philosophy</h3>
              <p className="relative z-10 mt-4 text-xs leading-relaxed text-white/80">
                We believe that health access is a fundamental right. Getting critical medical data, locating a nearby hospital, booking a doctor, or sharing records should not be a struggle. We write code, build APIs, and integrate hospitals to save lives.
              </p>

              <ul className="relative z-10 mt-8 space-y-4">
                {[
                  { title: "Transparency First", desc: "No hidden charges or preferred hospital bias. We display honest data." },
                  { title: "Data Privacy", desc: "Your health records are end-to-end encrypted. We cannot view them without permission." },
                  { title: "Inclusive Access", desc: "Designed to run on low-bandwidth networks and simple mobile devices." }
                ].map((item, idx) => (
                  <li key={idx} className="flex gap-4">
                    <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-teal text-white">
                      <CheckCircle className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{item.title}</h4>
                      <p className="text-[11px] text-white/70 mt-0.5">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pillars Section ─── */}
      <section className="bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center reveal">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-teal">Our Capabilities</span>
            <h2 className="mt-4 font-display text-3xl font-extrabold text-navy sm:text-4xl leading-tight">
              The Six Pillars of Sanjeevani
            </h2>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              We leverage modern technology, live databases, and secure consent registries to deliver high-performance interactive healthcare tools. Try them below!
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3 items-stretch">
            <GeospatialDiscoveryCard />
            <OPDTokenCard />
            <BedDirectoryCard />
            <HealthVaultCard />
            <EmergencyRoutingCard />
            <MedicineFulfillmentCard />
          </div>
        </div>
      </section>

      {/* ─── Architecture Section ─── */}
      <section className="py-20 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SanjeevaniMiddlewareDiagram />
        </div>
      </section>

      {/* ─── Standards & Accreditations ─── */}
      <section className="py-20 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="reveal-left">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-teal">Compliance & Security</span>
              <h2 className="mt-4 font-display text-3xl font-extrabold text-navy sm:text-4xl">
                Bank-Grade Security for Your Private Data
              </h2>
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                Your medical data is sensitive. Sanjeevani complies fully with ABDM (Ayushman Bharat Digital Mission) standards, ensuring that all records are stored inside a secure ecosystem.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  { icon: Lock, title: "AES-256 Encryption", desc: "All files stored in the Health Vault are encrypted before hitting the disk." },
                  { icon: Award, title: "NABH and HIPAA Standards", desc: "Our partners adhere strictly to quality healthcare and patient confidentiality guidelines." },
                  { icon: Globe, title: "Decentralized Record Sharing", desc: "You control who views your reports, with time-bound access consent tokens." }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-teal">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-bold text-navy">{item.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="reveal-right flex flex-col justify-center rounded-3xl border border-border bg-card p-8 shadow-glow sm:p-12">
              <h3 className="font-display text-xl font-bold text-navy">Integrated Systems</h3>
              <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                Sanjeevani serves as the central middleware connecting diverse hospital legacy systems.
              </p>

              <div className="mt-8 space-y-6">
                {[
                  { label: "HIS (Hospital Info Systems)", val: "92%" },
                  { label: "EMR (Electronic Medical Records)", val: "88%" },
                  { label: "ABDM Health Locker APIs", val: "100%" },
                  { label: "Pharmacy Inventory Systems", val: "95%" }
                ].map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-xs font-bold text-navy">
                      <span>{item.label}</span>
                      <span>{item.val} Integration</span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-gradient-teal" style={{ width: item.val }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Timeline ─── */}
      <section className="bg-background py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center reveal">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-teal">Our Journey</span>
            <h2 className="mt-4 font-display text-3xl font-extrabold text-[#0f3422] sm:text-4xl">
              How We've Grown
            </h2>
          </div>

          <div className="mt-16 relative border-l border-border max-w-3xl mx-auto pl-8 space-y-8">
            {milestones.map((milestone, idx) => (
              <div 
                key={idx} 
                className="relative reveal group p-6 rounded-2xl border border-border hover:border-teal/20 hover:bg-slate-50/50 transition-all duration-300"
              >
                <div className="absolute -left-[45px] top-7 grid h-8 w-8 place-items-center rounded-full bg-teal text-white ring-4 ring-white shadow-xs">
                  <div className="h-2 w-2 rounded-full bg-white" />
                </div>
                <div>
                  <span className="inline-block rounded-md bg-teal/10 px-2.5 py-0.5 text-xs font-bold text-teal">
                    {milestone.year}
                  </span>
                  <h3 className="mt-2 font-display text-base font-bold text-navy">{milestone.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{milestone.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-teal p-10 text-white shadow-lg-custom sm:p-14 text-center relative reveal">
          <div className="absolute inset-0 bg-grid-white/[0.04] bg-[size:20px_20px]" />
          <h2 className="relative z-10 font-display text-3xl font-extrabold sm:text-4xl leading-tight">
            Ready to experience connected healthcare?
          </h2>
          <p className="relative z-10 mx-auto mt-4 max-w-xl text-xs leading-relaxed text-white/90">
            Create your profile in 30 seconds. Access nearby hospitals, check bed vacancies, book consults and digitize your physical files.
          </p>
          <div className="relative z-10 mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/book" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-xs font-bold text-teal hover:bg-muted transition cursor-pointer">
              Book an Appointment
            </Link>
            <Link to="/hospitals" className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-xs font-semibold text-white backdrop-blur hover:bg-white/15 transition cursor-pointer">
              Find Nearby Hospitals <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
