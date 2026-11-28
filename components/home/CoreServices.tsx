"use client";

import React from "react";
import Link from "next/link";
import { Asterisk, Plus, Compass, Disc3, ArrowUpRight } from "lucide-react";

export function CoreServices() {
  const services = [
    {
      icon: Asterisk,
      title: "Emergency SOS",
      description: "Send a pre-arrival request to the connected hospital.",
      action: "Start a request",
      href: "/start",
      color: "text-sky-500 bg-sky-50",
    },
    {
      icon: Plus,
      title: "Nearby hospitals",
      description: "See the connected hospital and reported resources.",
      action: "Explore care",
      href: "/hospitals",
      color: "text-blue-500 bg-blue-50",
    },
    {
      icon: Compass,
      title: "Ambulance tracking",
      description: "Follow real request updates; location appears only when shared.",
      action: "Check status",
      href: "/track",
      color: "text-indigo-500 bg-indigo-50",
    },
    {
      icon: Disc3,
      title: "Medical information",
      description: "Learn what to share and what to keep private.",
      action: "Read guidance",
      href: "/#how-it-works",
      color: "text-sky-600 bg-sky-50",
    },
  ];

  return (
    <section className="py-16 bg-[#f8fafc]" id="features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header matching Screenshot 2 */}
        <div className="mb-10">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
            CORE SERVICES
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2 tracking-tight">
            Find the next right step.
          </h2>
          <p className="text-slate-600 mt-2 text-base">
            Four ways to get information and keep a hospital request moving.
          </p>
        </div>

        {/* 4 Cards Grid matching Screenshot 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-6 ${item.color}`}>
                    <Icon className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed mb-6">
                    {item.description}
                  </p>
                </div>

                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-600 hover:text-sky-700 group-hover:translate-x-0.5 transition-all"
                >
                  <span>{item.action}</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
