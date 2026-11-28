import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Clock,
  ArrowLeftRight,
  ArrowRight,
  Info,
  ChevronDown,
  Search,
  TrainFront,
  GitBranch,
} from 'lucide-react';
import { useRailStore } from '../../stores/useRailStore';
import Stepper, { Step } from '../ui/Stepper';
import { TRANSLATIONS } from './translations';
import {
  getStationsForCorridor,
  getTrainsForCorridor,
  getDefaultRecentForCorridor,
  getAllPilotTrains,
  type PilotTrain,
  type RecentItem,
} from './searchConstants';

const TrainCardIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6 sm:w-7 sm:h-7' }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={className}
  >
    <defs>
      <linearGradient id="rpTrainGrad" x1="5" y1="10" x2="43" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#F0FDFF" />
        <stop offset="100%" stopColor="#A5F3FC" />
      </linearGradient>
    </defs>
    <path
      d="M5 10H16C27 10 39 18 43.5 27.5C45 30.8 42.8 34 39.2 34H5V10Z"
      fill="url(#rpTrainGrad)"
    />
    <path
      d="M10 10H5.5C4.7 10 4 10.7 4 11.5V34"
      stroke="#00C4DC"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15.5 10C27 10 39 18 43.5 27.5C45 30.8 42.8 34 39.2 34H31"
      stroke="#00C4DC"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M22 12C25 18 30 22 36 22.5"
      stroke="#00C4DC"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
    <path
      d="M4.5 17.5H16C18.5 17.5 21 19.5 21.5 22C21.8 24 20 26 17.5 26H4.5"
      stroke="#00C4DC"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M11.5 18V25.5" stroke="#00C4DC" strokeWidth="2.6" strokeLinecap="round" />
    <circle cx="9.5" cy="36.5" r="4" fill="#FFFFFF" stroke="#00C4DC" strokeWidth="3" />
    <circle cx="17.5" cy="36.5" r="4" fill="#FFFFFF" stroke="#00C4DC" strokeWidth="3" />
    <path
      d="M21.5 36.5C23.5 38.5 26 39 28.5 39"
      stroke="#00C4DC"
      strokeWidth="2.8"
      strokeLinecap="round"
    />
    <path d="M30 39H41" stroke="#00C4DC" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export interface SearchTabRequest {
  tab: 'find' | 'track';
  nonce: number;
}

interface SearchCardProps {
  requestedTab?: SearchTabRequest | null;
}

