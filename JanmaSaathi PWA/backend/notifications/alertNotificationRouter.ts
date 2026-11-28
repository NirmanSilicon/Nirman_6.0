import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import config from '../../firebase-applet-config.json' with { type: 'json' };

export type CanonicalRole = 'mother' | 'worker' | 'supervisor' | 'hospital_staff';

export type NotificationRecipientRole =
  | CanonicalRole
  | 'hospital'
  | 'facility';

export function normalizeHospitalRole(role: NotificationRecipientRole | string): CanonicalRole | null {
  if (role === 'hospital_staff' || role === 'hospital' || role === 'facility') {
    return 'hospital_staff';
  }
  if (role === 'mother' || role === 'worker' || role === 'supervisor') {
    return role;
  }
  return null;
}

export type DispatchEventType = 'alert_created' | 'status_updated' | 'escalated' | 'resolved';

export interface StoredFcmTokenEntry {
  tokenId: string;
  token: string;
  uid: string;
  role: NotificationRecipientRole;
  motherId?: string | null;
  staffId?: string | null;
  hospitalId?: string | null;
  browser?: string;
  enabled: boolean;
  updatedAtMs: number;
}

export interface AlertDispatchInput {
  alertId: string;
  eventType: DispatchEventType;
  motherId: string;
  assignedWorkerId: string;
  supervisorId?: string;
  raisedByRole: 'mother' | 'worker' | 'supervisor';
  raisedById: string;
  actorRole: 'mother' | 'worker' | 'supervisor' | 'hospital_staff' | 'hospital';
  actorId: string;
  targetHospitalId: string;
  escalationTargetHospitalId?: string | null;
  urgency: 'moderate' | 'urgent' | 'critical';
  status: string;
  eventTimestampMs: number;
}

export interface ComputedRecipients {
  hospitalIds: string[];
  workerIds: string[];
  motherIds: string[];
  supervisorIds: string[];
}

export interface SanitizedPushPayload {
  title: string;
  body: string;
  data: {
    alertId: string;
    eventType: DispatchEventType;
    urgency: string;
    status: string;
    targetHospitalId: string;
    targetRoute: string;
    timestampIso: string;
  };
}

export interface DispatchDeliveryResult {
  success: boolean;
  dispatchId: string;
  deduplicated: boolean;
  recipients: ComputedRecipients;
  sanitizedPayload: SanitizedPushPayload;
  matchedTokensCount: number;
  deliveredCount: number;
  failedCount: number;
  invalidTokensRemoved: number;
  attempts: number;
  pushStatus: 'dispatched' | 'no_registered_tokens' | 'fcm_iam_required' | 'deduplicated' | 'transient_failure';
  diagnosticMessage?: string;
}

const TOKEN_REGISTRY_PATH = path.join(os.tmpdir(), 'janmasaathi-fcm-tokens-v1.json');
const DISPATCH_LEDGER_PATH = path.join(os.tmpdir(), 'janmasaathi-alert-dispatch-ledger-v1.json');

interface DispatchLedgerEntry {
  dispatchId: string;
  alertId: string;
  eventType: DispatchEventType;
  dispatchedAtMs: number;
  pushStatus: DispatchDeliveryResult['pushStatus'];
  matchedTokensCount: number;
  deliveredCount: number;
}

function readTokenRegistry(): Record<string, StoredFcmTokenEntry> {
  try {
    if (fs.existsSync(TOKEN_REGISTRY_PATH)) {
      return JSON.parse(fs.readFileSync(TOKEN_REGISTRY_PATH, 'utf8')) || {};
    }
  } catch {
    // ignore
  }
  return {};
}

function writeTokenRegistry(registry: Record<string, StoredFcmTokenEntry>): void {
  try {
    fs.writeFileSync(TOKEN_REGISTRY_PATH, JSON.stringify(registry, null, 2), { mode: 0o600 });
  } catch {
    // ignore
  }
}

function readDispatchLedger(): Record<string, DispatchLedgerEntry> {
  try {
    if (fs.existsSync(DISPATCH_LEDGER_PATH)) {
      return JSON.parse(fs.readFileSync(DISPATCH_LEDGER_PATH, 'utf8')) || {};
    }
  } catch {
    // ignore
  }
  return {};
}

