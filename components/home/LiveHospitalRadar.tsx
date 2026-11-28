"use client";

import React, { useState } from "react";
import Link from "next/link";
import { GOLDENHOUR_HOSPITALS, Hospital } from "@/lib/data/mockStore";
import { Phone, MapPin, Check, AlertTriangle, ArrowUpRight, Bed, Activity, Clock, ShieldCheck } from "lucide-react";

export function LiveHospitalRadar() {
  const [hospitals] = useState<Hospital[]>(GOLDENHOUR_HOSPITALS);
  const [filterCategory, setFilterCategory] = useState<string>("All");

  const filteredHospitals = filterCategory === "All"
    ? hospitals
    : hospitals.filter(h => h.supportedCategories.includes(filterCategory as any));

  return (
    <section className="py-20 bg-[#FFF6F2]" id="radar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DAE9C6] text-[#2C471E] text-xs font-bold uppercase tracking-wider mb-3 border border-[#B8CE9E]">
              <Activity className="w-3.5 h-3.5 text-[#3B62AB]" />
              <span>Nearby Emergency Facilities</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#1A2433] tracking-tight">
              Hospital Availability in Bhubaneswar
            </h2>
            <p className="text-slate-700 text-sm mt-2">
              Check real-time facility readiness before traveling. We indicate whether emergency facilities are <strong>Available</strong> or <strong>Not Available</strong> without misleading bed counts.
            </p>
          </div>

          {/* Filter options */}
          <div className="flex flex-wrap gap-2">
            {["All", "Chest Pain", "Stroke Symptoms", "Serious Bleeding", "Severe Breathing", "Not Sure / Other Emergency"].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  filterCategory === cat
                    ? "bg-[#3B62AB] text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-[#DAE9C6]/50 border border-[#F3E5DD]"
                }`}
              >
                {cat === "Not Sure / Other Emergency" ? "Other Symptoms" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Hospital Cards Grid — Purely Patient View */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredHospitals.map((h) => {
            const isAccepting = h.status === "accepting";

            return (
              <div
                key={h.id}
                className="bg-white rounded-3xl p-7 border border-[#F3E5DD] shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6"
              >
                {/* Top Section */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#3B62AB] block mb-1">
                        {h.level}
                      </span>
                      <h3 className="text-xl font-serif font-bold text-[#1A2433]">
                        {h.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{h.address}</span>
                      </p>
                      <p className="text-xs text-[#3B62AB] font-semibold mt-0.5">
                        Landmark: {h.landmark}
                      </p>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 flex items-center gap-1.5 ${
                      isAccepting
                        ? "bg-[#DAE9C6] text-[#2C471E] border border-[#B8CE9E]"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${isAccepting ? "bg-[#3B62AB] animate-pulse" : "bg-amber-500"}`} />
                      {isAccepting ? "Accepting Patients" : "Limited Status"}
                    </span>
                  </div>

                  {/* Travel Distance & ETA */}
                  <div className="p-3 rounded-2xl bg-[#FFF6F2] border border-[#F3E5DD] flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Estimated Travel Distance:</span>
                    <span className="font-extrabold text-[#1A2433]">{h.distanceKm} km • {h.etaMinutes} driving</span>
                  </div>

                  {/* Facilities Availability Matrix (NO NUMBERS! ONLY AVAILABLE / NOT AVAILABLE) */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Emergency Facilities Status
                    </span>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-[#FFF6F2] border border-[#F3E5DD] flex items-center justify-between">
                        <span className="text-slate-700">Emergency Beds:</span>
                        <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          h.availability.emergencyBeds === "Available"
                            ? "text-[#2C471E] bg-[#DAE9C6]"
                            : "text-rose-700 bg-rose-50"
                        }`}>
                          {h.availability.emergencyBeds}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#FFF6F2] border border-[#F3E5DD] flex items-center justify-between">
                        <span className="text-slate-700">ICU Beds:</span>
                        <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          h.availability.icuBeds === "Available"
                            ? "text-[#2C471E] bg-[#DAE9C6]"
                            : "text-rose-700 bg-rose-50"
                        }`}>
                          {h.availability.icuBeds}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#FFF6F2] border border-[#F3E5DD] flex items-center justify-between">
                        <span className="text-slate-700">Ventilators:</span>
                        <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          h.availability.ventilators === "Available"
                            ? "text-[#2C471E] bg-[#DAE9C6]"
                            : "text-rose-700 bg-rose-50"
                        }`}>
                          {h.availability.ventilators}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#FFF6F2] border border-[#F3E5DD] flex items-center justify-between">
                        <span className="text-slate-700">High-Flow O2:</span>
                        <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          h.availability.oxygenSupport === "Available"
                            ? "text-[#2C471E] bg-[#DAE9C6]"
                            : "text-rose-700 bg-rose-50"
                        }`}>
                          {h.availability.oxygenSupport}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-4 border-t border-[#F3E5DD] flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{h.lastUpdated}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${h.emergencyPhone}`}
                      className="px-3.5 py-2 rounded-xl border border-[#F3E5DD] text-[#1A2433] font-bold hover:bg-[#FFF6F2] flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#3B62AB]" />
                      <span>{h.emergencyPhone}</span>
                    </a>

                    <Link
                      href={`/start?hospitalId=${h.id}`}
                      className="px-4 py-2 rounded-xl bg-[#3B62AB] hover:bg-[#2C4C87] text-white font-bold flex items-center gap-1 shadow-xs"
                    >
                      <span>Alert Hospital</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
