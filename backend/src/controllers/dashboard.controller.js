const mongoose = require('mongoose');
const { Zone } = require('../models/Zone.model');
const { Worker } = require('../models/Worker.model');
const { Device } = require('../models/Device.model');
const { Camera } = require('../models/Camera.model');
const { Incident } = require('../models/Incident.model');
const { PpeDetection } = require('../models/PpeDetection.model');
const { RfidLog } = require('../models/RfidLog.model');
const { AppError } = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');

const buildZoneFilter = (user, requestedZoneId) => {
  if (user.role === 'WORKER') {
    throw new AppError('Access denied. Workers must use /api/workers/me endpoints.', 403, 'FORBIDDEN');
  }
  if (user.role === 'SUPERVISOR') {
    const allowed = user.assignedZoneIds || [];
    if (requestedZoneId) {
      if (!allowed.includes(String(requestedZoneId))) {
        throw new AppError('Access denied to unassigned workplace zone.', 403, 'ZONE_ACCESS_DENIED');
      }
      return { zoneId: new mongoose.Types.ObjectId(requestedZoneId) };
    }
    return { zoneId: { $in: allowed.map((id) => new mongoose.Types.ObjectId(id)) } };
  }
  if (requestedZoneId) {
    if (!mongoose.Types.ObjectId.isValid(requestedZoneId)) {
      throw new AppError('Invalid zoneId query parameter.', 400, 'INVALID_IDENTIFIER');
    }
    return { zoneId: new mongoose.Types.ObjectId(requestedZoneId) };
  }
  return {};
};

const getDashboardOverview = async (req, res, next) => {
  try {
    const zFilter = buildZoneFilter(req.user, req.query.zoneId);
    const presenceCutoff = new Date(Date.now() - 15 * 60 * 1000);

    const [
      totalWorkers,
      activeWorkersInZones,
      activeGraceWarnings,
      openIncidents,
      criticalEmergencies,
      verifiedIncidents,
      selfResolvedInGrace,
      safeDetections,
      violationDetections,
      onlineDevices,
      onlineCameras,
    ] = await Promise.all([
      Worker.countDocuments({ ...zFilter, status: 'ACTIVE' }),
      Worker.countDocuments({
        ...(zFilter.zoneId ? { lastSeenZoneId: zFilter.zoneId } : {}),
        status: 'ACTIVE',
        lastRfidScanAt: { $gte: presenceCutoff },
      }),
      Incident.countDocuments({ ...zFilter, status: 'WARNING_GRACE_PERIOD' }),
      Incident.countDocuments({ ...zFilter, status: { $in: ['OPEN', 'UNDER_REVIEW'] } }),
      Incident.countDocuments({
        ...zFilter,
        isEmergency: true,
        status: { $in: ['OPEN', 'UNDER_REVIEW', 'VERIFIED'] },
      }),
      Incident.countDocuments({ ...zFilter, status: 'VERIFIED' }),
      Incident.countDocuments({ ...zFilter, status: 'SELF_RESOLVED_IN_GRACE' }),
      PpeDetection.countDocuments({ ...zFilter, detectionState: 'SAFE' }),
      PpeDetection.countDocuments({ ...zFilter, detectionState: 'VIOLATION' }),
      Device.countDocuments({ ...zFilter, status: 'ONLINE' }),
      Camera.countDocuments({ ...zFilter, status: 'ONLINE' }),
    ]);

    const denom = safeDetections + violationDetections;
    const ppeCompliancePercent = denom > 0 ? Number(((safeDetections / denom) * 100).toFixed(1)) : 100.0;

    return sendSuccess(res, 200, 'Dashboard overview retrieved successfully', {
      totalWorkers,
      activeWorkersInZones,
      activeGraceWarnings,
      openIncidents,
      criticalEmergencies,
      verifiedIncidents,
      selfResolvedInGrace,
      ppeCompliancePercent,
      onlineDevices,
      onlineCameras,
    });
  } catch (error) {
    return next(error);
  }
};

