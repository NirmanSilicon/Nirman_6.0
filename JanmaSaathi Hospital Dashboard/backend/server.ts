import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import type { Request, Response } from 'express';
import {
  ALERT_CATEGORIES,
  ALERT_PRIORITIES,
  SOURCE_ROLE_LABELS,
  canRoleManageAlerts,
  findActiveDuplicateAlert,
  formatReturnCommunicationMessage,
  normalizeAlertPriority,
  normalizeWorkflowAlertStatus,
  validateAlertTransition,
} from '../frontend/src/services/alertProtocol.ts';
import type {
  AlertCategory,
  AlertPriority,
  AlertReferralCoordination,
  AlertResponseEntry,
  AlertSourceRole,
  AlertStatus,
  DemoPersonaId,
  EmergencyAlert,
  PriorityBasis,
} from '../frontend/src/types/hospital.ts';
import {
  ALLOWED_FACILITY_IDS,
  CANONICAL_DEMO_PERSONAS,
  canAccessFacility,
  canCallerViewAlert,
  canPerformMutation,
  getAllowedAlertSubmissionRoles,
  getPermittedNavSections,
  normalizeUserRole,
} from '../frontend/src/services/rbacPolicy.ts';
import type {
  CallerAuthorizationScope,
  NormalizedRoleCategory,
} from '../frontend/src/services/rbacPolicy.ts';
import { findFacilityByIdentifier } from '../frontend/src/data/facilities.ts';
import { JANMASAATHI_FIREBASE_CONFIG } from '../frontend/src/lib/firebaseConfig.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';
const DEMO_MODE_ENABLED =
  process.env.ALLOW_DEMO_MODE === 'false'
    ? false
    : !IS_PROD || process.env.ALLOW_DEMO_MODE === 'true';

// Session HMAC key: uses process.env.SESSION_SECRET when configured, with an ephemeral runtime fallback
const SESSION_SIGNING_SECRET = process.env.SESSION_SECRET
  ? crypto.createHash('sha256').update(process.env.SESSION_SECRET).digest()
  : crypto.randomBytes(32);

const FIREBASE_PROJECT_ID = JANMASAATHI_FIREBASE_CONFIG.projectId;
const FIREBASE_DATABASE_ID = JANMASAATHI_FIREBASE_CONFIG.databaseId;
const FIREBASE_API_KEY = JANMASAATHI_FIREBASE_CONFIG.apiKey;

interface VerifiedCaller extends CallerAuthorizationScope {
  mode: 'demo' | 'firebase';
  name: string;
  email: string;
  demoPersonaId?: DemoPersonaId;
  firebaseIdToken?: string;
}

interface SseClient {
  id: string;
  res: Response;
  mode: 'demo' | 'firebase';
  caller: VerifiedCaller;
  lastHeartbeat: number;
}

interface StreamTicket {
  caller: VerifiedCaller;
  expiresAt: number;
}

// Short-lived, single-use SSE tickets so auth tokens never appear in URLs
const MAX_ACTIVE_STREAM_TICKETS = 500;
const streamTickets = new Map<string, StreamTicket>();
const sseClients = new Map<string, SseClient>();

