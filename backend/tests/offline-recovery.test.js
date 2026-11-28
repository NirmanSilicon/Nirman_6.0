const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_smartppe_phase10_offline_recovery_256bit';
process.env.BCRYPT_SALT_ROUNDS = '4';
process.env.ML_SERVICE_API_KEY = 'ml_test_service_secret_key_for_phase10_verification';

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const { User } = require('../src/models/User.model');
const { Zone } = require('../src/models/Zone.model');
const { Camera } = require('../src/models/Camera.model');
const { Incident } = require('../src/models/Incident.model');
const { buildMockDetectionPayload } = require('../src/services/mockMl.service');
const { recoverPendingGraceTimers } = require('../src/services/warningEscalation.service');
const { exportLocalBackup, restoreLocalBackup } = require('../src/scripts/backup-local-db');

let mongoServer;
let adminToken;
let zoneAId;

describe("SmartPPE — Warden's Eye: Phase 10 Offline-First Edge Operation, Startup Timer Recovery & Local Backup Test Suite", () => {
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
    await Promise.all([User.init(), Zone.init(), Camera.init(), Incident.init()]);

    await request(app).post('/api/auth/register').send({
      name: 'System Admin',
      email: 'admin@smartppe.local',
      password: 'AdminPassword123!',
      role: 'ADMINISTRATOR',
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@smartppe.local', password: 'AdminPassword123!' });
    adminToken = login.body.data.token;

    const zRes = await request(app)
      .post('/api/admin/zones')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ zoneCode: 'ZONE_A', zoneName: 'Assembly Zone A' });
    zoneAId = zRes.body.data.zone.zoneId;

    await request(app)
      .post('/api/cameras')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        cameraCode: 'CAM_001',
        cameraName: 'Zone A Offline Camera',
        zoneId: zoneAId,
        streamType: 'SMARTPHONE_WIFI',
      });
  });

  after(async () => {
    await disconnectDB();
    if (mongoServer) await mongoServer.stop();
  });

  test('1. GET /api/health/connectivity Reports Offline LAN Autonomy & Startup 120s Timer Recovery Works', async () => {
    const connRes = await request(app).get('/api/health/connectivity');
    assert.equal(connRes.status, 200);
    assert.equal(connRes.body.data.lanMode, 'ACTIVE');
    assert.equal(connRes.body.data.databaseConnected, true);
    assert.equal(connRes.body.data.cloudSyncState, 'OFFLINE_LOCAL_ONLY');

    // Create a warning in grace period, simulate power/process restart after grace expiry
    const detRes = await request(app)
      .post('/api/detections')
      .set('X-ML-Service-Key', process.env.ML_SERVICE_API_KEY)
      .send(buildMockDetectionPayload({ cameraCode: 'CAM_001', scenario: 'VIOLATION', missingPPE: ['helmet'] }));
    assert.equal(detRes.status, 201);
    const incId = detRes.body.data.incidentId;

    await Incident.updateOne({ _id: incId }, { $set: { graceExpiresAt: new Date(Date.now() - 2000) } });
    const recovered = await recoverPendingGraceTimers();
    assert.equal(recovered.escalated, 1);
    assert.equal((await Incident.findById(incId)).status, 'OPEN');
  });

  test('2. Local Database Backup & Restore Utility Preserves All Operational Collections', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smartppe-backup-test-'));
    try {
      const backup = await exportLocalBackup(tmpDir);
      assert.ok(fs.existsSync(backup.filePath));
      assert.ok(backup.counts.users >= 1);
      assert.ok(backup.counts.incidents >= 1);

      // Delete incidents to simulate accidental loss, then restore
      await Incident.deleteMany({});
      assert.equal(await Incident.countDocuments({}), 0);

      const restored = await restoreLocalBackup(backup.filePath);
      assert.ok(restored.restoredCounts.incidents >= 1);
      assert.ok((await Incident.countDocuments({})) >= 1);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
