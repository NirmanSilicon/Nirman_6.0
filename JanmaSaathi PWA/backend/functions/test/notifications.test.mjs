import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const functionsModule = require('../lib/index.js');

const {
  PROJECT_ID,
  NAMED_DATABASE_ID,
  FUNCTIONS_REGION,
  NOTIFIER_SERVICE_ACCOUNT,
  normalizeRole,
  buildDispatchId,
  resolveDynamicSupervisorId,
  resolveRecipients,
  buildNonPiiPayload,
  collectAuthorizedTokens,
  processAlertDispatch,
  classifyAlertUpdate,
  onEmergencyAlertCreated,
  onEmergencyAlertUpdated,
} = functionsModule;

function createFakeDb({
  healthWorkers = {},
  mothers = {},
  groupTokens = [],
  rootTokens = [],
  existingDeliveries = {},
} = {}) {
  const deliveries = new Map(Object.entries(existingDeliveries));
  const deletedTokenIds = [];

  const makeTokenSnap = (doc) => ({
    id: doc.id,
    data: () => doc.data,
    ref: {
      delete: async () => {
        deletedTokenIds.push(doc.id);
      },
    },
  });

  const db = {
    collection(name) {
      return {
        doc(docId) {
          if (name === 'healthWorkers') {
            return {
              async get() {
                const data = healthWorkers[docId];
                return { exists: Boolean(data), data: () => data };
              },
            };
          }
          if (name === 'mothers') {
            return {
              async get() {
                const data = mothers[docId];
                return { exists: Boolean(data), data: () => data };
              },
            };
          }
          if (name === 'alertNotificationDeliveries') {
            return {
              id: docId,
              async update(patch) {
                const current = deliveries.get(docId) || {};
                deliveries.set(docId, { ...current, ...patch });
              },
            };
          }
          throw new Error(`Unexpected collection: ${name}`);
        },
        where(field, op, value) {
          assert.equal(name, 'fcmTokens');
          assert.equal(field, 'enabled');
          assert.equal(op, '==');
          return {
            async get() {
              const filtered = rootTokens.filter((t) => t.data.enabled === value);
              return { docs: filtered.map(makeTokenSnap) };
            },
          };
        },
      };
    },
    collectionGroup(name) {
      assert.equal(name, 'fcmTokens');
      return {
        where(field, op, value) {
          assert.equal(field, 'enabled');
          assert.equal(op, '==');
          return {
            async get() {
              const filtered = groupTokens.filter((t) => t.data.enabled === value);
              return { docs: filtered.map(makeTokenSnap) };
            },
          };
        },
      };
    },
    async runTransaction(callback) {
      const tx = {
        async get(ref) {
          const existing = deliveries.get(ref.id);
          return { exists: Boolean(existing), data: () => existing };
        },
        set(ref, data) {
          deliveries.set(ref.id, { ...data });
        },
      };
      return callback(tx);
    },
  };

  return { db, deliveries, deletedTokenIds };
}