function nowDateTime(): string {
  const d = new Date();
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`;
}

function createInitialDemoAlerts(): EmergencyAlert[] {
  return [
    {
      id: 'EMRG-2026-0551-01',
      sourceCollection: 'emergencyAlerts',
      motherId: 'MCP-2026-0551',
      motherName: 'Sunita Murmu',
      gestationalAgeLabel: '14w 0d',
      sourceRole: 'health_worker',
      reportedByUserId: 'HW-44120',
      reportedByName: 'Sunita Devi',
      facilityId: 'HOSP-KHORDHA-DH',
      facilityName: 'District Hospital Khordha',
      alertCategory: 'Hypertensive / Pre-Eclampsia',
      severity: 'Critical',
      priorityBasis: 'Health Worker Assessment',
      protocolReference: 'NHM Obstetric Danger Sign Protocol — Severe Hypertension, High Fever & Bleeding',
      status: 'NEW',
      reportingSource: 'Health Worker',
      triggerTitle: 'BP 150/82 mmHg, High Fever (104.5 °F) & Multiple Obstetric Danger Signs',
      symptomDescription:
        'Field assessment ASMT-MCP-2026-0551-2393 recorded severe headache, visual disturbance, vaginal bleeding, high fever, and reduced fetal movement.',
      symptoms: [
        'Headache',
        'Visual Disturbance',
        'Vaginal Bleeding',
        'High Fever',
        'Reduced Fetal Movement',
      ],
      vitalsSnapshot: {
        bp: '150/82',
        pulse: 79,
        hemoglobin: 13.7,
        fetalHeartRate: 142,
        temperatureC: 40.3,
      },
      submittedAtIso: '2026-11-29T04:16:00.000Z',
      timestamp: '2026-11-29 04:16',
      elapsedMinutes: 18,
      assignedHealthWorkerId: 'HW-44120',
      assignedHealthWorkerName: 'Sunita Devi',
      assignedHealthWorkerPhone: 'Not recorded in demo fixture',
      block: 'Khordha',
      duplicateOfAlertId: null,
      duplicateSubmissionCount: 0,
      duplicateSubmissions: [],
      hospitalResponse: {},
      returnCommunication: {
        recipients: { mother: false, healthWorker: false, supervisor: false },
      },
      responseHistory: [
        {
          id: 'resp-0551-1',
          timestamp: '2026-11-29 04:16',
          actorId: 'HW-44120',
          actor: 'Sunita Devi',
          role: 'Health Worker (HW-44120)',
          action: 'Alert Submitted',
          nextStatus: 'NEW',
          note: 'Danger signs captured during ASMT-MCP-2026-0551-2393 and escalated to District Hospital Khordha.',
        },
      ],
      operationId: 'OP-DEMO-0551-01',
      isDemo: true,
    },
    {
      id: 'EMRG-2026-0914-01',
      sourceCollection: 'emergencyAlerts',
      motherId: 'MCP-2026-0914',
      motherName: 'Kavita Bai',
      gestationalAgeLabel: '20w 0d',
      sourceRole: 'supervisor',
      reportedByUserId: 'SUP-RAJESH',
      reportedByName: 'Dr. Rajesh Kumar',
      facilityId: 'HOSP-KHORDHA-DH',
      facilityName: 'District Hospital Khordha',
      alertCategory: 'Hemorrhage / Bleeding',
      severity: 'High Priority',
      priorityBasis: 'Supervisor Escalation',
      protocolReference: 'NHM Antenatal Bleeding & Reduced Fetal Movement Protocol',
      status: 'IN PROGRESS',
      reportingSource: 'Supervisor',
      triggerTitle: 'Antenatal Bleeding, Persistent Headache & Reduced Fetal Movement',
      symptomDescription:
        'Escalated after review of ASMT-MCP-2026-0914-0822. Mother reported vaginal spotting with headache and ankle swelling at 20 weeks.',
      symptoms: ['Headache', 'Vaginal Bleeding', 'Reduced Fetal Movement', 'Swelling'],
      vitalsSnapshot: {
        bp: '118/76',
        pulse: 78,
        hemoglobin: 11.6,
        fetalHeartRate: 142,
      },
      submittedAtIso: '2026-11-29T05:41:00.000Z',
      timestamp: '2026-11-29 05:41',
      elapsedMinutes: 34,
      responseTimeMinutes: 12,
      assignedHealthWorkerId: 'HW-44120',
      assignedHealthWorkerName: 'Sunita Devi',
      assignedHealthWorkerPhone: 'Not recorded in demo fixture',
      block: 'Khordha',
      duplicateOfAlertId: null,
      duplicateSubmissionCount: 0,
      duplicateSubmissions: [],
      hospitalResponse: {
        acknowledgedAt: '2026-11-29 05:47',
        acknowledgedById: 'STAFF-DH-01',
        acknowledgedByName: 'Dr. Ananya Mohanty',
        assignedStaffId: 'STAFF-DH-01',
        assignedStaffName: 'Dr. Ananya Mohanty',
        assignedStaffRole: 'Senior OB-GYN Medical Officer',
        referralCoordination: {
          destinationFacility: 'District Hospital Khordha',
          wardOrUnit: 'OB-GYN Emergency Triage Desk',
          transportStatus: 'Ambulance Dispatched',
          ambulanceRef: '108-KHD-204',
          treatmentSummary: 'Urgent USG & fetal Doppler ordered on arrival; IV access protocol prepared.',
          updatedAt: '2026-11-29 05:53',
        },
      },
      returnCommunication: {
        lastDispatchedAt: '2026-11-29 05:53',
        latestStatusMessage:
          '[Alert EMRG-2026-0914-01 · IN PROGRESS] Updated by Dr. Ananya Mohanty (District Hospital Khordha). Assigned hospital staff: Dr. Ananya Mohanty. 108 ambulance dispatched for OB-GYN triage evaluation.',
        linkedMessageId: 'MSG-ALERT-0914-01',
        recipients: { mother: true, healthWorker: true, supervisor: true },
      },
      responseHistory: [
        {
          id: 'resp-0914-1',
          timestamp: '2026-11-29 05:41',
          actorId: 'SUP-RAJESH',
          actor: 'Dr. Rajesh Kumar',
          role: 'Supervisor',
          action: 'Alert Submitted',
          nextStatus: 'NEW',
          note: 'Escalated from field assessment ASMT-MCP-2026-0914-0822 submitted by Sunita Devi (HW-44120).',
        },
        {
          id: 'resp-0914-2',
          timestamp: '2026-11-29 05:47',
          actorId: 'STAFF-DH-01',
          actor: 'Dr. Ananya Mohanty',
          role: 'Senior OB-GYN Medical Officer',
          action: 'Alert Acknowledged',
          previousStatus: 'NEW',
          nextStatus: 'ACKNOWLEDGED',
          assignedTo: 'Dr. Ananya Mohanty',
          note: 'Emergency OB-GYN desk acknowledged escalation and notified Sunita Devi.',
          notifiedRecipients: ['mother', 'health_worker', 'supervisor'],
        },
        {
          id: 'resp-0914-3',
          timestamp: '2026-11-29 05:53',
          actorId: 'STAFF-DH-01',
          actor: 'Dr. Ananya Mohanty',
          role: 'Senior OB-GYN Medical Officer',
          action: 'Status Updated to IN PROGRESS',
          previousStatus: 'ACKNOWLEDGED',
          nextStatus: 'IN PROGRESS',
          note: '108 ambulance (108-KHD-204) dispatched. Ultrasound triage bay reserved.',
          notifiedRecipients: ['mother', 'health_worker', 'supervisor'],
        },
      ],
      operationId: 'OP-DEMO-0914-01',
      isDemo: true,
    },
    {
      id: 'EMRG-2026-0894-01',
      sourceCollection: 'emergencyAlerts',
      motherId: 'MCP-2026-0894',
      motherName: 'Priya Sharma',
      gestationalAgeLabel: '24w 0d',
      sourceRole: 'mother',
      reportedByUserId: 'MCP-2026-0894',
      reportedByName: 'Priya Sharma',
      facilityId: 'HOSP-KHORDHA-DH',
      facilityName: 'District Hospital Khordha',
      alertCategory: 'Other Clinical Escalation',
      severity: 'Moderate',
      priorityBasis: 'Mother Emergency Report',
      protocolReference: 'JanmaSaathi Mother Portal Danger-Sign Check-In',
      status: 'ACKNOWLEDGED',
      reportingSource: 'Mother',
      triggerTitle: 'Persistent Ankle Swelling, Headache & Mild Abdominal Discomfort',
      symptomDescription:
        'Mother submitted check-in via JanmaSaathi Mother Portal reporting ankle swelling, mild fatigue, and intermittent headache after week-24 screening.',
      symptoms: ['Swelling in Feet / Hands', 'Headache', 'Mild Fatigue'],
      vitalsSnapshot: {
        bp: '118/76',
        pulse: 80,
        hemoglobin: 11.6,
        fetalHeartRate: 142,
      },
      submittedAtIso: '2026-11-29T09:20:00.000Z',
      timestamp: '2026-11-29 09:20',
      elapsedMinutes: 42,
      responseTimeMinutes: 9,
      assignedHealthWorkerId: 'HW-44120',
      assignedHealthWorkerName: 'Sunita Devi',
      assignedHealthWorkerPhone: 'Not recorded in demo fixture',
      block: 'Khordha',
      duplicateOfAlertId: null,
      duplicateSubmissionCount: 1,
      duplicateSubmissions: [
        {
          submissionId: 'DUP-0894-01',
          submittedAt: '2026-11-29 09:24',
          reportedByUserId: 'MCP-2026-0894',
          reportedByName: 'Priya Sharma',
          sourceRole: 'mother',
          operationId: 'OP-DEMO-0894-01B',
          symptomDescription: 'Follow-up tap from Mother Portal while awaiting confirmation.',
          note: 'Preserved duplicate submission linked to active alert EMRG-2026-0894-01.',
        },
      ],
      hospitalResponse: {
        acknowledgedAt: '2026-11-29 09:29',
        acknowledgedById: 'STAFF-DH-03',
        acknowledgedByName: 'Sister Kabita Swain',
        assignedStaffId: 'STAFF-DH-02',
        assignedStaffName: 'Dr. Debasis Tripathy',
        assignedStaffRole: 'Medical Officer — Emergency Triage',
      },
      returnCommunication: {
        lastDispatchedAt: '2026-11-29 09:29',
        latestStatusMessage:
          '[Alert EMRG-2026-0894-01 · ACKNOWLEDGED] Updated by Sister Kabita Swain (District Hospital Khordha). Assigned hospital staff: Dr. Debasis Tripathy. Please visit Rampur PHC or DH Khordha OPD for blood pressure and urine protein check.',
        linkedMessageId: 'MSG-ALERT-0894-01',
        recipients: { mother: true, healthWorker: true, supervisor: false },
      },
      responseHistory: [
        {
          id: 'resp-0894-1',
          timestamp: '2026-11-29 09:20',
          actorId: 'MCP-2026-0894',
          actor: 'Priya Sharma',
          role: 'Mother',
          action: 'Alert Submitted',
          nextStatus: 'NEW',
          note: 'Submitted via JanmaSaathi Mother Portal (linked to HUPD-657677).',
        },
        {
          id: 'resp-0894-dup1',
          timestamp: '2026-11-29 09:24',
          actorId: 'MCP-2026-0894',
          actor: 'Priya Sharma',
          role: 'Mother',
          action: 'Duplicate Submission Preserved',
          note: 'Repeated submission captured and linked without discarding.',
        },
        {
          id: 'resp-0894-2',
          timestamp: '2026-11-29 09:29',
          actorId: 'STAFF-DH-03',
          actor: 'Sister Kabita Swain',
          role: 'Labour Room Senior Staff Nurse',
          action: 'Alert Acknowledged',
          previousStatus: 'NEW',
          nextStatus: 'ACKNOWLEDGED',
          assignedTo: 'Dr. Debasis Tripathy',
          note: 'Acknowledged by triage desk; assigned Dr. Debasis Tripathy and messaged Mother & ASHA Sunita Devi.',
          notifiedRecipients: ['mother', 'health_worker'],
        },
      ],
      operationId: 'OP-DEMO-0894-01',
      isDemo: true,
    },
    {
      id: 'EMRG-2026-SAVITRI-01',
      sourceCollection: 'emergencyAlerts',
      motherId: 'MCP-SYNC-1793963474948',
      motherName: 'Savitri Behera',
      gestationalAgeLabel: '22w 0d',
      sourceRole: 'health_worker',
      reportedByUserId: 'HW-44120',
      reportedByName: 'Sunita Devi',
      facilityId: 'HOSP-KHORDHA-DH',
      facilityName: 'District Hospital Khordha',
      alertCategory: 'Transport / Referral Urgency',
      severity: 'Low',
      priorityBasis: 'Health Worker Assessment',
      protocolReference: 'Block ANC Secondary Review & Referral Protocol',
      status: 'REFERRED / ACTION TAKEN',
      reportingSource: 'Health Worker',
      triggerTitle: 'Borderline Elevated BP (135/88) — Referred for Secondary OB Evaluation',
      symptomDescription:
        'No acute maternal distress. Borderline elevated BP noted during week-22 home visit; routine secondary obstetric review requested.',
      symptoms: ['Borderline Elevated BP'],
      vitalsSnapshot: {
        bp: '135/88',
        pulse: 82,
        hemoglobin: 11.6,
      },
      submittedAtIso: '2026-11-29T03:10:00.000Z',
      timestamp: '2026-11-29 03:10',
      elapsedMinutes: 95,
      responseTimeMinutes: 16,
      assignedHealthWorkerId: 'HW-44120',
      assignedHealthWorkerName: 'Sunita Devi',
      assignedHealthWorkerPhone: 'Not recorded in demo fixture',
      block: 'Khordha',
      duplicateOfAlertId: null,
      duplicateSubmissionCount: 0,
      duplicateSubmissions: [],
      hospitalResponse: {
        acknowledgedAt: '2026-11-29 03:26',
        acknowledgedById: 'STAFF-DH-02',
        acknowledgedByName: 'Dr. Debasis Tripathy',
        assignedStaffId: 'STAFF-DH-02',
        assignedStaffName: 'Dr. Debasis Tripathy',
        assignedStaffRole: 'Medical Officer — Emergency Triage',
        referralCoordination: {
          referralId: 'REF-SYNC-1793963474948',
          destinationFacility: 'District Hospital Khordha',
          wardOrUnit: 'Antenatal High-Risk OPD',
          transportStatus: 'Not Required',
          treatmentSummary: 'Scheduled for secondary BP re-evaluation and urine dipstick at DH Khordha OPD.',
          updatedAt: '2026-11-29 03:40',
        },
      },
      returnCommunication: {
        lastDispatchedAt: '2026-11-29 03:40',
        latestStatusMessage:
          '[Alert EMRG-2026-SAVITRI-01 · REFERRED / ACTION TAKEN] Updated by Dr. Debasis Tripathy (District Hospital Khordha). Linked to Referral REF-SYNC-1793963474948 for ANC OPD review.',
        linkedMessageId: 'MSG-ALERT-SAVITRI-01',
        recipients: { mother: true, healthWorker: true, supervisor: true },
      },
      responseHistory: [
        {
          id: 'resp-sav-1',
          timestamp: '2026-11-29 03:10',
          actorId: 'HW-44120',
          actor: 'Sunita Devi',
          role: 'Health Worker (HW-44120)',
          action: 'Alert Submitted',
          nextStatus: 'NEW',
          note: 'Logged borderline BP reading at Khorda Village Ward 2.',
        },
        {
          id: 'resp-sav-2',
          timestamp: '2026-11-29 03:26',
          actorId: 'STAFF-DH-02',
          actor: 'Dr. Debasis Tripathy',
          role: 'Medical Officer — Emergency Triage',
          action: 'Alert Acknowledged',
          previousStatus: 'NEW',
          nextStatus: 'ACKNOWLEDGED',
          assignedTo: 'Dr. Debasis Tripathy',
          note: 'Reviewed vitals; no acute emergency indicators.',
        },
        {
          id: 'resp-sav-3',
          timestamp: '2026-11-29 03:40',
          actorId: 'STAFF-DH-02',
          actor: 'Dr. Debasis Tripathy',
          role: 'Medical Officer — Emergency Triage',
          action: 'Status Updated to REFERRED / ACTION TAKEN',
          previousStatus: 'ACKNOWLEDGED',
          nextStatus: 'REFERRED / ACTION TAKEN',
          note: 'Coordinated with Referral REF-SYNC-1793963474948 for High-Risk ANC OPD review.',
          notifiedRecipients: ['mother', 'health_worker', 'supervisor'],
        },
      ],
      operationId: 'OP-DEMO-SAVITRI-01',
      isDemo: true,
    },
  ];
}

let demoAlertsStore: EmergencyAlert[] = createInitialDemoAlerts();
let demoLastSyncedAt = new Date().toISOString();

function signDemoToken(caller: Omit<VerifiedCaller, 'mode' | 'firebaseIdToken'>): string {
  const payloadObj = { ...caller, mode: 'demo', exp: Date.now() + 8 * 60 * 60 * 1000 };
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SIGNING_SECRET).update(payload).digest('base64url');
  return `demo.${payload}.${sig}`;
}

function verifyDemoToken(token: string): VerifiedCaller | null {
  if (!DEMO_MODE_ENABLED) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'demo') return null;
  const [, payload, sig] = parts;
  const expected = crypto
    .createHmac('sha256', SESSION_SIGNING_SECRET)
    .update(payload)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as VerifiedCaller & {
      exp: number;
    };
    if (!parsed.exp || Date.now() > parsed.exp) return null;
    const personaId = parsed.demoPersonaId;
    if (!personaId || !(personaId in CANONICAL_DEMO_PERSONAS)) return null;
    const canonical = CANONICAL_DEMO_PERSONAS[personaId];
    const resolvedFacility = canonical.allowedFacilityIds.includes(String(parsed.facilityId || ''))
      ? String(parsed.facilityId)
      : canonical.defaultFacilityId;

    return {
      mode: 'demo',
      demoPersonaId: canonical.id,
      uid: canonical.uid,
      name: canonical.name,
      role: canonical.role,
      roleCategory: canonical.roleCategory,
      email: canonical.email,
      staffId: canonical.staffId,
      motherId: canonical.motherId,
      healthWorkerId: canonical.healthWorkerId,
      facilityId: resolvedFacility,
      allowedFacilityIds: [...canonical.allowedFacilityIds],
    };
  } catch {
    return null;
  }
}

async function verifyFirebaseIdToken(
  idToken: string,
  claimedFacilityId?: string
): Promise<VerifiedCaller | null> {
  if (!FIREBASE_API_KEY || !idToken) return null;
  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!resp.ok) return null;
    const data = (await resp.json()) as {
      users?: { localId?: string; email?: string; displayName?: string; customAttributes?: string }[];
    };
    const user = data.users?.[0];
    if (!user?.localId) return null;

    // Fetch authoritative user role, facility scope, and linked IDs strictly from verified
    // Firebase Auth custom claims and Firestore users/{uid}; never trust client-supplied headers.
    let resolvedRole = 'Authenticated User';
    let resolvedName = user.displayName || user.email?.split('@')[0] || 'Hospital Staff';
    let resolvedFacilityId = '';
    let allowedFacilityIds: string[] = [];
    let resolvedStaffId: string | undefined;
    let resolvedMotherId: string | undefined;
    let resolvedHealthWorkerId: string | undefined;

    if (typeof user.customAttributes === 'string' && user.customAttributes.trim()) {
      try {
        const claims = JSON.parse(user.customAttributes) as Record<string, unknown>;
        if (typeof claims.role === 'string' && claims.role.trim()) {
          resolvedRole = claims.role.trim();
        } else if (typeof claims.userRole === 'string' && claims.userRole.trim()) {
          resolvedRole = claims.userRole.trim();
        }
        const claimFac =
          (typeof claims.facilityId === 'string' && claims.facilityId.trim()) ||
          (typeof claims.hospitalId === 'string' && claims.hospitalId.trim()) ||
          (typeof claims.facilityCode === 'string' && claims.facilityCode.trim()) ||
          (typeof claims.hospitalCode === 'string' && claims.hospitalCode.trim()) ||
          (typeof claims.assignedFacilityId === 'string' && claims.assignedFacilityId.trim()) ||
          '';
        if (claimFac) {
          resolvedFacilityId = claimFac;
          allowedFacilityIds = [claimFac];
        }
        const rawClaimList = Array.isArray(claims.allowedFacilityIds)
          ? claims.allowedFacilityIds
          : Array.isArray(claims.facilityIds)
          ? claims.facilityIds
          : Array.isArray(claims.hospitalIds)
          ? claims.hospitalIds
          : Array.isArray(claims.facilityCodes)
          ? claims.facilityCodes
          : [];
        const parsedClaimList = rawClaimList
          .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
          .map((x) => x.trim());
        if (parsedClaimList.length > 0) {
          allowedFacilityIds = Array.from(new Set([...allowedFacilityIds, ...parsedClaimList]));
        }
        if (typeof claims.staffId === 'string' && claims.staffId.trim()) {
          resolvedStaffId = claims.staffId.trim();
        }
      } catch {
        // Ignore malformed customAttributes JSON
      }
    }

    if (FIREBASE_PROJECT_ID && FIREBASE_DATABASE_ID) {
      try {
        const userDocUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
          FIREBASE_PROJECT_ID
        )}/databases/${encodeURIComponent(FIREBASE_DATABASE_ID)}/documents/users/${encodeURIComponent(
          user.localId
        )}`;
        const docResp = await fetch(userDocUrl, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (docResp.ok) {
          const docJson = (await docResp.json()) as {
            fields?: Record<string, Record<string, unknown>>;
          };
          const decoded: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(docJson.fields ?? {})) {
            decoded[k] = decodeFirestoreValue(v);
          }
          if (typeof decoded.role === 'string' && decoded.role.trim()) {
            resolvedRole = decoded.role.trim();
          } else if (typeof decoded.userRole === 'string' && decoded.userRole.trim()) {
            resolvedRole = decoded.userRole.trim();
          }
          if (typeof decoded.displayName === 'string' && decoded.displayName.trim()) {
            resolvedName = decoded.displayName.trim();
          } else if (typeof decoded.name === 'string' && decoded.name.trim()) {
            resolvedName = decoded.name.trim();
          } else if (typeof decoded.fullName === 'string' && decoded.fullName.trim()) {
            resolvedName = decoded.fullName.trim();
          }
          const dbFac =
            (typeof decoded.facilityId === 'string' && decoded.facilityId.trim()) ||
            (typeof decoded.hospitalId === 'string' && decoded.hospitalId.trim()) ||
            (typeof decoded.facilityCode === 'string' && decoded.facilityCode.trim()) ||
            (typeof decoded.hospitalCode === 'string' && decoded.hospitalCode.trim()) ||
            (typeof decoded.assignedFacilityId === 'string' && decoded.assignedFacilityId.trim()) ||
            '';
          if (dbFac) {
            resolvedFacilityId = dbFac;
            allowedFacilityIds = Array.from(new Set([dbFac, ...allowedFacilityIds]));
          }
          const rawDbAllowed = Array.isArray(decoded.allowedFacilityIds)
            ? decoded.allowedFacilityIds
            : Array.isArray(decoded.facilityIds)
            ? decoded.facilityIds
            : Array.isArray(decoded.hospitalIds)
            ? decoded.hospitalIds
            : Array.isArray(decoded.facilityCodes)
            ? decoded.facilityCodes
            : [];
          if (rawDbAllowed.length > 0) {
            const parsedList = rawDbAllowed
              .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
              .map((x) => x.trim());
            if (parsedList.length > 0) {
              allowedFacilityIds = Array.from(new Set([...allowedFacilityIds, ...parsedList]));
            }
          }
          if (typeof decoded.staffId === 'string' && decoded.staffId.trim()) {
            resolvedStaffId = decoded.staffId.trim();
          } else if (typeof decoded.employeeId === 'string' && decoded.employeeId.trim()) {
            resolvedStaffId = decoded.employeeId.trim();
          }
          if (typeof decoded.motherId === 'string' && decoded.motherId.trim()) {
            resolvedMotherId = decoded.motherId.trim();
          }
          if (typeof decoded.healthWorkerId === 'string' && decoded.healthWorkerId.trim()) {
            resolvedHealthWorkerId = decoded.healthWorkerId.trim();
          } else if (typeof decoded.workerId === 'string' && decoded.workerId.trim()) {
            resolvedHealthWorkerId = decoded.workerId.trim();
          }
        }
      } catch {
        // Fail-closed: default resolvedRole remains 'Authenticated User' -> 'unauthorized'
      }
    }

    const roleCategory: NormalizedRoleCategory = normalizeUserRole(resolvedRole);

    // Fail-closed: never synthesize a default facilityId if neither Firebase Auth claims
    // nor users/{uid} specifies an authorized hospital/facility.
    if (claimedFacilityId && canAccessFacility(allowedFacilityIds, claimedFacilityId)) {
      const exactMatch = allowedFacilityIds.find(
        (id) => id.trim().toLowerCase() === claimedFacilityId.trim().toLowerCase()
      );
      resolvedFacilityId = exactMatch || resolvedFacilityId || claimedFacilityId;
    } else if (!resolvedFacilityId && allowedFacilityIds.length > 0) {
      resolvedFacilityId = allowedFacilityIds[0];
    }

    return {
      mode: 'firebase',
      uid: user.localId,
      name: resolvedName,
      role: resolvedRole,
      roleCategory,
      email: user.email || '',
      staffId: resolvedStaffId,
      motherId: resolvedMotherId,
      healthWorkerId: resolvedHealthWorkerId,
      facilityId: resolvedFacilityId,
      allowedFacilityIds,
      firebaseIdToken: idToken,
    };
  } catch {
    return null;
  }
}

