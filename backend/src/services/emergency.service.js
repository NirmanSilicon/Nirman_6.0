const { Zone } = require('../models/Zone.model');
const { Worker } = require('../models/Worker.model');
const { playZoneWarningAudio } = require('./speaker.service');
const { eventBus } = require('./eventBus');

const EMERGENCY_RESPONSE_GUIDE = {
  FLAME_DETECTED:
    'Evacuate all personnel from the affected zone immediately, activate nearest manual fire alarm pull station, use appropriate fire extinguisher only if safe, and call Fire Emergency Services.',
  SMOKE_DETECTED:
    'Evacuate personnel from the smoke-affected zone, shut off ventilation/ignition sources if safe, inspect for active fire, and prepare to contact Fire Emergency Services.',
  PERSON_FALL_DETECTED:
    'Dispatch nearest floor supervisor and first-aid responder to the zone immediately, do not move the injured worker unless in immediate danger, and call Medical/Ambulance Services if unresponsive.',
};

/**
 * Build a structured Manual SOS Summary for a Critical Emergency Incident.
 *
 * IMPORTANT SAFETY & HONESTY POLICY:
 * - `automatedExternalDispatch` is always `false`.
 * - The system never falsely claims that external fire stations, ambulances, or authorities
 *   were automatically contacted. Instead, it produces a copy-ready structured SOS card
 *   for manual forwarding by the Supervisor or Organisation Administrator.
 */
const buildManualSosSummary = async ({
  incidentType,
  zoneId,
  deviceOrCameraCode,
  workerId = null,
  sensorValue = null,
  threshold = null,
  confidence = null,
  occurredAt = new Date(),
  organisationName = 'SmartPPE Industrial Facility',
}) => {
  const [zoneDoc, activeZoneWorkers, affectedWorkerDoc] = await Promise.all([
    Zone.findById(zoneId).lean(),
    Worker.find({ lastSeenZoneId: zoneId, status: 'ACTIVE' })
      .select('employeeCode name department lastRfidScanAt')
      .lean(),
    workerId
      ? Worker.findById(workerId).select('employeeCode name department rfidUid').lean()
      : Promise.resolve(null),
  ]);

  const zoneCode = zoneDoc ? zoneDoc.zoneCode : String(zoneId);
  const zoneName = zoneDoc ? zoneDoc.zoneName : 'Workplace Zone';
  const zoneLabel = `${zoneName} (${zoneCode})`;
  const isoTimestamp = new Date(occurredAt).toISOString();
  const recommendedResponse =
    EMERGENCY_RESPONSE_GUIDE[incidentType] ||
    'Evacuate affected zone immediately, verify worker safety, and contact emergency services manually.';

  const workersList = activeZoneWorkers.map((w) => ({
    employeeCode: w.employeeCode,
    name: w.name,
    department: w.department,
    lastRfidScanAt: w.lastRfidScanAt ? new Date(w.lastRfidScanAt).toISOString() : null,
  }));

  const affectedWorker = affectedWorkerDoc
    ? {
        workerId: String(affectedWorkerDoc._id),
        employeeCode: affectedWorkerDoc.employeeCode,
        name: affectedWorkerDoc.name,
        department: affectedWorkerDoc.department,
      }
    : workersList.length === 1
      ? workersList[0]
      : null;

  const workerNamesLine =
    workersList.length > 0
      ? workersList.map((w) => `${w.name} (${w.employeeCode})`).join(', ')
      : 'None checked in via RFID';

  const formattedMessage = [
    '=== URGENT INDUSTRIAL EMERGENCY — MANUAL SOS DISPATCH SUMMARY ===',
    `Organisation / Facility : ${organisationName}`,
    `Workplace Zone          : ${zoneLabel}`,
    `Emergency Type          : ${incidentType} (Severity: CRITICAL)`,
    `Source Device / Camera  : ${deviceOrCameraCode || 'UNKNOWN'}`,
    `Timestamp (UTC)         : ${isoTimestamp}`,
    `Affected Worker (RFID)  : ${affectedWorker ? `${affectedWorker.name} (${affectedWorker.employeeCode})` : 'Unidentified / Multiple'}`,
    `Active Workers in Zone  : ${workerNamesLine}`,
    `Recommended Action      : ${recommendedResponse}`,
    'NOTE: Automated external fire/ambulance dispatch is NOT enabled. Forward this SOS or dial emergency services manually.',
  ].join('\n');

  return {
    headline: 'URGENT INDUSTRIAL EMERGENCY — MANUAL DISPATCH REQUIRED',
    organisationName,
    incidentType,
    severity: 'CRITICAL',
    zoneId: String(zoneId),
    zoneCode,
    zoneName,
    zoneLabel,
    deviceOrCameraCode: deviceOrCameraCode || null,
    affectedWorker,
    sensorValue,
    threshold,
    confidence,
    occurredAt: isoTimestamp,
    activeWorkersInZone: workersList,
    recommendedResponse,
    formattedMessage,
    automatedExternalDispatch: false,
    disclaimer:
      'Automated external fire/ambulance dispatch is NOT enabled. Forward this SOS summary or contact emergency services manually.',
  };
};

/**
 * Trigger immediate emergency audio announcement and real-time `emergency:critical` event.
 */
const dispatchCriticalEmergencyAlerts = ({ incident, manualSosSummary }) => {
  const speakerPayload = playZoneWarningAudio({
    zoneCode: manualSosSummary.zoneCode,
    zoneName: manualSosSummary.zoneName,
    missingPPE: [incident.incidentType],
    isEmergency: true,
  });

  const eventPayload = {
    incidentId: incident.incidentId,
    incidentType: incident.incidentType,
    severity: 'CRITICAL',
    status: incident.status,
    isEmergency: true,
    zoneId: String(incident.zoneId),
    zoneLabel: manualSosSummary.zoneLabel,
    deviceOrCameraCode: incident.deviceOrCameraCode,
    occurredAt: manualSosSummary.occurredAt,
    manualSosSummary,
  };

  eventBus.emit('emergency:critical', eventPayload);
  return { speakerPayload, eventPayload };
};

module.exports = {
  EMERGENCY_RESPONSE_GUIDE,
  buildManualSosSummary,
  dispatchCriticalEmergencyAlerts,
};
