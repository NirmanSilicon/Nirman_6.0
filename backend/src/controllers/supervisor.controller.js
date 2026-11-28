const mongoose = require('mongoose');
const { Zone } = require('../models/Zone.model');
const { Worker } = require('../models/Worker.model');
const { recordAuditLog } = require('../services/audit.service');
const { eventBus } = require('../services/eventBus');
const { sealIncidentHash } = require('../utils/hashChain.util');
const { assertIncidentAccess, loadIncidentOr404 } = require('./incident.controller');
const { AppError } = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');

const invalidState = (incident, action) =>
  new AppError(
    `Cannot ${action} an incident in status '${incident.status}'.`,
    409,
    'INVALID_INCIDENT_STATE'
  );

const loadAuthorizedIncident = async (req) => {
  const incident = await loadIncidentOr404(req.params.id);
  assertIncidentAccess(req.user, incident);
  return incident;
};

const getSupervisorZones = async (req, res, next) => {
  try {
    const filter = req.user.role === 'SUPERVISOR' ? { _id: { $in: req.user.assignedZoneIds } } : {};
    const zones = await Zone.find(filter).sort({ zoneCode: 1 });
    return sendSuccess(res, 200, 'Zones retrieved successfully', { zones, total: zones.length });
  } catch (error) {
    return next(error);
  }
};

const acknowledgeIncident = async (req, res, next) => {
  try {
    const incident = await loadAuthorizedIncident(req);
    if (incident.status !== 'OPEN') throw invalidState(incident, 'acknowledge');

    incident.status = 'UNDER_REVIEW';
    incident.acknowledgedBy = req.user.userId;
    incident.assignedSupervisorId = req.user.userId;
    incident.acknowledgedAt = new Date();
    await incident.save();

    await recordAuditLog({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: 'INCIDENT_ACKNOWLEDGED',
      entityType: 'INCIDENT',
      entityId: incident.incidentId,
      details: { zoneId: String(incident.zoneId) },
    });
    eventBus.emit('incident:updated', { incidentId: incident.incidentId, status: incident.status });
    return sendSuccess(res, 200, 'Incident acknowledged', { incident });
  } catch (error) {
    return next(error);
  }
};

const verifyIncident = async (req, res, next) => {
  try {
    const incident = await loadAuthorizedIncident(req);
    if (!['OPEN', 'UNDER_REVIEW'].includes(incident.status)) throw invalidState(incident, 'verify');

    const { verificationStatus, verificationNotes, confirmedWorkerId } = req.body;

    if (confirmedWorkerId) {
      if (!mongoose.Types.ObjectId.isValid(confirmedWorkerId)) {
        throw new AppError('Invalid confirmedWorkerId.', 400, 'INVALID_IDENTIFIER');
      }
      const worker = await Worker.findOne({ _id: confirmedWorkerId, status: 'ACTIVE' });
      const inZone =
        worker &&
        (String(worker.zoneId) === String(incident.zoneId) ||
          String(worker.lastSeenZoneId) === String(incident.zoneId));
      if (!inZone) {
        throw new AppError(
          'confirmedWorkerId must be an active worker assigned to, or checked into, the incident zone.',
          400,
          'WORKER_NOT_IN_ZONE'
        );
      }
      incident.workerId = worker._id;
    }

    incident.status = verificationStatus;
    incident.verifiedBy = req.user.userId;
    incident.verifiedAt = new Date();
    incident.verificationNotes = verificationNotes;
    await sealIncidentHash(incident);

    await recordAuditLog({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: verificationStatus === 'VERIFIED' ? 'INCIDENT_VERIFIED' : 'INCIDENT_REJECTED',
      entityType: 'INCIDENT',
      entityId: incident.incidentId,
      details: { zoneId: String(incident.zoneId), recordHash: incident.recordHash },
    });
    eventBus.emit('incident:updated', { incidentId: incident.incidentId, status: incident.status });
    return sendSuccess(res, 200, `Incident ${verificationStatus.toLowerCase()}`, { incident });
  } catch (error) {
    return next(error);
  }
};

const resolveIncident = async (req, res, next) => {
  try {
    const incident = await loadAuthorizedIncident(req);
    if (!['OPEN', 'UNDER_REVIEW', 'VERIFIED'].includes(incident.status)) throw invalidState(incident, 'resolve');

    incident.status = 'RESOLVED';
    incident.resolvedBy = req.user.userId;
    incident.resolvedAt = new Date();
    incident.resolutionNotes = req.body.resolutionNotes;
    await sealIncidentHash(incident);

    await recordAuditLog({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: 'INCIDENT_RESOLVED',
      entityType: 'INCIDENT',
      entityId: incident.incidentId,
      details: { zoneId: String(incident.zoneId), recordHash: incident.recordHash },
    });
    eventBus.emit('incident:updated', { incidentId: incident.incidentId, status: incident.status });
    return sendSuccess(res, 200, 'Incident resolved', { incident });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getSupervisorZones, acknowledgeIncident, verifyIncident, resolveIncident };