const getDashboardAnalytics = async (req, res, next) => {
  try {
    const zFilter = buildZoneFilter(req.user, req.query.zoneId);

    const [
      safeCount,
      violationCount,
      uncertainCount,
      byType,
      bySeverity,
      selfResolvedCount,
      escalatedCount,
    ] = await Promise.all([
      PpeDetection.countDocuments({ ...zFilter, detectionState: 'SAFE' }),
      PpeDetection.countDocuments({ ...zFilter, detectionState: 'VIOLATION' }),
      PpeDetection.countDocuments({ ...zFilter, detectionState: 'UNCERTAIN' }),
      Incident.aggregate([
        { $match: zFilter },
        { $group: { _id: '$incidentType', count: { $sum: 1 } } },
      ]),
      Incident.aggregate([
        { $match: zFilter },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      Incident.countDocuments({ ...zFilter, status: 'SELF_RESOLVED_IN_GRACE' }),
      Incident.countDocuments({
        ...zFilter,
        escalatedToSupervisorAt: { $ne: null },
      }),
    ]);

    const denom = safeCount + violationCount;
    const ppeCompliancePercent = denom > 0 ? Number(((safeCount / denom) * 100).toFixed(1)) : 100.0;
    const graceTotal = selfResolvedCount + escalatedCount;
    const selfResolvedRatePercent =
      graceTotal > 0 ? Number(((selfResolvedCount / graceTotal) * 100).toFixed(1)) : 100.0;

    return sendSuccess(res, 200, 'Dashboard analytics retrieved successfully', {
      ppeCompliancePercent,
      selfResolvedRatePercent,
      detectionCounts: {
        SAFE: safeCount,
        VIOLATION: violationCount,
        UNCERTAIN: uncertainCount,
      },
      incidentsByType: Object.fromEntries(byType.map((r) => [r._id, r.count])),
      incidentsBySeverity: Object.fromEntries(bySeverity.map((r) => [r._id, r.count])),
    });
  } catch (error) {
    return next(error);
  }
};

const getDashboardRecentActivities = async (req, res, next) => {
  try {
    const zFilter = buildZoneFilter(req.user, req.query.zoneId);
    const [incidents, rfidLogs] = await Promise.all([
      Incident.find(zFilter)
        .populate('zoneId', 'zoneCode zoneName')
        .populate('workerId', 'employeeCode name')
        .sort({ updatedAt: -1 })
        .limit(15)
        .lean(),
      RfidLog.find(zFilter)
        .populate('zoneId', 'zoneCode zoneName')
        .populate('workerId', 'employeeCode name')
        .sort({ occurredAt: -1 })
        .limit(15)
        .lean(),
    ]);

    const activities = [
      ...incidents.map((inc) => ({
        activityType: inc.isEmergency ? 'CRITICAL_EMERGENCY' : 'INCIDENT',
        id: String(inc._id),
        title: `${inc.incidentType} (${inc.status})`,
        description: inc.description,
        zone: inc.zoneId ? inc.zoneId.zoneName : null,
        severity: inc.severity,
        occurredAt: inc.updatedAt || inc.createdAt,
      })),
      ...rfidLogs.map((log) => ({
        activityType: 'RFID_SCAN',
        id: String(log._id),
        title: `RFID ${log.scanStatus}: ${log.rfidUid}`,
        description: log.workerId ? `${log.workerId.name} (${log.workerId.employeeCode})` : 'Unknown RFID card',
        zone: log.zoneId ? log.zoneId.zoneName : null,
        severity: log.scanStatus === 'UNKNOWN_CARD' ? 'MEDIUM' : 'LOW',
        occurredAt: log.occurredAt,
      })),
    ]
      .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))
      .slice(0, 25);

    return sendSuccess(res, 200, 'Recent activities retrieved successfully', {
      activities,
      total: activities.length,
    });
  } catch (error) {
    return next(error);
  }
};

const getDashboardZones = async (req, res, next) => {
  try {
    if (req.user.role === 'WORKER') {
      throw new AppError('Access denied. Workers cannot query zone health cards.', 403, 'FORBIDDEN');
    }
    const zoneMongoFilter =
      req.user.role === 'SUPERVISOR'
        ? { _id: { $in: (req.user.assignedZoneIds || []).map((id) => new mongoose.Types.ObjectId(id)) } }
        : {};

    const zones = await Zone.find(zoneMongoFilter).sort({ zoneCode: 1 }).lean();
    const cards = await Promise.all(
      zones.map(async (z) => {
        const [activeWorkers, openIncidents, activeWarnings, onlineCameras, onlineDevices] = await Promise.all([
          Worker.countDocuments({ lastSeenZoneId: z._id, status: 'ACTIVE' }),
          Incident.countDocuments({ zoneId: z._id, status: { $in: ['OPEN', 'UNDER_REVIEW'] } }),
          Incident.countDocuments({ zoneId: z._id, status: 'WARNING_GRACE_PERIOD' }),
          Camera.countDocuments({ zoneId: z._id, status: 'ONLINE' }),
          Device.countDocuments({ zoneId: z._id, status: 'ONLINE' }),
        ]);
        return {
          zoneId: String(z._id),
          zoneCode: z.zoneCode,
          zoneName: z.zoneName,
          status: z.status,
          activeWorkers,
          openIncidents,
          activeWarnings,
          onlineCameras,
          onlineDevices,
        };
      })
    );

    return sendSuccess(res, 200, 'Zone safety health cards retrieved', {
      zones: cards,
      total: cards.length,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getDashboardOverview,
  getDashboardAnalytics,
  getDashboardRecentActivities,
  getDashboardZones,
};
