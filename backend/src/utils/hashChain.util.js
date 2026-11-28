const crypto = require('crypto');
const { IncidentEvidence } = require('../models/IncidentEvidence.model');

const GENESIS_HASH = '0'.repeat(64);

const idOrNull = (value) => (value ? String(value) : null);
const isoOrNull = (value) => (value ? new Date(value).toISOString() : null);

/**
 * Deterministic canonical JSON (sorted keys) of every integrity-relevant incident field.
 * `description` and `isEmergency` are included in addition to the fields listed in the plan so that
 * any edit to the incident narrative is detected (the plan's own tamper test edits `description`).
 */
const buildCanonicalPayload = (incident, evidenceHashes = [], previousHash = GENESIS_HASH) => {
  const payload = {
    incidentId: String(incident._id),
    incidentType: incident.incidentType,
    severity: incident.severity,
    isEmergency: Boolean(incident.isEmergency),
    zoneId: idOrNull(incident.zoneId),
    workerId: idOrNull(incident.workerId),
    sourceType: incident.sourceType,
    sourceId: idOrNull(incident.sourceId),
    deviceOrCameraCode: incident.deviceOrCameraCode || null,
    description: incident.description,
    status: incident.status,
    verifiedBy: idOrNull(incident.verifiedBy),
    verifiedAt: isoOrNull(incident.verifiedAt),
    verificationNotes: incident.verificationNotes || null,
    resolvedBy: idOrNull(incident.resolvedBy),
    resolvedAt: isoOrNull(incident.resolvedAt),
    resolutionNotes: incident.resolutionNotes || null,
    evidenceHashes: [...evidenceHashes].sort(),
    previousHash,
  };
  return JSON.stringify(payload, Object.keys(payload).sort());
};

const computeCanonicalIncidentHash = (incident, evidenceHashes = [], previousHash = GENESIS_HASH) =>
  crypto.createHash('sha256').update(buildCanonicalPayload(incident, evidenceHashes, previousHash)).digest('hex');

const getEvidenceHashes = async (incidentObjectId) => {
  const rows = await IncidentEvidence.find({ incidentId: incidentObjectId, fileHash: { $ne: null } })
    .select('fileHash')
    .lean();
  return rows.map((r) => r.fileHash);
};

/**
 * Seal (or re-seal) the incident: compute `recordHash` and persist it with `previousHash`.
 * The chain link (`previousHash`) is set once, on first seal, from the most recently created sealed
 * incident (or the genesis hash), and kept stable on re-seals.
 */
const sealIncidentHash = async (incident) => {
  const { Incident } = require('../models/Incident.model');
  let previousHash = incident.previousHash;
  if (!previousHash) {
    const last = await Incident.findOne({ recordHash: { $ne: null }, _id: { $ne: incident._id } })
      .sort({ createdAt: -1, _id: -1 })
      .select('recordHash')
      .lean();
    previousHash = last ? last.recordHash : GENESIS_HASH;
  }
  const evidenceHashes = await getEvidenceHashes(incident._id);
  incident.previousHash = previousHash;
  incident.recordHash = computeCanonicalIncidentHash(incident, evidenceHashes, previousHash);
  await incident.save();
  return incident;
};

/**
 * Recompute the canonical hash from the current database fields and compare with the stored hash.
 */
const verifyIncidentIntegrity = async (incident) => {
  if (!incident.recordHash) {
    return {
      sealed: false,
      integrityValid: null,
      storedRecordHash: null,
      computedRecordHash: null,
      previousHash: incident.previousHash || null,
    };
  }
  const evidenceHashes = await getEvidenceHashes(incident._id);
  const computed = computeCanonicalIncidentHash(incident, evidenceHashes, incident.previousHash || GENESIS_HASH);
  return {
    sealed: true,
    integrityValid: computed === incident.recordHash,
    storedRecordHash: incident.recordHash,
    computedRecordHash: computed,
    previousHash: incident.previousHash || null,
  };
};

module.exports = {
  GENESIS_HASH,
  buildCanonicalPayload,
  computeCanonicalIncidentHash,
  sealIncidentHash,
  verifyIncidentIntegrity,
};
