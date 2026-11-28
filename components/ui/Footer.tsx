import React from "react";
import Link from "next/link";
import { Activity, Phone, ShieldCheck, HeartHandshake } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#FFF6F2] border-t border-[#F3E5DD] text-slate-700 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#3B62AB] flex items-center justify-center text-white font-bold">
                <Activity className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="font-serif font-bold text-[#1A2433] text-lg">GoldenHour</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              Tell the emergency room what is coming — before you arrive. Designed for patients and families to get hospitals ready ahead of time.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#DAE9C6] text-[#2C471E] text-xs font-bold border border-[#B8CE9E]">
              <Phone className="w-3.5 h-3.5 fill-current text-[#3B62AB]" />
              <span>Emergency Ambulance: Call 112</span>
            </div>
          </div>

          <div>
            <h4 className="font-serif font-bold text-[#1A2433] mb-3 text-xs uppercase tracking-wider">
              For Patients & Families
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li><Link href="/start" className="hover:text-[#3B62AB]">Send Pre-Arrival Notice ›</Link></li>
              <li><Link href="/hospitals" className="hover:text-[#3B62AB]">Hospital Availability & Facilities ›</Link></li>
              <li><Link href="/track" className="hover:text-[#3B62AB]">Track My Request Progress ›</Link></li>
              <li><Link href="/#categories" className="hover:text-[#3B62AB]">5 Emergency Categories Guide ›</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif font-bold text-[#1A2433] mb-3 text-xs uppercase tracking-wider">
              Emergency Guidance
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li><Link href="/start?category=Chest+Pain" className="hover:text-[#3B62AB]">Chest Pain / Cardiac Symptoms ›</Link></li>
              <li><Link href="/start?category=Stroke+Symptoms" className="hover:text-[#3B62AB]">Stroke Signs (Face, Arm, Speech) ›</Link></li>
              <li><Link href="/start?category=Serious+Bleeding" className="hover:text-[#3B62AB]">Major Traumatic Bleeding ›</Link></li>
              <li><Link href="/start?category=Severe+Breathing" className="hover:text-[#3B62AB]">Severe Breathing Difficulty ›</Link></li>
              <li><Link href="/start?category=Not+Sure+%2F+Other+Emergency" className="hover:text-[#3B62AB] font-semibold text-[#3B62AB]">Not Sure / Other Symptoms ›</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif font-bold text-[#1A2433] mb-3 text-xs uppercase tracking-wider">
              Privacy & Scope
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              GoldenHour connects patients with hospital emergency rooms for advance preparation. No personal medical records or passwords are required to alert the hospital.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-[#2C471E] font-medium">
              <ShieldCheck className="w-4 h-4 text-[#3B62AB]" />
              <span>Zero-PII Emergency Dispatch</span>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-[#F3E5DD] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} GoldenHour. Emergency healthcare pre-arrival coordination for patients & families.</p>
          <div className="flex flex-wrap gap-4 sm:gap-6">
            <Link href="/start" className="hover:text-[#3B62AB] font-medium">Send Pre-Arrival Alert</Link>
            <Link href="/hospitals" className="hover:text-[#3B62AB] font-medium">Nearby Emergency Centres</Link>
            <Link href="/track" className="hover:text-[#3B62AB] font-medium">Case Tracking</Link>
            <Link href="/hospital/inbox" className="hover:text-[#3B62AB] font-bold text-[#3B62AB]">Hospital ER Console</Link>
            <Link href="/admin" className="hover:text-[#3B62AB] font-medium">Hospital Admin</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
