"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  getStoredHospitals, 
  createNewEmergencyAlert, 
  GOLDENHOUR_HOSPITALS,
  Hospital, 
  EmergencyCategoryType 
} from "@/lib/data/mockStore";
import { 
  HeartPulse, 
  Brain, 
  Droplet, 
  Wind, 
  HelpCircle, 
  MapPin, 
  Navigation, 
  Check, 
  ArrowRight, 
  Phone, 
  Volume2, 
  VolumeX, 
  Languages, 
  CheckCircle2, 
  AlertTriangle 
} from "lucide-react";

function PatientStartContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory = (searchParams.get("category") as EmergencyCategoryType) || "Chest Pain";

  // Language state (English / Odia / Hindi)
  const [lang, setLang] = useState<"en" | "od" | "hi">("en");

  // Emergency Categories state
  const [selectedCategory, setSelectedCategory] = useState<EmergencyCategoryType>(initialCategory);
  const [customDescription, setCustomDescription] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("Patia Chowk, near KIIT Square");
  const [isReadingAloud, setIsReadingAloud] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Urban Landmark locations in Bhubaneswar
  const locations = [
    { name: "Patia Chowk, near KIIT Square", zone: "Bhubaneswar North" },
    { name: "Khandagiri Square, NH-16", zone: "Bhubaneswar West" },
    { name: "Saheed Nagar / Vani Vihar", zone: "Bhubaneswar Central" },
    { name: "Nayapalli / Jayadev Vihar", zone: "Bhubaneswar Central" },
    { name: "Old Town / Lingaraj Temple Area", zone: "Bhubaneswar South" },
  ];

  const [allHospitals, setAllHospitals] = useState<Hospital[]>([]);

  useEffect(() => {
    const list = getStoredHospitals();
    setAllHospitals(list);
  }, []);

  // Matched hospitals filtered by category
  const suitableHospitals = allHospitals.length > 0 
    ? allHospitals.filter(h => h.supportedCategories.includes(selectedCategory) && h.status !== "divert")
    : getStoredHospitals().filter(h => h.supportedCategories.includes(selectedCategory) && h.status !== "divert");

  const [selectedHospitalId, setSelectedHospitalId] = useState<string>("");

  useEffect(() => {
    if (suitableHospitals.length > 0 && !suitableHospitals.some(h => h.id === selectedHospitalId)) {
      setSelectedHospitalId(suitableHospitals[0].id);
    }
  }, [suitableHospitals, selectedHospitalId]);

  const matchedHospital = suitableHospitals.find(h => h.id === selectedHospitalId) || suitableHospitals[0];

  // Read Aloud / TTS Accessibility Feature
  const handleReadAloud = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Text-to-speech is not supported on this browser.");
      return;
    }

    if (isReadingAloud) {
      window.speechSynthesis.cancel();
      setIsReadingAloud(false);
      return;
    }

    const textToSpeak = `GoldenHour Emergency Intake. Selected emergency category: ${selectedCategory}. Location: ${selectedLocation}. Recommended hospital: ${matchedHospital?.name || "AIIMS Trauma Centre"}. Travel time estimate: ${matchedHospital?.etaMinutes || "10 minutes"}. Facilities like emergency beds and intensive care are confirmed available. Click dispatch to notify the hospital emergency room now.`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.95;
    utterance.onend = () => setIsReadingAloud(false);
    utterance.onerror = () => setIsReadingAloud(false);
    window.speechSynthesis.speak(utterance);
    setIsReadingAloud(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // If "Not Sure" selected, ensure description is provided
    if (selectedCategory === "Not Sure / Other Emergency" && !customDescription.trim()) {
      alert("Please provide a brief description of your symptoms so the hospital can prepare.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const createdAlert = createNewEmergencyAlert({
        category: selectedCategory,
        customDescription: selectedCategory === "Not Sure / Other Emergency" ? customDescription : undefined,
        patientLocation: selectedLocation,
        hospitalId: selectedHospitalId || matchedHospital?.id || "hosp-aiims-bbsr",
      });
      router.push(`/track?id=${createdAlert.id}`);
    }, 600);
  };

  const categories = [
    {
      id: "Chest Pain" as EmergencyCategoryType,
      name: lang === "od" ? "ଛାତି ଯନ୍ତ୍ରଣା (Chest Pain)" : lang === "hi" ? "सीने में दर्द (Chest Pain)" : "Acute Chest Pain",
      desc: "Retrosternal crushing pain, left arm radiation, sweating",
      icon: HeartPulse,
      badge: "Cardiac",
      color: "border-[#3B62AB] bg-[#FFF6F2] text-[#1A2433]",
      iconBg: "bg-[#DAE9C6] text-[#2C471E]",
    },
    {
      id: "Stroke Symptoms" as EmergencyCategoryType,
      name: lang === "od" ? "ଷ୍ଟ୍ରୋକ୍ ଲକ୍ଷଣ (Stroke - FAST)" : lang === "hi" ? "स्ट्रोक के लक्षण (Stroke)" : "Stroke Signs (FAST)",
      desc: "Face drooping, arm weakness, slurred speech",
      icon: Brain,
      badge: "Code Stroke",
      color: "border-[#3B62AB] bg-[#FFF6F2] text-[#1A2433]",
      iconBg: "bg-[#DAE9C6] text-[#2C471E]",
    },
    {
      id: "Serious Bleeding" as EmergencyCategoryType,
      name: lang === "od" ? "ଅତ୍ୟଧିକ ରକ୍ତସ୍ରାବ (Trauma)" : lang === "hi" ? "गंभीर रक्तस्राव (Trauma)" : "Trauma & Bleeding",
      desc: "Major uncontrolled hemorrhage, accident, deep wounds",
      icon: Droplet,
      badge: "Trauma",
      color: "border-[#3B62AB] bg-[#FFF6F2] text-[#1A2433]",
      iconBg: "bg-[#DAE9C6] text-[#2C471E]",
    },
    {
      id: "Severe Breathing" as EmergencyCategoryType,
      name: lang === "od" ? "ଶ୍ୱାସକ୍ରିୟାରେ କଷ୍ଟ (Breathing)" : lang === "hi" ? "सांस में कठिनाई (Breathing)" : "Severe Breathing",
      desc: "Unable to breathe or speak, gasping, severe asthma",
      icon: Wind,
      badge: "Airway",
      color: "border-[#3B62AB] bg-[#FFF6F2] text-[#1A2433]",
      iconBg: "bg-[#DAE9C6] text-[#2C471E]",
    },
    {
      id: "Not Sure / Other Emergency" as EmergencyCategoryType,
      name: lang === "od" ? "ଅନ୍ୟାନ୍ୟ ଲକ୍ଷଣ (Not Sure)" : lang === "hi" ? "अन्य लक्षण (Not Sure)" : "Not Sure / Other Emergency",
      desc: "Abdominal pain, seizures, burns, poisoning, or other symptoms",
      icon: HelpCircle,
      badge: "Custom Description",
      color: "border-[#3B62AB] bg-[#FFF6F2] text-[#1A2433]",
      iconBg: "bg-[#DAE9C6] text-[#2C471E]",
    },
  ];

  return (
    <div className="py-10 bg-[#FFF6F2] min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DAE9C6] text-[#2C471E] text-xs font-bold uppercase tracking-wider mb-2 border border-[#B8CE9E]">
              <span>Patient Emergency Form</span>
              <span>•</span>
              <span>Zero-Install</span>
            </div>
            <h1 className="text-3xl font-serif font-bold text-[#1A2433] tracking-tight">
              Pre-Arrival Emergency Notice
            </h1>
          </div>

          {/* Controls: Audio and Language */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReadAloud}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all ${
                isReadingAloud
                  ? "bg-[#DAE9C6] border-[#B8CE9E] text-[#2C471E] animate-pulse"
                  : "bg-white border-[#F3E5DD] text-slate-700 hover:bg-[#FFF6F2]"
              }`}
              title="Read aloud instructions"
            >
              {isReadingAloud ? <VolumeX className="w-3.5 h-3.5 text-[#3B62AB]" /> : <Volume2 className="w-3.5 h-3.5 text-[#3B62AB]" />}
              <span>{isReadingAloud ? "Stop" : "Read Aloud"}</span>
            </button>

            <div className="flex items-center bg-white p-1 rounded-full border border-[#F3E5DD] text-xs font-bold">
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-2.5 py-1 rounded-full transition-colors ${
                  lang === "en" ? "bg-[#3B62AB] text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang("od")}
                className={`px-2.5 py-1 rounded-full transition-colors ${
                  lang === "od" ? "bg-[#3B62AB] text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ଓଡ଼ିଆ
              </button>
              <button
                type="button"
                onClick={() => setLang("hi")}
                className={`px-2.5 py-1 rounded-full transition-colors ${
                  lang === "hi" ? "bg-[#3B62AB] text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                हिन्दी
              </button>
            </div>
          </div>
        </div>

        {/* Notice for Patient */}
        <div className="p-4 rounded-2xl bg-white border border-[#F3E5DD] text-xs text-slate-700 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-[#3B62AB] shrink-0" />
          <span>No login or personal identity required. You only share what is needed for the hospital to prepare.</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* STEP 1: Emergency Category Selection (5 OPTIONS!) */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F3E5DD] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">
                STEP 1 OF 3 • SELECT EMERGENCY TYPE
              </span>
              <span className="text-xs text-[#2C471E] font-bold bg-[#DAE9C6] px-2.5 py-0.5 rounded-full border border-[#B8CE9E]">
                5 Options Available
              </span>
            </div>

            <h2 className="text-xl font-serif font-bold text-[#1A2433]">
              What emergency are you reporting?
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      const currentList = allHospitals.length > 0 ? allHospitals : GOLDENHOUR_HOSPITALS;
                      const newSuitable = currentList.filter(h => h.supportedCategories.includes(cat.id));
                      if (newSuitable.length > 0 && !newSuitable.some(h => h.id === selectedHospitalId)) {
                        setSelectedHospitalId(newSuitable[0].id);
                      }
                    }}
                    className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? "border-[#3B62AB] ring-4 ring-[#3B62AB]/15 bg-[#FFF6F2] shadow-xs"
                        : "border-[#F3E5DD] hover:border-[#3B62AB]/40 bg-white"
                    } ${cat.id === "Not Sure / Other Emergency" ? "sm:col-span-2 bg-[#DAE9C6]/20" : ""}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cat.iconBg}`}>
                          <Icon className="w-5 h-5 stroke-[2.2]" />
                        </div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#3B62AB] bg-white px-2 py-0.5 rounded-full border border-[#F3E5DD]">
                          {cat.badge}
                        </span>
                      </div>
                      <h3 className="text-base font-serif font-bold text-[#1A2433]">
                        {cat.name}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {cat.desc}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#F3E5DD] flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        {cat.id === "Not Sure / Other Emergency" ? "Click to describe symptoms in words" : "Pre-mobilizes relevant bay"}
                      </span>
                      {isSelected ? (
                        <span className="text-xs font-bold text-[#3B62AB] flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 stroke-[3]" /> Selected
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">Select</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* CUSTOM DESCRIPTION FIELD (Active when "Not Sure / Other Emergency" is selected!) */}
            {selectedCategory === "Not Sure / Other Emergency" && (
              <div className="mt-4 p-5 rounded-2xl bg-[#FFF6F2] border border-[#F3E5DD] space-y-3">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-[#3B62AB]" />
                  <label className="text-xs font-serif font-bold text-[#1A2433] uppercase tracking-wider block">
                    Describe Patient Symptoms / Emergency in Your Own Words (Required)
                  </label>
                </div>
                <textarea
                  required
                  rows={3}
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="e.g. 52-year-old with sudden severe abdominal pain, high fever with shaking chills, unable to stand, onset 1 hour ago..."
                  className="w-full px-4 py-3 rounded-xl border border-[#F3E5DD] bg-white text-sm text-[#1A2433] focus:outline-none focus:ring-2 focus:ring-[#3B62AB]"
                />
                <p className="text-[11px] text-slate-600">
                  This description will be forwarded directly to the receiving hospital&apos;s triage desk so doctors are pre-briefed.
                </p>
              </div>
            )}
          </div>

          {/* STEP 2: Location Selection */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F3E5DD] shadow-sm space-y-4">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider block">
              STEP 2 OF 3 • YOUR CURRENT LOCATION
            </span>
            <h2 className="text-xl font-serif font-bold text-[#1A2433]">
              Where is the patient right now?
            </h2>

            <div className="p-3 bg-[#DAE9C6]/40 rounded-xl text-xs text-[#2C471E] flex items-center gap-2 border border-[#B8CE9E]">
              <Navigation className="w-4 h-4 text-[#3B62AB] shrink-0" />
              <span>Location: Bhubaneswar Urban Metropolitan Zone</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {locations.map((loc) => (
                <button
                  key={loc.name}
                  type="button"
                  onClick={() => setSelectedLocation(loc.name)}
                  className={`p-3.5 rounded-xl border text-xs text-left font-medium transition-all ${
                    selectedLocation === loc.name
                      ? "border-[#3B62AB] bg-[#FFF6F2] text-[#3B62AB] font-bold"
                      : "border-[#F3E5DD] hover:bg-[#FFF6F2] text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#3B62AB] shrink-0" />
                    <span>{loc.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">{loc.zone}</span>
                </button>
              ))}
            </div>
          </div>

          {/* STEP 3: Suitable Hospitals (NO NUMBERS, ONLY AVAILABLE / NOT AVAILABLE) */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F3E5DD] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">
                STEP 3 OF 3 • CHOOSE RECEIVING HOSPITAL
              </span>
              <span className="text-xs font-bold text-[#2C471E] bg-[#DAE9C6] px-2.5 py-0.5 rounded-full border border-[#B8CE9E]">
                {suitableHospitals.length} Available Centres
              </span>
            </div>

            <h2 className="text-xl font-serif font-bold text-[#1A2433]">
              Select Receiving Hospital
            </h2>

            <div className="space-y-3 pt-1">
              {suitableHospitals.map((h) => {
                const isSelected = h.id === matchedHospital.id;

                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setSelectedHospitalId(h.id)}
                    className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${
                      isSelected
                        ? "border-[#3B62AB] bg-[#FFF6F2] ring-2 ring-[#3B62AB]/15 shadow-xs"
                        : "border-[#F3E5DD] hover:border-[#3B62AB]/40 bg-white"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-serif font-bold text-[#1A2433]">{h.name}</h3>
                          {isSelected && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#3B62AB] text-white">
                              Recommended Match
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{h.distanceKm} km away • {h.etaMinutes} travel ETA</span>
                        </p>
                      </div>

                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#DAE9C6] text-[#2C471E] border border-[#B8CE9E] shrink-0">
                        Accepting Patients
                      </span>
                    </div>

                    {/* Facility Availability Status (NO NUMBERS! Available / Not Available ONLY) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-[#F3E5DD] text-[11px]">
                      <div className="p-2 bg-[#FFF6F2] rounded-lg flex items-center justify-between border border-[#F3E5DD]">
                        <span className="text-slate-700">Emergency Beds:</span>
                        <span className="font-bold text-[#2C471E] bg-[#DAE9C6] px-1.5 py-0.5 rounded">{h.availability.emergencyBeds}</span>
                      </div>
                      <div className="p-2 bg-[#FFF6F2] rounded-lg flex items-center justify-between border border-[#F3E5DD]">
                        <span className="text-slate-700">ICU Beds:</span>
                        <span className="font-bold text-[#2C471E] bg-[#DAE9C6] px-1.5 py-0.5 rounded">{h.availability.icuBeds}</span>
                      </div>
                      <div className="p-2 bg-[#FFF6F2] rounded-lg flex items-center justify-between border border-[#F3E5DD]">
                        <span className="text-slate-700">Ventilators:</span>
                        <span className="font-bold text-[#2C471E] bg-[#DAE9C6] px-1.5 py-0.5 rounded">{h.availability.ventilators}</span>
                      </div>
                      <div className="p-2 bg-[#FFF6F2] rounded-lg flex items-center justify-between border border-[#F3E5DD]">
                        <span className="text-slate-700">Oxygen:</span>
                        <span className="font-bold text-[#2C471E] bg-[#DAE9C6] px-1.5 py-0.5 rounded">{h.availability.oxygenSupport}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Submission */}
          <div className="space-y-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-full text-base font-bold text-white bg-[#3B62AB] hover:bg-[#2C4C87] shadow-xl shadow-[#3B62AB]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Notifying Receiving Emergency Room...</span>
                </>
              ) : (
                <>
                  <span>Send Pre-Arrival Notice Now</span>
                  <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                </>
              )}
            </button>
            <p className="text-center text-xs text-slate-500">
              The hospital emergency department will receive your category and symptom details to prepare for your arrival.
            </p>
          </div>

        </form>

      </div>
    </div>
  );
}

export default function PatientStartPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-slate-500">Loading emergency form...</div>}>
      <PatientStartContent />
    </Suspense>
  );
}
