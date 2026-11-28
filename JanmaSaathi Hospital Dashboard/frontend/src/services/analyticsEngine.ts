import { HOSPITAL_FACILITIES } from '../data/facilities';
import {
  AlertPriority,
  AppointmentRecord,
  AssessmentRecord,
  DateRangeKey,
  EmergencyAlert,
  HealthWorker,
  MotherRecord,
  ReferralRecord,
  ReferralStatus,
} from '../types/hospital';
import { isActiveAlertStatus, SOURCE_ROLE_LABELS } from './alertProtocol';

export interface AnalyticsFilterState {
  dateRange: DateRangeKey;
  customStartDate?: string;
  customEndDate?: string;
  facilityId: string; // 'all' or facilityId
  trimester: 'all' | '1' | '2' | '3';
  healthWorkerId: string; // 'all' or healthWorker.id
  alertPriority: 'all' | AlertPriority;
  referralStatus: 'all' | ReferralStatus;
}

export const DEFAULT_ANALYTICS_FILTERS: AnalyticsFilterState = {
  dateRange: 'all',
  customStartDate: '',
  customEndDate: '',
  facilityId: 'all',
  trimester: 'all',
  healthWorkerId: 'all',
  alertPriority: 'all',
  referralStatus: 'all',
};

export interface GestationalAgeBucket {
  band: string;
  trimester: string;
  count: number;
}

export interface BloodPressureTrendPoint {
  date: string;
  avgSystolic: number;
  avgDiastolic: number;
  maxSystolic: number;
  minDiastolic: number;
  readingCount: number;
}

export interface BloodSugarTrendPoint {
  date: string;
  avgGlucose: number;
  maxGlucose: number;
  minGlucose: number;
  readingCount: number;
}

export interface SymptomFrequencyPoint {
  symptom: string;
  occurrences: number;
  severeCount: number;
  mothersAffected: number;
}

export interface AlertTrendPoint {
  period: string;
  alerts: number;
  critical: number;
  highPriority: number;
  moderate: number;
  low: number;
  medianMinutes: number | null;
}

export interface ApprovedRiskAssessmentRow {
  id: string;
  motherId: string;
  motherName: string;
  date: string;
  assessmentType: string;
  riskClassification: AssessmentRecord['riskClassification'];
  assessorName: string;
  assessorRole: string;
  facilityOrLocation: string;
  bpReading: string;
  summary: string;
}

export interface HealthWorkerAnalyticsRow {
  id: string;
  name: string;
  regionalName: string;
  cadre: HealthWorker['cadre'];
  block: string;
  subCentre: string;
  status: HealthWorker['status'];
  lastActiveDate: string;
  assignedMothersCount: number;
  assessmentsSubmitted: number;
  referralsRaised: number;
  pendingFollowUps: number;
  completedFollowUps: number;
  emergencyAlertsSubmitted: number;
  recentActivities: {
    id: string;
    timestamp: string;
    action: string;
    motherName?: string;
    details: string;
  }[];
}

export interface OverviewMetricsSummary {
  totalRegisteredMothers: number;
  activePregnancies: number;
  mothersWithUpcomingAppointments: number;
  pendingAssessments: number;
  mothersWithoutAssessment: number;
  assessmentsPendingReview: number;
  openEmergencyAlerts: number;
  criticalOpenAlerts: number;
  highPriorityCases: number;
  pendingReferrals: number;
  completedFollowUps: number;
}

export interface LiveAnalyticsBundle {
  scaleLabel: string;
  totalAccessibleMothers: number;
  activePregnancies: number;
  overview: OverviewMetricsSummary;
  filteredMothers: MotherRecord[];
  filteredAssessments: AssessmentRecord[];
  filteredReferrals: ReferralRecord[];
  filteredAppointments: AppointmentRecord[];
  filteredAlerts: EmergencyAlert[];
  trimesterDistribution: { name: string; shortName: string; count: number; share: number }[];
  gestationalAgeDistribution: GestationalAgeBucket[];
  unrecordedGestationCount: number;
  registrationTrends: { period: string; registrations: number; assessments: number }[];
  highPriorityDistribution: { condition: string; cases: number }[];
  bloodPressureTrends: BloodPressureTrendPoint[];
  totalBpReadings: number;
  bloodSugarTrends: BloodSugarTrendPoint[];
  totalBloodSugarReadings: number;
  symptomHistory: SymptomFrequencyPoint[];
  totalSymptomEntries: number;
  assessmentTrends: { period: string; total: number; routine: number; highRisk: number; emergency: number }[];
  referralTrends: { period: string; inbound: number; admitted: number; completed: number }[];
  referralSummary: {
    total: number;
    completed: number;
    admittedOrAccepted: number;
    pendingOrTransit: number;
    declined: number;
    completionRatePct: number | null;
    byStatus: { status: ReferralStatus; count: number }[];
  };
  appointmentCompletion: { status: string; count: number }[];
  appointmentAttendanceRatePct: number | null;
  alertResponseTrends: AlertTrendPoint[];
  approvedRiskAssessments: ApprovedRiskAssessmentRow[];
  healthWorkerAnalytics: HealthWorkerAnalyticsRow[];
}

export type MotherTimelineCategory =
  | 'milestone'
  | 'health-update'
  | 'assessment'
  | 'report'
  | 'symptom'
  | 'alert'
  | 'referral'
  | 'hospital-response'
  | 'follow-up';