async function authenticateRequest(req: Request): Promise<VerifiedCaller | null> {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  if (token.startsWith('demo.')) {
    return verifyDemoToken(token);
  }
  const facHint =
    typeof req.headers['x-janmasaathi-facility'] === 'string'
      ? req.headers['x-janmasaathi-facility'].slice(0, 80)
      : undefined;
  return verifyFirebaseIdToken(token, facHint);
}

// =========================================================================
// Firestore REST Helpers for Authenticated Firebase Integration Mode
// =========================================================================
function decodeFirestoreValue(val: Record<string, unknown> | undefined): unknown {
  if (!val || typeof val !== 'object') return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    const arr = (val.arrayValue as { values?: Record<string, unknown>[] })?.values ?? [];
    return arr.map((v) => decodeFirestoreValue(v));
  }
  if ('mapValue' in val) {
    const fields = (val.mapValue as { fields?: Record<string, Record<string, unknown>> })?.fields ?? {};
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = decodeFirestoreValue(v);
    }
    return out;
  }
  return undefined;
}

function encodeFirestoreValue(val: unknown): Record<string, unknown> {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map((item) => encodeFirestoreValue(item)) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, Record<string, unknown>> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        fields[k] = encodeFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function mapFirestoreAlertDoc(
  docItem: { name: string; fields?: Record<string, Record<string, unknown>> },
  fallbackFacilityId = ''
): EmergencyAlert {
  const id = docItem.name.split('/').pop() || '';
  const raw: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(docItem.fields ?? {})) {
    raw[k] = decodeFirestoreValue(v);
  }
  const submittedIso = String(raw.submittedAt || raw.createdAt || new Date().toISOString());
  const sourceRole = (['mother', 'health_worker', 'supervisor'].includes(String(raw.sourceRole))
    ? raw.sourceRole
    : 'health_worker') as AlertSourceRole;
  const vitalsRaw = (raw.vitals && typeof raw.vitals === 'object' ? raw.vitals : {}) as Record<
    string,
    unknown
  >;
  const hospitalRespRaw = (
    raw.hospitalResponse && typeof raw.hospitalResponse === 'object' ? raw.hospitalResponse : {}
  ) as EmergencyAlert['hospitalResponse'];
  const returnCommRaw = (
    raw.returnCommunication && typeof raw.returnCommunication === 'object'
      ? raw.returnCommunication
      : { recipients: { mother: false, healthWorker: false, supervisor: false } }
  ) as EmergencyAlert['returnCommunication'];

  const resolvedFac = String(
    raw.facilityId || raw.hospitalId || raw.facilityCode || raw.hospitalCode || fallbackFacilityId || ''
  );

  return {
    id,
    sourceCollection: 'emergencyAlerts',
    motherId: String(raw.motherId || raw.relatedMotherId || ''),
    motherName: String(raw.motherName || raw.motherId || 'Referenced Mother'),
    gestationalAgeLabel: String(raw.gestationalAgeLabel || '—'),
    sourceRole,
    reportedByUserId: String(raw.reportedByUserId || raw.owningUid || '—'),
    reportedByName: String(raw.reportedByName || SOURCE_ROLE_LABELS[sourceRole]),
    facilityId: resolvedFac,
    facilityName: String(
      raw.facilityName ||
        raw.hospitalName ||
        findFacilityByIdentifier(resolvedFac)?.name ||
        'District Hospital Khordha'
    ),
    alertCategory: (ALERT_CATEGORIES.includes(raw.alertCategory as AlertCategory)
      ? raw.alertCategory
      : 'Other Clinical Escalation') as AlertCategory,
    severity: normalizeAlertPriority(String(raw.priority || raw.severity || 'High Priority')),
    priorityBasis: (String(raw.priorityBasis || 'Protocol Triage') as PriorityBasis),
    protocolReference: raw.protocolReference ? String(raw.protocolReference) : undefined,
    status: normalizeWorkflowAlertStatus(String(raw.status || 'NEW')),
    reportingSource: SOURCE_ROLE_LABELS[sourceRole],
    triggerTitle: String(raw.triggerTitle || raw.alertCategory || 'Emergency Maternal Alert'),
    symptomDescription: String(raw.symptomDescription || raw.notes || ''),
    symptoms: Array.isArray(raw.symptoms) ? raw.symptoms.map(String) : [],
    vitalsSnapshot: {
      bp: String(vitalsRaw.bp || '—'),
      pulse: Number(vitalsRaw.pulse || 0),
      spo2: vitalsRaw.spo2 !== undefined ? Number(vitalsRaw.spo2) : undefined,
      hemoglobin: vitalsRaw.hemoglobin !== undefined ? Number(vitalsRaw.hemoglobin) : undefined,
      fetalHeartRate:
        vitalsRaw.fetalHeartRate !== undefined ? Number(vitalsRaw.fetalHeartRate) : undefined,
      temperatureC:
        vitalsRaw.temperatureC !== undefined ? Number(vitalsRaw.temperatureC) : undefined,
    },
    submittedAtIso: submittedIso,
    timestamp: submittedIso.slice(0, 16).replace('T', ' '),
    elapsedMinutes: Math.max(0, Math.round((Date.now() - Date.parse(submittedIso)) / 60000) || 0),
    assignedHealthWorkerId: String(raw.assignedHealthWorkerId || ''),
    assignedHealthWorkerName: String(raw.assignedHealthWorkerName || 'Unassigned'),
    assignedHealthWorkerPhone: String(raw.assignedHealthWorkerPhone || '—'),
    block: String(raw.block || '—'),
    duplicateOfAlertId: raw.duplicateOfAlertId ? String(raw.duplicateOfAlertId) : null,
    duplicateSubmissionCount: Number(raw.duplicateSubmissionCount || 0),
    duplicateSubmissions: Array.isArray(raw.duplicateSubmissions)
      ? (raw.duplicateSubmissions as EmergencyAlert['duplicateSubmissions'])
      : [],
    hospitalResponse: hospitalRespRaw,
    returnCommunication: returnCommRaw,
    responseHistory: Array.isArray(raw.responseHistory)
      ? (raw.responseHistory as AlertResponseEntry[])
      : [],
    operationId: raw.operationId ? String(raw.operationId) : undefined,
    isDemo: false,
  };
}

