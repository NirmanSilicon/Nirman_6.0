import React, { useMemo } from 'react';
import { ArrowUpRight } from 'lucide-react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useDashboard } from '../../context/DashboardContext';
import { computeLiveAnalytics } from '../../services/analyticsEngine';
import {
  EmptyState,
  SectionHeader,
  StatusText,
  toneForAlertStatus,
  toneForRisk,
} from '../ui/ClinicalPrimitives';
import { CollectionStateGate } from '../ui/FirestoreStatePanels';

export const OverviewView: React.FC = () => {
  const {
    appMode,
    currentFacility,
    currentUser,
    dateRange,
    mothers,
    alerts,
    referrals,
    appointments,
    assessments,
    collectionStatuses,
    refreshAllSubscriptions,
    setActiveSection,
    openMotherProfile,
    setSelectedAlertId,
    markNotificationRead,
  } = useDashboard();

  const analytics = useMemo(
    () =>
      computeLiveAnalytics(dateRange, {
        mothers,
        assessments,
        referrals,
        appointments,
        alerts,
      }),
    [dateRange, mothers, assessments, referrals, appointments, alerts]
  );

  const { overview } = analytics;

  const kpis = [
    {
      label: 'Registered Mothers',
      value: overview.totalRegisteredMothers,
      detail:
        appMode === 'demo'
          ? 'JanmaSaathi demo fixtures'
          : collectionStatuses.mothers.status === 'permission-denied'
          ? 'Access restricted'
          : 'Registered with hospital',
      onClick: () => setActiveSection('mothers'),
      accent: false,
    },
    {
      label: 'Active Pregnancies',
      value: overview.activePregnancies,
      detail: `T1: ${analytics.trimesterDistribution[0].count} · T2: ${analytics.trimesterDistribution[1].count} · T3: ${analytics.trimesterDistribution[2].count}`,
      onClick: () => setActiveSection('analytics'),
      accent: false,
    },
    {
      label: 'High-Priority Cases',
      value: overview.highPriorityCases,
      detail: 'Approved High Priority & Critical',
      onClick: () => setActiveSection('mothers'),
      accent: false,
    },
    {
      label: 'Open Emergency Alerts',
      value: overview.openEmergencyAlerts,
      detail:
        overview.criticalOpenAlerts > 0
          ? `${overview.criticalOpenAlerts} Critical open`
          : `${alerts.length} total recorded`,
      onClick: () => setActiveSection('alerts'),
      accent: overview.criticalOpenAlerts > 0,
    },
    {
      label: 'Pending Assessments',
      value: overview.pendingAssessments,
      detail: `${overview.mothersWithoutAssessment} unassessed · ${overview.assessmentsPendingReview} in review`,
      onClick: () => setActiveSection('analytics'),
      accent: false,
    },
    {
      label: 'Pending Referrals',
      value: overview.pendingReferrals,
      detail: `${referrals.length} total referrals`,
      onClick: () => setActiveSection('referrals'),
      accent: false,
    },
    {
      label: 'Mothers w/ Upcoming Visits',
      value: overview.mothersWithUpcomingAppointments,
      detail: 'Upcoming & Follow-up Due',
      onClick: () => setActiveSection('appointments'),
      accent: false,
    },
    {
      label: 'Completed Follow-ups',
      value: overview.completedFollowUps,
      detail: `${appointments.length} total scheduled visits`,
      onClick: () => setActiveSection('appointments'),
      accent: false,
    },
  ];

  // Reflect canonical `emergencyAlerts` listener state strictly in Firebase mode
  const alertsFeedSyncState =
    appMode === 'demo'
      ? {
          status: 'ready' as const,
          count: alerts.length,
          path: 'emergencyAlerts',
        }
      : collectionStatuses.emergencyAlerts;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Hospital Overview"
        subtitle={`${currentFacility.name} · ${analytics.scaleLabel} · ${
          appMode === 'demo' ? 'DEMO MODE (JanmaSaathi Fixtures)' : 'Live Firestore metrics'
        }`}
        actions={
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveSection('alerts')}
              className="px-4 py-2 text-xs font-medium bg-[#890149] hover:bg-[#6E013A] text-white rounded-md transition-colors whitespace-nowrap cursor-pointer"
            >
              Open Alert Centre
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('referrals')}
              className="px-4 py-2 text-xs font-medium bg-white hover:bg-[#F3F3E7] text-[#30232A] border border-[#DDD8CB] rounded-md transition-colors whitespace-nowrap cursor-pointer"
            >
              Review Referrals
            </button>
          </div>
        }
      />

      {/* Gate overview primary metrics on mothers collection access */}
      <CollectionStateGate
        syncState={collectionStatuses.mothers}
        userEmail={currentUser.email}
        userId={currentUser.uid}
        userRole={currentUser.role}
        onRetry={refreshAllSubscriptions}
        loadingLabel="Loading hospital overview from JanmaSaathi Firestore..."
      >
        {/* 8-Metric Clinical Overview Band (plus Mothers by Trimester panel below) */}
        <section
          aria-label="Key maternal indicators"
          className="bg-white border border-[#DDD8CB] rounded-lg grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-[#EAE5D9]"
        >
          {kpis.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className="p-5 text-left hover:bg-[#FBFBF7] transition-colors group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#890149]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[#665860]">{item.label}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#665860] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p
                className={`mt-2.5 font-serif text-3xl leading-none tabular-nums ${
                  item.accent ? 'text-[#B91C1C]' : 'text-[#30232A]'
                }`}
              >
                {item.value}
              </p>
              <p className="mt-2 text-xs text-[#665860] truncate">{item.detail}</p>
            </button>
          ))}
        </section>

        {/* Primary Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <section className="xl:col-span-8 bg-white border border-[#DDD8CB] rounded-lg p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
              <div>
                <h2 className="font-serif text-lg text-[#30232A]">
                  Registrations &amp; Antenatal Assessments
                </h2>
                <p className="text-xs text-[#665860] mt-0.5">
                  {appMode === 'demo'
                    ? `Computed from JanmaSaathi demo fixtures (${analytics.scaleLabel})`
                    : `Computed from live Firestore records (${analytics.scaleLabel})`}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-[#665860]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#890149] rounded-xs inline-block" />
                  Assessments
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-[#D9A2B5] rounded-xs inline-block" />
                  New Registrations
                </span>
              </div>
            </div>
            {analytics.registrationTrends.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-xs text-[#665860] border border-dashed border-[#DDD8CB] rounded-md">
                No dated registration or assessment records in this range yet.
              </div>
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={analytics.registrationTrends}
                    margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#EAE5D9" vertical={false} />
                    <XAxis
                      dataKey="period"
                      tick={{ fill: '#665860', fontSize: 12 }}
                      axisLine={{ stroke: '#DDD8CB' }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: '#665860', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #DDD8CB',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#30232A',
                      }}
                    />
                    <Bar
                      dataKey="registrations"
                      name="New Registrations"
                      fill="#D9A2B5"
                      radius={[3, 3, 0, 0]}
                      barSize={26}
                    />
                    <Area
                      type="monotone"
                      dataKey="assessments"
                      name="Maternal Assessments"
                      stroke="#890149"
                      strokeWidth={2}
                      fill="#890149"
                      fillOpacity={0.08}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="xl:col-span-4 bg-white border border-[#DDD8CB] rounded-lg p-6 flex flex-col justify-between">
            <div>
              <h2 className="font-serif text-lg text-[#30232A]">Trimester &amp; Risk Profile</h2>
              <p className="text-xs text-[#665860] mt-0.5">
                Active cohort breakdown ({analytics.activePregnancies} pregnancies)
              </p>

              <div className="mt-5 space-y-4">
                {analytics.trimesterDistribution.map((t, i) => {
                  const barColors = ['#D9A2B5', '#B24B7D', '#890149'];
                  return (
                    <div key={t.name}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-[#30232A] font-medium">{t.name}</span>
                        <span className="text-[#665860] tabular-nums">
                          {t.count} · {t.share}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-[#F3F3E7] rounded-xs overflow-hidden">
                        <div
                          className="h-full rounded-xs"
                          style={{ width: `${t.share}%`, backgroundColor: barColors[i] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-[#EAE5D9]">
              <p className="text-xs font-semibold text-[#30232A] mb-3">
                Leading High-Priority Risk Factors
              </p>
              {analytics.highPriorityDistribution.length === 0 ? (
                <p className="text-xs text-[#665860]">
                  No high-priority obstetric risk factors recorded in current mothers cohort.
                </p>
              ) : (
                <ul className="space-y-2 text-xs">
                  {analytics.highPriorityDistribution.slice(0, 4).map((item) => (
                    <li key={item.condition} className="flex items-center justify-between gap-2">
                      <span className="text-[#665860] truncate">{item.condition}</span>
                      <span className="font-semibold text-[#30232A] tabular-nums shrink-0">
                        {item.cases} cases
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => setActiveSection('analytics')}
                className="mt-4 text-xs font-medium text-[#890149] hover:underline cursor-pointer"
              >
                Explore full Maternal Analytics →
              </button>
            </div>
          </section>
        </div>
      </CollectionStateGate>

      {/* Recent Emergency Alerts Table */}
      <CollectionStateGate
        syncState={alertsFeedSyncState}
        userEmail={currentUser.email}
        userId={currentUser.uid}
        userRole={currentUser.role}
        onRetry={refreshAllSubscriptions}
        loadingLabel="Loading emergency alerts..."
      >
        <section className="bg-white border border-[#DDD8CB] rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-[#EAE5D9] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-lg text-[#30232A]">Recent Emergency Alerts</h2>
              <p className="text-xs text-[#665860] mt-0.5">
                {appMode === 'demo'
                  ? 'Sample alerts from JanmaSaathi demo fixtures'
                  : 'Live emergency alerts from Firestore (emergencyAlerts)'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection('alerts')}
              className="text-xs font-medium text-[#890149] hover:underline whitespace-nowrap cursor-pointer"
            >
              View all {alerts.length} alerts →
            </button>
          </div>

          {alerts.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No emergency alerts recorded"
                description={
                  appMode === 'demo'
                    ? 'No active or historical emergency alerts exist in the current demo session.'
                    : 'No active or historical emergency alerts exist for your authorized hospital in emergencyAlerts.'
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EAE5D9] bg-[#FBFBF7] text-xs font-medium text-[#665860]">
                    <th className="py-3 px-6">Alert &amp; Mother</th>
                    <th className="py-3 px-4">Clinical Trigger</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Key Vitals</th>
                    <th className="py-3 px-4">Health Worker</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-6 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE5D9] text-[13px]">
                  {alerts.slice(0, 5).map((alert) => (
                    <tr
                      key={alert.id}
                      onClick={() => {
                        setSelectedAlertId(alert.id);
                        markNotificationRead(`notif-alert-${alert.id}`);
                        setActiveSection('alerts');
                      }}
                      className="hover:bg-[#F3F3E7]/60 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <p className="font-semibold text-[#30232A]">{alert.motherName}</p>
                        <p className="text-xs text-[#665860] tabular-nums">
                          {alert.id} · {alert.gestationalAgeLabel}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 max-w-[260px]">
                        <p className="text-[#30232A] truncate" title={alert.triggerTitle}>
                          {alert.triggerTitle}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#665860] whitespace-nowrap">
                        {alert.reportingSource}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#30232A] tabular-nums whitespace-nowrap">
                        BP {alert.vitalsSnapshot.bp}
                        {alert.vitalsSnapshot.hemoglobin
                          ? ` · Hb ${alert.vitalsSnapshot.hemoglobin}`
                          : ''}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#665860] whitespace-nowrap">
                        {alert.assignedHealthWorkerName}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusText label={alert.severity} tone={toneForAlertStatus(alert.severity)} />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusText label={alert.status} tone={toneForAlertStatus(alert.status)} />
                      </td>
                      <td className="py-3.5 px-6 text-right text-xs text-[#665860] tabular-nums whitespace-nowrap">
                        {alert.timestamp}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </CollectionStateGate>

      {/* Recent Maternal Assessments */}
      <CollectionStateGate
        syncState={collectionStatuses.assessments}
        userEmail={currentUser.email}
        userId={currentUser.uid}
        userRole={currentUser.role}
        onRetry={refreshAllSubscriptions}
        loadingLabel="Loading maternal assessments..."
      >
        <section className="bg-white border border-[#DDD8CB] rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-[#EAE5D9] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-lg text-[#30232A]">Recent Maternal Assessments</h2>
              <p className="text-xs text-[#665860] mt-0.5">
                {appMode === 'demo'
                  ? 'Latest evaluations from JanmaSaathi demo fixtures'
                  : 'Latest evaluations recorded in the Firestore assessments collection'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection('mothers')}
              className="text-xs font-medium text-[#890149] hover:underline whitespace-nowrap cursor-pointer"
            >
              Open Mother Directory →
            </button>
          </div>

          {assessments.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No maternal assessments found"
                description="Assessments logged in JanmaSaathi by health workers or hospital clinicians will appear here automatically."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EAE5D9] bg-[#FBFBF7] text-xs font-medium text-[#665860]">
                    <th className="py-3 px-6">Mother</th>
                    <th className="py-3 px-4">Type &amp; Gestation</th>
                    <th className="py-3 px-4">Assessor &amp; Site</th>
                    <th className="py-3 px-4">Clinical Summary</th>
                    <th className="py-3 px-4">Vitals</th>
                    <th className="py-3 px-4">Risk</th>
                    <th className="py-3 px-6 text-right">Recorded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE5D9] text-[13px]">
                  {assessments.slice(0, 6).map((asm) => (
                    <tr
                      key={asm.id}
                      onClick={() => asm.motherId && openMotherProfile(asm.motherId)}
                      className="hover:bg-[#F3F3E7]/60 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <p className="font-semibold text-[#30232A]">{asm.motherName}</p>
                        <p className="text-xs text-[#665860] tabular-nums">{asm.motherId || asm.id}</p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                        <p className="text-[#30232A] font-medium">{asm.assessmentType}</p>
                        <p className="text-[#665860] tabular-nums">
                          {asm.gestationalWeek ? `Week ${asm.gestationalWeek}` : '—'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                        <p className="text-[#30232A]">{asm.assessorName}</p>
                        <p className="text-[#665860]">{asm.facilityOrLocation}</p>
                      </td>
                      <td className="py-3.5 px-4 max-w-[320px]">
                        <p className="text-xs text-[#30232A] line-clamp-2 leading-relaxed">
                          {asm.summary}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-[#30232A] tabular-nums">
                        {asm.bpReading}
                        {asm.hemoglobin ? ` · Hb ${asm.hemoglobin}` : ''}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusText
                          label={asm.riskClassification}
                          tone={toneForRisk(asm.riskClassification)}
                        />
                      </td>
                      <td className="py-3.5 px-6 text-right text-xs text-[#665860] tabular-nums whitespace-nowrap">
                        {asm.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </CollectionStateGate>
    </div>
  );
};