function writeDispatchLedger(ledger: Record<string, DispatchLedgerEntry>): void {
  try {
    const entries = Object.entries(ledger).slice(-500);
    fs.writeFileSync(DISPATCH_LEDGER_PATH, JSON.stringify(Object.fromEntries(entries), null, 2), {
      mode: 0o600,
    });
  } catch {
    // ignore
  }
}

export function upsertRegisteredToken(entry: StoredFcmTokenEntry): StoredFcmTokenEntry {
  const registry = readTokenRegistry();
  registry[entry.tokenId] = entry;
  writeTokenRegistry(registry);
  return entry;
}

export function removeRegisteredToken(params: {
  uid: string;
  tokenId?: string;
  token?: string;
}): boolean {
  const registry = readTokenRegistry();
  let removed = false;
  for (const [id, item] of Object.entries(registry)) {
    const matchesTarget =
      (params.tokenId && id === params.tokenId) ||
      (params.token && item.token === params.token);
    if (matchesTarget && item.uid === params.uid) {
      delete registry[id];
      removed = true;
    }
  }
  if (removed) writeTokenRegistry(registry);
  return removed;
}

function removeInvalidTokensByValue(invalidTokens: string[]): number {
  if (!invalidTokens.length) return 0;
  const invalidSet = new Set(invalidTokens);
  const registry = readTokenRegistry();
  let removed = 0;
  for (const [id, item] of Object.entries(registry)) {
    if (invalidSet.has(item.token)) {
      delete registry[id];
      removed += 1;
    }
  }
  if (removed > 0) writeTokenRegistry(registry);
  return removed;
}

/**
 * Strictly targeted role-based recipient calculation (never broadcasts globally).
 */
export function computeAlertNotificationRecipients(input: AlertDispatchInput): ComputedRecipients {
  const hospitalIds = new Set<string>();
  const workerIds = new Set<string>();
  const motherIds = new Set<string>();
  const supervisorIds = new Set<string>();

  if (input.targetHospitalId) {
    hospitalIds.add(input.targetHospitalId);
  }
  if (input.escalationTargetHospitalId) {
    hospitalIds.add(input.escalationTargetHospitalId);
  }

  const effectiveSupervisorId =
    typeof input.supervisorId === 'string' && input.supervisorId.trim()
      ? input.supervisorId.trim()
      : null;

  if (input.eventType === 'alert_created') {
    if (input.raisedByRole === 'mother') {
      if (input.assignedWorkerId) workerIds.add(input.assignedWorkerId);
      if (effectiveSupervisorId) supervisorIds.add(effectiveSupervisorId);
    } else if (input.raisedByRole === 'worker') {
      if (input.motherId) motherIds.add(input.motherId);
      if (effectiveSupervisorId) supervisorIds.add(effectiveSupervisorId);
    } else if (input.raisedByRole === 'supervisor') {
      if (input.assignedWorkerId) workerIds.add(input.assignedWorkerId);
      if (input.motherId) motherIds.add(input.motherId);
    }
  } else {
    // status_updated / escalated / resolved
    if (input.motherId) motherIds.add(input.motherId);
    if (input.assignedWorkerId) workerIds.add(input.assignedWorkerId);
    if (effectiveSupervisorId) supervisorIds.add(effectiveSupervisorId);
  }

  // Exclude the actor who triggered this exact event so they don't notify themselves
  const canonicalActorRole = normalizeHospitalRole(input.actorRole);
  if (canonicalActorRole === 'mother') motherIds.delete(input.actorId);
  if (canonicalActorRole === 'worker') workerIds.delete(input.actorId);
  if (canonicalActorRole === 'supervisor') supervisorIds.delete(input.actorId);
  if (canonicalActorRole === 'hospital_staff') hospitalIds.delete(input.actorId);

  return {
    hospitalIds: Array.from(hospitalIds),
    workerIds: Array.from(workerIds),
    motherIds: Array.from(motherIds),
    supervisorIds: Array.from(supervisorIds),
  };
}

/**
 * Strictly non-PII notification payload: zero mother name, phone, village, vitals, or clinical text.
 */
