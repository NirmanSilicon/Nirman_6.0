import { useEffect, useRef, useState } from "react";
import { 
  MapPin, Search, Star, Activity, Phone, Navigation, 
  Compass, BedDouble, ChevronRight, SlidersHorizontal, Map, X, Check
} from "lucide-react";

type Hospital = { 
  name: string; 
  lat: number; 
  lng: number; 
  beds: number; 
  icuBeds: number;
  rating: number; 
  specialties: string[];
  phone: string;
  address: string;
};

const generateMockHospitals = (centerLat: number, centerLng: number): Hospital[] => {
  return [
    {
      name: "MediShield Multispeciality Hospital",
      lat: centerLat + 0.005,
      lng: centerLng - 0.004,
      beds: 42,
      icuBeds: 8,
      rating: 4.8,
      specialties: ["Cardiology", "Neurology"],
      phone: "+91 22 4153 9000",
      address: "LBS Marg, Mulund West, Mumbai"
    },
    {
      name: "CarePulse Wellness Hospital",
      lat: centerLat + 0.009,
      lng: centerLng + 0.003,
      beds: 18,
      icuBeds: 2,
      rating: 4.6,
      specialties: ["Orthopedics", "Pediatrics"],
      phone: "+91 22 2576 4000",
      address: "Central Ave, Hiranandani Gardens, Powai"
    },
    {
      name: "Apex Life Care Center",
      lat: centerLat - 0.006,
      lng: centerLng - 0.008,
      beds: 30,
      icuBeds: 5,
      rating: 4.5,
      specialties: ["Oncology", "Gastroenterology"],
      phone: "+91 22 6767 1200",
      address: "Ghatkopar East, Mumbai"
    },
    {
      name: "Metro Heart & General Hospital",
      lat: centerLat - 0.004,
      lng: centerLng + 0.007,
      beds: 55,
      icuBeds: 12,
      rating: 4.9,
      specialties: ["Cardiology", "Pulmonology"],
      phone: "+91 22 2404 4000",
      address: "Sion Circle, Sion East, Mumbai"
    },
    {
      name: "Trinity Health City",
      lat: centerLat + 0.012,
      lng: centerLng + 0.002,
      beds: 0,
      icuBeds: 0,
      rating: 4.3,
      specialties: ["General Medicine", "ENT"],
      phone: "+91 22 2626 5000",
      address: "SV Road, Bandra West, Mumbai"
    },
    {
      name: "Nirvana Emergency Clinic",
      lat: centerLat - 0.010,
      lng: centerLng + 0.005,
      beds: 68,
      icuBeds: 15,
      rating: 4.7,
      specialties: ["Neurology", "Nephrology"],
      phone: "+91 22 2888 3333",
      address: "Link Road, Andheri West, Mumbai"
    },
    {
      name: "Suraksha Specialty Center",
      lat: centerLat + 0.003,
      lng: centerLng - 0.010,
      beds: 15,
      icuBeds: 3,
      rating: 4.4,
      specialties: ["Dermatology", "Gynecology"],
      phone: "+91 22 2202 1111",
      address: "Colaba Causeway, South Mumbai"
    },
    {
      name: "Asha Multi-Care Hospital",
      lat: centerLat - 0.002,
      lng: centerLng + 0.011,
      beds: 35,
      icuBeds: 6,
      rating: 4.6,
      specialties: ["Pediatrics", "Orthopedics"],
      phone: "+91 22 2500 8888",
      address: "Vikhroli West, Mumbai"
    },
  ];
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c;
  return parseFloat(d.toFixed(1));
};

