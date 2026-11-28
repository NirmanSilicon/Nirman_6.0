"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function ImpactSection() {
  return (
    <section className="py-16 bg-[#f8fafc]" id="impact">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Top Part matching Screenshot 9 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-6 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Useful information. <br />
              Only what is needed.
            </h2>
            <p className="text-slate-600 text-base leading-relaxed">
              Share a short patient reference and resource needs. Keep detailed medical records out of an emergency request.
            </p>
            <div>
              <Link
                href="/start"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                <span>Medical information guidance</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-6">
            <div className="pb-4 border-b border-slate-200">
              <span className="text-xs font-mono font-bold text-slate-400">01 / Request status</span>
              <p className="text-sm font-medium text-slate-700 mt-1">Updates come from the connected request record.</p>
            </div>
            <div className="pb-4 border-b border-slate-200">
              <span className="text-xs font-mono font-bold text-slate-400">02 / Resource visibility</span>
              <p className="text-sm font-medium text-slate-700 mt-1">Counts reflect reported hospital inventory.</p>
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-slate-400">03 / Honest tracking</span>
              <p className="text-sm font-medium text-slate-700 mt-1">Unprovided GPS, driver and ETA data are never invented.</p>
            </div>
          </div>
        </div>

        {/* Bottom Impact Block matching Screenshot 9 */}
        <div className="pt-8 border-t border-slate-200/80">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-7 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
                OUR IMPACT
              </span>
              <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Progress that can be checked.
              </h3>
              <p className="text-slate-600 text-sm max-w-lg leading-relaxed">
                The current platform connects a public request flow with hospital operations. Verified patient outcomes and response-time statistics are continuously tracked.
              </p>
            </div>

            <div className="lg:col-span-5 flex justify-start lg:justify-end">
              <div className="w-full sm:w-80 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                <span className="text-6xl font-black text-blue-600 tracking-tight">
                  3
                </span>
                <h4 className="text-base font-bold text-slate-900 mt-2">
                  Connected hospitals
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  From the current verified pilot hospital records in Bhubaneswar.
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
