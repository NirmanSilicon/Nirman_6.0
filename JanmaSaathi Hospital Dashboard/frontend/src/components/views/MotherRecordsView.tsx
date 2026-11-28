import React, { useMemo, useState } from 'react';
import { Lock, Search } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import {
  EmptyState,
  SectionHeader,
  StatusText,
  toneForAlertStatus,
  toneForReferralStatus,
  toneForRisk,
} from '../ui/ClinicalPrimitives';
import { CollectionStateGate } from '../ui/FirestoreStatePanels';

export const MotherRecordsView: React.FC = () => {
  const {
    appMode,
    mothers,
    healthWorkers,
    openMotherProfile,
    collectionStatuses,
    currentUser,
    refreshAllSubscriptions,
  } = useDashboard();

  const [query, setQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('All');
  const [trimesterFilter, setTrimesterFilter] = useState<string>('All');
  const [alertFilter, setAlertFilter] = useState<string>('All');
  const [workerFilter, setWorkerFilter] = useState<string>('All');
  const [page, setPage] = useState<number>(1);
  const PAGE_SIZE = 15;

  const filteredMothers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mothers.filter((m) => {
      if (q) {
        const matchesQuery =
          m.id.toLowerCase().includes(q) ||
          m.fullName.toLowerCase().includes(q) ||
          (m.regionalName && m.regionalName.includes(query.trim())) ||
          m.assignedHealthWorkerName.toLowerCase().includes(q) ||
          m.block.toLowerCase().includes(q) ||
          m.villageOrWard.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }
      if (riskFilter !== 'All' && m.riskLevel !== riskFilter) return false;
      if (trimesterFilter !== 'All' && String(m.trimester) !== trimesterFilter) return false;
      if (alertFilter === 'Active' && (m.alertStatus === 'None' || m.alertStatus === 'Resolved')) {
        return false;
      }
      if (alertFilter === 'None' && m.alertStatus !== 'None') return false;
      if (workerFilter !== 'All' && m.assignedHealthWorkerId !== workerFilter) return false;
      return true;
    });
  }, [mothers, query, riskFilter, trimesterFilter, alertFilter, workerFilter]);

  const hasActiveFilters =
    query.trim() !== '' ||
    riskFilter !== 'All' ||
    trimesterFilter !== 'All' ||
    alertFilter !== 'All' ||
    workerFilter !== 'All';

  const totalPages = Math.max(1, Math.ceil(filteredMothers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedMothers = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredMothers.slice(start, start + PAGE_SIZE);
  }, [filteredMothers, safePage]);

  const resetFilters = () => {
    setQuery('');
    setRiskFilter('All');
    setTrimesterFilter('All');
    setAlertFilter('All');
    setWorkerFilter('All');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Mother Records"
        subtitle={
          appMode === 'demo'
            ? 'JanmaSaathi demo maternal directory (Priya Sharma and linked mothers). Select any mother to open her profile.'
            : 'Live maternal directory from Firestore. Select any mother to open her full tabbed health profile.'
        }
        actions={
          <div className="text-xs text-[#665860] tabular-nums">
            Showing <span className="font-semibold text-[#30232A]">{filteredMothers.length}</span> of{' '}
            {mothers.length} records
          </div>
        }
      />

      <CollectionStateGate
        syncState={collectionStatuses.mothers}
        userEmail={currentUser.email}
        userId={currentUser.uid}
        userRole={currentUser.role}
        onRetry={refreshAllSubscriptions}
        loadingLabel="Loading mother records from Firestore..."
      >
        {/* Search & Filter Toolbar */}
        <div className="bg-white border border-[#DDD8CB] rounded-lg p-4 flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-[#665860] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by Mother ID, name (English / ଓଡ଼ିଆ / हिन्दी), block, or worker..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#FBFBF7] border border-[#DDD8CB] rounded-md text-[#30232A] focus:outline-none focus:border-[#890149]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              aria-label="Filter by clinical risk priority"
              className="px-3 py-2 text-xs font-medium bg-white border border-[#DDD8CB] rounded-md text-[#30232A] focus:outline-none focus:border-[#890149]"
            >
              <option value="All">All Risk Levels</option>
              <option value="Critical">Critical</option>
              <option value="High Priority">High Priority</option>
              <option value="Moderate">Moderate</option>
              <option value="Routine">Routine</option>
            </select>

            <select
              value={trimesterFilter}
              onChange={(e) => setTrimesterFilter(e.target.value)}
              aria-label="Filter by pregnancy trimester"
              className="px-3 py-2 text-xs font-medium bg-white border border-[#DDD8CB] rounded-md text-[#30232A] focus:outline-none focus:border-[#890149]"
            >
              <option value="All">All Trimesters</option>
              <option value="1">1st Trimester</option>
              <option value="2">2nd Trimester</option>
              <option value="3">3rd Trimester</option>
            </select>

            <select
              value={alertFilter}
              onChange={(e) => setAlertFilter(e.target.value)}
              aria-label="Filter by alert status"
              className="px-3 py-2 text-xs font-medium bg-white border border-[#DDD8CB] rounded-md text-[#30232A] focus:outline-none focus:border-[#890149]"
            >
              <option value="All">All Alert States</option>
              <option value="Active">Active Alert Only</option>
              <option value="None">No Active Alerts</option>
            </select>

            <select
              value={workerFilter}
              onChange={(e) => setWorkerFilter(e.target.value)}
              aria-label="Filter by assigned health worker"
              className="px-3 py-2 text-xs font-medium bg-white border border-[#DDD8CB] rounded-md text-[#30232A] focus:outline-none focus:border-[#890149]"
            >
              <option value="All">All Health Workers</option>
              {healthWorkers.map((hw) => (
                <option key={hw.id} value={hw.id}>
                  {hw.name} ({hw.block})
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-3 py-2 text-xs font-medium text-[#890149] hover:underline whitespace-nowrap cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Mother Directory Table */}
        {mothers.length === 0 ? (
          <EmptyState
            title={appMode === 'demo' ? 'No mother records in demo session' : 'No mother records in Firestore'}
            description={
              appMode === 'demo'
                ? 'Reset demo fixtures in Settings to restore the original JanmaSaathi sample mothers.'
                : 'The "mothers" collection in the connected JanmaSaathi database currently contains 0 accessible documents.'
            }
          />
        ) : filteredMothers.length === 0 ? (
          <EmptyState
            title="No matching maternal records"
            description="Try broadening your search text or clearing one of the clinical filters above."
            action={
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 text-xs font-medium bg-[#890149] text-white rounded-md hover:bg-[#6E013A] cursor-pointer"
              >
                Clear Filters
              </button>
            }
          />
        ) : (
          <div className="bg-white border border-[#DDD8CB] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EAE5D9] bg-[#FBFBF7] text-xs font-medium text-[#665860]">
                    <th className="py-3 px-5">Mother ID</th>
                    <th className="py-3 px-4">Mother&apos;s Name</th>
                    <th className="py-3 px-3">Age</th>
                    <th className="py-3 px-4">Gestational Age</th>
                    <th className="py-3 px-4">Est. Delivery Date</th>
                    <th className="py-3 px-4">Assigned Health Worker</th>
                    <th className="py-3 px-4">Latest Recorded Assessment</th>
                    <th className="py-3 px-4">Alert Status</th>
                    <th className="py-3 px-5">Referral Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE5D9] text-[13px]">
                  {paginatedMothers.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => openMotherProfile(m.id)}
                      className="hover:bg-[#F3F3E7]/65 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span className="font-medium text-[#890149] tabular-nums">{m.id}</span>
                        <p className="text-[11px] text-[#665860] mt-0.5">
                          {m.gravidaPara} · {m.bloodGroup}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="font-semibold text-[#30232A]">{m.fullName}</p>
                        <p className="text-xs text-[#665860]">
                          {m.regionalName ? `${m.regionalName} · ` : ''}
                          {m.block}
                        </p>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap tabular-nums">
                        {m.ageAuthorized ? (
                          <span className="text-[#30232A]">
                            {m.age !== null ? `${m.age} yrs` : '—'}
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-xs text-[#665860]"
                            title="Demographic age restricted under patient privacy settings"
                          >
                            <Lock className="w-3 h-3" />
                            Restricted
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap tabular-nums">
                        <p className="text-[#30232A] font-medium">
                          {m.pregnancyStatus === 'Postnatal Follow-up'
                            ? 'Postnatal'
                            : m.gestationalWeeks > 0
                            ? `${m.gestationalWeeks}w ${m.gestationalDays}d`
                            : '—'}
                        </p>
                        <p className="text-[11px] text-[#665860]">
                          Trimester {m.trimester} ·{' '}
                          <StatusText
                            label={m.riskLevel}
                            tone={toneForRisk(m.riskLevel)}
                            className="text-[11px]"
                          />
                        </p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap tabular-nums text-[#30232A]">
                        {m.eddDate}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="text-[#30232A]">{m.assignedHealthWorkerName}</p>
                        <p className="text-[11px] text-[#665860] tabular-nums">
                          {m.assignedHealthWorkerId || '—'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 max-w-[260px]">
                        <p
                          className="text-xs text-[#30232A] truncate"
                          title={m.latestAssessmentSummary}
                        >
                          {m.latestAssessmentSummary}
                        </p>
                        <p className="text-[11px] text-[#665860] tabular-nums mt-0.5">
                          {m.latestAssessmentDate} · BP {m.latestBp}
                          {m.latestHb ? ` · Hb ${m.latestHb} g/dL` : ''}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {m.alertStatus === 'None' ? (
                          <span className="text-xs text-[#665860]">None</span>
                        ) : (
                          <StatusText
                            label={m.alertStatus}
                            tone={toneForAlertStatus(m.alertStatus)}
                          />
                        )}
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        {m.referralStatus === 'None' ? (
                          <span className="text-xs text-[#665860]">None</span>
                        ) : (
                          <StatusText
                            label={m.referralStatus}
                            tone={toneForReferralStatus(m.referralStatus)}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-[#EAE5D9] bg-[#FBFBF7] flex items-center justify-between text-xs text-[#665860]">
                <span className="tabular-nums">
                  Page <strong className="text-[#30232A]">{safePage}</strong> of {totalPages} ·{' '}
                  {filteredMothers.length} total records
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 bg-white border border-[#DDD8CB] rounded hover:border-[#890149] disabled:opacity-45 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 bg-white border border-[#DDD8CB] rounded hover:border-[#890149] disabled:opacity-45 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </CollectionStateGate>
    </div>
  );
};