async function fetchLiveEmergencyAlertsFromFirestore(
  idToken: string,
  caller?: VerifiedCaller
): Promise<{
  alerts: EmergencyAlert[];
  permissionDenied: boolean;
  errorMessage?: string;
}> {
  if (!FIREBASE_PROJECT_ID || !FIREBASE_DATABASE_ID) {
    return { alerts: [], permissionDenied: false, errorMessage: 'Firebase project/database not configured.' };
  }

  const scopedFacilities = (caller?.allowedFacilityIds ?? [])
    .filter((id) => id && id !== '*')
    .slice(0, 10);

  if (scopedFacilities.length > 0) {
    const runQueryUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      FIREBASE_PROJECT_ID
    )}/databases/${encodeURIComponent(FIREBASE_DATABASE_ID)}/documents:runQuery`;

    const queryField = async (fieldPath: 'facilityId' | 'hospitalId' | 'facilityCode') => {
      const filter =
        scopedFacilities.length === 1
          ? {
              fieldFilter: {
                field: { fieldPath },
                op: 'EQUAL',
                value: { stringValue: scopedFacilities[0] },
              },
            }
          : {
              fieldFilter: {
                field: { fieldPath },
                op: 'IN',
                value: {
                  arrayValue: {
                    values: scopedFacilities.map((val) => ({ stringValue: val })),
                  },
                },
              },
            };

      const resp = await fetch(runQueryUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'emergencyAlerts' }],
            where: filter,
            limit: 100,
          },
        }),
      });
      return resp;
    };

    const byId = new Map<string, EmergencyAlert>();
    let anySucceeded = false;
    let deniedCount = 0;
    const fields: ('facilityId' | 'hospitalId' | 'facilityCode')[] = [
      'facilityId',
      'hospitalId',
      'facilityCode',
    ];

    for (const field of fields) {
      if (field === 'facilityCode' && byId.size > 0) continue;
      const resp = await queryField(field);
      if (resp.status === 403) {
        deniedCount += 1;
        continue;
      }
      if (!resp.ok) continue;
      anySucceeded = true;
      const rows = (await resp.json()) as {
        document?: { name: string; fields?: Record<string, Record<string, unknown>> };
      }[];
      rows.forEach((row) => {
        if (!row.document) return;
        const adapted = mapFirestoreAlertDoc(row.document, caller?.facilityId || '');
        if (adapted.id) byId.set(adapted.id, adapted);
      });
    }

    if (!anySucceeded && deniedCount > 0) {
      return {
        alerts: [],
        permissionDenied: true,
        errorMessage: 'Firestore security rules denied read access to "emergencyAlerts".',
      };
    }

    const alerts = Array.from(byId.values()).sort((a, b) =>
      b.submittedAtIso.localeCompare(a.submittedAtIso)
    );
    return { alerts, permissionDenied: false };
  }

  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    FIREBASE_PROJECT_ID
  )}/databases/${encodeURIComponent(FIREBASE_DATABASE_ID)}/documents/emergencyAlerts?pageSize=100`;

  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (resp.status === 403) {
    return {
      alerts: [],
      permissionDenied: true,
      errorMessage: 'Firestore security rules denied read access to "emergencyAlerts".',
    };
  }
  if (!resp.ok) {
    return {
      alerts: [],
      permissionDenied: false,
      errorMessage: `Firestore responded with HTTP ${resp.status}`,
    };
  }

  const json = (await resp.json()) as {
    documents?: { name: string; fields?: Record<string, Record<string, unknown>> }[];
  };
  const docs = json.documents ?? [];
  const alerts: EmergencyAlert[] = docs.map((docItem) =>
    mapFirestoreAlertDoc(docItem, caller?.facilityId || '')
  );

  alerts.sort((a, b) => b.submittedAtIso.localeCompare(a.submittedAtIso));
  return { alerts, permissionDenied: false };
}

