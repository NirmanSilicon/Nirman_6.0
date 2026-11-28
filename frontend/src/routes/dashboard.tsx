import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
// No mock fallback data imports
import { Calendar, FileText, Pill, FlaskConical, ScanLine, FileCheck, Phone, Mail, MapPin, Activity, Heart, Droplet, TrendingUp, X, Check, UploadCloud } from "lucide-react";
import { fetchProfile, fetchAppointments, fetchActiveAppointment, fetchHospitals, fetchReports, uploadReport } from "@/lib/api";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "My Health Dashboard — Sanjeevani" },
      { name: "description", content: "Your bookings, prescriptions, lab reports and health vitals — all in one place." },
    ],
  }),
  component: Dashboard,
});

const recordIcon = {
  prescription: Pill,
  "lab-report": FlaskConical,
  scan: ScanLine,
  discharge: FileCheck,
} as const;

const statusStyle = {
  confirmed: "bg-success/15 text-success",
  pending: "bg-warning/15 text-warning",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
} as const;

function Dashboard() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [activeAppt, setActiveAppt] = useState<any | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>({ name: "", email: "", phone: "", bloodGroup: "", age: "", city: "", avatar: "https://i.pravatar.cc/200?img=12" });
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [activeVitalTab, setActiveVitalTab] = useState<"hr" | "bp" | "bs" | "bmi">("hr");
  
  // Record Form State
  const [recType, setRecType] = useState<"prescription" | "lab-report" | "scan" | "discharge">("prescription");
  const [recTitle, setRecTitle] = useState("");
  const [recDoctor, setRecDoctor] = useState("");
  const [recHospital, setRecHospital] = useState("");
  const [recDate, setRecDate] = useState("");
  const [recSummary, setRecSummary] = useState("");
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string; type: string; dataUrl: string } | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Lightbox Preview State
  const [previewRecord, setPreviewRecord] = useState<any | null>(null);
  
  // Mock Share State
  const [shareRecord, setShareRecord] = useState<any | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const loadDashboardData = async () => {
    fetchProfile().then((p) => {
      setProfile({
        name: p.name || "",
        email: p.email || "",
        phone: p.phone || "",
        bloodGroup: p.bloodGroup || "",
        age: p.dob ? (new Date().getFullYear() - new Date(p.dob).getFullYear()) : "",
        city: p.address || "",
        avatar: "https://i.pravatar.cc/200?img=12",
      });
    }).catch(console.error);

    const hospitalsList = await fetchHospitals().catch(() => []);
    const hospitalMap = new Map(hospitalsList.map((h) => [h.id, h.name]));

    fetchAppointments().then((data) => {
      const mapped = data.map((b: any) => ({
        id: b.booking_id,
        doctorName: b.doctor_id || "Consultant Doctor",
        hospitalName: hospitalMap.get(b.hospital_id) || b.hospital_id || "Sanjeevani Network Hospital",
        specialty: b.department || "General Medicine",
        date: b.booked_at ? b.booked_at.split("T")[0] : new Date().toISOString().split("T")[0],
        time: b.slot_time || "10:00 AM",
        status: b.status || "confirmed",
        tokenNo: `${b.queue_number || "A-01"}`,
      }));
      setBookings(mapped);
    }).catch(console.error);

    fetchActiveAppointment().then((active) => {
      if (active) {
        setActiveAppt({
          ...active,
          hospitalName: hospitalMap.get(active.hospital_id) || active.hospital_id,
        });
      } else {
        setActiveAppt(null);
      }
    }).catch(console.error);

    fetchReports().then((data) => {
      const mapped = data.map((r: any) => ({
        id: r._id,
        type: r.report_type || "lab-report",
        title: r.title || r.filename || "Clinical Report",
        doctor: r.doctor_name || "AI Clinical Analyzer",
        hospital: r.hospital_name || "Sanjeevani Health Vault",
        date: r.uploaded_at
          ? String(r.uploaded_at).split("T")[0]
          : r.analyzed_at
            ? String(r.analyzed_at).split("T")[0]
            : new Date().toISOString().split("T")[0],
        summary: r.ai_summary || r.summary || r.analysis || r.extracted_text || "Report uploaded and indexed.",
        file: {
          name: r.filename || "report.pdf",
          size: "1.2 MB",
          type: "application/pdf",
          dataUrl: "default_prescription",
        }
      }));
      setRecords(mapped);
    }).catch(console.error);
  };

  // Load from backend and poll active queue every 15s
  useEffect(() => {
    loadDashboardData();
    const timer = setInterval(() => {
      fetchActiveAppointment().then((active) => {
        if (active) {
          setActiveAppt((prev: any) => ({
            ...active,
            hospitalName: prev?.hospitalName || active.hospital_id,
          }));
        }
      }).catch(() => {});
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRawFile(file);
    processFile(file);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedFile({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        type: file.type,
        dataUrl: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setRawFile(e.dataTransfer.files[0]);
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (rawFile) {
      uploadReport(rawFile).then(() => {
        loadDashboardData();
        setRawFile(null);
        setUploadedFile(null);
        setShowAddRecord(false);
      }).catch((err) => {
        alert("Upload failed: " + err.message);
      });
    } else {
      alert("Please upload a medical report or prescription file first.");
    }
  };

  const deleteRecord = (id: string) => {
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    localStorage.setItem("userRecords", JSON.stringify(updated));
    if (previewRecord?.id === id) {
      setPreviewRecord(null);
    }
  };

  const handleMockShare = (r: any) => {
    setShareRecord(r);
    setShareStatus("generating");
    setTimeout(() => {
      const shareUrl = `${window.location.origin}/share/vault_${r.id}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        setShareStatus("copied");
        setTimeout(() => {
          setShareStatus(null);
          setShareRecord(null);
        }, 2500);
      });
    }, 1000);
  };

  // Vitals Trend Graph data pool
  const vitalTrendData = {
    hr: {
      label: "Heart Rate",
      color: "text-rose-500",
      stroke: "oklch(0.60 0.17 12)",
      fill: "oklch(0.60 0.17 12 / 0.10)",
      points: [68, 72, 70, 75, 71, 72],
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      unit: "bpm",
      avg: "71 bpm"
    },
    bp: {
      label: "Blood Pressure (Systolic)",
      color: "text-teal-500",
      stroke: "oklch(0.64 0.14 198)",
      fill: "oklch(0.64 0.14 198 / 0.10)",
      points: [122, 120, 119, 121, 117, 118],
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      unit: "mmHg",
      avg: "119 mmHg"
    },
    bs: {
      label: "Blood Sugar (Fasting)",
      color: "text-emerald-500",
      stroke: "oklch(0.60 0.17 152)",
      fill: "oklch(0.60 0.17 152 / 0.10)",
      points: [98, 96, 92, 95, 93, 94],
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      unit: "mg/dL",
      avg: "94.6 mg/dL"
    },
    bmi: {
      label: "Body Mass Index",
      color: "text-amber-500",
      stroke: "oklch(0.76 0.17 77)",
      fill: "oklch(0.76 0.17 77 / 0.10)",
      points: [24.1, 23.9, 23.8, 23.6, 23.5, 23.4],
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      unit: "",
      avg: "23.7"
    }
  };

  const activeVital = vitalTrendData[activeVitalTab];

  // SVG Chart points calculation helper
  const svgWidth = 500;
  const svgHeight = 120;
  const maxPoint = Math.max(...activeVital.points) * 1.1;
  const minPoint = Math.min(...activeVital.points) * 0.9;
  const range = maxPoint - minPoint;
  
  const chartCoordinates = activeVital.points.map((val, idx) => {
    const x = (idx / (activeVital.points.length - 1)) * (svgWidth - 40) + 20;
    const y = svgHeight - ((val - minPoint) / range) * (svgHeight - 30) - 15;
    return { x, y, value: val };
  });

  const linePath = chartCoordinates.reduce((acc, coord, idx) => {
    return acc + `${idx === 0 ? "M" : "L"} ${coord.x} ${coord.y}`;
  }, "");

  const areaPath = linePath + ` L ${chartCoordinates[chartCoordinates.length - 1].x} ${svgHeight} L ${chartCoordinates[0].x} ${svgHeight} Z`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Profile header */}
      <div className="overflow-hidden rounded-3xl bg-gradient-hero shadow-glow relative">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
        <div className="relative z-10 flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
          <img src={profile.avatar} alt="" className="h-20 w-20 rounded-full border-4 border-white/20 object-cover shadow-md" />
          <div className="flex-1 text-white">
            <p className="text-xs uppercase tracking-widest text-white/70 font-semibold">Verified Patient Account</p>
            <h1 className="font-display text-2xl font-extrabold sm:text-3xl mt-0.5">{profile.name}</h1>
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-white/80 font-medium">
              <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-teal" /> {profile.email}</span>
              <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-teal" /> {profile.phone}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-teal" /> {profile.city}</span>
              <span className="flex items-center gap-1"><Droplet className="h-3.5 w-3.5 text-teal animate-pulse" /> Blood Group: {profile.bloodGroup}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2.5 text-center shrink-0">
            {[
              { v: bookings.length, l: "Bookings" },
              { v: records.length, l: "Vault Files" },
              { v: 3, l: "Hospitals" },
            ].map((s) => (
              <div key={s.l} className="rounded-xl bg-white/10 px-4 py-3 text-white backdrop-blur-md border border-white/10">
                <div className="font-display text-2xl font-extrabold tracking-tight">{s.v}</div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-white/70 mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Vitals Cards + Live Chart Panel */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Vitals Stats Selection */}
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { id: "hr", icon: Heart, label: "Heart Rate", value: "72", unit: "bpm", color: "destructive" as const, activeClass: "border-rose-500 bg-rose-50/20 ring-2 ring-rose-500/20" },
            { id: "bp", icon: Activity, label: "Blood Pressure", value: "118/76", unit: "mmHg", color: "teal" as const, activeClass: "border-teal bg-teal/5 ring-2 ring-teal/20" },
            { id: "bs", icon: Droplet, label: "Blood Sugar", value: "94", unit: "mg/dL", color: "success" as const, activeClass: "border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/20" },
            { id: "bmi", icon: TrendingUp, label: "BMI Ratio", value: "23.4", unit: "normal", color: "warning" as const, activeClass: "border-amber-500 bg-amber-50/20 ring-2 ring-amber-500/20" },
          ].map((v) => {
            const isActive = activeVitalTab === v.id;
            return (
              <button 
                key={v.id}
                onClick={() => setActiveVitalTab(v.id as any)}
                className={`rounded-2xl border p-5 text-left transition duration-300 shadow-card hover:shadow-glow cursor-pointer ${isActive ? v.activeClass : "border-border bg-card"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{v.label}</span>
                  <span className={`grid h-8 w-8 place-items-center rounded-lg bg-${v.color}/10 text-${v.color}`}><v.icon className="h-4.5 w-4.5" /></span>
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-2.5xl font-extrabold text-navy">{v.value}</span>
                  <span className="text-xs font-semibold text-muted-foreground">{v.unit}</span>
                </div>
                <div className="mt-2 text-[10px] font-bold text-teal flex items-center gap-1">
                  View Trends <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Dynamic Vitals Line Graph */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <div>
              <h3 className="font-display text-base font-bold text-navy flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full bg-teal animate-pulse`} />
                Health Vitals Analytics
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Showing monthly variation for {activeVital.label}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">6-Month Average</span>
              <span className="text-sm font-bold text-navy">{activeVital.avg}</span>
            </div>
          </div>

          <div className="py-4 flex items-center justify-center">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={activeVital.stroke} stopOpacity="0.25"/>
                  <stop offset="100%" stopColor={activeVital.stroke} stopOpacity="0.00"/>
                </linearGradient>
              </defs>
              
              {/* Horizontal Grid lines */}
              <line x1="10" y1={svgHeight * 0.25} x2={svgWidth - 10} y2={svgHeight * 0.25} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4,4" />
              <line x1="10" y1={svgHeight * 0.5} x2={svgWidth - 10} y2={svgHeight * 0.5} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4,4" />
              <line x1="10" y1={svgHeight * 0.75} x2={svgWidth - 10} y2={svgHeight * 0.75} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4,4" />

              {/* Area path */}
              <path d={areaPath} fill="url(#chartGradient)" />

              {/* Line path */}
              <path d={linePath} fill="none" stroke={activeVital.stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

              {/* Points */}
              {chartCoordinates.map((coord, idx) => (
                <g key={idx} className="group cursor-pointer">
                  <circle cx={coord.x} cy={coord.y} r="5" fill={activeVital.stroke} stroke="white" strokeWidth="2" className="transition-all duration-200 hover:r-7" />
                  {/* Tooltip text value above dot */}
                  <text x={coord.x} y={coord.y - 12} textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--navy)" className="opacity-0 group-hover:opacity-100 transition-opacity bg-white">
                    {coord.value} {activeVital.unit}
                  </text>
                </g>
              ))}

              {/* X axis labels */}
              {chartCoordinates.map((coord, idx) => (
                <text key={idx} x={coord.x} y={svgHeight + 10} textAnchor="middle" fontSize="9" fontWeight="semibold" fill="var(--muted-foreground)">
                  {activeVital.labels[idx]}
                </text>
              ))}
            </svg>
          </div>
        </div>
      </div>

      {/* Live OPD Queue Tracker */}
      {activeAppt && (
        <div className="mt-6 rounded-3xl border border-teal/30 bg-gradient-to-r from-teal/10 via-card to-emerald-500/10 p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal text-white font-display font-extrabold text-sm">
                #{activeAppt.queue_number ?? 1}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal">Live OPD Queue Status</span>
                </div>
                <p className="text-sm font-bold text-navy">
                  {activeAppt.hospitalName || activeAppt.hospital_id} · {activeAppt.department}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="rounded-xl bg-background/80 px-3 py-2 border border-border/50">
                <span className="text-muted-foreground block text-[10px] font-semibold">Now Serving</span>
                <span className="font-bold text-navy">Token #{activeAppt.current_serving ?? 0}</span>
              </div>
              <div className="rounded-xl bg-background/80 px-3 py-2 border border-border/50">
                <span className="text-muted-foreground block text-[10px] font-semibold">People Ahead</span>
                <span className="font-bold text-navy">{activeAppt.people_ahead ?? 0}</span>
              </div>
              <div className="rounded-xl bg-background/80 px-3 py-2 border border-border/50">
                <span className="text-muted-foreground block text-[10px] font-semibold">Est. Wait</span>
                <span className="font-bold text-teal">{activeAppt.wait_time_predicted ?? 0} mins</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Appointments List */}
        <div className="lg:col-span-2 rounded-3xl border border-border bg-card shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border/40 p-5 sm:px-6">
              <div className="flex items-center gap-2 text-navy">
                <Calendar className="h-5 w-5 text-teal" />
                <h2 className="font-display text-lg font-bold">My Active Appointments</h2>
              </div>
              <Link to="/book" className="rounded-xl bg-gradient-teal px-4 py-2 text-xs font-bold text-white shadow-glow-teal hover:opacity-95 transition cursor-pointer">
                + New Consultation
              </Link>
            </div>
            
            <div className="divide-y divide-border/40">
              {bookings.length > 0 ? (
                bookings.map((b) => (
                  <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-5 sm:px-6 hover:bg-accent/20 transition-colors">
                    <div>
                      <div className="font-bold text-navy">{b.doctorName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{b.specialty} · {b.hospitalName}</div>
                      <div className="mt-2.5 text-xs text-navy flex items-center gap-1">
                        <span className="font-bold bg-muted px-2 py-0.5 rounded-md text-navy">OPD Token {b.tokenNo}</span>
                        <span className="text-muted-foreground/80 font-medium">Scheduled:</span>
                        <span className="font-bold text-teal">{b.date} at {b.time}</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusStyle[b.status as keyof typeof statusStyle] || "bg-muted text-muted-foreground"}`}>{b.status}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <Calendar className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground mt-2 font-medium">No upcoming consultations scheduled.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick info / score */}
        <div className="space-y-4">
          <div className="rounded-3xl bg-gradient-teal p-6 text-white shadow-glow relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/[0.03] bg-[size:15px_15px]" />
            <div className="relative z-10">
              <h3 className="font-display text-lg font-bold">Wellness Score</h3>
              <div className="mt-3 flex items-end gap-1.5">
                <span className="font-display text-5xl font-extrabold tracking-tight">86</span>
                <span className="pb-1 text-xs text-white/80 font-bold">/100</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
                <div className="h-full bg-white animate-pulse" style={{ width: "86%" }} />
              </div>
              <p className="mt-3 text-xs text-white/85">Vault verified. Syncing with CGHS records.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
            <h3 className="font-display text-sm font-bold text-navy border-b border-border/40 pb-3">Quick Actions</h3>
            <div className="mt-3 grid gap-1.5 text-xs">
              <Link to="/hospitals" className="flex items-center justify-between rounded-xl px-3.5 py-2.5 font-bold text-navy hover:bg-accent transition-colors">
                Find a hospital <span className="text-teal font-extrabold">→</span>
              </Link>
              <Link to="/book" className="flex items-center justify-between rounded-xl px-3.5 py-2.5 font-bold text-navy hover:bg-accent transition-colors">
                Book OPD slot <span className="text-teal font-extrabold">→</span>
              </Link>
              <Link to="/emergency" className="flex items-center justify-between rounded-xl px-3.5 py-2.5 font-bold text-destructive bg-destructive/5 hover:bg-destructive/10 transition-colors">
                Ambulance Dispatch <span className="text-destructive font-extrabold">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Health Records Vault */}
      <div className="mt-8 rounded-3xl border border-border bg-card shadow-card">
        <div className="flex items-center justify-between border-b border-border/40 p-5 sm:px-6">
          <div className="flex items-center gap-2 text-navy">
            <FileText className="h-5 w-5 text-teal" />
            <h2 className="font-display text-lg font-bold">Virtual Health Records Vault</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-muted-foreground hidden sm:inline">{records.length} items · Encrypted Vault</span>
            <button 
              onClick={() => setShowAddRecord(true)}
              className="rounded-xl bg-navy px-4 py-2 text-xs font-bold text-white shadow hover:bg-teal transition cursor-pointer"
            >
              + Upload Prescription / Record
            </button>
          </div>
        </div>
        
        <div className="grid gap-4 p-5 sm:px-6 sm:grid-cols-2 lg:grid-cols-3">
          {records.length > 0 ? (
            records.map((r) => {
              const Icon = recordIcon[r.type as keyof typeof recordIcon] || FileText;
              const hasFile = !!r.file;
              return (
                <div key={r.id} className="group rounded-2xl border border-border bg-background p-5 transition duration-300 hover:border-teal hover:shadow-glow flex flex-col justify-between">
                  <div>
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground group-hover:bg-teal/15 group-hover:text-teal transition-colors"><Icon className="h-5 w-5" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          <span>{r.type.replace("-", " ")}</span>
                          <span className="normal-case font-semibold text-muted-foreground/80">{r.date}</span>
                        </div>
                        <h4 className="mt-1 font-bold text-navy truncate group-hover:text-teal transition-colors">{r.title}</h4>
                        <p className="mt-0.5 text-xs text-muted-foreground truncate font-medium">{r.doctor} · {r.hospital}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-xs text-navy/80 line-clamp-3 bg-muted/30 p-2.5 rounded-lg border border-border/30 font-medium">{r.summary}</p>
                    
                    {r.file && (
                      <div className="mt-3 flex items-center justify-between rounded-xl bg-accent/30 p-2 border border-border/30 text-[10px] font-bold text-navy">
                        <span className="truncate max-w-[150px]">{r.file.name}</span>
                        <span className="text-muted-foreground font-semibold shrink-0">{r.file.size}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 flex justify-between items-center text-xs border-t border-border/40 pt-3 font-bold">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setPreviewRecord(r)}
                        className="text-teal hover:underline cursor-pointer"
                      >
                        View File
                      </button>
                      <span className="text-muted-foreground/40 font-normal">|</span>
                      <a 
                        href={r.file?.dataUrl === "default_prescription" ? "#" : r.file?.dataUrl} 
                        download={r.file?.name || "document.pdf"}
                        onClick={(e) => {
                          if (r.file?.dataUrl === "default_prescription") {
                            e.preventDefault();
                            alert("This is a system generated virtual prescription. You can view it and access its QR scan code directly in the viewer modal.");
                          }
                        }}
                        className="text-muted-foreground hover:text-navy hover:underline"
                      >
                        Download
                      </a>
                    </div>
                    <div className="flex gap-2 items-center">
                      <button 
                        onClick={() => handleMockShare(r)}
                        className="text-muted-foreground hover:text-navy cursor-pointer"
                      >
                        Share File
                      </button>
                      <span className="text-muted-foreground/40 font-normal">|</span>
                      <button 
                        onClick={() => deleteRecord(r.id)}
                        className="text-destructive hover:underline cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="sm:col-span-3 text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground mt-3 font-semibold">Vault is empty. Click "+ Upload Prescription" to secure records.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Record Modal / Drawer with File Upload */}
      {showAddRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowAddRecord(false)} />
          <form 
            onSubmit={handleAddRecord}
            className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto scrollbar-thin z-10"
          >
            <button 
              type="button" 
              onClick={() => setShowAddRecord(false)} 
              className="absolute right-4 top-4 rounded-lg p-1.5 hover:bg-muted transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-2 border-b border-border/40 pb-4 mb-5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal/15 text-teal">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-navy">Upload Virtual Prescription</h3>
                <p className="text-xs text-muted-foreground">Save prescriptions and clinical scans to access anywhere.</p>
              </div>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Document Classification</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(["prescription", "lab-report", "scan", "discharge"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setRecType(t)}
                      className={`rounded-xl border py-2 text-[10px] font-bold transition cursor-pointer ${recType === t ? "border-teal bg-teal/5 text-teal" : "border-border hover:bg-accent/40"}`}
                    >
                      {t.replace("-", " ")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Record Title / Diagnosis</label>
                <input 
                  type="text"
                  required
                  value={recTitle}
                  onChange={(e) => setRecTitle(e.target.value)}
                  placeholder="e.g. Chest X-Ray, Blood Test, Cardio Prescription"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-navy outline-none focus:border-teal transition font-bold"
                />
              </div>

              {/* Drag & Drop File Upload Hook */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Virtual File Attachment (Prescription scan, PDF, or image)</label>
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center transition ${dragActive ? "border-teal bg-teal/5" : "border-border bg-muted/20"} ${uploadedFile ? "border-success bg-success/5" : ""}`}
                >
                  <input 
                    type="file" 
                    id="file-upload-input"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  
                  {!uploadedFile ? (
                    <label htmlFor="file-upload-input" className="cursor-pointer flex flex-col items-center justify-center">
                      <UploadCloud className="h-8 w-8 text-teal mb-2 animate-breathe" />
                      <p className="font-bold text-navy text-xs">Drag and drop file here or click to browse</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Supports PDF, JPEG, PNG (Max 10MB)</p>
                    </label>
                  ) : (
                    <div className="flex items-center justify-between bg-white/80 p-2.5 rounded-xl border border-border">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="h-6 w-6 text-success shrink-0" />
                        <div className="text-left min-w-0">
                          <p className="font-bold text-navy truncate text-xs">{uploadedFile.name}</p>
                          <p className="text-[10px] text-muted-foreground font-semibold">{uploadedFile.size} · Uploaded</p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setUploadedFile(null)}
                        className="rounded-lg p-1 hover:bg-muted text-destructive shrink-0 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Physician / Consultant</label>
                  <input 
                    type="text"
                    required
                    value={recDoctor}
                    onChange={(e) => setRecDoctor(e.target.value)}
                    placeholder="e.g. Dr. Suresh Prasad"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-navy outline-none focus:border-teal transition font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Hospital / Clinic</label>
                  <input 
                    type="text"
                    required
                    value={recHospital}
                    onChange={(e) => setRecHospital(e.target.value)}
                    placeholder="e.g. Sanjeevani Care Center"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-navy outline-none focus:border-teal transition font-bold"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Consultation Date</label>
                  <input 
                    type="date"
                    required
                    max={new Date().toISOString().split("T")[0]}
                    value={recDate}
                    onChange={(e) => setRecDate(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-navy outline-none focus:border-teal transition cursor-pointer font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Prescription Notes / Diagnostics</label>
                <textarea 
                  rows={2}
                  value={recSummary}
                  onChange={(e) => setRecSummary(e.target.value)}
                  placeholder="Summarize key directions, medicine routine, or warnings..."
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-navy outline-none focus:border-teal transition resize-none font-bold"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-border/40 pt-4">
              <button 
                type="button" 
                onClick={() => setShowAddRecord(false)}
                className="rounded-xl border border-border px-5 py-3 text-xs font-bold text-navy hover:bg-accent transition cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="rounded-xl bg-gradient-teal px-5 py-3 text-xs font-bold text-white shadow-glow-teal hover:opacity-95 transition cursor-pointer"
              >
                Save Encrypted Record
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Premium Lightbox Document Viewer ─── */}
      {previewRecord && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy/60 backdrop-blur-md animate-fade-in" onClick={() => setPreviewRecord(null)} />
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl animate-scale-in max-h-[92vh] overflow-y-auto scrollbar-thin z-10 flex flex-col justify-between">
            <button 
              onClick={() => setPreviewRecord(null)} 
              className="absolute right-4 top-4 rounded-lg p-1.5 hover:bg-muted transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Document Header */}
            <div>
              <div className="flex items-center gap-2 border-b border-border/40 pb-4 mb-4">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal/15 text-teal">
                  <FileText className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-display text-base font-bold text-navy">Virtual Rx Prescriptive Card</h3>
                  <p className="text-[10px] uppercase font-extrabold tracking-widest text-muted-foreground">Sanjeevani Verified Vault Document</p>
                </div>
              </div>

              {/* Interactive Virtual card itself */}
              <div className="rounded-2xl border border-border bg-slate-50 p-6 relative overflow-hidden font-sans text-xs text-navy leading-normal shadow-xs">
                {/* Watermark grid overlay */}
                <div className="absolute inset-0 bg-grid-navy/[0.015] bg-[size:10px_10px] pointer-events-none" />
                
                {/* Prescription Stamp */}
                <div className="absolute top-6 right-6 border-2 border-success/40 rounded-lg p-1.5 flex flex-col items-center rotate-6 select-none bg-white/60">
                  <Check className="h-5 w-5 text-success stroke-[3]" />
                  <span className="text-[8px] font-extrabold uppercase text-success tracking-wide mt-0.5">VERIFIED VAULT</span>
                </div>

                {/* Patient / Doctor Meta details */}
                <div className="grid grid-cols-2 gap-4 border-b border-border/80 pb-4">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-extrabold block">Patient Reference</span>
                    <span className="font-bold text-navy text-sm">{profile.name}</span>
                    <span className="block text-[10px] text-muted-foreground mt-0.5">Age: {profile.age} · Blood: {profile.bloodGroup}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-extrabold block">Consulting Doctor</span>
                    <span className="font-bold text-navy text-sm">{previewRecord.doctor}</span>
                    <span className="block text-[10px] text-muted-foreground mt-0.5">{previewRecord.hospital}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-extrabold block">Diagnosis Subject</span>
                    <span className="font-bold text-navy">{previewRecord.title}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-extrabold block">Consultation Date</span>
                    <span className="font-bold text-navy">{previewRecord.date}</span>
                  </div>
                </div>

                {/* Medical Vault preview container */}
                <div className="mt-2 border-t border-border/80 pt-4">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-extrabold block">Prescription Summary / Lab Directions</span>
                  <div className="mt-2 rounded-xl bg-white border border-border/40 p-4 font-medium text-navy/90 italic leading-relaxed text-xs">
                    "{previewRecord.summary}"
                  </div>
                </div>

                {/* Virtual image or uploaded file block */}
                {previewRecord.file && previewRecord.file.dataUrl !== "default_prescription" && (
                  <div className="mt-5 pt-4 border-t border-border/80">
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-extrabold block mb-2">Attached Virtual Document File</span>
                    {previewRecord.file.type.startsWith("image/") ? (
                      <div className="relative rounded-xl overflow-hidden border border-border max-h-[200px] flex items-center justify-center bg-black">
                        <img 
                          src={previewRecord.file.dataUrl} 
                          alt="Uploaded Attachment Preview" 
                          className="max-h-[200px] w-auto object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-border">
                        <FileText className="h-8 w-8 text-teal shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-navy truncate text-xs">{previewRecord.file.name}</p>
                          <p className="text-[10px] text-muted-foreground font-semibold">Virtual PDF Link (Available on download)</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Verified Footer barcode simulation */}
                <div className="mt-6 border-t border-border/80 pt-4 flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                  <div>
                    <span>Record ID: {previewRecord.id}</span>
                    <span className="block text-[8px] text-muted-foreground/80 mt-0.5">Sanjeevani Blockchain Secured Prescription</span>
                  </div>
                  {/* barcode stripes mock */}
                  <div className="flex items-center gap-0.5 select-none h-6 opacity-60">
                    {[1, 3, 2, 4, 1, 3, 1, 2, 3, 4, 2, 1, 2, 3, 1, 4, 2].map((w, idx) => (
                      <span key={idx} className="bg-navy h-full inline-block" style={{ width: `${w}px` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Lightbox Controls */}
            <div className="mt-6 flex flex-wrap justify-between items-center gap-3 border-t border-border/40 pt-4 font-bold text-xs">
              <button 
                onClick={() => window.print()}
                className="rounded-xl border border-border px-4 py-2 text-navy hover:bg-accent cursor-pointer"
              >
                Print Prescription
              </button>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => handleMockShare(previewRecord)}
                  className="rounded-xl border border-border px-4 py-2 text-navy hover:bg-accent cursor-pointer"
                >
                  Share Vault Link
                </button>
                <button 
                  onClick={() => setPreviewRecord(null)}
                  className="rounded-xl bg-navy px-5 py-2 text-white hover:bg-teal transition cursor-pointer"
                >
                  Close Viewer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Mock Share Overlay Link Toast ─── */}
      {shareRecord && (
        <div className="fixed bottom-6 right-6 z-[150] rounded-2xl bg-navy text-white p-4 shadow-xl border border-white/10 max-w-sm animate-scale-in">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal/15 text-teal">
              <UploadCloud className="h-4.5 w-4.5 animate-bounce" />
            </span>
            <div className="text-xs">
              {shareStatus === "generating" ? (
                <p className="font-bold">Generating secure sharing link...</p>
              ) : (
                <div>
                  <p className="font-bold text-teal">Link copied to clipboard!</p>
                  <p className="text-[10px] text-white/70 mt-0.5">Anyone with this link can view this prescription securely.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

