"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function HowItWorksSteps() {
  const steps = [
    {
      num: "01",
      title: "Tell us what you need",
      desc: "Share only the emergency details needed for a hospital to prepare.",
    },
    {
      num: "02",
      title: "Hospital reviews",
      desc: "A participating hospital sees the request and updates its status.",
    },
    {
      num: "03",
      title: "Follow each update",
      desc: "Track the request, resource confirmation and arrival status in one place.",
    },
  ];

  return (
    <section className="py-16 bg-[#f8fafc]" id="how-it-works">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header matching Screenshot 3 */}
        <div className="mb-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Know what happens next.
          </h2>
          <p className="text-slate-600 mt-2 text-base">
            GoldenHour keeps the request and the hospital response together, so you can follow each step.
          </p>
        </div>

        {/* 3 Step Cards matching Screenshot 3 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {steps.map((s) => (
            <div
              key={s.num}
              className="bg-white rounded-2xl p-7 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <span className="inline-block px-3 py-1 rounded-lg bg-sky-50 text-sky-700 text-xs font-bold tracking-wide mb-6">
                  {s.num}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {s.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Explore link matching Screenshot 3 */}
        <Link
          href="/start"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
        >
          <span>Explore how it works</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>

      </div>
    </section>
  );
}
