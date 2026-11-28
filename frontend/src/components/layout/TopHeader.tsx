import React, { useEffect, useRef, useState } from 'react';
import { useRailStore } from '../../stores/useRailStore';
import { setSpeedMultiplier } from '../../services/api';
import { Shield, Navigation, ArrowLeft, Settings, Clock, GitBranch, Train } from 'lucide-react';
import { getTrainIdentity } from '../dashboard/passengerUtils';

function formatEpochClockIST(epochSecs: number): string {
  const istSecs = (Math.floor(epochSecs) + 19800) % 86400;
  const pos = istSecs < 0 ? istSecs + 86400 : istSecs;
  const h24 = Math.floor(pos / 3600);
  const mins = Math.floor((pos % 3600) / 60);
  const secs = pos % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')} ${period}`;
}

export const TopHeader: React.FC = () => {
  const {
    selectedTrain,
    activeCorridorId,
    activeSnapshot,
    updateSnapshot,
    triggerRefresh,
    passengerStatus,
    setPassengerStatus,
    drawerOpen,
    setDrawerOpen,
    setCurrentView,
  } = useRailStore();

  const handleCorridorToggle = async () => {
    const nextId = activeCorridorId === 'SER_HWH_KGP' ? 'ECoR_BHC_PURI' : 'SER_HWH_KGP';
    try {
      const res = await fetch('/api/v1/corridor/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corridor_id: nextId, speed_multiplier: activeSnapshot.speed_multiplier || 1 }),
      });
      if (res.ok) {
        const snap = await res.json();
        if (snap?.trains) updateSnapshot(snap);
        triggerRefresh();
      }
    } catch {
      /* ignore network errors */
    }
  };

  const trainIdentity = getTrainIdentity(selectedTrain, activeSnapshot);

  const simSpeed = activeSnapshot.speed_multiplier || 1;
  const clockAnchorRef = useRef<{ tickUtc: number; syncedAtMs: number; speed: number }>({
    tickUtc: activeSnapshot.tick_utc || 1795067700,
    syncedAtMs: Date.now(),
    speed: simSpeed,
  });
  const [displayEpoch, setDisplayEpoch] = useState<number>(
    activeSnapshot.tick_utc || 1795067700
  );

  // Sync clock anchor whenever backend simulation tick or speed multiplier changes
  useEffect(() => {
    const tick = activeSnapshot.tick_utc || 1795067700;
    clockAnchorRef.current = {
      tickUtc: tick,
      syncedAtMs: Date.now(),
      speed: activeSnapshot.speed_multiplier || 1,
    };
    setDisplayEpoch(tick);
  }, [activeSnapshot.tick_utc, activeSnapshot.speed_multiplier]);

  // Smooth sub-second simulation clock interpolation scaled by 1x / 10x / 30x
  useEffect(() => {
    const id = window.setInterval(() => {
      const { tickUtc, syncedAtMs, speed } = clockAnchorRef.current;
      const elapsedSec = (Date.now() - syncedAtMs) / 1000;
      setDisplayEpoch(tickUtc + elapsedSec * speed);
    }, 200);
    return () => window.clearInterval(id);
  }, []);

  const handleQuickSpeed = async (newSpeed: number) => {
    updateSnapshot({ ...activeSnapshot, speed_multiplier: newSpeed });
    try {
      await setSpeedMultiplier(newSpeed);
    } catch {
      // Keep optimistic client clock speed if network call fails
    }
  };

  // Listen for Shift + D hotkey for Demo drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setDrawerOpen(!drawerOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen, setDrawerOpen]);

  return (
    <header className="h-14 w-full max-w-full overflow-hidden shrink-0 sticky top-0 z-40 bg-[#FAF9F6]/95 backdrop-blur-md border-b border-[#E5E7EB] px-2.5 sm:px-4 lg:px-5 flex items-center justify-between gap-2">
      {/* Brand, Return & Corridor */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
        <button
          type="button"
          onClick={() => setCurrentView('landing')}
          className="p-1.5 rounded-lg bg-white hover:bg-slate-100 active:scale-95 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all duration-200 shadow-2xs cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F294A]/40"
          title="Return to Landing Page"
          aria-label="Return to Landing Page"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setCurrentView('landing')}
          className="flex items-center gap-1.5 sm:gap-2.5 group transition-opacity hover:opacity-85 cursor-pointer shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F294A]/40"
          title="Return to Landing Page"
        >
          <img src="/logo.png" alt="Rail-Pulse logo" className="w-6 h-6 sm:w-7 sm:h-7 object-contain shrink-0" />
          <span className="font-mono font-bold text-sm sm:text-base lg:text-lg tracking-wider text-[#0F294A] whitespace-nowrap shrink-0">
            RAIL-PULSE
          </span>
        </button>

        {/* Interactive Corridor Switcher (visible sm+) */}
        <button
          type="button"
          onClick={handleCorridorToggle}
          title="Click to switch corridor (ECoR Bhadrak–Puri / SER Howrah–Kharagpur)"
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold shadow-2xs cursor-pointer transition-opacity hover:opacity-85 shrink-0 ${
            activeCorridorId === 'SER_HWH_KGP'
              ? 'bg-amber-50 text-amber-900 border-amber-300'
              : 'bg-indigo-50 text-indigo-900 border-indigo-200'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5 shrink-0 opacity-75" />
          <span className="tabular-nums whitespace-nowrap">
            {activeCorridorId === 'SER_HWH_KGP' ? 'SER • HWH–KGP' : 'ECoR • BHC–PURI'}
          </span>
        </button>
      </div>

      {/* Active Monitored Train Badge (Static Read-Only, lg+) */}
      <div className="hidden lg:flex items-center justify-center px-1 xl:px-2 min-w-0">
        <div className="flex items-center gap-2 px-2.5 xl:px-3 py-1.5 rounded-xl border bg-white border-slate-200/90 text-slate-800 shadow-2xs pointer-events-none select-none max-w-full">
          <div className="p-1 rounded-md bg-[#0F294A]/5 text-[#0F294A] shrink-0">
            <Train className="w-3.5 h-3.5" />
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs xl:text-sm min-w-0">
            <span className="font-extrabold text-[#0F294A] shrink-0">{trainIdentity.trainNo}</span>
            <span className="text-slate-400 shrink-0">•</span>
            <span className="text-slate-600 font-sans font-medium truncate max-w-[120px] xl:max-w-[170px]">
              {trainIdentity.trainName}
            </span>
          </div>
        </div>
      </div>

      {/* Right Controls: Responsive Clock/Speed + At Home/On Board Toggle + Demo Button */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Live Digital Simulation Clock (visible md+, speed controls visible xl+) */}
        <div
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0F294A] text-white border border-slate-700 shadow-2xs"
          title="Live Corridor Simulation Clock (IST)"
        >
          <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="font-mono font-bold text-xs sm:text-[13px] tracking-tight tabular-nums whitespace-nowrap">
            {formatEpochClockIST(displayEpoch)}
            <span className="hidden xl:inline text-slate-300 text-[11px] ml-1">IST</span>
          </span>
          <div className="hidden xl:flex items-center gap-0.5 ml-1 pl-1.5 border-l border-slate-600">
            {[1, 10, 30].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleQuickSpeed(s)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 ${
                  simSpeed === s
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
                title={`Set simulation clock speed to ${s}x`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* At Home | On Board Toggle: compact icon below lg, full label lg+ */}
        <div
          className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200"
          role="group"
          aria-label="Passenger boarding status"
        >
          <button
            type="button"
            onClick={() => setPassengerStatus('PRE_BOARDING')}
            aria-pressed={passengerStatus === 'PRE_BOARDING'}
            className={`flex items-center gap-1.5 p-1.5 lg:px-2.5 xl:px-3 lg:py-1.5 text-xs xl:text-sm font-semibold rounded-md transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40 ${
              passengerStatus === 'PRE_BOARDING'
                ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Safe-Boarding: At home protection against premature bailout advice"
          >
            <Shield className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-emerald-600 shrink-0" />
            <span className="hidden lg:inline whitespace-nowrap">At Home</span>
          </button>
          <button
            type="button"
            onClick={() => setPassengerStatus('ON_BOARD')}
            aria-pressed={passengerStatus === 'ON_BOARD'}
            className={`flex items-center gap-1.5 p-1.5 lg:px-2.5 xl:px-3 lg:py-1.5 text-xs xl:text-sm font-semibold rounded-md transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F294A]/40 ${
              passengerStatus === 'ON_BOARD'
                ? 'bg-white text-[#0F294A] shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="On Board: Enables early-junction road rescue evaluation"
          >
            <Navigation className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-blue-600 shrink-0" />
            <span className="hidden lg:inline whitespace-nowrap">On Board</span>
          </button>
        </div>

        {/* Demo Button: compact icon below lg, full label lg+ */}
        <button
          type="button"
          onClick={() => setDrawerOpen(!drawerOpen)}
          aria-expanded={drawerOpen}
          aria-label="Demo Controls"
          className="flex items-center gap-1.5 p-1.5 lg:px-3 xl:px-3.5 lg:py-1.5 rounded-lg text-xs xl:text-sm font-semibold bg-white hover:bg-slate-50 active:scale-95 text-slate-800 border border-slate-300 shadow-2xs transition-all duration-200 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F294A]/40"
          title="Demo Controls (Shift+D)"
        >
          <Settings className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#0F294A] shrink-0" />
          <span className="hidden lg:inline whitespace-nowrap">Demo</span>
        </button>
      </div>
    </header>
  );
};