test('Trigger metadata attaches dedicated notifier service account and named database without sandbox/key credentials', () => {
  assert.equal(PROJECT_ID, 'outr-janmasaathi');
  assert.equal(
    NAMED_DATABASE_ID,
    'ai-studio-janmasaathi-8e8b2a1f-7b17-42e6-bc8e-284c5c28d2df'
  );
  assert.equal(FUNCTIONS_REGION, 'asia-south1');
  assert.equal(
    NOTIFIER_SERVICE_ACCOUNT,
    'janmasaathi-notifier@outr-janmasaathi.iam.gserviceaccount.com'
  );

  for (const [fnName, fn, expectedEventType] of [
    [
      'onEmergencyAlertCreated',
      onEmergencyAlertCreated,
      'google.cloud.firestore.document.v1.created',
    ],
    [
      'onEmergencyAlertUpdated',
      onEmergencyAlertUpdated,
      'google.cloud.firestore.document.v1.updated',
    ],
  ]) {
    const endpoint = fn.__endpoint;
    assert.ok(endpoint, `${fnName} must expose __endpoint metadata`);
    assert.equal(endpoint.platform, 'gcfv2', `${fnName} must be Cloud Functions v2`);
    assert.deepEqual(endpoint.region, ['asia-south1'], `${fnName} region mismatch`);
    assert.equal(
      endpoint.serviceAccountEmail,
      'janmasaathi-notifier@outr-janmasaathi.iam.gserviceaccount.com',
      `${fnName} serviceAccountEmail mismatch`
    );
    assert.equal(
      endpoint.eventTrigger.eventType,
      expectedEventType,
      `${fnName} eventType mismatch`
    );
    assert.equal(
      endpoint.eventTrigger.eventFilters.database,
      'ai-studio-janmasaathi-8e8b2a1f-7b17-42e6-bc8e-284c5c28d2df',
      `${fnName} must target named Firestore database`
    );
    assert.equal(
      endpoint.eventTrigger.eventFilterPathPatterns.document,
      'emergencyAlerts/{alertId}',
      `${fnName} must target emergencyAlerts/{alertId}`
    );
  }

  const srcText = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.ts'), 'utf8');
  assert.equal(srcText.includes('ais-sandbox'), false, 'Must not reference AI Studio sandbox SA');
  assert.equal(srcText.includes('BEGIN PRIVATE KEY'), false, 'Must not embed private keys');
  assert.equal(srcText.includes('CANONICAL_SUPERVISOR_ID'), false, 'Must not hard-code universal supervisor');
});

test('Dynamic supervisor resolution avoids universal fallback and respects assignment relationships', async () => {
  const { db } = createFakeDb({
    healthWorkers: {
      'HW-777': { supervisorId: 'SUP-BLOCK-2' },
    },
    mothers: {
      'MCP-888': { supervisorId: 'SUP-MOTHER-3' },
    },
  });

  // 1. Explicit supervisorId on alert wins
  const explicitSup = await resolveDynamicSupervisorId(
    {
      id: 'ALT-1',
      motherId: 'MCP-888',
      assignedWorkerId: 'HW-777',
      supervisorId: 'SUP-ALERT-1',
      raisedByRole: 'mother',
      raisedById: 'MCP-888',
      targetHospitalId: 'HOSP-RAMPUR-PHC',
      urgency: 'urgent',
      status: 'pending_acknowledgement',
      createdAtMs: 1000,
      updatedAtMs: 1000,
    },
    db
  );
  assert.equal(explicitSup, 'SUP-ALERT-1');

  // 2. Falls back to healthWorkers/{assignedWorkerId}.supervisorId when missing on alert
  const workerSup = await resolveDynamicSupervisorId(
    {
      id: 'ALT-2',
      motherId: 'MCP-888',
      assignedWorkerId: 'HW-777',
      raisedByRole: 'mother',
      raisedById: 'MCP-888',
      targetHospitalId: 'HOSP-RAMPUR-PHC',
      urgency: 'urgent',
      status: 'pending_acknowledgement',
      createdAtMs: 1000,
      updatedAtMs: 1000,
    },
    db
  );
  assert.equal(workerSup, 'SUP-BLOCK-2');

  // 3. Falls back to mothers/{motherId}.supervisorId when worker lacks supervisorId
  const motherSup = await resolveDynamicSupervisorId(
    {
      id: 'ALT-3',
      motherId: 'MCP-888',
      assignedWorkerId: 'HW-UNLINKED',
      raisedByRole: 'worker',
      raisedById: 'HW-UNLINKED',
      targetHospitalId: 'HOSP-RAMPUR-PHC',
      urgency: 'urgent',
      status: 'pending_acknowledgement',
      createdAtMs: 1000,
      updatedAtMs: 1000,
    },
    db
  );
  assert.equal(motherSup, 'SUP-MOTHER-3');

  // 4. Unlinked alert returns null (NEVER falls back to universal SUP-2025-012)
  const unlinkedSup = await resolveDynamicSupervisorId(
    {
      id: 'ALT-4',
      motherId: 'MCP-UNLINKED',
      assignedWorkerId: 'HW-UNLINKED',
      raisedByRole: 'mother',
      raisedById: 'MCP-UNLINKED',
      targetHospitalId: 'HOSP-RAMPUR-PHC',
      urgency: 'urgent',
      status: 'pending_acknowledgement',
      createdAtMs: 1000,
      updatedAtMs: 1000,
    },
    db
  );
  assert.equal(unlinkedSup, null);
});

