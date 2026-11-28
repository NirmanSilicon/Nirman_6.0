"use client";

import React from "react";
import Link from "next/link";
import { Clock, CheckCircle2, ArrowRight, ShieldCheck, HeartHandshake } from "lucide-react";

export function EscalationProtocolSection() {
  const steps = [
    {
      time: "Instant",
      stage: "1. Request Sent",
      badge: "Real-Time Dispatch",
      color: "border-[#3B62AB]/30 bg-white text-[#1A2433]",
      badgeColor: "bg-[#DAE9C6] text-[#2C471E]",
      desc: "Your pre-arrival notification is immediately received on the hospital emergency room display. No registration needed.",
    },
    {
      time: "< 40 Seconds",
      stage: "2. Hospital Allocation",
      badge: "Team Mobilized",
      color: "border-[#3B62AB]/30 bg-white text-[#1A2433]",
      badgeColor: "bg-[#DAE9C6] text-[#2C471E]",
      desc: "Doctors and emergency nurses review your symptoms category and assign a receiving bay before you reach the hospital.",
    },
    {
      time: "< 90 Seconds",
      stage: "3. Equipment Pre-Configured",
      badge: "Bay Ready",
      color: "border-[#3B62AB]/30 bg-white text-[#1A2433]",
      badgeColor: "bg-[#DAE9C6] text-[#2C471E]",
      desc: "Diagnostic equipment (ECG, CT, Oxygen, or surgical trays) are placed on immediate standby for your specific emergency.",
    },
    {
      time: "On Arrival",
      stage: "4. Rapid Handover",
      badge: "Zero Triage Delays",
      color: "border-[#3B62AB] bg-[#FFF6F2] text-[#1A2433]",
      badgeColor: "bg-[#3B62AB] text-white",
      desc: "Because the hospital was notified in advance, you bypass routine administrative intake and proceed straight to the prepared bay.",
    },
  ];

  return (
    <section className="py-20 bg-white border-t border-[#F3E5DD]" id="how-it-works">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DAE9C6] text-[#2C471E] text-xs font-bold uppercase tracking-wider mb-3 border border-[#B8CE9E]">
            <Clock className="w-3.5 h-3.5 text-[#3B62AB]" />
            <span>Patient Emergency Journey</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#1A2433] tracking-tight">
            What Happens After You Send Your Request
          </h2>
          <p className="text-slate-700 text-base mt-2 leading-relaxed font-sans">
            Here is how your advance notice prepares the hospital emergency room while you are traveling.
          </p>
        </div>

        {/* 4 Patient Journey Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((s, idx) => (
            <div
              key={idx}
              className={`rounded-3xl p-6 border shadow-sm transition-all flex flex-col justify-between ${s.color}`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-[#FFF6F2] text-[#3B62AB] border border-[#F3E5DD]">
                    {s.time}
                  </span>
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${s.badgeColor}`}>
                    {s.badge}
                  </span>
                </div>
                <h4 className="text-base font-serif font-bold mb-2 text-[#1A2433]">
                  {s.stage}
                </h4>
                <p className="text-xs leading-relaxed text-slate-600">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Action Link for Patient */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#F3E5DD] text-xs text-slate-600">
          <span>You can track your active request status at any time from your mobile phone.</span>
          <Link
            href="/start"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider bg-[#3B62AB] hover:bg-[#2C4C87] text-white transition-all shadow-md shadow-[#3B62AB]/20"
          >
            <span>Send Pre-Arrival Notice Now</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </section>
  );
}
