"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Activity, 
  Menu, 
  X, 
  Phone, 
  ShieldAlert
} from "lucide-react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "5 Emergency Types", href: "/#categories" },
    { label: "Hospital Availability", href: "/hospitals" },
    { label: "Track Request", href: "/track" },
    { label: "Hospital Console", href: "/hospital/inbox" },
    { label: "Admin", href: "/admin" },
  ];

  return (
    <>
      {/* Top Patient Assistance Ribbon in Deep Blue (#3B62AB) */}
      <div className="bg-[#3B62AB] text-white text-xs py-2 px-4 sm:px-8 border-b border-[#2C4C87]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#DAE9C6] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#DAE9C6]"></span>
            </span>
            <span className="font-semibold text-white">Patient Pre-Arrival Emergency Network • Bhubaneswar</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-[#DAE9C6] hidden sm:inline font-medium">Zero registration required to alert the hospital</span>
            <a href="tel:112" className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white text-[#3B62AB] font-bold hover:bg-[#DAE9C6] transition-colors">
              <Phone className="w-3 h-3 fill-current" />
              <span>Direct Ambulance: 112</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Patient Navigation Header in Soft Dawn (#FFF6F2) */}
      <header className="sticky top-0 z-50 bg-[#FFF6F2]/95 backdrop-blur-md border-b border-[#F3E5DD] transition-all shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* GoldenHour Brand Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-11 h-11 rounded-2xl bg-[#3B62AB] flex items-center justify-center text-white shadow-md shadow-[#3B62AB]/20 group-hover:scale-105 transition-all">
                <Activity className="w-6 h-6 stroke-[2.5]" />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#DAE9C6] border-2 border-[#FFF6F2] flex items-center justify-center text-[8px] font-black text-[#2C471E]">
                  GH
                </span>
              </div>
              <div>
                <span className="text-2xl font-black tracking-tight text-[#1A2433] group-hover:text-[#3B62AB] transition-colors">
                  GoldenHour
                </span>
                <span className="block text-[10px] uppercase tracking-wider font-bold text-[#3B62AB]">
                  Pre-Arrival Emergency Notice
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-1 xl:space-x-3 text-[13.5px] font-semibold text-slate-700">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    className={`px-3.5 py-1.5 rounded-full transition-all ${
                      isActive
                        ? "text-[#3B62AB] font-bold bg-[#DAE9C6]"
                        : "hover:text-[#3B62AB] hover:bg-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right Action: Raise Pre-Arrival Alert */}
            <div className="hidden sm:flex items-center gap-3">
              <Link
                href="/track"
                className="px-4 py-2.5 text-xs font-bold text-[#3B62AB] hover:bg-[#DAE9C6] bg-white border border-[#3B62AB]/30 rounded-full transition-all"
              >
                Track My Request
              </Link>

              <Link
                href="/start"
                className="relative inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wide text-white bg-[#3B62AB] hover:bg-[#2C4C87] shadow-md shadow-[#3B62AB]/25 transition-all hover:scale-105 active:scale-95"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#DAE9C6] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#DAE9C6]"></span>
                </span>
                <span>Send Emergency Alert</span>
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="flex lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-slate-700 hover:bg-white"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-[#F3E5DD] bg-[#FFF6F2] px-4 pt-3 pb-6 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-800 hover:bg-white"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-[#F3E5DD] flex flex-col gap-2">
              <Link
                href="/start"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-3 rounded-full text-sm font-bold text-white bg-[#3B62AB] shadow-md"
              >
                Send Emergency Alert (Zero-Install)
              </Link>
              <Link
                href="/track"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-full text-xs font-bold text-[#3B62AB] border border-[#3B62AB]/40 bg-white"
              >
                Track My Active Request
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
