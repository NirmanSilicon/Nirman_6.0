import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Calendar,
  Download,
  Filter,
  Info,
  Lock,
  RotateCcw,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useDashboard } from '../../context/DashboardContext';
import { HOSPITAL_FACILITIES } from '../../data/facilities';
import { firebaseRuntimeConfig } from '../../lib/firebase';
import {
  AnalyticsFilterState,
  DEFAULT_ANALYTICS_FILTERS,
  MotherTimelineCategory,
  buildMotherChronologicalTimeline,
  computeLiveAnalytics,
} from '../../services/analyticsEngine';
import { ALERT_PRIORITIES } from '../../services/alertProtocol';
import { AlertPriority, DateRangeKey, ReferralStatus } from '../../types/hospital';
import {
  exportCustomAnalyticsPdf,
  getReportAccessScope,
} from '../../utils/reportExport';
import {
  EmptyState,
  SectionHeader,
  StatusText,
  toneForAlertStatus,
  toneForRisk,
} from '../ui/ClinicalPrimitives';
import { CollectionStateGate } from '../ui/FirestoreStatePanels';

const TRIMESTER_COLORS = ['#D9A2B5', '#B24B7D', '#890149'];
const APPT_COLORS = ['#15803D', '#890149', '#B45309', '#B91C1C'];
const REFERRAL_STATUSES: ReferralStatus[] = [
  'Pending',
  'Accepted',
  'In Transit',
  'Admitted',
  'Completed',
  'Declined',
];

const TOOLTIP_STYLE = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #DDD8CB',
  borderRadius: '6px',
  fontSize: '12px',
  color: '#30232A',
};

type AnalyticsSubTab = 'maternal-health' | 'mother-level' | 'health-workers';

const TIMELINE_CATEGORY_FILTERS: { id: 'all' | MotherTimelineCategory; label: string }[] = [
  { id: 'all', label: 'All Events' },
  { id: 'milestone', label: 'Milestones' },
  { id: 'health-update', label: 'Health Updates' },
  { id: 'assessment', label: 'Assessments' },
  { id: 'report', label: 'Reports' },
  { id: 'symptom', label: 'Symptoms' },
  { id: 'alert', label: 'Alerts' },
  { id: 'referral', label: 'Referrals' },
  { id: 'hospital-response', label: 'Hospital Responses' },
  { id: 'follow-up', label: 'Follow-ups' },
];

const EmptyChartPlaceholder: React.FC<{ title?: string; message: string }> = ({
  title,
  message,
}) => (
  <div className="h-[220px] flex flex-col items-center justify-center text-xs text-[#665860] border border-dashed border-[#DDD8CB] rounded-md px-6 text-center gap-1.5">
    {title && <p className="font-semibold text-[#30232A]">{title}</p>}
    <p className="max-w-sm leading-relaxed">{message}</p>
  </div>
);