export function HospitalMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  
  const [locating, setLocating] = useState(true);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [hospitalsList, setHospitalsList] = useState<Hospital[]>([]);
  
  // Interactive UI states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [filterBeds, setFilterBeds] = useState(false);
  const [filterSpecialty, setFilterSpecialty] = useState("All");

  const specialties = ["All", "Cardiology", "Neurology", "Orthopedics", "Pediatrics", "Oncology", "General Medicine"];

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return;

    let isMounted = true;
    let map: any = null;

    const initMap = async () => {
      // Dynamic import of Leaflet
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      if (!isMounted) return;

      // Fix default marker icon assets
      const markerIcon2x = (await import("leaflet/dist/images/marker-icon-2x.png")).default;
      const markerIcon = (await import("leaflet/dist/images/marker-icon.png")).default;
      const markerShadow = (await import("leaflet/dist/images/marker-shadow.png")).default;

      // @ts-expect-error leaflet missing types
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: markerIcon2x,
        iconUrl: markerIcon,
        shadowUrl: markerShadow,
      });

      // Create map
      map = L.map(mapRef.current!, { zoomControl: false }).setView([19.076, 72.8777], 14);
      mapInstance.current = map;

      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Define satellite tile layer (Esri)
      const satelliteLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP",
        maxZoom: 19,
      });

      satelliteLayer.addTo(map);

      // Custom markers
      const hospitalIcon = L.divIcon({
        className: "",
        html: `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:38px;height:42px;">
          <div style="background:#0d9488;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(13,148,136,0.4);border:2px solid white;">
            <div style="background:white;width:18px;height:18px;border-radius:50%;transform:rotate(45deg);display:flex;align-items:center;justify-content:center;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#0d9488">
                <path d="M19 10.5h-5.5V5c0-.8-.7-1.5-1.5-1.5s-1.5.7-1.5 1.5v5.5H5c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5h5.5V19c0 .8.7 1.5 1.5 1.5s1.5-.7 1.5-1.5v-5.5H19c.8 0 1.5-.7 1.5-1.5s-.7-1.5-1.5-1.5z"/>
              </svg>
            </div>
          </div>
        </div>`,
        iconSize: [38, 42],
        iconAnchor: [19, 35],
      });

      const userIcon = L.divIcon({
        className: "",
        html: `<div style="position:relative;width:22px;height:22px;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;width:100%;height:100%;border-radius:50%;background:#3b82f6;opacity:0.3;animation:ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width:14px;height:14px;border-radius:50%;background:#3b82f6;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);position:relative;z-index:2;"></div>
        </div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const addHospitals = async (centerLat: number, centerLng: number) => {
        let generated = generateMockHospitals(centerLat, centerLng);
        try {
          const { fetchHospitals } = await import("@/lib/api");
          const apiHospitals = await fetchHospitals();
          const withCoords = apiHospitals.filter((h) => typeof h.lat === "number" && typeof h.lng === "number");
          if (withCoords.length > 0) {
            generated = withCoords.map((h) => ({
              name: h.name,
              lat: h.lat as number,
              lng: h.lng as number,
              beds: h.beds.available,
              icuBeds: h.beds.icuAvailable,
              rating: h.rating,
              specialties: h.specialties,
              phone: h.phone || "+91 674 238 6281",
              address: h.address,
            }));
          }
        } catch {
          // fallback to generated mock hospitals
        }
        if (isMounted) {
          setHospitalsList(generated);
        }

        // Clear existing markers
        Object.values(markersRef.current).forEach((marker: any) => marker.remove());
        markersRef.current = {};

        generated.forEach((h) => {
          const marker = L.marker([h.lat, h.lng], { icon: hospitalIcon })
            .addTo(map)
            .bindPopup(
              `<div style="font-family:Inter,system-ui,sans-serif;min-width:200px;padding:2px;">
                <div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:3px;line-height:1.3;">${h.name}</div>
                <div style="font-size:11px;color:#64748b;margin-bottom:6px;display:flex;align-items:center;gap:3px;">
                  <span style="color:#f59e0b;font-size:12px;">★</span> <b>${h.rating}</b> · <span style="color:${h.beds > 0 ? '#0d9488' : '#ef4444'};font-weight:600;">${h.beds > 0 ? `${h.beds} beds` : 'Full'}</span>
                </div>
                <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;">
                  ${h.specialties.slice(0, 2).map((s) => `<span style="background:#f0fdfa;color:#0d9488;padding:1px 6px;border-radius:8px;font-size:9px;font-weight:600;">${s}</span>`).join("")}
                </div>
                <div style="font-size:9px;color:#94a3b8;margin-bottom:8px;">${h.address}</div>
                <a href="tel:${h.phone}" style="display:inline-flex;align-items:center;justify-content:center;gap:4px;background:#0d9488;color:white;text-decoration:none;padding:5px 10px;border-radius:6px;font-size:10px;font-weight:700;width:100%;box-sizing:border-box;text-align:center;">
                  📞 Call Hospital
                </a>
              </div>`,
              { closeButton: false }
            );

          markersRef.current[h.name] = marker;
          marker.on('click', () => {
            if (isMounted) {
              setSelectedHospital(h);
            }
          });
        });
      };

      // Geolocate
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!isMounted) return;
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setUserPos([lat, lng]);
            setLocating(false);
            L.marker([lat, lng], { icon: userIcon }).addTo(map).bindPopup("<b>Your Current Location</b>");
            map.setView([lat, lng], 14);
            addHospitals(lat, lng);
          },
          () => {
            if (!isMounted) return;
            setLocating(false);
            const defaultLat = 19.076;
            const defaultLng = 72.8777;
            setUserPos([defaultLat, defaultLng]);
            map.setView([defaultLat, defaultLng], 14);
            addHospitals(defaultLat, defaultLng);
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      } else {
        if (!isMounted) return;
        setLocating(false);
        const defaultLat = 19.076;
        const defaultLng = 72.8777;
        setUserPos([defaultLat, defaultLng]);
        map.setView([defaultLat, defaultLng], 14);
        addHospitals(defaultLat, defaultLng);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (map) {
        map.remove();
      }
      mapInstance.current = null;
    };
  }, []);

  const handleHospitalSelect = (h: Hospital) => {
    setSelectedHospital(h);
    if (mapInstance.current) {
      mapInstance.current.setView([h.lat, h.lng], 15);
      const marker = markersRef.current[h.name];
      if (marker) {
        marker.openPopup();
      }
    }
  };

  const handleRecenter = () => {
    if (userPos && mapInstance.current) {
      mapInstance.current.setView(userPos, 14);
    }
  };

  // Filter & Search Logic
  const filteredHospitals = hospitalsList
    .filter((h) => {
      const matchesSearch = 
        h.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        h.specialties.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase())) ||
        h.address.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesBeds = !filterBeds || h.beds > 0;
      
      const matchesSpecialty = 
        filterSpecialty === "All" || 
        h.specialties.some(s => s.toLowerCase() === filterSpecialty.toLowerCase());
      
      return matchesSearch && matchesBeds && matchesSpecialty;
    })
    .map((h) => ({
      ...h,
      distance: userPos ? calculateDistance(userPos[0], userPos[1], h.lat, h.lng) : 0
    }))
    .sort((a, b) => a.distance - b.distance);

  return (
    <div className="relative flex flex-col lg:flex-row h-auto lg:h-[650px] w-full rounded-3xl border border-slate-200/80 bg-white/70 backdrop-blur-md shadow-2xl overflow-hidden transition-all duration-300">
      
      {/* Geolocation Loading Overlay */}
      {locating && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 backdrop-blur-md">
          <div className="flex flex-col items-center gap-4 rounded-3xl bg-white p-8 shadow-2xl border border-slate-100 max-w-sm text-center">
            <div className="relative flex items-center justify-center">
              <div className="h-16 w-16 animate-ping rounded-full bg-teal/10 absolute" />
              <div className="h-12 w-12 rounded-full border-2 border-teal border-t-transparent animate-spin flex items-center justify-center">
                <Compass className="h-5 w-5 text-teal animate-pulse" />
              </div>
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-800">Geolocating Patient...</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                We are securing your GPS location to display real-time coordinates, live beds, and emergency routes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* LEFT SIDEBAR: List and Filters */}
      <div className="w-full lg:w-[400px] h-[400px] lg:h-full border-b lg:border-b-0 lg:border-r border-slate-200/80 flex flex-col bg-slate-50/60 shrink-0">
        
        {/* Sidebar Header: Search and Filter Control */}
        <div className="p-4 bg-white border-b border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </span>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 font-mono">
                Command Console
              </h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 font-mono">
              Live Network
            </span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by specialty, location or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 placeholder:text-slate-400 pl-9 pr-8 py-2 rounded-xl text-xs outline-none border border-slate-200 focus:border-teal focus:bg-white transition-all font-semibold"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-2.5 hover:text-slate-700 text-slate-400"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filters Toggle Row */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <button
              onClick={() => setFilterBeds(!filterBeds)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold transition duration-200 cursor-pointer ${
                filterBeds 
                  ? "bg-teal-50 border-teal/30 text-teal" 
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <BedDouble className="h-3.5 w-3.5" />
              <span>Available Beds Only</span>
            </button>

            <div className="flex items-center gap-1.5 text-slate-400">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="font-bold text-[10px] uppercase font-mono">
                {filteredHospitals.length} Found
              </span>
            </div>
          </div>

          {/* Specialty Horizontal Pills Scroll */}
          <div className="flex gap-2 overflow-x-auto pt-1 pb-1 scrollbar-none whitespace-nowrap mask-gradient-r">
            {specialties.map((spec) => (
              <button
                key={spec}
                onClick={() => setFilterSpecialty(spec)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer border ${
                  filterSpecialty === spec
                    ? "bg-[#0d9488] text-white border-[#0d9488] shadow-sm shadow-teal-500/20"
                    : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {spec}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable list of hospitals */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          {filteredHospitals.length > 0 ? (
            filteredHospitals.map((h) => {
              const isSelected = selectedHospital?.name === h.name;
              const hasBeds = h.beds > 0;

              return (
                <div
                  key={h.name}
                  onClick={() => handleHospitalSelect(h)}
                  className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "border-teal bg-teal-50/20 shadow-md shadow-teal-500/5 ring-1 ring-teal/30"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-0.5">
                      <h4 className={`text-xs font-bold leading-tight transition duration-200 ${isSelected ? "text-teal" : "text-slate-800"}`}>
                        {h.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium">{h.address}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded text-[9px] font-bold text-amber-700 shrink-0">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      <span>{h.rating}</span>
                    </div>
                  </div>

                  {/* Bed stats & details */}
                  <div className="grid grid-cols-2 gap-2 my-3">
                    <div className={`p-1.5 rounded-xl border flex items-center justify-between text-[10px] font-bold ${
                      hasBeds ? "bg-emerald-50/50 border-emerald-100 text-emerald-800" : "bg-red-50/50 border-red-100 text-red-800"
                    }`}>
                      <span className="flex items-center gap-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${hasBeds ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                        Beds
                      </span>
                      <span>{h.beds}</span>
                    </div>
                    <div className="p-1.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-[10px] font-bold text-slate-700">
                      <span>ICU</span>
                      <span>{h.icuBeds}</span>
                    </div>
                  </div>

                  {/* Specialty Tags */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {h.specialties.map((s) => (
                      <span 
                        key={s} 
                        className={`rounded-md px-1.5 py-0.5 text-[8px] font-bold ${
                          isSelected 
                            ? "bg-teal/10 text-teal" 
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {s}
                      </span>
                    ))}
                  </div>

                  {/* Footer details: distance & actions */}
                  <div className="border-t border-slate-100 pt-3 mt-1 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                      <MapPin className="h-3.5 w-3.5 text-teal" />
                      <span>{h.distance} km away</span>
                    </div>

                    <ChevronRight className={`h-4 w-4 transition duration-300 ${isSelected ? "text-teal translate-x-1" : "text-slate-300"}`} />
                  </div>

                  {/* Expanded active action drawer */}
                  {isSelected && (
                    <div className="border-t border-slate-100/60 pt-3 mt-3 grid grid-cols-2 gap-2 animate-fade-up">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-2 text-[10px] font-black transition duration-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        <span>Navigate</span>
                      </a>
                      <a
                        href={`tel:${h.phone}`}
                        className="flex items-center justify-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl py-2 text-[10px] font-black transition duration-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="h-3.5 w-3.5 text-teal" />
                        <span>Call</span>
                      </a>
                    </div>
                  )}

                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <SlidersHorizontal className="h-10 w-10 text-slate-300 stroke-1" />
              <div>
                <p className="text-xs font-bold text-slate-700">No Hospitals Found</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                  Try adjusting your search terms or filters to locate other connected hospitals.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE: Map */}
      <div className="flex-1 h-[350px] lg:h-full relative select-none">
        
        {/* Floating Header info overlay */}
        <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-1.5 pointer-events-none">
          <div className="flex items-center gap-2 bg-slate-900/90 text-white rounded-full px-3.5 py-1.5 shadow-xl border border-white/10 backdrop-blur-sm">
            <Activity className="h-3.5 w-3.5 text-teal animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-wider font-mono">
              Live Satellite Overlay
            </span>
          </div>
        </div>

        {/* Floating Right Actions Overlay */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          {userPos && (
            <button
              onClick={handleRecenter}
              title="Recenter on My Location"
              className="h-10 w-10 rounded-full bg-white hover:bg-slate-50 text-slate-700 shadow-xl border border-slate-200 flex items-center justify-center cursor-pointer transition active:scale-95"
            >
              <Compass className="h-5 w-5 text-teal" />
            </button>
          )}
        </div>

        <div ref={mapRef} className="h-full w-full" />
      </div>
      
    </div>
  );
}
