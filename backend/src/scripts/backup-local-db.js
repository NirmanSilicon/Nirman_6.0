#!/usr/bin/env node
/**
 * SmartPPE — Warden's Eye: Local MongoDB Backup & Restore Utility
 * (`backend/src/scripts/backup-local-db.js`)
 *
 * Exports and restores timestamped JSON snapshots of all operational collections
 * to `backups/` (`gitignore`d) for offline resilience.
 */

const fs = require('fs');
const path = require('path');
const { connectDB, disconnectDB } = require('../config/db');
const { User } = require('../models/User.model');
const { Zone } = require('../models/Zone.model');
const { Worker } = require('../models/Worker.model');
const { ZoneAssignment } = require('../models/ZoneAssignment.model');
const { Device } = require('../models/Device.model');
const { Camera } = require('../models/Camera.model');
const { RfidLog } = require('../models/RfidLog.model');
const { PpeDetection } = require('../models/PpeDetection.model');
const { SensorEvent } = require('../models/SensorEvent.model');
const { Incident } = require('../models/Incident.model');
const { IncidentEvidence } = require('../models/IncidentEvidence.model');
const { AuditLog } = require('../models/AuditLog.model');

const MODELS = {
  users: User,
  zones: Zone,
  workers: Worker,
  zoneAssignments: ZoneAssignment,
  devices: Device,
  cameras: Camera,
  rfidLogs: RfidLog,
  ppeDetections: PpeDetection,
  sensorEvents: SensorEvent,
  incidents: Incident,
  incidentEvidences: IncidentEvidence,
  auditLogs: AuditLog,
};

const exportLocalBackup = async (targetDir = null) => {
  const backupRoot = targetDir || path.resolve(__dirname, '../../../backups');
  fs.mkdirSync(backupRoot, { recursive: true });

  const snapshot = {
    createdAt: new Date().toISOString(),
    collections: {},
    counts: {},
  };

  for (const [name, Model] of Object.entries(MODELS)) {
    const docs = await Model.find({}).lean();
    snapshot.collections[name] = docs;
    snapshot.counts[name] = docs.length;
  }

  const fileName = `smartppe-backup-${Date.now()}.json`;
  const filePath = path.join(backupRoot, fileName);
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
  return { filePath, counts: snapshot.counts, createdAt: snapshot.createdAt };
};

const restoreLocalBackup = async (backupFilePath) => {
  const raw = fs.readFileSync(backupFilePath, 'utf-8');
  const snapshot = JSON.parse(raw);
  const restoredCounts = {};

  for (const [name, Model] of Object.entries(MODELS)) {
    const docs = snapshot.collections?.[name] || [];
    restoredCounts[name] = 0;
    for (const doc of docs) {
      await Model.findOneAndUpdate({ _id: doc._id }, { $set: doc }, { upsert: true });
      restoredCounts[name] += 1;
    }
  }

  return { restoredCounts };
};

if (require.main === module) {
  (async () => {
    await connectDB();
    const res = await exportLocalBackup();
    console.log(`[Backup] Local MongoDB backup written to: ${res.filePath}`);
    console.log('[Backup] Collection counts:', res.counts);
    await disconnectDB();
  })().catch((err) => {
    console.error('[Backup] Failed:', err.message);
    process.exit(1);
  });
}

module.exports = {
  exportLocalBackup,
  restoreLocalBackup,
};
