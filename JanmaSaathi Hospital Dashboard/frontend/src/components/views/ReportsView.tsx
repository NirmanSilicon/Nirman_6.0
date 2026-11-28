import React, { useMemo, useState } from 'react';
import { Download, Eye, FileText, Lock, ShieldCheck } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { HOSPITAL_FACILITIES } from '../../data/facilities';
import { firebaseRuntimeConfig } from '../../lib/firebase';
import {
  AnalyticsFilterState,
  DEFAULT_ANALYTICS_FILTERS,
  computeLiveAnalytics,
} from '../../services/analyticsEngine';
import { ALERT_PRIORITIES } from '../../services/alertProtocol';
import { AlertPriority, DateRangeKey, ReferralStatus } from '../../types/hospital';
import {
  ReportSectionSelection,
  exportCustomAnalyticsCsv,
  exportCustomAnalyticsPdf,
  exportSingleTablePdf,
  exportTableCsv,
  getReportAccessScope,
} from '../../utils/reportExport';
import { SectionHeader, SlideOverDrawer } from '../ui/ClinicalPrimitives';
import { CollectionStateGate } from '../ui/FirestoreStatePanels';

interface ReportDefinition {
  id: string;
  title: string;
  category: string;
  cadence: string;
  description: string;
  containsPatientPii: boolean;
  headers: string[];
  getRows: (deidentify: boolean) => string[][];
}

const REFERRAL_STATUSES: ReferralStatus[] = [
  'Pending',
  'Accepted',
  'In Transit',
  'Admitted',
  'Completed',
  'Declined',
];

