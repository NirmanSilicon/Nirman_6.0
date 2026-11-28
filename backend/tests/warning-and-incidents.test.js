const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_smartppe_phase5_warning_incidents_256bit';
process.env.JWT_EXPIRES_IN = '2h';
process.env.BCRYPT_SALT_ROUNDS = '4';
process.env.ML_SERVICE_API_KEY = 'ml_test_service_secret_key_for_phase5_verification';
process.env.INCIDENT_COOLDOWN_SECONDS = '60';
process.env.WARNING_GRACE_SECONDS = '120';
process.env.RFID_COOLDOWN_SECONDS = '10';

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const { User } = require('../src/models/User.model');
const { Zone } = require('../src/models/Zone.model');
const { Worker } = require('../src/models/Worker.model');
const { ZoneAssignment } = require('../src/models/ZoneAssignment.model');
const { Device } = require('../src/models/Device.model');
const { Camera } = require('../src/models/Camera.model');
const { PpeDetection } = require('../src/models/PpeDetection.model');
const { Incident } = require('../src/models/Incident.model');
const { IncidentEvidence } = require('../src/models/IncidentEvidence.model');
const { AuditLog } = require('../src/models/AuditLog.model');
const { buildMockDetectionPayload } = require('../src/services/mockMl.service');
const { eventBus } = require('../src/services/eventBus');
const {
  processExpiredGraceWarnings,
  recoverPendingGraceTimers,
} = require('../src/services/warningEscalation.service');
const { GENESIS_HASH } = require('../src/utils/hashChain.util');

const mlKey = process.env.ML_SERVICE_API_KEY;
const HEX64 = /^[0-9a-f]{64}$/;

let mongoServer;
let adminToken;
let supervisorAToken;
let worker1Token;
let zoneAId;
let zoneBId;
let worker1Id;
let worker2Id;
let deviceKey;

// Incident ids shared across ordered tests
let incSelfResolved;
let incVest;
let incHelmet;
let incPendingB;
let incDedupB;
let incBoots;

const postDetection = (payload) =>
  request(app).post('/api/detections').set('X-ML-Service-Key', mlKey).send(payload);

const violation = (cameraCode, missingPPE, extra = {}) =>
  postDetection(
    buildMockDetectionPayload({ cameraCode, scenario: 'VIOLATION', missingPPE, verifyWorkerByRfid: false, ...extra })
  );

const safe = (cameraCode) =>
  postDetection(buildMockDetectionPayload({ cameraCode, scenario: 'SAFE', verifyWorkerByRfid: false }));

const expireGrace = (incidentId) =>
  Incident.updateOne({ _id: incidentId }, { $set: { graceExpiresAt: new Date(Date.now() - 1000) } });

const asAdmin = (method, url) => request(app)[method](url).set('Authorization', `Bearer ${adminToken}`);
const asSupA = (method, url) => request(app)[method](url).set('Authorization', `Bearer ${supervisorAToken}`);
const asWorker = (method, url) => request(app)[method](url).set('Authorization', `Bearer ${worker1Token}`);

