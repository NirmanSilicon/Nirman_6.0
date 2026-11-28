import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { hospitals, type Hospital, type Doctor } from "@/lib/mockData";
import { MapPin, Star, BedDouble, Phone, Clock, Award, Stethoscope, ArrowRight, ShieldCheck, Building } from "lucide-react";
import { fetchHospitalDetail, fetchHospitalQueue } from "@/lib/api";

export const Route = createFileRoute("/hospitals/$id")({
  head: ({ params }) => {
    const h = hospitals.find((x) => x.id === params.id);
    return {
      meta: [
        { title: `${h?.name ?? "Hospital"} — Sanjeevani` },
        { name: "description", content: h ? `${h.name} in ${h.city}. Book OPD, check bed availability and doctors.` : "Hospital details" },
        ...(h ? [
          { property: "og:title", content: `${h.name} — Sanjeevani` } as const,
          { property: "og:description", content: `${h.specialties.slice(0,4).join(", ")} · ${h.beds.available} beds available` } as const,
          { property: "og:image", content: h.image } as const,
        ] : []),
      ],
    };
  },
  loader: async ({ params }) => {
    const [data, queue] = await Promise.all([
      fetchHospitalDetail(params.id),
      fetchHospitalQueue(params.id),
    ]);
    if (!data.hospital) throw notFound();
    return { ...data, queue };
  },
  component: HospitalDetail,
  notFoundComponent: () => <div className="mx-auto max-w-md p-10 text-center"><p>Hospital not found.</p></div>,
  errorComponent: ({ error }) => <div className="p-10 text-center text-destructive">{error.message}</div>,
});

