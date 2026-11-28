const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const path = require('path');
const request = require('supertest');
const { io: Client } = require('socket.io-client');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_smartppe_phase8_realtime_dashboard_256bit';
process.env.JWT_EXPIRES_IN = '2h';
process.env.BCRYPT_SALT_ROUNDS = '4';
process.env.ML_SERVICE_API_KEY = 'ml_test_service_secret_key_for_phase8_verification';

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const { initSocketServer } = require('../src/socket/socket.server');
const { User } = require('../src/models/User.model');
const { Zone } = require('../src/models/Zone.model');
const { Worker } = require('../src/models/Worker.model');
const { ZoneAssignment } = require('../src/models/ZoneAssignment.model');
const { Camera } = require('../src/models/Camera.model');
const { Incident } = require('../src/models/Incident.model');
const { IncidentEvidence } = require('../src/models/IncidentEvidence.model');
const { PushSubscription } = require('../src/models/PushSubscription.model');
const { buildMockDetectionPayload } = require('../src/services/mockMl.service');
const { processExpiredGraceWarnings } = require('../src/services/warningEscalation.service');

let mongoServer;
let httpServer;
let serverUrl;
let adminToken;
let supAToken;
let supBToken;
let workerToken;
let zoneAId;
let zoneBId;
let zoneAIncidentId;
let zoneAEvidenceId;