export interface MotherTimelineEvent {
  id: string;
  category: MotherTimelineCategory;
  categoryLabel: string;
  date: string;
  sortMs: number;
  title: string;
  summary: string;
  source: string;
  statusLabel?: string;
  tone?: 'critical' | 'high' | 'moderate' | 'positive' | 'neutral' | 'cherry';
  metrics?: string;
  linkedId?: string;
  linkedSection?: 'alerts' | 'referrals';
  restricted?: boolean;
}

function getDateCutoff(range: DateRangeKey): number | null {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  switch (range) {
    case '7d':
      return now - 7 * day;
    case '30d':
      return now - 30 * day;
    case '90d':
      return now - 90 * day;
    case 'quarter':
      return now - 120 * day;
    case 'all':
      return null;
  }
}

export function parseDateMs(value: string): number | null {
  if (!value || value === '—' || value.toLowerCase().includes('not recorded')) return null;
  const trimmed = value.trim();
  const normalized = trimmed.includes(' ') && !trimmed.includes('T') ? trimmed.replace(' ', 'T') : trimmed;
  const ms = Date.parse(normalized);
  return Number.isNaN(ms) ? null : ms;
}

function isWithinDateFilter(
  value: string,
  cutoff: number | null,
  customStartMs: number | null,
  customEndMs: number | null
): boolean {
  const ms = parseDateMs(value);
  if (customStartMs !== null || customEndMs !== null) {
    if (ms === null) return false;
    if (customStartMs !== null && ms < customStartMs) return false;
    if (customEndMs !== null && ms > customEndMs) return false;
    return true;
  }
  if (cutoff === null) return true;
  if (ms === null) return true;
  return ms >= cutoff;
}

function bucketKey(value: string, range: DateRangeKey): { key: string; sortMs: number } {
  const ms = parseDateMs(value);
  if (ms === null) return { key: 'Undated', sortMs: 0 };
  const d = new Date(ms);
  if (range === '7d' || range === '30d') {
    const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    return {
      key: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      sortMs: startOfDay,
    };
  }
  const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  return {
    key: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
    sortMs: startOfMonth,
  };
}

function matchesFacility(
  facilityIdFilter: string,
  candidates: (string | undefined | null)[]
): boolean {
  if (!facilityIdFilter || facilityIdFilter === 'all') return true;
  const facility = HOSPITAL_FACILITIES.find((f) => f.id === facilityIdFilter);
  const tokens = new Set<string>([facilityIdFilter.toLowerCase()]);
  if (facility) {
    tokens.add(facility.name.toLowerCase());
    tokens.add(facility.shortName.toLowerCase());
    tokens.add(facility.district.toLowerCase());
    facility.catchmentBlocks.forEach((b) => tokens.add(b.toLowerCase()));
  }
  const haystack = candidates
    .filter((c): c is string => Boolean(c && c !== '—'))
    .map((c) => c.toLowerCase());
  if (haystack.length === 0) return false;
  for (const h of haystack) {
    for (const token of tokens) {
      if (h === token || h.includes(token) || token.includes(h)) {
        return true;
      }
    }
  }
  return false;
}

