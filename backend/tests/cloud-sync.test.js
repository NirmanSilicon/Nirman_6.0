const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_smartppe_phase11_cloud_sync_256bit';
process.env.BCRYPT_SALT_ROUNDS = '4';
process.env.ML_SERVICE_API_KEY = 'ml_test_service_secret_key_for_phase11_verification';
process.env.EDGE_NODE_SYNC_KEY = 'edge_node_sync_secret_key_for_phase11';

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const { User } = require('../src/models/User.model');
const { Zone } = require('../src/models/Zone.model');
const { Incident } = require('../src/models/Incident.model');
const { SyncOutbox } = require('../src/models/SyncOutbox.model');
const {
  enqueueForCloudSync,
  runCloudSyncCycle,
} = require('../src/services/cloudSync.service');

let mongoServer;
let adminToken;
let zoneAId;

describe("SmartPPE — Warden's Eye: Phase 11 Online Cloud Synchronisation, Exponential Retry & Idempotent Batch Replay Test Suite", () => {
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
    await Promise.all([User.init(), Zone.init(), Incident.init(), SyncOutbox.init()]);

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
  });

  after(async () => {
    await disconnectDB();
    if (mongoServer) await mongoServer.stop();
  });

  test('1. Enqueue Offline Events into SyncOutbox, Handle Network Failure with Exponential Backoff & Recover', async () => {
    await enqueueForCloudSync({
      entityType: 'INCIDENT',
      entityId: 'inc-offline-1',
      versionTag: 'v1',
      payload: {
        incidentType: 'MISSING_HELMET',
        severity: 'HIGH',
        status: 'OPEN',
        zoneId: zoneAId,
        sourceType: 'CAMERA_DETECTION',
        deviceOrCameraCode: 'CAM_001',
        description: 'Offline synced incident 1',
      },
    });

    await enqueueForCloudSync({
      entityType: 'INCIDENT',
      entityId: 'inc-offline-2',
      versionTag: 'v1',
      payload: {
        incidentType: 'MISSING_SAFETY_VEST',
        severity: 'MEDIUM',
        status: 'OPEN',
        zoneId: zoneAId,
        sourceType: 'CAMERA_DETECTION',
        deviceOrCameraCode: 'CAM_001',
        description: 'Offline synced incident 2',
      },
    });

    // Simulate network outage during sync cycle
    const failCycle = await runCloudSyncCycle({
      customTransport: async () => {
        throw new Error('ECONNREFUSED: Cloud Atlas unreachable');
      },
    });
    assert.equal(failCycle.failed, 2);

    const retryItems = await SyncOutbox.find({ syncStatus: 'FAILED_RETRY' });
    assert.equal(retryItems.length, 2);
    assert.equal(retryItems[0].retryCount, 1);
    assert.ok(retryItems[0].nextRetryAt > new Date());

    // Fast-forward nextRetryAt and run sync cycle against live POST /api/sync/batch endpoint
    await SyncOutbox.updateMany({}, { $set: { nextRetryAt: new Date(Date.now() - 1000) } });

    const okCycle = await runCloudSyncCycle({
      customTransport: async (batch) => {
        const res = await request(app)
          .post('/api/sync/batch')
          .set('X-Edge-Node-Key', process.env.EDGE_NODE_SYNC_KEY)
          .send({ items: batch });
        assert.equal(res.status, 200);
        assert.equal(res.body.data.applied, 2);
      },
    });
    assert.equal(okCycle.synced, 2);
    assert.equal(await SyncOutbox.countDocuments({ syncStatus: 'SYNCED' }), 2);
  });

  test('2. Idempotent Batch Replay: Replaying the Same Batch 3 Times Produces Zero Duplicate Incidents', async () => {
    const outboxDocs = await SyncOutbox.find({}).lean();
    const batch = outboxDocs.map((d) => ({
      idempotencyKey: d.idempotencyKey,
      entityType: d.entityType,
      entityId: d.entityId,
      payload: d.payload,
    }));

    const countBefore = await Incident.countDocuments({});
    assert.equal(countBefore, 2);

    // Replay 1
    const r1 = await request(app)
      .post('/api/sync/batch')
      .set('X-Edge-Node-Key', process.env.EDGE_NODE_SYNC_KEY)
      .send({ items: batch });
    assert.equal(r1.status, 200);
    assert.equal(r1.body.data.applied, 0);
    assert.equal(r1.body.data.duplicatesIgnored, 2);

    // Replay 2
    const r2 = await request(app)
      .post('/api/sync/batch')
      .set('X-Edge-Node-Key', process.env.EDGE_NODE_SYNC_KEY)
      .send({ items: batch });
    assert.equal(r2.status, 200);
    assert.equal(await Incident.countDocuments({}), 2, 'Zero duplicate incidents created after batch replays');

    // Unauthenticated batch call rejected -> 401
    const unauth = await request(app).post('/api/sync/batch').send({ items: batch });
    assert.equal(unauth.status, 401);
  });
});
