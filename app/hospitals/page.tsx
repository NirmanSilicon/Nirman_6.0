"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getStoredHospitals, Hospital } from "@/lib/data/mockStore";
import { MapPin, Phone, ArrowUpRight, Bed, ShieldCheck, Activity, Stethoscope, Navigation, CheckCircle2, Clock } from "lucide-react";

export default function HospitalsPage() {
  const [hospitalsList, setHospitalsList] = useState<Hospital[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<Hospital>(getStoredHospitals()[0] || {
    id: "hosp-aiims-bbsr",
    name: "AIIMS Bhubaneswar",
    shortName: "AIIMS",
    address: "",
    district: "",
    landmark: "",
    distanceKm: 3.4,
    etaMinutes: "8 - 11 mins",
    emergencyPhone: "",
    status: "accepting",
    level: "Level 1 Apex Emergency & Trauma",
    availability: {
      emergencyBeds: "Available",
      icuBeds: "Available",
      ventilators: "Available",
      oxygenSupport: "Available",
      bloodBank: "Available",
      cardiacCathLab: "Available",
      strokeCTUnit: "Available",
      traumaBay: "Available",
    },
    supportedCategories: ["Chest Pain", "Stroke Symptoms", "Serious Bleeding", "Severe Breathing", "Not Sure / Other Emergency"],
    lastUpdated: "Recently updated",
  });

  const loadHospitals = () => {
    const list = getStoredHospitals();
    setHospitalsList(list);
    const refreshed = list.find(h => h.id === selectedHospital.id) || list[0];
    if (refreshed) {
      setSelectedHospital(refreshed);
    }
  };

  useEffect(() => {
    loadHospitals();
    const handleUpdate = () => loadHospitals();
    window.addEventListener("goldenhour_store_updated", handleUpdate);
    return () => window.removeEventListener("goldenhour_store_updated", handleUpdate);
  }, []);

  return (
    <div className="py-12 bg-[#FFF6F2] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#3B62AB]">
            EMERGENCY FACILITIES DIRECTORY • BHUBANESWAR
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1A2433] mt-1 tracking-tight">
            Emergency Hospitals & Availability
          </h1>
          <p className="text-slate-700 text-sm mt-1">
            Verified emergency departments with real-time facility readiness. Availability is reported as <strong>Available</strong> or <strong>Not Available</strong> so you know what is ready before you travel.
          </p>
        </div>

        {/* Two-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Simulated Radar Map */}
          <div className="lg:col-span-6 bg-white rounded-3xl p-5 border border-[#F3E5DD] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-[#1A2433] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#3B62AB]" />
                Hospital Map Radar
              </span>
              <span className="text-xs text-slate-500">Bhubaneswar Urban Area</span>
            </div>

            {/* Map Canvas */}
            <div className="relative w-full h-[460px] bg-[#FFF6F2] rounded-2xl overflow-hidden border border-[#F3E5DD]">
              <div 
                className="absolute inset-0 opacity-40 bg-[radial-gradient(#3B62AB_1px,transparent_1px)] [background-size:16px_16px]"
              />

              <svg className="absolute inset-0 w-full h-full stroke-slate-300 fill-none" strokeWidth="2">
                <path d="M 0 100 Q 200 160 400 90 T 800 180" strokeWidth="5" stroke="#3B62AB" opacity="0.3" />
                <path d="M 120 0 L 210 460" strokeWidth="6" stroke="#DAE9C6" opacity="0.6" />
                <path d="M 60 260 L 400 230" strokeWidth="3" stroke="#F3E5DD" />
                <circle cx="210" cy="220" r="140" stroke="#3B62AB" strokeWidth="1" strokeDasharray="4 4" fill="rgba(59, 98, 171, 0.05)" />
              </svg>

              <div className="absolute top-4 left-4 flex flex-col bg-white rounded-lg shadow-sm border border-[#F3E5DD] text-xs font-bold text-[#1A2433]">
                <button className="px-2.5 py-1.5 hover:bg-[#FFF6F2] border-b border-[#F3E5DD]">+</button>
                <button className="px-2.5 py-1.5 hover:bg-[#FFF6F2]">−</button>
              </div>

              {/* Hospital Markers */}
              {(hospitalsList.length > 0 ? hospitalsList : getStoredHospitals()).map((h, i) => {
                const isSelected = selectedHospital.id === h.id;
                const positions = [
                  { top: "35%", left: "42%" },
                  { top: "52%", left: "55%" },
                  { top: "68%", left: "38%" },
                  { top: "45%", left: "70%" },
                ];
                const pos = positions[i] || { top: "50%", left: "50%" };

                return (
                  <button
                    key={h.id}
                    onClick={() => setSelectedHospital(h)}
                    style={{ top: pos.top, left: pos.left }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 group transition-transform ${
                      isSelected ? "scale-125 z-30" : "scale-100 z-10 hover:scale-110"
                    }`}
                  >
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg text-xs font-bold whitespace-nowrap ${
                      isSelected
                        ? "bg-[#3B62AB] text-white ring-4 ring-[#3B62AB]/30"
                        : "bg-white text-[#1A2433] border border-[#F3E5DD]"
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-[#DAE9C6]" : "bg-[#3B62AB]"}`} />
                      <span>{h.shortName}</span>
                    </div>
                  </button>
                );
              })}

              <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] text-slate-500 border border-[#F3E5DD]">
                GoldenHour Patient Network | Bhubaneswar
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-3 text-center">
              Distances calculated based on road routes in Bhubaneswar.
            </p>
          </div>

          {/* Right Column: Selected Hospital Details (PURELY WHAT PATIENT NEEDS TO SEE!) */}
          <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-8 border border-[#F3E5DD] shadow-sm space-y-6">
            
            {/* Header info */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#3B62AB]">
                  {selectedHospital.level}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  selectedHospital.status === "accepting"
                    ? "bg-[#DAE9C6] text-[#2C471E] border border-[#B8CE9E]"
                    : "bg-amber-100 text-amber-800 border border-amber-200"
                }`}>
                  <span className={`w-2 h-2 rounded-full ${selectedHospital.status === "accepting" ? "bg-[#3B62AB] animate-pulse" : "bg-amber-500"}`} />
                  {selectedHospital.status === "accepting" ? "Accepting Patients" : "Limited Status"}
                </span>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#DAE9C6] text-[#2C471E] flex items-center justify-center shrink-0">
                  <Activity className="w-7 h-7 stroke-[2.2] text-[#3B62AB]" />
                </div>
                <div>
                  <h2 className="text-2xl font-serif font-bold text-[#1A2433] tracking-tight">
                    {selectedHospital.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{selectedHospital.address}</span>
                  </p>
                  <p className="text-xs text-[#3B62AB] font-semibold mt-1">
                    Landmark: {selectedHospital.landmark}
                  </p>
                </div>
              </div>
            </div>

            {/* Travel Time & Distance */}
            <div className="p-3.5 rounded-2xl bg-[#FFF6F2] border border-[#F3E5DD] flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Estimated Travel Distance:</span>
              <span className="font-extrabold text-[#1A2433] text-sm">
                {selectedHospital.distanceKm} km • {selectedHospital.etaMinutes} travel time
              </span>
            </div>

            {/* Facilities Availability Matrix (ONLY Available / Not Available — NO NUMBERS!) */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Hospital Emergency Facilities Status
              </span>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-[#FFF6F2] border border-[#F3E5DD] flex items-center justify-between">
                  <span className="text-slate-700 font-medium">Emergency Beds:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                    selectedHospital.availability.emergencyBeds === "Available"
                      ? "text-[#2C471E] bg-[#DAE9C6]"
                      : "text-rose-700 bg-rose-50"
                  }`}>
                    {selectedHospital.availability.emergencyBeds}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#FFF6F2] border border-[#F3E5DD] flex items-center justify-between">
                  <span className="text-slate-700 font-medium">ICU Beds:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                    selectedHospital.availability.icuBeds === "Available"
                      ? "text-[#2C471E] bg-[#DAE9C6]"
                      : "text-rose-700 bg-rose-50"
                  }`}>
                    {selectedHospital.availability.icuBeds}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#FFF6F2] border border-[#F3E5DD] flex items-center justify-between">
                  <span className="text-slate-700 font-medium">Ventilators:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                    selectedHospital.availability.ventilators === "Available"
                      ? "text-[#2C471E] bg-[#DAE9C6]"
                      : "text-rose-700 bg-rose-50"
                  }`}>
                    {selectedHospital.availability.ventilators}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#FFF6F2] border border-[#F3E5DD] flex items-center justify-between">
                  <span className="text-slate-700 font-medium">High-Flow O2:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                    selectedHospital.availability.oxygenSupport === "Available"
                      ? "text-[#2C471E] bg-[#DAE9C6]"
                      : "text-rose-700 bg-rose-50"
                  }`}>
                    {selectedHospital.availability.oxygenSupport}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#FFF6F2] border border-[#F3E5DD] flex items-center justify-between">
                  <span className="text-slate-700 font-medium">Blood Bank:</span>
                  <span className="font-bold text-[#2C471E] bg-[#DAE9C6] px-2 py-0.5 rounded text-[11px]">
                    {selectedHospital.availability.bloodBank}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#FFF6F2] border border-[#F3E5DD] flex items-center justify-between">
                  <span className="text-slate-700 font-medium">Cardiac Cath Lab:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                    selectedHospital.availability.cardiacCathLab === "Available"
                      ? "text-[#2C471E] bg-[#DAE9C6]"
                      : "text-rose-700 bg-rose-50"
                  }`}>
                    {selectedHospital.availability.cardiacCathLab}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons for Patient */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href={`/start?hospitalId=${selectedHospital.id}`}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider text-white bg-[#3B62AB] hover:bg-[#2C4C87] shadow-md shadow-[#3B62AB]/20 transition-all hover:scale-105"
              >
                <span>Send Pre-Arrival Notice</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>

              <a
                href={`tel:${selectedHospital.emergencyPhone}`}
                className="inline-flex items-center gap-1.5 px-5 py-3 rounded-full text-xs font-bold text-slate-700 hover:bg-[#FFF6F2] border border-[#F3E5DD] transition-colors"
              >
                <Phone className="w-4 h-4 text-[#3B62AB]" />
                <span>Call Hospital ({selectedHospital.emergencyPhone})</span>
              </a>
            </div>

            <p className="text-[11px] text-slate-500">
              Information indicates facility availability. For emergency ambulance transportation, always dial 112.
            </p>

          </div>

        </div>

      </div>
    </div>
  );
}