describe("SmartPPE — Warden's Eye: Phase 8 Real-Time Socket.IO, VAPID Web Push, Private Evidence & Dashboard Analytics Test Suite", () => {
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
      Camera.init(),
      Incident.init(),
      IncidentEvidence.init(),
      PushSubscription.init(),
    ]);

    httpServer = http.createServer(app);
    initSocketServer(httpServer);
    await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    serverUrl = `http://127.0.0.1:${httpServer.address().port}`;

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

    const zA = await request(app)
      .post('/api/admin/zones')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ zoneCode: 'ZONE_A', zoneName: 'Assembly Zone A' });
    zoneAId = zA.body.data.zone.zoneId;

    const zB = await request(app)
      .post('/api/admin/zones')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ zoneCode: 'ZONE_B', zoneName: 'Warehouse Zone B' });
    zoneBId = zB.body.data.zone.zoneId;

    await request(app)
      .post('/api/admin/supervisors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Supervisor Zone A',
        email: 'sup.a@smartppe.local',
        password: 'SupervisorPassword123!',
        zoneIds: [zoneAId],
      });
    const supALogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sup.a@smartppe.local', password: 'SupervisorPassword123!' });
    supAToken = supALogin.body.data.token;

    await request(app)
      .post('/api/admin/supervisors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Supervisor Zone B',
        email: 'sup.b@smartppe.local',
        password: 'SupervisorPassword123!',
        zoneIds: [zoneBId],
      });
    const supBLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sup.b@smartppe.local', password: 'SupervisorPassword123!' });
    supBToken = supBLogin.body.data.token;

    const wUser = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Worker One',
        email: 'worker1@smartppe.local',
        password: 'WorkerPassword123!',
        role: 'WORKER',
      });
    await request(app)
      .post('/api/workers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employeeCode: 'EMP-001',
        name: 'Worker One',
        department: 'Assembly',
        zoneId: zoneAId,
        rfidUid: 'A1B2C3D4',
        userId: wUser.body.data.user.userId,
      });
    const wLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'worker1@smartppe.local', password: 'WorkerPassword123!' });
    workerToken = wLogin.body.data.token;

    await request(app)
      .post('/api/cameras')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        cameraCode: 'CAM_001',
        cameraName: 'Zone A Camera',
        zoneId: zoneAId,
        streamType: 'SMARTPHONE_WIFI',
      });
  });

  after(async () => {
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
    await disconnectDB();
    if (mongoServer) await mongoServer.stop();
  });

  test('1. Security & Functional Test T13: Socket.IO JWT Auth & Strict Zone Room Isolation', async () => {
    // Unauthenticated socket must be rejected
    await new Promise((resolve, reject) => {
      const badClient = Client(serverUrl, { transports: ['websocket'], reconnection: false });
      badClient.on('connect_error', (err) => {
        assert.match(err.message, /UNAUTHORIZED/);
        badClient.close();
        resolve();
      });
      badClient.on('connect', () => {
        badClient.close();
        reject(new Error('Unauthenticated socket should not connect'));
      });
    });

    // Connect Supervisor A (Zone A) and Supervisor B (Zone B)
    const clientA = Client(serverUrl, {
      auth: { token: supAToken },
      transports: ['websocket'],
    });
    const clientB = Client(serverUrl, {
      auth: { token: supBToken },
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise((resolve) => clientA.on('socket:authenticated', resolve)),
      new Promise((resolve) => clientB.on('socket:authenticated', resolve)),
    ]);

    const eventsA = [];
    const eventsB = [];
    clientA.on('incident:new', (p) => eventsA.push(p));
    clientB.on('incident:new', (p) => eventsB.push(p));

    try {
      // Trigger a violation in Zone A and expire its 120s grace period
      const detRes = await request(app)
        .post('/api/detections')
        .set('X-ML-Service-Key', process.env.ML_SERVICE_API_KEY)
        .send(buildMockDetectionPayload({ cameraCode: 'CAM_001', scenario: 'VIOLATION', missingPPE: ['helmet'] }));
      assert.equal(detRes.status, 201);
      zoneAIncidentId = detRes.body.data.incidentId;

      const evDoc = await IncidentEvidence.findOne({ incidentId: zoneAIncidentId });
      zoneAEvidenceId = evDoc.evidenceId;

      await Incident.updateOne({ _id: zoneAIncidentId }, { $set: { graceExpiresAt: new Date(Date.now() - 1000) } });
      await processExpiredGraceWarnings();

      await new Promise((r) => setTimeout(r, 120));

      assert.equal(eventsA.length, 1, 'Supervisor A (Zone A) must receive incident:new');
      assert.equal(eventsA[0].incidentId, zoneAIncidentId);
      assert.equal(eventsB.length, 0, 'Supervisor B (Zone B) must NOT receive Zone A incident');
    } finally {
      clientA.close();
      clientB.close();
    }
  });

  test('2. Security Test T14: Private Authenticated Evidence Serving & Zone Isolation', async () => {
    // Supervisor A (assigned to Zone A) can access evidence -> 200 OK
    const supARes = await request(app)
      .get(`/api/incidents/${zoneAIncidentId}/evidence/${zoneAEvidenceId}`)
      .set('Authorization', `Bearer ${supAToken}`);
    assert.equal(supARes.status, 200);
    assert.equal(supARes.body.data.incidentId, zoneAIncidentId);

    // Supervisor B (unassigned to Zone A) -> 403 ZONE_ACCESS_DENIED
    const supBRes = await request(app)
      .get(`/api/incidents/${zoneAIncidentId}/evidence/${zoneAEvidenceId}`)
      .set('Authorization', `Bearer ${supBToken}`);
    assert.equal(supBRes.status, 403);
    assert.equal(supBRes.body.error.code, 'ZONE_ACCESS_DENIED');

    // Worker attempting to access raw evidence -> 403 FORBIDDEN
    const wrkRes = await request(app)
      .get(`/api/incidents/${zoneAIncidentId}/evidence/${zoneAEvidenceId}`)
      .set('Authorization', `Bearer ${workerToken}`);
    assert.equal(wrkRes.status, 403);
  });

  test('3. VAPID Web Push Subscription & Dashboard Analytics Aggregations', async () => {
    const vapidRes = await request(app)
      .get('/api/notifications/vapid-public-key')
      .set('Authorization', `Bearer ${supAToken}`);
    assert.equal(vapidRes.status, 200);
    assert.ok(vapidRes.body.data.publicKey.length > 20);

    const subRes = await request(app)
      .post('/api/notifications/subscribe')
      .set('Authorization', `Bearer ${supAToken}`)
      .send({
        endpoint: 'https://fcm.googleapis.com/fcm/send/mock-subscription-token-zone-a',
        keys: { p256dh: 'mock_p256dh_key_value', auth: 'mock_auth_key_value' },
      });
    assert.equal(subRes.status, 201);

    // Submit 1 SAFE detection so compliance is 1 SAFE / (1 SAFE + 1 VIOLATION) = 50.0%
    await request(app)
      .post('/api/detections')
      .set('X-ML-Service-Key', process.env.ML_SERVICE_API_KEY)
      .send(buildMockDetectionPayload({ cameraCode: 'CAM_001', scenario: 'SAFE' }));

    const overviewRes = await request(app)
      .get('/api/dashboard/overview')
      .set('Authorization', `Bearer ${supAToken}`);
    assert.equal(overviewRes.status, 200);
    assert.equal(overviewRes.body.data.openIncidents, 1);
    assert.equal(overviewRes.body.data.ppeCompliancePercent, 50.0);

    const analyticsRes = await request(app)
      .get('/api/dashboard/analytics')
      .set('Authorization', `Bearer ${supAToken}`);
    assert.equal(analyticsRes.status, 200);
    assert.equal(analyticsRes.body.data.ppeCompliancePercent, 50.0);
    assert.equal(analyticsRes.body.data.incidentsByType.MISSING_HELMET, 1);

    const zonesRes = await request(app)
      .get('/api/dashboard/zones')
      .set('Authorization', `Bearer ${supAToken}`);
    assert.equal(zonesRes.status, 200);
    assert.equal(zonesRes.body.data.total, 1);
    assert.equal(zonesRes.body.data.zones[0].zoneCode, 'ZONE_A');
  });
});
