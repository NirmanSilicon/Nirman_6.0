import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  Search, MapPin, Calendar, BedDouble, FileText, Siren, 
  Stethoscope, ShieldCheck, Activity, ArrowRight, Star, 
  Sparkles, Pill, Heart, Users, Clock, TrendingUp, 
  ChevronRight, Building, HelpCircle, ChevronDown, Check, 
  ShieldAlert, ArrowUpRight, CreditCard, Zap, Shield
} from "lucide-react";
// No image import needed for hero console
import howItWorksImg from "@/assets/how-it-works.png";
import doctorImg from "@/assets/doctor-care.png";
import sanjeevaniAiBot from "@/assets/sanjeevani-ai-bot.png";
import logoImg from "@/assets/logo.png";
import { hospitals } from "@/lib/mockData";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { HospitalMap } from "@/components/HospitalMap";
import { HeartSignalBackground } from "@/components/HeartSignalBackground";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sanjeevani — Book OPD & Find Any Hospital in India" },
      { name: "description", content: "Search 12,000+ hospitals across India. Book OPD, check bed availability, order medicines, and get AI emergency response." },
    ],
  }),
  component: HomePage,
});

const features = [
  { icon: MapPin, title: "Every Hospital, One Map", desc: "12,000+ hospitals across 600+ Indian cities — searchable by location, specialty and rating.", gradient: "bg-gradient-teal" },
  { icon: Calendar, title: "Real-Time OPD Booking", desc: "Live doctor schedules, instant token confirmation, zero queues.", gradient: "bg-gradient-purple" },
  { icon: BedDouble, title: "Live Bed Availability", desc: "ICU, general & emergency beds updated minute-by-minute from each hospital.", gradient: "bg-gradient-emerald" },
  { icon: FileText, title: "Lifetime Health Vault", desc: "Prescriptions, lab reports, scans — all your records in one secure place.", gradient: "bg-gradient-teal" },
  { icon: Siren, title: "AI Emergency Response", desc: "One tap auto-locates you and alerts the nearest hospital with an ambulance dispatched.", gradient: "bg-gradient-emergency" },
  { icon: Pill, title: "Online Pharmacy", desc: "Order genuine medicines at best prices with doorstep delivery across India.", gradient: "bg-gradient-gold" },
];

const stats = [
  { value: "12,400+", label: "Hospitals", icon: Activity },
  { value: "85,000+", label: "Verified Doctors", icon: Users },
  { value: "600+", label: "Cities Served", icon: MapPin },
  { value: "4 min", label: "Avg. Emergency ETA", icon: Clock },
];

const testimonials = [
  { id: "t1", name: "Priya Sharma", city: "Mumbai", text: "Booked an OPD appointment in 30 seconds. The doctor was on time, and my prescription was auto-saved to my vault. Incredible!", rating: 5, avatar: "https://i.pravatar.cc/100?img=5" },
  { id: "t2", name: "Rahul Verma", city: "Delhi", text: "The emergency SOS feature literally saved my father's life. Ambulance arrived in 3 minutes. Every family needs this app.", rating: 5, avatar: "https://i.pravatar.cc/100?img=12" },
  { id: "t3", name: "Anjali Reddy", city: "Hyderabad", text: "I ordered medicines at 30% less than MRP. Genuine products, delivered next day. Switched from other pharmacy apps completely.", rating: 5, avatar: "https://i.pravatar.cc/100?img=9" },
];

const partnerLogos = [
  "Apollo Clinics", "Fortis Hospital", "Max Healthcare", "Manipal Hospitals", 
  "Narayana Health", "Aster DM Healthcare", "Medanta Medicine", "KIMS Hospitals"
];