export function computeLiveAnalytics(
  rangeOrFilters: DateRangeKey | AnalyticsFilterState,
  data: {
    mothers: MotherRecord[];
    assessments: AssessmentRecord[];
    referrals: ReferralRecord[];
    appointments: AppointmentRecord[];
    alerts: EmergencyAlert[];
    healthWorkers?: HealthWorker[];
  }
): LiveAnalyticsBundle {
  const filters: AnalyticsFilterState =
    typeof rangeOrFilters === 'string'
      ? { ...DEFAULT_ANALYTICS_FILTERS, dateRange: rangeOrFilters }
      : rangeOrFilters;

  const cutoff = getDateCutoff(filters.dateRange);
  const customStartMs = filters.customStartDate ? parseDateMs(`${filters.customStartDate}T00:00:00`) : null;
  const customEndMs = filters.customEndDate ? parseDateMs(`${filters.customEndDate}T23:59:59`) : null;

  const scaleLabel =
    filters.customStartDate || filters.customEndDate
      ? `${filters.customStartDate || 'Start'} to ${filters.customEndDate || 'Present'}`
      : filters.dateRange === '7d'
      ? 'Last 7 Days'
      : filters.dateRange === '30d'
      ? 'Last 30 Days'
      : filters.dateRange === '90d'
      ? 'Last 90 Days'
      : filters.dateRange === 'quarter'
      ? 'Current Quarter'
      : 'All Recorded Data';

  const allWorkers = data.healthWorkers ?? [];
  const selectedWorker =
    filters.healthWorkerId !== 'all'
      ? allWorkers.find((w) => w.id === filters.healthWorkerId) ?? null
      : null;

  // 1. Filter Mothers by facility, trimester, health worker
  let scopedMothers = data.mothers.filter((m) => {
    if (filters.trimester !== 'all' && String(m.trimester) !== filters.trimester) {
      return false;
    }
    if (filters.healthWorkerId !== 'all') {
      const idMatch = m.assignedHealthWorkerId === filters.healthWorkerId;
      const nameMatch = selectedWorker && m.assignedHealthWorkerName === selectedWorker.name;
      if (!idMatch && !nameMatch) return false;
    }
    if (filters.facilityId !== 'all') {
      const matched = matchesFacility(filters.facilityId, [m.block, m.villageOrWard]);
      const linkedAlertFac = data.alerts.some(
        (a) => a.motherId === m.id && matchesFacility(filters.facilityId, [a.facilityId, a.facilityName])
      );
      const linkedRefFac = data.referrals.some(
        (r) =>
          r.motherId === m.id &&
          matchesFacility(filters.facilityId, [r.destinationHospital, r.sourceFacility])
      );
      if (!matched && !linkedAlertFac && !linkedRefFac) return false;
    }
    return true;
  });

  // If alert priority or referral status filters are active, narrow to matching mothers when appropriate
  const scopedMotherIds = new Set(scopedMothers.map((m) => m.id));

  // 2. Filter Alerts
  const filteredAlerts = data.alerts.filter((a) => {
    if (!isWithinDateFilter(a.timestamp || a.submittedAtIso, cutoff, customStartMs, customEndMs)) {
      return false;
    }
    if (filters.alertPriority !== 'all' && a.severity !== filters.alertPriority) {
      return false;
    }
    if (filters.facilityId !== 'all') {
      if (!matchesFacility(filters.facilityId, [a.facilityId, a.facilityName, a.block])) {
        return false;
      }
    }
    if (filters.healthWorkerId !== 'all') {
      const hwMatch =
        a.assignedHealthWorkerId === filters.healthWorkerId ||
        a.reportedByUserId === filters.healthWorkerId ||
        (selectedWorker && a.assignedHealthWorkerName === selectedWorker.name);
      if (!hwMatch) return false;
    }
    if (filters.trimester !== 'all' && !scopedMotherIds.has(a.motherId)) {
      return false;
    }
    return true;
  });

  // 3. Filter Referrals
  const filteredReferrals = data.referrals.filter((r) => {
    if (!isWithinDateFilter(r.referralDate, cutoff, customStartMs, customEndMs)) {
      return false;
    }
    if (filters.referralStatus !== 'all' && r.status !== filters.referralStatus) {
      return false;
    }
    if (filters.facilityId !== 'all') {
      if (!matchesFacility(filters.facilityId, [r.destinationHospital, r.sourceFacility])) {
        return false;
      }
    }
    if (filters.healthWorkerId !== 'all') {
      const inMotherScope = scopedMotherIds.has(r.motherId);
      const contactMatch = selectedWorker && r.sourceContact.includes(selectedWorker.name);
      if (!inMotherScope && !contactMatch) return false;
    }
    if (filters.trimester !== 'all' && !scopedMotherIds.has(r.motherId)) {
      return false;
    }
    return true;
  });

  // Narrow scopedMothers further ONLY if user explicitly filtered by alertPriority or referralStatus
  if (filters.alertPriority !== 'all') {
    const alertMotherIds = new Set(filteredAlerts.map((a) => a.motherId));
    scopedMothers = scopedMothers.filter((m) => alertMotherIds.has(m.id));
  }
  if (filters.referralStatus !== 'all') {
    const refMotherIds = new Set(filteredReferrals.map((r) => r.motherId));
    scopedMothers = scopedMothers.filter((m) => refMotherIds.has(m.id));
  }

  const finalMotherIds = new Set(scopedMothers.map((m) => m.id));
  const motherCohortFiltered =
    filters.trimester !== 'all' ||
    filters.healthWorkerId !== 'all' ||
    filters.alertPriority !== 'all' ||
    filters.referralStatus !== 'all' ||
    filters.facilityId !== 'all';

  // 4. Filter Assessments
  const filteredAssessments = data.assessments.filter((a) => {
    if (!isWithinDateFilter(a.date, cutoff, customStartMs, customEndMs)) return false;
    if (filters.facilityId !== 'all') {
      const facHit = matchesFacility(filters.facilityId, [a.facilityOrLocation]);
      if (!facHit && !finalMotherIds.has(a.motherId)) return false;
    }
    if (filters.healthWorkerId !== 'all') {
      const workerMatch = selectedWorker && a.assessorName === selectedWorker.name;
      if (!workerMatch && !finalMotherIds.has(a.motherId)) return false;
    }
    if (motherCohortFiltered && a.motherId && !finalMotherIds.has(a.motherId)) {
      return false;
    }
    return true;
  });

  // 5. Filter Appointments
  const filteredAppointments = data.appointments.filter((ap) => {
    if (!isWithinDateFilter(ap.scheduledDate, cutoff, customStartMs, customEndMs)) return false;
    if (motherCohortFiltered && ap.motherId && !finalMotherIds.has(ap.motherId)) {
      return false;
    }
    return true;
  });

  const datedMothers = scopedMothers.filter((m) =>
    isWithinDateFilter(m.registeredDate, cutoff, customStartMs, customEndMs)
  );

  // =========================================================================
  // Hospital Overview Metrics (All 9 required indicators from actual records)
  // =========================================================================
  const activeMothers = scopedMothers.filter((m) => m.pregnancyStatus === 'Active Pregnancy');
  const t1 = activeMothers.filter((m) => m.trimester === 1).length;
  const t2 = activeMothers.filter((m) => m.trimester === 2).length;
  const t3 = activeMothers.filter((m) => m.trimester === 3).length;
  const tTotal = activeMothers.length || 1;

  const upcomingApptMotherIds = new Set(
    filteredAppointments
      .filter((ap) => ap.status === 'Upcoming' || ap.status === 'Follow-up Due')
      .map((ap) => ap.motherId)
      .filter(Boolean)
  );

  const mothersWithoutAssessment = activeMothers.filter(
    (m) =>
      !m.latestAssessmentDate ||
      m.latestAssessmentDate === '—' ||
      !data.assessments.some((a) => a.motherId === m.id)
  ).length;

  const assessmentsPendingReview = filteredAssessments.filter(
    (a) =>
      a.recommendations.toLowerCase().includes('pending') ||
      a.summary.toLowerCase().includes('pending review')
  ).length;

  const openAlerts = filteredAlerts.filter((a) => isActiveAlertStatus(a.status));
  const criticalOpenAlerts = openAlerts.filter((a) => a.severity === 'Critical').length;
  const highPriorityCases = scopedMothers.filter(
    (m) => m.riskLevel === 'High Priority' || m.riskLevel === 'Critical'
  ).length;
  const pendingReferrals = filteredReferrals.filter(
    (r) => r.status === 'Pending' || r.status === 'In Transit'
  ).length;
  const completedFollowUps = filteredAppointments.filter((a) => a.status === 'Completed').length;

  const overview: OverviewMetricsSummary = {
    totalRegisteredMothers: scopedMothers.length,
    activePregnancies: activeMothers.length,
    mothersWithUpcomingAppointments: upcomingApptMotherIds.size,
    pendingAssessments: mothersWithoutAssessment + assessmentsPendingReview,
    mothersWithoutAssessment,
    assessmentsPendingReview,
    openEmergencyAlerts: openAlerts.length,
    criticalOpenAlerts,
    highPriorityCases,
    pendingReferrals,
    completedFollowUps,
  };

  // =========================================================================
  // Gestational Age Distribution (actual gestationalWeeks on active mothers)
  // =========================================================================
  const gaBands: { band: string; trimester: string; min: number; max: number }[] = [
    { band: '1–12w', trimester: 'T1', min: 1, max: 12 },
    { band: '13–20w', trimester: 'Early T2', min: 13, max: 20 },
    { band: '21–27w', trimester: 'Late T2', min: 21, max: 27 },
    { band: '28–34w', trimester: 'Early T3', min: 28, max: 34 },
    { band: '35–42w', trimester: 'Term', min: 35, max: 45 },
  ];

  const unrecordedGestationCount = activeMothers.filter(
    (m) => !m.gestationalWeeks || m.gestationalWeeks <= 0
  ).length;

  const gestationalAgeDistribution: GestationalAgeBucket[] = gaBands.map((b) => ({
    band: b.band,
    trimester: b.trimester,
    count: activeMothers.filter(
      (m) => m.gestationalWeeks >= b.min && m.gestationalWeeks <= b.max
    ).length,
  }));

  // =========================================================================
  // Chronological Period Buckets (sorted ascending by real timestamp)
  // =========================================================================
  const periodMap = new Map<string, number>();
  const addPeriod = (dateStr: string) => {
    const b = bucketKey(dateStr, filters.dateRange);
    if (b.key === 'Undated') return;
    if (!periodMap.has(b.key) || b.sortMs < (periodMap.get(b.key) ?? Infinity)) {
      periodMap.set(b.key, b.sortMs);
    }
  };
  datedMothers.forEach((m) => addPeriod(m.registeredDate));
  filteredAssessments.forEach((a) => addPeriod(a.date));
  filteredReferrals.forEach((r) => addPeriod(r.referralDate));
  filteredAlerts.forEach((a) => addPeriod(a.timestamp || a.submittedAtIso));

  const periods = Array.from(periodMap.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([k]) => k)
    .slice(-10);

  const registrationTrends = periods.map((period) => ({
    period,
    registrations: datedMothers.filter((m) => bucketKey(m.registeredDate, filters.dateRange).key === period)
      .length,
    assessments: filteredAssessments.filter((a) => bucketKey(a.date, filters.dateRange).key === period)
      .length,
  }));

  // =========================================================================
  // Blood Pressure & Blood Sugar Trends (strictly where actual records exist)
  // =========================================================================
  const bpByDate = new Map<string, { sortMs: number; sys: number[]; dia: number[] }>();
  const glucoseByDate = new Map<string, { sortMs: number; values: number[] }>();
  let totalBpReadings = 0;
  let totalBloodSugarReadings = 0;

  scopedMothers.forEach((m) => {
    m.vitalsHistory.forEach((v) => {
      if (!isWithinDateFilter(v.date, cutoff, customStartMs, customEndMs)) return;
      const ms = parseDateMs(v.date) ?? 0;
      const dateLabel = v.date.slice(0, 10);

      if (v.systolicBp > 0 && v.diastolicBp > 0) {
        totalBpReadings += 1;
        const curr = bpByDate.get(dateLabel) ?? { sortMs: ms, sys: [], dia: [] };
        curr.sys.push(v.systolicBp);
        curr.dia.push(v.diastolicBp);
        bpByDate.set(dateLabel, curr);
      }

      if (typeof v.bloodGlucose === 'number' && v.bloodGlucose > 0) {
        totalBloodSugarReadings += 1;
        const curr = glucoseByDate.get(dateLabel) ?? { sortMs: ms, values: [] };
        curr.values.push(v.bloodGlucose);
        glucoseByDate.set(dateLabel, curr);
      }
    });
  });

  const bloodPressureTrends: BloodPressureTrendPoint[] = Array.from(bpByDate.entries())
    .sort((a, b) => a[1].sortMs - b[1].sortMs)
    .map(([date, entry]) => ({
      date,
      avgSystolic: Math.round(entry.sys.reduce((s, x) => s + x, 0) / entry.sys.length),
      avgDiastolic: Math.round(entry.dia.reduce((s, x) => s + x, 0) / entry.dia.length),
      maxSystolic: Math.max(...entry.sys),
      minDiastolic: Math.min(...entry.dia),
      readingCount: entry.sys.length,
    }));

  const bloodSugarTrends: BloodSugarTrendPoint[] = Array.from(glucoseByDate.entries())
    .sort((a, b) => a[1].sortMs - b[1].sortMs)
    .map(([date, entry]) => ({
      date,
      avgGlucose: Math.round(entry.values.reduce((s, x) => s + x, 0) / entry.values.length),
      maxGlucose: Math.max(...entry.values),
      minGlucose: Math.min(...entry.values),
      readingCount: entry.values.length,
    }));

  // =========================================================================
  // Maternal Symptom History (from actual symptomLogs + alert symptoms)
  // =========================================================================
  const symptomStats = new Map<
    string,
    { occurrences: number; severeCount: number; motherIds: Set<string> }
  >();
  let totalSymptomEntries = 0;

  const recordSymptom = (rawLabel: string, motherId: string, isSevere: boolean) => {
    const cleaned = rawLabel.trim();
    if (!cleaned || cleaned.toLowerCase() === 'none') return;
    totalSymptomEntries += 1;
    const key = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    const curr = symptomStats.get(key) ?? {
      occurrences: 0,
      severeCount: 0,
      motherIds: new Set<string>(),
    };
    curr.occurrences += 1;
    if (isSevere) curr.severeCount += 1;
    if (motherId) curr.motherIds.add(motherId);
    symptomStats.set(key, curr);
  };

  scopedMothers.forEach((m) => {
    m.symptomLogs.forEach((log) => {
      if (!isWithinDateFilter(log.date, cutoff, customStartMs, customEndMs)) return;
      log.symptoms.forEach((s) => recordSymptom(s, m.id, log.severity === 'Severe'));
    });
  });

  filteredAlerts.forEach((al) => {
    al.symptoms.forEach((s) =>
      recordSymptom(s, al.motherId, al.severity === 'Critical' || al.severity === 'High Priority')
    );
  });

  const symptomHistory: SymptomFrequencyPoint[] = Array.from(symptomStats.entries())
    .map(([symptom, st]) => ({
      symptom,
      occurrences: st.occurrences,
      severeCount: st.severeCount,
      mothersAffected: st.motherIds.size,
    }))
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 8);

  // =========================================================================
  // High-Priority Risk Factors (from existing approved mother risk flags only)
  // =========================================================================
  const riskFactorCounts = new Map<string, number>();
  scopedMothers
    .filter((m) => m.riskLevel === 'High Priority' || m.riskLevel === 'Critical')
    .forEach((m) => {
      if (m.riskFactors.length > 0) {
        m.riskFactors.forEach((rf) => {
          riskFactorCounts.set(rf, (riskFactorCounts.get(rf) ?? 0) + 1);
        });
      } else {
        const label = `${m.riskLevel} (No specific factor recorded)`;
        riskFactorCounts.set(label, (riskFactorCounts.get(label) ?? 0) + 1);
      }
    });

  const highPriorityDistribution = Array.from(riskFactorCounts.entries())
    .map(([condition, cases]) => ({ condition, cases }))
    .sort((a, b) => b.cases - a.cases)
    .slice(0, 6);

  // =========================================================================
  // Assessment Frequency & Approved Risk-Assessment Ledger
  // =========================================================================
  const assessmentTrends = periods
    .map((period) => {
      const inPeriod = filteredAssessments.filter(
        (a) => bucketKey(a.date, filters.dateRange).key === period
      );
      return {
        period,
        total: inPeriod.length,
        routine: inPeriod.filter(
          (a) => a.riskClassification === 'Routine' || a.riskClassification === 'Moderate'
        ).length,
        highRisk: inPeriod.filter((a) => a.riskClassification === 'High Priority').length,
        emergency: inPeriod.filter(
          (a) => a.riskClassification === 'Critical' || a.assessmentType === 'Emergency Triage'
        ).length,
      };
    })
    .filter((p) => p.total > 0);

  const approvedRiskAssessments: ApprovedRiskAssessmentRow[] = [...filteredAssessments]
    .sort((a, b) => (parseDateMs(b.date) ?? 0) - (parseDateMs(a.date) ?? 0))
    .map((a) => ({
      id: a.id,
      motherId: a.motherId,
      motherName: a.motherName,
      date: a.date,
      assessmentType: a.assessmentType,
      riskClassification: a.riskClassification,
      assessorName: a.assessorName,
      assessorRole: a.assessorRole,
      facilityOrLocation: a.facilityOrLocation,
      bpReading: a.bpReading,
      summary: a.summary,
    }));

  // =========================================================================
  // Referral Completion Rates & Trends
  // =========================================================================
  const referralTrends = periods
    .map((period) => {
      const inPeriod = filteredReferrals.filter(
        (r) => bucketKey(r.referralDate, filters.dateRange).key === period
      );
      return {
        period,
        inbound: inPeriod.length,
        admitted: inPeriod.filter((r) => r.status === 'Admitted' || r.status === 'Accepted').length,
        completed: inPeriod.filter((r) => r.status === 'Completed').length,
      };
    })
    .filter((p) => p.inbound > 0);

  const referralStatuses: ReferralStatus[] = [
    'Completed',
    'Admitted',
    'Accepted',
    'In Transit',
    'Pending',
    'Declined',
  ];
  const refCompleted = filteredReferrals.filter((r) => r.status === 'Completed').length;
  const refAdmitted = filteredReferrals.filter(
    (r) => r.status === 'Admitted' || r.status === 'Accepted'
  ).length;
  const refPending = filteredReferrals.filter(
    (r) => r.status === 'Pending' || r.status === 'In Transit'
  ).length;
  const refDeclined = filteredReferrals.filter((r) => r.status === 'Declined').length;

  const referralSummary = {
    total: filteredReferrals.length,
    completed: refCompleted,
    admittedOrAccepted: refAdmitted,
    pendingOrTransit: refPending,
    declined: refDeclined,
    completionRatePct:
      filteredReferrals.length > 0
        ? Math.round((refCompleted / filteredReferrals.length) * 100)
        : null,
    byStatus: referralStatuses.map((status) => ({
      status,
      count: filteredReferrals.filter((r) => r.status === status).length,
    })),
  };

  // =========================================================================
  // Appointment Attendance
  // =========================================================================
  const completedCount = filteredAppointments.filter((a) => a.status === 'Completed').length;
  const upcomingCount = filteredAppointments.filter(
    (a) => a.status === 'Upcoming' || a.status === 'Follow-up Due'
  ).length;
  const rescheduledCount = filteredAppointments.filter((a) => a.status === 'Rescheduled').length;
  const missedCount = filteredAppointments.filter((a) => a.status === 'Missed').length;
  const decidedAppointments = completedCount + missedCount;
  const appointmentAttendanceRatePct =
    decidedAppointments > 0 ? Math.round((completedCount / decidedAppointments) * 100) : null;

  const appointmentCompletion = [
    { status: 'Completed', count: completedCount },
    { status: 'Upcoming / Due', count: upcomingCount },
    { status: 'Rescheduled', count: rescheduledCount },
    { status: 'Missed', count: missedCount },
  ];

  // =========================================================================
  // Emergency Alert Trends (by Priority + Median Response Time where recorded)
  // =========================================================================
  const alertResponseTrends: AlertTrendPoint[] = periods
    .map((period) => {
      const inPeriod = filteredAlerts.filter(
        (a) => bucketKey(a.timestamp || a.submittedAtIso, filters.dateRange).key === period
      );
      const responseTimes = inPeriod
        .map((a) => a.responseTimeMinutes)
        .filter((n): n is number => typeof n === 'number' && !Number.isNaN(n) && n > 0)
        .sort((a, b) => a - b);
      const medianMinutes =
        responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length / 2)] : null;
      return {
        period,
        alerts: inPeriod.length,
        critical: inPeriod.filter((a) => a.severity === 'Critical').length,
        highPriority: inPeriod.filter((a) => a.severity === 'High Priority').length,
        moderate: inPeriod.filter((a) => a.severity === 'Moderate').length,
        low: inPeriod.filter((a) => a.severity === 'Low').length,
        medianMinutes,
      };
    })
    .filter((p) => p.alerts > 0);

  // =========================================================================
  // Health Worker Analytics (Factual workload & activity — never medical scoring)
  // =========================================================================
  const scopedWorkers = allWorkers.filter((hw) => {
    if (filters.healthWorkerId !== 'all' && hw.id !== filters.healthWorkerId) return false;
    if (
      filters.facilityId !== 'all' &&
      !matchesFacility(filters.facilityId, [hw.block, hw.subCentre, hw.catchmentArea])
    ) {
      const hasScopedMothers = scopedMothers.some((m) => m.assignedHealthWorkerId === hw.id);
      if (!hasScopedMothers) return false;
    }
    return true;
  });

  const healthWorkerAnalytics: HealthWorkerAnalyticsRow[] = scopedWorkers.map((hw) => {
    const hwMothers = scopedMothers.filter(
      (m) => m.assignedHealthWorkerId === hw.id || m.assignedHealthWorkerName === hw.name
    );
    const hwMotherIds = new Set(hwMothers.map((m) => m.id));
    const hwAssessments = filteredAssessments.filter(
      (a) => a.assessorName === hw.name || hwMotherIds.has(a.motherId)
    );
    const hwReferrals = filteredReferrals.filter(
      (r) => r.sourceContact.includes(hw.name) || hwMotherIds.has(r.motherId)
    );
    const hwAppointments = filteredAppointments.filter((ap) => hwMotherIds.has(ap.motherId));
    const hwPendingFollowUps = hwAppointments.filter(
      (ap) => ap.status === 'Upcoming' || ap.status === 'Follow-up Due'
    ).length;
    const hwCompletedFollowUps = hwAppointments.filter((ap) => ap.status === 'Completed').length;
    const hwAlerts = filteredAlerts.filter(
      (al) =>
        al.assignedHealthWorkerId === hw.id ||
        al.reportedByUserId === hw.id ||
        al.assignedHealthWorkerName === hw.name
    );

    // Combine factual recent activity from worker record & linked submissions
    const combinedActivities: HealthWorkerAnalyticsRow['recentActivities'] = [
      ...hw.activities.map((act) => ({
        id: act.id,
        timestamp: act.timestamp,
        action: act.action,
        motherName: act.motherName,
        details: act.details,
      })),
    ];

    if (combinedActivities.length === 0) {
      hwAssessments.slice(0, 3).forEach((a) => {
        combinedActivities.push({
          id: `act-asm-${a.id}`,
          timestamp: a.date,
          action: `${a.assessmentType} submitted`,
          motherName: a.motherName,
          details: a.summary,
        });
      });
      hwAlerts.slice(0, 2).forEach((al) => {
        combinedActivities.push({
          id: `act-alt-${al.id}`,
          timestamp: al.timestamp,
          action: `Emergency alert (${al.severity})`,
          motherName: al.motherName,
          details: al.triggerTitle,
        });
      });
    }

    return {
      id: hw.id,
      name: hw.name,
      regionalName: hw.regionalName,
      cadre: hw.cadre,
      block: hw.block,
      subCentre: hw.subCentre,
      status: hw.status,
      lastActiveDate: hw.lastActiveDate,
      assignedMothersCount: hwMothers.length,
      assessmentsSubmitted: hwAssessments.length,
      referralsRaised: hwReferrals.length,
      pendingFollowUps: hwPendingFollowUps,
      completedFollowUps: hwCompletedFollowUps,
      emergencyAlertsSubmitted: hwAlerts.length,
      recentActivities: combinedActivities.slice(0, 5),
    };
  });

  return {
    scaleLabel,
    totalAccessibleMothers: scopedMothers.length,
    activePregnancies: activeMothers.length,
    overview,
    filteredMothers: scopedMothers,
    filteredAssessments,
    filteredReferrals,
    filteredAppointments,
    filteredAlerts,
    trimesterDistribution: [
      {
        name: 'First Trimester (1–12w)',
        shortName: 'Trimester 1',
        count: t1,
        share: activeMothers.length ? Math.round((t1 / tTotal) * 100) : 0,
      },
      {
        name: 'Second Trimester (13–27w)',
        shortName: 'Trimester 2',
        count: t2,
        share: activeMothers.length ? Math.round((t2 / tTotal) * 100) : 0,
      },
      {
        name: 'Third Trimester (28–40w)',
        shortName: 'Trimester 3',
        count: t3,
        share: activeMothers.length ? Math.round((t3 / tTotal) * 100) : 0,
      },
    ],
    gestationalAgeDistribution,
    unrecordedGestationCount,
    registrationTrends,
    highPriorityDistribution,
    bloodPressureTrends,
    totalBpReadings,
    bloodSugarTrends,
    totalBloodSugarReadings,
    symptomHistory,
    totalSymptomEntries,
    assessmentTrends,
    referralTrends,
    referralSummary,
    appointmentCompletion,
    appointmentAttendanceRatePct,
    alertResponseTrends,
    approvedRiskAssessments,
    healthWorkerAnalytics,
  };
}

