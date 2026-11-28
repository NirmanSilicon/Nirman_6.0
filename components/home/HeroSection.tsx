"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  Search, 
  MapPin, 
  Activity, 
  ShieldCheck, 
  Clock, 
  HeartPulse, 
  Brain, 
  Droplet, 
  Wind, 
  HelpCircle,
  Phone
} from "lucide-react";

export function HeroSection() {
  const [searchTab, setSearchTab] = useState<"all" | "hospitals" | "categories">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const careCategories = [
    { name: "Acute Chest Pain & Cardiac Alert", query: "Chest Pain" },
    { name: "Stroke Signs (FAST Protocol)", query: "Stroke Symptoms" },
    { name: "Trauma & Major Bleeding", query: "Serious Bleeding" },
    { name: "Severe Respiratory Distress", query: "Severe Breathing" },
    { name: "Not Sure / Other Symptoms (Custom Description)", query: "Not Sure / Other Emergency" },
  ];

  return (
    <section className="relative pt-6 pb-20 md:pt-10 md:pb-24 overflow-hidden bg-[#FFF6F2]">
      {/* Visual background accents using the 60-30-10 palette */}
      <div className="absolute top-0 right-1/4 -z-10 w-[550px] h-[550px] bg-[#3B62AB]/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-48 left-10 -z-10 w-96 h-96 bg-[#DAE9C6]/60 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* TOP SEARCH CONTAINER — Styled like Screenshot 1 top header */}
        <div className="bg-[#FFFBF9] border border-[#F3E5DD] rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            {/* Left Tabs */}
            <div className="md:col-span-3 border-b md:border-b-0 md:border-r border-[#F3E5DD] pb-4 md:pb-0 md:pr-6 space-y-2">
              <button
                onClick={() => setSearchTab("all")}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold text-left transition-all ${
                  searchTab === "all" ? "bg-[#DAE9C6] text-[#2C471E]" : "text-slate-600 hover:bg-[#FFF6F2]"
                }`}
              >
                <Search className="w-3.5 h-3.5 text-[#3B62AB]" />
                <span>All Emergency Search</span>
              </button>
              <button
                onClick={() => setSearchTab("hospitals")}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold text-left transition-all ${
                  searchTab === "hospitals" ? "bg-[#DAE9C6] text-[#2C471E]" : "text-slate-600 hover:bg-[#FFF6F2]"
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-[#3B62AB]" />
                <span>Bhubaneswar Hospitals</span>
              </button>
              <button
                onClick={() => setSearchTab("categories")}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold text-left transition-all ${
                  searchTab === "categories" ? "bg-[#DAE9C6] text-[#2C471E]" : "text-slate-600 hover:bg-[#FFF6F2]"
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-[#3B62AB]" />
                <span>5 Emergency Categories</span>
              </button>
            </div>

            {/* Right Search Input */}
            <div className="md:col-span-9 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#1A2433]">
                  Search Bhubaneswar Emergency Network
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Direct patient pre-arrival access
                </span>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3B62AB]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="What emergency care can we help you find? (e.g. Chest pain, AIIMS, Stroke signs)..."
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border border-[#F3E5DD] text-sm text-[#1A2433] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3B62AB]/30"
                  />
                </div>
                <Link
                  href={searchQuery ? `/start?q=${encodeURIComponent(searchQuery)}` : "/start"}
                  className="px-8 py-3.5 rounded-2xl bg-[#DAE9C6] text-[#2C471E] hover:bg-[#cde0b5] font-extrabold text-sm flex items-center justify-center gap-2 transition-all shrink-0 border border-[#B8CE9E]"
                >
                  <span>Search</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

          </div>
        </div>

        {/* 3 LARGE ACTION CARDS — Exactly like Screenshot 1 middle cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Send Emergency Pre-Arrival Notice */}
          <Link
            href="/start"
            className="group relative bg-[#3B62AB] hover:bg-[#2C4C87] text-white p-7 sm:p-8 rounded-3xl shadow-lg shadow-[#3B62AB]/20 transition-all hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between min-h-[170px]"
          >
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider">
                Immediate Action
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Send Emergency Notice</span>
                <span className="text-[#DAE9C6] group-hover:translate-x-1 transition-transform">›</span>
              </h3>
              <p className="text-xs text-white/80 leading-relaxed">
                Choose from 5 categories or describe custom symptoms to prepare doctors before you arrive.
              </p>
            </div>
            <div className="pt-4 text-xs font-bold text-[#DAE9C6] flex items-center gap-1">
              <span>Alert emergency room in 3 taps</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Check Hospital Availability */}
          <Link
            href="/hospitals"
            className="group relative bg-[#3B62AB] hover:bg-[#2C4C87] text-white p-7 sm:p-8 rounded-3xl shadow-lg shadow-[#3B62AB]/20 transition-all hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between min-h-[170px]"
          >
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider">
                Real-Time Readiness
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Hospital Availability</span>
                <span className="text-[#DAE9C6] group-hover:translate-x-1 transition-transform">›</span>
              </h3>
              <p className="text-xs text-white/80 leading-relaxed">
                Check whether ICU beds, trauma bays, and ventilators are Available or Not Available across Bhubaneswar.
              </p>
            </div>
            <div className="pt-4 text-xs font-bold text-[#DAE9C6] flex items-center gap-1">
              <span>View live facility matrix</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 3: Track My Request */}
          <Link
            href="/track"
            className="group relative bg-[#3B62AB] hover:bg-[#2C4C87] text-white p-7 sm:p-8 rounded-3xl shadow-lg shadow-[#3B62AB]/20 transition-all hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between min-h-[170px]"
          >
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider">
                Live Status
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Track Active Alert</span>
                <span className="text-[#DAE9C6] group-hover:translate-x-1 transition-transform">›</span>
              </h3>
              <p className="text-xs text-white/80 leading-relaxed">
                See hospital acknowledgment, allocated trauma bay, and real-time preparation steps on your phone.
              </p>
            </div>
            <div className="pt-4 text-xs font-bold text-[#DAE9C6] flex items-center gap-1">
              <span>Track Case #GH-2026-X84</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

        </div>

        {/* EDITORIAL SPLIT SECTION — Styled like Screenshot 1 bottom layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start pt-6">
          
          {/* Left Column: Prestigious Editorial Headline & Copy */}
          <div className="lg:col-span-6 space-y-6">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#DAE9C6] text-[#2C471E] text-xs font-extrabold uppercase tracking-wider border border-[#B8CE9E]">
              <span className="w-2 h-2 rounded-full bg-[#3B62AB] animate-pulse" />
              <span>Patient & Family Emergency Coordination</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-[#1A2433] leading-[1.15] tracking-tight">
              Comprehensive emergency care, from immediate alert to hospital arrival
            </h1>

            <p className="text-slate-700 text-base sm:text-lg leading-relaxed font-sans">
              When a medical crisis strikes, don&apos;t arrive unannounced. GoldenHour allows patients and families to alert Bhubaneswar&apos;s leading emergency rooms in seconds, ensuring doctors, nurses, and resuscitation bays are mobilized the moment you reach the hospital door.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link
                href="/start"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full text-base font-bold text-white bg-[#3B62AB] hover:bg-[#2C4C87] shadow-lg shadow-[#3B62AB]/20 transition-all"
              >
                <span>Send Emergency Pre-Arrival Notice</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </Link>
              
              <a
                href="tel:112"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full text-base font-bold text-[#3B62AB] bg-white hover:bg-[#DAE9C6]/40 border border-[#3B62AB]/30 transition-all"
              >
                <Phone className="w-4 h-4 text-[#3B62AB] fill-current" />
                <span>Call 112 Ambulance</span>
              </a>
            </div>

            {/* Sub-note */}
            <div className="p-4 rounded-2xl bg-white border border-[#F3E5DD] flex items-start gap-3 text-xs text-slate-600">
              <div className="w-4 h-4 rounded-full bg-[#DAE9C6] text-[#2C471E] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                i
              </div>
              <p>
                <strong>Zero-install web platform:</strong> Works instantly on any mobile smartphone. No login, password, or registration required to notify emergency departments.
              </p>
            </div>

          </div>

          {/* Right Column: Clean Category Links with Horizontal Separators & Arrows (like Screenshot 1 right side) */}
          <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-8 border border-[#F3E5DD] shadow-sm space-y-6">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#F3E5DD]">
              <span className="text-xs font-black uppercase tracking-wider text-[#3B62AB]">
                5 Emergency Care Categories
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Tap to pre-notify team
              </span>
            </div>

            <div className="divide-y divide-[#F3E5DD]">
              {careCategories.map((c, i) => (
                <Link
                  key={i}
                  href={`/start?category=${encodeURIComponent(c.query)}`}
                  className="group py-4 flex items-center justify-between text-[#3B62AB] hover:text-[#2C4C87] transition-colors"
                >
                  <span className="text-base sm:text-lg font-serif font-bold text-[#3B62AB] group-hover:translate-x-1 transition-transform">
                    {c.name}
                  </span>
                  <span className="text-xl font-serif text-[#3B62AB] group-hover:translate-x-1.5 transition-transform">
                    ›
                  </span>
                </Link>
              ))}
            </div>

            <div className="pt-2 text-xs text-slate-500 flex items-center justify-between border-t border-[#F3E5DD]">
              <span>Not sure which one to choose?</span>
              <Link
                href="/start?category=Not+Sure+%2F+Other+Emergency"
                className="font-bold text-[#3B62AB] hover:underline"
              >
                Describe custom symptoms ›
              </Link>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