test('Recipient routing excludes triggering actor, respects facility escalation, and isolates unauthorized users', async () => {
  const baseAlert = {
    id: 'ALT-ROUTE-1',
    motherId: 'MCP-101',
    assignedWorkerId: 'HW-101',
    supervisorId: 'SUP-101',
    raisedByRole: 'mother',
    raisedById: 'MCP-101',
    targetHospitalId: 'HOSP-RAMPUR-PHC',
    escalationTargetHospitalId: null,
    urgency: 'critical',
    status: 'pending_acknowledgement',
    createdAtMs: 1000,
    updatedAtMs: 1000,
  };

  // Mother creates alert -> notifies target hospital, assigned worker, assigned supervisor (NOT mother)
  const motherCreated = resolveRecipients(baseAlert, 'alert_created', 'mother', {
    resolvedSupervisorId: 'SUP-101',
    actorId: 'MCP-101',
  });
  assert.deepEqual([...motherCreated.hospitalIds], ['HOSP-RAMPUR-PHC']);
  assert.deepEqual([...motherCreated.workerIds], ['HW-101']);
  assert.deepEqual([...motherCreated.supervisorIds], ['SUP-101']);
  assert.deepEqual([...motherCreated.motherIds], []);

  // Worker creates alert -> notifies hospital, mother, supervisor (NOT worker)
  const workerCreated = resolveRecipients(
    { ...baseAlert, raisedByRole: 'worker', raisedById: 'HW-101' },
    'alert_created',
    'worker',
    { resolvedSupervisorId: 'SUP-101', actorId: 'HW-101' }
  );
  assert.deepEqual([...workerCreated.hospitalIds], ['HOSP-RAMPUR-PHC']);
  assert.deepEqual([...workerCreated.motherIds], ['MCP-101']);
  assert.deepEqual([...workerCreated.supervisorIds], ['SUP-101']);
  assert.deepEqual([...workerCreated.workerIds], []);

  // Hospital escalates from PHC to District Hospital -> notifies DH, mother, worker, supervisor (NOT PHC)
  const hospitalEscalated = resolveRecipients(
    {
      ...baseAlert,
      escalated: true,
      status: 'escalated',
      escalationTargetHospitalId: 'HOSP-KHORDHA-DH',
    },
    'escalated',
    'hospital_staff',
    { resolvedSupervisorId: 'SUP-101' }
  );
  assert.deepEqual([...hospitalEscalated.hospitalIds], ['HOSP-KHORDHA-DH']);
  assert.deepEqual([...hospitalEscalated.motherIds], ['MCP-101']);
  assert.deepEqual([...hospitalEscalated.workerIds], ['HW-101']);
  assert.deepEqual([...hospitalEscalated.supervisorIds], ['SUP-101']);

  // No supervisor assigned -> supervisorIds remains empty
  const noSupCreated = resolveRecipients(
    { ...baseAlert, supervisorId: undefined },
    'alert_created',
    'mother',
    { resolvedSupervisorId: null, actorId: 'MCP-101' }
  );
  assert.deepEqual([...noSupCreated.supervisorIds], []);

  // Token collection filters strictly by authorized recipient sets and deduplicates tokens
  const { db } = createFakeDb({
    groupTokens: [
      {
        id: 'TOK-HOSP-TARGET',
        data: {
          token: 'fcm-hosp-phc-1',
          uid: 'u-hosp-1',
          role: 'hospital', // legacy hospital role normalized to hospital_staff
          hospitalId: 'HOSP-RAMPUR-PHC',
          enabled: true,
        },
      },
      {
        id: 'TOK-HOSP-OTHER',
        data: {
          token: 'fcm-hosp-chc-unauthorized',
          uid: 'u-hosp-2',
          role: 'hospital_staff',
          hospitalId: 'HOSP-PIPILI-CHC',
          enabled: true,
        },
      },
      {
        id: 'TOK-WORKER-TARGET',
        data: {
          token: 'fcm-worker-101',
          uid: 'u-worker-1',
          role: 'worker',
          staffId: 'HW-101',
          enabled: true,
        },
      },
      {
        id: 'TOK-SUP-OTHER',
        data: {
          token: 'fcm-sup-2025-012-unauthorized',
          uid: 'u-sup-other',
          role: 'supervisor',
          staffId: 'SUP-2025-012',
          enabled: true,
        },
      },
      {
        id: 'TOK-DISABLED',
        data: {
          token: 'fcm-worker-disabled',
          uid: 'u-worker-2',
          role: 'worker',
          staffId: 'HW-101',
          enabled: false,
        },
      },
    ],
    rootTokens: [
      {
        id: 'TOK-HOSP-DUP',
        data: {
          token: 'fcm-hosp-phc-1', // duplicate value across subcollection and root collection
          uid: 'u-hosp-1',
          role: 'facility',
          hospitalId: 'HOSP-RAMPUR-PHC',
          enabled: true,
        },
      },
      {
        id: 'TOK-SUP-TARGET',
        data: {
          token: 'fcm-sup-101',
          uid: 'u-sup-101',
          role: 'supervisor',
          staffId: 'SUP-101',
          enabled: true,
        },
      },
    ],
  });

  const authorizedTokens = await collectAuthorizedTokens(motherCreated, db);
  assert.deepEqual(
    authorizedTokens.map((t) => t.token).sort(),
    ['fcm-hosp-phc-1', 'fcm-sup-101', 'fcm-worker-101']
  );
  assert.equal(normalizeRole('hospital'), 'hospital_staff');
  assert.equal(normalizeRole('facility'), 'hospital_staff');
});

