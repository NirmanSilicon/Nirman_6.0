import React, { useState, useMemo } from 'react';
import { BarrierReport, BarrierType, BarrierStatus } from '../../types';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useLanguage } from '../../context/LanguageContext';
import { ConfidenceRating } from '../common/ConfidenceRating';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  ShieldCheck,
  Filter,
  Plus,
  RefreshCw,
  Search,
  X,
  Compass,
  Building,
  Navigation,
  Activity,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface BarrierListProps {
  barriers: BarrierReport[];
  onOpenReportModal: () => void;
  onRefresh: () => void;
}

const REGION_PRESETS = [
  { id: 'ALL', label: 'All Regions' },
  { id: 'INDIA', label: '🇮🇳 All India' },
  { id: 'Odisha', label: 'Odisha' },
  { id: 'Delhi', label: 'Delhi NCR' },
  { id: 'Uttar Pradesh', label: 'Uttar Pradesh' },
  { id: 'Rajasthan', label: 'Rajasthan' },
  { id: 'Punjab', label: 'Punjab' },
  { id: 'Maharashtra', label: 'Maharashtra' },
  { id: 'Karnataka', label: 'Karnataka' },
  { id: 'Tamil Nadu', label: 'Tamil Nadu' },
  { id: 'Kerala', label: 'Kerala' },
  { id: 'West Bengal', label: 'West Bengal' },
  { id: 'Gujarat', label: 'Gujarat' },
  { id: 'Telangana', label: 'Telangana' },
  { id: 'Goa', label: 'Goa' },
  { id: 'INTERNATIONAL', label: '🌍 International' },
];

