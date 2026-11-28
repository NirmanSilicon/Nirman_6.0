"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function EmergencyBanner() {
  return (
    <section className="py-12 bg-[#f8fafc]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Deep blue container matching Screenshot 4 */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 rounded-3xl p-8 sm:p-12 lg:p-16 text-white shadow-xl shadow-blue-900/10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
                EMERGENCY ASSISTANCE
              </span>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
                A clear first step <br className="hidden sm:inline" />
                when time matters.
              </h2>

              <p className="text-blue-100 text-base sm:text-lg max-w-xl leading-relaxed">
                Send a pre-arrival request to the connected hospital with a deliberate press and hold. The status updates as hospital staff respond.
              </p>

              <div>
                <Link
                  href="/start"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold text-blue-700 bg-white hover:bg-blue-50 shadow-md transition-all hover:scale-105 active:scale-95"
                >
                  <span>Open emergency assistance</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right Card - Request Journey matching Screenshot 4 */}
            <div className="lg:col-span-5">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 sm:p-8 text-white space-y-6">
                <span className="text-xs font-bold uppercase tracking-widest text-blue-200 block">
                  REQUEST JOURNEY
                </span>

                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-blue-200">01</span>
                      <span className="font-semibold">Request received</span>
                    </div>
                    <span className="text-xs text-blue-200 bg-white/10 px-2 py-0.5 rounded">Sent to hospital</span>
                  </div>

                  <div className="flex items-center justify-between pb-3 border-b border-white/10 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-blue-200">02</span>
                      <span className="font-semibold">Hospital review</span>
                    </div>
                    <span className="text-xs text-blue-200 bg-white/10 px-2 py-0.5 rounded">Staff response</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-blue-200">03</span>
                      <span className="font-semibold">Arrival status</span>
                    </div>
                    <span className="text-xs text-blue-200 bg-white/10 px-2 py-0.5 rounded">When updated</span>
                  </div>
                </div>

                <p className="text-[11px] text-blue-200/80 pt-2 border-t border-white/10">
                  Example journey. Your actual request shows its own status.
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
