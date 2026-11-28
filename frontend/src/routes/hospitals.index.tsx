import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { Search, MapPin, Star, BedDouble, Filter, ArrowRight, ShieldCheck, Pill } from "lucide-react";
import { fetchHospitals } from "@/lib/api";
import { type Hospital } from "@/lib/mockData";

export const Route = createFileRoute("/hospitals/")({
  head: () => ({
    meta: [
      { title: "Find Hospitals in India — Sanjeevani" },
      { name: "description", content: "Browse 12,000+ hospitals across India by city, specialty and bed availability." },
      { property: "og:title", content: "Find Hospitals — Sanjeevani" },
      { property: "og:description", content: "Search hospitals by location and specialty across India." },
    ],
  }),
  component: HospitalsPageIndex,
});

const cities = ["All cities", "Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Kolkata", "Pune", "Bhubaneswar"];
const specialties = ["All specialties", "Cardiology", "Neurology", "Orthopedics", "Oncology", "Pediatrics", "Gynecology", "ENT", "Dentist", "General"];

function HospitalsPageIndex() {
  const [q, setQ] = useState("");
  const [city, setCity] = useState("All cities");
  const [spec, setSpec] = useState("All specialties");
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [hospitalList, setHospitalList] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHospitals().then((data) => {
      setHospitalList(data);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return hospitalList.filter((h) => {
      if (q && !h.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (city !== "All cities" && h.city.toLowerCase() !== city.toLowerCase()) return false;
      if (spec !== "All specialties" && !h.specialties.some((s) => s.toLowerCase() === spec.toLowerCase())) return false;
      return true;
    });
  }, [hospitalList, q, city, spec]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
          <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![rect(0,0,0,0)]">Loading...</span>
        </div>
        <p className="mt-4 text-sm font-semibold text-muted-foreground">Fetching verified hospitals...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Search Header Banner */}
      <div className="rounded-3xl bg-gradient-hero p-8 text-white shadow-glow sm:p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.03] bg-[size:20px_20px]" />
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md">
            <ShieldCheck className="h-3 w-3 text-teal" /> 100% Verified Medical Network
          </span>
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl mt-3">Find a Verified Hospital</h1>
          <p className="mt-2 text-white/80">Search across {hospitalList.length}+ premium care centres with live bed updates.</p>

          <div className="mt-8 grid gap-3 rounded-2xl bg-white/95 p-3 shadow-lg-custom md:grid-cols-[2fr_1fr_1fr_auto] backdrop-blur">
            <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-white px-3 py-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search hospital name, brand, or specialty..." className="w-full bg-transparent py-2.5 text-sm text-navy outline-none placeholder:text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-white px-3 py-1">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full bg-transparent py-2.5 text-sm text-navy outline-none cursor-pointer">
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-white px-3 py-1">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select value={spec} onChange={(e) => setSpec(e.target.value)} className="w-full bg-transparent py-2.5 text-sm text-navy outline-none cursor-pointer">
                {specialties.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-teal px-6 py-3 text-sm font-bold text-white shadow-glow-teal hover:opacity-95 transition cursor-pointer">
              Apply Filter
            </button>
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-navy">Search Results</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} verified hospitals found matching your criteria</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sort By</span>
          <select className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-navy outline-none cursor-pointer hover:bg-accent/50 transition">
            <option>Most relevant</option>
            <option>Nearest first</option>
            <option>Highest rated</option>
            <option>Most beds available</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((h) => (
          <Link key={h.id} to="/hospitals/$id" params={{ id: h.id }} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card transition duration-300 hover:-translate-y-1.5 hover:shadow-glow flex flex-col">
            <div className="aspect-[16/10] overflow-hidden bg-muted/30 relative">
              {imgErrors[h.id] ? (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-100 text-teal">
                  <ShieldCheck className="h-12 w-12 animate-pulse" />
                  <span className="mt-2 text-xs font-bold uppercase tracking-wider">{h.city}</span>
                </div>
              ) : (
                <img 
                  src={h.image} 
                  alt={h.name} 
                  loading="lazy" 
                  onError={() => setImgErrors(prev => ({ ...prev, [h.id]: true }))}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-110" 
                />
              )}
              <div className="absolute top-3 right-3 rounded-full bg-navy/80 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
                Est. {h.established}
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3" /> {h.city} · {h.distance} km</span>
                  <span className="flex items-center gap-1 font-bold text-warning"><Star className="h-3.5 w-3.5 fill-warning" /> {h.rating} <span className="text-muted-foreground font-normal">({h.reviews})</span></span>
                </div>
                <h3 className="mt-3 font-display text-lg font-extrabold text-navy group-hover:text-teal transition-colors line-clamp-1">{h.name}</h3>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{h.address}</p>

                <div className="mt-4 flex flex-wrap gap-1">
                  {h.specialties.slice(0, 3).map((s) => (
                    <span key={s} className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-medium text-accent-foreground">{s}</span>
                  ))}
                  {h.specialties.length > 3 && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">+{h.specialties.length - 3} more</span>
                  )}
                </div>
              </div>

              <div>
                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center text-[11px]">
                  <div className="rounded-lg bg-muted/40 py-1.5">
                    <div className="font-extrabold text-success text-sm">{h.beds.available}</div>
                    <div className="text-muted-foreground mt-0.5 text-[9px] uppercase tracking-wider font-semibold">Beds free</div>
                  </div>
                  <div className="rounded-lg bg-muted/40 py-1.5">
                    <div className="font-extrabold text-teal text-sm">{h.beds.icuAvailable}</div>
                    <div className="text-muted-foreground mt-0.5 text-[9px] uppercase tracking-wider font-semibold">ICU free</div>
                  </div>
                  <div className="rounded-lg bg-muted/40 py-1.5">
                    <div className="font-extrabold text-navy text-sm">24/7</div>
                    <div className="text-muted-foreground mt-0.5 text-[9px] uppercase tracking-wider font-semibold">Emergency</div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-[10px] font-bold text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success animate-ping" /> Cashless Insurance
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-teal group-hover:text-navy transition-colors">
                    View & Book <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-12 rounded-3xl border border-dashed border-border bg-card p-12 text-center shadow-xs">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-4">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="font-display text-lg font-bold text-navy">No Hospitals Found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">We couldn't find any hospitals matching your current search options. Try adjusting filters or search queries.</p>
          <button onClick={() => { setQ(""); setCity("All cities"); setSpec("All specialties"); }} className="mt-4 rounded-xl bg-navy text-white px-5 py-2.5 text-xs font-bold shadow hover:bg-teal transition">
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}
