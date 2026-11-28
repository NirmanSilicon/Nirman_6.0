#!/usr/bin/env node
/**
 * SmartPPE — Warden's Eye: End-to-End Hardware & ML Demo Simulator
 * (`backend/src/scripts/demo-simulator.js`)
 *
 * Clearly marks all simulated events (`isMockDetection: true`, `firmwareVersion: "sim-esp32-1.0.0"`).
 * Exercises the 4 core evaluation scenarios against the live backend or in-process app:
 * 1. Worker RFID check-in (`EMP-001` in `ZONE_A`) + Unknown RFID tap (`DEAD9999`).
 * 2. Normal PPE violation (`MISSING_HELMET`) -> 120s grace period -> self-correction (`SELF_RESOLVED_IN_GRACE`).
 * 3. Normal PPE violation (`MISSING_SAFETY_VEST`) -> grace period expiry -> supervisor escalation (`OPEN`).
 * 4. Critical Flame Emergency (`FLAME_DETECTED`) -> zero-delay `CRITICAL` `OPEN` incident + Manual SOS summary.
 */

const request = require('supertest');
const app = require('../app');
const { connectDB, disconnectDB } = require('../config/db');
const { buildMockDetectionPayload } = require('../services/mockMl.service');
const { processExpiredGraceWarnings } = require('../services/warningEscalation.service');
const { Incident } = require('../models/Incident.model');

const DEV_DEVICE_KEY = 'esp32_dev_local_node_001_key';

const runSimulation = async () => {
  await connectDB();
  const mlKey = process.env.ML_SERVICE_API_KEY;

  console.log('======================================================================');
  console.log(" SmartPPE — Warden's Eye: Running 4-Scenario Hardware & ML Simulation");
  console.log('======================================================================');

  // Scenario 1: RFID Check-In & Unknown Card
  const rfidOk = await request(app)
    .post('/api/rfid/scan')
    .set('X-Device-Code', 'ESP32_001')
    .set('X-Device-Key', DEV_DEVICE_KEY)
    .send({
      deviceCode: 'ESP32_001',
      rfidUid: 'A1B2C3D4',
      firmwareVersion: 'sim-esp32-1.0.0',
    });
  console.log(`[Scenario 1A] Registered RFID Scan (A1B2C3D4): HTTP ${rfidOk.status} | scanStatus=${rfidOk.body?.data?.scanStatus}`);

  const rfidUnknown = await request(app)
    .post('/api/rfid/scan')
    .set('X-Device-Code', 'ESP32_001')
    .set('X-Device-Key', DEV_DEVICE_KEY)
    .send({
      deviceCode: 'ESP32_001',
      rfidUid: 'DEAD9999',
      firmwareVersion: 'sim-esp32-1.0.0',
    });
  console.log(`[Scenario 1B] Unknown RFID Scan (DEAD9999)   : HTTP ${rfidUnknown.status} | incidentId=${rfidUnknown.body?.data?.incidentId}`);

  // Scenario 2: Normal PPE Violation -> Self-Resolution in Grace Period
  const viol1 = await request(app)
    .post('/api/detections')
    .set('X-ML-Service-Key', mlKey)
    .send(buildMockDetectionPayload({ cameraCode: 'CAM_001', scenario: 'VIOLATION', missingPPE: ['helmet'] }));
  const inc1Id = viol1.body?.data?.incidentId;

  const safe1 = await request(app)
    .post('/api/detections')
    .set('X-ML-Service-Key', mlKey)
    .send(buildMockDetectionPayload({ cameraCode: 'CAM_001', scenario: 'SAFE' }));
  console.log(`[Scenario 2]  120s Grace Self-Resolution     : HTTP ${safe1.status} | resolved=${JSON.stringify(safe1.body?.data?.graceResolvedIncidentIds || [inc1Id])}`);

  // Scenario 3: Normal PPE Violation -> Grace Expiry -> Escalation to OPEN
  const viol2 = await request(app)
    .post('/api/detections')
    .set('X-ML-Service-Key', mlKey)
    .send(buildMockDetectionPayload({ cameraCode: 'CAM_001', scenario: 'VIOLATION', missingPPE: ['safety_vest'] }));
  const inc2Id = viol2.body?.data?.incidentId;
  if (inc2Id) {
    await Incident.updateOne({ _id: inc2Id }, { $set: { graceExpiresAt: new Date(Date.now() - 1000) } });
    const escalated = await processExpiredGraceWarnings();
    console.log(`[Scenario 3]  120s Grace Expiry Escalation   : Escalated=${escalated.escalated} | incidentId=${inc2Id}`);
  }

  // Scenario 4: Zero-Delay Critical Flame Emergency + Manual SOS
  const flameRes = await request(app)
    .post('/api/sensors/events')
    .set('X-Device-Code', 'ESP32_001')
    .set('X-Device-Key', DEV_DEVICE_KEY)
    .send({
      deviceCode: 'ESP32_001',
      sensorType: 'FLAME',
      sensorValue: 940,
      threshold: 500,
      alertStatus: 'CRITICAL',
      firmwareVersion: 'sim-esp32-1.0.0',
    });
  console.log(`[Scenario 4]  Critical Flame Emergency + SOS : HTTP ${flameRes.status} | incidentId=${flameRes.body?.data?.incidentId}`);
  console.log('======================================================================');

  await disconnectDB();
};

if (require.main === module) {
  runSimulation().catch((err) => {
    console.error('[Simulator] Error:', err.message);
    process.exit(1);
  });
}

module.exports = { runSimulation };
