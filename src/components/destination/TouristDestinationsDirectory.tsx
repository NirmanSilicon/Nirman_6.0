import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Destination } from '../../types';
import { DestinationCard } from './DestinationCard';
import {
  SearchSuggestion,
  DestinationFilterOptions,
  DEFAULT_FILTERS,
  filterDestinations,
  getAutocompleteSuggestions,
} from '../../utils/destinationSearch';
import {
  POPULAR_SEARCH_PRESETS,
  getUniqueCountries,
  getUniqueStates,
  getUniqueCities,
} from '../../data/destinationsData';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  SlidersHorizontal,
  X,
  MapPin,
  ShieldCheck,
  Globe2,
  Building2,
  Sparkles,
  Bookmark,
  ChevronDown,
  RotateCcw,
  CheckCircle2,
  Layers,
  ArrowUpDown,
  Navigation,
  Compass,
  Bus,
  ParkingSquare,
  HelpCircle,
  Footprints,
} from 'lucide-react';

interface TouristDestinationsDirectoryProps {
  destinations: Destination[];
  onSelectDestination: (dest: Destination) => void;
  onViewDetails: (dest: Destination) => void;
}

export const TouristDestinationsDirectory: React.FC<TouristDestinationsDirectoryProps> = ({
  destinations,
  onSelectDestination,
  onViewDetails,
}) => {
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const { profile } = useAccessibility();

  // Filters State
  const [filters, setFilters] = useState<DestinationFilterOptions>(DEFAULT_FILTERS);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [showOnlyBookmarked, setShowOnlyBookmarked] = useState(false);

  // Autocomplete suggestions state
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close autocomplete on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute autocomplete suggestions
  const suggestions: SearchSuggestion[] = useMemo(() => {
    return getAutocompleteSuggestions(filters.searchQuery, destinations, 8);
  }, [filters.searchQuery, destinations]);

  // Derived filter options for dropdowns
  const availableCountries = useMemo(() => getUniqueCountries(destinations), [destinations]);
  const availableStates = useMemo(
    () => getUniqueStates(filters.country, destinations),
    [filters.country, destinations]
  );
  const availableCities = useMemo(
    () => getUniqueCities(filters.country, filters.state, destinations),
    [filters.country, filters.state, destinations]
  );

  // Filtered destinations list
  const filteredDestinations = useMemo(() => {
    let result = filterDestinations(destinations, filters);
    if (showOnlyBookmarked && user?.savedDestinations) {
      result = result.filter((d) => user.savedDestinations.includes(d.id));
    }
    return result;
  }, [destinations, filters, showOnlyBookmarked, user]);

  // Active filter count calculation
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.country !== 'ALL') count++;
    if (filters.state !== 'ALL') count++;
    if (filters.city !== 'ALL') count++;
    if (filters.category !== 'ALL') count++;
    if (filters.minScore > 0) count++;
    if (filters.wheelchairOnly) count++;
    if (filters.accessibleToiletOnly) count++;
    if (filters.accessibleParkingOnly) count++;
    if (filters.accessibleTransitOnly) count++;
    if (filters.zeroStairsOnly) count++;
    if (filters.rampOnly) count++;
    if (showOnlyBookmarked) count++;
    return count;
  }, [filters, showOnlyBookmarked]);

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setShowOnlyBookmarked(false);
  };

  const handleSelectSuggestion = (s: SearchSuggestion) => {
    if (s.destination) {
      setFilters((prev) => ({ ...prev, searchQuery: s.destination!.name }));
    } else if (s.type === 'COUNTRY') {
      setFilters((prev) => ({ ...prev, country: s.query, searchQuery: '' }));
    } else if (s.type === 'CITY') {
      setFilters((prev) => ({ ...prev, city: s.query, searchQuery: '' }));
    } else {
      setFilters((prev) => ({ ...prev, searchQuery: s.query }));
    }
    setIsSearchFocused(false);
  };

  const handlePresetClick = (query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">
              <Globe2 className="w-6 h-6" />
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Tourist Destinations & Heritage Database
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
            Explore verified barrier-free tourist destinations across all <strong>Indian states & Union Territories</strong> and <strong>major international world wonders</strong> with tactile audio assistance, ramp gradients, wheelchair access, and PRM escorts.
          </p>
        </div>

        {/* Global Summary Badge */}
        <div className="flex items-center gap-3 self-start lg:self-center">
          <div className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{destinations.length}+ Universal Verified Sites</span>
          </div>
          {isAuthenticated && (
            <button
              onClick={() => setShowOnlyBookmarked(!showOnlyBookmarked)}
              className={`px-3.5 py-2 rounded-2xl border transition-all text-xs font-bold flex items-center gap-1.5 shadow-sm ${
                showOnlyBookmarked
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${showOnlyBookmarked ? 'fill-white' : ''}`} />
              <span>Saved ({user?.savedDestinations?.length || 0})</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Search & Quick Presets Box */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
        {/* Search Bar with Autocomplete Dropdown */}
        <div ref={searchContainerRef} className="relative w-full">
          <div className="relative flex items-center">
            <Search className="w-5 h-5 absolute left-4 text-blue-600 dark:text-blue-400 pointer-events-none" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, searchQuery: e.target.value }));
                setIsSearchFocused(true);
              }}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Search destination, city, country, monument (e.g. Konark, Delhi, Paris, Dubai, Japan, Taj Mahal)..."
              className="w-full pl-12 pr-28 py-3.5 sm:py-4 bg-slate-50 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800 text-sm sm:text-base font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-hidden transition-all shadow-inner"
            />
            <div className="absolute right-3 flex items-center gap-1.5">
              {filters.searchQuery && (
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, searchQuery: '' }))}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  isFilterPanelOpen || activeFiltersCount > 0
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-white text-blue-600 text-[10px] font-black flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Autocomplete Suggestions Popup */}
          {isSearchFocused && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in-50 slide-in-from-top-2 duration-150">
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <span>Instant Suggestions ({suggestions.length})</span>
                <span>Click to select</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSuggestion(s)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors group"
                  >
                    <div className="flex items-center gap-3 truncate">
                      {s.imageUrl ? (
                        <img
                          src={s.imageUrl}
                          alt={s.title}
                          className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center shrink-0">
                          {s.type === 'COUNTRY' ? <Globe2 className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                        </div>
                      )}
                      <div className="truncate">
                        <div className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                          {s.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                          <span>{s.subtitle}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {s.badge && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                          {s.badge}
                        </span>
                      )}
                      <Navigation className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Popular Preset Chips */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Popular:</span>
          </span>
          {POPULAR_SEARCH_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handlePresetClick(preset.query)}
              className={`px-3 py-1.5 rounded-xl border font-semibold transition-all ${
                filters.searchQuery.toLowerCase() === preset.query.toLowerCase()
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title={preset.desc}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Expanded Filters Drawer / Panel */}
        {isFilterPanelOpen && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                <span>Precision Accessibility & Location Filters</span>
              </h3>
              {activeFiltersCount > 0 && (
                <button
                  onClick={handleClearFilters}
                  className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset All ({activeFiltersCount})</span>
                </button>
              )}
            </div>

            {/* Dropdown Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-semibold">
              {/* Country Select */}
              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400">Country</label>
                <select
                  value={filters.country}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      country: e.target.value,
                      state: 'ALL',
                      city: 'ALL',
                    }))
                  }
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-600"
                >
                  <option value="ALL">🌍 All Countries ({availableCountries.length})</option>
                  {availableCountries.map((c) => (
                    <option key={c} value={c}>
                      {c === 'India' ? '🇮🇳' : c === 'France' ? '🇫🇷' : c === 'United Arab Emirates' ? '🇦🇪' : c === 'Japan' ? '🇯🇵' : c === 'Italy' ? '🇮🇹' : c === 'United Kingdom' ? '🇬🇧' : c === 'Singapore' ? '🇸🇬' : c === 'Egypt' ? '🇪🇬' : c === 'Australia' ? '🇦🇺' : c === 'Brazil' ? '🇧🇷' : '🌐'} {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* State / Region Select */}
              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400">State / Region</label>
                <select
                  value={filters.state}
                  onChange={(e) => setFilters((prev) => ({ ...prev, state: e.target.value, city: 'ALL' }))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-600"
                >
                  <option value="ALL">🏛️ All States & UTs ({availableStates.length})</option>
                  {availableStates.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* City Select */}
              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400">City</label>
                <select
                  value={filters.city}
                  onChange={(e) => setFilters((prev) => ({ ...prev, city: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-600"
                >
                  <option value="ALL">🏙️ All Cities ({availableCities.length})</option>
                  {availableCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              {/* Minimum Accessibility Score */}
              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400">Accessibility Score</label>
                <select
                  value={filters.minScore}
                  onChange={(e) => setFilters((prev) => ({ ...prev, minScore: Number(e.target.value) }))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-600"
                >
                  <option value={0}>All Verified Scores</option>
                  <option value={95}>🌟 Elite Access (95%+ Score)</option>
                  <option value={90}>🟢 High Accessibility (90%+ Score)</option>
                  <option value={75}>🔵 Standard Barrier-Free (75%+)</option>
                </select>
              </div>
            </div>

            {/* Accessible Facilities Toggle Badges */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Required Step-Free & PRM Facilities:
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    key: 'wheelchairOnly',
                    label: '♿ Wheelchair Step-Free Entrance',
                    active: filters.wheelchairOnly,
                  },
                  {
                    key: 'accessibleToiletOnly',
                    label: '🚻 Accessible Restrooms',
                    active: filters.accessibleToiletOnly,
                  },
                  {
                    key: 'accessibleParkingOnly',
                    label: '🅿️ Accessible PRM Parking',
                    active: filters.accessibleParkingOnly,
                  },
                  {
                    key: 'accessibleTransitOnly',
                    label: '🚆 Accessible Public Transport',
                    active: filters.accessibleTransitOnly,
                  },
                  {
                    key: 'rampOnly',
                    label: '📐 Gentle 1:12 Ramps',
                    active: filters.rampOnly,
                  },
                  {
                    key: 'zeroStairsOnly',
                    label: '🚫 Zero Stairs',
                    active: filters.zeroStairsOnly,
                  },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        [item.key]: !prev[item.key as keyof DestinationFilterOptions],
                      }))
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                      item.active
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${item.active ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Category Pills & Sorting Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'ALL', label: `All Sights (${destinations.length})` },
            { key: 'HERITAGE', label: '🏛️ Heritage & Monuments' },
            { key: 'MUSEUM', label: '🎨 Art & Museums' },
            { key: 'RELIGIOUS', label: '⛩️ Temples & Holy Sites' },
            { key: 'PARK', label: '🏞️ National Parks & Nature' },
            { key: 'TRANSPORT_HUB', label: '✈️ Transit & Stations' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilters((prev) => ({ ...prev, category: key }))}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                filters.category === key
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Sorting Dropdown & Results Counter */}
        <div className="flex items-center gap-3 self-end md:self-center">
          <div className="text-xs font-bold text-slate-500">
            Showing <strong>{filteredDestinations.length}</strong> of {destinations.length}
          </div>
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filters.sortBy}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  sortBy: e.target.value as DestinationFilterOptions['sortBy'],
                }))
              }
              className="bg-transparent border-none focus:outline-hidden text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <option value="SCORE_DESC">Highest Accessibility Score</option>
              <option value="NAME_ASC">Name (A to Z)</option>
              <option value="CROWD_LOW">Lowest Crowd Density</option>
            </select>
          </div>
        </div>
      </div>

      {/* Destinations Grid */}
      {filteredDestinations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDestinations.map((dest) => (
            <DestinationCard
              key={dest.id}
              destination={dest}
              onSelect={onSelectDestination}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
            <Search className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              No matching destinations found
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              We couldn't find any sights matching "{filters.searchQuery || 'selected criteria'}". Try searching for "Konark", "Delhi", "Paris", "Dubai", or reset the filters.
            </p>
          </div>
          <button
            onClick={handleClearFilters}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all inline-flex items-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Search Filters</span>
          </button>
        </div>
      )}
    </div>
  );
};
