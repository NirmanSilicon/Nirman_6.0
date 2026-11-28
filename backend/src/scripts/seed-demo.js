/**
 * SmartPPE — Warden's Eye
 * Idempotent Local MongoDB Demo Seed Script (`npm --prefix backend run db:seed`)
 *
 * Seeds the core accounts, workplace zones, supervisor zone assignments,
 * workers with 13.56 MHz RFID UIDs, ESP32 devices (`ESP32_001`), and
 * cameras (`CAM_001` for Smartphone Wi-Fi / ML monitoring) so the entire
 * Python ML app, Smartphone Wi-Fi stream, and Backend API work out-of-the-box.
 */

const bcrypt = require('bcryptjs');
const { getEnv } = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const { User } = require('../models/User.model');
const { Zone } = require('../models/Zone.model');
const { Worker } = require('../models/Worker.model');
const { ZoneAssignment } = require('../models/ZoneAssignment.model');
const { Device } = require('../models/Device.model');
const { Camera } = require('../models/Camera.model');
const { hashDeviceApiKey } = require('../middleware/deviceAuth.middleware');

// Known development ESP32 key for local hardware/simulator testing (never used in production)
const DEV_ESP32_001_RAW_KEY = 'esp32_dev_local_node_001_key';

const seedDemoData = async () => {
  try {
    await connectDB();
    const { bcryptSaltRounds } = getEnv();

    console.log('======================================================================');
    console.log(' SmartPPE — Warden\'s Eye: Seeding Local MongoDB Foundation Data');
    console.log('======================================================================');

    // 1. Seed Users (ADMINISTRATOR, SUPERVISOR, WORKER)
    const adminPasswordHash = await bcrypt.hash('AdminPassword123!', bcryptSaltRounds);
    const supPasswordHash = await bcrypt.hash('SupervisorPassword123!', bcryptSaltRounds);
    const wrkPasswordHash = await bcrypt.hash('WorkerPassword123!', bcryptSaltRounds);

    const adminUser = await User.findOneAndUpdate(
      { email: 'admin@smartppe.local' },
      {
        $setOnInsert: {
          name: 'System Administrator',
          email: 'admin@smartppe.local',
          passwordHash: adminPasswordHash,
          role: 'ADMINISTRATOR',
          status: 'ACTIVE',
        },
      },
      { new: true, upsert: true }
    );

    const supervisorA = await User.findOneAndUpdate(
      { email: 'supervisor.a@smartppe.local' },
      {
        $setOnInsert: {
          name: 'Zone A Safety Supervisor',
          email: 'supervisor.a@smartppe.local',
          passwordHash: supPasswordHash,
          role: 'SUPERVISOR',
          status: 'ACTIVE',
        },
      },
      { new: true, upsert: true }
    );

    const worker1User = await User.findOneAndUpdate(
      { email: 'worker1@smartppe.local' },
      {
        $setOnInsert: {
          name: 'Rajesh Sharma (Assembly Worker)',
          email: 'worker1@smartppe.local',
          passwordHash: wrkPasswordHash,
          role: 'WORKER',
          status: 'ACTIVE',
        },
      },
      { new: true, upsert: true }
    );

    // 2. Seed Workplace Zones (ZONE_A & ZONE_B)
    const zoneA = await Zone.findOneAndUpdate(
      { zoneCode: 'ZONE_A' },
      {
        $set: {
          zoneName: 'Assembly Zone A',
          description: 'Primary assembly floor — Safety Helmet, High-Vis Vest, and Boots required',
          status: 'ACTIVE',
        },
      },
      { new: true, upsert: true }
    );

    const zoneB = await Zone.findOneAndUpdate(
      { zoneCode: 'ZONE_B' },
      {
        $set: {
          zoneName: 'Warehouse Zone B',
          description: 'Logistics and heavy forklift handling zone',
          status: 'ACTIVE',
        },
      },
      { new: true, upsert: true }
    );

    // 3. Assign Supervisor A to Assembly Zone A
    await ZoneAssignment.findOneAndUpdate(
      { userId: supervisorA._id, zoneId: zoneA._id },
      {
        $set: {
          assignedBy: adminUser._id,
          status: 'ACTIVE',
          assignedAt: new Date(),
        },
      },
      { new: true, upsert: true }
    );

    // 4. Seed Workers with 13.56 MHz RFID Card UIDs
    await Worker.findOneAndUpdate(
      { employeeCode: 'EMP-001' },
      {
        $set: {
          userId: worker1User._id,
          name: 'Rajesh Sharma',
          department: 'Assembly',
          designation: 'Senior Assembly Technician',
          rfidUid: 'A1B2C3D4',
          zoneId: zoneA._id,
          status: 'ACTIVE',
        },
      },
      { new: true, upsert: true }
    );

    await Worker.findOneAndUpdate(
      { employeeCode: 'EMP-002' },
      {
        $set: {
          name: 'Amit Verma',
          department: 'Logistics',
          designation: 'Forklift Operator',
          rfidUid: 'E5F60718',
          zoneId: zoneB._id,
          status: 'ACTIVE',
        },
      },
      { new: true, upsert: true }
    );

    // 5. Seed Registered ESP32 Device (ESP32_001 in Zone A)
    await Device.findOneAndUpdate(
      { deviceCode: 'ESP32_001' },
      {
        $set: {
          deviceName: 'Assembly Zone A RFID & Sensor Node',
          deviceType: 'ESP32',
          zoneId: zoneA._id,
          apiKeyHash: hashDeviceApiKey(DEV_ESP32_001_RAW_KEY),
          firmwareVersion: '1.0.0',
        },
      },
      { new: true, upsert: true }
    );

    // 6. Seed Registered Cameras (CAM_001 in Zone A for Laptop Webcam AI, CAM_002 in Zone B for Smartphone Wi-Fi Stream AI)
    await Camera.findOneAndUpdate(
      { cameraCode: 'CAM_001' },
      {
        $set: {
          cameraName: 'Assembly Zone A Laptop Webcam AI',
          zoneId: zoneA._id,
          locationDescription: 'Overlooking Assembly Station 1 Entry Gate',
          streamType: 'RTSP',
        },
      },
      { new: true, upsert: true }
    );

    await Camera.findOneAndUpdate(
      { cameraCode: 'CAM_002' },
      {
        $set: {
          cameraName: 'Warehouse Zone B Smartphone Wi-Fi AI Camera',
          zoneId: zoneB._id,
          locationDescription: 'Mobile Wi-Fi Camera Overlooking Warehouse Checkpoint',
          streamType: 'SMARTPHONE_WIFI',
        },
      },
      { new: true, upsert: true }
    );

    console.log('[Seed] Users seeded:');
    console.log('  - ADMINISTRATOR : admin@smartppe.local        (Password: AdminPassword123!)');
    console.log('  - SUPERVISOR    : supervisor.a@smartppe.local (Password: SupervisorPassword123!)');
    console.log('  - WORKER        : worker1@smartppe.local      (Password: WorkerPassword123!)');
    console.log('[Seed] Workplace Zones seeded: ZONE_A (Assembly Zone A), ZONE_B (Warehouse Zone B)');
    console.log('[Seed] Workers seeded: EMP-001 (RFID: A1B2C3D4), EMP-002 (RFID: E5F60718)');
    console.log(`[Seed] ESP32 Device seeded: ESP32_001 (Dev X-Device-Key: ${DEV_ESP32_001_RAW_KEY})`);
    console.log('[Seed] Camera seeded: CAM_001 (Ready for Python ML app & Smartphone Wi-Fi stream)');
    console.log('======================================================================');

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error(`[Seed] Error seeding database: ${error.message}`);
    process.exit(1);
  }
};

seedDemoData();
