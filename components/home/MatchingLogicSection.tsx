"use client";

import React from "react";
import { CheckCircle2, ShieldAlert, Sparkles, Navigation, Clock, ShieldCheck, ArrowRight } from "lucide-react";

export function MatchingLogicSection() {
  const steps = [
    {
      num: "01",
      title: "Capability Check",
      desc: "Instantly filters hospitals that have certified clinical facilities registered for the specific emergency (e.g. Cath Lab for Chest Pain, CT + Thrombolysis for Stroke).",
      rule: "Hard requirement: Hospitals lacking capability are excluded immediately.",
    },
    {
      num: "02",
      title: "Availability Status",
      desc: "Confirms that the hospital is actively accepting incoming cases and has unblocked resuscitation bays, staffed beds, and operational equipment.",
      rule: "Diverted or at-capacity hospitals are de-prioritized.",
    },
    {
      num: "03",
      title: "Distance & Travel ETA",
      desc: "Calculates realistic driving distance and estimated time of arrival using geographic coordinates and urban corridor traffic models.",
      rule: "Prioritizes quickest reachable suitable hospital.",
    },
    {
      num: "04",
      title: "Freshness Verification",
      desc: "Examines the last verification timestamp. Records older than 60 minutes are flagged as stale, preventing outdated reports from misguiding patients.",
      rule: "Stale data is visually transparent to users.",
    },
    {
      num: "05",
      title: "Transparent Recommendation",
      desc: "Presents the recommended options with full explainability: why each hospital appears, whether critical facilities are Available, and direct emergency phone contact.",
      rule: "Zero paid promotion. Zero commercial ranking.",
    },
  ];

  return (
    <section className="py-20 bg-[#FFF6F2] border-t border-[#F3E5DD]" id="matching">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DAE9C6] text-[#2C471E] text-xs font-bold uppercase tracking-wider mb-3 border border-[#B8CE9E]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#3B62AB]" />
            <span>PRD Section 9 • Hospital Matching Engine</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#1A2433] tracking-tight">
            How GoldenHour Matches Hospitals
          </h2>
          <p className="text-slate-700 text-base mt-2 leading-relaxed">
            Emergency healthcare is not an e-commerce ranking algorithm. Our 5-step engine balances clinical capability against driving distance so patients reach an emergency department that is ready to treat them.
          </p>
        </div>

        {/* 5-Step Process Timeline Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {steps.map((s, idx) => (
            <div
              key={s.num}
              className="bg-white rounded-3xl p-6 border border-[#F3E5DD] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="w-10 h-10 rounded-2xl bg-[#DAE9C6] text-[#2C471E] font-black text-sm flex items-center justify-center mb-5 group-hover:bg-[#3B62AB] group-hover:text-white transition-colors">
                  {s.num}
                </div>
                <h3 className="text-base font-serif font-bold text-[#1A2433] mb-2">
                  {s.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {s.desc}
                </p>
              </div>

              <div className="pt-3 border-t border-[#F3E5DD] text-[11px] text-[#2C471E] font-semibold bg-[#DAE9C6]/30 -mx-6 -mb-6 p-4 rounded-b-3xl">
                {s.rule}
              </div>
            </div>
          ))}
        </div>

        {/* Transparency Charter from PRD Section 9.4 */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#3B62AB] text-white shadow-xl shadow-[#3B62AB]/20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-2">
              <span className="text-xs font-mono font-bold text-[#DAE9C6] uppercase tracking-wider">
                PRD Section 9.4 Non-Negotiable Charter
              </span>
              <h4 className="text-xl sm:text-2xl font-serif font-bold tracking-tight">
                GoldenHour Never Promotes or Sells Hospital Rankings
              </h4>
              <p className="text-white/80 text-xs sm:text-sm leading-relaxed">
                We never accept payment to prioritize hospitals, never invent fake bed counts, and never replace qualified medical judgment. If information is unconfirmed, our interface explicitly flags it.
              </p>
            </div>

            <div className="lg:col-span-4 flex justify-start lg:justify-end">
              <div className="flex items-center gap-3 bg-white/10 px-5 py-3 rounded-2xl border border-white/20">
                <CheckCircle2 className="w-5 h-5 text-[#DAE9C6] shrink-0" />
                <span className="text-xs font-bold">100% Unbiased Patient Dispatch</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
