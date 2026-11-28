import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Globe, ChevronDown, Check, Clock, GitBranch } from 'lucide-react';
import { useRailStore } from '../../stores/useRailStore';
import { useOutsideDismiss } from '../../hooks/useDismissible';
import PillNav, { type PillNavItem } from '../ui/PillNav';
import { TRANSLATIONS, type Lang } from './translations';

const LANG_OPTIONS: { code: Lang; label: string }[] = [
  { code: 'EN', label: 'English' },
  { code: 'HI', label: 'हिन्दी' },
  { code: 'OR', label: 'ଓଡ଼ିଆ' },
];

function formatCurrentTimeIST(date: Date): string {
  const formatted = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date);
  return formatted.toUpperCase();
}

interface LandingNavProps {
  onNavigateToSearch?: (tab: 'find' | 'track') => void;
}

export const LandingNav: React.FC<LandingNavProps> = ({ onNavigateToSearch }) => {
  const { language, setLanguage, activeCorridorId, switchCorridor } = useRailStore();
  const t = TRANSLATIONS[language];
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useOutsideDismiss(menuRef, menuOpen, closeMenu);

  const activeLangLabel =
    LANG_OPTIONS.find((opt) => opt.code === language)?.label ?? 'English';

  const navItems: PillNavItem[] = useMemo(
    () => [
      { label: t.search.tabFind },
      { label: t.search.tabTrack },
      { label: 'Why Rail-Pulse' },
      { label: 'How It Works' },
    ],
    [t.search.tabFind, t.search.tabTrack],
  );

  const handleNavItemClick = (_item: PillNavItem, index: number) => {
    if (index === 0) {
      onNavigateToSearch?.('find');
    } else if (index === 1) {
      onNavigateToSearch?.('track');
    } else if (index === 2) {
      document.getElementById('why-rail-pulse')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    } else if (index === 3) {
      document.getElementById('how-it-works')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  return (
    <header className="sticky top-0 z-40 pointer-events-none px-3 sm:px-6 pt-3 pb-1">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-2.5 sm:gap-4">
        {/* Left & Center: Brand Lockup (Logo + Name) + React Bits PillNav */}
        <div className="pointer-events-auto flex-1 min-w-0 flex items-center">
          <PillNav
            logo="/logo.png"
            logoLabel={t.nav.brand}
            logoAlt={t.nav.brand}
            logoHref="#top"
            onLogoClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            items={navItems}
            onItemClick={handleNavItemClick}
            theme="light"
            layout="split"
            itemStyle="pill"
            hoverEffect="fill"
            indicator="dot"
            surface="glass"
            size="md"
            highlightColor="#0F294A"
            collapse="auto"
            ariaLabel={t.nav.brand}
            className="pill-nav--spread"
          />
        </div>

        {/* Right Controls: Corridor Toggle + Live IST Clock + Language Dropdown */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Interactive Corridor Switcher */}
          <button
            type="button"
            onClick={() =>
              void switchCorridor(
                activeCorridorId === 'SER_HWH_KGP' ? 'ECoR_BHC_PURI' : 'SER_HWH_KGP',
              )
            }
            className={`inline-flex items-center gap-1.5 h-11 px-2.5 sm:px-3.5 rounded-full backdrop-blur-md border text-xs font-mono font-bold shadow-sm cursor-pointer transition-all hover:opacity-90 shrink-0 ${
              activeCorridorId === 'SER_HWH_KGP'
                ? 'bg-amber-50/95 text-amber-900 border-amber-300'
                : 'bg-indigo-50/95 text-indigo-900 border-indigo-200'
            }`}
            title="Click to toggle corridor: ECoR (Bhadrak–Puri) vs SER (Howrah–Kharagpur)"
          >
            <GitBranch className="w-3.5 h-3.5 shrink-0 opacity-75" />
            <span className="hidden lg:inline">
              {activeCorridorId === 'SER_HWH_KGP' ? 'SER • Kolkata (HWH–KGP)' : 'ECoR • Odisha (BHC–PURI)'}
            </span>
            <span className="hidden sm:inline lg:hidden">
              {activeCorridorId === 'SER_HWH_KGP' ? 'SER • HWH' : 'ECoR • BHC'}
            </span>
            <span className="sm:hidden">
              {activeCorridorId === 'SER_HWH_KGP' ? 'SER' : 'ECoR'}
            </span>
          </button>

          {/* Live IST Clock (hidden on smaller screens, visible lg+) */}
          <div
            className="hidden xl:inline-flex items-center gap-1.5 h-11 px-3.5 rounded-full bg-[#0F294A]/95 backdrop-blur-md text-white border border-slate-700/80 shadow-md select-none"
            title="Current Time (IST)"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-mono font-semibold text-[13px] tracking-tight tabular-nums whitespace-nowrap">
              {formatCurrentTimeIST(now)}
              <span className="text-slate-300 text-[11px] ml-1">IST</span>
            </span>
          </div>

          <div className="relative inline-block shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 h-11 px-3.5 rounded-full bg-white/85 hover:bg-white backdrop-blur-md border border-slate-200/90 shadow-sm text-[13px] font-semibold text-slate-800 whitespace-nowrap transition-colors cursor-pointer"
              aria-expanded={menuOpen}
              aria-label="Select language"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="hidden sm:inline">{activeLangLabel}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-500 transition-transform shrink-0 ${
                  menuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 w-40 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-lg p-1.5">
                {LANG_OPTIONS.map((opt) => {
                  const isActive = language === opt.code;
                  return (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => {
                        setLanguage(opt.code);
                        setMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-[13px] transition-colors flex items-center justify-between cursor-pointer ${
                        isActive
                          ? 'bg-slate-100 text-slate-900 font-semibold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isActive && <Check className="w-3.5 h-3.5 text-[#0F294A] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
