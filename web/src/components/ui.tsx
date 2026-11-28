import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import * as store from "../lib/store";

export function Dots({ n, label }: { n: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm" aria-label={`${label}: ${n}/5`}>
      <span className="w-14 text-zinc-500">{label}</span>
      <span className="tracking-widest text-green-800" aria-hidden>{"●".repeat(n)}<span className="text-zinc-300">{"●".repeat(5 - n)}</span></span>
    </span>
  );
}

export function LangToggle() {
  const { i18n } = useTranslation();
  const hi = i18n.language === "hi";
  return <button className="rounded-full border border-white/50 px-3 py-1 text-sm font-semibold" onClick={() => i18n.changeLanguage(hi ? "en" : "hi")}>{hi ? "English" : "हिन्दी"}</button>;
}

export function Layout() {
  const { t } = useTranslation();
  const [online, setOnline] = useState(navigator.onLine);
  const [q, setQ] = useState(0);
  useEffect(() => {
    const up = () => { setOnline(true); store.flush(); }, down = () => setOnline(false);
    const refresh = () => store.pending().then((p) => setQ(p.length));
    window.addEventListener("online", up); window.addEventListener("offline", down); window.addEventListener("queue-changed", refresh);
    refresh(); if (navigator.onLine) store.flush();
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); window.removeEventListener("queue-changed", refresh); };
  }, []);
  const tab = ({ isActive }: { isActive: boolean }) => `flex-1 py-3 text-center text-sm font-semibold ${isActive ? "text-green-800 border-t-2 border-green-800" : "text-zinc-500"}`;
  return (
    <div className="mx-auto flex h-full max-w-lg flex-col bg-stone-50">
      <header className="flex items-center justify-between bg-green-800 px-4 py-3 text-white">
        <span className="text-lg font-bold">Ouroboros</span>
        <div className="flex items-center gap-2">
          {(!online || q > 0) && <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-amber-950">{online ? `${q} ↑` : "Offline"}{!online && q > 0 ? ` · ${q}` : ""}</span>}
          <LangToggle />
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto"><Outlet /></main>
      <nav className="flex border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <NavLink to="/" end className={tab}>📷<br />{t("nav.scan")}</NavLink>
        <NavLink to="/history" className={tab}>🕘<br />{t("nav.history")}</NavLink>
        <NavLink to="/recyclers" className={tab}>📍<br />{t("nav.recyclers")}</NavLink>
        <NavLink to="/more" className={tab}>⋯<br />{t("nav.more")}</NavLink>
      </nav>
    </div>
  );
}

export const inr = (lo: number, hi: number) => `₹${lo.toLocaleString("en-IN")}–${hi.toLocaleString("en-IN")}`;