function HospitalDetail() {
  const { hospital: h, doctors: docs, queue } = Route.useLoaderData() as {
    hospital: Hospital;
    doctors: Doctor[];
    queue: Record<string, { total_in_queue: number; current_serving: number; avg_time_per_patient: number; wait_time_mins: number }>;
  };
  const [imgError, setImgError] = useState(false);
  const [docErrors, setDocErrors] = useState<Record<string, boolean>>({});
  
  const bedPct = Math.round((h.beds.available / h.beds.total) * 100);

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="relative h-[360px] overflow-hidden bg-navy">
        {imgError ? (
          <div className="absolute inset-0 bg-gradient-to-br from-teal-800 via-navy to-slate-900 flex flex-col items-center justify-center text-white/40">
            <Building className="h-16 w-16 animate-pulse" />
            <span className="mt-2 text-xs font-bold uppercase tracking-wider text-white/30">{h.name} Banner</span>
          </div>
        ) : (
          <img 
            src={h.image} 
            alt={h.name} 
            onError={() => setImgError(true)}
            className="h-full w-full object-cover opacity-80" 
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/55 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-4 pb-8 text-white sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md text-white/90">
                <MapPin className="h-3.5 w-3.5 text-teal" /> {h.address} · {h.city}
              </div>
              <h1 className="font-display text-3xl font-extrabold sm:text-4xl leading-tight">{h.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm pt-1.5">
                <span className="flex items-center gap-1 text-warning font-bold">
                  <Star className="h-4 w-4 fill-warning text-warning" /> {h.rating} 
                  <span className="text-white/70 font-medium">({h.reviews} reviews)</span>
                </span>
                <span className="text-white/40">•</span>
                <span className="text-white/80 font-medium">Established in {h.established}</span>
                <span className="text-white/40">•</span>
                <span className="rounded-full bg-success/20 px-2.5 py-0.5 text-success font-bold tracking-wide text-[10px] uppercase">24/7 Emergency Active</span>
              </div>
            </div>
            <div className="flex gap-2.5 shrink-0">
              <a href="tel:1800" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-xs font-bold backdrop-blur-md hover:bg-white/20 transition cursor-pointer"><Phone className="h-4 w-4 text-teal" /> Call Facility</a>
              <Link to="/book" className="inline-flex items-center gap-2 rounded-xl bg-gradient-teal px-5 py-3 text-xs font-bold text-white shadow-glow-teal hover:opacity-95 transition cursor-pointer">Book Appointment <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Bed availability */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 text-navy border-b border-border/40 pb-4"><BedDouble className="h-5 w-5 text-teal" /><h2 className="font-display text-lg font-bold">Live Bed Status</h2></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {[
                { label: "General Beds Available", free: h.beds.available, total: h.beds.total, color: "success" as const },
                { label: "ICU Beds Available", free: h.beds.icuAvailable, total: h.beds.icu, color: "teal" as const },
                { label: "Emergency Trauma Beds", free: 4, total: 8, color: "warning" as const },
              ].map((b) => {
                const pct = Math.round((b.free / b.total) * 100);
                return (
                  <div key={b.label} className="rounded-2xl bg-muted/40 p-4 border border-border/30">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{b.label}</span>
                      <span className="text-2xl font-extrabold text-navy mt-1.5">{b.free}<span className="text-sm font-semibold text-muted-foreground">/{b.total}</span></span>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
                      <div className={`h-full bg-${b.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-[10px] font-bold text-muted-foreground/85 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Last synced: 2 minutes ago · Live HIMS feed secure encryption</p>
          </div>

          {/* Specialties & Live Queues */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 text-navy border-b border-border/40 pb-4"><Stethoscope className="h-5 w-5 text-teal" /><h2 className="font-display text-lg font-bold">Centres of Clinical Excellence &amp; Live Queues</h2></div>
            <div className="mt-4 flex flex-wrap gap-2">
              {h.specialties.map((s) => (
                <span key={s} className="rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-bold text-navy hover:border-teal hover:text-teal transition-all duration-200 cursor-default">{s}</span>
              ))}
            </div>
            {queue && Object.keys(queue).length > 0 && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {Object.entries(queue).map(([dept, q]) => (
                  <div key={dept} className="rounded-2xl border border-border/50 bg-muted/30 p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-navy">{dept}</p>
                      <p className="text-[11px] text-muted-foreground">Serving #{q.current_serving} · {q.total_in_queue} in queue</p>
                    </div>
                    <span className="rounded-xl bg-teal/10 px-2.5 py-1 text-xs font-bold text-teal">~{q.wait_time_mins}m</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Doctors */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <div className="flex items-center gap-2 text-navy"><Award className="h-5 w-5 text-teal" /><h2 className="font-display text-lg font-bold">Top Practicing Specialists</h2></div>
              <Link to="/book" className="text-xs font-bold text-teal hover:underline cursor-pointer">View all →</Link>
            </div>
            
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {docs.map((d) => (
                <div key={d.id} className="flex items-center gap-3.5 rounded-2xl border border-border bg-background p-4 shadow-card hover:border-teal transition duration-200">
                  <div className="h-12 w-12 shrink-0 rounded-full overflow-hidden relative bg-muted/20 border-2 border-border/50">
                    {docErrors[d.id] ? (
                      <div className="flex h-full w-full items-center justify-center bg-teal/5 text-teal text-[10px] font-bold">Doc</div>
                    ) : (
                      <img 
                        src={d.avatar} 
                        alt={d.name} 
                        onError={() => setDocErrors(prev => ({ ...prev, [d.id]: true }))}
                        className="h-full w-full object-cover" 
                      />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-bold text-navy">{d.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{d.specialty} · {d.experience} yrs exp</div>
                    <div className="mt-1.5 flex items-center gap-2 text-[10px]">
                      <span className="flex items-center gap-0.5 text-warning font-bold"><Star className="h-3.5 w-3.5 fill-warning text-warning" /> {d.rating}</span>
                      <span className="text-muted-foreground/60">•</span>
                      <span className="text-success font-semibold">{d.nextSlot}</span>
                    </div>
                  </div>
                  <Link to="/book" className="rounded-xl bg-gradient-teal px-3.5 py-2 text-xs font-bold text-white shadow-glow-teal hover:opacity-95 transition cursor-pointer">Book</Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="rounded-3xl bg-gradient-hero p-6 text-white shadow-glow relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/[0.03] bg-[size:15px_15px]" />
            <div className="relative z-10">
              <h3 className="font-display text-lg font-bold">Quick Book OPD</h3>
              <p className="mt-1.5 text-xs text-white/80">Get a confirmed token in 60 seconds.</p>
              <Link to="/book" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3.5 text-xs font-bold text-navy shadow hover:bg-muted transition cursor-pointer">Choose doctor & time <ArrowRight className="h-4 w-4" /></Link>
              <div className="mt-5 grid grid-cols-2 gap-2 text-center text-xs">
                <div className="rounded-xl bg-white/10 p-3"><div className="font-bold text-base">{bedPct}%</div><div className="text-[10px] text-white/70 mt-0.5">Capacity free</div></div>
                <div className="rounded-xl bg-white/10 p-3"><div className="font-bold text-base">{docs.length}+</div><div className="text-[10px] text-white/70 mt-0.5">Doctors today</div></div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <h3 className="font-display text-sm font-bold text-navy border-b border-border/40 pb-3">Facilities & Accreditations</h3>
            <ul className="mt-4 space-y-2.5 text-xs">
              {["NABH Accredited Facility", "NABL Certified Diagnostic Labs", "24/7 Trauma Care Wing", "Cashless TPA Assistance", "Dedicated Ambulance Network", "Fully Stocked In-house Pharmacy"].map((x) => (
                <li key={x} className="flex items-center gap-2 text-foreground font-semibold"><ShieldCheck className="h-4.5 w-4.5 text-success" /> {x}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <h3 className="flex items-center gap-2 font-display text-sm font-bold text-navy border-b border-border/40 pb-3"><Clock className="h-4.5 w-4.5 text-teal" /> Visiting Hours</h3>
            <div className="mt-4 space-y-2.5 text-xs text-foreground font-semibold">
              <div className="flex justify-between"><span>OPD Consultations</span><span className="text-muted-foreground font-medium">8:00 AM – 8:00 PM</span></div>
              <div className="flex justify-between"><span>General Visitation</span><span className="text-muted-foreground font-medium">5:00 PM – 7:00 PM</span></div>
              <div className="flex justify-between"><span>Emergency Center</span><span className="font-bold text-success animate-pulse">24 Hours Open</span></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