/**
 * Builds a unified Mother-Level Chronological Health Timeline merging all 9 domains:
 * Pregnancy milestones, Health updates, Assessments, Report submissions, Symptoms,
 * Alerts, Referrals, Hospital responses, and Follow-up history.
 */
export function buildMotherChronologicalTimeline(params: {
  mother: MotherRecord;
  assessments: AssessmentRecord[];
  alerts: EmergencyAlert[];
  referrals: ReferralRecord[];
  appointments: AppointmentRecord[];
}): MotherTimelineEvent[] {
  const { mother, assessments, alerts, referrals, appointments } = params;
  const events: MotherTimelineEvent[] = [];

  // 1. Pregnancy Milestones
  mother.milestones.forEach((ms, idx) => {
    events.push({
      id: `ms-${idx}-${ms.week}`,
      category: 'milestone',
      categoryLabel: 'Pregnancy Milestone',
      date: ms.date,
      sortMs: parseDateMs(ms.date) ?? 0,
      title: `Week ${ms.week} · ${ms.label}`,
      summary: ms.note,
      source: 'Maternal Pregnancy Progression',
      statusLabel: ms.status,
      tone: ms.status === 'Current' ? 'cherry' : ms.status === 'Completed' ? 'positive' : 'neutral',
    });
  });

  // 2. Health Updates / Vitals Records
  mother.vitalsHistory.forEach((v) => {
    const metricParts: string[] = [];
    if (v.systolicBp > 0 && v.diastolicBp > 0) metricParts.push(`BP ${v.systolicBp}/${v.diastolicBp} mmHg`);
    if (v.hemoglobin > 0) metricParts.push(`Hb ${v.hemoglobin} g/dL`);
    if (v.bloodGlucose && v.bloodGlucose > 0) metricParts.push(`Glucose ${v.bloodGlucose} mg/dL`);
    if (v.pulse > 0) metricParts.push(`Pulse ${v.pulse} bpm`);
    if (v.fetalHeartRate && v.fetalHeartRate > 0) metricParts.push(`FHR ${v.fetalHeartRate} bpm`);
    if (v.weightKg > 0) metricParts.push(`Weight ${v.weightKg} kg`);

    events.push({
      id: `vital-${v.id}`,
      category: 'health-update',
      categoryLabel: 'Health Update',
      date: v.date,
      sortMs: parseDateMs(v.date) ?? 0,
      title: `Recorded Vitals Check (${v.source})`,
      summary: metricParts.length > 0 ? metricParts.join(' · ') : 'Health update logged without numeric vitals.',
      source: `${v.recordedBy} · ${v.source}`,
      metrics: metricParts.join(' · '),
      tone: 'neutral',
    });
  });

  // 3. Assessments (existing approved assessment results with source & date)
  assessments.forEach((asm) => {
    events.push({
      id: `asm-${asm.id}`,
      category: 'assessment',
      categoryLabel: 'Assessment',
      date: asm.date,
      sortMs: parseDateMs(asm.date) ?? 0,
      title: `${asm.assessmentType} (${asm.id})`,
      summary: `${asm.summary}${asm.recommendations ? ` Plan: ${asm.recommendations}` : ''}`,
      source: `${asm.assessorName} (${asm.assessorRole}, ${asm.facilityOrLocation})`,
      statusLabel: `Recorded Assessment: ${asm.riskClassification}`,
      metrics: `BP ${asm.bpReading}${asm.hemoglobin ? ` · Hb ${asm.hemoglobin} g/dL` : ''}`,
      tone:
        asm.riskClassification === 'Critical'
          ? 'critical'
          : asm.riskClassification === 'High Priority'
          ? 'high'
          : asm.riskClassification === 'Moderate'
          ? 'moderate'
          : 'positive',
    });
  });

  // 4. Report Submissions (respecting patient consent authorization)
  mother.documents.forEach((doc) => {
    events.push({
      id: `doc-${doc.id}`,
      category: 'report',
      categoryLabel: 'Report Submission',
      date: doc.date,
      sortMs: parseDateMs(doc.date) ?? 0,
      title: doc.title,
      summary: doc.authorized
        ? doc.summary
        : doc.authorizationNote || 'Patient consent authorization required to view document details.',
      source: `${doc.uploadedBy} · ${doc.category}`,
      statusLabel: doc.authorized ? 'Authorized' : 'Access Restricted',
      tone: doc.authorized ? 'positive' : 'neutral',
      restricted: !doc.authorized,
    });
  });

  // 5. Symptoms
  mother.symptomLogs.forEach((log) => {
    events.push({
      id: `sym-${log.id}`,
      category: 'symptom',
      categoryLabel: 'Symptom Log',
      date: log.date,
      sortMs: parseDateMs(log.date) ?? 0,
      title: log.symptoms.join(', '),
      summary: log.notes || 'Recorded via JanmaSaathi daily check-in.',
      source: log.reportedVia,
      statusLabel: log.severity,
      tone: log.severity === 'Severe' ? 'critical' : log.severity === 'Moderate' ? 'moderate' : 'neutral',
    });
  });

  // 6 & 8. Alerts + Hospital Responses
  alerts.forEach((al) => {
    events.push({
      id: `alert-${al.id}`,
      category: 'alert',
      categoryLabel: 'Emergency Alert',
      date: al.timestamp,
      sortMs: parseDateMs(al.submittedAtIso || al.timestamp) ?? 0,
      title: `${al.triggerTitle} (${al.id})`,
      summary: al.symptomDescription,
      source: `${al.reportedByName} · ${SOURCE_ROLE_LABELS[al.sourceRole]}`,
      statusLabel: `${al.severity} · ${al.status}`,
      metrics: al.vitalsSnapshot.bp !== '—' ? `BP ${al.vitalsSnapshot.bp}` : undefined,
      tone:
        al.severity === 'Critical'
          ? 'critical'
          : al.severity === 'High Priority'
          ? 'high'
          : al.severity === 'Moderate'
          ? 'moderate'
          : 'neutral',
      linkedId: al.id,
      linkedSection: 'alerts',
    });

    // Hospital response entries from alert responseHistory (excluding the initial submission)
    al.responseHistory
      .filter((entry) => entry.action !== 'Alert Submitted')
      .forEach((entry) => {
        events.push({
          id: `hresp-${al.id}-${entry.id}`,
          category: 'hospital-response',
          categoryLabel: 'Hospital Response',
          date: entry.timestamp,
          sortMs: parseDateMs(entry.timestamp) ?? 0,
          title: `${entry.action} (${al.id})`,
          summary: entry.note,
          source: `${entry.actor} (${entry.role})`,
          statusLabel: entry.nextStatus || al.status,
          tone: entry.nextStatus === 'RESOLVED' || entry.nextStatus === 'CLOSED' ? 'positive' : 'cherry',
          linkedId: al.id,
          linkedSection: 'alerts',
        });
      });
  });

  // 7. Referrals
  referrals.forEach((ref) => {
    events.push({
      id: `ref-${ref.id}`,
      category: 'referral',
      categoryLabel: 'Referral',
      date: ref.referralDate,
      sortMs: parseDateMs(ref.referralDate) ?? 0,
      title: `${ref.reason} (${ref.id})`,
      summary: `${ref.sourceFacility} → ${ref.destinationHospital} (${ref.destinationDepartment}). ${ref.clinicalSummary}`,
      source: `${ref.sourceContact} · Assigned: ${ref.assignedDoctor}`,
      statusLabel: ref.status,
      tone:
        ref.status === 'Completed' || ref.status === 'Admitted'
          ? 'positive'
          : ref.status === 'Declined'
          ? 'critical'
          : 'cherry',
      linkedId: ref.id,
      linkedSection: 'referrals',
    });
  });

  // 9. Follow-up History / Appointments
  appointments.forEach((apt) => {
    events.push({
      id: `apt-${apt.id}`,
      category: 'follow-up',
      categoryLabel: 'Follow-up & Appointment',
      date: `${apt.scheduledDate}${apt.scheduledTime && apt.scheduledTime !== '—' ? ` ${apt.scheduledTime}` : ''}`,
      sortMs: parseDateMs(apt.scheduledDate) ?? 0,
      title: `${apt.appointmentType} (${apt.department})`,
      summary: apt.notes || 'Scheduled hospital antenatal follow-up.',
      source: apt.clinician,
      statusLabel: apt.status,
      tone:
        apt.status === 'Completed'
          ? 'positive'
          : apt.status === 'Missed'
          ? 'critical'
          : apt.status === 'Follow-up Due'
          ? 'high'
          : 'neutral',
    });
  });

  return events.sort((a, b) => b.sortMs - a.sortMs);
}