export const AnalyticsView: React.FC = () => {
  const {
    appMode,
    dateRange,
    setDateRange,
    mothers,
    assessments,
    referrals,
    appointments,
    alerts,
    healthWorkers,
    currentFacility,
    currentUser,
    collectionStatuses,
    refreshAllSubscriptions,
    openMotherProfile,
    setActiveSection,
    setSelectedAlertId,
    setSelectedReferralId,
    setSelectedHealthWorkerId,
    logAuditAction,
  } = useDashboard();

  const [activeSubTab, setActiveSubTab] = useState<AnalyticsSubTab>('maternal-health');
  const [filters, setFilters] = useState<AnalyticsFilterState>({
    ...DEFAULT_ANALYTICS_FILTERS,
    dateRange,
  });

  // Mother-level analytics local selection
  const [selectedTimelineMotherId, setSelectedTimelineMotherId] = useState<string>('');
  const [timelineCategoryFilter, setTimelineCategoryFilter] = useState<
    'all' | MotherTimelineCategory
  >('all');
  const [timelineAscending, setTimelineAscending] = useState<boolean>(false);

  // Sync local dateRange when global header dateRange changes
  const effectiveFilters: AnalyticsFilterState = useMemo(
    () => ({
      ...filters,
      dateRange: filters.customStartDate || filters.customEndDate ? filters.dateRange : dateRange,
    }),
    [filters, dateRange]
  );

  const analytics = useMemo(
    () =>
      computeLiveAnalytics(effectiveFilters, {
        mothers,
        assessments,
        referrals,
        appointments,
        alerts,
        healthWorkers,
      }),
    [effectiveFilters, mothers, assessments, referrals, appointments, alerts, healthWorkers]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (effectiveFilters.dateRange !== 'all') count += 1;
    if (effectiveFilters.customStartDate || effectiveFilters.customEndDate) count += 1;
    if (effectiveFilters.facilityId !== 'all') count += 1;
    if (effectiveFilters.trimester !== 'all') count += 1;
    if (effectiveFilters.healthWorkerId !== 'all') count += 1;
    if (effectiveFilters.alertPriority !== 'all') count += 1;
    if (effectiveFilters.referralStatus !== 'all') count += 1;
    return count;
  }, [effectiveFilters]);

  const activeFiltersSummary = useMemo(() => {
    const parts: string[] = [];
    if (effectiveFilters.facilityId !== 'all') {
      const fac = HOSPITAL_FACILITIES.find((f) => f.id === effectiveFilters.facilityId);
      parts.push(`Facility: ${fac?.shortName ?? effectiveFilters.facilityId}`);
    }
    if (effectiveFilters.trimester !== 'all') parts.push(`Trimester ${effectiveFilters.trimester}`);
    if (effectiveFilters.healthWorkerId !== 'all') {
      const hw = healthWorkers.find((w) => w.id === effectiveFilters.healthWorkerId);
      parts.push(`Health Worker: ${hw?.name ?? effectiveFilters.healthWorkerId}`);
    }
    if (effectiveFilters.alertPriority !== 'all') {
      parts.push(`Alert Priority: ${effectiveFilters.alertPriority}`);
    }
    if (effectiveFilters.referralStatus !== 'all') {
      parts.push(`Referral Status: ${effectiveFilters.referralStatus}`);
    }
    return parts.length > 0 ? parts.join(' · ') : 'All facilities, trimesters, workers & statuses';
  }, [effectiveFilters, healthWorkers]);

  const handleResetFilters = () => {
    setDateRange('all');
    setFilters({ ...DEFAULT_ANALYTICS_FILTERS, dateRange: 'all' });
  };

  // Resolve Mother-Level Analytics selection
  const activeMother = useMemo(() => {
    if (analytics.filteredMothers.length === 0) return null;
    return (
      analytics.filteredMothers.find((m) => m.id === selectedTimelineMotherId) ??
      analytics.filteredMothers[0]
    );
  }, [analytics.filteredMothers, selectedTimelineMotherId]);

  const motherTimeline = useMemo(() => {
    if (!activeMother) return [];
    const raw = buildMotherChronologicalTimeline({
      mother: activeMother,
      assessments: assessments.filter((a) => a.motherId === activeMother.id),
      alerts: alerts.filter((a) => a.motherId === activeMother.id),
      referrals: referrals.filter((r) => r.motherId === activeMother.id),
      appointments: appointments.filter((ap) => ap.motherId === activeMother.id),
    });
    const filtered =
      timelineCategoryFilter === 'all'
        ? raw
        : raw.filter((ev) => ev.category === timelineCategoryFilter);
    return timelineAscending ? [...filtered].reverse() : filtered;
  }, [activeMother, assessments, alerts, referrals, appointments, timelineCategoryFilter, timelineAscending]);

  const activeMotherBpSeries = useMemo(
    () =>
      activeMother
        ? activeMother.vitalsHistory.filter((v) => v.systolicBp > 0 && v.diastolicBp > 0)
        : [],
    [activeMother]
  );

  const activeMotherGlucoseSeries = useMemo(
    () =>
      activeMother
        ? activeMother.vitalsHistory.filter(
            (v) => typeof v.bloodGlucose === 'number' && v.bloodGlucose > 0
          )
        : [],
    [activeMother]
  );

  const apptTotal = useMemo(
    () => analytics.appointmentCompletion.reduce((acc, item) => acc + item.count, 0),
    [analytics]
  );

  const hasRecordedGestation = useMemo(
    () => analytics.gestationalAgeDistribution.some((b) => b.count > 0),
    [analytics.gestationalAgeDistribution]
  );

  const reportScope = getReportAccessScope(currentUser.role);

  const handleQuickPdfExport = () => {
    if (reportScope === 'denied') return;
    exportCustomAnalyticsPdf({
      reportTitle: 'Maternal Healthcare Analytics Snapshot',
      dateRangeLabel: analytics.scaleLabel,
      activeFiltersSummary,
      deidentifyPatientNames: reportScope !== 'full-hospital',
      sections: {
        maternalStats: true,
        alertSummaries: true,
        referralSummaries: true,
        healthWorkerActivity: true,
        assessmentTrends: true,
      },
      analytics,
      facility: currentFacility,
      user: currentUser,
      appMode,
      projectId: firebaseRuntimeConfig.projectId,
    });
    void logAuditAction(
      'Report Export',
      'Exported Maternal Analytics PDF Snapshot',
      `${currentFacility.shortName} (${analytics.scaleLabel})`,
      reportScope === 'full-hospital'
        ? 'Authorized Hospital Personnel Export'
        : 'De-identified Aggregate Export'
    );
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Maternal Health Analytics"
        subtitle={`${currentFacility.name} · ${analytics.scaleLabel} · ${
          appMode === 'demo'
            ? 'Calculated strictly from JanmaSaathi demo fixtures'
            : 'Calculated strictly from live Firestore records'
        }`}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {reportScope !== 'denied' && (
              <button
                type="button"
                onClick={handleQuickPdfExport}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white border border-[#DDD8CB] hover:border-[#890149] text-[#30232A] rounded-md transition-colors whitespace-nowrap cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Filtered PDF</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveSection('reports')}
              className="px-3.5 py-2 text-xs font-medium bg-[#890149] hover:bg-[#6E013A] text-white rounded-md transition-colors whitespace-nowrap cursor-pointer"
            >
              Open Report Builder
            </button>
          </div>
        }
      />

      {/* Clinical Data Integrity & Non-Diagnostic Governance Strip */}
      <div className="bg-[#FBFBF7] border border-[#DDD8CB] rounded-lg px-4 py-3 flex items-start gap-2.5 text-xs text-[#665860]">
        <Info className="w-4 h-4 text-[#890149] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <span className="font-semibold text-[#30232A]">Data Accuracy &amp; Clinical Governance:</span>{' '}
          Every metric and chart is calculated solely from actual recorded JanmaSaathi documents.
          Analytics are provided for hospital operational visibility and are{' '}
          <span className="font-medium text-[#30232A]">not a medical diagnosis</span>; risk
          classifications reflect only existing approved assessment results with their assessor
          source and date.
        </p>
      </div>

      {/* 6-Dimension Filter Control Bar */}
      <section
        aria-label="Analytics filters"
        className="bg-white border border-[#DDD8CB] rounded-lg p-4 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#30232A]">
            <Filter className="w-3.5 h-3.5 text-[#890149]" />
            <span>Analytics Filters</span>
            <span className="text-[#665860] font-normal tabular-nums">
              · {activeFiltersSummary}
            </span>
          </div>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#890149] hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters ({activeFilterCount})</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* 1. Date Range */}
          <div>
            <label className="block text-[11px] font-medium text-[#665860] mb-1">
              Date Range
            </label>
            <select
              value={effectiveFilters.dateRange}
              onChange={(e) => {
                const next = e.target.value as DateRangeKey;
                setDateRange(next);
                setFilters((prev) => ({
                  ...prev,
                  dateRange: next,
                  customStartDate: '',
                  customEndDate: '',
                }));
              }}
              aria-label="Filter by date range"
              className="w-full px-2.5 py-2 text-xs bg-[#FBFBF7] border border-[#DDD8CB] rounded-md text-[#30232A] focus:outline-none focus:border-[#890149]"
            >
              <option value="all">All Recorded Data</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="quarter">Current Quarter</option>
            </select>
          </div>

          {/* 2. Hospital / Facility */}
          <div>
            <label className="block text-[11px] font-medium text-[#665860] mb-1">
              Hospital / Facility
            </label>
            <select
              value={filters.facilityId}
              onChange={(e) => setFilters((prev) => ({ ...prev, facilityId: e.target.value }))}
              aria-label="Filter by hospital or facility"
              className="w-full px-2.5 py-2 text-xs bg-[#FBFBF7] border border-[#DDD8CB] rounded-md text-[#30232A] focus:outline-none focus:border-[#890149]"
            >
              <option value="all">All Facilities</option>
              {HOSPITAL_FACILITIES.map((fac) => (
                <option key={fac.id} value={fac.id}>
                  {fac.shortName}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Trimester */}
          <div>
            <label className="block text-[11px] font-medium text-[#665860] mb-1">
              Trimester
            </label>
            <select
              value={filters.trimester}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  trimester: e.target.value as AnalyticsFilterState['trimester'],
                }))
              }
              aria-label="Filter by trimester"
              className="w-full px-2.5 py-2 text-xs bg-[#FBFBF7] border border-[#DDD8CB] rounded-md text-[#30232A] focus:outline-none focus:border-[#890149]"
            >
              <option value="all">All Trimesters</option>
              <option value="1">Trimester 1 (1–12w)</option>
              <option value="2">Trimester 2 (13–27w)</option>
              <option value="3">Trimester 3 (28–40w)</option>
            </select>
          </div>

          {/* 4. Health Worker */}
          <div>
            <label className="block text-[11px] font-medium text-[#665860] mb-1">
              Health Worker
            </label>
            <select
              value={filters.healthWorkerId}
              onChange={(e) => setFilters((prev) => ({ ...prev, healthWorkerId: e.target.value }))}
              aria-label="Filter by Health Worker"
              className="w-full px-2.5 py-2 text-xs bg-[#FBFBF7] border border-[#DDD8CB] rounded-md text-[#30232A] focus:outline-none focus:border-[#890149]"
            >
              <option value="all">All Health Workers</option>
              {healthWorkers.map((hw) => (
                <option key={hw.id} value={hw.id}>
                  {hw.name} ({hw.id})
                </option>
              ))}
            </select>
          </div>

          {/* 5. Alert Priority */}
          <div>
            <label className="block text-[11px] font-medium text-[#665860] mb-1">
              Alert Priority
            </label>
            <select
              value={filters.alertPriority}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  alertPriority: e.target.value as 'all' | AlertPriority,
                }))
              }
              aria-label="Filter by alert priority"
              className="w-full px-2.5 py-2 text-xs bg-[#FBFBF7] border border-[#DDD8CB] rounded-md text-[#30232A] focus:outline-none focus:border-[#890149]"
            >
              <option value="all">All Alert Priorities</option>
              {ALERT_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* 6. Referral Status */}
          <div>
            <label className="block text-[11px] font-medium text-[#665860] mb-1">
              Referral Status
            </label>
            <select
              value={filters.referralStatus}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  referralStatus: e.target.value as 'all' | ReferralStatus,
                }))
              }
              aria-label="Filter by referral status"
              className="w-full px-2.5 py-2 text-xs bg-[#FBFBF7] border border-[#DDD8CB] rounded-md text-[#30232A] focus:outline-none focus:border-[#890149]"
            >
              <option value="all">All Referral Statuses</option>
              {REFERRAL_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Optional Custom Start / End Date Range */}
        <div className="pt-2.5 border-t border-[#EAE5D9] flex flex-wrap items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 text-[#665860]">
            <Calendar className="w-3.5 h-3.5" />
            <span>Custom date window:</span>
          </span>
          <input
            type="date"
            value={filters.customStartDate ?? ''}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, customStartDate: e.target.value }))
            }
            aria-label="Custom start date"
            className="px-2.5 py-1 text-xs bg-[#FBFBF7] border border-[#DDD8CB] rounded-md text-[#30232A] tabular-nums focus:outline-none focus:border-[#890149]"
          />
          <span className="text-[#665860]">to</span>
          <input
            type="date"
            value={filters.customEndDate ?? ''}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, customEndDate: e.target.value }))
            }
            aria-label="Custom end date"
            className="px-2.5 py-1 text-xs bg-[#FBFBF7] border border-[#DDD8CB] rounded-md text-[#30232A] tabular-nums focus:outline-none focus:border-[#890149]"
          />
        </div>
      </section>

      <CollectionStateGate
        syncState={collectionStatuses.mothers}
        userEmail={currentUser.email}
        userId={currentUser.uid}
        userRole={currentUser.role}
        onRetry={refreshAllSubscriptions}
        loadingLabel="Computing maternal analytics from JanmaSaathi records..."
      >
        {/* Hospital Overview KPI Band (All 9 Required Metrics) */}
        <section
          aria-label="Hospital maternal analytics summary"
          className="bg-white border border-[#DDD8CB] rounded-lg grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-[#EAE5D9]"
        >
          <div className="p-4">
            <p className="text-xs font-medium text-[#665860]">Registered Mothers</p>
            <p className="mt-1.5 font-serif text-3xl text-[#30232A] tabular-nums">
              {analytics.overview.totalRegisteredMothers}
            </p>
            <p className="mt-1 text-xs text-[#665860] tabular-nums">
              {analytics.overview.activePregnancies} active pregnancies
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs font-medium text-[#665860]">Mothers by Trimester</p>
            <p className="mt-1.5 font-serif text-2xl text-[#30232A] tabular-nums">
              {analytics.trimesterDistribution[0].count} / {analytics.trimesterDistribution[1].count}{' '}
              / {analytics.trimesterDistribution[2].count}
            </p>
            <p className="mt-1 text-xs text-[#665860] tabular-nums">T1 · T2 · T3 active cohort</p>
          </div>
          <div className="p-4">
            <p className="text-xs font-medium text-[#665860]">High-Priority Cases</p>
            <p className="mt-1.5 font-serif text-3xl text-[#890149] tabular-nums">
              {analytics.overview.highPriorityCases}
            </p>
            <p className="mt-1 text-xs text-[#665860]">Approved High Priority &amp; Critical</p>
          </div>
          <div className="p-4">
            <p className="text-xs font-medium text-[#665860]">Open Emergency Alerts</p>
            <p
              className={`mt-1.5 font-serif text-3xl tabular-nums ${
                analytics.overview.criticalOpenAlerts > 0 ? 'text-[#B91C1C]' : 'text-[#30232A]'
              }`}
            >
              {analytics.overview.openEmergencyAlerts}
            </p>
            <p className="mt-1 text-xs text-[#665860] tabular-nums">
              {analytics.overview.criticalOpenAlerts} Critical · {analytics.filteredAlerts.length}{' '}
              in range
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs font-medium text-[#665860]">Pending Assessments</p>
            <p className="mt-1.5 font-serif text-3xl text-[#30232A] tabular-nums">
              {analytics.overview.pendingAssessments}
            </p>
            <p className="mt-1 text-xs text-[#665860] tabular-nums">
              {analytics.overview.mothersWithoutAssessment} unassessed ·{' '}
              {analytics.overview.assessmentsPendingReview} in review
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs font-medium text-[#665860]">Pending Referrals</p>
            <p className="mt-1.5 font-serif text-3xl text-[#30232A] tabular-nums">
              {analytics.overview.pendingReferrals}
            </p>
            <p className="mt-1 text-xs text-[#665860] tabular-nums">
              {analytics.referralSummary.completionRatePct !== null
                ? `${analytics.referralSummary.completionRatePct}% completion rate`
                : 'No referrals in range'}
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs font-medium text-[#665860]">Mothers w/ Upcoming Visits</p>
            <p className="mt-1.5 font-serif text-3xl text-[#30232A] tabular-nums">
              {analytics.overview.mothersWithUpcomingAppointments}
            </p>
            <p className="mt-1 text-xs text-[#665860]">Upcoming &amp; Follow-up Due</p>
          </div>
          <div className="p-4">
            <p className="text-xs font-medium text-[#665860]">Completed Follow-ups</p>
            <p className="mt-1.5 font-serif text-3xl text-[#15803D] tabular-nums">
              {analytics.overview.completedFollowUps}
            </p>
            <p className="mt-1 text-xs text-[#665860] tabular-nums">
              {analytics.appointmentAttendanceRatePct !== null
                ? `${analytics.appointmentAttendanceRatePct}% attendance rate`
                : `Across ${apptTotal} scheduled visits`}
            </p>
          </div>
        </section>

        {/* Sub-Navigation Tabs: Maternal Health | Mother-Level | Health Workers */}
        <div className="border-b border-[#DDD8CB] overflow-x-auto">
          <div className="flex items-center gap-6 min-w-max" role="tablist">
            {(
              [
                { id: 'maternal-health', label: 'Maternal Health Trends' },
                {
                  id: 'mother-level',
                  label: `Mother-Level Timeline (${analytics.filteredMothers.length})`,
                },
                {
                  id: 'health-workers',
                  label: `Health Worker Analytics (${analytics.healthWorkerAnalytics.length})`,
                },
              ] as const
            ).map((tab) => {
              const active = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`pb-3 text-sm whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
                    active
                      ? 'border-[#890149] text-[#890149] font-semibold'
                      : 'border-transparent text-[#665860] hover:text-[#30232A] font-normal'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ================================================================= */}
        {/* SUB-TAB 1: MATERNAL HEALTH ANALYTICS (All 8 Required Charts)      */}
        {/* ================================================================= */}
        {activeSubTab === 'maternal-health' && (
          <div className="space-y-6">
            {/* Row 1: Gestational Age Distribution & Trimester Split */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <section className="xl:col-span-7 bg-white border border-[#DDD8CB] rounded-lg p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h2 className="font-serif text-lg text-[#30232A]">
                      Gestational Age Distribution
                    </h2>
                    <p className="text-xs text-[#665860] mt-0.5">
                      Active pregnancies grouped by recorded gestational week bands
                      {analytics.unrecordedGestationCount > 0
                        ? ` (${analytics.unrecordedGestationCount} without recorded weeks)`
                        : ''}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  {!hasRecordedGestation ? (
                    <EmptyChartPlaceholder
                      title="No gestational week records in scope"
                      message="Adjust filters or record gestational weeks on active mother profiles to view distribution."
                    />
                  ) : (
                    <div className="h-[230px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={analytics.gestationalAgeDistribution}
                          margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#EAE5D9" vertical={false} />
                          <XAxis
                            dataKey="band"
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
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                          <Bar
                            dataKey="count"
                            name="Active Mothers"
                            fill="#890149"
                            radius={[3, 3, 0, 0]}
                            barSize={36}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </section>

              <section className="xl:col-span-5 bg-white border border-[#DDD8CB] rounded-lg p-6">
                <h2 className="font-serif text-lg text-[#30232A]">Mothers by Trimester</h2>
                <p className="text-xs text-[#665860] mt-0.5">
                  Active pregnancy distribution ({analytics.activePregnancies} mothers)
                </p>
                {analytics.activePregnancies === 0 ? (
                  <div className="mt-4">
                    <EmptyChartPlaceholder message="No active pregnancy records match the current filters." />
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div className="h-[210px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.trimesterDistribution}
                            dataKey="count"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={80}
                            paddingAngle={2}
                          >
                            {analytics.trimesterDistribution.map((entry, idx) => (
                              <Cell
                                key={entry.name}
                                fill={TRIMESTER_COLORS[idx % TRIMESTER_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3">
                      {analytics.trimesterDistribution.map((item, idx) => (
                        <div
                          key={item.name}
                          className="pb-2.5 border-b border-[#EAE5D9] last:border-b-0"
                        >
                          <div className="flex items-center gap-2 text-xs font-medium text-[#30232A]">
                            <span
                              className="w-2.5 h-2.5 rounded-xs shrink-0"
                              style={{ backgroundColor: TRIMESTER_COLORS[idx] }}
                            />
                            <span>{item.name}</span>
                          </div>
                          <p className="mt-1 pl-4 text-xs text-[#665860] tabular-nums">
                            <span className="font-semibold text-[#30232A]">{item.count}</span>{' '}
                            mothers · {item.share}%
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Row 2: Blood Pressure Trends & Blood Sugar Trends (where records exist) */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <section className="xl:col-span-6 bg-white border border-[#DDD8CB] rounded-lg p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h2 className="font-serif text-lg text-[#30232A]">Blood Pressure Trends</h2>
                    <p className="text-xs text-[#665860] mt-0.5 tabular-nums">
                      Recorded daily average Systolic &amp; Diastolic BP (mmHg) across{' '}
                      {analytics.totalBpReadings} vitals reading(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#665860]">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-3 h-0.5 bg-[#890149] inline-block" /> Systolic
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-3 h-0.5 bg-[#30232A] inline-block" /> Diastolic
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  {analytics.bloodPressureTrends.length === 0 ? (
                    <EmptyChartPlaceholder
                      title="No blood pressure records available"
                      message="No structured systolic/diastolic readings exist in the filtered cohort. Readings logged in healthUpdates or assessments appear here automatically."
                    />
                  ) : (
                    <div className="h-[240px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={analytics.bloodPressureTrends}
                          margin={{ top: 10, right: 14, left: -14, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#EAE5D9" vertical={false} />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: '#665860', fontSize: 11 }}
                            axisLine={{ stroke: '#DDD8CB' }}
                            tickLine={false}
                          />
                          <YAxis
                            domain={['auto', 'auto']}
                            tick={{ fill: '#665860', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                          <Line
                            type="monotone"
                            dataKey="avgSystolic"
                            name="Avg Systolic (mmHg)"
                            stroke="#890149"
                            strokeWidth={2.5}
                            dot={{ r: 4, fill: '#890149' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="avgDiastolic"
                            name="Avg Diastolic (mmHg)"
                            stroke="#30232A"
                            strokeWidth={2}
                            dot={{ r: 3.5, fill: '#30232A' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </section>

              <section className="xl:col-span-6 bg-white border border-[#DDD8CB] rounded-lg p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h2 className="font-serif text-lg text-[#30232A]">Blood Sugar Trends</h2>
                    <p className="text-xs text-[#665860] mt-0.5 tabular-nums">
                      Recorded blood glucose readings (mg/dL) across{' '}
                      {analytics.totalBloodSugarReadings} vitals reading(s)
                    </p>
                  </div>
                  <span className="text-[11px] text-[#665860]">mg/dL</span>
                </div>
                <div className="mt-4">
                  {analytics.bloodSugarTrends.length === 0 ? (
                    <EmptyChartPlaceholder
                      title="No blood sugar records available"
                      message="No blood glucose measurements exist in the filtered cohort. Only actual recorded readings are plotted—no values are estimated."
                    />
                  ) : (
                    <div className="h-[240px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={analytics.bloodSugarTrends}
                          margin={{ top: 10, right: 14, left: -14, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#EAE5D9" vertical={false} />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: '#665860', fontSize: 11 }}
                            axisLine={{ stroke: '#DDD8CB' }}
                            tickLine={false}
                          />
                          <YAxis
                            domain={['auto', 'auto']}
                            tick={{ fill: '#665860', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                          <Line
                            type="monotone"
                            dataKey="avgGlucose"
                            name="Avg Blood Sugar (mg/dL)"
                            stroke="#890149"
                            strokeWidth={2.5}
                            dot={{ r: 4, fill: '#890149' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="maxGlucose"
                            name="Highest Recorded (mg/dL)"
                            stroke="#D9A2B5"
                            strokeWidth={1.75}
                            strokeDasharray="4 4"
                            dot={{ r: 3, fill: '#B24B7D' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Row 3: Maternal Symptom History & Assessment Frequency */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <section className="xl:col-span-6 bg-white border border-[#DDD8CB] rounded-lg p-6">
                <h2 className="font-serif text-lg text-[#30232A]">Maternal Symptom History</h2>
                <p className="text-xs text-[#665860] mt-0.5 tabular-nums">
                  Most frequently documented symptoms across {analytics.totalSymptomEntries} recorded
                  symptom mention(s)
                </p>
                <div className="mt-4">
                  {analytics.symptomHistory.length === 0 ? (
                    <EmptyChartPlaceholder
                      title="No symptom logs in scope"
                      message="No maternal symptom logs or symptomatic alerts exist for the active filters."
                    />
                  ) : (
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={analytics.symptomHistory}
                          layout="vertical"
                          margin={{ top: 4, right: 20, left: 10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#EAE5D9" horizontal={false} />
                          <XAxis
                            type="number"
                            allowDecimals={false}
                            tick={{ fill: '#665860', fontSize: 12 }}
                            axisLine={{ stroke: '#DDD8CB' }}
                            tickLine={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="symptom"
                            width={165}
                            tick={{ fill: '#30232A', fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                          <Bar
                            dataKey="occurrences"
                            name="Recorded Occurrences"
                            fill="#890149"
                            radius={[0, 3, 3, 0]}
                            barSize={18}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </section>

              <section className="xl:col-span-6 bg-white border border-[#DDD8CB] rounded-lg p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h2 className="font-serif text-lg text-[#30232A]">Assessment Frequency</h2>
                    <p className="text-xs text-[#665860] mt-0.5 tabular-nums">
                      {analytics.filteredAssessments.length} recorded evaluation(s) grouped by
                      existing approved classification
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#665860]">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 bg-[#D9A2B5] inline-block rounded-xs" /> Routine
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 bg-[#890149] inline-block rounded-xs" /> High-Priority
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 bg-[#30232A] inline-block rounded-xs" /> Critical
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  {analytics.assessmentTrends.length === 0 ? (
                    <EmptyChartPlaceholder
                      title="No assessments recorded in range"
                      message="No dated maternal assessments match the current filter criteria."
                    />
                  ) : (
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={analytics.assessmentTrends}
                          margin={{ top: 10, right: 10, left: -16, bottom: 0 }}
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
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                          <Bar dataKey="routine" stackId="a" name="Routine / Moderate" fill="#D9A2B5" />
                          <Bar dataKey="highRisk" stackId="a" name="High Priority" fill="#890149" />
                          <Bar
                            dataKey="emergency"
                            stackId="a"
                            name="Critical / Emergency"
                            fill="#30232A"
                            radius={[3, 3, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Row 4: Emergency Alert Trends & Referral Completion Rates */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <section className="xl:col-span-6 bg-white border border-[#DDD8CB] rounded-lg p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h2 className="font-serif text-lg text-[#30232A]">Emergency Alert Trends</h2>
                    <p className="text-xs text-[#665860] mt-0.5 tabular-nums">
                      {analytics.filteredAlerts.length} alert(s) by protocol priority vs. median
                      response time where recorded
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 text-[11px] text-[#665860]">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 bg-[#B91C1C] inline-block rounded-xs" /> Critical
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 bg-[#890149] inline-block rounded-xs" /> High
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 bg-[#D9A2B5] inline-block rounded-xs" /> Mod/Low
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  {analytics.alertResponseTrends.length === 0 ? (
                    <EmptyChartPlaceholder
                      title="No emergency alerts in scope"
                      message="No emergency alert documents match the selected date range and filters."
                    />
                  ) : (
                    <div className="h-[240px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={analytics.alertResponseTrends}
                          margin={{ top: 10, right: 10, left: -16, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#EAE5D9" vertical={false} />
                          <XAxis
                            dataKey="period"
                            tick={{ fill: '#665860', fontSize: 12 }}
                            axisLine={{ stroke: '#DDD8CB' }}
                            tickLine={false}
                          />
                          <YAxis
                            yAxisId="left"
                            allowDecimals={false}
                            tick={{ fill: '#665860', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fill: '#30232A', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                          <Bar yAxisId="left" dataKey="critical" stackId="p" name="Critical" fill="#B91C1C" />
                          <Bar yAxisId="left" dataKey="highPriority" stackId="p" name="High Priority" fill="#890149" />
                          <Bar yAxisId="left" dataKey="moderate" stackId="p" name="Moderate" fill="#B24B7D" />
                          <Bar
                            yAxisId="left"
                            dataKey="low"
                            stackId="p"
                            name="Low"
                            fill="#D9A2B5"
                            radius={[3, 3, 0, 0]}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="medianMinutes"
                            name="Median Response (min)"
                            stroke="#30232A"
                            strokeWidth={2}
                            connectNulls
                            dot={{ r: 3.5, fill: '#30232A' }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </section>

              <section className="xl:col-span-6 bg-white border border-[#DDD8CB] rounded-lg p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h2 className="font-serif text-lg text-[#30232A]">Referral Completion Rates</h2>
                    <p className="text-xs text-[#665860] mt-0.5 tabular-nums">
                      {analytics.referralSummary.total > 0
                        ? `${analytics.referralSummary.completed} completed of ${analytics.referralSummary.total} referrals (${analytics.referralSummary.completionRatePct}%)`
                        : 'Inbound referral status breakdown'}
                    </p>
                  </div>
                  {analytics.referralSummary.completionRatePct !== null && (
                    <span className="font-serif text-xl text-[#15803D] tabular-nums">
                      {analytics.referralSummary.completionRatePct}%
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  {analytics.referralSummary.total === 0 ? (
                    <EmptyChartPlaceholder
                      title="No referrals in scope"
                      message="No referral records match the active filters."
                    />
                  ) : (
                    <div className="h-[240px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={analytics.referralSummary.byStatus.filter((s) => s.count > 0)}
                          margin={{ top: 10, right: 10, left: -16, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#EAE5D9" vertical={false} />
                          <XAxis
                            dataKey="status"
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
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                          <Bar
                            dataKey="count"
                            name="Referrals"
                            fill="#890149"
                            radius={[3, 3, 0, 0]}
                            barSize={34}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Row 5: Appointment Attendance & Approved Risk-Assessment Results */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <section className="xl:col-span-5 bg-white border border-[#DDD8CB] rounded-lg p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h2 className="font-serif text-lg text-[#30232A]">Appointment Attendance</h2>
                    <p className="text-xs text-[#665860] mt-0.5 tabular-nums">
                      {apptTotal} scheduled hospital visit(s)
                      {analytics.appointmentAttendanceRatePct !== null
                        ? ` · ${analytics.appointmentAttendanceRatePct}% completed vs. missed`
                        : ''}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  {apptTotal === 0 ? (
                    <EmptyChartPlaceholder
                      title="No appointments recorded"
                      message="No appointment or follow-up records exist for the selected filters."
                    />
                  ) : (
                    <div className="h-[240px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={analytics.appointmentCompletion}
                          margin={{ top: 10, right: 10, left: -16, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#EAE5D9" vertical={false} />
                          <XAxis
                            dataKey="status"
                            tick={{ fill: '#665860', fontSize: 11 }}
                            axisLine={{ stroke: '#DDD8CB' }}
                            tickLine={false}
                          />
                          <YAxis
                            allowDecimals={false}
                            tick={{ fill: '#665860', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                          <Bar dataKey="count" name="Appointments" radius={[3, 3, 0, 0]} barSize={34}>
                            {analytics.appointmentCompletion.map((entry, idx) => (
                              <Cell key={entry.status} fill={APPT_COLORS[idx % APPT_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </section>

              <section className="xl:col-span-7 bg-white border border-[#DDD8CB] rounded-lg overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-[#EAE5D9]">
                  <h2 className="font-serif text-lg text-[#30232A]">
                    Approved Risk-Assessment Results (Source &amp; Date)
                  </h2>
                  <p className="text-xs text-[#665860] mt-0.5">
                    Existing approved assessment classifications only — never computed or diagnosed
                    by analytics
                  </p>
                </div>
                {analytics.approvedRiskAssessments.length === 0 ? (
                  <div className="p-6">
                    <EmptyState
                      title="No approved risk assessments in scope"
                      description="Adjust filters or record an antenatal assessment to view approved classifications with their source and date."
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[290px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-[#FBFBF7] border-b border-[#EAE5D9] text-[#665860] font-medium">
                        <tr>
                          <th className="py-2.5 px-4">Mother</th>
                          <th className="py-2.5 px-3">Recorded Result</th>
                          <th className="py-2.5 px-3">Assessor Source</th>
                          <th className="py-2.5 px-4 text-right">Assessment Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EAE5D9]">
                        {analytics.approvedRiskAssessments.map((row) => (
                          <tr
                            key={row.id}
                            onClick={() => row.motherId && openMotherProfile(row.motherId)}
                            className="hover:bg-[#F3F3E7]/60 cursor-pointer"
                          >
                            <td className="py-3 px-4 whitespace-nowrap">
                              <p className="font-semibold text-[#30232A]">{row.motherName}</p>
                              <p className="text-[11px] text-[#665860] tabular-nums">
                                {row.motherId} · {row.assessmentType}
                              </p>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <StatusText
                                label={row.riskClassification}
                                tone={toneForRisk(row.riskClassification)}
                              />
                            </td>
                            <td className="py-3 px-3">
                              <p className="text-[#30232A] font-medium">{row.assessorName}</p>
                              <p className="text-[11px] text-[#665860]">
                                {row.assessorRole} · {row.facilityOrLocation}
                              </p>
                            </td>
                            <td className="py-3 px-4 text-right text-[#665860] tabular-nums whitespace-nowrap">
                              {row.date}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* SUB-TAB 2: MOTHER-LEVEL ANALYTICS & CHRONOLOGICAL TIMELINE        */}
        {/* ================================================================= */}
        {activeSubTab === 'mother-level' && (
          <div className="space-y-6">
            {analytics.filteredMothers.length === 0 ? (
              <EmptyState
                title="No mothers match the active filters"
                description="Reset or broaden your analytics filters to inspect individual mother timelines."
                action={
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-4 py-2 text-xs font-medium bg-[#890149] text-white rounded-md cursor-pointer"
                  >
                    Reset Filters
                  </button>
                }
              />
            ) : (
              <>
                {/* Mother Selector Bar */}
                <div className="bg-white border border-[#DDD8CB] rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
                    <label
                      htmlFor="analytics-mother-select"
                      className="text-xs font-semibold text-[#30232A] whitespace-nowrap"
                    >
                      Select Mother Record:
                    </label>
                    <select
                      id="analytics-mother-select"
                      value={activeMother?.id ?? ''}
                      onChange={(e) => setSelectedTimelineMotherId(e.target.value)}
                      className="flex-1 max-w-md px-3 py-2 text-xs bg-[#FBFBF7] border border-[#DDD8CB] rounded-md text-[#30232A] focus:outline-none focus:border-[#890149]"
                    >
                      {analytics.filteredMothers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.fullName} ({m.id}) · {m.gestationalWeeks}w {m.gestationalDays}d ·{' '}
                          {m.riskLevel}
                        </option>
                      ))}
                    </select>
                  </div>
                  {activeMother && (
                    <button
                      type="button"
                      onClick={() => openMotherProfile(activeMother.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#890149] hover:bg-[#6E013A] text-white rounded-md whitespace-nowrap cursor-pointer"
                    >
                      <span>Open Full Mother Profile</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {activeMother && (
                  <>
                    {/* Selected Mother Vitals Trends (BP & Blood Sugar where records exist) */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                      <section className="xl:col-span-6 bg-white border border-[#DDD8CB] rounded-lg p-6">
                        <h3 className="font-serif text-base text-[#30232A]">
                          {activeMother.fullName} — Blood Pressure History
                        </h3>
                        <p className="text-xs text-[#665860] mt-0.5 tabular-nums">
                          {activeMotherBpSeries.length} recorded BP reading(s) in JanmaSaathi
                        </p>
                        <div className="mt-4">
                          {activeMotherBpSeries.length === 0 ? (
                            <EmptyChartPlaceholder message="No structured blood pressure readings recorded for this mother yet." />
                          ) : (
                            <div className="h-[210px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                  data={activeMotherBpSeries}
                                  margin={{ top: 8, right: 12, left: -14, bottom: 0 }}
                                >
                                  <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#EAE5D9"
                                    vertical={false}
                                  />
                                  <XAxis
                                    dataKey="date"
                                    tick={{ fill: '#665860', fontSize: 11 }}
                                    axisLine={{ stroke: '#DDD8CB' }}
                                    tickLine={false}
                                  />
                                  <YAxis
                                    domain={['auto', 'auto']}
                                    tick={{ fill: '#665860', fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                  />
                                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                                  <Line
                                    type="monotone"
                                    dataKey="systolicBp"
                                    name="Systolic (mmHg)"
                                    stroke="#890149"
                                    strokeWidth={2.5}
                                    dot={{ r: 4, fill: '#890149' }}
                                  />
                                  <Line
                                    type="monotone"
                                    dataKey="diastolicBp"
                                    name="Diastolic (mmHg)"
                                    stroke="#30232A"
                                    strokeWidth={2}
                                    dot={{ r: 3.5, fill: '#30232A' }}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </div>
                      </section>

                      <section className="xl:col-span-6 bg-white border border-[#DDD8CB] rounded-lg p-6">
                        <h3 className="font-serif text-base text-[#30232A]">
                          {activeMother.fullName} — Blood Sugar History
                        </h3>
                        <p className="text-xs text-[#665860] mt-0.5 tabular-nums">
                          {activeMotherGlucoseSeries.length} recorded blood glucose reading(s)
                          (mg/dL)
                        </p>
                        <div className="mt-4">
                          {activeMotherGlucoseSeries.length === 0 ? (
                            <EmptyChartPlaceholder message="No blood glucose readings recorded for this mother yet." />
                          ) : (
                            <div className="h-[210px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                  data={activeMotherGlucoseSeries}
                                  margin={{ top: 8, right: 12, left: -14, bottom: 0 }}
                                >
                                  <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#EAE5D9"
                                    vertical={false}
                                  />
                                  <XAxis
                                    dataKey="date"
                                    tick={{ fill: '#665860', fontSize: 11 }}
                                    axisLine={{ stroke: '#DDD8CB' }}
                                    tickLine={false}
                                  />
                                  <YAxis
                                    domain={['auto', 'auto']}
                                    tick={{ fill: '#665860', fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                  />
                                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                                  <Line
                                    type="monotone"
                                    dataKey="bloodGlucose"
                                    name="Blood Glucose (mg/dL)"
                                    stroke="#890149"
                                    strokeWidth={2.5}
                                    dot={{ r: 4, fill: '#890149' }}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </div>
                      </section>
                    </div>

                    {/* Unified 9-Domain Chronological Health Timeline */}
                    <section className="bg-white border border-[#DDD8CB] rounded-lg overflow-hidden">
                      <div className="px-6 py-4 border-b border-[#EAE5D9] flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="font-serif text-lg text-[#30232A]">
                            Chronological Health Timeline — {activeMother.fullName}
                          </h3>
                          <p className="text-xs text-[#665860] mt-0.5 tabular-nums">
                            {activeMother.id} · {motherTimeline.length} recorded timeline event(s)
                            across milestones, health updates, assessments, reports, symptoms,
                            alerts, referrals, hospital responses, and follow-ups
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTimelineAscending((prev) => !prev)}
                          className="px-3 py-1.5 text-xs font-medium bg-[#FBFBF7] border border-[#DDD8CB] hover:border-[#890149] text-[#30232A] rounded-md cursor-pointer whitespace-nowrap"
                        >
                          Order: {timelineAscending ? 'Oldest First' : 'Newest First'}
                        </button>
                      </div>

                      {/* Category Filter Buttons */}
                      <div className="px-6 py-3 bg-[#FBFBF7] border-b border-[#EAE5D9] flex flex-wrap items-center gap-1.5">
                        {TIMELINE_CATEGORY_FILTERS.map((cat) => {
                          const active = timelineCategoryFilter === cat.id;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setTimelineCategoryFilter(cat.id)}
                              className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                                active
                                  ? 'bg-[#890149] text-white font-medium'
                                  : 'bg-white border border-[#DDD8CB] text-[#665860] hover:text-[#30232A]'
                              }`}
                            >
                              {cat.label}
                            </button>
                          );
                        })}
                      </div>

                      {motherTimeline.length === 0 ? (
                        <div className="p-6">
                          <EmptyState
                            title="No timeline events in this category"
                            description="Select 'All Events' or another clinical category to view this mother's chronological JanmaSaathi records."
                          />
                        </div>
                      ) : (
                        <ol className="divide-y divide-[#EAE5D9]">
                          {motherTimeline.map((ev) => (
                            <li
                              key={ev.id}
                              className="px-6 py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:bg-[#FBFBF7]/60"
                            >
                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <span className="font-semibold text-[#890149]">
                                    {ev.categoryLabel}
                                  </span>
                                  <span className="text-[#D9A2B5]" aria-hidden="true">
                                    ·
                                  </span>
                                  <span className="text-[#665860] tabular-nums">{ev.date}</span>
                                  {ev.statusLabel && (
                                    <>
                                      <span className="text-[#D9A2B5]" aria-hidden="true">
                                        ·
                                      </span>
                                      <StatusText
                                        label={ev.statusLabel}
                                        tone={ev.tone ?? 'neutral'}
                                      />
                                    </>
                                  )}
                                  {ev.restricted && (
                                    <span className="inline-flex items-center gap-1 text-[#665860]">
                                      <Lock className="w-3 h-3" /> Consent Required
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-semibold text-[#30232A]">{ev.title}</p>
                                <p className="text-xs text-[#665860] leading-relaxed">
                                  {ev.summary}
                                </p>
                                <p className="text-[11px] text-[#665860] tabular-nums">
                                  Source: <span className="text-[#30232A]">{ev.source}</span>
                                  {ev.metrics ? ` · ${ev.metrics}` : ''}
                                </p>
                              </div>
                              {ev.linkedSection && ev.linkedId && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (ev.linkedSection === 'alerts') {
                                      setSelectedAlertId(ev.linkedId!);
                                      setActiveSection('alerts');
                                    } else if (ev.linkedSection === 'referrals') {
                                      setSelectedReferralId(ev.linkedId!);
                                      setActiveSection('referrals');
                                    }
                                  }}
                                  className="px-3 py-1.5 text-xs font-medium bg-white border border-[#DDD8CB] hover:border-[#890149] text-[#30232A] rounded-md whitespace-nowrap shrink-0 cursor-pointer self-start"
                                >
                                  Inspect Record
                                </button>
                              )}
                            </li>
                          ))}
                        </ol>
                      )}
                    </section>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* SUB-TAB 3: HEALTH WORKER ANALYTICS (Factual Workload & Activity)  */}
        {/* ================================================================= */}
        {activeSubTab === 'health-workers' && (
          <div className="space-y-6">
            <div className="bg-[#FBFBF7] border border-[#DDD8CB] rounded-lg px-4 py-3 flex items-start gap-2.5 text-xs text-[#665860]">
              <Users className="w-4 h-4 text-[#890149] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <span className="font-semibold text-[#30232A]">Workload Visibility Notice:</span>{' '}
                Assigned caseload, submitted assessments, referrals, follow-up counts, and alert
                volume summarize operational field documentation. Activity counts must{' '}
                <span className="font-medium text-[#30232A]">
                  not be treated as proof of medical performance
                </span>
                .
              </p>
            </div>

            {analytics.healthWorkerAnalytics.length === 0 ? (
              <EmptyState
                title="No Health Worker records in scope"
                description="Adjust your facility or Health Worker filter to review field caseload and documented activity."
              />
            ) : (
              <>
                {/* Visual Workload Summary Chart */}
                <section className="bg-white border border-[#DDD8CB] rounded-lg p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <h2 className="font-serif text-lg text-[#30232A]">
                        Health Worker Caseload &amp; Activity Summary
                      </h2>
                      <p className="text-xs text-[#665860] mt-0.5">
                        Assigned mothers, assessments submitted, referrals raised, and follow-up
                        visits documented
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#665860]">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2.5 h-2.5 bg-[#890149] inline-block rounded-xs" />{' '}
                        Assigned Mothers
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2.5 h-2.5 bg-[#D9A2B5] inline-block rounded-xs" />{' '}
                        Assessments
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2.5 h-2.5 bg-[#15803D] inline-block rounded-xs" />{' '}
                        Completed Follow-ups
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2.5 h-2.5 bg-[#30232A] inline-block rounded-xs" />{' '}
                        Pending Follow-ups
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analytics.healthWorkerAnalytics}
                        margin={{ top: 10, right: 10, left: -16, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#EAE5D9" vertical={false} />
                        <XAxis
                          dataKey="name"
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
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Bar
                          dataKey="assignedMothersCount"
                          name="Assigned Mothers"
                          fill="#890149"
                          radius={[3, 3, 0, 0]}
                        />
                        <Bar
                          dataKey="assessmentsSubmitted"
                          name="Assessments Submitted"
                          fill="#D9A2B5"
                          radius={[3, 3, 0, 0]}
                        />
                        <Bar
                          dataKey="completedFollowUps"
                          name="Completed Follow-ups"
                          fill="#15803D"
                          radius={[3, 3, 0, 0]}
                        />
                        <Bar
                          dataKey="pendingFollowUps"
                          name="Pending Follow-ups"
                          fill="#30232A"
                          radius={[3, 3, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                {/* Complete 7-Metric Health Worker Analytics Table */}
                <section className="bg-white border border-[#DDD8CB] rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#EAE5D9]">
                    <h2 className="font-serif text-lg text-[#30232A]">
                      Health Worker Operational Ledger
                    </h2>
                    <p className="text-xs text-[#665860] mt-0.5">
                      Click any worker row to open full caseload and activity history
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#EAE5D9] bg-[#FBFBF7] text-xs font-medium text-[#665860]">
                          <th className="py-3 px-5">Health Worker</th>
                          <th className="py-3 px-3 text-right">Assigned Mothers</th>
                          <th className="py-3 px-3 text-right">Assessments</th>
                          <th className="py-3 px-3 text-right">Referrals</th>
                          <th className="py-3 px-3 text-right">Pending F/U</th>
                          <th className="py-3 px-3 text-right">Completed F/U</th>
                          <th className="py-3 px-3 text-right">Alerts Raised</th>
                          <th className="py-3 px-5">Most Recent Activity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EAE5D9] text-[13px]">
                        {analytics.healthWorkerAnalytics.map((hw) => {
                          const latest = hw.recentActivities[0];
                          return (
                            <tr
                              key={hw.id}
                              onClick={() => {
                                setSelectedHealthWorkerId(hw.id);
                                setActiveSection('health-workers');
                              }}
                              className="hover:bg-[#F3F3E7]/60 cursor-pointer"
                            >
                              <td className="py-3.5 px-5 whitespace-nowrap">
                                <p className="font-semibold text-[#30232A]">{hw.name}</p>
                                <p className="text-xs text-[#665860] tabular-nums">
                                  {hw.id} · {hw.cadre} · {hw.block}
                                </p>
                              </td>
                              <td className="py-3.5 px-3 text-right font-medium text-[#30232A] tabular-nums">
                                {hw.assignedMothersCount}
                              </td>
                              <td className="py-3.5 px-3 text-right text-[#30232A] tabular-nums">
                                {hw.assessmentsSubmitted}
                              </td>
                              <td className="py-3.5 px-3 text-right text-[#30232A] tabular-nums">
                                {hw.referralsRaised}
                              </td>
                              <td className="py-3.5 px-3 text-right font-medium text-[#890149] tabular-nums">
                                {hw.pendingFollowUps}
                              </td>
                              <td className="py-3.5 px-3 text-right font-medium text-[#15803D] tabular-nums">
                                {hw.completedFollowUps}
                              </td>
                              <td className="py-3.5 px-3 text-right text-[#30232A] tabular-nums">
                                {hw.emergencyAlertsSubmitted}
                              </td>
                              <td className="py-3.5 px-5 max-w-[260px]">
                                {latest ? (
                                  <div>
                                    <p className="text-xs font-medium text-[#30232A] truncate">
                                      {latest.action}
                                      {latest.motherName ? ` · ${latest.motherName}` : ''}
                                    </p>
                                    <p className="text-[11px] text-[#665860] tabular-nums">
                                      {latest.timestamp}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-xs text-[#665860]">
                                    Last sync: {hw.lastActiveDate}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </div>
        )}
      </CollectionStateGate>
    </div>
  );
};
