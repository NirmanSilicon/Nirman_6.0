const { Incident } = require('../models/Incident.model');
const { recordAuditLog } = require('./audit.service');
const { eventBus } = require('./eventBus');

const PPE_GRACE_TYPES = [
  'MISSING_HELMET',
  'MISSING_SAFETY_VEST',
  'MISSING_SAFETY_BOOTS',
  'MULTIPLE_PPE_VIOLATION',
];

let sweepTimer = null;

/**
 * A SAFE camera detection means no worker in the frame is missing PPE. Any active grace-period
 * warning on that camera is therefore self-resolved without supervisor escalation.
 * Only warnings still inside their grace window are resolved; expired ones belong to the supervisor.
 */
const handleSafeComplianceRecovery = async (camera) => {
  const now = new Date();
  const active = await Incident.find({
    status: 'WARNING_GRACE_PERIOD',
    graceExpiresAt: { $gt: now },
    zoneId: camera.zoneId,
    deviceOrCameraCode: camera.cameraCode,
    incidentType: { $in: PPE_GRACE_TYPES },
  }).select('_id');

  const resolvedIds = [];
  for (const { _id } of active) {
    const updated = await Incident.findOneAndUpdate(
      { _id, status: 'WARNING_GRACE_PERIOD', graceExpiresAt: { $gt: new Date() } },
      { $set: { status: 'SELF_RESOLVED_IN_GRACE', selfResolvedAt: new Date() } },
      { new: true }
    );
    if (!updated) continue;
    resolvedIds.push(updated.incidentId);
    await recordAuditLog({
      actorRole: 'SYSTEM',
      action: 'WARNING_SELF_RESOLVED_IN_GRACE',
      entityType: 'INCIDENT',
      entityId: updated.incidentId,
      details: { cameraCode: camera.cameraCode, zoneId: String(camera.zoneId) },
    });
    eventBus.emit('warning:resolved', {
      incidentId: updated.incidentId,
      zoneId: String(updated.zoneId),
      cameraCode: camera.cameraCode,
    });
  }
  return resolvedIds;
};

/**
 * Escalate every WARNING_GRACE_PERIOD incident whose grace period has expired to OPEN.
 * Each incident is escalated atomically, so concurrent sweeps can never escalate twice.
 */
const processExpiredGraceWarnings = async ({ auditAction = 'WARNING_ESCALATED_AFTER_GRACE' } = {}) => {
  const expired = await Incident.find({
    status: 'WARNING_GRACE_PERIOD',
    graceExpiresAt: { $lte: new Date() },
  }).select('_id');

  const escalatedIds = [];
  for (const { _id } of expired) {
    const updated = await Incident.findOneAndUpdate(
      { _id, status: 'WARNING_GRACE_PERIOD' },
      { $set: { status: 'OPEN', escalatedToSupervisorAt: new Date() } },
      { new: true }
    );
    if (!updated) continue;
    escalatedIds.push(updated.incidentId);
    await recordAuditLog({
      actorRole: 'SYSTEM',
      action: auditAction,
      entityType: 'INCIDENT',
      entityId: updated.incidentId,
      details: {
        zoneId: String(updated.zoneId),
        incidentType: updated.incidentType,
        deviceOrCameraCode: updated.deviceOrCameraCode,
      },
    });
    eventBus.emit('incident:new', {
      incidentId: updated.incidentId,
      zoneId: String(updated.zoneId),
      incidentType: updated.incidentType,
      severity: updated.severity,
    });
  }
  return { escalated: escalatedIds.length, incidentIds: escalatedIds };
};

/**
 * Backend startup recovery: grace timers live in MongoDB (`graceExpiresAt`), so a restart never loses
 * them. Warnings that expired while the backend was down are escalated immediately; the rest keep
 * counting down and are completed by the periodic sweep.
 */
const recoverPendingGraceTimers = async () => {
  const { escalated, incidentIds } = await processExpiredGraceWarnings({
    auditAction: 'WARNING_RECOVERED_AND_ESCALATED_ON_BOOT',
  });
  const stillPending = await Incident.countDocuments({ status: 'WARNING_GRACE_PERIOD' });
  return { escalated, incidentIds, stillPending };
};

const startGraceSweepTimer = (intervalMs = 2000) => {
  if (sweepTimer) return sweepTimer;
  sweepTimer = setInterval(async () => {
    try {
      await processExpiredGraceWarnings();
    } catch (error) {
      console.error(`[GraceSweep] ${error.message}`);
    }
  }, intervalMs);
  sweepTimer.unref();
  return sweepTimer;
};

const stopGraceSweepTimer = () => {
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
  }
};

module.exports = {
  PPE_GRACE_TYPES,
  handleSafeComplianceRecovery,
  processExpiredGraceWarnings,
  recoverPendingGraceTimers,
  startGraceSweepTimer,
  stopGraceSweepTimer,
};