export const BarrierList: React.FC<BarrierListProps> = ({
  barriers,
  onOpenReportModal,
  onRefresh,
}) => {
  const { role } = useAccessibility();
  const { t } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterRegion, setFilterRegion] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [selectedDestinationFilter, setSelectedDestinationFilter] = useState<string>('ALL');

  // Extract unique destinations from barriers
  const uniqueDestinations = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    barriers.forEach((b) => {
      if (b.destinationId && b.destinationName) {
        map.set(b.destinationId, { id: b.destinationId, name: b.destinationName });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [barriers]);

  // Filtered Barriers
  const filtered = useMemo(() => {
    return barriers.filter((b) => {
      // Status filter
      if (filterStatus !== 'ALL') {
        if (filterStatus === 'ACTIVE_OR_REVIEW') {
          if (b.status === 'RESOLVED') return false;
        } else if (b.status !== filterStatus) {
          return false;
        }
      }

      // Barrier Type filter
      if (filterType !== 'ALL' && b.barrierType !== filterType) {
        return false;
      }

      // Specific Destination filter
      if (
        selectedDestinationFilter !== 'ALL' &&
        b.destinationId !== selectedDestinationFilter &&
        b.destinationName !== selectedDestinationFilter
      ) {
        return false;
      }

      // Region filter
      if (filterRegion !== 'ALL') {
        const destNameLower = (b.destinationName || '').toLowerCase();
        const locNameLower = (b.locationName || '').toLowerCase();
        const combined = `${destNameLower} ${locNameLower}`;

        if (filterRegion === 'INDIA') {
          // If it's not international (louvre, eiffel, colosseum, etc.)
          if (b.destinationId?.startsWith('dest-louvre') || b.destinationId?.startsWith('dest-eiffel') || b.destinationId?.startsWith('dest-colosseum') || b.id.startsWith('bar-intl')) {
            return false;
          }
        } else if (filterRegion === 'INTERNATIONAL') {
          if (!b.id.startsWith('bar-intl') && !b.destinationId?.includes('louvre') && !b.destinationId?.includes('eiffel') && !b.destinationId?.includes('colosseum')) {
            return false;
          }
        } else {
          const regLower = filterRegion.toLowerCase();
          const matches =
            combined.includes(regLower) ||
            (filterRegion === 'Odisha' && (combined.includes('konark') || combined.includes('puri') || combined.includes('lingaraj') || combined.includes('dhauli') || combined.includes('udayagiri') || combined.includes('museum') || combined.includes('nandankanan') || combined.includes('mukteshwar') || combined.includes('rajarani') || combined.includes('bhubaneswar'))) ||
            (filterRegion === 'Delhi' && (combined.includes('delhi') || combined.includes('india gate') || combined.includes('red fort') || combined.includes('qutub') || combined.includes('lotus temple') || combined.includes('kartavya'))) ||
            (filterRegion === 'Uttar Pradesh' && (combined.includes('taj') || combined.includes('agra') || combined.includes('varanasi') || combined.includes('kashi') || combined.includes('ghat'))) ||
            (filterRegion === 'Rajasthan' && (combined.includes('amber') || combined.includes('jaipur') || combined.includes('udaipur') || combined.includes('city palace'))) ||
            (filterRegion === 'Punjab' && (combined.includes('amritsar') || combined.includes('golden temple') || combined.includes('harmandir'))) ||
            (filterRegion === 'Maharashtra' && (combined.includes('mumbai') || combined.includes('gateway') || combined.includes('ellora') || combined.includes('ajanta') || combined.includes('kailasa'))) ||
            (filterRegion === 'Karnataka' && (combined.includes('mysore') || combined.includes('hampi') || combined.includes('bengaluru') || combined.includes('lalbagh'))) ||
            (filterRegion === 'Tamil Nadu' && (combined.includes('meenakshi') || combined.includes('madurai') || combined.includes('chennai') || combined.includes('marina'))) ||
            (filterRegion === 'Kerala' && (combined.includes('alleppey') || combined.includes('alappuzha') || combined.includes('kochi') || combined.includes('backwaters'))) ||
            (filterRegion === 'West Bengal' && (combined.includes('victoria') || combined.includes('kolkata') || combined.includes('darjeeling'))) ||
            (filterRegion === 'Gujarat' && (combined.includes('statue of unity') || combined.includes('kevadia') || combined.includes('narmada'))) ||
            (filterRegion === 'Telangana' && (combined.includes('charminar') || combined.includes('hyderabad') || combined.includes('laad bazaar'))) ||
            (filterRegion === 'Goa' && (combined.includes('goa') || combined.includes('bom jesus')));

          if (!matches) return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = b.title.toLowerCase().includes(q);
        const matchDesc = b.description.toLowerCase().includes(q);
        const matchDest = (b.destinationName || '').toLowerCase().includes(q);
        const matchLoc = (b.locationName || '').toLowerCase().includes(q);
        const matchType = b.barrierType.toLowerCase().replace('_', ' ').includes(q);
        if (!matchTitle && !matchDesc && !matchDest && !matchLoc && !matchType) {
          return false;
        }
      }

      return true;
    });
  }, [barriers, filterStatus, filterRegion, filterType, selectedDestinationFilter, searchQuery]);

  // Statistics
  const activeCount = useMemo(
    () => barriers.filter((b) => b.status === 'ACTIVE_BARRIER' || b.status === 'REPORTED').length,
    [barriers]
  );
  const underReviewCount = useMemo(
    () => barriers.filter((b) => b.status === 'UNDER_REVIEW').length,
    [barriers]
  );
  const resolvedCount = useMemo(
    () => barriers.filter((b) => b.status === 'RESOLVED').length,
    [barriers]
  );

  const resetAllFilters = () => {
    setSearchQuery('');
    setFilterStatus('ALL');
    setFilterRegion('ALL');
    setFilterType('ALL');
    setSelectedDestinationFilter('ALL');
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 uppercase tracking-wide">
                Live Sensor & Community Feed
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                {barriers.length} Real-Time Reports Across India & Worldwide
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
              <span>{t('barriers')} / Real-Time Obstruction Tracker</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              Auditor-verified and community-reported obstacles across all Indian tourist destinations: blocked wheelchair ramps, out-of-order lifts, surface construction, and active detours.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onRefresh}
              className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-bold"
              title="Refresh Barriers"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={onOpenReportModal}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{t('reportBarrier')}</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Metric Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Reports</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{barriers.length}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Across Indian & World Monuments</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-red-50/70 dark:bg-red-950/30 border border-red-200/80 dark:border-red-900/60">
            <div className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              Active Obstacles
            </div>
            <div className="text-2xl font-black text-red-700 dark:text-red-300 mt-0.5">{activeCount}</div>
            <div className="text-[10px] text-red-600/80 dark:text-red-400/80 mt-0.5">Requires bypass detour</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60">
            <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Under Review</div>
            <div className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-0.5">{underReviewCount}</div>
            <div className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">Auditors inspecting on-site</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60">
            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              Resolved & Clear
            </div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{resolvedCount}</div>
            <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Verified step-free access</div>
          </div>
        </div>

        {/* Search and Filters Bar */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by destination (Konark, Taj Mahal, Red Fort), obstacle, or location..."
                className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Destination Specific Dropdown */}
            <div className="md:col-span-4">
              <select
                value={selectedDestinationFilter}
                onChange={(e) => setSelectedDestinationFilter(e.target.value)}
                className="w-full py-2.5 px-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">🏛️ All Indian & Global Destinations</option>
                {uniqueDestinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Barrier Type Dropdown */}
            <div className="md:col-span-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full py-2.5 px-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">⚡ All Obstacle Types</option>
                <option value="BLOCKED_RAMP">🚫 Blocked Ramps</option>
                <option value="LIFT_NOT_WORKING">🛗 Lift Out of Service</option>
                <option value="BROKEN_PAVEMENT">⚠️ Uneven / Broken Pavement</option>
                <option value="CONSTRUCTION">🚧 Scaffolding & Construction</option>
                <option value="ROAD_OBSTRUCTION">🚧 Pathway / Road Obstruction</option>
                <option value="CROWDING">👥 Festival / Queue Crowding</option>
                <option value="TRANSPORT_ACCESSIBILITY_FAILURE">🚌 Accessible Transport Maintenance</option>
                <option value="ACCESSIBLE_TOILET_UNAVAILABLE">🚻 Accessible Toilet Closed</option>
              </select>
            </div>
          </div>

          {/* Region Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Region:
            </span>
            {REGION_PRESETS.map((reg) => (
              <button
                key={reg.id}
                onClick={() => setFilterRegion(reg.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  filterRegion === reg.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {reg.label}
              </button>
            ))}
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'ALL', label: 'All Statuses' },
                { key: 'ACTIVE_BARRIER', label: '🚧 Active Barriers' },
                { key: 'UNDER_REVIEW', label: '🔍 Under Auditor Review' },
                { key: 'REPORTED', label: '📢 Community Reported' },
                { key: 'RESOLVED', label: '✅ Resolved & Clear' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilterStatus(key)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    filterStatus === key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {(searchQuery || filterStatus !== 'ALL' || filterRegion !== 'ALL' || filterType !== 'ALL' || selectedDestinationFilter !== 'ALL') && (
              <button
                onClick={resetAllFilters}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Reset all filters ({filtered.length} shown)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Barriers Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Barrier Reports Match Your Filter</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              We did not find any obstruction reports for the selected filters. You can clear the search or report a new obstacle at any Indian tourist destination.
            </p>
          </div>
          <button
            onClick={resetAllFilters}
            className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs shadow-md hover:bg-blue-700 transition-colors"
          >
            Show All {barriers.length} Barrier Reports
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((barrier) => {
            const isActive = barrier.status === 'ACTIVE_BARRIER' || barrier.status === 'REPORTED';
            const isResolved = barrier.status === 'RESOLVED';
            const isUnderReview = barrier.status === 'UNDER_REVIEW';

            return (
              <div
                key={barrier.id}
                className={`rounded-3xl border overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                  isActive
                    ? 'border-red-200 dark:border-red-900/80 bg-white dark:bg-slate-900'
                    : isResolved
                    ? 'border-emerald-200 dark:border-emerald-900/80 bg-white dark:bg-slate-900 opacity-90'
                    : 'border-amber-200 dark:border-amber-900/80 bg-white dark:bg-slate-900'
                }`}
              >
                {/* Photo Preview if available */}
                {barrier.photoUrl && (
                  <div className="relative h-44 w-full overflow-hidden bg-slate-800">
                    <img
                      src={barrier.photoUrl}
                      alt={barrier.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    
                    {/* Status Pill Badge */}
                    <div className="absolute top-3 left-3">
                      <span
                        className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg shadow-md flex items-center gap-1 ${
                          isActive
                            ? 'bg-red-600 text-white'
                            : isResolved
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-600 text-white'
                        }`}
                      >
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                        {isResolved && <CheckCircle2 className="w-3 h-3" />}
                        {isUnderReview && <Clock className="w-3 h-3" />}
                        {barrier.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Barrier Type Badge */}
                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-1 text-[10px] font-bold bg-black/60 backdrop-blur-xs text-white rounded-lg border border-white/20">
                        {barrier.barrierType.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="absolute bottom-2.5 left-3 right-3 text-white">
                      <div className="text-xs font-black truncate drop-shadow-xs">
                        {barrier.destinationName}
                      </div>
                    </div>
                  </div>
                )}

                {/* Card Body */}
                <div className="p-5 space-y-3.5 grow flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span className="truncate font-semibold text-slate-700 dark:text-slate-300">
                        {barrier.locationName}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {barrier.title}
                    </h3>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                      {barrier.description}
                    </p>

                    {/* AI Evidence Badge if present */}
                    {barrier.aiAnalysis && (
                      <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl space-y-1 text-[11px]">
                        <div className="font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-blue-600" />
                          AI Sensor: {barrier.aiAnalysis.detectedIssues.join(', ')}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {barrier.aiAnalysis.disclaimer}
                        </div>
                      </div>
                    )}

                    {/* Latest Audit Note if present */}
                    {barrier.auditHistory && barrier.auditHistory.length > 0 && (
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-[11px] border border-slate-200/60 dark:border-slate-700/60 space-y-0.5">
                        <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            {barrier.auditHistory[barrier.auditHistory.length - 1].auditorName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {barrier.auditHistory[barrier.auditHistory.length - 1].action}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-600 dark:text-slate-400 italic">
                          "{barrier.auditHistory[barrier.auditHistory.length - 1].notes}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {barrier.reportedDate}
                    </span>
                    <ConfidenceRating
                      score={barrier.confidence || 85}
                      variant="pill"
                      entityName={barrier.title}
                      entityType="BARRIER"
                      auditorName={barrier.reportedBy?.userName || 'Accessibility Field Sensor'}
                      verifiedDate={barrier.reportedDate}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