export function buildSanitizedPushPayload(input: AlertDispatchInput): SanitizedPushPayload {
  const title =
    input.eventType === 'escalated'
      ? 'JanmaSaathi Alert Escalated'
      : input.eventType === 'resolved' || input.eventType === 'status_updated'
      ? 'JanmaSaathi Alert Update'
      : 'JanmaSaathi Maternal Alert';

  const body =
    input.eventType === 'escalated'
      ? 'A maternal alert has been escalated for urgent hospital review.'
      : input.eventType === 'resolved' || input.eventType === 'status_updated'
      ? 'Maternal emergency alert status updated.'
      : 'New maternal health alert requires attention.';

  return {
    title,
    body,
    data: {
      alertId: input.alertId,
      eventType: input.eventType,
      urgency: input.urgency,
      status: input.status,
      targetHospitalId: input.escalationTargetHospitalId || input.targetHospitalId,
      targetRoute: `/?alertId=${encodeURIComponent(input.alertId)}`,
      timestampIso: new Date(input.eventTimestampMs).toISOString(),
    },
  };
}

function selectTargetTokens(recipients: ComputedRecipients): StoredFcmTokenEntry[] {
  const registry = readTokenRegistry();
  const matched: StoredFcmTokenEntry[] = [];
  const seenTokenValues = new Set<string>();

  for (const entry of Object.values(registry)) {
    if (!entry.enabled || !entry.token || seenTokenValues.has(entry.token)) continue;

    const canonicalRole = normalizeHospitalRole(entry.role);
    const isTarget =
      (canonicalRole === 'mother' && entry.motherId && recipients.motherIds.includes(entry.motherId)) ||
      (canonicalRole === 'worker' && entry.staffId && recipients.workerIds.includes(entry.staffId)) ||
      (canonicalRole === 'supervisor' &&
        entry.staffId &&
        recipients.supervisorIds.includes(entry.staffId)) ||
      (canonicalRole === 'hospital_staff' &&
        Boolean(entry.hospitalId) &&
        recipients.hospitalIds.includes(entry.hospitalId!));

    if (isTarget) {
      seenTokenValues.add(entry.token);
      matched.push(entry);
    }
  }

  return matched;
}

const TRANSIENT_FCM_ERROR_CODES = new Set([
  'messaging/internal-error',
  'messaging/server-unavailable',
  'messaging/unknown-error',
]);

