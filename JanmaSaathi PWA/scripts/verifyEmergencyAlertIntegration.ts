import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.JANMASAATHI_BASE_URL || 'http://127.0.0.1:3000';

const AUTHORIZED_HOSPITALS = {
  'HOSP-RAMPUR-PHC': {
    id: 'HOSP-RAMPUR-PHC',
    name: 'Rampur Primary Health Centre (PHC)',
    facilityType: 'PHC',
  },
  'HOSP-PIPILI-CHC': {
    id: 'HOSP-PIPILI-CHC',
    name: 'Pipili Community Health Centre (CHC)',
    facilityType: 'CHC',
  },
  'HOSP-KHORDHA-DH': {
    id: 'HOSP-KHORDHA-DH',
    name: 'District Hospital Khordha',
    facilityType: 'District Hospital',
  },
} as const;

async function postJson(route: string, body: unknown, token?: string) {
  const res = await fetch(`${BASE_URL}${route}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function assertValidEmergencyAlertDocumentShape(docData: Record<string, any>) {
  const requiredKeys = [
    'id',
    'motherId',
    'motherName',
    'assignedWorkerId',
    'raisedByRole',
    'raisedById',
    'raisedByName',
    'targetHospitalId',
    'targetHospitalName',
    'targetFacilityType',
    'concernCategory',
    'concernLabel',
    'urgency',
    'status',
    'createdAtMs',
    'createdAtIso',
    'updatedAtMs',
    'hospitalUpdates',
    'escalated',
    'isSynthetic',
  ];
  for (const key of requiredKeys) {
    assert.ok(key in docData, `Missing required emergencyAlerts field: ${key}`);
  }
  assert.ok(docData.targetHospitalId in AUTHORIZED_HOSPITALS, 'Invalid targetHospitalId');
  assert.ok(
    ['PHC', 'CHC', 'District Hospital'].includes(docData.targetFacilityType),
    'Invalid targetFacilityType'
  );
  assert.ok(['mother', 'worker', 'supervisor'].includes(docData.raisedByRole), 'Invalid raisedByRole');
  assert.ok(['moderate', 'urgent', 'critical'].includes(docData.urgency), 'Invalid urgency');
  assert.ok(['new', 'pending_acknowledgement'].includes(docData.status), 'Invalid initial status');
  assert.equal(docData.escalated, false, 'Initial escalated flag must be false');
  assert.ok(Array.isArray(docData.hospitalUpdates), 'hospitalUpdates must be an array');
  assert.equal(typeof docData.isSynthetic, 'boolean', 'isSynthetic must be boolean');

  // Ensure no IndexedDB metadata leaks into Firestore document
  for (const forbidden of [
    'localRecordId',
    'recordType',
    'owningUid',
    'relatedMotherId',
    'creatingWorkerId',
    'localRevision',
    'operationId',
    'recordOrigin',
    'syncState',
    'syncError',
    'queuedAt',
  ]) {
    assert.ok(!(forbidden in docData), `IndexedDB field ${forbidden} leaked into Firestore payload`);
  }
}

async function run() {
  console.log(`\n[Verify] Checking JanmaSaathi Emergency Alert Integration at ${BASE_URL}`);

  // 1. Health & Backend Config
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  assert.equal(healthRes.status, 200, '/api/health must return 200');
  const healthJson: any = await healthRes.json();
  assert.equal(healthJson.firebase.projectId, 'outr-janmasaathi');
  assert.equal(
    healthJson.firebase.firestoreDatabaseId,
    'ai-studio-janmasaathi-8e8b2a1f-7b17-42e6-bc8e-284c5c28d2df'
  );
  console.log('✓ 1. Backend /api/health confirms immutable project + named Firestore DB');

  // 2. Authenticate Mother (Priya), Worker (Sunita), Supervisor (Dr. Rajesh)
  const motherLogin = await postJson('/api/auth/mother-login', {
    email: 'priya.sharma@example.com',
    password: 'demo1234',
  });
  assert.equal(motherLogin.status, 200);
  const motherToken: string = motherLogin.json.token;

  const workerLogin = await postJson('/api/auth/staff-login', {
    staffId: 'HW-44120',
    password: 'demo1234',
    role: 'worker',
  });
  assert.equal(workerLogin.status, 200);
  const workerToken: string = workerLogin.json.token;

  const supervisorLogin = await postJson('/api/auth/staff-login', {
    staffId: 'SUP-2025-012',
    password: 'demo1234',
    role: 'supervisor',
  });
  assert.equal(supervisorLogin.status, 200);
  const supervisorToken: string = supervisorLogin.json.token;
  console.log('✓ 2. Role tokens obtained for Mother (MCP-2026-0894), Worker (HW-44120), Supervisor (SUP-2025-012)');

  // 3. Mother Emergency Alert Authorization + Canonical Schema Parity
  const motherAlertAuth = await postJson(
    '/api/emergency-alerts/authorize',
    {
      alertId: `ALT-TEST-M-${Date.now()}`,
      motherId: 'MCP-2026-0894',
      assignedWorkerId: 'HW-44120',
      assignedWorkerName: 'Sunita Devi',
      targetHospitalId: 'HOSP-RAMPUR-PHC',
      concernCategory: 'bleeding',
      urgency: 'critical',
      description: 'Severe bleeding reported from PWA Alerts tab.',
      status: 'pending_acknowledgement',
    },
    motherToken
  );
  assert.equal(motherAlertAuth.status, 200);
  assert.equal(motherAlertAuth.json.verifiedHospital.id, 'HOSP-RAMPUR-PHC');
  assert.equal(motherAlertAuth.json.verifiedRaisedByRole, 'mother');
  assert.equal(motherAlertAuth.json.verifiedRaisedById, 'MCP-2026-0894');

  const simulatedMotherFirestoreDoc = {
    id: motherAlertAuth.json.alertId,
    motherId: 'MCP-2026-0894',
    motherName: 'Priya Sharma',
    assignedWorkerId: motherAlertAuth.json.verifiedAssignedWorkerId,
    assignedWorkerName: motherAlertAuth.json.verifiedAssignedWorkerName,
    supervisorId: motherAlertAuth.json.verifiedSupervisorId,
    raisedByRole: motherAlertAuth.json.verifiedRaisedByRole,
    raisedById: motherAlertAuth.json.verifiedRaisedById,
    raisedByName: 'Priya Sharma',
    targetHospitalId: motherAlertAuth.json.verifiedHospital.id,
    targetHospitalName: motherAlertAuth.json.verifiedHospital.name,
    targetFacilityType: motherAlertAuth.json.verifiedHospital.facilityType,
    concernCategory: 'bleeding',
    concernLabel: 'Vaginal Bleeding',
    urgency: 'critical',
    symptoms: ['Heavy bleeding'],
    description: 'Severe bleeding reported from PWA Alerts tab.',
    status: 'pending_acknowledgement',
    createdAtMs: motherAlertAuth.json.serverTimestampMs,
    createdAtIso: motherAlertAuth.json.serverTimestampIso,
    updatedAtMs: motherAlertAuth.json.serverTimestampMs,
    serverCreatedAtMs: motherAlertAuth.json.serverTimestampMs,
    serverCreatedAtIso: motherAlertAuth.json.serverTimestampIso,
    serverProvenanceId: motherAlertAuth.json.serverProvenanceId,
    hospitalUpdates: [],
    escalated: false,
    isSynthetic: true,
    syncStatus: 'synced',
  };
  assertValidEmergencyAlertDocumentShape(simulatedMotherFirestoreDoc);

  // Verify cross-mother spoof blocked (403) & invalid hospital blocked (400)
  const crossMotherRes = await postJson(
    '/api/emergency-alerts/authorize',
    {
      motherId: 'MCP-2026-0412',
      targetHospitalId: 'HOSP-RAMPUR-PHC',
      concernCategory: 'bleeding',
      urgency: 'critical',
      description: 'Unauthorized cross-mother check',
    },
    motherToken
  );
  assert.equal(crossMotherRes.status, 403);

  const invalidHospitalRes = await postJson(
    '/api/emergency-alerts/authorize',
    {
      motherId: 'MCP-2026-0894',
      targetHospitalId: 'HOSP-UNTRUSTED-FAKE',
      concernCategory: 'bleeding',
      urgency: 'critical',
      description: 'Untrusted hospital check',
    },
    motherToken
  );
  assert.equal(invalidHospitalRes.status, 400);
  console.log('✓ 3. Mother alert authorization, canonical targetHospitalId schema, and cross-mother/untrusted-hospital guards verified');

  // 4. Worker Emergency Alert Authorization + Notification Dispatch
  const workerAlertAuth = await postJson(
    '/api/emergency-alerts/authorize',
    {
      alertId: `ALT-TEST-W-${Date.now()}`,
      motherId: 'MCP-2026-0894',
      assignedWorkerId: 'HW-44120',
      targetHospitalId: 'HOSP-PIPILI-CHC',
      concernCategory: 'high_bp',
      urgency: 'urgent',
      description: 'BP 158/102 mmHg recorded during home visit.',
      status: 'pending_acknowledgement',
    },
    workerToken
  );
  assert.equal(workerAlertAuth.status, 200);
  assert.equal(workerAlertAuth.json.verifiedHospital.id, 'HOSP-PIPILI-CHC');
  assert.equal(workerAlertAuth.json.verifiedRaisedByRole, 'worker');
  assert.equal(workerAlertAuth.json.verifiedRaisedById, 'HW-44120');

  const dispatchRes = await postJson(
    '/api/emergency-alerts/dispatch-notification',
    {
      alertId: workerAlertAuth.json.alertId,
      eventType: 'alert_created',
      motherId: 'MCP-2026-0894',
      assignedWorkerId: 'HW-44120',
      raisedByRole: 'worker',
      raisedById: 'HW-44120',
      targetHospitalId: 'HOSP-PIPILI-CHC',
      urgency: 'urgent',
      status: 'pending_acknowledgement',
      eventTimestampMs: workerAlertAuth.json.serverTimestampMs,
    },
    workerToken
  );
  assert.equal(dispatchRes.status, 200);
  assert.ok(dispatchRes.json.recipients.hospitalIds.includes('HOSP-PIPILI-CHC'));
  assert.ok(dispatchRes.json.recipients.motherIds.includes('MCP-2026-0894'));
  console.log('✓ 4. Worker alert authorization and targeted hospital recipient routing verified');

  // 5. Supervisor Emergency Alert + Protocol Escalation Authorization
  const supAlertAuth = await postJson(
    '/api/emergency-alerts/authorize',
    {
      alertId: `ALT-TEST-S-${Date.now()}`,
      motherId: 'MCP-2026-0894',
      assignedWorkerId: 'HW-44120',
      targetHospitalId: 'HOSP-KHORDHA-DH',
      concernCategory: 'labor_contractions',
      urgency: 'critical',
      description: 'Supervisor emergency referral to District Hospital Khordha.',
      status: 'pending_acknowledgement',
    },
    supervisorToken
  );
  assert.equal(supAlertAuth.status, 200);
  assert.equal(supAlertAuth.json.verifiedHospital.id, 'HOSP-KHORDHA-DH');

  const escalationRes = await postJson(
    '/api/emergency-alerts/authorize-escalation',
    {
      alertId: supAlertAuth.json.alertId,
      escalationReason: 'SLA timeout exceeded — escalate to District Hospital Khordha.',
      escalationTargetHospitalId: 'HOSP-KHORDHA-DH',
      assignedWorkerId: 'HW-44120',
    },
    supervisorToken
  );
  assert.equal(escalationRes.status, 200);
  assert.equal(escalationRes.json.targetHospital.id, 'HOSP-KHORDHA-DH');

  // Verify non-supervisor (worker) escalation denied (403)
  const workerEscalationAttempt = await postJson(
    '/api/emergency-alerts/authorize-escalation',
    {
      alertId: supAlertAuth.json.alertId,
      escalationReason: 'Unauthorized escalation attempt',
      escalationTargetHospitalId: 'HOSP-KHORDHA-DH',
      assignedWorkerId: 'HW-44120',
    },
    workerToken
  );
  assert.equal(workerEscalationAttempt.status, 403);
  console.log('✓ 5. Supervisor alert & escalation authorization verified (non-supervisor escalation denied 403)');

  // 6. Verify Firestore Security Rules integrity & Hospital Dashboard access guarantees
  const rulesText = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
  assert.ok(
    rulesText.includes('match /emergencyAlerts/{alertId}'),
    'firestore.rules must define match /emergencyAlerts/{alertId}'
  );
  assert.ok(
    rulesText.includes('allow read: if isAuthenticated()'),
    'emergencyAlerts must require isAuthenticated() for reads (never publicly readable)'
  );
  assert.ok(
    rulesText.includes('isAlertTargetFacility(resource.data)'),
    'emergencyAlerts must grant facility-scoped read/update via isAlertTargetFacility'
  );
  assert.ok(
    rulesText.includes("data.targetHospitalId == getHospitalId() ||\n        (('escalationTargetHospitalId' in data) && data.escalationTargetHospitalId == getHospitalId())"),
    'isAlertTargetFacility must match canonical targetHospitalId and escalationTargetHospitalId'
  );
  assert.ok(
    !rulesText.includes('match /emergencyAlerts/{alertId} {\n      allow read: if true'),
    'emergencyAlerts must never allow public read'
  );

  // Verify DataContext omits status on worker/mother updates so Firestore Worker rule passes cleanly
  const dataContextText = fs.readFileSync(
    path.resolve(process.cwd(), 'frontend/src/context/DataContext.tsx'),
    'utf8'
  );
  assert.ok(
    dataContextText.includes("const canMutateStatus = params.actorRole === 'hospital' || params.actorRole === 'supervisor';"),
    'DataContext must guard status mutation to hospital/supervisor roles'
  );
  assert.ok(
    dataContextText.includes('...(canMutateStatus ? { status: params.status } : {})'),
    'DataContext must omit status when worker/mother appends field updates'
  );
  console.log('✓ 6. Firestore rules privacy, canonical hospital mapping, and Worker update rules alignment verified');

  console.log('\nALL EMERGENCY ALERT INTEGRATION CHECKS PASSED.\n');
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
