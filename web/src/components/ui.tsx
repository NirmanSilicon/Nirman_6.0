import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import * as store from "../lib/store";
import Icon from "./Icon";
import Toasts from "./Toasts";

/** Round rating dots, like the deck's route-scoring table (dots + label: colour-blind safe). */
export function Dots({ n, label }: { n: number; label: string }) {
  return (
    <span className="flex items-center justify-between gap-2 text-xs" aria-label={`${label}: ${n}/5`}>
      <span className="text-mute">{label}</span>
      <span className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < n ? "bg-orange" : "bg-line"}`} />)}
      </span>
    </span>
  );
}

export function Logo({ dark = true }: { dark?: boolean }) {
  return (
    <span className="display flex items-center gap-2 text-2xl leading-none" style={{ fontFamily: "var(--font-sans)", fontWeight: 700 }}>
      <svg width="28" height="28" viewBox="0 0 512 512" aria-hidden><circle cx="256" cy="256" r="200" fill="none" stroke="#f26a1b" strokeWidth="26" /><circle cx="256" cy="256" r="84" fill="#f5a623" /><circle cx="440" cy="256" r="40" fill="#fbe8da" /></svg>
      <span><span className={dark ? "text-cream" : "text-ink"}>Ouro</span><span className="text-orange">Boros</span></span>
    </span>
  );
}

export function LangToggle() {
  const { i18n } = useTranslation();
  const hi = i18n.language === "hi";
  return <button className="rounded-full border border-cream/40 px-3 py-1 text-xs font-semibold text-cream hover:bg-cream/10" onClick={() => i18n.changeLanguage(hi ? "en" : "hi")}>{hi ? "English" : "हिन्दी"}</button>;
}

const NAV = [
  { to: "/", key: "home", icon: "home", end: true }, { to: "/map", key: "map", icon: "map" }, { to: "/scan", key: "scan", icon: "scan", fab: true },
  { to: "/impact", key: "impact", icon: "impact" }, { to: "/about", key: "about", icon: "info" },
];

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
  const desk = ({ isActive }: { isActive: boolean }) => `rounded-full px-4 py-1.5 text-sm font-semibold ${isActive ? "bg-orange text-white" : "text-cream/80 hover:text-cream"}`;
  const mobile = ({ isActive }: { isActive: boolean }) => `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${isActive ? "text-orange" : "text-cream/60"}`;
  return (
    <div className="flex h-dvh flex-col">
      <Toasts />
      <header className="bg-ink text-cream">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <NavLink to="/"><Logo /></NavLink>
          <nav className="hidden items-center gap-1 md:flex">{NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={desk}>{t(`nav.${n.key}`)}</NavLink>)}</nav>
          <div className="flex items-center gap-2">
            {(!online || q > 0) && <span className="rounded-full bg-amber px-2 py-0.5 text-xs font-bold text-ink">{online ? `${q} queued` : `Offline${q ? ` · ${q}` : ""}`}</span>}
            <LangToggle />
            <NavLink to="/profile" aria-label="Profile" className="flex h-8 w-8 items-center justify-center rounded-full border border-cream/40 text-sm"><Icon name="user" size={16} /></NavLink>
          </div>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto"><div className="mx-auto h-full max-w-6xl"><Outlet /></div></main>
      <nav className="flex items-end bg-ink pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV.map((n) => n.fab
          ? <NavLink key={n.to} to={n.to} aria-label={t("nav.scan")} className="-mt-5 flex flex-1 flex-col items-center gap-0.5 pb-2 text-[11px] font-semibold text-cream">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-orange text-white shadow-lg ring-4 ring-ink"><Icon name="scan" size={28} /></span>{t("nav.scan")}</NavLink>
          : <NavLink key={n.to} to={n.to} end={n.end} className={mobile}><Icon name={n.icon} size={22} />{t(`nav.${n.key}`)}</NavLink>)}
      </nav>
    </div>
  );
}

export const inr = (lo: number, hi: number) => `₹${lo.toLocaleString("en-IN")}–${hi.toLocaleString("en-IN")}`;

/** The deck's Capture → Detect → Identify → Value → Decide → Report flow. */
export function Pipeline({ active = -1, compact = false }: { active?: number; compact?: boolean }) {
  const { t } = useTranslation();
  const steps = ["capture", "detect", "identify", "value", "decide", "report"];
  return (
    <ol className={`grid gap-3 ${compact ? "grid-cols-6" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"}`}>
      {steps.map((s, i) => (
        <li key={s} className="text-center">
          <span className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full border-2 border-orange text-sm font-bold ${i <= active || active === -1 && i === 5 ? "bg-orange text-white" : "bg-paper text-orange"}`}>{i + 1}</span>
          <p className="display mt-1 text-sm uppercase tracking-wider">{t(`how.steps.${s}`)}</p>
          {!compact && <p className="mx-auto mt-0.5 max-w-[11rem] text-xs text-mute">{t(`how.stepsDesc.${s}`)}</p>}
        </li>
      ))}
    </ol>
  );
}