test('processAlertDispatch enforces atomic idempotency, sends zero-PII payloads, and prunes stale FCM tokens', async () => {
  const { db, deliveries, deletedTokenIds } = createFakeDb({
    healthWorkers: {
      'HW-44120': { supervisorId: 'SUP-DISTRICT-9' },
    },
    groupTokens: [
      {
        id: 'TOK-VALID-HOSP',
        data: {
          token: 'valid-hosp-token-1234567890',
          uid: 'uid-hosp',
          role: 'hospital_staff',
          hospitalId: 'HOSP-KHORDHA-DH',
          enabled: true,
        },
      },
      {
        id: 'TOK-STALE-SUP',
        data: {
          token: 'stale-sup-token-1234567890',
          uid: 'uid-sup',
          role: 'supervisor',
          staffId: 'SUP-DISTRICT-9',
          enabled: true,
        },
      },
    ],
  });

  const sentMessages = [];
  const messaging = {
    async sendEachForMulticast(message) {
      sentMessages.push(message);
      return {
        successCount: 1,
        failureCount: 1,
        responses: [
          { success: true, messageId: 'msg-1' },
          {
            success: false,
            error: { code: 'messaging/registration-token-not-registered' },
          },
        ],
      };
    },
  };

  const alert = {
    id: 'ALT-IDEMP-99',
    motherId: 'MCP-2026-0894',
    motherName: 'Priya Sharma Sensitive PII',
    motherPhone: '9999999999',
    village: 'Rampur Secret Hamlet',
    assignedWorkerId: 'HW-44120',
    raisedByRole: 'worker',
    raisedById: 'HW-44120',
    targetHospitalId: 'HOSP-KHORDHA-DH',
    urgency: 'critical',
    status: 'pending_acknowledgement',
    createdAtMs: 1795621899450,
    updatedAtMs: 1795621899450,
  };

  // Non-PII check
  const previewPayload = buildNonPiiPayload(alert, 'alert_created', alert.createdAtMs);
  const serializedPayload = JSON.stringify(previewPayload);
  assert.equal(serializedPayload.includes('Priya Sharma'), false);
  assert.equal(serializedPayload.includes('9999999999'), false);
  assert.equal(serializedPayload.includes('Rampur Secret Hamlet'), false);

  // First dispatch succeeds
  const firstResult = await processAlertDispatch(
    alert,
    'alert_created',
    'worker',
    alert.createdAtMs,
    { actorId: 'HW-44120', deps: { db, messaging } }
  );

  const expectedDispatchId = buildDispatchId(alert.id, 'alert_created', alert.createdAtMs);
  assert.equal(firstResult.dispatchId, expectedDispatchId);
  assert.equal(firstResult.deduplicated, false);
  assert.equal(firstResult.status, 'dispatched');
  assert.equal(firstResult.targetRecipientsCount, 2);
  assert.equal(firstResult.deliveredCount, 1);
  assert.equal(firstResult.failedCount, 1);
  assert.equal(firstResult.staleTokensRemovedCount, 1);
  assert.equal(sentMessages.length, 1);
  assert.deepEqual(deletedTokenIds, ['TOK-STALE-SUP']);

  const storedAudit = deliveries.get(expectedDispatchId);
  assert.equal(storedAudit.status, 'dispatched');
  assert.equal(storedAudit.deliveredCount, 1);
  assert.equal(storedAudit.staleTokensRemovedCount, 1);

  // Duplicate dispatch with identical alertId + eventType + timestampMs is deduplicated
  const duplicateResult = await processAlertDispatch(
    alert,
    'alert_created',
    'worker',
    alert.createdAtMs,
    { actorId: 'HW-44120', deps: { db, messaging } }
  );
  assert.equal(duplicateResult.deduplicated, true);
  assert.equal(duplicateResult.status, 'deduplicated');
  assert.equal(sentMessages.length, 1, 'Duplicate dispatch must not resend FCM');
});

