import type {
  AlertSourceRole,
  DemoPersonaId,
  EmergencyAlert,
  NavSection,
} from '../types/hospital.ts';

export type NormalizedRoleCategory =
  | 'hospital_staff'
  | 'supervisor'
  | 'health_worker'
  | 'mother'
  | 'unauthorized';

export type ClinicalMutationAction =
  | 'manage_alerts'
  | 'submit_alert'
  | 'manage_referrals'
  | 'create_referral'
  | 'add_assessment'
  | 'manage_appointments'
  | 'manage_settings'
  | 'reset_demo'
  | 'view_audit_logs';

export interface CallerAuthorizationScope {
  uid: string;
  role: string;
  roleCategory: NormalizedRoleCategory;
  facilityId: string;
  allowedFacilityIds: string[];
  staffId?: string;
  motherId?: string;
  healthWorkerId?: string;
}

export interface CanonicalDemoPersonaPolicy {
  id: DemoPersonaId;
  uid: string;
  name: string;
  role: string;
  roleCategory: NormalizedRoleCategory;
  email: string;
  staffId: string;
  motherId?: string;
  healthWorkerId?: string;
  defaultFacilityId: string;
  allowedFacilityIds: string[];
}

export const ALLOWED_FACILITY_IDS: readonly string[] = [
  'HOSP-KHORDHA-DH',
  'fac-ch-bbsr',
  'fac-rampur-phc',
];

const FACILITY_ALIAS_GROUPS: readonly (readonly string[])[] = [
  ['HOSP-KHORDHA-DH', 'fac-dh-khordha', 'OD-KH-DH-001'],
];

export function areEquivalentFacilityIds(a: string, b: string): boolean {
  const normA = a.trim().toUpperCase();
  const normB = b.trim().toUpperCase();
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  return FACILITY_ALIAS_GROUPS.some(
    (group) =>
      group.some((alias) => alias.toUpperCase() === normA) &&
      group.some((alias) => alias.toUpperCase() === normB)
  );
}

/**
 * Server-authoritative allowlist of canonical JanmaSaathi demo personas.
 * Demo session minting strictly resolves identity, role, and scope from this table
 * rather than trusting client-supplied role or UID fields.
 */
export const CANONICAL_DEMO_PERSONAS: Record<DemoPersonaId, CanonicalDemoPersonaPolicy> = {
  'mother-priya': {
    id: 'mother-priya',
    uid: 'demo-mother-priya',
    name: 'Priya Sharma',
    role: 'Mother',
    roleCategory: 'mother',
    email: 'priya.sharma@janmasaathi.demo',
    staffId: 'MCP-2026-0894',
    motherId: 'MCP-2026-0894',
    defaultFacilityId: 'HOSP-KHORDHA-DH',
    allowedFacilityIds: ['HOSP-KHORDHA-DH'],
  },
  'hw-sunita': {
    id: 'hw-sunita',
    uid: 'demo-hw-sunita',
    name: 'Sunita Devi',
    role: 'Health Worker',
    roleCategory: 'health_worker',
    email: 'sunita.devi@janmasaathi.demo',
    staffId: 'HW-44120',
    healthWorkerId: 'HW-44120',
    defaultFacilityId: 'fac-rampur-phc',
    allowedFacilityIds: ['fac-rampur-phc', 'HOSP-KHORDHA-DH'],
  },
  'supervisor-rajesh': {
    id: 'supervisor-rajesh',
    uid: 'demo-supervisor-rajesh',
    name: 'Dr. Rajesh Kumar',
    role: 'Supervisor',
    roleCategory: 'supervisor',
    email: 'dr.rajesh.kumar@janmasaathi.demo',
    staffId: 'SUP-RAJESH-01',
    defaultFacilityId: 'HOSP-KHORDHA-DH',
    allowedFacilityIds: ['HOSP-KHORDHA-DH', 'fac-rampur-phc'],
  },
  'hospital-demo': {
    id: 'hospital-demo',
    uid: 'demo-hospital-reviewer',
    name: 'Hospital Demo Access',
    role: 'Hospital Demo Access',
    roleCategory: 'hospital_staff',
    email: 'demo.hospital@janmasaathi.demo',
    staffId: 'HOSP-DEMO',
    defaultFacilityId: 'HOSP-KHORDHA-DH',
    allowedFacilityIds: ['HOSP-KHORDHA-DH', 'fac-ch-bbsr', 'fac-rampur-phc'],
  },
};

/**
 * Fail-closed role normalizer shared by Express backend and React frontend.
 * Unrecognized roles or fallback "Authenticated User" resolve to "unauthorized".
 */
export function normalizeUserRole(role: string | undefined | null): NormalizedRoleCategory {
  if (!role || typeof role !== 'string') return 'unauthorized';
  const r = role.trim().toLowerCase();
  if (!r || r === 'authenticated user' || r === 'anonymous' || r === 'guest' || r === 'unknown') {
    return 'unauthorized';
  }
  if (r === 'mother' || r.includes('mother') || r.includes('patient')) {
    return 'mother';
  }
  if (
    r === 'health worker' ||
    r === 'health_worker' ||
    r === 'worker' ||
    r.includes('health worker') ||
    r.includes('asha') ||
    r.includes('anm') ||
    r.includes('chw')
  ) {
    return 'health_worker';
  }
  if (r === 'supervisor' || r.includes('supervisor') || r.includes('block coordinator')) {
    return 'supervisor';
  }
  if (
    r.includes('hospital') ||
    r.includes('doctor') ||
    r.includes('ob-gyn') ||
    r.includes('medical officer') ||
    r.includes('clinician') ||
    r.includes('nurse') ||
    r.includes('triage') ||
    r.includes('superintendent') ||
    r.includes('admin') ||
    r.includes('staff')
  ) {
    return 'hospital_staff';
  }
  return 'unauthorized';
}

