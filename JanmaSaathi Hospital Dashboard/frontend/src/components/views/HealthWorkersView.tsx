import React, { useMemo, useState } from 'react';
import { Info, Phone, Search } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import {
  EmptyState,
  SectionHeader,
  SlideOverDrawer,
  StatusText,
  toneForAlertStatus,
  toneForReferralStatus,
  toneForRisk,
} from '../ui/ClinicalPrimitives';
import { CollectionStateGate } from '../ui/FirestoreStatePanels';

export const HealthWorkersView: React.FC = () => {
  const {
    appMode,
    healthWorkers,
    mothers,
    assessments,
    referrals,
    appointments,
    alerts,
    selectedHealthWorkerId,
    setSelectedHealthWorkerId,
    openMotherProfile,
    collectionStatuses,
    currentUser,
    refreshAllSubscriptions,
  } = useDashboard();

  const [query, setQuery] = useState('');
  const [cadreFilter, setCadreFilter] = useState('All');
  const [blockFilter, setBlockFilter] = useState('All');

  const blocks = useMemo(
    () => Array.from(new Set(healthWorkers.map((w) => w.block).filter((b) => b && b !== '—'))),
    [healthWorkers]
  );

  const filteredWorkers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return healthWorkers.filter((w) => {
      if (q) {
        const hit =
          w.name.toLowerCase().includes(q) ||
          w.id.toLowerCase().includes(q) ||
          w.catchmentArea.toLowerCase().includes(q) ||
          w.subCentre.toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (cadreFilter !== 'All' && w.cadre !== cadreFilter) return false;
      if (blockFilter !== 'All' && w.block !== blockFilter) return false;
      return true;
    });
  }, [healthWorkers, query, cadreFilter, blockFilter]);

  const selectedWorker = useMemo(
    () => healthWorkers.find((w) => w.id === selectedHealthWorkerId) ?? null,
    [healthWorkers, selectedHealthWorkerId]
  );

  const workerMothers = useMemo(
    () =>
      selectedWorker
        ? mothers.filter((m) => m.assignedHealthWorkerId === selectedWorker.id)
        : [],
    [selectedWorker, mothers]
  );

  const workerAssessments = useMemo(
    () =>
      selectedWorker
        ? assessments.filter((a) => a.assessorName === selectedWorker.name)
        : [],
    [selectedWorker, assessments]
  );

  const workerReferrals = useMemo(
    () =>
      selectedWorker
        ? referrals.filter((r) => r.sourceContact.includes(selectedWorker.name))
        : [],
    [selectedWorker, referrals]
  );

  const workerAlerts = useMemo(
    () =>
      selectedWorker
        ? alerts.filter((a) => a.assignedHealthWorkerId === selectedWorker.id)
        : [],
    [selectedWorker, alerts]
  );

  const completedFollowUpsByWorker = useMemo(() => {
    const map = new Map<string, number>();
    healthWorkers.forEach((hw) => {
      const assignedIds = new Set(
        mothers
          .filter((m) => m.assignedHealthWorkerId === hw.id || m.assignedHealthWorkerName === hw.name)
          .map((m) => m.id)
      );
      const count = appointments.filter(
        (ap) => ap.status === 'Completed' && assignedIds.has(ap.motherId)
      ).length;
      map.set(hw.id, count);
    });
    return map;
  }, [healthWorkers, mothers, appointments]);

  const totals = useMemo(() => {
    const completedFollowUps = Array.from(completedFollowUpsByWorker.values()).reduce(
      (s, n) => s + n,
      0
    );
    return {
      assignedMothers: healthWorkers.reduce((s, w) => s + w.assignedMothersCount, 0),
      recentAssessments: healthWorkers.reduce((s, w) => s + w.recentAssessments30d, 0),
      pendingFollowUps: healthWorkers.reduce((s, w) => s + w.pendingFollowUps, 0),
      completedFollowUps,
      referralsSubmitted: healthWorkers.reduce((s, w) => s + w.referralsSubmitted, 0),
      emergencyAlertsRaised: healthWorkers.reduce((s, w) => s + w.emergencyAlertsRaised, 0),
    };
  }, [healthWorkers, completedFollowUpsByWorker]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Health Workers"
        subtitle={
          appMode === 'demo'
            ? 'JanmaSaathi demo directory featuring Sunita Devi (HW-44120) and linked field staff.'
            : 'Live directory of ASHA workers, ANM nurses, and Community Health Officers from Firestore.'
        }
      />

      {/* Governance notice: Activity counts are not proof of medical performance */}
      <div className="bg-[#FBFBF7] border border-[#DDD8CB] rounded-lg px-4 py-3 flex items-start gap-2.5 text-xs text-[#665860]">
        <Info className="w-4 h-4 text-[#890149] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <span className="font-semibold text-[#30232A]">Caseload &amp; Activity Context:</span>{' '}
          Counts below reflect documented assignments, assessments, referrals, follow-ups, and
          alerts for operational coordination—never simplistic proof of medical performance.
        </p>
      </div>

      <CollectionStateGate
        syncState={collectionStatuses.healthWorkers}
        userEmail={currentUser.email}
        userId={currentUser.uid}
        userRole={currentUser.role}
        onRetry={refreshAllSubscriptions}
        loadingLabel="Loading health workers from Firestore..."
      >
        <section className="bg-white border border-[#DDD8CB] rounded-lg grid grid-cols-2 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-[#EAE5D9]">
          <div className="p-5">
            <p className="text-xs font-medium text-[#665860]">Linked Health Workers</p>
            <p className="mt-2 font-serif text-3xl text-[#30232A] tabular-nums">
              {healthWorkers.length}
            </p>
            <p className="mt-1 text-xs text-[#665860]">Across {blocks.length} blocks</p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-[#665860]">Assigned Mothers</p>
            <p className="mt-2 font-serif text-3xl text-[#30232A] tabular-nums">
              {totals.assignedMothers}
            </p>
            <p className="mt-1 text-xs text-[#665860]">Linked maternal caseload</p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-[#665860]">Assessments &amp; Referrals</p>
            <p className="mt-2 font-serif text-3xl text-[#30232A] tabular-nums">
              {totals.recentAssessments}
            </p>
            <p className="mt-1 text-xs text-[#665860] tabular-nums">
              {totals.referralsSubmitted} referrals · {totals.emergencyAlertsRaised} alerts
            </p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-[#665860]">Pending Follow-ups</p>
            <p className="mt-2 font-serif text-3xl text-[#890149] tabular-nums">
              {totals.pendingFollowUps}
            </p>
            <p className="mt-1 text-xs text-[#665860]">Upcoming &amp; due follow-ups</p>
          </div>
          <div className="p-5">
            <p className="text-xs font-medium text-[#665860]">Completed Follow-ups</p>
            <p className="mt-2 font-serif text-3xl text-[#15803D] tabular-nums">
              {totals.completedFollowUps}
            </p>
            <p className="mt-1 text-xs text-[#665860]">Documented completed visits</p>
          </div>
        </section>

        <div className="bg-white border border-[#DDD8CB] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#665860] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Health Worker by name, ID, sub-centre, or sector..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#FBFBF7] border border-[#DDD8CB] rounded-md text-[#30232A] focus:outline-none focus:border-[#890149]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={cadreFilter}
              onChange={(e) => setCadreFilter(e.target.value)}
              aria-label="Filter by cadre"
              className="px-3 py-2 text-xs font-medium bg-white border border-[#DDD8CB] rounded-md text-[#30232A] focus:outline-none focus:border-[#890149]"
            >
              <option value="All">All Cadres</option>
              <option value="ASHA Worker">ASHA Worker</option>
              <option value="ANM Nurse">ANM Nurse</option>
              <option value="Community Health Officer">Community Health Officer</option>
            </select>
            <select
              value={blockFilter}
              onChange={(e) => setBlockFilter(e.target.value)}
              aria-label="Filter by block"
              className="px-3 py-2 text-xs font-medium bg-white border border-[#DDD8CB] rounded-md text-[#30232A] focus:outline-none focus:border-[#890149]"
            >
              <option value="All">All Blocks</option>
              {blocks.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        {healthWorkers.length === 0 ? (
          <EmptyState
            title={
              appMode === 'demo'
                ? 'No Health Workers in demo session'
                : 'No Health Worker documents in Firestore'
            }
            description={
              appMode === 'demo'
                ? 'Reset demo fixtures in Settings to restore Sunita Devi and linked health workers.'
                : (() => {
                    const referencedIds = Array.from(
                      new Set(
                        mothers
                          .map((m) =>
                            m.assignedHealthWorkerId && m.assignedHealthWorkerId !== 'Unassigned'
                              ? `${m.assignedHealthWorkerName} (${m.assignedHealthWorkerId})`
                              : null
                          )
                          .filter(Boolean)
                      )
                    );
                    return referencedIds.length > 0
                      ? `The "healthWorkers" collection currently contains 0 documents. Worker references present on mother records: ${referencedIds.join(', ')}.`
                      : 'The "healthWorkers" collection currently contains 0 accessible documents.';
                  })()
            }
          />
        ) : filteredWorkers.length === 0 ? (
          <EmptyState
            title="No Health Workers match your filter"
            description="Adjust your search query or catchment filters to inspect linked field staff."
          />
        ) : (
          <div className="bg-white border border-[#DDD8CB] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EAE5D9] bg-[#FBFBF7] text-xs font-medium text-[#665860]">
                    <th className="py-3 px-5">Health Worker</th>
                    <th className="py-3 px-4">Cadre &amp; Sub-Centre</th>
                    <th className="py-3 px-4 text-right">Assigned Mothers</th>
                    <th className="py-3 px-4 text-right">Assessments</th>
                    <th className="py-3 px-4 text-right">Referrals</th>
                    <th className="py-3 px-4 text-right">Pending F/U</th>
                    <th className="py-3 px-4 text-right">Completed F/U</th>
                    <th className="py-3 px-4 text-right">Alerts Raised</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-5 text-right">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE5D9] text-[13px]">
                  {filteredWorkers.map((hw) => (
                    <tr
                      key={hw.id}
                      onClick={() => setSelectedHealthWorkerId(hw.id)}
                      className="hover:bg-[#F3F3E7]/65 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <p className="font-semibold text-[#30232A]">{hw.name}</p>
                        <p className="text-xs text-[#665860] tabular-nums">
                          {hw.regionalName ? `${hw.regionalName} · ` : ''}
                          {hw.id}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="text-[#30232A]">{hw.cadre}</p>
                        <p className="text-xs text-[#665860]">
                          {hw.subCentre} · {hw.block}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-[#30232A] tabular-nums">
                        {hw.assignedMothersCount}
                      </td>
                      <td className="py-3.5 px-4 text-right text-[#30232A] tabular-nums">
                        {hw.recentAssessments30d}
                      </td>
                      <td className="py-3.5 px-4 text-right text-[#30232A] tabular-nums">
                        {hw.referralsSubmitted}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-[#890149] tabular-nums">
                        {hw.pendingFollowUps}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-[#15803D] tabular-nums">
                        {completedFollowUpsByWorker.get(hw.id) ?? 0}
                      </td>
                      <td className="py-3.5 px-4 text-right text-[#30232A] tabular-nums">
                        {hw.emergencyAlertsRaised}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusText
                          label={hw.status}
                          tone={hw.status === 'Active' ? 'positive' : 'cherry'}
                        />
                      </td>
                      <td className="py-3.5 px-5 text-right text-xs text-[#665860] tabular-nums whitespace-nowrap">
                        {hw.lastActiveDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CollectionStateGate>

      {/* Health Worker Detail Drawer */}
      <SlideOverDrawer
        open={Boolean(selectedWorker)}
        onClose={() => setSelectedHealthWorkerId(null)}
        title={
          selectedWorker
            ? `${selectedWorker.name}${selectedWorker.regionalName ? ` (${selectedWorker.regionalName})` : ''}`
            : ''
        }
        subtitle={
          selectedWorker
            ? `${selectedWorker.cadre} · ${selectedWorker.id} · ${selectedWorker.catchmentArea}`
            : undefined
        }
      >
        {selectedWorker && (
          <div className="space-y-6">
            <div className="pb-5 border-b border-[#EAE5D9] grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-[#665860]">Sub-Centre / Block</p>
                <p className="mt-0.5 text-sm font-medium text-[#30232A]">
                  {selectedWorker.subCentre}, {selectedWorker.block}
                </p>
              </div>
              <div>
                <p className="text-[#665860]">Field Contact</p>
                <p className="mt-0.5 text-sm font-medium text-[#30232A] inline-flex items-center gap-1.5 tabular-nums">
                  <Phone className="w-3.5 h-3.5 text-[#890149]" />
                  {selectedWorker.phone}
                </p>
              </div>
              <div>
                <p className="text-[#665860]">Completed Follow-ups</p>
                <p className="mt-0.5 text-sm font-semibold text-[#15803D] tabular-nums">
                  {completedFollowUpsByWorker.get(selectedWorker.id) ?? 0} documented visits
                </p>
              </div>
              <div>
                <p className="text-[#665860]">Pending Follow-ups</p>
                <p className="mt-0.5 text-sm font-semibold text-[#890149] tabular-nums">
                  {selectedWorker.pendingFollowUps} scheduled visits
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-serif text-base text-[#30232A]">
                Assigned Mothers ({workerMothers.length})
              </h3>
              {workerMothers.length === 0 ? (
                <p className="mt-2 text-xs text-[#665860]">
                  No mothers currently linked via assignments or assignedHealthWorkerId.
                </p>
              ) : (
                <div className="mt-3 divide-y divide-[#EAE5D9] border border-[#EAE5D9] rounded-md">
                  {workerMothers.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => openMotherProfile(m.id)}
                      className="w-full px-4 py-3 text-left hover:bg-[#F3F3E7]/70 flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#30232A]">{m.fullName}</p>
                        <p className="text-xs text-[#665860] tabular-nums">
                          {m.id} · {m.gestationalWeeks}w {m.gestationalDays}d · EDD {m.eddDate}
                        </p>
                      </div>
                      <StatusText label={m.riskLevel} tone={toneForRisk(m.riskLevel)} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <h3 className="font-serif text-base text-[#30232A]">
                  Recent Assessments ({workerAssessments.length})
                </h3>
                <div className="mt-2.5 space-y-2.5">
                  {workerAssessments.length === 0 ? (
                    <p className="text-xs text-[#665860]">No assessments recorded by this worker.</p>
                  ) : (
                    workerAssessments.map((a) => (
                      <div key={a.id} className="pb-2.5 border-b border-[#EAE5D9] last:border-b-0 text-xs">
                        <p className="font-semibold text-[#30232A]">{a.motherName}</p>
                        <p className="text-[#665860] mt-0.5 tabular-nums">
                          {a.date} · BP {a.bpReading}
                        </p>
                        <p className="text-[#665860] mt-1 line-clamp-2">{a.summary}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-serif text-base text-[#30232A]">
                  Referrals &amp; Alerts Raised
                </h3>
                <div className="mt-2.5 space-y-2.5 text-xs">
                  {workerReferrals.length === 0 && workerAlerts.length === 0 ? (
                    <p className="text-[#665860]">No referrals or emergency alerts linked.</p>
                  ) : (
                    <>
                      {workerReferrals.map((r) => (
                        <div key={r.id} className="pb-2.5 border-b border-[#EAE5D9]">
                          <div className="flex justify-between gap-2">
                            <span className="font-semibold text-[#30232A]">{r.motherName}</span>
                            <StatusText
                              label={r.status}
                              tone={toneForReferralStatus(r.status)}
                              className="text-xs"
                            />
                          </div>
                          <p className="text-[#665860] mt-0.5 line-clamp-2">{r.reason}</p>
                        </div>
                      ))}
                      {workerAlerts.map((al) => (
                        <div key={al.id} className="pb-2.5 border-b border-[#EAE5D9] last:border-b-0">
                          <div className="flex justify-between gap-2">
                            <span className="font-semibold text-[#30232A]">
                              {al.id} · {al.motherName}
                            </span>
                            <StatusText
                              label={al.status}
                              tone={toneForAlertStatus(al.status)}
                              className="text-xs"
                            />
                          </div>
                          <p className="text-[#665860] mt-0.5">{al.triggerTitle}</p>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-serif text-base text-[#30232A]">Recent Activity History</h3>
              {selectedWorker.activities.length === 0 ? (
                <p className="mt-2 text-xs text-[#665860]">No recent field activity records found.</p>
              ) : (
                <ol className="mt-3 space-y-3">
                  {selectedWorker.activities.map((act) => (
                    <li key={act.id} className="pb-3 border-b border-[#EAE5D9] last:border-b-0">
                      <div className="flex items-baseline justify-between gap-2 text-xs">
                        <span className="font-semibold text-[#30232A]">{act.action}</span>
                        <span className="text-[#665860] tabular-nums">{act.timestamp}</span>
                      </div>
                      {act.motherName && (
                        <p className="text-xs text-[#890149] mt-0.5 tabular-nums">
                          {act.motherName} ({act.motherId})
                        </p>
                      )}
                      <p className="mt-1 text-xs text-[#665860] leading-relaxed">{act.details}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
};
