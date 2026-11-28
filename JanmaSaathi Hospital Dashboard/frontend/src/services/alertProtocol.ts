import type {
  AlertCategory,
  AlertPriority,
  AlertSourceRole,
  AlertStatus,
  EmergencyAlert,
  HospitalStaffMember,
} from '../types/hospital.ts';
import { normalizeUserRole } from './rbacPolicy.ts';

export const ALERT_WORKFLOW_STATUSES: AlertStatus[] = [
  'NEW',
  'ACKNOWLEDGED',
  'IN PROGRESS',
  'REFERRED / ACTION TAKEN',
  'RESOLVED',
  'CLOSED',
];

export const ALERT_PRIORITIES: AlertPriority[] = [
  'Critical',
  'High Priority',
  'Moderate',
  'Low',
];

export const ALERT_CATEGORIES: AlertCategory[] = [
  'Obstetric Emergency',
  'Hypertensive / Pre-Eclampsia',
  'Hemorrhage / Bleeding',
  'Fetal Distress',
  'Severe Anemia / Weakness',
  'Infection / Sepsis',
  'Transport / Referral Urgency',
  'Other Clinical Escalation',
];

export const SOURCE_ROLE_LABELS: Record<AlertSourceRole, string> = {
  mother: 'Mother',
  health_worker: 'Health Worker',
  supervisor: 'Supervisor',
};

export const HOSPITAL_STAFF_ROSTER: HospitalStaffMember[] = [
  {
    id: 'STAFF-DH-01',
    name: 'Dr. Ananya Mohanty',
    role: 'Senior OB-GYN Medical Officer',
    department: 'Obstetrics & Gynecology',
    facilityId: 'HOSP-KHORDHA-DH',
    shift: 'Emergency Duty Desk',
  },
  {
    id: 'STAFF-DH-02',
    name: 'Dr. Debasis Tripathy',
    role: 'Medical Officer — Emergency Triage',
    department: 'Emergency Obstetric Care (EmOC)',
    facilityId: 'HOSP-KHORDHA-DH',
    shift: '24x7 Triage Rotation',
  },
  {
    id: 'STAFF-DH-03',
    name: 'Sister Kabita Swain',
    role: 'Labour Room Senior Staff Nurse',
    department: 'Labour & Delivery Ward',
    facilityId: 'HOSP-KHORDHA-DH',
    shift: 'Day / Evening Shift',
  },
  {
    id: 'STAFF-SUP-01',
    name: 'Dr. Rajesh Kumar',
    role: 'Block Maternal Health Supervisor',
    department: 'Maternal Health Supervision',
    facilityId: 'HOSP-KHORDHA-DH',
    shift: 'District Coordination',
  },
];

/**
 * Only authorized hospital clinical/triage staff and supervisors may acknowledge,
 * assign, update workflow status, resolve, or close emergency alerts.
 * Mother, community Health Worker, and unrecognized/unverified roles are strictly denied (fail-closed).
 */
export function canRoleManageAlerts(role: string | undefined | null): boolean {
  const normalized = normalizeUserRole(role);
  return normalized === 'hospital_staff' || normalized === 'supervisor';
}

export function isActiveAlertStatus(status: AlertStatus): boolean {
  return status !== 'RESOLVED' && status !== 'CLOSED';
}

export function normalizeWorkflowAlertStatus(raw: string | undefined | null): AlertStatus {
  const s = (raw ?? '').trim().toUpperCase();
  if (s === 'NEW' || s === 'OPEN' || s === 'PENDING') return 'NEW';
  if (s === 'ACKNOWLEDGED' || s === 'ACK') return 'ACKNOWLEDGED';
  if (s === 'IN PROGRESS' || s === 'IN_PROGRESS' || s === 'UNDER REVIEW' || s === 'TRIAGING') {
    return 'IN PROGRESS';
  }
  if (
    s === 'REFERRED / ACTION TAKEN' ||
    s === 'REFERRED' ||
    s === 'ACTION TAKEN' ||
    s === 'ESCALATED'
  ) {
    return 'REFERRED / ACTION TAKEN';
  }
  if (s === 'RESOLVED') return 'RESOLVED';
  if (s === 'CLOSED') return 'CLOSED';
  return 'NEW';
}

export function normalizeAlertPriority(raw: string | undefined | null): AlertPriority {
  const s = (raw ?? '').trim().toLowerCase();
  if (s.includes('crit') || s.includes('emerg') || s === 'p1') return 'Critical';
  if (s.includes('high') || s.includes('urg') || s === 'p2') return 'High Priority';
  if (s.includes('mod') || s.includes('med') || s === 'p3') return 'Moderate';
  if (s.includes('low') || s.includes('rout') || s === 'p4') return 'Low';
  return 'High Priority';
}

