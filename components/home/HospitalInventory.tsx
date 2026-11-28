"use client";

import React, { useState } from "react";
import Link from "next/link";
import { GOLDENHOUR_HOSPITALS } from "@/lib/data/mockStore";

export function HospitalInventory() {
  const [hospital] = useState(GOLDENHOUR_HOSPITALS[0]);

  const inventoryItems = [
    {
      label: "Emergency Resus Bays",
      status: hospital.availability.emergencyBeds,
      iconBg: "bg-emerald-100 text-emerald-600",
      dotColor: hospital.availability.emergencyBeds === "Available" ? "bg-emerald-500" : "bg-rose-500",
    },
    {
      label: "Intensive Care Unit (ICU)",
      status: hospital.availability.icuBeds,
      iconBg: "bg-blue-100 text-blue-600",
      dotColor: hospital.availability.icuBeds === "Available" ? "bg-emerald-500" : "bg-rose-500",
    },
    {
      label: "Mechanical Ventilators",
      status: hospital.availability.ventilators,
      iconBg: "bg-purple-100 text-purple-600",
      dotColor: hospital.availability.ventilators === "Available" ? "bg-emerald-500" : "bg-rose-500",
    },
    {
      label: "High-Flow Oxygen Outlets",
      status: hospital.availability.oxygenSupport,
      iconBg: "bg-cyan-100 text-cyan-600",
      dotColor: hospital.availability.oxygenSupport === "Available" ? "bg-emerald-500" : "bg-rose-500",
    },
    {
      label: "Emergency Blood Bank",
      status: hospital.availability.bloodBank,
      iconBg: "bg-red-100 text-red-600",
      dotColor: "bg-emerald-500",
    },
    {
      label: "Cardiac Cath Lab",
      status: hospital.availability.cardiacCathLab,
      iconBg: "bg-rose-100 text-rose-600",
      dotColor: hospital.availability.cardiacCathLab === "Available" ? "bg-emerald-500" : "bg-rose-500",
    },
    {
      label: "Emergency CT Scanner",
      status: hospital.availability.strokeCTUnit,
      iconBg: "bg-indigo-100 text-indigo-600",
      dotColor: "bg-emerald-500",
    },
    {
      label: "Trauma Surgical Bay",
      status: hospital.availability.traumaBay,
      iconBg: "bg-teal-100 text-teal-600",
      dotColor: "bg-emerald-500",
    },
  ];

  return (
    <section className="py-16 bg-[#f8fafc]" id="inventory">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
            HOSPITAL FACILITY READINESS
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2 tracking-tight">
            Facilities, without the guesswork.
          </h2>
          <p className="text-slate-600 mt-2 text-base">
            Verified status at {hospital.name}. We state clearly whether facilities are <strong>Available</strong> or <strong>Not Available</strong>.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {inventoryItems.map((item) => (
            <div
              key={item.label}
              className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs hover:shadow-md transition-all flex flex-col items-center text-center justify-between min-h-[170px]"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${item.iconBg}`}>
                <span className="w-2.5 h-2.5 rounded-xs bg-current opacity-80" />
              </div>

              <h3 className="text-base font-bold text-slate-900 mt-3">
                {item.label}
              </h3>

              <div className="flex items-center gap-1.5 text-xs font-bold mt-1">
                <span className={`w-2 h-2 rounded-full ${item.dotColor}`} />
                <span className={item.status === "Available" ? "text-emerald-700" : "text-rose-700"}>
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