describe("SmartPPE — Warden's Eye: Phase 5 120-Second Grace Engine, Speaker, Incident APIs & SHA-256 Ledger", () => {
  before(async () => {
    const externalTestUri = process.env.TEST_MONGODB_URI;
    if (externalTestUri) {
      await connectDB(externalTestUri);
    } else {
      mongoServer = await MongoMemoryServer.create({
        binary: { downloadDir: path.resolve(__dirname, '../.cache/mongodb-binaries') },
      });
      await connectDB(mongoServer.getUri());
    }

    await mongoose.connection.db.dropDatabase();
    await Promise.all([
      User.init(),
      Zone.init(),
      Worker.init(),
      ZoneAssignment.init(),
      Device.init(),
      Camera.init(),
      PpeDetection.init(),
      Incident.init(),
      IncidentEvidence.init(),
      AuditLog.init(),
    ]);

    await request(app).post('/api/auth/register').send({
      name: 'System Admin',
      email: 'admin@smartppe.local',
      password: 'AdminPassword123!',
      role: 'ADMINISTRATOR',
    });
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@smartppe.local', password: 'AdminPassword123!' });
    adminToken = adminLogin.body.data.token;

    const zA = await asAdmin('post', '/api/admin/zones').send({ zoneCode: 'ZONE_A', zoneName: 'Assembly Zone A' });
    zoneAId = zA.body.data.zone.zoneId;
    const zB = await asAdmin('post', '/api/admin/zones').send({ zoneCode: 'ZONE_B', zoneName: 'Warehouse Zone B' });
    zoneBId = zB.body.data.zone.zoneId;

    await asAdmin('post', '/api/admin/supervisors').send({
      name: 'Supervisor Zone A',
      email: 'sup.a@smartppe.local',
      password: 'SupervisorPassword123!',
      zoneIds: [zoneAId],
    });
    const supLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sup.a@smartppe.local', password: 'SupervisorPassword123!' });
    supervisorAToken = supLogin.body.data.token;

    const wUser = await asAdmin('post', '/api/auth/register').send({
      name: 'Worker One',
      email: 'worker1@smartppe.local',
      password: 'WorkerPassword123!',
      role: 'WORKER',
    });
    const w1 = await asAdmin('post', '/api/workers').send({
      employeeCode: 'EMP-001',
      name: 'Worker One',
      department: 'Assembly',
      zoneId: zoneAId,
      rfidUid: 'A1B2C3D4',
      userId: wUser.body.data.user.userId,
    });
    worker1Id = w1.body.data.worker.workerId;
    const w2 = await asAdmin('post', '/api/workers').send({
      employeeCode: 'EMP-002',
      name: 'Worker Two',
      department: 'Warehouse',
      zoneId: zoneBId,
      rfidUid: 'E5F60718',
    });
    worker2Id = w2.body.data.worker.workerId;
    const wLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'worker1@smartppe.local', password: 'WorkerPassword123!' });
    worker1Token = wLogin.body.data.token;

    const dev = await asAdmin('post', '/api/devices').send({
      deviceCode: 'ESP32_001',
      deviceName: 'Zone A RFID Reader',
      zoneId: zoneAId,
    });
    deviceKey = dev.body.data.deviceApiKey;

    await asAdmin('post', '/api/cameras').send({
      cameraCode: 'CAM_001',
      cameraName: 'Zone A Camera',
      zoneId: zoneAId,
      streamType: 'IP_HTTP',
    });
    await asAdmin('post', '/api/cameras').send({
      cameraCode: 'CAM_002',
      cameraName: 'Zone B Camera',
      zoneId: zoneBId,
      streamType: 'IP_HTTP',
    });
  });

  after(async () => {
    await disconnectDB();
    if (mongoServer) await mongoServer.stop();
  });

  test('1. Violation starts speaker warning + 120s grace; SAFE within grace self-resolves without escalation', async () => {
    const spoken = [];
    const onSpeak = (payload) => spoken.push(payload);
    eventBus.on('speaker:play', onSpeak);
    try {
      const v = await violation('CAM_001', ['helmet']);
      assert.equal(v.status, 201);
      assert.equal(v.body.data.incidentCreated, true);
      incSelfResolved = v.body.data.incidentId;

      const inc = await Incident.findById(incSelfResolved);
      assert.equal(inc.status, 'WARNING_GRACE_PERIOD');
      assert.ok(inc.speakerWarningPlayedAt);
      assert.equal(inc.graceExpiresAt.getTime() - inc.graceStartedAt.getTime(), 120 * 1000);
      assert.equal(inc.escalatedToSupervisorAt, null);

      assert.equal(spoken.length, 1, 'exactly one speaker warning per new violation');
      assert.match(spoken[0].message, /Assembly Zone A/);
      assert.match(spoken[0].message, /safety helmet/);
      assert.match(spoken[0].message, /120 seconds/);

      // A merged duplicate frame must NOT replay the speaker warning
      const dup = await violation('CAM_001', ['helmet']);
      assert.equal(dup.body.data.cooldownMerged, true);
      assert.equal(spoken.length, 1);

      // UNCERTAIN must not resolve the warning
      const unc = await postDetection(buildMockDetectionPayload({ cameraCode: 'CAM_001', scenario: 'UNCERTAIN' }));
      assert.deepEqual(unc.body.data.graceResolvedIncidentIds, []);
      assert.equal((await Incident.findById(incSelfResolved)).status, 'WARNING_GRACE_PERIOD');

      // SAFE within the grace window -> SELF_RESOLVED_IN_GRACE
      const s = await safe('CAM_001');
      assert.equal(s.status, 201);
      assert.deepEqual(s.body.data.graceResolvedIncidentIds, [incSelfResolved]);

      const resolved = await Incident.findById(incSelfResolved);
      assert.equal(resolved.status, 'SELF_RESOLVED_IN_GRACE');
      assert.ok(resolved.selfResolvedAt);
      assert.equal(resolved.escalatedToSupervisorAt, null, 'self-resolved warnings never reach the supervisor');

      const audit = await AuditLog.findOne({ action: 'WARNING_SELF_RESOLVED_IN_GRACE', entityId: incSelfResolved });
      assert.ok(audit);
    } finally {
      eventBus.off('speaker:play', onSpeak);
    }
  });

  test('2. Unresolved warning escalates to OPEN after the grace period; late SAFE cannot undo it', async () => {
    const v = await violation('CAM_001', ['safety_vest']);
    incVest = v.body.data.incidentId;

    // Not yet expired -> sweep must leave it alone
    const early = await processExpiredGraceWarnings();
    assert.equal(early.incidentIds.includes(incVest), false);
    assert.equal((await Incident.findById(incVest)).status, 'WARNING_GRACE_PERIOD');

    await expireGrace(incVest);
    const sweep = await processExpiredGraceWarnings();
    assert.ok(sweep.incidentIds.includes(incVest));

    const inc = await Incident.findById(incVest);
    assert.equal(inc.status, 'OPEN');
    assert.ok(inc.escalatedToSupervisorAt);
    assert.ok(await AuditLog.findOne({ action: 'WARNING_ESCALATED_AFTER_GRACE', entityId: incVest }));

    // Idempotent: a second sweep never escalates twice
    const again = await processExpiredGraceWarnings();
    assert.equal(again.incidentIds.includes(incVest), false);

    // Late SAFE does not revert an escalated incident
    const s = await safe('CAM_001');
    assert.deepEqual(s.body.data.graceResolvedIncidentIds, []);
    assert.equal((await Incident.findById(incVest)).status, 'OPEN');
  });

  test('3. Backend restart recovery escalates expired timers on boot and keeps pending timers', async () => {
    const expired = await violation('CAM_001', ['helmet']);
    incHelmet = expired.body.data.incidentId;
    const pending = await violation('CAM_002', ['safety_vest']);
    incPendingB = pending.body.data.incidentId;
    await expireGrace(incHelmet); // simulates the backend being down past the 120s deadline

    const recovery = await recoverPendingGraceTimers();
    assert.ok(recovery.incidentIds.includes(incHelmet));
    assert.equal(recovery.incidentIds.includes(incPendingB), false);
    assert.ok(recovery.stillPending >= 1);

    assert.equal((await Incident.findById(incHelmet)).status, 'OPEN');
    assert.equal((await Incident.findById(incPendingB)).status, 'WARNING_GRACE_PERIOD');
    assert.ok(await AuditLog.findOne({ action: 'WARNING_RECOVERED_AND_ESCALATED_ON_BOOT', entityId: incHelmet }));
  });

  test('4. T16 Deduplication: 5 rapid violations create exactly one incident with occurrenceCount 5', async () => {
    const results = [];
    for (let i = 0; i < 5; i += 1) {
      results.push(await violation('CAM_002', ['helmet']));
    }
    assert.equal(results[0].body.data.incidentCreated, true);
    incDedupB = results[0].body.data.incidentId;
    for (const r of results.slice(1)) {
      assert.equal(r.body.data.incidentCreated, false);
      assert.equal(r.body.data.incidentId, incDedupB);
    }
    assert.equal((await Incident.findById(incDedupB)).occurrenceCount, 5);
    assert.equal(
      await Incident.countDocuments({ deviceOrCameraCode: 'CAM_002', incidentType: 'MISSING_HELMET' }),
      1
    );
  });

  test('5. Incident query APIs enforce role and zone isolation', async () => {
    const adminList = await asAdmin('get', '/api/incidents');
    assert.equal(adminList.status, 200);
    assert.ok(adminList.body.data.total >= 5);

    const supList = await asSupA('get', '/api/incidents');
    assert.equal(supList.status, 200);
    assert.ok(supList.body.data.incidents.length >= 3);
    for (const inc of supList.body.data.incidents) {
      assert.equal(inc.zoneId.zoneCode, 'ZONE_A', 'supervisor A must only see Zone A incidents');
    }
    const supOpen = await asSupA('get', '/api/incidents?status=OPEN');
    assert.ok(supOpen.body.data.incidents.every((i) => i.status === 'OPEN'));

    const badStatus = await asAdmin('get', '/api/incidents?status=NOPE');
    assert.equal(badStatus.status, 400);
    assert.equal(badStatus.body.error.code, 'VALIDATION_ERROR');

    const supZoneB = await asSupA('get', `/api/incidents?zoneId=${zoneBId}`);
    assert.equal(supZoneB.status, 403);
    assert.equal(supZoneB.body.error.code, 'ZONE_ACCESS_DENIED');

    const supGetB = await asSupA('get', `/api/incidents/${incPendingB}`);
    assert.equal(supGetB.status, 403);
    assert.equal(supGetB.body.error.code, 'ZONE_ACCESS_DENIED');

    const noAuth = await request(app).get('/api/incidents');
    assert.equal(noAuth.status, 401);

    // Worker sees nothing until an incident is linked to them
    const workerEmpty = await asWorker('get', '/api/incidents');
    assert.equal(workerEmpty.body.data.total, 0);

    // Worker scans RFID into Zone A, then a violation is auto-linked via RFID zone presence
    const scan = await request(app)
      .post('/api/rfid/scan')
      .set('X-Device-Code', 'ESP32_001')
      .set('X-Device-Key', deviceKey)
      .send({ deviceCode: 'ESP32_001', rfidUid: 'A1B2C3D4' });
    assert.equal(scan.status, 200);

    const boots = await violation('CAM_001', ['safety_boots'], { verifyWorkerByRfid: true });
    assert.equal(boots.body.data.workerId, worker1Id);
    incBoots = boots.body.data.incidentId;

    const mine = await asWorker('get', '/api/workers/me/incidents');
    assert.equal(mine.status, 200);
    assert.equal(mine.body.data.total, 1);
    assert.equal(mine.body.data.incidents[0].incidentId, incBoots);

    assert.equal((await asWorker('get', `/api/incidents/${incBoots}`)).status, 200);
    const otherInc = await asWorker('get', `/api/incidents/${incVest}`);
    assert.equal(otherInc.status, 403);
    assert.equal(otherInc.body.error.code, 'FORBIDDEN');

    // Supervisor detail includes RFID-checked-in workers; worker detail does not
    const detail = await asSupA('get', `/api/incidents/${incVest}`);
    assert.equal(detail.status, 200);
    assert.ok(detail.body.data.activeWorkersInZone.some((w) => w.employeeCode === 'EMP-001'));
    assert.equal((await asWorker('get', `/api/incidents/${incBoots}`)).body.data.activeWorkersInZone, undefined);

    // Supervisor-only zone list
    const zones = await asSupA('get', '/api/supervisor/zones');
    assert.equal(zones.status, 200);
    assert.deepEqual(zones.body.data.zones.map((z) => z.zoneCode), ['ZONE_A']);
  });

  test('6. Supervisor acknowledge / verify / reject / resolve workflow with SHA-256 hash chain', async () => {
    // Authorization
    assert.equal((await asWorker('post', `/api/supervisor/incidents/${incVest}/acknowledge`)).status, 403);
    assert.equal((await request(app).post(`/api/supervisor/incidents/${incVest}/acknowledge`)).status, 401);

    // Zone isolation: supervisor A cannot touch Zone B incidents
    const crossZone = await asSupA('post', `/api/supervisor/incidents/${incPendingB}/acknowledge`);
    assert.equal(crossZone.status, 403);
    assert.equal(crossZone.body.error.code, 'ZONE_ACCESS_DENIED');

    // State machine: a grace-period warning cannot be acknowledged, verified or resolved
    const graceAck = await asAdmin('post', `/api/supervisor/incidents/${incPendingB}/acknowledge`);
    assert.equal(graceAck.status, 409);
    assert.equal(graceAck.body.error.code, 'INVALID_INCIDENT_STATE');
    const graceVerify = await asAdmin('post', `/api/supervisor/incidents/${incPendingB}/verify`).send({
      verificationStatus: 'VERIFIED',
      verificationNotes: 'Should be blocked',
    });
    assert.equal(graceVerify.status, 409);

    // Acknowledge
    const ack = await asSupA('post', `/api/supervisor/incidents/${incVest}/acknowledge`);
    assert.equal(ack.status, 200);
    assert.equal(ack.body.data.incident.status, 'UNDER_REVIEW');
    assert.ok(ack.body.data.incident.acknowledgedAt);
    assert.equal((await asSupA('post', `/api/supervisor/incidents/${incVest}/acknowledge`)).status, 409);

    // Validation: notes are mandatory, status enum is strict, unknown keys rejected
    const noNotes = await asSupA('post', `/api/supervisor/incidents/${incVest}/verify`).send({
      verificationStatus: 'VERIFIED',
    });
    assert.equal(noNotes.status, 400);
    const badStatus = await asSupA('post', `/api/supervisor/incidents/${incVest}/verify`).send({
      verificationStatus: 'MAYBE',
      verificationNotes: 'Unsure',
    });
    assert.equal(badStatus.status, 400);
    const extraKey = await asSupA('post', `/api/supervisor/incidents/${incVest}/verify`).send({
      verificationStatus: 'VERIFIED',
      verificationNotes: 'Mass assignment attempt',
      recordHash: 'f'.repeat(64),
    });
    assert.equal(extraKey.status, 400);

    // Worker from another zone who never checked in cannot be confirmed
    const wrongWorker = await asSupA('post', `/api/supervisor/incidents/${incHelmet}/verify`).send({
      verificationStatus: 'VERIFIED',
      verificationNotes: 'Wrong worker attempt',
      confirmedWorkerId: worker2Id,
    });
    assert.equal(wrongWorker.status, 400);
    assert.equal(wrongWorker.body.error.code, 'WORKER_NOT_IN_ZONE');

    // Verify #1 -> genesis link
    const v1 = await asSupA('post', `/api/supervisor/incidents/${incVest}/verify`).send({
      verificationStatus: 'VERIFIED',
      verificationNotes: 'Confirmed on camera snapshot',
    });
    assert.equal(v1.status, 200);
    assert.equal(v1.body.data.incident.status, 'VERIFIED');
    assert.match(v1.body.data.incident.recordHash, HEX64);
    assert.equal(v1.body.data.incident.previousHash, GENESIS_HASH);
    const hash1 = v1.body.data.incident.recordHash;

    // Verify #2 -> chained to #1, supervisor confirms the worker
    const v2 = await asSupA('post', `/api/supervisor/incidents/${incHelmet}/verify`).send({
      verificationStatus: 'VERIFIED',
      verificationNotes: 'Worker identified at checkpoint',
      confirmedWorkerId: worker1Id,
    });
    assert.equal(v2.status, 200);
    assert.equal(v2.body.data.incident.previousHash, hash1);
    assert.notEqual(v2.body.data.incident.recordHash, hash1);

    const integrity = await asSupA('get', `/api/incidents/${incVest}/verify-integrity`);
    assert.equal(integrity.status, 200);
    assert.equal(integrity.body.data.integrityValid, true);
    assert.equal(integrity.body.data.storedRecordHash, integrity.body.data.computedRecordHash);

    // Resolve re-seals the hash but keeps the chain link stable
    const res1 = await asSupA('post', `/api/supervisor/incidents/${incVest}/resolve`).send({
      resolutionNotes: 'Worker equipped a vest and returned to work',
    });
    assert.equal(res1.status, 200);
    assert.equal(res1.body.data.incident.status, 'RESOLVED');
    assert.notEqual(res1.body.data.incident.recordHash, hash1);
    assert.equal(res1.body.data.incident.previousHash, GENESIS_HASH);
    assert.equal(
      (await asSupA('get', `/api/incidents/${incVest}/verify-integrity`)).body.data.integrityValid,
      true
    );
    assert.equal(
      (await asSupA('post', `/api/supervisor/incidents/${incVest}/resolve`).send({ resolutionNotes: 'Again' })).status,
      409
    );

    // Reject path (false positive) is terminal. The boots warning must first escalate past its grace period.
    await expireGrace(incBoots);
    await processExpiredGraceWarnings();
    const rej = await asSupA('post', `/api/supervisor/incidents/${incBoots}/verify`).send({
      verificationStatus: 'REJECTED',
      verificationNotes: 'False positive: worker was wearing boots',
    });
    assert.equal(rej.status, 200);
    assert.equal(rej.body.data.incident.status, 'REJECTED');
    assert.match(rej.body.data.incident.recordHash, HEX64);
    assert.equal(
      (await asSupA('post', `/api/supervisor/incidents/${incBoots}/resolve`).send({ resolutionNotes: 'Nope' })).status,
      409
    );

    // Audit trail
    for (const action of ['INCIDENT_ACKNOWLEDGED', 'INCIDENT_VERIFIED', 'INCIDENT_REJECTED', 'INCIDENT_RESOLVED']) {
      assert.ok(await AuditLog.findOne({ action }), `missing audit log ${action}`);
    }
  });

  test('7. T17 Tamper detection: direct database modification breaks the SHA-256 integrity check', async () => {
    const before = await asAdmin('get', `/api/incidents/${incHelmet}/verify-integrity`);
    assert.equal(before.body.data.integrityValid, true);

    await Incident.updateOne({ _id: incHelmet }, { $set: { description: 'TAMPERED DESCRIPTION' } });
    const after = await asAdmin('get', `/api/incidents/${incHelmet}/verify-integrity`);
    assert.equal(after.status, 200);
    assert.equal(after.body.data.integrityValid, false);
    assert.notEqual(after.body.data.storedRecordHash, after.body.data.computedRecordHash);

    // Tampering with the verifier identity is also detected
    const second = await asAdmin('get', `/api/incidents/${incBoots}/verify-integrity`);
    assert.equal(second.body.data.integrityValid, true);
    await Incident.updateOne({ _id: incBoots }, { $set: { status: 'VERIFIED' } });
    assert.equal(
      (await asAdmin('get', `/api/incidents/${incBoots}/verify-integrity`)).body.data.integrityValid,
      false
    );

    // Unsealed incident reports sealed:false instead of a false claim
    const unsealed = await asAdmin('get', `/api/incidents/${incDedupB}/verify-integrity`);
    assert.equal(unsealed.body.data.sealed, false);
    assert.equal(unsealed.body.data.integrityValid, null);

    // Workers cannot run integrity checks
    assert.equal((await asWorker('get', `/api/incidents/${incHelmet}/verify-integrity`)).status, 403);
  });
});