export interface TransitionValidationInput {
  currentStatus: AlertStatus;
  nextStatus: AlertStatus;
  priority: AlertPriority;
  actorRole: string;
  resolutionSummary?: string;
  isAutomated?: boolean;
}

export interface TransitionValidationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Enforces JanmaSaathi emergency alert clinical safety & integrity rules:
 * 1. Unauthorized roles cannot alter alert status.
 * 2. Critical alerts can NEVER be automatically closed or skip RESOLVED.
 * 3. No alert can be marked RESOLVED without an authorized resolution summary.
 * 4. CLOSED requires the alert to be RESOLVED first (with a resolution summary).
 * 5. Direct jumps from NEW to RESOLVED or CLOSED are blocked; an alert must be acknowledged/reviewed first.
 */
export function validateAlertTransition(
  input: TransitionValidationInput
): TransitionValidationResult {
  const { currentStatus, nextStatus, priority, actorRole, resolutionSummary, isAutomated } = input;

  if (!canRoleManageAlerts(actorRole)) {
    return {
      allowed: false,
      reason: `Unauthorized status change blocked: role "${actorRole}" is not authorized to change hospital alert triage status.`,
    };
  }

  if (isAutomated && priority === 'Critical' && (nextStatus === 'CLOSED' || nextStatus === 'RESOLVED')) {
    return {
      allowed: false,
      reason: 'Safety policy violation: Critical alerts can never be automatically resolved or closed.',
    };
  }

  if (currentStatus === 'CLOSED' && nextStatus === 'CLOSED') {
    return { allowed: false, reason: 'This alert is already closed.' };
  }

  if (currentStatus === 'NEW' && (nextStatus === 'RESOLVED' || nextStatus === 'CLOSED')) {
    return {
      allowed: false,
      reason: 'An alert must be ACKNOWLEDGED and triaged before it can be marked RESOLVED or CLOSED.',
    };
  }

  if (nextStatus === 'RESOLVED' && (!resolutionSummary || resolutionSummary.trim().length < 8)) {
    return {
      allowed: false,
      reason:
        'An explicit clinical resolution summary (at least 8 characters) from authorized hospital personnel is required before marking an alert RESOLVED.',
    };
  }

  if (nextStatus === 'CLOSED') {
    if (currentStatus !== 'RESOLVED') {
      return {
        allowed: false,
        reason:
          priority === 'Critical'
            ? 'Safety rule: Critical alerts must be explicitly RESOLVED with clinical documentation before they can be CLOSED.'
            : 'Alerts must reach RESOLVED status with a documented resolution summary before being CLOSED.',
      };
    }
    if (!resolutionSummary || resolutionSummary.trim().length < 8) {
      return {
        allowed: false,
        reason: 'A documented resolution summary is required to close an alert.',
      };
    }
  }

  return { allowed: true };
}

/**
 * Detects an active alert for the same motherId so duplicate submissions are NEVER
 * silently discarded — instead they are preserved and linked to the active alert.
 */
export function findActiveDuplicateAlert(
  existingAlerts: EmergencyAlert[],
  motherId: string,
  alertCategory?: AlertCategory
): EmergencyAlert | null {
  if (!motherId) return null;
  const activeForMother = existingAlerts.filter(
    (a) => a.motherId === motherId && a.status !== 'CLOSED'
  );
  if (activeForMother.length === 0) return null;
  if (alertCategory) {
    const exactCat = activeForMother.find((a) => a.alertCategory === alertCategory);
    if (exactCat) return exactCat;
  }
  return activeForMother[0];
}

export function formatReturnCommunicationMessage(params: {
  alertId: string;
  status: AlertStatus;
  actorName: string;
  facilityName: string;
  assignedStaffName?: string;
  note?: string;
  referralSummary?: string;
  resolutionSummary?: string;
}): string {
  const parts: string[] = [
    `[Alert ${params.alertId} · ${params.status}]`,
    `Updated by ${params.actorName} (${params.facilityName}).`,
  ];
  if (params.assignedStaffName) {
    parts.push(`Assigned hospital staff: ${params.assignedStaffName}.`);
  }
  if (params.referralSummary) {
    parts.push(`Care/Referral coordination: ${params.referralSummary}.`);
  }
  if (params.resolutionSummary) {
    parts.push(`Resolution: ${params.resolutionSummary}.`);
  } else if (params.note) {
    parts.push(`Note: ${params.note}`);
  }
  return parts.join(' ');
}