export const SearchCard: React.FC<SearchCardProps> = ({ requestedTab }) => {
  const {
    language,
    navigateToDashboardWithTrain,
    setSelectedTrain,
    activeCorridorId,
    switchCorridor,
  } = useRailStore();
  const t = TRANSLATIONS[language].search;
  const skipNextSyncRef = useRef(false);
  const lastRequestedNonceRef = useRef<number | null>(null);

  const isKolkata = activeCorridorId === 'SER_HWH_KGP';
  const ecorStations = useMemo(() => getStationsForCorridor('ECoR_BHC_PURI'), []);
  const serStations = useMemo(() => getStationsForCorridor('SER_HWH_KGP'), []);
  const corridorStations = useMemo(() => getStationsForCorridor(activeCorridorId), [activeCorridorId]);
  const allCorridorTrains = useMemo(() => getTrainsForCorridor(activeCorridorId), [activeCorridorId]);
  const allAvailableTrains = useMemo(() => getAllPilotTrains(), []);

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [fromStation, setFromStation] = useState('');
  const [toStation, setToStation] = useState('');
  const [trainQuery, setTrainQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PilotTrain[] | null>(null);
  const [selectedRouteTrain, setSelectedRouteTrain] = useState<string | null>(null);
  const [unmatchedNotice, setUnmatchedNotice] = useState<string | null>(null);

  const recentStorageKey = `rp_recent_routes_${activeCorridorId}`;

  const loadRecentForCorridor = (corridorId: string): RecentItem[] => {
    try {
      const saved = localStorage.getItem(`rp_recent_routes_${corridorId}`);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.slice(0, 2);
      }
      return getDefaultRecentForCorridor(corridorId);
    } catch {
      return getDefaultRecentForCorridor(corridorId);
    }
  };

  const [recent, setRecent] = useState<RecentItem[]>(() => loadRecentForCorridor(activeCorridorId));

  const filterTrains = useCallback(
    (fromCode: string, toCode: string): PilotTrain[] | null => {
      if (!fromCode || !toCode || fromCode === toCode) {
        setSearchResults(null);
        setSelectedRouteTrain(null);
        return null;
      }

      const routeCorridorId = serStations.some((s) => s.code === fromCode)
        ? 'SER_HWH_KGP'
        : 'ECoR_BHC_PURI';
      const stations = getStationsForCorridor(routeCorridorId);
      const trains = getTrainsForCorridor(routeCorridorId);
      const fromStn = stations.find((s) => s.code === fromCode);
      const toStn = stations.find((s) => s.code === toCode);
      const fromKm = fromStn?.km ?? 0;
      const toKm = toStn?.km ?? 0;

      const matches =
        fromKm < toKm
          ? trains.filter((tr) => tr.direction === 'DN')
          : trains.filter((tr) => tr.direction === 'UP');

      setSearchResults(matches);
      setSelectedRouteTrain(matches[0]?.no ?? null);
      return matches;
    },
    [serStations],
  );

  // Synchronize stations and recent routes on corridor switch
  useEffect(() => {
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
    } else {
      setFromStation('');
      setToStation('');
    }
    setRecent(loadRecentForCorridor(activeCorridorId));
    setSearchResults(null);
    setSelectedRouteTrain(null);
    setUnmatchedNotice(null);
  }, [activeCorridorId]);

  // Handle footer & navbar navigation requests cleanly
  useEffect(() => {
    if (!requestedTab || lastRequestedNonceRef.current === requestedTab.nonce) return;
    lastRequestedNonceRef.current = requestedTab.nonce;
    setUnmatchedNotice(null);
    if (requestedTab.tab === 'find') {
      setCurrentStep(1);
    } else {
      filterTrains(fromStation, toStation);
      setCurrentStep(2);
    }
  }, [requestedTab, filterTrains, fromStation, toStation]);

  const saveRecent = (item: Omit<RecentItem, 'id'>) => {
    setRecent((prev) => {
      const filtered = prev.filter(
        (r) => !(r.fromCode === item.fromCode && r.toCode === item.toCode),
      );
      const updated = [{ ...item, id: String(Date.now()) }, ...filtered].slice(0, 2);
      try {
        localStorage.setItem(recentStorageKey, JSON.stringify(updated));
      } catch {
        /* noop */
      }
      return updated;
    });
  };

  const switchCorridorForStation = async (code: string, isFrom: boolean) => {
    const isSerStation = serStations.some((s) => s.code === code);
    const targetCorridor = isSerStation ? 'SER_HWH_KGP' : 'ECoR_BHC_PURI';
    if (targetCorridor === activeCorridorId) return;

    skipNextSyncRef.current = true;
    if (isSerStation) {
      if (isFrom && toStation && !serStations.some((s) => s.code === toStation)) {
        setToStation('');
      } else if (!isFrom && fromStation && !serStations.some((s) => s.code === fromStation)) {
        setFromStation('');
      }
    } else {
      if (isFrom && toStation && !ecorStations.some((s) => s.code === toStation)) {
        setToStation('');
      } else if (!isFrom && fromStation && !ecorStations.some((s) => s.code === fromStation)) {
        setFromStation('');
      }
    }

    await switchCorridor(targetCorridor);
  };

  const handleFromChange = (newFrom: string) => {
    setFromStation(newFrom);
    void switchCorridorForStation(newFrom, true);
  };

  const handleToChange = (newTo: string) => {
    setToStation(newTo);
    void switchCorridorForStation(newTo, false);
  };

  const handleSwap = () => {
    const temp = fromStation;
    setFromStation(toStation);
    setToStation(temp);
  };

  const handleSelectTrainAndNavigate = async (trainNo: string, targetCorridorId?: string) => {
    if (targetCorridorId && targetCorridorId !== activeCorridorId) {
      await switchCorridor(targetCorridorId);
    }
    setSelectedTrain(trainNo);
    navigateToDashboardWithTrain(trainNo);
  };

  const handleRecentClick = (item: RecentItem) => {
    setFromStation(item.fromCode);
    setToStation(item.toCode);
    void switchCorridorForStation(item.fromCode, true);
    filterTrains(item.fromCode, item.toCode);
    setUnmatchedNotice(null);
    setCurrentStep(2);
  };

  const handleClearRecent = () => {
    setRecent([]);
    try {
      localStorage.setItem(recentStorageKey, '[]');
    } catch {
      /* noop */
    }
  };

  const handleTrackSubmit = () => {
    const q = trainQuery.trim();
    if (!q) {
      if (selectedRouteTrain) {
        void handleSelectTrainAndNavigate(selectedRouteTrain);
      }
      return;
    }

    // Search across all available trains in both corridors
    const qLower = q.toLowerCase();
    const exactNoMatch = allAvailableTrains.find((tr) => tr.no === q);
    const exactNameMatch = allAvailableTrains.find((tr) => tr.name.toLowerCase() === qLower);
    const partialMatch =
      q.length >= 2
        ? allAvailableTrains.find(
          (tr) =>
            tr.no.includes(q) ||
            tr.name.toLowerCase().includes(qLower) ||
            qLower.includes(tr.name.toLowerCase()),
        )
        : null;

    const match = exactNoMatch || exactNameMatch || partialMatch;

    if (match) {
      setUnmatchedNotice(null);
      void handleSelectTrainAndNavigate(match.no, match.corridorId);
    } else {
      setUnmatchedNotice(q);
    }
  };

  const handleStepChange = (nextStep: number) => {
    setUnmatchedNotice(null);
    if (nextStep === 2) {
      filterTrains(fromStation, toStation);
      if (fromStation && toStation && fromStation !== toStation) {
        const fromStn = corridorStations.find((s) => s.code === fromStation);
        const toStn = corridorStations.find((s) => s.code === toStation);
        saveRecent({
          label: `${fromStn?.name} (${fromStation}) → ${toStn?.name} (${toStation})`,
          fromCode: fromStation,
          toCode: toStation,
        });
      }
    }
    setCurrentStep(nextStep);
  };

  // Universal cross-corridor search suggestions when typing
  const autocompleteSuggestions: AllPilotTrain[] = useMemo(() => {
    const q = trainQuery.trim().toLowerCase();
    if (!q) return [];
    return allAvailableTrains.filter(
      (tr) =>
        tr.no.toLowerCase().includes(q) ||
        tr.name.toLowerCase().includes(q) ||
        tr.origin.toLowerCase().includes(q) ||
        tr.destination.toLowerCase().includes(q),
    );
  }, [allAvailableTrains, trainQuery]);

  const searchDisabled = !fromStation || !toStation || fromStation === toStation;
  const displayedTrains: AllPilotTrain[] = trainQuery.trim()
    ? autocompleteSuggestions
    : (searchResults ?? []).map((tr) => ({
      ...tr,
      corridorId: activeCorridorId,
      corridorName: isKolkata ? 'SER • Kolkata' : 'ECoR • Odisha',
    }));
  const trackDisabled =
    currentStep === 2 && !trainQuery.trim() && !(searchResults && searchResults.length > 0);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 space-y-2.5">
      {/* Dedicated Pilot Corridor Selector Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 py-2.5 bg-white/85 backdrop-blur-md border border-slate-200/80 text-xs rounded-2xl shadow-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-700 tracking-wider">
          <GitBranch className="w-4 h-4 text-[#0F294A]" />
          <span className="uppercase text-[11px] text-slate-500">Pilot Corridor:</span>
        </div>
        <div className="flex items-center gap-1 bg-slate-200/75 p-0.5 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => void switchCorridor('ECoR_BHC_PURI')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${!isKolkata
              ? 'bg-white text-indigo-950 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            ECoR • Odisha (BHC–PURI)
          </button>
          <button
            type="button"
            onClick={() => void switchCorridor('SER_HWH_KGP')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${isKolkata
              ? 'bg-white text-amber-950 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            SER • Kolkata (HWH–KGP)
          </button>
        </div>
      </div>

      <Stepper
        step={currentStep}
        onStepChange={handleStepChange}
        theme="light"
        accentColor="#0F294A"
        width="100%"
        radius={20}
        backButtonText="Back"
        nextButtonText={t.btnSearch}
        completeButtonText={t.btnTrack}
        nextButtonProps={{
          disabled: currentStep === 1 ? searchDisabled : trackDisabled,
          onClick: (e) => {
            if (currentStep === 2) {
              e.preventDefault();
              handleTrackSubmit();
            }
          },
        }}
        className="border border-slate-200/80"
      >
        {/* Step 1: From / To Station Selection */}
        <Step title={t.tabFind} icon={<Search className="w-3.5 h-3.5" />}>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-end gap-2.5">
              {/* From Station */}
              <div className="relative w-full min-w-0 md:flex-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 pl-0.5">
                  FROM
                </label>
                <div className="relative">
                  <select
                    value={fromStation}
                    onChange={(e) => handleFromChange(e.target.value)}
                    className={`w-full appearance-none pl-3.5 pr-8 h-11 text-xs sm:text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0F294A]/20 focus:border-[#0F294A] transition-all cursor-pointer truncate shadow-2xs ${fromStation ? 'text-slate-900 font-semibold' : 'text-slate-400 font-normal'
                      }`}
                  >
                    <option value="" disabled>
                      {t.fromPlaceholder}
                    </option>
                    <optgroup label="Bhadrak – Puri (ECoR)">
                      {ecorStations.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Howrah – Kharagpur (SER)">
                      {serStations.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Swap Stations Button */}
              <div className="shrink-0 self-center -my-1 md:my-0 md:self-auto rotate-90 md:rotate-0 md:pb-0.5">
                <button
                  type="button"
                  onClick={handleSwap}
                  aria-label="Swap stations"
                  className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-500 transition-all active:scale-90 cursor-pointer shadow-2xs"
                  title="Swap Origin & Destination"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
              </div>

              {/* To Station */}
              <div className="relative w-full min-w-0 md:flex-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 pl-0.5">
                  TO
                </label>
                <div className="relative">
                  <select
                    value={toStation}
                    onChange={(e) => handleToChange(e.target.value)}
                    className={`w-full appearance-none pl-3.5 pr-8 h-11 text-xs sm:text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0F294A]/20 focus:border-[#0F294A] transition-all cursor-pointer truncate shadow-2xs ${toStation ? 'text-slate-900 font-semibold' : 'text-slate-400 font-normal'
                      }`}
                  >
                    <option value="" disabled>
                      {t.toPlaceholder}
                    </option>
                    <optgroup label="Bhadrak – Puri (ECoR)">
                      {ecorStations.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Howrah – Kharagpur (SER)">
                      {serStations.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            {/* Recent Routes Strip */}
            <div className="pt-3 border-t border-slate-200/70 flex items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <span className="text-xs font-semibold text-slate-400 shrink-0">Recent:</span>
                {recent.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">No recent routes</span>
                ) : (
                  recent.slice(0, 2).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleRecentClick(item)}
                      className="recent-route-pill px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer truncate max-w-full"
                    >
                      {item.label}
                    </button>
                  ))
                )}
              </div>

              {recent.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearRecent}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0 ml-1"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </Step>

        {/* Step 2: Matching Route Trains & Universal Cross-Corridor Train Search */}
        <Step title={t.tabTrack} icon={<TrainFront className="w-3.5 h-3.5" />}>
          <div className="space-y-4">
            {/* Train Number or Name Input */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 pl-0.5">
                TRAIN NUMBER OR NAME
              </label>
              <input
                type="text"
                value={trainQuery}
                onChange={(e) => {
                  setTrainQuery(e.target.value);
                  setUnmatchedNotice(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleTrackSubmit()}
                placeholder="Enter train no. or name (e.g. 12821, Vande Bharat)"
                className="w-full min-w-0 px-4 h-11 text-xs sm:text-sm border border-slate-200 rounded-xl bg-slate-50 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F294A]/20 focus:border-[#0F294A] transition-all shadow-2xs"
              />
            </div>

            {/* Unmatched Fallback Banner */}
            {unmatchedNotice && (
              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-slate-800 space-y-2">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Live telemetry is currently active for the{' '}
                    <strong>
                      {isKolkata ? 'Howrah–Kharagpur pilot corridor' : 'Bhadrak–Puri pilot corridor'}
                    </strong>
                    . Choose one of the {allCorridorTrains.length} live trains below:
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap pt-0.5 pl-6">
                  {allCorridorTrains.map((tr) => (
                    <button
                      type="button"
                      key={tr.no}
                      onClick={() => void handleSelectTrainAndNavigate(tr.no)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-100 text-[#0F294A] font-semibold text-xs border border-amber-200 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <TrainCardIcon className="w-4 h-4" />
                      <span className="font-mono font-bold">{tr.no}</span>
                      <span>{tr.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Matching Route Trains / Live Search Results */}
            {!unmatchedNotice && (trainQuery.trim() || !searchDisabled) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {trainQuery.trim()
                      ? `MATCHING TRAINS (${displayedTrains.length})`
                      : `TRAINS ON ${fromStation} → ${toStation} (${displayedTrains.length})`}
                  </span>
                </div>

                {displayedTrains.length === 0 ? (
                  <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/70 text-center text-xs text-slate-500 font-medium">
                    {trainQuery.trim()
                      ? `No corridor trains matching "${trainQuery.trim()}". Press ${t.btnTrack} to see all live trains.`
                      : 'Select different origin and destination stations or search by train number above.'}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[260px] overflow-y-auto overflow-x-hidden pr-0.5">
                    {displayedTrains.map((tr) => {
                      const isSelected = selectedRouteTrain === tr.no && !trainQuery.trim();
                      return (
                        <button
                          type="button"
                          key={`${tr.no}-${tr.corridorId}`}
                          onClick={() => {
                            setSelectedRouteTrain(tr.no);
                            void handleSelectTrainAndNavigate(tr.no, tr.corridorId);
                          }}
                          className={`w-full text-left p-3 sm:p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 group shadow-2xs hover:shadow-xs ${isSelected
                            ? 'border-[#0F294A]/40 bg-slate-50/90 hover:border-[#0F294A]'
                            : 'border-slate-200 bg-white hover:border-[#0F294A] hover:bg-slate-50/80'
                            }`}
                        >
                          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0 p-1.5 shadow-2xs transition-transform duration-200 group-hover:translate-x-0.5 group-hover:scale-105">
                              <TrainCardIcon className="w-6 h-6 sm:w-7 sm:h-7" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <span className="font-mono font-bold text-sm sm:text-base text-[#0F294A] shrink-0">
                                  {tr.no}
                                </span>
                                <span className="text-slate-300 font-bold hidden sm:inline">•</span>
                                <span className="font-bold text-sm sm:text-base text-slate-800">
                                  {tr.name}
                                </span>
                                <span
                                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border whitespace-nowrap shrink-0 ${tr.corridorId === 'SER_HWH_KGP'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                    }`}
                                >
                                  {tr.corridorName}
                                </span>
                                <span
                                  className={`hidden sm:inline-flex text-xs font-mono font-bold px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${tr.statusColor === 'emerald'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}
                                >
                                  {tr.delayStatus}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium mt-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="leading-snug">
                                  Departs {tr.departureTime} •{' '}
                                  {tr.origin.replace(/ \([A-Z]+\)/g, '')} →{' '}
                                  {tr.destination.replace(/ \([A-Z]+\)/g, '')}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0 sm:ml-2">
                            <span
                              className={`sm:hidden text-xs font-mono font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${tr.statusColor === 'emerald'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                            >
                              {tr.delayStatus}
                            </span>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0F294A]/5 group-hover:bg-[#0F294A] group-hover:text-white text-[#0F294A] text-xs font-bold transition-all duration-200 shrink-0 shadow-2xs whitespace-nowrap ml-auto sm:ml-0">
                              <span>Live ETA</span>
                              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Quick Select Corridor Train Pills */}
            {!unmatchedNotice && !trainQuery.trim() && (
              <div className="pt-3 border-t border-slate-200/70 flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
                <span className="text-xs font-semibold text-slate-400 shrink-0">Quick select:</span>
                {allCorridorTrains.slice(0, 5).map((tr) => (
                  <button
                    type="button"
                    key={tr.no}
                    onClick={() => void handleSelectTrainAndNavigate(tr.no)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                  >
                    {tr.no} {tr.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Step>
      </Stepper>
    </div>
  );
};
