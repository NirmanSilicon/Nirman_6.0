import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  X,
  MapPin,
  Landmark,
  ChevronDown,
  Check,
  LocateFixed,
  Layers,
  Sparkles,
  Building,
  Navigation,
} from 'lucide-react';
import { Destination } from '../../types';
import { IndianLocation, matchesIndianLocationSearch } from '../../data/indianLocationsData';
import { matchesDestinationSearch } from '../../utils/destinationSearch';

interface AnimatedLocationSelectorProps {
  type: 'origin' | 'destination';
  selectedName: string;
  selectedCoordinates?: [number, number] | null;
  onSelectOrigin: (name: string, district?: string, state?: string, coords?: [number, number]) => void;
  onSelectDestination: (dest: Destination | IndianLocation) => void;
  onUseGps?: () => void;
  onOpenVerticalBar: () => void;
  destinations: Destination[];
  allIndianLocations: IndianLocation[];
  indianLocationsGrouped: Record<string, IndianLocation[]>;
}

export const AnimatedLocationSelector: React.FC<AnimatedLocationSelectorProps> = ({
  type,
  selectedName,
  selectedCoordinates,
  onSelectOrigin,
  onSelectDestination,
  onUseGps,
  onOpenVerticalBar,
  destinations,
  allIndianLocations,
  indianLocationsGrouped,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'ODISHA' | 'METRO' | 'HERITAGE' | 'VILLAGE'>('ALL');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isOrigin = type === 'origin';
  const themeColor = isOrigin ? 'blue' : 'emerald';

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Filtered list of Indian locations
  const filteredIndianLocations = useMemo(() => {
    const q = searchQuery.trim();
    return allIndianLocations.filter((loc) => {
      if (q && !matchesIndianLocationSearch(loc, q)) return false;

      if (categoryFilter === 'ODISHA') return loc.state === 'Odisha';
      if (categoryFilter === 'METRO') return loc.type === 'Metro City';
      if (categoryFilter === 'HERITAGE') return loc.type === 'Heritage Town' || loc.type === 'Pilgrim Town';
      if (categoryFilter === 'VILLAGE') return loc.type === 'Heritage Village' || loc.type === 'Eco/Rural Village';

      return true;
    });
  }, [allIndianLocations, searchQuery, categoryFilter]);

  // Filtered built-in destinations (for destination mode)
  const filteredDestinations = useMemo(() => {
    if (isOrigin) return [];
    const q = searchQuery.trim();
    return destinations.filter((d) => {
      if (q && !matchesDestinationSearch(d, q)) return false;
      if (categoryFilter === 'ODISHA') return d.state === 'Odisha' || d.city?.toLowerCase().includes('bhubaneswar') || d.city?.toLowerCase().includes('puri');
      if (categoryFilter === 'METRO') return d.city === 'Paris' || d.city === 'Tokyo' || d.city === 'London' || d.city === 'Bhubaneswar';
      if (categoryFilter === 'HERITAGE') return true;
      if (categoryFilter === 'VILLAGE') return false;
      return true;
    });
  }, [destinations, searchQuery, categoryFilter, isOrigin]);

  // Group filtered Indian locations by state
  const groupedFilteredByState = useMemo(() => {
    const groups: Record<string, IndianLocation[]> = {};
    filteredIndianLocations.forEach((loc) => {
      if (!groups[loc.state]) groups[loc.state] = [];
      groups[loc.state].push(loc);
    });
    return groups;
  }, [filteredIndianLocations]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Bar */}
      <div
        className={`flex items-center justify-between gap-1.5 p-2 rounded-xl bg-white dark:bg-slate-900 border transition-all shadow-2xs ${
          isOpen
            ? isOrigin
              ? 'border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-500'
              : 'border-emerald-500 ring-2 ring-emerald-500/20 dark:border-emerald-500'
            : isOrigin
            ? 'border-blue-200 dark:border-blue-800/80 hover:border-blue-300 dark:hover:border-blue-700'
            : 'border-emerald-200 dark:border-emerald-800/80 hover:border-emerald-300 dark:hover:border-emerald-700'
        }`}
      >
        <button
          type="button"
          id={`${type}-animated-selector-btn`}
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 flex items-center gap-2 min-w-0 text-left cursor-pointer group"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span className="text-sm shrink-0">{isOrigin ? '📍' : '🎯'}</span>
          <div className="flex flex-col min-w-0 flex-1">
            <span
              className={`text-[10px] font-black uppercase tracking-wider ${
                isOrigin ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {isOrigin ? 'Origin Place' : 'Destination Place'}
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {selectedName ? selectedName : isOrigin ? 'Choose starting place...' : 'Choose destination place...'}
            </span>
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="p-1 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 shrink-0"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </button>

        {/* Mini Quick Icon Button */}
        <button
          type="button"
          onClick={onOpenVerticalBar}
          className={`p-1.5 rounded-lg shrink-0 transition-colors cursor-pointer ${
            isOrigin
              ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60'
              : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60'
          }`}
          title={isOrigin ? 'Browse Origin Directory' : 'Browse Destination Directory'}
        >
          {isOrigin ? <MapPin className="w-3.5 h-3.5" /> : <Landmark className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Animated Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full left-0 right-0 mt-2 z-[400] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[420px]"
          >
            {/* Header & Search */}
            <div className="p-3 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>{isOrigin ? '📍 Select Origin Location' : '🎯 Select Target Destination'}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      isOrigin
                        ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                        : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    {filteredIndianLocations.length + filteredDestinations.length} Places
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    isOrigin
                      ? 'Type city, station, village, state...'
                      : 'Search monument, city, temple, heritage site...'
                  }
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-[11px]">
                {(['ALL', 'ODISHA', 'METRO', 'HERITAGE', 'VILLAGE'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2 py-0.5 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                      categoryFilter === cat
                        ? isOrigin
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {cat === 'ALL'
                      ? 'All'
                      : cat === 'ODISHA'
                      ? '📍 Odisha'
                      : cat === 'METRO'
                      ? '🏙️ Metros'
                      : cat === 'HERITAGE'
                      ? '🏛️ Heritage'
                      : '🌾 Villages'}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Location List */}
            <div className="overflow-y-auto max-h-64 p-2 divide-y divide-slate-100 dark:divide-slate-800/60 space-y-2">
              
              {/* Special GPS Fix Option (Origin only) */}
              {isOrigin && onUseGps && (
                <div className="pb-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onUseGps();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-blue-50/90 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs group-hover:scale-105 transition-transform">
                        <LocateFixed className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                          <span>My Current Location</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 font-bold">
                            Live GPS
                          </span>
                        </div>
                        <p className="text-[10px] text-blue-600 dark:text-blue-400">
                          Route directly from where you are right now
                        </p>
                      </div>
                    </div>
                    {selectedName.toLowerCase().includes('current') && (
                      <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    )}
                  </button>
                </div>
              )}

              {/* Verified Monuments (Destination only) */}
              {!isOrigin && filteredDestinations.length > 0 && (
                <div className="pb-2 space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 pt-1 flex items-center gap-1">
                    <Landmark className="w-3 h-3 text-amber-500" />
                    <span>Verified Heritage Monuments</span>
                  </div>
                  {filteredDestinations.map((dest) => {
                    const isSelected = selectedName.toLowerCase() === dest.name.toLowerCase();
                    return (
                      <button
                        key={dest.id}
                        type="button"
                        onClick={() => {
                          onSelectDestination(dest);
                          setIsOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/70'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">🏛️</span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {dest.name}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                              <span>
                                {dest.city}, {dest.country}
                              </span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                • {dest.accessibilityScore?.overall || 95}/100 ♿
                              </span>
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Grouped Indian Locations */}
              {Object.keys(groupedFilteredByState).length > 0 ? (
                (Object.entries(groupedFilteredByState) as [string, IndianLocation[]][]).map(([stateName, locs]) => (
                  <div key={stateName} className="pt-2 space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 flex items-center justify-between">
                      <span>📍 {stateName}</span>
                      <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full font-bold">
                        {locs.length}
                      </span>
                    </div>

                    {locs.map((loc) => {
                      const isSelected =
                        selectedName.toLowerCase() === loc.name.toLowerCase() ||
                        selectedName.toLowerCase().startsWith(loc.name.toLowerCase());

                      return (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => {
                            if (isOrigin) {
                              onSelectOrigin(loc.name, loc.district, loc.state, loc.coordinates);
                            } else {
                              onSelectDestination(loc);
                            }
                            setIsOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                            isSelected
                              ? isOrigin
                                ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-700'
                                : 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800/70'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs shrink-0">
                              {loc.type === 'Metro City'
                                ? '🏙️'
                                : loc.type === 'Heritage Town' || loc.type === 'Pilgrim Town'
                                ? '🏛️'
                                : '🌾'}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                                <span>{loc.name}</span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded-md font-extrabold ${
                                    loc.type === 'Metro City'
                                      ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300'
                                      : loc.type === 'Heritage Town' || loc.type === 'Pilgrim Town'
                                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                                      : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                                  }`}
                                >
                                  {loc.type}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {loc.famousLandmark} • {loc.district}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <Check
                              className={`w-4 h-4 shrink-0 ${
                                isOrigin ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">
                  No places found matching "{searchQuery}".
                </div>
              )}
            </div>

            {/* Footer with Vertical Directory Launcher */}
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Looking for another settlement?
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenVerticalBar();
                }}
                className={`font-black text-xs flex items-center gap-1 hover:underline cursor-pointer ${
                  isOrigin ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Open Full Directory</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