function HeroConsole() {
  const [activeTab, setActiveTab] = useState<"queue" | "beds" | "sos" | "vault">("queue");
  
  // States for live simulation
  const [tokenNumber, setTokenNumber] = useState(15);
  const [eta, setEta] = useState(5);
  const [sosActive, setSosActive] = useState(false);
  const [sosStatus, setSosStatus] = useState("Dispatching Ambulance");

  useEffect(() => {
    const timer = setInterval(() => {
      setTokenNumber(t => (t < 25 ? t + 1 : 12));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!sosActive) return;
    const timer = setInterval(() => {
      setEta(e => {
        if (e > 1) {
          if (e === 4) setSosStatus("Departing base station");
          if (e === 3) setSosStatus("Navigating expressway");
          if (e === 2) setSosStatus("Approaching sector gateway");
          return e - 1;
        }
        setSosStatus("Arrived at site");
        return 1;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [sosActive]);

  const triggerSOS = () => {
    setSosActive(true);
    setEta(5);
    setSosStatus("Dispatching Ambulance");
  };

  return (
    <div className="w-full max-w-[530px] h-[440px] rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-2xl flex overflow-hidden text-white relative">
      {/* Decorative ambient lighting */}
      <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-teal/10 blur-3xl pointer-events-none" />
      <div className="absolute -right-20 -bottom-20 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      {/* Sidebar navigation */}
      <div className="w-[170px] border-r border-white/5 bg-white/[0.01] p-3.5 flex flex-col justify-between shrink-0 relative z-10">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-2 w-2 rounded-full bg-teal animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/50 font-mono">Console v1.4</span>
          </div>
          <div className="space-y-1">
            {[
              { id: "queue", label: "Live Queue", icon: Clock },
              { id: "beds", label: "Bed Registry", icon: BedDouble },
              { id: "sos", label: "SOS Dispatch", icon: Siren },
              { id: "vault", label: "Health Vitals", icon: Activity },
            ].map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-xs font-bold transition-all border border-transparent cursor-pointer ${
                    active ? "bg-white/10 text-white border-white/5" : "text-white/45 hover:text-white/80 hover:bg-white/[0.02]"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? "text-teal" : ""}`} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="text-[8px] text-white/20 font-mono tracking-tighter">
          ABDM INTEGRATION
        </div>
      </div>

      {/* Main console content */}
      <div className="flex-1 p-6 flex flex-col justify-between min-w-0 relative z-10 bg-white/[0.005]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-teal truncate">
            {activeTab === "queue" && "OPD Token Queue"}
            {activeTab === "beds" && "Live Bed Registry"}
            {activeTab === "sos" && "Trauma SOS Center"}
            {activeTab === "vault" && "Secure EMR & Vitals"}
          </h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
          </span>
        </div>

        {/* Content Screens */}
        <div className="flex-1 py-4 flex flex-col justify-center">
          {activeTab === "queue" && (
            <div className="space-y-4 animate-fade-up">
              <div className="flex justify-between items-center bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                <div>
                  <div className="text-[10px] text-white/45 font-bold uppercase tracking-wider">Your Token</div>
                  <div className="text-3xl font-black mt-1">#18</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-white/45 font-bold uppercase tracking-wider">Serving Now</div>
                  <div className="text-3xl font-black text-teal mt-1">#{tokenNumber}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-white/70">Consulting Doctor:</div>
                <div className="flex items-center justify-between bg-white/[0.01] border border-white/5 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-teal/20 text-teal text-[10px] font-bold grid place-items-center">AP</div>
                    <div>
                      <div className="text-xs font-bold">Dr. Aditi Patel</div>
                      <div className="text-[9px] text-white/45">Cardiologist · Room 102</div>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-teal">~12 min wait</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "beds" && (
            <div className="space-y-2.5 animate-fade-up">
              {[
                { name: "Fortis Hospital, Mulund", total: 45, av: 3 },
                { name: "Hiranandani Hospital, Powai", total: 20, av: 5 },
                { name: "KEM Hospital, Parel", total: 110, av: 0 },
              ].map((h, idx) => (
                <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex items-center justify-between text-xs">
                  <div className="truncate pr-2">
                    <div className="font-bold truncate">{h.name}</div>
                    <div className="text-[9px] text-white/40 mt-0.5">ICU Ventilator Ward</div>
                  </div>
                  <div className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] shrink-0 ${
                    h.av > 0 ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"
                  }`}>
                    {h.av > 0 ? `${h.av} Available` : "Full"}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "sos" && (
            <div className="space-y-4 animate-fade-up">
              {!sosActive ? (
                <div className="text-center py-2 space-y-3">
                  <p className="text-xs text-white/65 max-w-[280px] mx-auto leading-relaxed">
                    Access immediate trauma dispatch. System will share location and primary health metrics.
                  </p>
                  <button
                    onClick={triggerSOS}
                    className="w-full bg-gradient-emergency hover:opacity-90 active:scale-95 transition rounded-xl py-3 text-xs font-black tracking-wide text-white shadow-glow-red cursor-pointer"
                  >
                    🚨 Trigger SOS Ambulance
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white/80">Ambulance MH-12-ED-4402</span>
                      <span className="font-black text-teal">{eta} min ETA</span>
                    </div>
                    <div className="relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-emergency rounded-full transition-all duration-1000"
                        style={{ width: `${(6 - eta) * 20}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-teal font-semibold flex items-center gap-1">
                      <MapPin className="h-3 w-3 animate-bounce" /> {sosStatus}
                    </div>
                  </div>
                  <button
                    onClick={() => setSosActive(false)}
                    className="w-full text-center text-[10px] text-white/40 hover:text-white transition font-bold cursor-pointer"
                  >
                    Cancel Dispatch Request
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "vault" && (
            <div className="space-y-3 animate-fade-up text-left">
              {/* Patient Vitals Grid */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Heart Rate", val: "72 bpm", desc: "Normal", color: "text-emerald-400" },
                  { label: "SpO2 (Oxygen)", val: "98%", desc: "Optimal", color: "text-teal-400" },
                  { label: "Blood Pressure", val: "120/80", desc: "Sys/Dia", color: "text-teal-400" },
                  { label: "Body Temp", val: "98.4 °F", desc: "Healthy", color: "text-emerald-400" }
                ].map((vt, i) => (
                  <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl p-2 flex flex-col justify-between">
                    <span className="text-[8px] text-white/40 font-bold uppercase">{vt.label}</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className={`text-xs font-black ${vt.color}`}>{vt.val}</span>
                      <span className="text-[7px] text-white/30 font-semibold">{vt.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* ABDM Warning Banner */}
              <div className="text-[8px] text-white/50 bg-white/5 border border-white/5 rounded-lg p-2 flex items-center gap-1.5 leading-normal">
                <ShieldCheck className="h-3.5 w-3.5 text-teal shrink-0" />
                <span>All records are verified under Ayushman Bharat framework.</span>
              </div>

              {/* Files */}
              <div className="space-y-1.5">
                {[
                  { name: "CBC_BloodReport.pdf", date: "Today, 10:15 AM", size: "1.2 MB" },
                  { name: "Apollo_Prescription.pdf", date: "Yesterday, 3:30 PM", size: "480 KB" },
                ].map((doc, idx) => (
                  <div key={idx} className="bg-white/[0.01] border border-white/5 rounded-xl p-2 flex items-center justify-between text-[10px]">
                    <div className="truncate pr-2">
                      <div className="font-bold truncate text-white/80">{doc.name}</div>
                      <div className="text-[8px] text-white/30 mt-0.5">{doc.date}</div>
                    </div>
                    <span className="text-[8px] text-white/30 font-mono shrink-0">{doc.size}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info inside the console card */}
        <div className="border-t border-white/5 pt-3 flex items-center justify-between text-[9px] text-white/40 font-mono">
          <span>HOST: PATIENT_HUB_PORTAL</span>
          <span>LATENCY: 12ms</span>
        </div>
      </div>
    </div>
  );
}

function LogoMarquee() {
  return (
    <div className="bg-navy border-y border-white/5 py-8 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-4">
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
          In Partnership with India's Premier Healthcare Networks
        </p>
      </div>
      <div className="ticker-wrap w-full">
        <div className="ticker-content flex gap-12 whitespace-nowrap animate-ticker">
          {partnerLogos.concat(partnerLogos).map((logo, idx) => (
            <div key={idx} className="flex items-center gap-2 text-white/50 font-display text-sm font-extrabold hover:text-teal transition duration-200">
              <Building className="h-4 w-4 text-teal" /> {logo}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WhatWeDoSection() {
  const [activeFeature, setActiveFeature] = useState(0);
  
  const pillars = [
    {
      title: "Geospatial Map Search",
      badge: "Satellite Enabled",
      desc: "Search, filter and locate 12,000+ medical centers, clinics, and diagnostics on our high-resolution satellite mapping console. Get turn-by-turn routing with active traffic overlays.",
      stats: "12.4K+ Registered Facilities",
      highlights: [
        { label: "Precision Search", desc: "Filter by specialty, active beds, and rating index." },
        { label: "Live Bed Registry", desc: "Minute-by-minute status tracking of general & ICU beds." },
        { label: "Intelligent Routing", desc: "Active traffic overlay with turn-by-turn directions." }
      ],
      color: "from-teal-500/20 to-emerald-500/10 bg-teal-500/5",
      accent: "teal",
      textColor: "text-teal-600",
      borderColor: "border-teal-500/20",
      activeBg: "bg-teal-50",
      activeBorder: "border-teal/30 shadow-[0_0_15px_rgba(13,148,136,0.1)]",
      iconBg: "bg-teal-500/10 text-teal-600",
      iconActiveBg: "bg-gradient-teal text-white shadow-[0_0_15px_rgba(13,148,136,0.4)]",
      icon: MapPin
    },
    {
      title: "Real-time OPD Tokening",
      badge: "Zero Queues",
      desc: "Skip long morning registrations. Book a token directly from home. Our system estimates wait times dynamically based on real-time consultation durations.",
      stats: "85K+ Verified Doctors",
      highlights: [
        { label: "Instant Tokening", desc: "Register from home and receive a digital consultation token." },
        { label: "Dynamic Wait Estimator", desc: "Calculate queuing delays based on check-in duration." },
        { label: "ABDM Sync", desc: "Linked consultation notes uploaded directly to your profile." }
      ],
      color: "from-purple-500/20 to-indigo-500/10 bg-purple-500/5",
      accent: "purple",
      textColor: "text-purple-600",
      borderColor: "border-purple-500/20",
      activeBg: "bg-purple-50",
      activeBorder: "border-purple-500/30 shadow-[0_0_15px_rgba(147,51,234,0.1)]",
      iconBg: "bg-purple-500/10 text-purple-600",
      iconActiveBg: "bg-gradient-purple text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]",
      icon: Calendar
    },
    {
      title: "Secure EMR Health Vault",
      badge: "ABDM Compliant",
      desc: "Carry all your medical history on your phone. Upload lab tests, scans, and doctor scripts. Everything is organized chronologically and fully encrypted under ABDM protocol.",
      stats: "100% Consent Controlled",
      highlights: [
        { label: "AES-256 Encryption", desc: "Bank-grade file security ensures private patient health logs." },
        { label: "Consent PIN", desc: "Approve temporary doctor access via secure OTP pins." },
        { label: "Multi-profile Dashboard", desc: "Manage children, spouses, and elder health records." }
      ],
      color: "from-blue-500/20 to-sky-500/10 bg-blue-500/5",
      accent: "blue",
      textColor: "text-blue-600",
      borderColor: "border-blue-500/20",
      activeBg: "bg-blue-50",
      activeBorder: "border-blue-500/30 shadow-[0_0_15px_rgba(37,99,235,0.1)]",
      iconBg: "bg-blue-500/10 text-blue-600",
      iconActiveBg: "bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]",
      icon: FileText
    },
    {
      title: "AI Emergency Triage",
      badge: "4 Min Avg ETA",
      desc: "Our automated distress system coordinates with emergency vehicles. A single button registers your geolocation and medical history, alerting the nearest ICU trauma department.",
      stats: "24/7 Dispatch Control",
      highlights: [
        { label: "One-Tap Distress Beacon", desc: "Locate patient coordinates and dispatch nearest ambulance." },
        { label: "Hospital ICU Alerting", desc: "Notify trauma wards with historical patient records." },
        { label: "Contact Broadcasting", desc: "SMS alerts sent instantly to saved emergency contacts." }
      ],
      color: "from-red-500/20 to-rose-500/10 bg-red-500/5",
      accent: "red",
      textColor: "text-red-600",
      borderColor: "border-red-500/20",
      activeBg: "bg-red-50",
      activeBorder: "border-red-500/30 shadow-[0_0_15px_rgba(225,29,72,0.1)]",
      iconBg: "bg-red-500/10 text-red-600",
      iconActiveBg: "bg-gradient-emergency text-white shadow-[0_0_15px_rgba(225,29,72,0.4)]",
      icon: Siren
    }
  ];

  return (
    <section className="bg-slate-50/30 py-28 border-t border-slate-100 overflow-hidden relative">
      {/* Decorative cyber grid backdrop */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.008)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.008)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 border border-teal-100 px-3 py-1 text-xs font-bold text-teal">
            <Sparkles className="h-3.5 w-3.5" /> What We Do
          </span>
          <h2 className="mt-4 font-display text-3xl font-extrabold text-navy sm:text-4xl lg:text-5xl leading-tight">
            Comprehensive Digital Health System
          </h2>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            Sanjeevani bridges the gaps between patients, doctors, and hospitals. Select a core clinical pillar below to see how our systems coordinate care.
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] items-stretch">
          {/* Left: Tab selection */}
          <div className="flex flex-col gap-4 justify-center">
            {pillars.map((p, idx) => {
              const active = activeFeature === idx;
              const Icon = p.icon;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveFeature(idx)}
                  className={`relative text-left p-5 rounded-2xl border transition-all duration-300 group overflow-hidden ${
                    active 
                      ? `${p.activeBorder} bg-white shadow-xl scale-[1.02]` 
                      : "border-slate-200 bg-white/40 hover:border-slate-300 hover:bg-white/80 hover:shadow-md hover:scale-[1.01]"
                  }`}
                >
                  {/* Active accent vertical strip */}
                  {active && (
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${
                      p.accent === "teal" ? "bg-teal" :
                      p.accent === "purple" ? "bg-purple-600" :
                      p.accent === "blue" ? "bg-blue-600" :
                      "bg-rose-655 font-mono" // Fallback to rose/red
                    } ${
                      p.accent === "red" ? "bg-rose-600" : ""
                    }`} />
                  )}

                  <div className="flex items-center gap-4 relative z-10">
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl transition-all duration-300 ${
                      active ? p.iconActiveBg : p.iconBg
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className={`text-[10px] font-bold tracking-wider uppercase ${
                        active ? p.textColor : "text-slate-400"
                      }`}>{p.badge}</div>
                      <h3 className={`text-sm font-black transition duration-200 ${
                        active ? "text-slate-800" : "text-slate-600 group-hover:text-slate-800"
                      } mt-0.5`}>{p.title}</h3>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: Feature Details Illustration */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-8 lg:p-10 shadow-2xl flex flex-col justify-between relative overflow-hidden transition-all duration-300">
            {/* Animated backdrop glow color-synced with active tab */}
            <div className={`absolute top-0 right-0 h-72 w-72 rounded-full blur-[100px] bg-gradient-to-br ${pillars[activeFeature].color} opacity-40 transition-all duration-500`} />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold ${
                  pillars[activeFeature].accent === 'teal' ? 'bg-teal-50 text-teal' :
                  pillars[activeFeature].accent === 'purple' ? 'bg-purple-50 text-purple-600' :
                  pillars[activeFeature].accent === 'blue' ? 'bg-blue-50 text-blue-600' :
                  'bg-rose-50 text-rose-600'
                }`}>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {pillars[activeFeature].stats}
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-400">STATUS: SYNCED</span>
              </div>

              <h3 className="mt-6 font-display text-2xl font-black text-slate-800">
                {pillars[activeFeature].title}
              </h3>
              <p className="mt-4 text-xs text-slate-500 leading-relaxed font-semibold">
                {pillars[activeFeature].desc}
              </p>

              <h4 className="mt-8 text-[10px] font-black text-slate-800 uppercase tracking-widest font-mono">
                Key Integration Points
              </h4>
              
              {/* Sleek highlights layout */}
              <ul className="mt-4 space-y-4">
                {pillars[activeFeature].highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-4 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition duration-200">
                    <span className={`mt-0.5 grid h-6 w-6 place-items-center rounded-full shrink-0 ${
                      pillars[activeFeature].accent === 'teal' ? 'bg-teal-50 text-teal' :
                      pillars[activeFeature].accent === 'purple' ? 'bg-purple-50 text-purple-600' :
                      pillars[activeFeature].accent === 'blue' ? 'bg-blue-50 text-blue-600' :
                      'bg-rose-50 text-rose-600'
                    }`}>
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-slate-800">{h.label}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{h.desc}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between relative z-10">
              <span className="text-[10px] text-slate-400 font-bold">Learn more on our dedicated About page.</span>
              <Link 
                to="/about" 
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black text-white shadow-md transition duration-200 hover:-translate-y-0.5 ${
                  pillars[activeFeature].accent === 'teal' ? 'bg-teal hover:opacity-90 shadow-teal-500/20' :
                  pillars[activeFeature].accent === 'purple' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20' :
                  pillars[activeFeature].accent === 'blue' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' :
                  'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                }`}
              >
                <span>Read details</span> 
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Locate & Filter",
      desc: "Use our interactive satellite map console to locate verified medical facilities near you. Filter by emergency capability, ratings, or specialties."
    },
    {
      num: "02",
      title: "Confirm OPD or SOS",
      desc: "Instantly secure an active OPD token with clear consultation ETA or trigger our emergency ambulance dispatch routing."
    },
    {
      num: "03",
      title: "Manage Care Digitally",
      desc: "Receive encrypted, digital prescriptions in your ABDM Health Vault, order discounted medications, and schedule follow-ups online."
    }
  ];

  return (
    <section className="bg-card py-24 border-t border-border overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12 items-center">
          {/* Left Column: Steps Timeline */}
          <div className="lg:col-span-6 space-y-10 reveal-left">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-teal">Simple Integration</span>
              <h2 className="mt-4 font-display text-3xl font-extrabold text-navy sm:text-4xl leading-tight">
                How Sanjeevani Connects Your Care
              </h2>
              <p className="mt-4 text-sm text-muted-foreground max-w-lg leading-relaxed">
                We bridge the gap between emergency transport, hospital registries, and personal medical records into a single, real-time clinical ecosystem.
              </p>
            </div>

            {/* Vertical Steps Timeline */}
            <div className="relative pl-6 border-l border-teal/15 space-y-8">
              {steps.map((step, idx) => (
                <div key={idx} className="relative group">
                  {/* Timeline bullet node */}
                  <div className="absolute left-[-31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-teal bg-background transition-colors group-hover:bg-teal">
                    <div className="h-1.5 w-1.5 rounded-full bg-teal group-hover:bg-background" />
                  </div>
                  
                  <div className="p-6 rounded-2xl border border-border bg-background shadow-sm hover:border-teal/20 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-xs font-bold uppercase tracking-wider text-teal">Step {step.num}</span>
                      <span className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider">Active Sync</span>
                    </div>
                    <h3 className="mt-2 font-display text-base font-bold text-navy">{step.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: High-Tech Mockup Visual Collage */}
          <div className="lg:col-span-6 relative flex justify-center items-center reveal-right">
            {/* Glowing Backdrop */}
            <div className="absolute -inset-4 rounded-[40px] bg-gradient-to-tr from-teal/15 to-emerald-500/5 blur-3xl opacity-75 pointer-events-none" />

            {/* Main frame container */}
            <div className="relative w-full max-w-[460px] rounded-3xl border border-border/80 bg-background/50 p-3 shadow-xl backdrop-blur-sm">
              <div className="relative overflow-hidden rounded-2xl border border-border bg-background shadow-md">
                <img 
                  src={howItWorksImg} 
                  alt="Sanjeevani Care Mockups" 
                  className="w-full h-auto object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy/35 to-transparent pointer-events-none" />
              </div>

              {/* Floating Dashboard Badges (adds visual depth & premium feel) */}
              <div className="absolute top-[25%] left-[-20px] rounded-2xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur-md flex items-center gap-2.5 animate-float">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-teal/10 text-teal">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-navy">ABDM Compliant</div>
                  <div className="text-[8px] text-muted-foreground font-semibold">AES-256 Encrypted</div>
                </div>
              </div>

              <div className="absolute bottom-[20%] right-[-20px] rounded-2xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur-md flex items-center gap-2.5 animate-float delay-200">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-400/10 text-emerald-500">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-navy">98.2% Accuracy</div>
                  <div className="text-[8px] text-muted-foreground font-semibold">Live GPS Tracker</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

const HOME_SYSTEM_PROMPT = `You are Sanjeevani AI, the expert AI healthcare companion for Sanjeevani — India's unified OPD booking, hospital search, and emergency response platform.

You have deep knowledge of:
- OPD Booking: Book digital tokens at 12,000+ connected hospitals. Live doctor availability, zero queues, immediate confirmation.
- Hospital Search: Find hospitals on a map, filter by rating, specialties, distance, and live ICU/general bed availability.
- Emergency SOS response: One-tap SOS auto-detects user location, routes nearby ambulances, and triggers emergency alerts to contacts (average response time 4 minutes).
- Health Vault: ABDM-compliant lifetime health record vault where users can upload prescriptions and lab reports under secure AES-256 encryption.
- Pharmacy: Order genuine medicines at cheap prices with 2 hours express delivery.

Communication style:
- Be warm, extremely professional, concise, and helpful. Use clear formatting and bullet points.
- Always recommend consulting doctors/medical professionals. Never diagnose or prescribe.
- Advise immediate emergency care (calling SOS or ambulance) for life-threatening symptoms.
- Keep answers compact (1-3 sentences) because the chat area is small.`;

const askGroqHome = async (userMessage: string, history: { role: string; content: string }[]): Promise<string> => {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: HOME_SYSTEM_PROMPT },
          ...history,
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 150,
        top_p: 0.95,
      }),
    });

    if (!res.ok) {
      throw new Error(`API status ${res.status}`);
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? "I couldn't process that.";
  } catch (error) {
    console.error("Groq API error:", error);
    return "I'm sorry, I'm having trouble connecting to my brain right now. I can help you with hospital searches, online OPD bookings, emergency SOS assistance, or health records management.";
  }
};

function FAQSection() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [openFaqId, setOpenFaqId] = useState<string | null>("faq-sos");
  const [aiInput, setAiInput] = useState("");

  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "bot"; text: string }>>([
    { sender: "bot", text: "Hello! I am Sanjeevani AI. How can I help you today?" }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, isTyping]);

  const getBotResponse = (question: string): string => {
    const q = question.toLowerCase();
    if (q.includes("opd") || q.includes("book")) {
      return "To book an OPD token, select the 'Book OPD' tab. Choose your hospital, select department, and pick a time slot. You'll get a digital token instantly.";
    }
    if (q.includes("hospital") || q.includes("nearby") || q.includes("find")) {
      return "You can use our live 'Find Hospital' map feature to search for hospitals in your area. You can view distance, bed availability, and specialty options.";
    }
    if (q.includes("vault") || q.includes("report") || q.includes("upload") || q.includes("medical")) {
      return "You can upload medical records in your secure Health Vault. All files are encrypted with AES-256 keys, completely ABDM compliant.";
    }
    if (q.includes("sos") || q.includes("emergency") || q.includes("ambulance")) {
      return "The emergency SOS auto-detects location and alerts the nearest hospital network, dispatching an ambulance with 4 minutes average response time.";
    }
    if (q.includes("track")) {
      return "Ambulance tracking is live. Once an SOS request is initiated, a tracking panel appears on your screen and we send real-time SMS updates.";
    }
    if (q.includes("family") || q.includes("member")) {
      return "You can register up to 4 family members under one dashboard account. Go to profile settings to add sub-profiles and manage their reports.";
    }
    return "I am trained on Sanjeevani services. I can help with hospital search, OPD booking, emergency SOS, or health records management.";
  };

  const handleChatSubmit = (text: string) => {
    if (!text.trim()) return;
    setChatMessages((prev) => [...prev, { sender: "user", text }]);
    setIsTyping(true);

    const apiHistory = chatMessages.map((m) => ({
      role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
      content: m.text
    }));

    askGroqHome(text, apiHistory).then((reply) => {
      setChatMessages((prev) => [...prev, { sender: "bot", text: reply }]);
      setIsTyping(false);
    }).catch(() => {
      const fallback = getBotResponse(text);
      setChatMessages((prev) => [...prev, { sender: "bot", text: fallback }]);
      setIsTyping(false);
    });
  };

  const tabs = [
    { id: "all", label: "All Topics", icon: HelpCircle },
    { id: "emergency", label: "Emergency", icon: Siren },
    { id: "appointments", label: "Appointments", icon: Calendar },
    { id: "vault", label: "Health Vault", icon: ShieldCheck },
    { id: "hospitals", label: "Hospitals", icon: Building },
    { id: "payments", label: "Payments", icon: CreditCard }
  ];

  const faqs = [
    {
      id: "faq-sos",
      category: "emergency",
      q: "How does the Emergency SOS button work?",
      a: "Tap the SOS button to instantly alert our system. We will connect you to the nearest hospital, ambulance service, and notify your emergency contacts.",
      customIcon: (
        <div className="h-7 w-7 rounded-full bg-red-50 text-red-500 border border-red-100 flex items-center justify-center text-[9px] font-black shrink-0 shadow-xs">
          SOS
        </div>
      )
    },
    {
      id: "faq-vault",
      category: "vault",
      q: "Is my personal medical data safe in the Health Vault?",
      a: "Absolutely. All information uploaded to the Health Vault is encrypted using bank-grade AES-256 keys. We strictly follow the Ayushman Bharat Digital Mission (ABDM) standards. Only doctors or hospitals you explicitly approve can temporarily view your files via consent PINs.",
      customIcon: (
        <div className="h-7 w-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-xs">
          <ShieldCheck className="h-4 w-4" />
        </div>
      )
    },
    {
      id: "faq-fees",
      category: "appointments",
      q: "Are there any registration or booking fees for using Sanjeevani?",
      a: "Sanjeevani does not charge patients any extra registration fees for booking OPD tokens or searching hospitals. You only pay the standard hospital consultation or medicine charges, often at a discount when booked through our network.",
      customIcon: (
        <div className="h-7 w-7 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 shadow-xs">
          <FileText className="h-4 w-4" />
        </div>
      )
    },
    {
      id: "faq-beds",
      category: "hospitals",
      q: "How does the live bed tracker get updated?",
      a: "Our platform connects directly via APIs with the Hospital Information Systems (HIS) of partner networks. Bed checkouts, general ward admissions, and ICU releases are synced automatically to ensure maximum accuracy.",
      customIcon: (
        <div className="h-7 w-7 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100 shadow-xs">
          <BedDouble className="h-4 w-4" />
        </div>
      )
    },
    {
      id: "faq-family",
      category: "vault",
      q: "Can I manage medical records for my family members?",
      a: "Yes. Within your Dashboard, you can create up to 4 sub-profiles for your family members. You can book their appointments, track their medications, and upload their lab results under one unified account.",
      customIcon: (
        <div className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 shadow-xs">
          <Users className="h-4 w-4" />
        </div>
      )
    },
    {
      id: "faq-pay",
      category: "payments",
      q: "What payment modes are supported for medicine orders?",
      a: "We support UPI (GPay, PhonePe, Paytm), Credit & Debit cards, Netbanking, and Cash on Delivery (COD) for all medicine deliveries.",
      customIcon: (
        <div className="h-7 w-7 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100 shadow-xs">
          <CreditCard className="h-4 w-4" />
        </div>
      )
    }
  ];

  const filteredFaqs = activeTab === "all" ? faqs : faqs.filter(f => f.category === activeTab);

  const triggerGlobalChat = (message: string) => {
    const event = new CustomEvent("open-rishi-chat", {
      detail: { message }
    });
    window.dispatchEvent(event);
  };

  const handleSendAISearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;
    handleChatSubmit(aiInput);
    setAiInput("");
  };

  const popularQuestions = [
    "How to book OPD?",
    "Find nearby hospitals",
    "Upload medical reports",
    "How SOS works?",
    "Track ambulance",
    "Manage family health"
  ];

  return (
    <section className="bg-[#f9fbf9] py-24 border-t border-border overflow-hidden relative">
      {/* Background Mandala & Leaf watermarks */}
      <div className="absolute left-[-8%] top-[8%] opacity-[0.03] text-emerald-800 pointer-events-none select-none">
        <svg viewBox="0 0 100 100" className="w-[500px] h-[500px]" fill="none" stroke="currentColor" strokeWidth="0.8">
          <path d="M50,15 C55,30 55,60 50,85 C45,60 45,30 50,15 Z" />
          <path d="M50,25 C32,35 25,60 50,80 C27,65 35,40 50,25 Z" />
          <path d="M50,25 C68,35 75,60 50,80 C73,65 65,40 50,25 Z" />
          <path d="M50,40 C15,45 20,70 50,85 C18,70 30,50 50,40 Z" />
          <path d="M50,40 C85,45 80,70 50,85 C82,70 70,50 50,40 Z" />
          <path d="M50,80 C35,88 20,80 15,75 C25,70 45,72 50,80 Z" />
          <path d="M50,80 C65,88 80,80 85,75 C75,70 55,72 50,80 Z" />
        </svg>
      </div>
      
      <div className="absolute right-[-8%] bottom-[-8%] opacity-[0.04] text-emerald-800 pointer-events-none select-none">
        <svg viewBox="0 0 100 100" className="w-[400px] h-[400px]" fill="none" stroke="currentColor" strokeWidth="0.8">
          <path d="M10,90 Q50,50 90,10 M90,10 Q60,40 50,70 T10,90 M90,10 Q40,60 10,90" />
          <path d="M50,50 Q30,40 20,45" />
          <path d="M60,40 Q45,25 35,30" />
          <path d="M70,30 Q60,15 50,20" />
        </svg>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* TOP ROW: Title Section (4 cols) & Metrics row (8 cols) */}
        <div className="grid grid-cols-12 gap-8 items-center border-b border-slate-200/50 pb-8">
          
          {/* Left Title details */}
          <div className="col-span-12 lg:col-span-4 space-y-3 text-center lg:text-left">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#12a14b]">Help & Support</span>
            <h2 className="font-display text-4xl font-black text-[#0f3422] leading-tight">
              We're Here to Help You
            </h2>
            
            {/* Elegant gold flower ornament */}
            <div className="flex items-center gap-1 text-amber-500/80 justify-center lg:justify-start py-0.5">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4.5 w-4.5">
                <path d="M12,2 C12,2 14.5,7 18,9 C14.5,11 12,16 12,16 C12,16 9.5,11 6,9 C9.5,7 12,2 12,2 Z" />
              </svg>
            </div>
            
            <p className="text-xs text-slate-500/90 font-medium leading-relaxed max-w-sm">
              Find quick answers to common questions about Sanjeevani and our healthcare services.
            </p>
          </div>
          
          {/* Right side Metrics row */}
          <div className="col-span-12 lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            
            {/* Card 1 */}
            <div className="bg-white border border-slate-100/90 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition duration-300">
              <div className="flex flex-col space-y-2">
                <div className="h-9 w-9 rounded-xl border border-emerald-500/10 bg-emerald-500/5 text-emerald-600 flex items-center justify-center">
                  <Building className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="text-xl font-extrabold text-slate-900 tracking-tight">12,400+</div>
                  <div className="text-[9px] font-bold text-emerald-700/90 tracking-wide mt-0.5">Hospitals Connected</div>
                  <div className="text-[8px] font-bold text-slate-400 mt-0.5">Across India</div>
                </div>
              </div>
              <svg className="w-full h-5 mt-3 text-emerald-500/40" viewBox="0 0 100 20" preserveAspectRatio="none">
                <path d="M0,15 Q15,5 30,12 T60,5 T90,15 T100,10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>

            {/* Card 2 */}
            <div className="bg-white border border-slate-100/90 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition duration-300">
              <div className="flex flex-col space-y-2">
                <div className="h-9 w-9 rounded-xl border border-emerald-500/10 bg-emerald-500/5 text-emerald-600 flex items-center justify-center">
                  <Zap className="h-4.5 w-4.5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-xl font-extrabold text-slate-900 tracking-tight">4 Min</div>
                  <div className="text-[9px] font-bold text-emerald-700/90 tracking-wide mt-0.5">Avg Emergency Response</div>
                  <div className="text-[8px] font-bold text-slate-400 mt-0.5">AI Powered Assistance</div>
                </div>
              </div>
              <svg className="w-full h-5 mt-3 text-emerald-500/40" viewBox="0 0 100 20" preserveAspectRatio="none">
                <path d="M0,12 Q10,18 20,8 T50,15 T75,5 T100,14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>

            {/* Card 3 */}
            <div className="bg-white border border-slate-100/90 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition duration-300">
              <div className="flex flex-col space-y-2">
                <div className="h-9 w-9 rounded-xl border border-emerald-500/10 bg-emerald-500/5 text-emerald-600 flex items-center justify-center">
                  <Calendar className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="text-xl font-extrabold text-slate-900 tracking-tight">50,000+</div>
                  <div className="text-[9px] font-bold text-emerald-700/90 tracking-wide mt-0.5">OPD Bookings Monthly</div>
                  <div className="text-[8px] font-bold text-slate-400 mt-0.5">Trusted by Thousands</div>
                </div>
              </div>
              <svg className="w-full h-5 mt-3 text-emerald-500/40" viewBox="0 0 100 20" preserveAspectRatio="none">
                <path d="M0,16 Q20,6 40,12 T70,8 T90,16 T100,12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>

            {/* Card 4 */}
            <div className="bg-white border border-slate-100/90 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition duration-300">
              <div className="flex flex-col space-y-2">
                <div className="h-9 w-9 rounded-xl border border-emerald-500/10 bg-emerald-500/5 text-emerald-600 flex items-center justify-center">
                  <Shield className="h-4.5 w-4.5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-xl font-extrabold text-slate-900 tracking-tight">100%</div>
                  <div className="text-[9px] font-bold text-emerald-700/90 tracking-wide mt-0.5">Secure & Encrypted</div>
                  <div className="text-[8px] font-bold text-slate-400 mt-0.5">Your Data Is Always Safe</div>
                </div>
              </div>
              <svg className="w-full h-5 mt-3 text-emerald-500/40" viewBox="0 0 100 20" preserveAspectRatio="none">
                <path d="M0,10 Q15,15 30,5 T60,12 T85,8 T100,15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>

          </div>

        </div>

        {/* BOTTOM ROW: Left Brand Column (3 cols) & FAQ/Chatbot Right Column (9 cols) */}
        <div className="grid grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Logo & Philosophy */}
          <div className="col-span-12 lg:col-span-3 flex flex-col items-center text-center pt-4 select-none">
            {/* Sanjeevani Brand Logo */}
            <div className="relative mb-6 select-none flex justify-center">
              <img 
                src={logoImg} 
                alt="Sanjeevani Logo" 
                className="w-36 h-36 object-contain drop-shadow-[0_8px_24px_rgba(34,197,94,0.06)]"
              />
            </div>
            
            <div className="space-y-4 w-full">
              <div className="space-y-1 text-sm font-bold text-slate-700 font-display">
                <p className="hover:text-emerald-700 transition duration-200">Ayurveda.</p>
                <p className="hover:text-emerald-700 transition duration-200">Compassion.</p>
                <p className="hover:text-emerald-700 transition duration-200">Technology.</p>
              </div>
              
              {/* Mini gold line ornament */}
              <div className="flex items-center gap-1.5 py-2 justify-center">
                <span className="h-[1px] w-6 bg-amber-500/30" />
                <span className="text-amber-500/80 text-[10px]">◆</span>
                <span className="h-[1px] w-6 bg-amber-500/30" />
              </div>
              
              <div className="text-[11px] text-[#12a14b] font-bold leading-relaxed tracking-wide space-y-1">
                <p>Care that connects.</p>
                <p>Life that thrives.</p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: FAQ Accordion Side & Ask Sanjeevani AI Side */}
          <div className="col-span-12 lg:col-span-9 grid grid-cols-12 gap-6 items-stretch">
            
            {/* FAQ Accordion Panel (7 cols) */}
            <div className="col-span-12 lg:col-span-7 bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm flex flex-col justify-between">
              
              {/* Horizontal Category selector */}
              <div className="flex gap-4 overflow-x-auto pb-3 border-b border-slate-100 mb-5 scrollbar-none whitespace-nowrap">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-1 pb-2.5 text-xs font-bold transition cursor-pointer border-b-2 ${
                        active
                          ? "border-[#12a14b] text-[#12a14b]"
                          : "border-transparent text-slate-400 hover:text-slate-700"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* FAQ List */}
              <div className="space-y-3 flex-1 min-h-[300px]">
                {filteredFaqs.map((faq) => {
                  const isOpen = openFaqId === faq.id;
                  return (
                    <div 
                      key={faq.id} 
                      className={`rounded-2xl border transition duration-200 overflow-hidden ${
                        isOpen 
                          ? "border-[#e2f0e6] bg-[#fcfdfd]" 
                          : "border-slate-100 hover:border-[#e2f0e6]"
                      }`}
                    >
                      <button
                        onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                        className="flex w-full items-center justify-between p-4 text-left font-display text-xs font-bold text-slate-800 hover:text-[#12a14b] transition"
                      >
                        <div className="flex items-center gap-3">
                          {faq.customIcon}
                          <span className="text-[#0f3422]">{faq.q}</span>
                        </div>
                        
                        {/* Circular arrow badge */}
                        <div className="h-7 w-7 rounded-full border border-slate-200/80 flex items-center justify-center hover:bg-slate-50 transition shrink-0">
                          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180 text-[#12a14b]" : ""}`} />
                        </div>
                      </button>
                      
                      <div
                        className={`transition-all duration-300 ease-in-out ${
                          isOpen ? "max-h-[200px] border-t border-[#eaf6ee]/40 opacity-100" : "max-h-0 opacity-0 overflow-hidden"
                        }`}
                      >
                        <div className="p-4 text-[11px] leading-relaxed text-slate-500 bg-[#fafbfa]">
                          {faq.a}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Load more button */}
              <div className="mt-5 pt-4 border-t border-slate-100 text-center">
                <button className="mx-auto flex items-center gap-1.5 px-4 py-2 border border-slate-200/80 hover:border-emerald-500 rounded-full text-xs font-bold text-slate-600 hover:text-[#12a14b] transition duration-200 cursor-pointer shadow-sm">
                  <span>Load More Questions</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

            </div>

            {/* Ask Sanjeevani AI Side (5 cols) */}
            <div className="col-span-12 lg:col-span-5 bg-white rounded-3xl border-2 border-emerald-500/20 p-6 shadow-sm flex flex-col justify-between h-[450px] relative">
              
              {/* Cute peaking robot avatar portal */}
              <div className="absolute -top-3.5 -right-3.5 h-12 w-12 rounded-full bg-gradient-to-br from-[#0c3924] to-[#042818] border-2 border-white overflow-hidden shadow-md flex items-center justify-center z-20 select-none pointer-events-none">
                <img 
                  src={sanjeevaniAiBot} 
                  alt="Sanjeevani AI Mascot" 
                  className="w-9 h-9 object-contain translate-y-0.5" 
                />
              </div>

              {/* Header */}
              <div className="relative z-10 flex flex-col space-y-1 pr-10">
                <span className="inline-flex items-center gap-1 self-start bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase text-[#12a14b] tracking-wider">
                  ✨ AI Assistant
                </span>
                <h3 className="font-display text-sm font-extrabold text-[#0f3422]">
                  Ask Sanjeevani AI
                </h3>
              </div>

              {/* Chat messages */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto my-3 p-3 bg-slate-50/70 border border-slate-100 rounded-2xl space-y-2 min-h-[140px] max-h-[180px] scrollbar-none flex flex-col">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-[10px] font-semibold leading-relaxed ${
                      msg.sender === "user"
                        ? "self-end bg-[#12a14b] text-white rounded-tr-none"
                        : "self-start bg-white text-slate-700 border border-slate-100 rounded-tl-none shadow-xs"
                    }`}
                  >
                    {msg.text}
                  </div>
                ))}
                {isTyping && (
                  <div className="self-start bg-white text-slate-400 border border-slate-100 rounded-2xl rounded-tl-none px-3 py-1.5 text-[10px] italic shadow-xs flex items-center gap-1">
                    <span className="flex gap-0.5 items-center">
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </span>
                    typing...
                  </div>
                )}
              </div>

              {/* Input text box */}
              <form onSubmit={handleSendAISearch} className="relative z-10">
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="Type your question here..."
                  className="w-full bg-slate-50 text-slate-800 placeholder:text-slate-400 px-4 py-2.5 rounded-full text-xs outline-none pr-10 border border-slate-200/80 focus:border-emerald-500 transition font-semibold"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1 h-8 w-8 rounded-full bg-[#12a14b] hover:bg-emerald-700 text-white transition flex items-center justify-center cursor-pointer shadow-sm"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </form>

              {/* Popular chips */}
              <div className="mt-3.5 relative z-10">
                <div className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">
                  Popular Questions
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  {popularQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleChatSubmit(q)}
                      className="bg-slate-50 hover:bg-emerald-50 hover:text-[#12a14b] text-slate-600 rounded-xl px-2 py-1.5 text-[9px] font-bold text-center border border-slate-200/70 transition duration-150 cursor-pointer truncate"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* BOTTOM EMERGENCY SOS BANNER: Full 12-column width */}
        <div className="bg-[#fff1f2] border border-red-200 rounded-3xl p-6 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-6 w-full col-span-12 mt-6">
          
          {/* Left flashing alarm beacon */}
          <div className="flex items-center gap-4 w-full lg:w-auto">
            {/* Animated 3D-like Siren Beacon */}
            <div className="relative h-20 w-20 flex items-center justify-center shrink-0">
              <div className="absolute inset-0 rounded-full bg-red-500/10 animate-pulse-ring" />
              <svg viewBox="0 0 100 100" className="h-16 w-16 relative z-10">
                <ellipse cx="50" cy="80" rx="35" ry="10" fill="#1e293b" />
                <path d="M15,80 Q50,75 85,80 L80,90 Q50,85 20,90 Z" fill="#0f172a" />
                <rect x="35" y="70" width="30" height="10" rx="2" fill="url(#metalGrad)" />
                <path d="M25,70 C25,35 75,35 75,70 Z" fill="url(#redGlass)" opacity="0.85" className="animate-pulse" />
                <ellipse cx="50" cy="55" rx="8" ry="15" fill="#fca5a5" />
                <ellipse cx="50" cy="55" rx="4" ry="8" fill="#ffffff" />
                <path d="M50,55 L20,30 L30,20 Z" fill="url(#lightBeam)" opacity="0.3" className="animate-spin-slow origin-center" />
                <defs>
                  <linearGradient id="metalGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#475569" />
                    <stop offset="50%" stopColor="#94a3b8" />
                    <stop offset="100%" stopColor="#475569" />
                  </linearGradient>
                  <linearGradient id="redGlass" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#991b1b" />
                  </linearGradient>
                  <linearGradient id="lightBeam" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            
            <div className="space-y-0.5">
              <h4 className="text-xs font-black text-red-955 uppercase tracking-wide">Need Immediate Help?</h4>
              <p className="text-[11px] text-red-900/80 font-bold">We're available 24x7 for you.</p>
            </div>
            
            <Link
              to="/emergency"
              className="ml-auto lg:ml-4 bg-[#e11d48] hover:bg-[#be123c] text-white text-xs font-black px-5 py-3 rounded-full shadow-md flex items-center gap-2 transition duration-200 hover:scale-[1.02] cursor-pointer"
            >
              <Siren className="h-3.5 w-3.5" /> Press SOS Now
            </Link>
          </div>
          
          {/* Vertical divider */}
          <div className="hidden lg:block h-12 w-px bg-red-200/50" />
          
          {/* Middle features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full lg:w-auto flex-1 px-2">
            {/* Feature 1 */}
            <div className="flex items-start gap-2.5">
              <div className="h-10 w-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-red-600 shrink-0">
                <MapPin className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="text-[10px] font-black text-slate-800">Nearest Hospitals</div>
                <div className="text-[9px] text-slate-500 mt-0.5 font-bold">Get directions to nearby hospitals</div>
              </div>
            </div>
            
            {/* Feature 2 */}
            <div className="flex items-start gap-2.5">
              <div className="h-10 w-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-red-600 shrink-0">
                <Siren className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="text-[10px] font-black text-slate-800">Ambulance Support</div>
                <div className="text-[9px] text-slate-500 mt-0.5 font-bold">One tap connect to ambulance</div>
              </div>
            </div>
            
            {/* Feature 3 */}
            <div className="flex items-start gap-2.5">
              <div className="h-10 w-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-red-600 shrink-0">
                <Users className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="text-[10px] font-black text-slate-800">Notify Contacts</div>
                <div className="text-[9px] text-slate-500 mt-0.5 font-bold">Instantly alert your saved contacts</div>
              </div>
            </div>
          </div>
          
          {/* Vertical divider */}
          <div className="hidden lg:block h-12 w-px bg-red-200/50" />
          
          {/* Right Secure Badge */}
          <div className="bg-[#eaf7f0] border border-emerald-100 rounded-2xl p-3 flex items-center gap-2.5 w-full lg:w-auto lg:max-w-[200px]">
            <div className="h-10 w-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-black text-emerald-800">100% Safe & Secure</div>
              <div className="text-[8px] text-slate-500 font-bold mt-0.5 leading-tight">Your safety is our top priority</div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

function HomePage() {
  useScrollReveal();
  const featured = hospitals.slice(0, 4);
  const [hospitalImgErrors, setHospitalImgErrors] = useState<Record<string, boolean>>({});
  const [testimonialImgErrors, setTestimonialImgErrors] = useState<Record<string, boolean>>({});
  const [docImgError, setDocImgError] = useState(false);

  return (
    <div>
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center bg-[#05110e] py-20 noise">
        {/* Professional Clinical Cyber-Grid & Aurora System */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          {/* Solid deep medical forest base */}
          <div className="absolute inset-0 bg-[#040e0c]" />
          
          {/* Sophisticated fine mesh tech-grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
          
          {/* Concentric radial overlay to soften grid edges */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,transparent_10%,rgba(4,14,12,0.9)_85%)]" />

          {/* Floating Aurora Blob 1 - Medical Teal */}
          <div className="absolute top-[-10%] left-[-5%] w-[45rem] h-[45rem] rounded-full bg-teal/15 blur-[120px] animate-blob" style={{ animationDuration: "16s" }} />

          {/* Floating Aurora Blob 2 - Vital Emerald */}
          <div className="absolute bottom-[-10%] right-[-5%] w-[48rem] h-[48rem] rounded-full bg-emerald-500/10 blur-[150px] animate-blob" style={{ animationDuration: "22s", animationDelay: "3s" }} />

          {/* Floating Aurora Blob 3 - Depth Indigo */}
          <div className="absolute top-[20%] right-[15%] w-[35rem] h-[35rem] rounded-full bg-indigo-950/30 blur-[140px] animate-blob" style={{ animationDuration: "19s", animationDelay: "5s" }} />
          
          {/* Animated ECG Heart Wave */}
          <HeartSignalBackground className="absolute inset-0 h-full w-full opacity-35 mix-blend-screen" />
          
          {/* Micro pulsing server nodes */}
          <div className="absolute top-[28%] left-[45%] h-1 w-1 rounded-full bg-teal shadow-[0_0_10px_5px_rgba(13,242,217,0.4)] animate-pulse" />
          <div className="absolute top-[68%] left-[18%] h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_5px_rgba(52,211,153,0.3)] animate-pulse" style={{ animationDelay: "1.2s" }} />
          <div className="absolute top-[48%] right-[32%] h-1 w-1 rounded-full bg-teal shadow-[0_0_10px_5px_rgba(13,242,217,0.4)] animate-pulse" style={{ animationDelay: "2.4s" }} />
          <div className="absolute top-[35%] right-[48%] h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_5px_rgba(52,211,153,0.3)] animate-pulse" style={{ animationDelay: "1.7s" }} />

          {/* Ambient Glows to lift text & console blocks out of the page */}
          <div className="absolute left-[20%] top-[45%] -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-teal/8 rounded-full blur-[90px]" />
          <div className="absolute right-[25%] top-[50%] -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] bg-emerald-500/6 rounded-full blur-[110px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 z-10 w-full">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left: Headline & Search */}
            <div className="text-white space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold backdrop-blur-md animate-fade-up">
                <Sparkles className="h-3.5 w-3.5 text-teal animate-spin" /> India's first unified hospital network
              </span>
              <h1 className="font-display text-4xl font-extrabold leading-[1.1] sm:text-5xl lg:text-6xl xl:text-7xl animate-fade-up delay-100">
                Healthcare in India,{" "}
                <span className="bg-gradient-to-r from-teal via-emerald-300 to-white bg-clip-text text-transparent">finally connected.</span>
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-white/80 sm:text-lg animate-fade-up delay-200">
                Search any hospital. Book OPD. See live bed availability. Order medicines. Carry your records for life. One emergency tap — and help is on its way.
              </p>

              {/* Search bar */}
              <div className="rounded-2xl bg-white/95 p-2 shadow-glow backdrop-blur animate-fade-up delay-300">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex flex-1 items-center gap-2 rounded-xl px-4">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <input placeholder="Search doctors, specialties, hospitals…" className="w-full bg-transparent py-3.5 text-sm text-navy outline-none placeholder:text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border-l border-border px-4 sm:border-l">
                    <MapPin className="h-4 w-4 text-teal" />
                    <input placeholder="City" defaultValue="Mumbai" className="w-32 bg-transparent py-3.5 text-sm text-navy outline-none" />
                  </div>
                  <Link to="/hospitals" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-teal px-7 py-3.5 text-sm font-bold text-white shadow-glow-teal transition hover:opacity-95 cursor-pointer">
                    Search <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2 animate-fade-up delay-400">
                {[
                  { to: "/book", label: "Book Appointment", icon: Calendar },
                  { to: "/hospitals", label: "Find Hospital", icon: MapPin },
                  { to: "/pharmacy", label: "Order Medicines", icon: Pill },
                  { to: "/emergency", label: "Emergency SOS", icon: Siren, danger: true },
                ].map((a) => (
                  <Link key={a.to} to={a.to} className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold backdrop-blur-md transition cursor-pointer ${a.danger ? "bg-destructive text-white hover:bg-destructive/90 shadow-glow" : "bg-white/12 text-white border border-white/15 hover:bg-white/20"}`}>
                    <a.icon className="h-3.5 w-3.5" /> {a.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right Side: Fully coded interactive Control Console */}
            <div className="hidden lg:block lg:ml-12 relative select-none animate-scale-in delay-200">
              <HeroConsole />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats strip ─── */}
      <section className="relative z-10 -mt-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border/50 shadow-lg-custom md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="glass-card flex items-center gap-3 px-6 py-7 reveal">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-teal text-white shadow-glow-teal">
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-display text-2xl font-extrabold text-navy sm:text-3xl">{s.value}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Partner Logos Marquee ─── */}
      <LogoMarquee />

      {/* ─── What We Do Section ─── */}
      <WhatWeDoSection />

      {/* ─── How It Works timeline ─── */}
      <HowItWorks />

      {/* ─── Features ─── */}
      <section className="bg-background py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center reveal">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-teal">Why Sanjeevani</p>
            <h2 className="mt-4 font-display text-3xl font-extrabold text-navy sm:text-4xl lg:text-5xl leading-tight">
              Built for every Indian patient & every Indian hospital
            </h2>
            <p className="mt-5 text-sm text-muted-foreground leading-relaxed">A single, vendor-neutral platform — not tied to one chain. Discover, book, track and respond, all in one place.</p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div key={f.title} className="reveal group rounded-2xl border border-border bg-card p-7 shadow-card transition duration-300 hover:-translate-y-1.5 hover:shadow-glow" style={{ transitionDelay: `${i * 80}ms` }}>
                <div className={`grid h-12 w-12 place-items-center rounded-xl ${f.gradient} text-white shadow-md`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-display text-lg font-bold text-navy">{f.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
                <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-teal opacity-0 transition-opacity group-hover:opacity-100">
                  Learn more <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Nearby Hospitals Map (Only Satellite View now) ─── */}
      <section className="bg-slate-50/50 py-24 border-t border-border overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center md:text-left mb-12 max-w-3xl reveal-left">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#0d9488]">Live Geospatial Routing</span>
            <h2 className="mt-4 font-display text-3xl font-extrabold text-navy sm:text-4xl lg:text-5xl leading-tight">
              Hospitals Near You
            </h2>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              Our automated system locks onto your current coordinates to cross-reference surrounding facilities. Monitor real-time ventilator and ward bed capacities, view specialization indexes, and initiate point-to-point ambulance or routing navigation.
            </p>
          </div>
          
          <div className="reveal-right mt-8">
            <HospitalMap />
          </div>
        </div>
      </section>

      {/* ─── Doctor split ─── */}
      <section className="bg-background py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
          <div className="relative reveal-left">
            {docImgError ? (
              <div className="rounded-3xl h-[450px] bg-gradient-to-br from-teal-800 to-navy flex flex-col items-center justify-center text-white/40 shadow-lg-custom">
                <Building className="h-16 w-16 animate-pulse" />
                <span className="mt-2 text-xs font-bold uppercase tracking-wider text-white/30">Doctor Consultations</span>
              </div>
            ) : (
              <img 
                src={doctorImg} 
                alt="Doctor at modern hospital" 
                width={1200} 
                height={1200} 
                loading="lazy" 
                onError={() => setDocImgError(true)}
                className="rounded-3xl object-cover shadow-lg-custom h-[450px] w-full" 
                style={{ contentVisibility: "auto" }}
              />
            )}
            <div className="absolute -bottom-6 -right-4 hidden rounded-2xl bg-card p-5 shadow-glow sm:block animate-float">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-success text-white shadow-glow"><Activity className="h-5 w-5" /></div>
                <div>
                  <div className="text-xs font-bold text-navy">98.6% on-time</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 font-semibold">OPD appointments this month</div>
                </div>
              </div>
            </div>
            <div className="absolute -top-4 -left-4 hidden rounded-2xl bg-card p-4 shadow-glow sm:block animate-float delay-500">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-teal text-white shadow-glow"><Heart className="h-4 w-4" /></div>
                <div>
                  <div className="text-xs font-bold text-navy">4.8★ rated</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 font-semibold">Patient satisfaction</div>
                </div>
              </div>
            </div>
          </div>
          <div className="reveal-right">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-teal">For Patients</p>
            <h2 className="mt-4 font-display text-3xl font-extrabold text-navy sm:text-4xl leading-tight">A dashboard that actually remembers your health.</h2>
            <p className="mt-5 text-sm text-muted-foreground leading-relaxed">From the first OPD visit to lifelong follow-ups — prescriptions, lab reports, scans and discharge summaries are saved automatically to your private vault. Share with any doctor in one tap.</p>
            <ul className="mt-7 space-y-3.5 text-xs text-foreground font-semibold">
              {["Auto-imported prescriptions from every visit", "Lab reports linked from in-network labs", "Family member sub-profiles", "Encrypted, exportable anytime"].map((t) => (
                <li key={t} className="flex items-start gap-3"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-teal text-white"><ShieldCheck className="h-3 w-3" /></span>{t}</li>
              ))}
            </ul>
            <div className="mt-8 flex gap-3">
              <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-gradient-teal px-5 py-3 text-xs font-bold text-white shadow-glow-teal hover:opacity-95 transition cursor-pointer">Open my dashboard <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/hospitals" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-xs font-bold text-navy hover:bg-accent transition cursor-pointer">Browse hospitals</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pharmacy CTA ─── */}
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gradient-emerald p-10 text-white shadow-lg-custom sm:p-14 reveal relative">
          <div className="absolute inset-0 bg-grid-white/[0.03] bg-[size:20px_20px]" />
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between relative z-10">
            <div className="max-w-xl">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 backdrop-blur"><Pill className="h-6 w-6" /></div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/80">New Feature</p>
              </div>
              <h2 className="mt-5 font-display text-3xl font-extrabold sm:text-4xl leading-tight">Sanjeevani Pharmacy is live.</h2>
              <p className="mt-4 text-sm text-white/85 leading-relaxed">Order from 50+ genuine medicines at up to 30% off MRP. Free delivery on orders above ₹499. Doorstep delivery across India.</p>
            </div>
            <Link to="/pharmacy" className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-4 text-xs font-bold text-emerald-800 shadow-lg transition hover:bg-muted self-start cursor-pointer">
              <Pill className="h-4 w-4 text-emerald-600" /> Browse Pharmacy <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Featured hospitals ─── */}
      <section className="bg-background py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4 reveal">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-teal">Featured Hospitals</p>
              <h2 className="mt-4 font-display text-3xl font-extrabold text-navy sm:text-4xl leading-tight">Top-rated near you</h2>
            </div>
            <Link to="/hospitals" className="inline-flex items-center gap-1 text-xs font-bold text-navy hover:text-teal transition cursor-pointer">View all <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((h, i) => (
              <Link key={h.id} to="/hospitals/$id" params={{ id: h.id }} className="reveal group overflow-hidden rounded-2xl border border-border bg-card shadow-card transition duration-300 hover:-translate-y-1.5 hover:shadow-glow cursor-pointer" style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="aspect-[4/3] overflow-hidden bg-muted relative">
                  {hospitalImgErrors[h.id] ? (
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-800 to-navy flex flex-col items-center justify-center text-white/40">
                      <Building className="h-10 w-10 animate-pulse" />
                    </div>
                  ) : (
                    <img 
                      src={h.image} 
                      alt={h.name} 
                      loading="lazy" 
                      onError={() => setHospitalImgErrors(prev => ({ ...prev, [h.id]: true }))}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-110" 
                    />
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-teal" /> {h.city}</span>
                    <span className="flex items-center gap-1 text-warning"><Star className="h-3 w-3 fill-warning text-warning" /> {h.rating}</span>
                  </div>
                  <h3 className="mt-2 line-clamp-1 font-display text-sm font-bold text-navy">{h.name}</h3>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {h.specialties.slice(0, 3).map((s) => (
                      <span key={s} className="rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold text-accent-foreground">{s}</span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
                    <span className="flex items-center gap-1 text-success font-semibold"><BedDouble className="h-3.5 w-3.5 text-success" /> {h.beds.available} beds</span>
                    <span className="font-bold text-teal group-hover:text-navy transition">Book →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ Section ─── */}
      <FAQSection />

      {/* ─── Testimonials ─── */}
      <section className="bg-muted/35 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center reveal">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-teal">Testimonials</p>
            <h2 className="mt-4 font-display text-3xl font-extrabold text-navy sm:text-4xl leading-tight">Trusted by lakhs of patients</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <div key={t.id} className="reveal rounded-2xl border border-border bg-card p-7 shadow-card transition hover:shadow-glow" style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="flex gap-0.5 text-warning">{Array.from({ length: t.rating }, (_, j) => <Star key={j} className="h-4 w-4 fill-warning text-warning" />)}</div>
                <p className="mt-4 text-xs leading-relaxed text-foreground font-semibold">"{t.text}"</p>
                <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                  <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden relative bg-teal/5 border border-border">
                    {testimonialImgErrors[t.id] ? (
                      <div className="flex h-full w-full items-center justify-center text-teal text-[10px] font-bold">
                        {t.name[0]}
                      </div>
                    ) : (
                      <img 
                        src={t.avatar} 
                        alt={t.name} 
                        onError={() => setTestimonialImgErrors(prev => ({ ...prev, [t.id]: true }))}
                        className="h-full w-full object-cover" 
                      />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-navy">{t.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{t.city}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
