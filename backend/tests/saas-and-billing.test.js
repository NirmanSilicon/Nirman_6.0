const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const path = require('path');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_smartppe_phase13_14_15_saas_billing_256bit';
process.env.BCRYPT_SALT_ROUNDS = '4';
process.env.ML_SERVICE_API_KEY = 'ml_test_service_secret_key_for_phase13_14_15';

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const { User } = require('../src/models/User.model');
const { Zone } = require('../src/models/Zone.model');
const { Device } = require('../src/models/Device.model');
const { Camera } = require('../src/models/Camera.model');
const { Incident } = require('../src/models/Incident.model');
const { Organisation, Site, Building, Floor, SafetyPolicy } = require('../src/models/Organisation.model');
const { Subscription, PaymentTransaction, Invoice } = require('../src/models/Subscription.model');
const { encryptCameraCredentials, decryptCameraCredentials } = require('../src/utils/crypto.util');
const { getRazorpayTestSecret } = require('../src/controllers/billing.controller');
const { buildMockDetectionPayload } = require('../src/services/mockMl.service');

let mongoServer;
let adminToken;
let orgAId;
let orgBId;
let zoneAId;
let device1ApiKey;

describe("SmartPPE — Warden's Eye: Phases 13, 14 & 15 Multi-Organisation SaaS, Quotas, Safety Continuity & Blockchain Anchoring Test Suite", () => {
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
      Device.init(),
      Camera.init(),
      Incident.init(),
      Organisation.init(),
      Site.init(),
      Building.init(),
      Floor.init(),
      SafetyPolicy.init(),
      Subscription.init(),
      PaymentTransaction.init(),
      Invoice.init(),
    ]);

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

    const devRes = await request(app)
      .post('/api/devices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ deviceCode: 'ESP32_001', deviceName: 'Zone A Node', zoneId: zoneAId });
    device1ApiKey = devRes.body.data.deviceApiKey;

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
    await disconnectDB();
    if (mongoServer) await mongoServer.stop();
  });

  test('1. Phase 13: Multi-Organisation Onboarding, Hierarchy (Site/Building/Floor), AES-256-GCM Credentials & Cross-Tenant Isolation', async () => {
    // AES-256-GCM encryption round-trip check
    const cipher = encryptCameraCredentials('rtsp_admin:SuperSecretRtspPass!');
    assert.ok(cipher && !cipher.includes('SuperSecretRtspPass!'));
    assert.equal(decryptCameraCredentials(cipher), 'rtsp_admin:SuperSecretRtspPass!');

    // Create Organisation A (STARTER plan -> maxSites: 1)
    const orgARes = await request(app)
      .post('/api/organisations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Apex Steel Manufacturing Ltd',
        slug: 'apex-steel',
        industryType: 'MANUFACTURING',
        contactEmail: 'safety@apexsteel.local',
        planTier: 'STARTER',
      });
    assert.equal(orgARes.status, 201);
    orgAId = orgARes.body.data.organisation.organisationId;

    // Create Organisation B
    const orgBRes = await request(app)
      .post('/api/organisations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Nova Logistics Warehousing',
        slug: 'nova-logistics',
        industryType: 'WAREHOUSE',
        contactEmail: 'ops@novalogistics.local',
        planTier: 'PROFESSIONAL',
      });
    assert.equal(orgBRes.status, 201);
    orgBId = orgBRes.body.data.organisation.organisationId;

    // Cross-tenant isolation check: user scoped to Org A attempting to read Org B -> 403 CROSS_TENANT_ACCESS_DENIED
    const crossTenantRes = await request(app)
      .get(`/api/organisations/${orgBId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-User-Organisation-Id', orgAId);
    assert.equal(crossTenantRes.status, 403);
    assert.equal(crossTenantRes.body.error.code, 'CROSS_TENANT_ACCESS_DENIED');

    // Create Site 1, Building, and Floor inside Org A
    const site1Res = await request(app)
      .post(`/api/organisations/${orgAId}/sites`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ siteCode: 'SITE_01', siteName: 'Plant 1' });
    assert.equal(site1Res.status, 201);
    const site1Id = site1Res.body.data.site.siteId;

    const bldRes = await request(app)
      .post(`/api/organisations/${orgAId}/buildings`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ siteId: site1Id, buildingCode: 'BLD_A', buildingName: 'Foundry Building A' });
    assert.equal(bldRes.status, 201);

    const flrRes = await request(app)
      .post(`/api/organisations/${orgAId}/floors`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        siteId: site1Id,
        buildingId: bldRes.body.data.building.buildingId,
        floorNumber: 1,
        floorName: 'Ground Floor',
      });
    assert.equal(flrRes.status, 201);

    // Update onboarding step with RTSP credential masking
    const stepRes = await request(app)
      .patch(`/api/organisations/${orgAId}/onboarding`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ step: 5, rtspUsername: 'cam_user', rtspPassword: 'cam_password_123' });
    assert.equal(stepRes.status, 200);
    assert.equal(stepRes.body.data.organisation.onboardingStep, 5);
    assert.equal(stepRes.body.data.encryptedCredentialsPreview.masked, '********');
  });

  test('2. Phase 14: Subscription Quota Enforcement, Razorpay Test Webhook & Safety Continuity When Expired', async () => {
    // Org A is on STARTER plan (maxSites: 1) and already has 1 site -> adding a 2nd site must return 403 QUOTA_EXCEEDED
    const quotaRes = await request(app)
      .post(`/api/organisations/${orgAId}/sites`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ siteCode: 'SITE_02', siteName: 'Plant 2 Exceeding Starter Quota' });
    assert.equal(quotaRes.status, 403);
    assert.equal(quotaRes.body.error.code, 'QUOTA_EXCEEDED');

    // Upgrade Org A to PROFESSIONAL via Razorpay Test Mode Checkout + HMAC-SHA256 Webhook
    const checkoutRes = await request(app)
      .post('/api/billing/checkout')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ organisationId: orgAId, planTier: 'PROFESSIONAL', billingCycle: 'MONTHLY' });
    assert.equal(checkoutRes.status, 201);
    const orderId = checkoutRes.body.data.orderId;
    const paymentId = 'pay_test_99887766';

    const validSignature = crypto
      .createHmac('sha256', getRazorpayTestSecret())
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const webhookRes = await request(app)
      .post('/api/billing/webhooks/razorpay')
      .set('x-razorpay-signature', validSignature)
      .send({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        planTier: 'PROFESSIONAL',
        billingCycle: 'MONTHLY',
      });
    assert.equal(webhookRes.status, 200);
    assert.equal(webhookRes.body.data.subscription.planTier, 'PROFESSIONAL');
    assert.equal(webhookRes.body.data.subscription.status, 'ACTIVE');
    assert.ok(webhookRes.body.data.invoice.invoiceNumber.startsWith('INV-'));

    // Now adding Site 2 succeeds under PROFESSIONAL quota (maxSites: 3)
    const site2AfterUpgrade = await request(app)
      .post(`/api/organisations/${orgAId}/sites`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ siteCode: 'SITE_02', siteName: 'Plant 2 Allowed After Upgrade' });
    assert.equal(site2AfterUpgrade.status, 201);

    // CRITICAL SAFETY CONTINUITY TEST: Expire Org A's subscription and verify safety monitoring still works 100%
    await Subscription.updateOne({ organisationId: orgAId }, { $set: { status: 'EXPIRED' } });

    // Administrative site creation is locked when expired -> 403 SUBSCRIPTION_EXPIRED_ADMIN_LOCKED
    const expiredAdminRes = await request(app)
      .post(`/api/organisations/${orgAId}/sites`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ siteCode: 'SITE_03', siteName: 'Plant 3 Blocked While Expired' });
    assert.equal(expiredAdminRes.status, 403);
    assert.equal(expiredAdminRes.body.error.code, 'SUBSCRIPTION_EXPIRED_ADMIN_LOCKED');

    // BUT camera PPE violation detection, 120s grace warning, critical flame emergency & incident reading MUST SUCCEED!
    const ppeDuringExpiry = await request(app)
      .post('/api/detections')
      .set('X-ML-Service-Key', process.env.ML_SERVICE_API_KEY)
      .send(buildMockDetectionPayload({ cameraCode: 'CAM_001', scenario: 'VIOLATION', missingPPE: ['helmet'] }));
    assert.equal(ppeDuringExpiry.status, 201);
    assert.equal(ppeDuringExpiry.body.data.incidentCreated, true);

    const flameDuringExpiry = await request(app)
      .post('/api/sensors/events')
      .set('X-Device-Code', 'ESP32_001')
      .set('X-Device-Key', device1ApiKey)
      .send({
        deviceCode: 'ESP32_001',
        sensorType: 'FLAME',
        sensorValue: 960,
        threshold: 500,
        alertStatus: 'CRITICAL',
      });
    assert.equal(flameDuringExpiry.status, 201);
    assert.equal(flameDuringExpiry.body.data.incidentCreated, true);

    const incId = flameDuringExpiry.body.data.incidentId;

    // Phase 15: Optional Blockchain Hash Anchoring & Verification
    const anchorRes = await request(app)
      .post(`/api/blockchain/record/${incId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(anchorRes.status, 200);
    assert.ok(anchorRes.body.data.blockchainTxHash.startsWith('0x'));

    const verifyAnchorRes = await request(app)
      .get(`/api/blockchain/verify/${incId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(verifyAnchorRes.status, 200);
    assert.equal(verifyAnchorRes.body.data.integrityValid, true);
    assert.equal(verifyAnchorRes.body.data.anchorMatchesRecordHash, true);
  });
});