test('classifyAlertUpdate detects status, escalation, and hospitalUpdate transitions', () => {
  const before = {
    id: 'ALT-UPD-1',
    motherId: 'MCP-1',
    assignedWorkerId: 'HW-1',
    raisedByRole: 'mother',
    raisedById: 'MCP-1',
    targetHospitalId: 'HOSP-RAMPUR-PHC',
    escalationTargetHospitalId: null,
    urgency: 'urgent',
    status: 'pending_acknowledgement',
    escalated: false,
    createdAtMs: 1000,
    updatedAtMs: 1000,
    hospitalUpdates: [],
  };

  // No meaningful notification transition
  const noChange = classifyAlertUpdate(before, { ...before, updatedAtMs: 1500 });
  assert.equal(noChange.shouldDispatch, false);

  // Escalation to District Hospital
  const escalated = classifyAlertUpdate(before, {
    ...before,
    status: 'escalated',
    escalated: true,
    escalationTargetHospitalId: 'HOSP-KHORDHA-DH',
    updatedAtMs: 2000,
    hospitalUpdates: [
      {
        actorRole: 'hospital',
        actorHospitalId: 'HOSP-RAMPUR-PHC',
        status: 'escalated',
      },
    ],
  });
  assert.equal(escalated.shouldDispatch, true);
  assert.equal(escalated.eventType, 'escalated');
  assert.equal(escalated.actorRole, 'hospital_staff');
  assert.equal(escalated.actorHospitalId, 'HOSP-RAMPUR-PHC');
});