export const ReportsView: React.FC = () => {
  const {
    appMode,
    dateRange,
    currentFacility,
    currentUser,
    mothers,
    assessments,
    alerts,
    referrals,
    appointments,
    healthWorkers,
    collectionStatuses,
    refreshAllSubscriptions,
    logAuditAction,
    openMotherProfile,
  } = useDashboard();

  const accessScope = getReportAccessScope(currentUser.role);
  const mustDeidentify = accessScope !== 'full-hospital';

  const [reportTitle, setReportTitle] = useState(
    'Hospital Maternal Healthcare Summary Report'
  );
  const [filters, setFilters] = useState<AnalyticsFilterState>({
    ...DEFAULT_ANALYTICS_FILTERS,
    dateRange,
  });
  const [sections, setSections] = useState<ReportSectionSelection>({
    maternalStats: true,
    alertSummaries: true,
    referralSummaries: true,
    healthWorkerActivity: true,
    assessmentTrends: true,
  });
  const [deidentifyPatientNames, setDeidentifyPatientNames] = useState<boolean>(mustDeidentify);
  const [previewReportId, setPreviewReportId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const effectiveDeidentify = mustDeidentify || deidentifyPatientNames;

  const analytics = useMemo(
    () =>
      computeLiveAnalytics(filters, {
        mothers,
        assessments,
        referrals,
        appointments,
        alerts,
        healthWorkers,
      }),
    [filters, mothers, assessments, referrals, appointments, alerts, healthWorkers]
  );

  const modeLabel =
    appMode === 'demo'
      ? 'DEMO MODE (JanmaSaathi Fixtures)'
      : `Live Firestore (${firebaseRuntimeConfig.projectId})`;

  const accessScopeLabel =
    accessScope === 'full-hospital'
      ? effectiveDeidentify
        ? 'Authorized Hospital Staff (De-identified IDs Only)'
        : 'Authorized Hospital Staff (Consent-Masked Demographics)'
      : 'Restricted Aggregate / De-identified Scope';

  const activeFiltersSummary = useMemo(() => {
    const parts: string[] = [];
    if (filters.facilityId !== 'all') {
      const fac = HOSPITAL_FACILITIES.find((f) => f.id === filters.facilityId);
      parts.push(`Facility: ${fac?.shortName ?? filters.facilityId}`);
    }
    if (filters.trimester !== 'all') parts.push(`Trimester ${filters.trimester}`);
    if (filters.healthWorkerId !== 'all') {
      const hw = healthWorkers.find((w) => w.id === filters.healthWorkerId);
      parts.push(`Worker: ${hw?.name ?? filters.healthWorkerId}`);
    }
    if (filters.alertPriority !== 'all') parts.push(`Alert: ${filters.alertPriority}`);
    if (filters.referralStatus !== 'all') parts.push(`Referral: ${filters.referralStatus}`);
    return parts.length > 0 ? parts.join(' · ') : 'All facilities, trimesters, workers & statuses';
  }, [filters, healthWorkers]);

  const anySectionSelected = Object.values(sections).some(Boolean);

  const notifyStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 5000);
  };

  const handleGenerateCustomPdf = () => {
    if (accessScope === 'denied' || !anySectionSelected) return;
    exportCustomAnalyticsPdf({
      reportTitle: reportTitle.trim() || 'Hospital Maternal Healthcare Report',
      dateRangeLabel: analytics.scaleLabel,
      activeFiltersSummary,
      deidentifyPatientNames: effectiveDeidentify,
      sections,
      analytics,
      facility: currentFacility,
      user: currentUser,
      appMode,
      projectId: firebaseRuntimeConfig.projectId,
    });
    void logAuditAction(
      'Report Export',
      `Exported Custom PDF Report: ${reportTitle.trim() || 'Hospital Maternal Healthcare Report'}`,
      `${currentFacility.shortName} · ${analytics.scaleLabel}`,
      accessScopeLabel
    );
    notifyStatus(`Downloaded PDF report "${reportTitle.trim()}" (${analytics.scaleLabel}).`);
  };

  const handleGenerateCustomCsv = () => {
    if (accessScope === 'denied' || !anySectionSelected) return;
    const rows = exportCustomAnalyticsCsv({
      reportTitle: reportTitle.trim() || 'Hospital Maternal Healthcare Report',
      dateRangeLabel: analytics.scaleLabel,
      activeFiltersSummary,
      deidentifyPatientNames: effectiveDeidentify,
      sections,
      analytics,
      facility: currentFacility,
      user: currentUser,
      appMode,
      projectId: firebaseRuntimeConfig.projectId,
    });
    void logAuditAction(
      'Report Export',
      `Exported Custom CSV Bundle: ${reportTitle.trim() || 'Hospital Maternal Healthcare Report'}`,
      `${currentFacility.shortName} · ${rows} data rows`,
      accessScopeLabel
    );
    notifyStatus(`Downloaded CSV report bundle (${rows} rows, ${analytics.scaleLabel}).`);
  };

  const maskName = (name: string, id: string, deid: boolean) =>
    deid ? `Patient (${id})` : name;

  const reports: ReportDefinition[] = [
    {
      id: 'RPT-MAT-01',
      title: 'Maternal Cohort & Antenatal Registry',
      category: 'Maternal Statistics',
      cadence: 'Daily / Monthly',
      containsPatientPii: true,
      description:
        'Filtered maternal cohort including gestational age, EDD, approved risk classification, assigned Health Worker, latest BP/Hb, and consent-masked demographics.',
      headers: [
        'Mother ID',
        'Mother',
        'Age (Consent-Gated)',
        'Gestational Age',
        'Trimester',
        'EDD',
        'Recorded Risk',
        'Latest BP',
        'Latest Hb',
        'Health Worker',
      ],
      getRows: (deid) =>
        analytics.filteredMothers.map((m) => [
          m.id,
          maskName(m.fullName, m.id, deid),
          !deid && m.ageAuthorized && m.age !== null ? String(m.age) : 'Restricted',
          `${m.gestationalWeeks}w ${m.gestationalDays}d`,
          `T${m.trimester}`,
          m.eddDate,
          m.riskLevel,
          m.latestBp,
          m.latestHb ? `${m.latestHb} g/dL` : '—',
          m.assignedHealthWorkerName,
        ]),
    },
    {
      id: 'RPT-ALT-02',
      title: 'Emergency Alert Summaries & Triage Audit',
      category: 'Alert Summaries',
      cadence: 'Shift Handover / Weekly',
      containsPatientPii: true,
      description:
        'Chronological summary of emergency alerts from Mothers, Health Workers, and Supervisors, with protocol priority, vitals at submission, and workflow status.',
      headers: [
        'Alert ID',
        'Mother ID',
        'Mother',
        'Source Role',
        'Priority',
        'Status',
        'BP',
        'Timestamp',
      ],
      getRows: (deid) =>
        analytics.filteredAlerts.map((a) => [
          a.id,
          a.motherId,
          maskName(a.motherName, a.motherId, deid),
          a.reportingSource,
          a.severity,
          a.status,
          a.vitalsSnapshot.bp,
          a.timestamp,
        ]),
    },
    {
      id: 'RPT-REF-03',
      title: 'Hospital Referral Summaries & Completion Tracking',
      category: 'Referral Summaries',
      cadence: 'Weekly / Monthly',
      containsPatientPii: true,
      description:
        'Inbound referrals received across facilities, clinical reasons, transfer status, and scheduled follow-ups.',
      headers: [
        'Referral ID',
        'Mother ID',
        'Mother',
        'Source Facility',
        'Destination',
        'Urgency',
        'Status',
        'Date',
      ],
      getRows: (deid) =>
        analytics.filteredReferrals.map((r) => [
          r.id,
          r.motherId,
          maskName(r.motherName, r.motherId, deid),
          r.sourceFacility,
          r.destinationHospital,
          r.urgency,
          r.status,
          r.referralDate,
        ]),
    },
    {
      id: 'RPT-HW-04',
      title: 'Health Worker Activity & Caseload Summary',
      category: 'Health Worker Activity',
      cadence: 'Monthly',
      containsPatientPii: false,
      description:
        'Operational summary of assigned mothers, submitted assessments, referrals raised, pending/completed follow-ups, and emergency alerts (documentation volume only).',
      headers: [
        'Worker ID',
        'Name',
        'Cadre',
        'Block',
        'Assigned Mothers',
        'Assessments',
        'Referrals',
        'Pending F/U',
        'Completed F/U',
        'Alerts Raised',
      ],
      getRows: () =>
        analytics.healthWorkerAnalytics.map((hw) => [
          hw.id,
          hw.name,
          hw.cadre,
          hw.block,
          String(hw.assignedMothersCount),
          String(hw.assessmentsSubmitted),
          String(hw.referralsRaised),
          String(hw.pendingFollowUps),
          String(hw.completedFollowUps),
          String(hw.emergencyAlertsSubmitted),
        ]),
    },
    {
      id: 'RPT-ASM-05',
      title: 'Assessment Trends & Approved Risk-Assessment Ledger',
      category: 'Assessment Trends',
      cadence: 'Weekly / Monthly',
      containsPatientPii: true,
      description:
        'Recorded maternal assessments with existing approved risk classifications, assessor name, role, facility source, and assessment date.',
      headers: [
        'Assessment ID',
        'Date',
        'Mother ID',
        'Mother',
        'Type',
        'Recorded Risk',
        'Assessor & Role',
        'Facility / Location',
        'BP',
      ],
      getRows: (deid) =>
        analytics.approvedRiskAssessments.map((a) => [
          a.id,
          a.date,
          a.motherId,
          maskName(a.motherName, a.motherId, deid),
          a.assessmentType,
          a.riskClassification,
          `${a.assessorName} (${a.assessorRole})`,
          a.facilityOrLocation,
          a.bpReading,
        ]),
    },
  ];

  const activePreview = reports.find((r) => r.id === previewReportId) ?? null;

  const handleDownloadCatalogCsv = (report: ReportDefinition) => {
    if (accessScope === 'denied') return;
    const rows = report.getRows(effectiveDeidentify);
    exportTableCsv({
      filename: `${report.id.toLowerCase()}-${appMode === 'demo' ? 'demo-mode' : 'live-export'}.csv`,
      reportTitle: report.title,
      facilityName: currentFacility.name,
      modeLabel,
      dateRangeLabel: analytics.scaleLabel,
      generatedBy: `${currentUser.name} (${currentUser.role})`,
      accessScopeLabel,
      headers: report.headers,
      rows,
    });
    void logAuditAction(
      'Report Export',
      `Exported CSV Report: ${report.title}`,
      `${currentFacility.shortName} (${rows.length} rows · ${analytics.scaleLabel})`,
      accessScopeLabel
    );
    notifyStatus(`Exported "${report.title}" (${rows.length} rows) as CSV.`);
  };

  const handleDownloadCatalogPdf = (report: ReportDefinition) => {
    if (accessScope === 'denied') return;
    const rows = report.getRows(effectiveDeidentify);
    exportSingleTablePdf({
      reportId: report.id,
      reportTitle: report.title,
      description: report.description,
      facility: currentFacility,
      user: currentUser,
      appMode,
      projectId: firebaseRuntimeConfig.projectId,
      dateRangeLabel: analytics.scaleLabel,
      accessScopeLabel,
      headers: report.headers,
      rows,
    });
    void logAuditAction(
      'Report Export',
      `Exported PDF Report: ${report.title}`,
      `${currentFacility.shortName} (${rows.length} rows · ${analytics.scaleLabel})`,
      accessScopeLabel
    );
    notifyStatus(`Exported "${report.title}" (${rows.length} rows) as PDF.`);
  };

  // =========================================================================
  // Patient Data Access Restriction Gate (Mother role cannot export cohort PII)
  // =========================================================================
  if (accessScope === 'denied') {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Reports"
          subtitle={`Hospital Maternal Healthcare Reporting · ${currentFacility.name}`}
        />
        <section className="bg-white border border-[#DDD8CB] rounded-lg p-8 max-w-2xl space-y-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-[#890149] shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h2 className="font-serif text-xl text-[#30232A]">
                Patient Data Access Restriction Active
              </h2>
              <p className="text-sm text-[#665860] leading-relaxed">
                Signed-in role <span className="font-semibold text-[#30232A]">{currentUser.role}</span>{' '}
                is not authorized to generate or export multi-patient hospital analytics reports.
                Hospital cohort PDF and CSV exports are restricted to authorized hospital personnel
                and clinical supervisors under JanmaSaathi patient privacy governance.
              </p>
              <p className="text-xs text-[#665860]">
                You may still inspect your own maternal record and print your personal clinical
                summary directly from Mother Records.
              </p>
            </div>
          </div>
          {mothers.some((m) => m.id === currentUser.staffId) && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => openMotherProfile(currentUser.staffId)}
                className="px-4 py-2 text-xs font-medium bg-[#890149] hover:bg-[#6E013A] text-white rounded-md cursor-pointer"
              >
                Open My Maternal Profile ({currentUser.staffId})
              </button>
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Reports & Exports"
        subtitle={`Authorized hospital reporting with PDF and CSV export · ${currentFacility.name} · ${modeLabel}`}
      />

      {/* Access Scope & Privacy Banner */}
      <div className="bg-[#FBFBF7] border border-[#DDD8CB] rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5 text-[#665860]">
          <ShieldCheck className="w-4 h-4 text-[#890149] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <span className="font-semibold text-[#30232A]">Patient Data Access Policy:</span>{' '}
            {accessScope === 'full-hospital'
              ? 'Authorized hospital personnel may export consent-masked patient reports or switch on De-identified ID-only mode. Every PDF and CSV export is logged in Audit Logs.'
              : 'Health Worker accounts operate in De-identified Export Scope—patient names and restricted demographics are automatically masked to Mother IDs across all PDF and CSV exports.'}
          </p>
        </div>
        <span className="text-[11px] font-semibold text-[#890149] whitespace-nowrap">
          {accessScope === 'full-hospital' ? 'Authorized Hospital Scope' : 'De-identified Scope'}
        </span>
      </div>

      {statusMessage && (
        <div
          role="status"
          className="px-4 py-3 bg-[#F7EDF2] border border-[#D9A2B5] rounded-md text-xs font-medium text-[#890149]"
        >
          {statusMessage}
        </div>
      )}

      <CollectionStateGate
        syncState={collectionStatuses.mothers}
        userEmail={currentUser.email}
        userId={currentUser.uid}
        userRole={currentUser.role}
        onRetry={refreshAllSubscriptions}
        loadingLabel="Preparing maternal health reports..."
      >
        {/* Custom Multi-Section Report Builder */}
        <section className="bg-white border border-[#DDD8CB] rounded-lg p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#EAE5D9]">
            <div>
              <h2 className="font-serif text-xl text-[#30232A]">
                Custom Maternal Analytics Report Builder
              </h2>
              <p className="text-xs text-[#665860] mt-0.5">
                Configure date range, scope filters, and included sections for a combined hospital
                PDF or CSV report.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!anySectionSelected}
                onClick={handleGenerateCustomCsv}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white border border-[#DDD8CB] hover:border-[#890149] disabled:opacity-50 text-[#30232A] rounded-md whitespace-nowrap cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV Bundle</span>
              </button>
              <button
                type="button"
                disabled={!anySectionSelected}
                onClick={handleGenerateCustomPdf}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#890149] hover:bg-[#6E013A] disabled:opacity-50 text-white rounded-md whitespace-nowrap cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Export PDF Report</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Title + Date Range + Filters */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#30232A] mb-1">
                  Report Title
                </label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  maxLength={120}
                  className="w-full px-3 py-2 text-sm bg-[#FBFBF7] border border-[#DDD8CB] rounded-md text-[#30232A] focus:outline-none focus:border-[#890149]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#665860] mb-1">
                    Date Range
                  </label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        dateRange: e.target.value as DateRangeKey,
                        customStartDate: '',
                        customEndDate: '',
                      }))
                    }
                    className="w-full px-2.5 py-2 text-xs bg-[#FBFBF7] border border-[#DDD8CB] rounded-md text-[#30232A] focus:outline-none focus:border-[#890149]"
                  >
                    <option value="all">All Recorded Data</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                    <option value="quarter">Current Quarter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#665860] mb-1">
                    Start Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={filters.customStartDate ?? ''}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, customStartDate: e.target.value }))
                    }
                    className="w-full px-2.5 py-2 text-xs bg-[#FBFBF7] border border-[#DDD8CB] rounded-md text-[#30232A] tabular-nums focus:outline-none focus:border-[#890149]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#665860] mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={filters.customEndDate ?? ''}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, customEndDate: e.target.value }))
                    }
                    className="w-full px-2.5 py-2 text-xs bg-[#FBFBF7] border border-[#DDD8CB] rounded-md text-[#30232A] tabular-nums focus:outline-none focus:border-[#890149]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#665860] mb-1">
                    Hospital / Facility
                  </label>
                  <select
                    value={filters.facilityId}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, facilityId: e.target.value }))
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FBFBF7] border border-[#DDD8CB] rounded-md text-[#30232A]"
                  >
                    <option value="all">All Facilities</option>
                    {HOSPITAL_FACILITIES.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.shortName}
                      </option>
                    ))}
                  </select>
                </div>
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
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FBFBF7] border border-[#DDD8CB] rounded-md text-[#30232A]"
                  >
                    <option value="all">All Trimesters</option>
                    <option value="1">Trimester 1</option>
                    <option value="2">Trimester 2</option>
                    <option value="3">Trimester 3</option>
                  </select>
                </div>
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
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FBFBF7] border border-[#DDD8CB] rounded-md text-[#30232A]"
                  >
                    <option value="all">All Priorities</option>
                    {ALERT_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
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
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FBFBF7] border border-[#DDD8CB] rounded-md text-[#30232A]"
                  >
                    <option value="all">All Statuses</option>
                    {REFERRAL_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Included Sections & Privacy Controls */}
            <div className="lg:col-span-5 bg-[#FBFBF7] border border-[#EAE5D9] rounded-md p-4 space-y-3.5">
              <p className="text-xs font-semibold text-[#30232A]">Included Report Sections</p>
              <div className="space-y-2 text-xs text-[#30232A]">
                {(
                  [
                    {
                      key: 'maternalStats',
                      label: `Maternal Statistics (${analytics.overview.totalRegisteredMothers} mothers)`,
                    },
                    {
                      key: 'alertSummaries',
                      label: `Alert Summaries (${analytics.filteredAlerts.length} alerts)`,
                    },
                    {
                      key: 'referralSummaries',
                      label: `Referral Summaries (${analytics.filteredReferrals.length} referrals)`,
                    },
                    {
                      key: 'healthWorkerActivity',
                      label: `Health Worker Activity (${analytics.healthWorkerAnalytics.length} workers)`,
                    },
                    {
                      key: 'assessmentTrends',
                      label: `Assessment Trends & Approved Results (${analytics.filteredAssessments.length} assessments)`,
                    },
                  ] as const
                ).map((item) => (
                  <label key={item.key} className="flex items-center gap-2 cursor-pointer tabular-nums">
                    <input
                      type="checkbox"
                      checked={sections[item.key]}
                      onChange={(e) =>
                        setSections((prev) => ({ ...prev, [item.key]: e.target.checked }))
                      }
                      className="accent-[#890149]"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>

              <div className="pt-3 border-t border-[#EAE5D9]">
                <label className="flex items-start gap-2 text-xs text-[#30232A] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={effectiveDeidentify}
                    disabled={mustDeidentify}
                    onChange={(e) => setDeidentifyPatientNames(e.target.checked)}
                    className="accent-[#890149] mt-0.5"
                  />
                  <span>
                    <span className="font-medium">De-identify patient names (Mother IDs only)</span>
                    <span className="block text-[11px] text-[#665860] mt-0.5">
                      {mustDeidentify
                        ? 'Enforced automatically for non-hospital roles.'
                        : 'Recommended when sharing reports outside clinical care teams.'}
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Individual Structured Report Catalog */}
        <div className="bg-white border border-[#DDD8CB] rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-[#EAE5D9] flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="font-serif text-lg text-[#30232A]">Standard Hospital Report Catalog</h2>
              <p className="text-xs text-[#665860] mt-0.5 tabular-nums">
                Scoped to active filter range ({analytics.scaleLabel}) · {accessScopeLabel}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#EAE5D9] bg-[#FBFBF7] text-xs font-medium text-[#665860]">
                  <th className="py-3 px-6">Report Title &amp; Scope</th>
                  <th className="py-3 px-4">Domain</th>
                  <th className="py-3 px-4">Cadence</th>
                  <th className="py-3 px-4 text-right">Records</th>
                  <th className="py-3 px-6 text-right">Exports</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE5D9] text-[13px]">
                {reports.map((report) => {
                  const rowCount = report.getRows(effectiveDeidentify).length;
                  return (
                    <tr key={report.id} className="hover:bg-[#F3F3E7]/55">
                      <td className="py-4 px-6 max-w-xl">
                        <p className="font-semibold text-[#30232A]">{report.title}</p>
                        <p className="mt-1 text-xs text-[#665860] leading-relaxed">
                          {report.description}
                        </p>
                        <p className="mt-1 text-[11px] text-[#665860] tabular-nums">
                          {report.id}
                          {report.containsPatientPii && effectiveDeidentify
                            ? ' · De-identified output'
                            : ''}
                        </p>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-xs text-[#30232A]">
                        {report.category}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-xs text-[#665860]">
                        {report.cadence}
                      </td>
                      <td className="py-4 px-4 text-right tabular-nums text-xs font-semibold text-[#30232A]">
                        {rowCount} rows
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewReportId(report.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-white border border-[#DDD8CB] hover:border-[#890149] text-[#30232A] rounded-md cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadCatalogCsv(report)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-white border border-[#DDD8CB] hover:border-[#890149] text-[#30232A] rounded-md cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>CSV</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadCatalogPdf(report)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#890149] hover:bg-[#6E013A] text-white rounded-md cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </CollectionStateGate>

      <SlideOverDrawer
        open={Boolean(activePreview)}
        onClose={() => setPreviewReportId(null)}
        title={activePreview?.title ?? ''}
        subtitle={
          activePreview
            ? `${activePreview.id} · ${activePreview.category} · ${analytics.scaleLabel} · ${accessScopeLabel}`
            : undefined
        }
        widthClass="max-w-4xl"
      >
        {activePreview && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#EAE5D9]">
              <p className="text-xs text-[#665860] max-w-xl">{activePreview.description}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadCatalogCsv(activePreview)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-[#DDD8CB] hover:border-[#890149] text-[#30232A] rounded-md whitespace-nowrap cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadCatalogPdf(activePreview)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#890149] hover:bg-[#6E013A] text-white rounded-md whitespace-nowrap cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>

            {activePreview.getRows(effectiveDeidentify).length === 0 ? (
              <div className="p-8 text-center text-xs text-[#665860] border border-dashed border-[#DDD8CB] rounded-md">
                No records exist for this report under the selected date range and filters.
              </div>
            ) : (
              <div className="border border-[#DDD8CB] rounded-md overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FBFBF7] border-b border-[#EAE5D9] text-[#665860] font-medium">
                      {activePreview.headers.map((h) => (
                        <th key={h} className="py-2.5 px-3 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE5D9] tabular-nums">
                    {activePreview.getRows(effectiveDeidentify).map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#F3F3E7]/40">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="py-2.5 px-3 text-[#30232A] whitespace-nowrap">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
};
