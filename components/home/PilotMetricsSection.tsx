"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, HeartHandshake, ShieldCheck } from "lucide-react";

export function PilotMetricsSection() {
  return (
    <section className="py-20 md:py-28 bg-[#FFF6F2] border-t border-[#F3E5DD]" id="impact">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Top Tagline */}
        <div className="text-xs font-serif italic text-[#3B62AB]">
          One network. Life-saving emergency coordination.
        </div>

        {/* 2-Column Header — Exactly matching Screenshot 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <div className="lg:col-span-7">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#1A2433] leading-[1.15] tracking-tight">
              GoldenHour brings Bhubaneswar&apos;s emergency rooms together, for you
            </h2>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
              We are committed to making emergency medical care accessible and unblocked. Our pre-arrival system is dedicated to a premier patient experience, immediate doctor mobilization, and preparing trauma equipment before you arrive.
            </p>
            <div>
              <Link
                href="/#how-it-works"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-[#3B62AB] hover:text-[#2C4C87] group"
              >
                <span>Learn more about how pre-arrival preparation works</span>
                <span className="group-hover:translate-x-1 transition-transform">›</span>
              </Link>
            </div>
          </div>

        </div>

        {/* 4 HIGHLIGHT CARDS — Styled like Screenshot 2 (3 light/gradient cards + 1 solid deep blue card) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
          
          {/* Card 1: Soft White/Dawn Card */}
          <div className="bg-white rounded-3xl p-7 border border-[#F3E5DD] shadow-sm flex flex-col justify-between min-h-[220px]">
            <div>
              <span className="text-4xl sm:text-5xl font-serif font-bold text-[#3B62AB] block tracking-tight mb-3">
                &lt; 90s
              </span>
              <h3 className="text-base font-bold text-[#1A2433] mb-1">
                Advance Preparation
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Emergency teams mobilized and resuscitation bay allocated within 90 seconds.
              </p>
            </div>
            <div className="pt-3 text-[11px] font-bold text-[#2C471E] bg-[#DAE9C6] px-2.5 py-1 rounded-full w-fit">
              Clinical Benchmark
            </div>
          </div>

          {/* Card 2: Soft Dawn Green Tinted Card */}
          <div className="bg-[#DAE9C6]/40 rounded-3xl p-7 border border-[#DAE9C6] shadow-sm flex flex-col justify-between min-h-[220px]">
            <div>
              <span className="text-4xl sm:text-5xl font-serif font-bold text-[#3B62AB] block tracking-tight mb-3">
                1.2s
              </span>
              <h3 className="text-base font-bold text-[#1A2433] mb-1">
                Instant Dispatch
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Time taken for your pre-arrival notice to display on the receiving hospital screen.
              </p>
            </div>
            <div className="pt-3 text-[11px] font-bold text-[#2C471E] bg-white px-2.5 py-1 rounded-full w-fit border border-[#B8CE9E]">
              Real-Time Speed
            </div>
          </div>

          {/* Card 3: Palette Gradient Accent Card (Reflecting Screenshot 3 smooth gradient) */}
          <div className="relative rounded-3xl p-7 overflow-hidden border border-[#3B62AB]/20 shadow-sm flex flex-col justify-between min-h-[220px] bg-gradient-to-br from-[#FFF6F2] via-[#DAE9C6]/50 to-[#3B62AB]/15">
            <div className="relative z-10">
              <span className="text-4xl sm:text-5xl font-serif font-bold text-[#3B62AB] block tracking-tight mb-3">
                100%
              </span>
              <h3 className="text-base font-bold text-[#1A2433] mb-1">
                Zero-PII Privacy
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed">
                No personal IDs, phone logs, or passwords required to alert emergency rooms.
              </p>
            </div>
            <div className="relative z-10 pt-3 text-[11px] font-bold text-[#2C471E] bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full w-fit border border-[#B8CE9E]">
              DPDP Compliant
            </div>
          </div>

          {/* Card 4: Solid Deep Blue Card (Matching Card 4 in Screenshot 2: "No. 4 leading health system...") */}
          <div className="bg-[#3B62AB] text-white rounded-3xl p-7 shadow-lg shadow-[#3B62AB]/25 flex flex-col justify-between min-h-[220px]">
            <div>
              <span className="text-4xl sm:text-5xl font-serif font-bold text-white block tracking-tight mb-3">
                0 Login
              </span>
              <h3 className="text-base font-bold text-white mb-1">
                Zero-Friction Access
              </h3>
              <p className="text-xs text-white/80 leading-relaxed">
                Instant mobile web pre-arrival alert without app downloads or registration barriers.
              </p>
            </div>
            <div className="pt-3 text-[11px] font-black text-[#2C471E] bg-[#DAE9C6] px-2.5 py-1 rounded-full w-fit">
              Mobile Web Ready
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
