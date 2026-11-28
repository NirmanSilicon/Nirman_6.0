const mongoose = require('mongoose');
const { Incident, INCIDENT_STATUSES, INCIDENT_TYPES, INCIDENT_SEVERITIES } = require('../models/Incident.model');
const { IncidentEvidence } = require('../models/IncidentEvidence.model');
const { Worker } = require('../models/Worker.model');
const { verifyIncidentIntegrity } = require('../utils/hashChain.util');
const { AppError } = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');

const ZONE_POPULATE = 'zoneCode zoneName';
const WORKER_POPULATE = 'employeeCode name department';
const PRESENCE_WINDOW_MS = 15 * 60 * 1000;

/**
 * Role-based access check for a single incident.
 * ADMINISTRATOR: all. SUPERVISOR: assigned zones. WORKER: only incidents linked to their own profile.
 */
const assertIncidentAccess = (user, incident) => {
  if (user.role === 'ADMINISTRATOR') return;
  if (user.role === 'SUPERVISOR') {
    if (!user.assignedZoneIds.includes(String(incident.zoneId?._id || incident.zoneId))) {
      throw new AppError(
        'Access denied. This incident belongs to an unassigned workplace zone.',
        403,
        'ZONE_ACCESS_DENIED'
      );
    }
    return;
  }
  const incidentWorkerId = incident.workerId?._id || incident.workerId;
  if (!user.workerId || !incidentWorkerId || String(incidentWorkerId) !== user.workerId) {
    throw new AppError('Access denied. Workers can only view incidents linked to their own profile.', 403, 'FORBIDDEN');
  }
};

const parseEnum = (value, allowed, field) => {
  const normalized = String(value).toUpperCase();
  if (!allowed.includes(normalized)) {
    throw new AppError(`Invalid ${field}. Allowed values: ${allowed.join(', ')}`, 400, 'VALIDATION_ERROR');
  }
  return normalized;
};

const loadIncidentOr404 = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid incident ID format.', 400, 'INVALID_IDENTIFIER');
  }
  const incident = await Incident.findById(id);
  if (!incident) {
    throw new AppError('Incident not found.', 404, 'INCIDENT_NOT_FOUND');
  }
  return incident;
};

const listIncidents = async (req, res, next) => {
  try {
    const { role, assignedZoneIds, workerId } = req.user;
    const filter = {};

    if (role === 'WORKER') {
      if (!workerId) return sendSuccess(res, 200, 'Incidents retrieved successfully', { incidents: [], total: 0 });
      filter.workerId = workerId;
    } else if (role === 'SUPERVISOR') {
      if (!assignedZoneIds || assignedZoneIds.length === 0) {
        return sendSuccess(res, 200, 'Incidents retrieved successfully', { incidents: [], total: 0 });
      }
      if (req.query.zoneId) {
        const requested = String(req.query.zoneId);
        if (!assignedZoneIds.includes(requested)) {
          throw new AppError(
            'Access denied. Supervisors can only view incidents in their assigned workplace zones.',
            403,
            'ZONE_ACCESS_DENIED'
          );
        }
        filter.zoneId = requested;
      } else {
        filter.zoneId = { $in: assignedZoneIds };
      }
    } else if (req.query.zoneId) {
      const requested = String(req.query.zoneId);
      if (!mongoose.Types.ObjectId.isValid(requested)) {
        throw new AppError('Invalid zoneId query parameter.', 400, 'INVALID_IDENTIFIER');
      }
      filter.zoneId = requested;
    }

    if (req.query.status) filter.status = parseEnum(req.query.status, INCIDENT_STATUSES, 'status');
    if (req.query.incidentType) {
      filter.incidentType = parseEnum(req.query.incidentType, INCIDENT_TYPES, 'incidentType');
    }
    if (req.query.severity) filter.severity = parseEnum(req.query.severity, INCIDENT_SEVERITIES, 'severity');
    if (req.query.isEmergency !== undefined) filter.isEmergency = String(req.query.isEmergency) === 'true';

    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10) || 50));
    const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);

    const [incidents, total] = await Promise.all([
      Incident.find(filter)
        .populate('zoneId', ZONE_POPULATE)
        .populate('workerId', WORKER_POPULATE)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Incident.countDocuments(filter),
    ]);

    return sendSuccess(res, 200, 'Incidents retrieved successfully', { incidents, total, page, limit });
  } catch (error) {
    return next(error);
  }
};

const getIncidentById = async (req, res, next) => {
  try {
    const incident = await loadIncidentOr404(req.params.id);
    assertIncidentAccess(req.user, incident);
    await incident.populate([
      { path: 'zoneId', select: ZONE_POPULATE },
      { path: 'workerId', select: WORKER_POPULATE },
    ]);

    const data = { incident };
    if (req.user.role !== 'WORKER') {
      const zoneObjectId = incident.zoneId._id || incident.zoneId;
      const [evidence, activeWorkersInZone] = await Promise.all([
        IncidentEvidence.find({ incidentId: incident._id }).sort({ createdAt: 1 }),
        Worker.find({
          status: 'ACTIVE',
          lastSeenZoneId: zoneObjectId,
          lastRfidScanAt: { $gte: new Date(Date.now() - PRESENCE_WINDOW_MS) },
        })
          .select('employeeCode name department lastRfidScanAt')
          .lean(),
      ]);
      data.evidence = evidence;
      data.activeWorkersInZone = activeWorkersInZone;
    }
    return sendSuccess(res, 200, 'Incident retrieved successfully', data);
  } catch (error) {
    return next(error);
  }
};

const getMyIncidents = async (req, res, next) => {
  try {
    if (req.user.role !== 'WORKER') {
      throw new AppError('This endpoint is for worker self-service only.', 403, 'FORBIDDEN');
    }
    if (!req.user.workerId) {
      return sendSuccess(res, 200, 'Incidents retrieved successfully', { incidents: [], total: 0 });
    }
    const incidents = await Incident.find({ workerId: req.user.workerId })
      .populate('zoneId', ZONE_POPULATE)
      .sort({ createdAt: -1 })
      .limit(200);
    return sendSuccess(res, 200, 'Incidents retrieved successfully', { incidents, total: incidents.length });
  } catch (error) {
    return next(error);
  }
};

const verifyIncidentRecordIntegrity = async (req, res, next) => {
  try {
    if (req.user.role === 'WORKER') {
      throw new AppError('Access denied. Workers cannot verify record integrity.', 403, 'FORBIDDEN');
    }
    const incident = await loadIncidentOr404(req.params.id);
    assertIncidentAccess(req.user, incident);
    const result = await verifyIncidentIntegrity(incident);
    return sendSuccess(res, 200, 'Incident integrity check completed', {
      incidentId: incident.incidentId,
      ...result,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  assertIncidentAccess,
  loadIncidentOr404,
  listIncidents,
  getIncidentById,
  getMyIncidents,
  verifyIncidentRecordIntegrity,
};
