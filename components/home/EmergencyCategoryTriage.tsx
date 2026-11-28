"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HeartPulse, Brain, Droplet, Wind, HelpCircle, ArrowRight, Check, Stethoscope } from "lucide-react";
import { EmergencyCategoryType } from "@/lib/data/mockStore";

export function EmergencyCategoryTriage() {
  const [activeCategory, setActiveCategory] = useState<EmergencyCategoryType>("Chest Pain");
  const [customInputPreview, setCustomInputPreview] = useState<string>("");

  const categories = [
    {
      id: "Chest Pain" as EmergencyCategoryType,
      name: "Acute Chest Pain",
      icon: HeartPulse,
      badge: "Cardiac Alert",
      color: "bg-[#3B62AB] text-white",
      symptoms: [
        "Retrosternal crushing pressure or tightness > 20 mins",
        "Pain radiating to left arm, neck, or jaw",
        "Diaphoresis (cold clammy sweating), nausea, lightheadedness",
      ],
      patientGuidance: "Prepares Cardiac Cath Lab and 12-lead ECG resuscitation bay for immediate reception upon arrival.",
    },
    {
      id: "Stroke Symptoms" as EmergencyCategoryType,
      name: "Stroke Signs (FAST)",
      icon: Brain,
      badge: "Code Stroke",
      color: "bg-[#3B62AB] text-white",
      symptoms: [
        "Face drooping on one side (uneven smile)",
        "Arm drift / sudden weakness in one limb",
        "Speech difficulty (slurred, unable to repeat sentences)",
        "Time critical: Thrombolysis window is ≤ 4.5 hours from onset",
      ],
      patientGuidance: "Pre-clears CT scanner and alerts emergency stroke neurology team before you arrive.",
    },
    {
      id: "Serious Bleeding" as EmergencyCategoryType,
      name: "Trauma & Major Bleeding",
      icon: Droplet,
      badge: "Trauma Resus",
      color: "bg-[#3B62AB] text-white",
      symptoms: [
        "Uncontrolled pulsatile arterial hemorrhage",
        "High-velocity vehicular crash, penetrating wound, crush injury",
        "Signs of shock (pallor, rapid weak pulse, cold extremities)",
      ],
      patientGuidance: "Mobilizes trauma surgical bay, rapid blood warmer, and emergency uncrossmatched blood.",
    },
    {
      id: "Severe Breathing" as EmergencyCategoryType,
      name: "Severe Respiratory Distress",
      icon: Wind,
      badge: "Airway & ICU",
      color: "bg-[#3B62AB] text-white",
      symptoms: [
        "Inability to speak complete sentences without gasping",
        "Cyanosis (bluish tint around lips or fingernails)",
        "Severe acute asthma attack, acute SpO2 drop, choking sensation",
      ],
      patientGuidance: "Readies High-Flow Oxygen (HFNC), ventilators, and critical care medical bay.",
    },
    {
      id: "Not Sure / Other Emergency" as EmergencyCategoryType,
      name: "Not Sure / Other Symptoms",
      icon: HelpCircle,
      badge: "General Acute Intake",
      color: "bg-[#DAE9C6] text-[#2C471E]",
      symptoms: [
        "Severe unexplained abdominal pain, acute colic, or vomiting blood",
        "High fever with seizures, sudden altered consciousness, or fainting",
        "Severe allergic reactions (anaphylaxis), poisoning, or acute pediatric crisis",
      ],
      patientGuidance: "Allows you to describe symptoms in your own words. The hospital triage team receives your notes directly.",
    },
  ];

  const currentCategoryData = categories.find((c) => c.id === activeCategory)!;

  return (
    <section className="py-20 bg-white border-t border-b border-[#F3E5DD]" id="categories">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#DAE9C6] text-[#2C471E] text-xs font-bold uppercase tracking-wider mb-3 border border-[#B8CE9E]">
            <Stethoscope className="w-3.5 h-3.5 text-[#3B62AB]" />
            <span>5 Emergency Categories for Patients</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#1A2433] tracking-tight">
            Select What You Are Experiencing
          </h2>
          <p className="text-slate-600 text-base mt-2 leading-relaxed">
            Choose the category that best matches the patient&apos;s symptoms. If you are unsure, select <strong>&quot;Not Sure / Other Symptoms&quot;</strong> to describe what is happening in your own words.
          </p>
        </div>

        {/* 5 Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`p-5 rounded-3xl border-2 text-left transition-all flex flex-col justify-between group ${
                  isSelected
                    ? "border-[#3B62AB] bg-[#FFF6F2] shadow-md ring-4 ring-[#3B62AB]/15"
                    : "border-[#F3E5DD] hover:border-[#3B62AB]/50 bg-[#FFF6F2]/40 hover:bg-white"
                } ${cat.id === "Not Sure / Other Emergency" ? "sm:col-span-2 lg:col-span-1 bg-[#DAE9C6]/20" : ""}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold shadow-xs ${
                      isSelected ? "bg-[#3B62AB] text-white" : "bg-[#DAE9C6] text-[#2C471E]"
                    }`}>
                      <Icon className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#3B62AB] bg-white px-2 py-0.5 rounded-full border border-[#F3E5DD]">
                      {cat.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-serif font-bold text-[#1A2433] group-hover:text-[#3B62AB] transition-colors">
                    {cat.name}
                  </h3>
                </div>

                <div className="mt-4 pt-3 border-t border-[#F3E5DD] flex items-center justify-between text-xs">
                  <span className={`font-semibold ${isSelected ? "text-[#3B62AB] font-bold" : "text-slate-500"}`}>
                    {isSelected ? "Selected" : "View Details"}
                  </span>
                  <span className={`text-lg font-serif transition-transform ${isSelected ? "text-[#3B62AB] translate-x-1" : "text-slate-400"}`}>
                    ›
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Category Deep Dive Panel */}
        <div className="bg-[#FFF6F2] rounded-3xl p-6 sm:p-10 border border-[#F3E5DD] shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left: Symptoms Guide */}
            <div className="lg:col-span-6 space-y-5">
              <div className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#DAE9C6] border border-[#B8CE9E] text-[#2C471E]">
                Symptom Reference
              </div>
              <h3 className="text-2xl font-serif font-bold text-[#1A2433]">
                {currentCategoryData.name}
              </h3>

              <ul className="space-y-2.5 text-sm text-slate-700">
                {currentCategoryData.symptoms.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#DAE9C6] text-[#2C471E] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>

              <div className="p-4 rounded-2xl bg-white border border-[#F3E5DD] text-xs text-slate-700 space-y-1">
                <span className="font-bold text-[#3B62AB] uppercase tracking-wider block">What the Hospital Prepares</span>
                <p>{currentCategoryData.patientGuidance}</p>
              </div>

              <div className="pt-2">
                <Link
                  href={`/start?category=${encodeURIComponent(activeCategory)}`}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider text-white bg-[#3B62AB] hover:bg-[#2C4C87] shadow-md shadow-[#3B62AB]/20 transition-all hover:scale-105"
                >
                  <span>Choose &quot;{activeCategory}&quot; in Pre-Arrival Flow</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right Panel */}
            <div className="lg:col-span-6 bg-white rounded-2xl p-6 sm:p-8 border border-[#F3E5DD] shadow-xs space-y-4">
              {activeCategory === "Not Sure / Other Emergency" ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-[#3B62AB]" />
                    <h4 className="text-base font-serif font-bold text-[#1A2433]">
                      Describe the Emergency in Your Own Words
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    If the situation doesn&apos;t fit the four standard categories, write a brief description below. This information will be sent directly to the receiving hospital&apos;s triage desk.
                  </p>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#1A2433] uppercase tracking-wider block">
                      Patient Symptoms Description (Preview)
                    </label>
                    <textarea
                      rows={3}
                      value={customInputPreview}
                      onChange={(e) => setCustomInputPreview(e.target.value)}
                      placeholder="e.g. 8-year-old child with sudden high fever, vomiting, and brief seizure episode..."
                      className="w-full px-4 py-3 rounded-2xl border border-[#F3E5DD] bg-[#FFF6F2] text-sm text-[#1A2433] focus:outline-none focus:ring-2 focus:ring-[#3B62AB]"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#DAE9C6]/50 border border-[#DAE9C6] text-xs text-[#2C471E] space-y-1">
                    <span className="font-bold block">Patient Tip:</span>
                    <span>No medical terms needed. Write what you observe (e.g. pain location, onset time, consciousness).</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#F3E5DD]">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Hospital Facility Status for {activeCategory}
                    </span>
                    <span className="text-xs font-bold text-[#2C471E] bg-[#DAE9C6] px-2.5 py-0.5 rounded-full">
                      Live Verification
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="p-3.5 rounded-2xl bg-[#FFF6F2] border border-[#F3E5DD] flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">Emergency Resuscitation Bay</span>
                      <span className="font-bold text-[#2C471E] bg-[#DAE9C6] px-2.5 py-1 rounded-md">Available</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#FFF6F2] border border-[#F3E5DD] flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">Intensive Care Unit (ICU)</span>
                      <span className="font-bold text-[#2C471E] bg-[#DAE9C6] px-2.5 py-1 rounded-md">Available</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#FFF6F2] border border-[#F3E5DD] flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">Specialist Emergency Team</span>
                      <span className="font-bold text-[#2C471E] bg-[#DAE9C6] px-2.5 py-1 rounded-md">Available</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#FFF6F2] border border-[#F3E5DD] flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">High-Flow Oxygen Support</span>
                      <span className="font-bold text-[#2C471E] bg-[#DAE9C6] px-2.5 py-1 rounded-md">Available</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 pt-1">
                    Confirmed by participating hospital telemetry. No specific bed numbers are disclosed to prevent outdated guarantees.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
