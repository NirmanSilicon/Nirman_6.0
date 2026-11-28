const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_smartppe_phase6_emergency_workflow_256bit';
process.env.JWT_EXPIRES_IN = '2h';
process.env.BCRYPT_SALT_ROUNDS = '4';
process.env.ML_SERVICE_API_KEY = 'ml_test_service_secret_key_for_phase6_verification';
process.env.INCIDENT_COOLDOWN_SECONDS = '60';
process.env.WARNING_GRACE_SECONDS = '120';

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const { User } = require('../src/models/User.model');
const { Zone } = require('../src/models/Zone.model');
const { Worker } = require('../src/models/Worker.model');
const { ZoneAssignment } = require('../src/models/ZoneAssignment.model');
const { Device } = require('../src/models/Device.model');
const { Camera } = require('../src/models/Camera.model');
const { Incident } = require('../src/models/Incident.model');
const { AuditLog } = require('../src/models/AuditLog.model');
const { eventBus } = require('../src/services/eventBus');

let mongoServer;
let adminToken;
let supervisorAToken;
let worker1Token;
let zoneAId;
let zoneBId;
let worker1Id;
let device1ApiKey;
let flameIncidentId;
let cameraFireIncidentId;

describe("SmartPPE — Warden's Eye: Phase 6 Zero-Delay Critical Emergency & Manual SOS Test Suite", () => {
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
      Incident.init(),
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
    const supLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sup.a@smartppe.local', password: 'SupervisorPassword123!' });
    supervisorAToken = supLogin.body.data.token;

    const wUser = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Worker One',
        email: 'worker1@smartppe.local',
        password: 'WorkerPassword123!',
        role: 'WORKER',
      });
    const w1 = await request(app)
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
    worker1Id = w1.body.data.worker.workerId;

    const wLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'worker1@smartppe.local', password: 'WorkerPassword123!' });
    worker1Token = wLogin.body.data.token;

    const dev = await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        deviceCode: 'ESP32_001',
        deviceName: 'Zone A Sensor & RFID Node',
        zoneId: zoneAId,
      });
    device1ApiKey = dev.body.data.deviceApiKey;

    await request(app)
      .post('/api/cameras')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        cameraCode: 'CAM_001',
        cameraName: 'Zone A Safety Camera',
        zoneId: zoneAId,
        streamType: 'SMARTPHONE_WIFI',
      });

    await request(app)
      .post('/api/cameras')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        cameraCode: 'CAM_002',
        cameraName: 'Zone B Safety Camera',
        zoneId: zoneBId,
        streamType: 'IP_HTTP',
      });
  });

  after(async () => {
    await disconnectDB();
    if (mongoServer) await mongoServer.stop();
  });

  test('1. Supplementary Flame Sensor Critical Emergency Bypasses 120s Grace Period & Emits Emergency SOS', async () => {
    // Worker EMP-001 checks into Zone A via RFID
    const scanRes = await request(app)
      .post('/api/rfid/scan')
      .set('X-Device-Code', 'ESP32_001')
      .set('X-Device-Key', device1ApiKey)
      .send({ deviceCode: 'ESP32_001', rfidUid: 'A1B2C3D4' });
    assert.equal(scanRes.status, 200);

    const emergencyEvents = [];
    const speakerEvents = [];
    const onEmergency = (p) => emergencyEvents.push(p);
    const onSpeaker = (p) => speakerEvents.push(p);
    eventBus.on('emergency:critical', onEmergency);
    eventBus.on('speaker:play', onSpeaker);

    try {
      const flameRes = await request(app)
        .post('/api/sensors/events')
        .set('X-Device-Code', 'ESP32_001')
        .set('X-Device-Key', device1ApiKey)
        .send({
          deviceCode: 'ESP32_001',
          sensorType: 'FLAME',
          sensorValue: 920,
          threshold: 500,
          alertStatus: 'CRITICAL',
          occurredAt: new Date().toISOString(),
        });

      assert.equal(flameRes.status, 201);
      assert.equal(flameRes.body.data.incidentCreated, true);
      flameIncidentId = flameRes.body.data.incidentId;

      const inc = await Incident.findById(flameIncidentId);
      assert.equal(inc.incidentType, 'FLAME_DETECTED');
      assert.equal(inc.status, 'OPEN', 'Critical emergencies must bypass WARNING_GRACE_PERIOD');
      assert.equal(inc.severity, 'CRITICAL');
      assert.equal(inc.isEmergency, true);
      assert.equal(inc.graceStartedAt, null);
      assert.equal(inc.graceExpiresAt, null);
      assert.ok(inc.escalatedToSupervisorAt);
      assert.ok(inc.speakerWarningPlayedAt);
      assert.ok(inc.manualSosSummary);
      assert.equal(inc.manualSosSummary.automatedExternalDispatch, false);
      assert.ok(inc.manualSosSummary.formattedMessage.includes('EMP-001'));

      assert.equal(emergencyEvents.length, 1);
      assert.equal(speakerEvents.length, 1);
      assert.equal(speakerEvents[0].isEmergency, true);
      assert.match(speakerEvents[0].message, /URGENT EMERGENCY ALERT/);
    } finally {
      eventBus.off('emergency:critical', onEmergency);
      eventBus.off('speaker:play', onSpeaker);
    }
  });

  test('2. Camera Vision Fire Detection Bypasses 120s Grace Period & Attaches RFID-Verified Worker in SOS', async () => {
    const camFireRes = await request(app)
      .post('/api/detections')
      .set('X-ML-Service-Key', process.env.ML_SERVICE_API_KEY)
      .send({
        cameraCode: 'CAM_002',
        occurredAt: new Date().toISOString(),
        modelVersion: 'yolo11n-ppe-fire-v1',
        isMockDetection: false,
        verifyWorkerByRfid: true,
        detections: [{ classLabel: 'fire', confidence: 0.91, bbox: [100, 120, 260, 310] }],
        missingPPE: [],
        detectionState: 'VIOLATION',
        overallConfidence: 0.91,
      });

    assert.equal(camFireRes.status, 201);
    assert.equal(camFireRes.body.data.incidentCreated, true);
    cameraFireIncidentId = camFireRes.body.data.incidentId;

    const inc = await Incident.findById(cameraFireIncidentId);
    assert.equal(inc.incidentType, 'FLAME_DETECTED');
    assert.equal(inc.status, 'OPEN');
    assert.equal(inc.severity, 'CRITICAL');
    assert.equal(inc.isEmergency, true);
    assert.equal(inc.graceExpiresAt, null);
    assert.ok(inc.manualSosSummary);
    assert.equal(inc.manualSosSummary.automatedExternalDispatch, false);

    const audit = await AuditLog.findOne({
      action: 'CRITICAL_CAMERA_EMERGENCY_CREATED',
      entityId: cameraFireIncidentId,
    });
    assert.ok(audit);
  });

  test('3. GET /api/incidents/:id/sos Enforces Role/Zone Isolation & Returns Copy-Ready Manual SOS Summary', async () => {
    // Supervisor A can fetch SOS for Zone A emergency
    const supSosRes = await request(app)
      .get(`/api/incidents/${flameIncidentId}/sos`)
      .set('Authorization', `Bearer ${supervisorAToken}`);
    assert.equal(supSosRes.status, 200);
    assert.equal(supSosRes.body.data.isEmergency, true);
    const sos = supSosRes.body.data.manualSosSummary;
    assert.equal(sos.incidentType, 'FLAME_DETECTED');
    assert.equal(sos.severity, 'CRITICAL');
    assert.equal(sos.zoneCode, 'ZONE_A');
    assert.equal(sos.automatedExternalDispatch, false);
    assert.ok(sos.recommendedResponse.includes('Evacuate'));
    assert.ok(sos.activeWorkersInZone.some((w) => w.employeeCode === 'EMP-001'));
    assert.equal(sos.affectedWorker.employeeCode, 'EMP-001');

    // Supervisor A blocked from Zone B emergency SOS -> 403 ZONE_ACCESS_DENIED
    const crossZoneRes = await request(app)
      .get(`/api/incidents/${cameraFireIncidentId}/sos`)
      .set('Authorization', `Bearer ${supervisorAToken}`);
    assert.equal(crossZoneRes.status, 403);
    assert.equal(crossZoneRes.body.error.code, 'ZONE_ACCESS_DENIED');

    // Worker blocked from SOS endpoint -> 403 FORBIDDEN
    const workerSosRes = await request(app)
      .get(`/api/incidents/${flameIncidentId}/sos`)
      .set('Authorization', `Bearer ${worker1Token}`);
    assert.equal(workerSosRes.status, 403);
  });
});