export function getPermittedNavSections(role: string | undefined | null): NavSection[] {
  const category = normalizeUserRole(role);
  switch (category) {
    case 'hospital_staff':
      return [
        'overview',
        'mothers',
        'health-workers',
        'alerts',
        'referrals',
        'analytics',
        'appointments',
        'reports',
        'audit-logs',
        'settings',
      ];
    case 'supervisor':
      return [
        'overview',
        'mothers',
        'health-workers',
        'alerts',
        'referrals',
        'analytics',
        'appointments',
        'reports',
        'audit-logs',
        'settings',
      ];
    case 'health_worker':
      return ['mothers', 'health-workers', 'alerts', 'referrals', 'appointments', 'reports'];
    case 'mother':
      return ['mothers', 'alerts'];
    case 'unauthorized':
    default:
      return [];
  }
}

export function canAccessSection(
  role: string | undefined | null,
  section: NavSection
): boolean {
  return getPermittedNavSections(role).includes(section);
}

export function canPerformMutation(
  role: string | undefined | null,
  action: ClinicalMutationAction
): boolean {
  const category = normalizeUserRole(role);
  if (category === 'unauthorized') return false;

  switch (action) {
    case 'submit_alert':
      return (
        category === 'mother' ||
        category === 'health_worker' ||
        category === 'supervisor' ||
        category === 'hospital_staff'
      );
    case 'manage_alerts':
      return category === 'hospital_staff' || category === 'supervisor';
    case 'manage_referrals':
      return category === 'hospital_staff' || category === 'supervisor';
    case 'create_referral':
      return (
        category === 'hospital_staff' ||
        category === 'supervisor' ||
        category === 'health_worker'
      );
    case 'add_assessment':
      return (
        category === 'hospital_staff' ||
        category === 'supervisor' ||
        category === 'health_worker'
      );
    case 'manage_appointments':
      return category === 'hospital_staff' || category === 'supervisor';
    case 'manage_settings':
    case 'reset_demo':
      return category === 'hospital_staff';
    case 'view_audit_logs':
      return category === 'hospital_staff' || category === 'supervisor';
    default:
      return false;
  }
}

export function canAccessFacility(
  allowedFacilityIds: readonly string[],
  targetFacilityId: string | undefined | null
): boolean {
  if (!allowedFacilityIds || allowedFacilityIds.length === 0) return false;
  if (!targetFacilityId || !targetFacilityId.trim()) return false;
  if (allowedFacilityIds.includes('*')) return true;
  const trimmed = targetFacilityId.trim();
  return allowedFacilityIds.some((allowed) => areEquivalentFacilityIds(allowed, trimmed));
}

/**
 * Authoritative record-level authorization check for Emergency Alerts.
 * Executed on the backend (GET /api/alerts, SSE sync & broadcast, PATCH)
 * and mirrored on the client to prevent cross-patient or cross-facility exposure.
 */
export function canCallerViewAlert(
  alert: Pick<
    EmergencyAlert,
    'motherId' | 'assignedHealthWorkerId' | 'reportedByUserId' | 'facilityId'
  >,
  scope: CallerAuthorizationScope
): boolean {
  switch (scope.roleCategory) {
    case 'unauthorized':
      return false;
    case 'mother': {
      const ownMotherId = scope.motherId || scope.staffId;
      if (!ownMotherId) return alert.reportedByUserId === scope.uid;
      return alert.motherId === ownMotherId || alert.reportedByUserId === scope.uid;
    }
    case 'health_worker': {
      const hwId = scope.healthWorkerId || scope.staffId;
      if (!hwId) return alert.reportedByUserId === scope.uid;
      return (
        alert.assignedHealthWorkerId === hwId ||
        alert.reportedByUserId === hwId ||
        alert.reportedByUserId === scope.uid
      );
    }
    case 'supervisor':
    case 'hospital_staff':
      return canAccessFacility(scope.allowedFacilityIds, alert.facilityId);
    default:
      return false;
  }
}

/**
 * Determines which alert sourceRole values a caller is allowed to submit.
 * - Mothers may only submit sourceRole 'mother' for their own motherId.
 * - Health Workers may only submit sourceRole 'health_worker'.
 * - Supervisors may submit sourceRole 'supervisor'.
 * - Hospital Staff in Demo Mode may simulate all 3 source channels for triage verification;
 *   in live Firebase Mode hospital staff submit as 'supervisor' (hospital clinical escalation).
 */
export function getAllowedAlertSubmissionRoles(
  roleCategory: NormalizedRoleCategory,
  mode: 'demo' | 'firebase'
): AlertSourceRole[] {
  switch (roleCategory) {
    case 'mother':
      return ['mother'];
    case 'health_worker':
      return ['health_worker'];
    case 'supervisor':
      return ['supervisor'];
    case 'hospital_staff':
      return mode === 'demo' ? ['mother', 'health_worker', 'supervisor'] : ['supervisor'];
    case 'unauthorized':
    default:
      return [];
  }
}
