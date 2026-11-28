import React, { useState, useMemo } from 'react';
import {
  ALL_INDIAN_LOCATIONS,
  INDIAN_STATES_AND_UTS,
  IndianLocation,
  SettlementType,
  matchesIndianLocationSearch,
} from '../../data/indianLocationsData';
import {
  Search,
  MapPin,
  Building2,
  TreePine,
  Landmark,
  ShieldCheck,
  Compass,
  X,
  CheckCircle2,
  Layers,
  ChevronRight,
  Filter,
  Sparkles,
} from 'lucide-react';

interface IndianLocationsVerticalBarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (loc: IndianLocation, role: 'start' | 'destination') => void;
  currentStartLocation?: string;
  currentDestinationName?: string;
  targetMode?: 'start' | 'destination';
}

export const IndianLocationsVerticalBar: React.FC<IndianLocationsVerticalBarProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  currentStartLocation,
  currentDestinationName,
  targetMode: initialTargetMode = 'start',
}) => {
  const [activeRoleMode, setActiveRoleMode] = useState<'start' | 'destination'>(initialTargetMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState<string>('All States & UTs');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'all' | 'odisha' | 'villages' | 'heritage'>('all');

  // Synchronize target mode when prop changes
  React.useEffect(() => {
    if (initialTargetMode) {
      setActiveRoleMode(initialTargetMode);
    }
  }, [initialTargetMode, isOpen]);

  // Filtered Locations
  const filteredLocations = useMemo(() => {
    return ALL_INDIAN_LOCATIONS.filter((loc) => {
      // 1. Text Search
      if (searchQuery.trim() && !matchesIndianLocationSearch(loc, searchQuery)) {
        return false;
      }

      // 2. State filter
      if (selectedState !== 'All States & UTs' && loc.state !== selectedState) {
        return false;
      }

      // 3. Settlement Type Filter
      if (selectedType === 'METRO' && loc.type !== 'Metro City' && loc.type !== 'Tier-2 City') {
        return false;
      }
      if (selectedType === 'TOWN' && loc.type !== 'Heritage Town' && loc.type !== 'Commercial Town' && loc.type !== 'Pilgrim Town') {
        return false;
      }
      if (selectedType === 'VILLAGE' && !loc.type.toLowerCase().includes('village')) {
        return false;
      }

      // 4. Quick Tab presets
      if (activeTab === 'odisha' && loc.state !== 'Odisha') return false;
      if (activeTab === 'villages' && !loc.type.toLowerCase().includes('village')) return false;
      if (activeTab === 'heritage' && !loc.type.toLowerCase().includes('heritage') && !loc.type.toLowerCase().includes('pilgrim')) return false;

      return true;
    });
  }, [searchQuery, selectedState, selectedType, activeTab]);

  // Group locations by state for clean hierarchical vertical viewing
  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ALL_INDIAN_LOCATIONS.forEach((loc) => {
      counts[loc.state] = (counts[loc.state] || 0) + 1;
    });
    return counts;
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex justify-end bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Slide-in Vertical Option Bar / Panel */}
      <div className="relative w-full max-w-xl sm:max-w-2xl md:max-w-3xl h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
        
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                <Compass className="w-6 h-6 text-amber-300 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black flex items-center gap-2">
                  <span>Indian Cities, Towns & Villages</span>
                  <span className="text-xs px-2 py-0.5 bg-amber-400 text-slate-950 font-black rounded-full">
                    {ALL_INDIAN_LOCATIONS.length}+ Locations
                  </span>
                </h2>
                <p className="text-xs text-blue-100 mt-0.5">
                  Select any Indian metro, heritage town, pilgrim hub, or rural village as your {activeRoleMode === 'start' ? 'Starting Origin' : 'Target Destination'}.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
              title="Close Panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Role Mode Selector (Start Origin vs Target Destination) */}
          <div className="mt-3.5 p-1 bg-black/20 backdrop-blur-md rounded-xl flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveRoleMode('start')}
              className={`flex-1 py-1.5 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeRoleMode === 'start'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-blue-200" />
              <span>Select as Start Origin (Departure)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveRoleMode('destination')}
              className={`flex-1 py-1.5 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeRoleMode === 'destination'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Landmark className="w-3.5 h-3.5 text-emerald-200" />
              <span>Select as Target Destination</span>
            </button>
          </div>

          {/* Quick Presets Tabs */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar text-xs">
            {[
              { key: 'all', label: '🇮🇳 All India Directory', icon: Layers },
              { key: 'odisha', label: '🏛️ Odisha (Bhubaneswar, Puri, Villages)', icon: Landmark },
              { key: 'villages', label: '🌳 Rural & Heritage Villages', icon: TreePine },
              { key: 'heritage', label: '⛩️ Pilgrim & Heritage Sites', icon: Sparkles },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => {
                  setActiveTab(key as any);
                  if (key === 'odisha') setSelectedState('Odisha');
                  else if (key === 'all') setSelectedState('All States & UTs');
                }}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                  activeTab === key
                    ? 'bg-white text-slate-900 shadow-md scale-102 font-black'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
          
          {/* Universal Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by city, town, village name, district, state or pin..."
              className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1 text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Dual Filter Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            
            {/* State / UT Selector */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                aria-label="Filter by State or Union Territory"
                className="w-full bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden"
              >
                {INDIAN_STATES_AND_UTS.map((st) => (
                  <option key={st} value={st} className="dark:bg-slate-900">
                    {st} {st !== 'All States & UTs' && stateCounts[st] ? `(${stateCounts[st]})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Settlement Category Filter */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <Filter className="w-4 h-4 text-emerald-600 shrink-0" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                aria-label="Filter by Settlement Category"
                className="w-full bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden"
              >
                <option value="ALL" className="dark:bg-slate-900">All Settlements (Cities, Towns, Villages)</option>
                <option value="METRO" className="dark:bg-slate-900">🏙️ Metro & Tier-1/2 Cities</option>
                <option value="TOWN" className="dark:bg-slate-900">🏛️ Heritage & Pilgrim Towns</option>
                <option value="VILLAGE" className="dark:bg-slate-900">🌳 Villages & Gram Panchayats</option>
              </select>
            </div>

          </div>
        </div>

        {/* Results Counter Bar */}
        <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 shrink-0">
          <span className="font-semibold">
            Showing <strong className="text-slate-900 dark:text-white">{filteredLocations.length}</strong> settlements in {selectedState}
          </span>
          <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Verified Accessible Transit
          </span>
        </div>

        {/* Vertical Options Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredLocations.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <MapPin className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No Indian settlements found matching "{searchQuery}"
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try searching for another city, village name, district, or reset your state filter.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedState('All States & UTs');
                  setSelectedType('ALL');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredLocations.map((loc) => {
              const isCurrentStart = currentStartLocation?.toLowerCase().includes(loc.name.toLowerCase()) ||
                currentStartLocation?.toLowerCase().includes(loc.district.toLowerCase());
              const isCurrentDest = currentDestinationName?.toLowerCase().includes(loc.name.toLowerCase()) ||
                currentDestinationName?.toLowerCase().includes(loc.district.toLowerCase());

              return (
                <div
                  key={loc.id}
                  className={`pt-3 first:pt-0 p-3.5 rounded-2xl transition-all border ${
                    isCurrentDest
                      ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 ring-2 ring-emerald-500/20'
                      : isCurrentStart
                      ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    
                    {/* Location Info */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {loc.name}
                        </h3>

                        {isCurrentDest && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                            🎯 Current Destination
                          </span>
                        )}

                        {isCurrentStart && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-xs">
                            📍 Current Start
                          </span>
                        )}

                        {/* Settlement Type Badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            loc.type.includes('Village')
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : loc.type.includes('Metro')
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {loc.type}
                        </span>

                        {loc.popular && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                            ★ Top Hub
                          </span>
                        )}
                      </div>

                      {/* District, State & Pin */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <span className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-blue-500" />
                          {loc.district} District, {loc.state}
                        </span>
                        {loc.pincode && <span>• PIN: {loc.pincode}</span>}
                        <span>• Region: {loc.region}</span>
                      </div>

                      {/* Famous Landmark */}
                      <div className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1">
                        <Landmark className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span><strong>Landmark:</strong> {loc.famousLandmark}</span>
                      </div>

                      {/* Accessible Transit */}
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            ♿ Accessibility: {loc.wheelchairFriendliness}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400">
                          {loc.accessibleTransit}
                        </p>
                      </div>
                    </div>

                    {/* Action Select Buttons */}
                    <div className="flex sm:flex-col gap-2 shrink-0 justify-end sm:justify-start min-w-[150px]">
                      {activeRoleMode === 'destination' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectLocation(loc, 'destination');
                              onClose();
                            }}
                            className="flex-1 sm:flex-initial px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Set Target Destination</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              onSelectLocation(loc, 'start');
                              onClose();
                            }}
                            className="flex-1 sm:flex-initial px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 dark:hover:text-blue-400 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                          >
                            <span>Set Start Origin</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectLocation(loc, 'start');
                              onClose();
                            }}
                            className="flex-1 sm:flex-initial px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Set Start Origin</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              onSelectLocation(loc, 'destination');
                              onClose();
                            }}
                            className="flex-1 sm:flex-initial px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                          >
                            <span>Set as Target</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Summary */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>All 28 Indian States & 8 UTs Included</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-xl font-bold transition-colors"
          >
            Close Directory
          </button>
        </div>

      </div>
    </div>
  );
};