function sendSseEvent(res: Response, eventName: string, data: unknown): void {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function broadcastAlertEventToAuthorizedClients(
  mode: 'demo' | 'firebase',
  eventName: 'alert:created' | 'alert:updated' | 'alert:duplicate_recorded',
  alert: EmergencyAlert,
  extraPayload: Record<string, unknown>
): void {
  for (const client of sseClients.values()) {
    if (client.mode !== mode) continue;
    if (!canCallerViewAlert(alert, client.caller)) continue;
    try {
      sendSseEvent(client.res, eventName, { alert, ...extraPayload });
    } catch {
      sseClients.delete(client.id);
    }
  }
}

function broadcastResetToAuthorizedClients(
  mode: 'demo' | 'firebase',
  allAlerts: EmergencyAlert[],
  lastSyncedAt: string
): void {
  for (const client of sseClients.values()) {
    if (client.mode !== mode) continue;
    const scopedAlerts = allAlerts.filter((a) => canCallerViewAlert(a, client.caller));
    try {
      sendSseEvent(client.res, 'alerts:reset', {
        alerts: scopedAlerts,
        lastSyncedAt,
      });
    } catch {
      sseClients.delete(client.id);
    }
  }
}

// Periodic heartbeat + ticket pruning (every 15 seconds)
const heartbeatInterval = setInterval(() => {
  const now = Date.now();
  for (const [ticketId, ticket] of streamTickets.entries()) {
    if (ticket.expiresAt <= now) {
      streamTickets.delete(ticketId);
    }
  }
  const syncIso = new Date().toISOString();
  for (const [clientId, client] of sseClients.entries()) {
    try {
      sendSseEvent(client.res, 'heartbeat', {
        lastSyncedAt: syncIso,
        mode: client.mode,
      });
      client.lastHeartbeat = now;
    } catch {
      sseClients.delete(clientId);
    }
  }
}, 15000);

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '512kb' }));

  // Baseline security headers (iframe-preview safe: no X-Frame-Options: DENY, no wildcard CORS)
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
    }
    next();
  });

  // =========================================================================
  // 1. Health & Cloud Run Readiness Probe (minimal, no sensitive metadata)
  // =========================================================================
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      service: 'janmasaathi-hospital-dashboard',
      status: 'ready',
      firebaseConfigured: Boolean(FIREBASE_PROJECT_ID && FIREBASE_DATABASE_ID && FIREBASE_API_KEY),
      demoModeEnabled: DEMO_MODE_ENABLED,
      serverTime: new Date().toISOString(),
    });
  });

  // =========================================================================
  // 1b. Verified Session & Backend RBAC Introspection (GET /api/auth/me)
  // =========================================================================
  app.get('/api/auth/me', async (req: Request, res: Response) => {
    const caller = await authenticateRequest(req);
    if (!caller) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    res.json({
      mode: caller.mode,
      uid: caller.uid,
      name: caller.name,
      role: caller.role,
      roleCategory: caller.roleCategory,
      facilityId: caller.facilityId,
      allowedFacilityIds: caller.allowedFacilityIds,
      permittedSections: getPermittedNavSections(caller.role),
      canManageAlerts: canRoleManageAlerts(caller.role),
      canResetDemo: canPerformMutation(caller.role, 'reset_demo'),
      canViewAuditLogs: canPerformMutation(caller.role, 'view_audit_logs'),
    });
  });

  // =========================================================================
  // 2. Demo Session Token Issuance (Strict Canonical Persona Allowlist)
  //    Never trusts arbitrary client-supplied role, uid, or scope fields.
  // =========================================================================
  app.post('/api/demo/session', (req: Request, res: Response) => {
    if (!DEMO_MODE_ENABLED) {
      res.status(403).json({ error: 'Demo sessions are disabled in this deployment.' });
      return;
    }
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const rawPersonaId = typeof body.personaId === 'string' ? body.personaId.trim() : '';
    if (!rawPersonaId || !(rawPersonaId in CANONICAL_DEMO_PERSONAS)) {
      res.status(400).json({
        error: 'Valid canonical JanmaSaathi demo personaId is required (mother-priya, hw-sunita, supervisor-rajesh, or hospital-demo).',
      });
      return;
    }

    const canonical = CANONICAL_DEMO_PERSONAS[rawPersonaId as DemoPersonaId];
    const requestedFacility =
      typeof body.facilityId === 'string' ? body.facilityId.trim().slice(0, 80) : '';
    const facilityId = canonical.allowedFacilityIds.includes(requestedFacility)
      ? requestedFacility
      : canonical.defaultFacilityId;

    const token = signDemoToken({
      demoPersonaId: canonical.id,
      uid: canonical.uid,
      name: canonical.name,
      role: canonical.role,
      roleCategory: canonical.roleCategory,
      email: canonical.email,
      staffId: canonical.staffId,
      motherId: canonical.motherId,
      healthWorkerId: canonical.healthWorkerId,
      facilityId,
      allowedFacilityIds: [...canonical.allowedFacilityIds],
    });

    res.json({
      token,
      personaId: canonical.id,
      role: canonical.role,
      roleCategory: canonical.roleCategory,
      facilityId,
      allowedFacilityIds: canonical.allowedFacilityIds,
      permittedSections: getPermittedNavSections(canonical.role),
      canManageAlerts: canRoleManageAlerts(canonical.role),
      issuedAt: new Date().toISOString(),
    });
  });

  // =========================================================================
  // 3. Single-Use SSE Stream Ticket Exchange (keeps tokens out of URLs)
  // =========================================================================
  app.post('/api/alerts/stream-token', async (req: Request, res: Response) => {
    const caller = await authenticateRequest(req);
    if (!caller) {
      res.status(401).json({ error: 'Authentication required to open emergency alert stream.' });
      return;
    }
    if (caller.roleCategory === 'unauthorized') {
      res.status(403).json({
        error: 'Your account does not have an authorized JanmaSaathi role to subscribe to alert streams.',
      });
      return;
    }
    if (streamTickets.size >= MAX_ACTIVE_STREAM_TICKETS) {
      const now = Date.now();
      for (const [k, v] of streamTickets.entries()) {
        if (v.expiresAt <= now) streamTickets.delete(k);
      }
    }
    const ticket = crypto.randomBytes(24).toString('base64url');
    streamTickets.set(ticket, {
      caller,
      expiresAt: Date.now() + 30_000,
    });
    res.json({
      ticket,
      expiresInSeconds: 30,
      mode: caller.mode,
    });
  });

  // =========================================================================
  // 4. Real-Time Server-Sent Events Stream (GET /api/alerts/stream)
  // =========================================================================
  app.get('/api/alerts/stream', async (req: Request, res: Response) => {
    const ticketParam = typeof req.query.ticket === 'string' ? req.query.ticket : '';
    const entry = ticketParam ? streamTickets.get(ticketParam) : undefined;
    if (!entry || entry.expiresAt < Date.now()) {
      res.status(401).json({ error: 'Invalid or expired alert stream ticket.' });
      return;
    }
    streamTickets.delete(ticketParam);
    const { caller } = entry;
    if (caller.roleCategory === 'unauthorized') {
      res.status(403).json({ error: 'Unauthorized role.' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const clientId = crypto.randomUUID();
    sseClients.set(clientId, {
      id: clientId,
      res,
      mode: caller.mode,
      caller,
      lastHeartbeat: Date.now(),
    });

    if (caller.mode === 'demo') {
      demoLastSyncedAt = new Date().toISOString();
      const scopedAlerts = demoAlertsStore.filter((a) => canCallerViewAlert(a, caller));
      sendSseEvent(res, 'sync', {
        mode: 'demo',
        alerts: scopedAlerts,
        lastSyncedAt: demoLastSyncedAt,
      });
    } else if (caller.firebaseIdToken) {
      const live = await fetchLiveEmergencyAlertsFromFirestore(caller.firebaseIdToken, caller);
      const scopedAlerts = live.alerts.filter((a) => canCallerViewAlert(a, caller));
      sendSseEvent(res, 'sync', {
        mode: 'firebase',
        alerts: scopedAlerts,
        permissionDenied: live.permissionDenied,
        errorMessage: live.errorMessage,
        lastSyncedAt: new Date().toISOString(),
      });
    }

    req.on('close', () => {
      sseClients.delete(clientId);
    });
  });

  // =========================================================================
  // 5. Polling Fallback Endpoint (GET /api/alerts) — Strictly Role & Facility Scoped
  // =========================================================================
  app.get('/api/alerts', async (req: Request, res: Response) => {
    const caller = await authenticateRequest(req);
    if (!caller) {
      res.status(401).json({ error: 'Authentication required to fetch emergency alerts.' });
      return;
    }
    if (caller.roleCategory === 'unauthorized') {
      res.status(403).json({ error: 'Unauthorized role: access to emergency alerts denied.' });
      return;
    }

    if (caller.mode === 'demo') {
      demoLastSyncedAt = new Date().toISOString();
      const scopedAlerts = demoAlertsStore.filter((a) => canCallerViewAlert(a, caller));
      res.json({
        mode: 'demo',
        alerts: scopedAlerts,
        lastSyncedAt: demoLastSyncedAt,
      });
      return;
    }

    if (!caller.firebaseIdToken) {
      res.status(401).json({ error: 'Missing verified Firebase session.' });
      return;
    }

    const live = await fetchLiveEmergencyAlertsFromFirestore(caller.firebaseIdToken, caller);
    if (live.permissionDenied) {
      res.status(403).json({
        error: live.errorMessage || 'Permission denied reading emergencyAlerts.',
        permissionDenied: true,
        lastSyncedAt: new Date().toISOString(),
      });
      return;
    }
    const scopedAlerts = live.alerts.filter((a) => canCallerViewAlert(a, caller));
    res.json({
      mode: 'firebase',
      alerts: scopedAlerts,
      errorMessage: live.errorMessage,
      lastSyncedAt: new Date().toISOString(),
    });
  });

  // =========================================================================
  // 6. Submit Emergency Alert (POST /api/alerts) — Mother / HW / Supervisor
  //    Enforces caller role, identity binding, facility authorization & duplicate preservation.
  // =========================================================================
  app.post('/api/alerts', async (req: Request, res: Response) => {
    const caller = await authenticateRequest(req);
    if (!caller) {
      res.status(401).json({ error: 'Authentication required to submit emergency alerts.' });
      return;
    }
    if (!canPerformMutation(caller.role, 'submit_alert')) {
      res.status(403).json({
        error: `Role "${caller.role}" is not authorized to submit emergency alerts.`,
      });
      return;
    }

    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const allowedSourceRoles = getAllowedAlertSubmissionRoles(caller.roleCategory, caller.mode);
    const requestedSourceRole = String(body.sourceRole || '').trim() as AlertSourceRole;
    if (requestedSourceRole && !allowedSourceRoles.includes(requestedSourceRole)) {
      res.status(403).json({
        error: `Role "${caller.role}" cannot submit an emergency alert impersonating sourceRole "${requestedSourceRole}".`,
      });
      return;
    }
    const sourceRole: AlertSourceRole = allowedSourceRoles.includes(requestedSourceRole)
      ? requestedSourceRole
      : allowedSourceRoles[0];

    let motherId = typeof body.motherId === 'string' ? body.motherId.trim().slice(0, 80) : '';
    if (caller.roleCategory === 'mother') {
      const ownMotherId = caller.motherId || caller.staffId || '';
      if (motherId && ownMotherId && motherId !== ownMotherId) {
        res.status(403).json({
          error: 'Mother accounts may only submit emergency alerts for their own maternal record.',
        });
        return;
      }
      motherId = ownMotherId || motherId;
    }

    const motherName =
      caller.roleCategory === 'mother'
        ? caller.name
        : typeof body.motherName === 'string' && body.motherName.trim()
        ? body.motherName.trim().slice(0, 120)
        : motherId;
    const alertCategory = (
      ALERT_CATEGORIES.includes(body.alertCategory as AlertCategory)
        ? body.alertCategory
        : 'Obstetric Emergency'
    ) as AlertCategory;
    const priority = (
      ALERT_PRIORITIES.includes(body.priority as AlertPriority)
        ? body.priority
        : normalizeAlertPriority(String(body.priority || 'High Priority'))
    ) as AlertPriority;
    const symptomDescription =
      typeof body.symptomDescription === 'string' ? body.symptomDescription.trim().slice(0, 1200) : '';
    const triggerTitle =
      typeof body.triggerTitle === 'string' && body.triggerTitle.trim()
        ? body.triggerTitle.trim().slice(0, 180)
        : `${alertCategory} — Reported by ${SOURCE_ROLE_LABELS[sourceRole]}`;

    if (!motherId) {
      res.status(400).json({ error: 'motherId reference is required (do not duplicate full mother profiles).' });
      return;
    }
    if (!symptomDescription) {
      res.status(400).json({ error: 'symptomDescription is required.' });
      return;
    }

    const symptoms = Array.isArray(body.symptoms)
      ? body.symptoms.map((s) => String(s).trim()).filter(Boolean).slice(0, 15)
      : [];
    const vitalsRaw = (body.vitalsSnapshot && typeof body.vitalsSnapshot === 'object'
      ? body.vitalsSnapshot
      : {}) as Record<string, unknown>;

    const canSimulateExternalReporter =
      caller.mode === 'demo' && caller.roleCategory === 'hospital_staff';

    const reportedByUserId = canSimulateExternalReporter
      ? typeof body.reportedByUserId === 'string' && body.reportedByUserId.trim()
        ? body.reportedByUserId.trim().slice(0, 80)
        : caller.uid
      : caller.roleCategory === 'mother'
      ? caller.motherId || caller.uid
      : caller.roleCategory === 'health_worker'
      ? caller.healthWorkerId || caller.staffId || caller.uid
      : caller.staffId || caller.uid;

    const reportedByName = canSimulateExternalReporter
      ? typeof body.reportedByName === 'string' && body.reportedByName.trim()
        ? body.reportedByName.trim().slice(0, 100)
        : caller.name
      : caller.name;

    const assignedHealthWorkerId =
      caller.roleCategory === 'health_worker'
        ? caller.healthWorkerId || caller.staffId || 'HW-44120'
        : typeof body.assignedHealthWorkerId === 'string' && body.assignedHealthWorkerId.trim()
        ? body.assignedHealthWorkerId.trim().slice(0, 80)
        : 'HW-44120';
    const assignedHealthWorkerName =
      caller.roleCategory === 'health_worker'
        ? caller.name
        : typeof body.assignedHealthWorkerName === 'string' && body.assignedHealthWorkerName.trim()
        ? body.assignedHealthWorkerName.trim().slice(0, 100)
        : 'Sunita Devi';

    const requestedFacilityId =
      typeof body.facilityId === 'string' && body.facilityId.trim()
        ? body.facilityId.trim().slice(0, 80)
        : caller.facilityId;
    if (!canAccessFacility(caller.allowedFacilityIds, requestedFacilityId)) {
      res.status(403).json({
        error: `Unauthorized facility target "${requestedFacilityId}" for caller role "${caller.role}".`,
      });
      return;
    }
    const facilityId = findFacilityByIdentifier(requestedFacilityId)?.id || requestedFacilityId;
    const facilityName =
      typeof body.facilityName === 'string' && body.facilityName.trim()
        ? body.facilityName.trim().slice(0, 120)
        : findFacilityByIdentifier(facilityId)?.name || 'District Hospital Khordha';
    const gestationalAgeLabel =
      typeof body.gestationalAgeLabel === 'string' && body.gestationalAgeLabel.trim()
        ? body.gestationalAgeLabel.trim().slice(0, 40)
        : '—';
    const block =
      typeof body.block === 'string' && body.block.trim() ? body.block.trim().slice(0, 80) : 'Khordha';
    const protocolReference =
      typeof body.protocolReference === 'string' && body.protocolReference.trim()
        ? body.protocolReference.trim().slice(0, 180)
        : `Approved ${SOURCE_ROLE_LABELS[sourceRole]} Emergency Reporting Protocol`;
    const priorityBasis: PriorityBasis =
      sourceRole === 'mother'
        ? 'Mother Emergency Report'
        : sourceRole === 'supervisor'
        ? 'Supervisor Escalation'
        : 'Health Worker Assessment';
    const operationId =
      typeof body.operationId === 'string' && body.operationId.trim()
        ? body.operationId.trim().slice(0, 80)
        : `OP-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const submittedIso = new Date().toISOString();
    const formattedNow = nowDateTime();

    if (caller.mode === 'demo') {
      // Safety rule: NEVER silently discard duplicate submissions!
      const activeDuplicate = findActiveDuplicateAlert(demoAlertsStore, motherId, alertCategory);
      if (activeDuplicate) {
        const dupEntry = {
          submissionId: `DUP-${Date.now().toString().slice(-6)}`,
          submittedAt: formattedNow,
          reportedByUserId,
          reportedByName,
          sourceRole,
          operationId,
          symptomDescription,
          note: `Duplicate submission for active alert ${activeDuplicate.id} preserved (not discarded).`,
        };
        const historyEntry: AlertResponseEntry = {
          id: `resp-dup-${Date.now()}`,
          timestamp: formattedNow,
          actorId: reportedByUserId,
          actor: reportedByName,
          role: SOURCE_ROLE_LABELS[sourceRole],
          action: 'Duplicate Submission Preserved',
          note: `${SOURCE_ROLE_LABELS[sourceRole]} (${reportedByName}) submitted a follow-up/duplicate report: "${symptomDescription}"`,
        };

        // Escalate priority if the duplicate report carries higher protocol urgency (never downgrade)
        const priorityRank: Record<AlertPriority, number> = {
          Critical: 4,
          'High Priority': 3,
          Moderate: 2,
          Low: 1,
        };
        const escalatedPriority =
          priorityRank[priority] > priorityRank[activeDuplicate.severity]
            ? priority
            : activeDuplicate.severity;

        const updated: EmergencyAlert = {
          ...activeDuplicate,
          severity: escalatedPriority,
          duplicateSubmissionCount: activeDuplicate.duplicateSubmissionCount + 1,
          duplicateSubmissions: [dupEntry, ...activeDuplicate.duplicateSubmissions],
          responseHistory: [...activeDuplicate.responseHistory, historyEntry],
        };

        demoAlertsStore = demoAlertsStore.map((a) => (a.id === updated.id ? updated : a));
        demoLastSyncedAt = submittedIso;

        broadcastAlertEventToAuthorizedClients('demo', 'alert:duplicate_recorded', updated, {
          duplicate: dupEntry,
          lastSyncedAt: demoLastSyncedAt,
        });

        res.status(200).json({
          duplicatePreserved: true,
          parentAlertId: updated.id,
          alert: updated,
          lastSyncedAt: demoLastSyncedAt,
        });
        return;
      }

      const newAlert: EmergencyAlert = {
        id: `EMRG-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
        sourceCollection: 'emergencyAlerts',
        motherId,
        motherName,
        gestationalAgeLabel,
        sourceRole,
        reportedByUserId,
        reportedByName,
        facilityId,
        facilityName,
        alertCategory,
        severity: priority,
        priorityBasis,
        protocolReference,
        status: 'NEW',
        reportingSource: SOURCE_ROLE_LABELS[sourceRole],
        triggerTitle,
        symptomDescription,
        symptoms,
        vitalsSnapshot: {
          bp: typeof vitalsRaw.bp === 'string' && vitalsRaw.bp.trim() ? vitalsRaw.bp.trim() : '—',
          pulse: Number(vitalsRaw.pulse || 0),
          spo2: vitalsRaw.spo2 !== undefined && vitalsRaw.spo2 !== '' ? Number(vitalsRaw.spo2) : undefined,
          hemoglobin:
            vitalsRaw.hemoglobin !== undefined && vitalsRaw.hemoglobin !== ''
              ? Number(vitalsRaw.hemoglobin)
              : undefined,
          fetalHeartRate:
            vitalsRaw.fetalHeartRate !== undefined && vitalsRaw.fetalHeartRate !== ''
              ? Number(vitalsRaw.fetalHeartRate)
              : undefined,
          temperatureC:
            vitalsRaw.temperatureC !== undefined && vitalsRaw.temperatureC !== ''
              ? Number(vitalsRaw.temperatureC)
              : undefined,
        },
        submittedAtIso: submittedIso,
        timestamp: formattedNow,
        elapsedMinutes: 0,
        assignedHealthWorkerId,
        assignedHealthWorkerName,
        assignedHealthWorkerPhone: 'Not recorded in demo fixture',
        block,
        duplicateOfAlertId: null,
        duplicateSubmissionCount: 0,
        duplicateSubmissions: [],
        hospitalResponse: {},
        returnCommunication: {
          recipients: { mother: false, healthWorker: false, supervisor: false },
        },
        responseHistory: [
          {
            id: `resp-init-${Date.now()}`,
            timestamp: formattedNow,
            actorId: reportedByUserId,
            actor: reportedByName,
            role: SOURCE_ROLE_LABELS[sourceRole],
            action: 'Alert Submitted',
            nextStatus: 'NEW',
            note: symptomDescription,
          },
        ],
        operationId,
        isDemo: true,
      };

      demoAlertsStore = [newAlert, ...demoAlertsStore];
      demoLastSyncedAt = submittedIso;

      broadcastAlertEventToAuthorizedClients('demo', 'alert:created', newAlert, {
        lastSyncedAt: demoLastSyncedAt,
      });

      res.status(201).json({
        duplicatePreserved: false,
        alert: newAlert,
        lastSyncedAt: demoLastSyncedAt,
      });
      return;
    }

    // Firebase Integration Mode: Write strictly to emergencyAlerts via caller's verified Firebase ID token
    if (!caller.firebaseIdToken || !FIREBASE_PROJECT_ID || !FIREBASE_DATABASE_ID) {
      res.status(401).json({ error: 'Verified Firebase session required for live submission.' });
      return;
    }

    // Preserve duplicate linkage in Firebase mode as well — never silently discard
    const existingLive = await fetchLiveEmergencyAlertsFromFirestore(caller.firebaseIdToken, caller);
    const liveDuplicateParent = existingLive.permissionDenied
      ? undefined
      : findActiveDuplicateAlert(existingLive.alerts, motherId, alertCategory);

    const alertId = `EMRG-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const firestoreFields = {
      id: alertId,
      alertId,
      recordType: 'emergencyAlert',
      motherId,
      relatedMotherId: motherId,
      sourceRole,
      reportedByUserId,
      reportedByName,
      assignedHealthWorkerId,
      assignedHealthWorkerName,
      facilityId,
      hospitalId: facilityId,
      facilityCode: facilityId,
      facilityName,
      alertCategory,
      triggerTitle,
      symptomDescription,
      symptoms,
      vitals: vitalsRaw,
      priority,
      priorityBasis,
      protocolReference,
      submittedAt: submittedIso,
      status: 'NEW',
      duplicateOfAlertId: liveDuplicateParent ? liveDuplicateParent.id : null,
      duplicateSubmissionCount: 0,
      duplicateSubmissions: [],
      hospitalResponse: {},
      returnCommunication: {
        recipients: { mother: false, healthWorker: false, supervisor: false },
      },
      responseHistory: [
        {
          id: `resp-init-${Date.now()}`,
          timestamp: submittedIso,
          actorId: reportedByUserId,
          actor: reportedByName,
          role: SOURCE_ROLE_LABELS[sourceRole],
          action: 'Alert Submitted',
          nextStatus: 'NEW',
          note: symptomDescription,
        },
      ],
      owningUid: caller.uid,
      operationId,
      localRecordId: alertId,
      localRevision: 1,
      recordOrigin: 'online',
      syncState: 'synced',
      createdAt: submittedIso,
      updatedAt: submittedIso,
    };

    const writeUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      FIREBASE_PROJECT_ID
    )}/databases/${encodeURIComponent(
      FIREBASE_DATABASE_ID
    )}/documents/emergencyAlerts?documentId=${encodeURIComponent(alertId)}`;

    const encodedDoc = encodeFirestoreValue(firestoreFields) as { mapValue: { fields: Record<string, unknown> } };
    const writeResp = await fetch(writeUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${caller.firebaseIdToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: encodedDoc.mapValue.fields }),
    });

    if (!writeResp.ok) {
      const errText = await writeResp.text();
      res.status(writeResp.status === 403 ? 403 : 502).json({
        error:
          writeResp.status === 403
            ? 'Firestore security rules denied write to "emergencyAlerts". Deploy the additive security rule in JANMASAATHI_ALERT_CONTRACT.md.'
            : `Firestore write failed (HTTP ${writeResp.status}): ${errText.slice(0, 200)}`,
      });
      return;
    }

    const refreshed = await fetchLiveEmergencyAlertsFromFirestore(caller.firebaseIdToken, caller);
    const created = refreshed.alerts.find((a) => a.id === alertId);
    if (created) {
      broadcastAlertEventToAuthorizedClients('firebase', 'alert:created', created, {
        lastSyncedAt: new Date().toISOString(),
      });
    }
    res.status(201).json({
      alertId,
      alert: created ?? null,
      lastSyncedAt: new Date().toISOString(),
    });
  });

  // =========================================================================
  // 7. Authorized Hospital Triage Update (PATCH /api/alerts/:alertId)
  //    Enforces role authorization, critical non-auto-close, resolution summary,
  //    staff assignment, referral/treatment coordination, and return comms.
  // =========================================================================
  app.patch('/api/alerts/:alertId', async (req: Request, res: Response) => {
    const caller = await authenticateRequest(req);
    if (!caller) {
      res.status(401).json({ error: 'Authentication required to update alert status.' });
      return;
    }

    if (!canRoleManageAlerts(caller.role)) {
      res.status(403).json({
        error: `Unauthorized status change blocked: role "${caller.role}" is not authorized for hospital emergency triage actions.`,
      });
      return;
    }

    const alertId = String(req.params.alertId || '').trim();
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;

    if (caller.mode !== 'demo') {
      // In Firebase Integration Mode, client performs authenticated Firestore transaction & triggers SSE broadcast via this endpoint
      res.status(400).json({
        error: 'Live Firestore updates are executed directly via authenticated Firestore SDK transactions with security rules enforcement.',
      });
      return;
    }

    const existing = demoAlertsStore.find((a) => a.id === alertId);
    if (!existing) {
      res.status(404).json({ error: `Alert "${alertId}" not found.` });
      return;
    }
    if (!canAccessFacility(caller.allowedFacilityIds, existing.facilityId)) {
      res.status(403).json({
        error: `Facility scope restriction: your session is not authorized to modify alerts belonging to facility "${existing.facilityId}".`,
      });
      return;
    }

    const nextStatus =
      typeof body.status === 'string' && body.status.trim()
        ? normalizeWorkflowAlertStatus(body.status)
        : existing.status;

    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 1200) : '';
    const resolutionSummaryInput =
      typeof body.resolutionSummary === 'string' ? body.resolutionSummary.trim().slice(0, 1200) : '';
    const effectiveResolutionSummary =
      resolutionSummaryInput || existing.hospitalResponse.resolutionSummary || '';

    // Enforce clinical workflow safety rules when changing status
    if (nextStatus !== existing.status) {
      const check = validateAlertTransition({
        currentStatus: existing.status,
        nextStatus,
        priority: existing.severity,
        actorRole: caller.role,
        resolutionSummary: effectiveResolutionSummary,
        isAutomated: body.isAutomated === true,
      });
      if (!check.allowed) {
        res.status(400).json({ error: check.reason });
        return;
      }
    }

    const nowStr = nowDateTime();
    const nowIso = new Date().toISOString();

    const assignedStaffId =
      typeof body.assignedStaffId === 'string' && body.assignedStaffId.trim()
        ? body.assignedStaffId.trim().slice(0, 80)
        : existing.hospitalResponse.assignedStaffId;
    const assignedStaffName =
      typeof body.assignedStaffName === 'string' && body.assignedStaffName.trim()
        ? body.assignedStaffName.trim().slice(0, 100)
        : existing.hospitalResponse.assignedStaffName;
    const assignedStaffRole =
      typeof body.assignedStaffRole === 'string' && body.assignedStaffRole.trim()
        ? body.assignedStaffRole.trim().slice(0, 100)
        : existing.hospitalResponse.assignedStaffRole;

    const referralInput =
      body.referralCoordination && typeof body.referralCoordination === 'object'
        ? (body.referralCoordination as Partial<AlertReferralCoordination>)
        : null;

    const ALLOWED_TRANSPORT_STATUSES = [
      'Not Required',
      'Ambulance Requested',
      'Ambulance Dispatched',
      'In Transit',
      'Arrived',
    ] as const;

    const validatedTransportStatus =
      referralInput &&
      typeof referralInput.transportStatus === 'string' &&
      (ALLOWED_TRANSPORT_STATUSES as readonly string[]).includes(referralInput.transportStatus)
        ? (referralInput.transportStatus as AlertReferralCoordination['transportStatus'])
        : existing.hospitalResponse.referralCoordination?.transportStatus;

    const nextReferralCoordination: AlertReferralCoordination | undefined = referralInput
      ? {
          ...existing.hospitalResponse.referralCoordination,
          referralId:
            typeof referralInput.referralId === 'string'
              ? referralInput.referralId.trim().slice(0, 80)
              : existing.hospitalResponse.referralCoordination?.referralId,
          destinationFacility:
            typeof referralInput.destinationFacility === 'string'
              ? referralInput.destinationFacility.trim().slice(0, 140)
              : existing.hospitalResponse.referralCoordination?.destinationFacility,
          wardOrUnit:
            typeof referralInput.wardOrUnit === 'string'
              ? referralInput.wardOrUnit.trim().slice(0, 120)
              : existing.hospitalResponse.referralCoordination?.wardOrUnit,
          transportStatus: validatedTransportStatus,
          ambulanceRef:
            typeof referralInput.ambulanceRef === 'string'
              ? referralInput.ambulanceRef.trim().slice(0, 80)
              : existing.hospitalResponse.referralCoordination?.ambulanceRef,
          treatmentSummary:
            typeof referralInput.treatmentSummary === 'string'
              ? referralInput.treatmentSummary.trim().slice(0, 800)
              : existing.hospitalResponse.referralCoordination?.treatmentSummary,
          updatedAt: nowStr,
        }
      : existing.hospitalResponse.referralCoordination;

    const notifyRecipientsInput = Array.isArray(body.notifyRecipients)
      ? (body.notifyRecipients.filter((r) =>
          ['mother', 'health_worker', 'supervisor'].includes(String(r))
        ) as AlertSourceRole[])
      : (['mother', 'health_worker', 'supervisor'] as AlertSourceRole[]);

    const actionLabel =
      typeof body.actionLabel === 'string' && body.actionLabel.trim()
        ? body.actionLabel.trim().slice(0, 120)
        : nextStatus !== existing.status
        ? `Status Updated to ${nextStatus}`
        : assignedStaffName && assignedStaffName !== existing.hospitalResponse.assignedStaffName
        ? `Assigned Staff: ${assignedStaffName}`
        : referralInput
        ? 'Referral & Treatment Coordination Recorded'
        : 'Hospital Response Note Added';

    const statusMessage = formatReturnCommunicationMessage({
      alertId: existing.id,
      status: nextStatus,
      actorName: caller.name,
      facilityName: existing.facilityName,
      assignedStaffName,
      note: note || undefined,
      referralSummary: nextReferralCoordination?.treatmentSummary || nextReferralCoordination?.destinationFacility,
      resolutionSummary: nextStatus === 'RESOLVED' || nextStatus === 'CLOSED' ? effectiveResolutionSummary : undefined,
    });

    const historyEntry: AlertResponseEntry = {
      id: `resp-${Date.now()}`,
      timestamp: nowStr,
      actorId: caller.uid,
      actor: caller.name,
      role: caller.role,
      action: actionLabel,
      previousStatus: nextStatus !== existing.status ? existing.status : undefined,
      nextStatus: nextStatus !== existing.status ? nextStatus : undefined,
      assignedTo: assignedStaffName !== existing.hospitalResponse.assignedStaffName ? assignedStaffName : undefined,
      note: note || effectiveResolutionSummary || actionLabel,
      notifiedRecipients: notifyRecipientsInput,
    };

    const nextHospitalResponse = {
      ...existing.hospitalResponse,
      ...(nextStatus === 'ACKNOWLEDGED' && !existing.hospitalResponse.acknowledgedAt
        ? {
            acknowledgedAt: nowStr,
            acknowledgedById: caller.uid,
            acknowledgedByName: caller.name,
          }
        : {}),
      assignedStaffId,
      assignedStaffName,
      assignedStaffRole,
      referralCoordination: nextReferralCoordination,
      ...(effectiveResolutionSummary ? { resolutionSummary: effectiveResolutionSummary } : {}),
      ...(nextStatus === 'RESOLVED'
        ? {
            resolvedAt: nowStr,
            resolvedById: caller.uid,
            resolvedByName: caller.name,
          }
        : {}),
      ...(nextStatus === 'CLOSED'
        ? {
            closedAt: nowStr,
            closedById: caller.uid,
            closedByName: caller.name,
          }
        : {}),
    };

    const updated: EmergencyAlert = {
      ...existing,
      status: nextStatus,
      responseTimeMinutes:
        existing.responseTimeMinutes ??
        Math.max(1, Math.round((Date.now() - Date.parse(existing.submittedAtIso)) / 60000) || 1),
      hospitalResponse: nextHospitalResponse,
      returnCommunication: {
        lastDispatchedAt: nowStr,
        latestStatusMessage: statusMessage,
        linkedMessageId: `MSG-ALERT-${Date.now().toString().slice(-6)}`,
        recipients: {
          mother: existing.returnCommunication.recipients.mother || notifyRecipientsInput.includes('mother'),
          healthWorker:
            existing.returnCommunication.recipients.healthWorker ||
            notifyRecipientsInput.includes('health_worker'),
          supervisor:
            existing.returnCommunication.recipients.supervisor ||
            notifyRecipientsInput.includes('supervisor'),
        },
      },
      responseHistory: [...existing.responseHistory, historyEntry],
    };

    demoAlertsStore = demoAlertsStore.map((a) => (a.id === updated.id ? updated : a));
    demoLastSyncedAt = nowIso;

    broadcastAlertEventToAuthorizedClients('demo', 'alert:updated', updated, {
      lastSyncedAt: demoLastSyncedAt,
    });

    res.json({
      alert: updated,
      lastSyncedAt: demoLastSyncedAt,
    });
  });

  // =========================================================================
  // 8. Reset Demo Alerts (POST /api/demo/alerts/reset) — Hospital Demo Admin Only
  // =========================================================================
  app.post('/api/demo/alerts/reset', async (req: Request, res: Response) => {
    const caller = await authenticateRequest(req);
    if (!caller || caller.mode !== 'demo') {
      res.status(401).json({ error: 'Demo session required.' });
      return;
    }
    if (!canPerformMutation(caller.role, 'reset_demo')) {
      res.status(403).json({
        error: `Unauthorized reset blocked: role "${caller.role}" cannot reset demo alert fixtures.`,
      });
      return;
    }
    demoAlertsStore = createInitialDemoAlerts();
    demoLastSyncedAt = new Date().toISOString();
    broadcastResetToAuthorizedClients('demo', demoAlertsStore, demoLastSyncedAt);
    res.json({
      alerts: demoAlertsStore.filter((a) => canCallerViewAlert(a, caller)),
      lastSyncedAt: demoLastSyncedAt,
    });
  });

  // =========================================================================
  // Vite Dev Middleware or Production Static Bundle
  // =========================================================================
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      configFile: path.resolve(__dirname, '../frontend/vite.config.ts'),
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, '../dist');
    app.use(express.static(distDir, { maxAge: '1h', index: false }));
    app.get('*', (_req: Request, res: Response) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found. Run npm run build.');
      }
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `JanmaSaathi Hospital Dashboard server listening on http://0.0.0.0:${PORT} (${
        IS_PROD ? 'production' : 'development'
      })`
    );
  });

  // Graceful shutdown for Google Cloud Run (SIGTERM / SIGINT)
  const shutdown = (signal: string) => {
    clearInterval(heartbeatInterval);
    for (const [id, client] of sseClients.entries()) {
      try {
        client.res.end();
      } catch {
        // Ignore already-closed connections
      }
      sseClients.delete(id);
    }
    server.close(() => {
      console.log(`JanmaSaathi server shut down cleanly on ${signal}.`);
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 5000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('Failed to start JanmaSaathi server:', err);
  process.exit(1);
});
