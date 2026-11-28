"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  getStoredHospitals, 
  updateStoredHospital, 
  Hospital 
} from "@/lib/data/mockStore";
import { 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  ShieldCheck, 
  Activity, 
  Phone, 
  MapPin, 
  Clock, 
  Stethoscope, 
  Bed, 
  Wind, 
  HeartPulse, 
  Brain, 
  Droplet,
  ExternalLink,
  RotateCcw
} from "lucide-react";

export default function HospitalAdminPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>("hosp-aiims-bbsr");
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Form state
  const [formData, setFormData] = useState<Hospital | null>(null);

  const loadData = () => {
    const list = getStoredHospitals();
    setHospitals(list);
    const active = list.find((h) => h.id === selectedHospitalId) || list[0];
    if (active) {
      setFormData({ ...active });
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener("goldenhour_store_updated", handleUpdate);
    return () => {
      window.removeEventListener("goldenhour_store_updated", handleUpdate);
    };
  }, [selectedHospitalId]);

  const handleHospitalChange = (id: string) => {
    setSelectedHospitalId(id);
    const found = hospitals.find((h) => h.id === id);
    if (found) {
      setFormData({ ...found });
    }
  };

  const toggleAvailability = (key: keyof Hospital["availability"]) => {
    if (!formData) return;
    const currentVal = formData.availability[key];
    const newVal = currentVal === "Available" ? "Not Available" : "Available";
    setFormData({
      ...formData,
      availability: {
        ...formData.availability,
        [key]: newVal,
      },
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    updateStoredHospital(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  if (!formData) {
    return (
      <div className="min-h-screen bg-[#FFF6F2] flex items-center justify-center p-6 text-slate-700">
        Loading hospital configuration...
      </div>
    );
  }

  const facilityKeys: { key: keyof Hospital["availability"]; label: string; desc: string; icon: React.ReactNode }[] = [
    { 
      key: "emergencyBeds", 
      label: "Emergency Resuscitation Bays", 
      desc: "Acute trauma and medical emergency intake bays", 
      icon: <Bed className="w-4 h-4 text-[#3B62AB]" /> 
    },
    { 
      key: "icuBeds", 
      label: "Intensive Care Unit (ICU) Beds", 
      desc: "Critical care receiving beds with dedicated monitors", 
      icon: <Activity className="w-4 h-4 text-[#3B62AB]" /> 
    },
    { 
      key: "ventilators", 
      label: "Invasive & Non-Invasive Mechanical Ventilators", 
      desc: "Emergency respiratory support and BiPAP systems", 
      icon: <Wind className="w-4 h-4 text-[#3B62AB]" /> 
    },
    { 
      key: "oxygenSupport", 
      label: "Central Bulk Liquid Medical Oxygen", 
      desc: "High-flow nasal cannula and high-pressure wall oxygen", 
      icon: <Wind className="w-4 h-4 text-[#3B62AB]" /> 
    },
    { 
      key: "cardiacCathLab", 
      label: "Cardiac Catheterization Lab (24x7)", 
      desc: "Primary PCI, angiogram & acute STEMI team standby", 
      icon: <HeartPulse className="w-4 h-4 text-[#3B62AB]" /> 
    },
    { 
      key: "strokeCTUnit", 
      label: "Emergency CT / MRI Stroke Imaging", 
      desc: "Code Stroke multi-slice CT angiography pre-cleared", 
      icon: <Brain className="w-4 h-4 text-[#3B62AB]" /> 
    },
    { 
      key: "traumaBay", 
      label: "Trauma Resuscitation Suite", 
      desc: "Polytrauma surgical intervention & crash team ready", 
      icon: <Activity className="w-4 h-4 text-[#3B62AB]" /> 
    },
    { 
      key: "bloodBank", 
      label: "Hospital Blood Bank & Transfusion Unit", 
      desc: "Emergency uncrossed O-Negative PRBCs & plasma standby", 
      icon: <Droplet className="w-4 h-4 text-[#3B62AB]" /> 
    },
  ];

  return (
    <div className="min-h-screen bg-[#FFF6F2] py-10 text-slate-800">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#3B62AB] text-white">
                <Building2 className="w-3.5 h-3.5" />
                Hospital Administration
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                PRD Section 10 Operational Management
              </span>
            </div>
            <h1 className="text-3xl font-serif font-bold text-[#1A2433] mt-1">
              Facility Availability & Profile Management
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Maintain real-time capacity and receiving protocols. Updates immediately propagate to family matching algorithms and radar displays.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/hospital/inbox"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold text-[#3B62AB] bg-white border border-[#3B62AB]/30 hover:bg-[#DAE9C6] transition-all"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Go to ER Inbox</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Hospital Switcher */}
        <div className="bg-white rounded-3xl p-6 border border-[#F3E5DD] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Select Hospital to Configure
            </label>
            <select
              value={selectedHospitalId}
              onChange={(e) => handleHospitalChange(e.target.value)}
              className="text-sm font-bold p-3 rounded-2xl border border-[#F3E5DD] bg-[#FFF6F2] text-[#1A2433] focus:outline-none focus:ring-2 focus:ring-[#3B62AB]"
            >
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          <div className="text-right sm:border-l sm:border-[#F3E5DD] sm:pl-6 text-xs text-slate-500">
            <span className="block font-bold text-slate-900">Information Freshness</span>
            <span className="inline-flex items-center gap-1 text-[#2C471E] font-semibold bg-[#DAE9C6] px-2.5 py-1 rounded-full mt-1 border border-[#B8CE9E]">
              <Clock className="w-3 h-3 text-[#3B62AB]" />
              Last Verified: {formData.lastUpdated}
            </span>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSave} className="space-y-8">
          
          {/* Section 1: Live Receiving Status */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#F3E5DD] shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#1A2433] uppercase tracking-wide">
                1. Emergency Receiving Status (Triage Control)
              </h2>
              <p className="text-xs text-slate-500">
                Informs incoming ambulances and patient families whether your ED is actively receiving cases.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <label 
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col gap-1 ${
                  formData.status === "accepting" 
                    ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20" 
                    : "bg-white border-[#F3E5DD] hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                    Accepting All
                  </span>
                  <input
                    type="radio"
                    name="status"
                    checked={formData.status === "accepting"}
                    onChange={() => setFormData({ ...formData, status: "accepting" })}
                    className="accent-emerald-600"
                  />
                </div>
                <p className="text-[11px] text-slate-600">
                  Fully operational. Emergency bays, trauma team, and resuscitation equipment ready.
                </p>
              </label>

              <label 
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col gap-1 ${
                  formData.status === "limited" 
                    ? "bg-amber-50 border-amber-400 ring-2 ring-amber-500/20" 
                    : "bg-white border-[#F3E5DD] hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                    Limited Capacity
                  </span>
                  <input
                    type="radio"
                    name="status"
                    checked={formData.status === "limited"}
                    onChange={() => setFormData({ ...formData, status: "limited" })}
                    className="accent-amber-600"
                  />
                </div>
                <p className="text-[11px] text-slate-600">
                  High volume. Critical emergencies only; delays expected for non-resuscitation cases.
                </p>
              </label>

              <label 
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col gap-1 ${
                  formData.status === "divert" 
                    ? "bg-rose-50 border-rose-400 ring-2 ring-rose-500/20" 
                    : "bg-white border-[#F3E5DD] hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-800 uppercase tracking-wide">
                    Emergency Divert
                  </span>
                  <input
                    type="radio"
                    name="status"
                    checked={formData.status === "divert"}
                    onChange={() => setFormData({ ...formData, status: "divert" })}
                    className="accent-rose-600"
                  />
                </div>
                <p className="text-[11px] text-slate-600">
                  Temporary full diversion due to disaster, mass casualty incident, or major equipment downtime.
                </p>
              </label>
            </div>
          </div>

          {/* Section 2: Real-time Facility Availability Toggles */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#F3E5DD] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F3E5DD] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#1A2433] uppercase tracking-wide">
                  2. Facility & Critical Equipment Availability
                </h2>
                <p className="text-xs text-slate-500">
                  Click to toggle between <strong>Available</strong> and <strong>Not Available</strong>. (No false numerical bed counts).
                </p>
              </div>
              <span className="text-[11px] font-bold text-[#3B62AB] bg-[#DAE9C6] px-3 py-1 rounded-full">
                PRD Rule: Strictly Binary Readiness
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              {facilityKeys.map((item) => {
                const isAvail = formData.availability[item.key] === "Available";

                return (
                  <div
                    key={item.key}
                    onClick={() => toggleAvailability(item.key)}
                    className={`p-4 rounded-2xl border cursor-pointer select-none transition-all flex items-center justify-between gap-3 ${
                      isAvail 
                        ? "bg-white border-emerald-300 hover:border-emerald-500 shadow-xs" 
                        : "bg-slate-50 border-slate-200 opacity-75"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {item.icon}
                        <span className="text-xs font-bold text-[#1A2433]">
                          {item.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        {item.desc}
                      </p>
                    </div>

                    <div className="shrink-0">
                      <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all ${
                        isAvail 
                          ? "bg-emerald-600 text-white shadow-xs" 
                          : "bg-slate-300 text-slate-700"
                      }`}>
                        {isAvail ? "Available" : "Not Available"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Hospital Profile & Contact Details */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#F3E5DD] shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#1A2433] uppercase tracking-wide">
                3. Hospital Profile & Emergency Contacts
              </h2>
              <p className="text-xs text-slate-500">
                Official registration details displayed on patient cards and ambulance dispatch screens.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">
                  Official Hospital Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 rounded-xl border border-[#F3E5DD] bg-[#FFF6F2] font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3B62AB]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">
                  Emergency Department Direct Phone
                </label>
                <input
                  type="text"
                  value={formData.emergencyPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                  className="w-full p-3 rounded-xl border border-[#F3E5DD] bg-[#FFF6F2] font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3B62AB]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">
                  Address & Campus
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-3 rounded-xl border border-[#F3E5DD] bg-[#FFF6F2] font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3B62AB]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">
                  Urban Landmark / Receiving Gate
                </label>
                <input
                  type="text"
                  value={formData.landmark}
                  onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                  className="w-full p-3 rounded-xl border border-[#F3E5DD] bg-[#FFF6F2] font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3B62AB]"
                />
              </div>
            </div>
          </div>

          {/* Bottom Save Action */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {saveSuccess && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 px-4 py-2 rounded-full border border-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  Hospital availability & profile successfully updated in live store!
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={loadData}
                className="px-5 py-3 rounded-full text-xs font-bold text-slate-700 hover:bg-slate-200 bg-white border border-[#F3E5DD] transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Discard Changes</span>
              </button>

              <button
                type="submit"
                className="px-7 py-3 rounded-full text-xs font-bold uppercase tracking-wider text-white bg-[#3B62AB] hover:bg-[#2C4C87] shadow-md shadow-[#3B62AB]/20 transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Save Hospital Configuration</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
