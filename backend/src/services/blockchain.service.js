const crypto = require('crypto');
const { Incident } = require('../models/Incident.model');
const { sealIncidentHash, verifyIncidentIntegrity } = require('../utils/hashChain.util');
const { AppError } = require('../utils/AppError');

/**
 * Optional Off-Chain to On-Chain Blockchain Hash Anchoring Service (`blockchain.service.js`).
 *
 * ARCHITECTURAL RULE:
 * - Blockchain anchoring is strictly OPTIONAL and NEVER blocks local offline safety operations.
 * - Only the 64-character SHA-256 `recordHash` (never PII or raw images) is anchored.
 */
const anchorIncidentHash = async (incidentId) => {
  const incident = await Incident.findById(incidentId);
  if (!incident) {
    throw new AppError('Incident not found.', 404, 'INCIDENT_NOT_FOUND');
  }

  if (!incident.recordHash) {
    await sealIncidentHash(incident);
  }

  // Deterministic simulated EVM transaction hash anchoring the off-chain SHA-256 recordHash
  const anchorDigest = crypto
    .createHash('sha256')
    .update(`evm-anchor:${incident._id}:${incident.recordHash}`)
    .digest('hex');
  const txHash = `0x${anchorDigest}`;

  incident.blockchainTxHash = txHash;
  await incident.save();

  return {
    incidentId: incident.incidentId,
    recordHash: incident.recordHash,
    previousHash: incident.previousHash,
    blockchainTxHash: txHash,
    network: process.env.BLOCKCHAIN_NETWORK || 'LOCAL_SIMULATED_EVM_ANCHOR',
    anchoredAt: new Date().toISOString(),
  };
};

const verifyAnchoredIncident = async (incidentId) => {
  const incident = await Incident.findById(incidentId);
  if (!incident) {
    throw new AppError('Incident not found.', 404, 'INCIDENT_NOT_FOUND');
  }
  const integrity = await verifyIncidentIntegrity(incident);
  const expectedTxHash = incident.recordHash
    ? `0x${crypto.createHash('sha256').update(`evm-anchor:${incident._id}:${incident.recordHash}`).digest('hex')}`
    : null;

  return {
    incidentId: incident.incidentId,
    ...integrity,
    blockchainTxHash: incident.blockchainTxHash,
    anchorMatchesRecordHash: Boolean(
      incident.blockchainTxHash && incident.blockchainTxHash === expectedTxHash && integrity.integrityValid
    ),
  };
};

module.exports = {
  anchorIncidentHash,
  verifyAnchoredIncident,
};
