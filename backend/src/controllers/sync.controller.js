const crypto = require('crypto');
const {
  applyIncomingSyncBatch,
  runCloudSyncCycle,
  getCloudSyncStatusSummary,
} = require('../services/cloudSync.service');
const { AppError } = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');

const verifyEdgeNodeKey = (req) => {
  const expectedKey = process.env.EDGE_NODE_SYNC_KEY || process.env.ML_SERVICE_API_KEY || '';
  const providedKey = req.headers['x-edge-node-key'] || req.headers['x-ml-service-key'] || '';
  if (!expectedKey || !providedKey) {
    throw new AppError('Edge node sync authentication required (X-Edge-Node-Key).', 401, 'SYNC_AUTH_REQUIRED');
  }
  const bufA = Buffer.from(String(expectedKey));
  const bufB = Buffer.from(String(providedKey));
  if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
    throw new AppError('Invalid X-Edge-Node-Key.', 401, 'INVALID_EDGE_NODE_KEY');
  }
};

const receiveSyncBatch = async (req, res, next) => {
  try {
    verifyEdgeNodeKey(req);
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const result = await applyIncomingSyncBatch(items);
    return sendSuccess(res, 200, 'Cloud sync batch processed idempotently', result);
  } catch (error) {
    return next(error);
  }
};

const triggerSyncCycle = async (req, res, next) => {
  try {
    const cycleResult = await runCloudSyncCycle();
    const status = await getCloudSyncStatusSummary();
    return sendSuccess(res, 200, 'Cloud sync cycle executed', {
      cycleResult,
      status,
    });
  } catch (error) {
    return next(error);
  }
};

const getSyncStatus = async (_req, res, next) => {
  try {
    const status = await getCloudSyncStatusSummary();
    return sendSuccess(res, 200, 'Cloud sync status retrieved', status);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  receiveSyncBatch,
  triggerSyncCycle,
  getSyncStatus,
};