const INVALID_FCM_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function dispatchEmergencyAlertNotification(
  input: AlertDispatchInput
): Promise<DispatchDeliveryResult> {
  const dispatchId = crypto
    .createHash('sha256')
    .update(`${input.alertId}|${input.eventType}|${input.eventTimestampMs}`)
    .digest('hex')
    .slice(0, 24);

  const recipients = computeAlertNotificationRecipients(input);
  const sanitizedPayload = buildSanitizedPushPayload(input);

  // Idempotency guard: never dispatch duplicate push notifications for the same alert event
  const ledger = readDispatchLedger();
  if (ledger[dispatchId]) {
    return {
      success: true,
      dispatchId,
      deduplicated: true,
      recipients,
      sanitizedPayload,
      matchedTokensCount: ledger[dispatchId].matchedTokensCount,
      deliveredCount: ledger[dispatchId].deliveredCount,
      failedCount: 0,
      invalidTokensRemoved: 0,
      attempts: 0,
      pushStatus: 'deduplicated',
    };
  }

  const targetTokens = selectTargetTokens(recipients);
  if (targetTokens.length === 0) {
    ledger[dispatchId] = {
      dispatchId,
      alertId: input.alertId,
      eventType: input.eventType,
      dispatchedAtMs: Date.now(),
      pushStatus: 'no_registered_tokens',
      matchedTokensCount: 0,
      deliveredCount: 0,
    };
    writeDispatchLedger(ledger);
    return {
      success: true,
      dispatchId,
      deduplicated: false,
      recipients,
      sanitizedPayload,
      matchedTokensCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      invalidTokensRemoved: 0,
      attempts: 0,
      pushStatus: 'no_registered_tokens',
    };
  }

  let attempts = 0;
  let remainingTokens = targetTokens.map((t) => t.token);
  let deliveredCount = 0;
  let failedCount = 0;
  const invalidTokensToRemove: string[] = [];

  try {
    const { initializeApp, getApps, getApp, applicationDefault } = await import('firebase-admin/app');
    const { getMessaging } = await import('firebase-admin/messaging');

    const adminApp =
      getApps().length > 0
        ? getApp()
        : initializeApp({
            credential: applicationDefault(),
            projectId: config.projectId,
          });
    const messaging = getMessaging(adminApp);

    const maxAttempts = 3;
    while (remainingTokens.length > 0 && attempts < maxAttempts) {
      attempts += 1;
      const response = await messaging.sendEachForMulticast({
        tokens: remainingTokens,
        notification: {
          title: sanitizedPayload.title,
          body: sanitizedPayload.body,
        },
        data: sanitizedPayload.data,
        webpush: {
          headers: {
            Urgency: input.urgency === 'critical' ? 'high' : 'normal',
          },
          notification: {
            title: sanitizedPayload.title,
            body: sanitizedPayload.body,
            icon: '/pwa-192x192.png',
            tag: input.alertId,
          },
          fcmOptions: {
            link: sanitizedPayload.data.targetRoute,
          },
        },
      });

      const retryableTokens: string[] = [];
      let iamDeniedError: string | null = null;

      response.responses.forEach((resp, idx) => {
        const tok = remainingTokens[idx];
        if (resp.success) {
          deliveredCount += 1;
        } else {
          const code = resp.error?.code || '';
          const msg = resp.error?.message || '';
          if (
            code === 'messaging/mismatched-credential' ||
            msg.includes('cloudmessaging.messages.create') ||
            msg.includes('PERMISSION_DENIED')
          ) {
            iamDeniedError = msg || code;
          } else if (INVALID_FCM_TOKEN_CODES.has(code)) {
            invalidTokensToRemove.push(tok);
            failedCount += 1;
          } else if (TRANSIENT_FCM_ERROR_CODES.has(code) && attempts < maxAttempts) {
            retryableTokens.push(tok);
          } else {
            failedCount += 1;
          }
        }
      });

      if (iamDeniedError) {
        const invalidRemoved = removeInvalidTokensByValue(invalidTokensToRemove);
        ledger[dispatchId] = {
          dispatchId,
          alertId: input.alertId,
          eventType: input.eventType,
          dispatchedAtMs: Date.now(),
          pushStatus: 'fcm_iam_required',
          matchedTokensCount: targetTokens.length,
          deliveredCount,
        };
        writeDispatchLedger(ledger);
        return {
          success: true,
          dispatchId,
          deduplicated: false,
          recipients,
          sanitizedPayload,
          matchedTokensCount: targetTokens.length,
          deliveredCount,
          failedCount: remainingTokens.length,
          invalidTokensRemoved: invalidRemoved,
          attempts,
          pushStatus: 'fcm_iam_required',
          diagnosticMessage:
            'FCM Admin send requires cloudmessaging.messages.create IAM permission on project outr-janmasaathi.',
        };
      }

      remainingTokens = retryableTokens;
      if (remainingTokens.length > 0 && attempts < maxAttempts) {
        await delay(attempts * 300);
      }
    }

    const invalidRemoved = removeInvalidTokensByValue(invalidTokensToRemove);
    const pushStatus: DispatchDeliveryResult['pushStatus'] =
      remainingTokens.length > 0 ? 'transient_failure' : 'dispatched';

    ledger[dispatchId] = {
      dispatchId,
      alertId: input.alertId,
      eventType: input.eventType,
      dispatchedAtMs: Date.now(),
      pushStatus,
      matchedTokensCount: targetTokens.length,
      deliveredCount,
    };
    writeDispatchLedger(ledger);

    return {
      success: true,
      dispatchId,
      deduplicated: false,
      recipients,
      sanitizedPayload,
      matchedTokensCount: targetTokens.length,
      deliveredCount,
      failedCount: failedCount + remainingTokens.length,
      invalidTokensRemoved: invalidRemoved,
      attempts,
      pushStatus,
    };
  } catch (err: any) {
    const msg = String(err?.message || err || '');
    const isIam =
      msg.includes('cloudmessaging.messages.create') ||
      msg.includes('PERMISSION_DENIED') ||
      err?.code === 'messaging/mismatched-credential';

    return {
      success: true,
      dispatchId,
      deduplicated: false,
      recipients,
      sanitizedPayload,
      matchedTokensCount: targetTokens.length,
      deliveredCount,
      failedCount: targetTokens.length,
      invalidTokensRemoved: 0,
      attempts,
      pushStatus: isIam ? 'fcm_iam_required' : 'transient_failure',
      diagnosticMessage: isIam
        ? 'FCM Admin send requires cloudmessaging.messages.create IAM permission on project outr-janmasaathi.'
        : msg,
    };
  }
}
