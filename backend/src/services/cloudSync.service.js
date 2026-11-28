const { SyncOutbox } = require('../models/SyncOutbox.model');
const { Incident } = require('../models/Incident.model');
const { RfidLog } = require('../models/RfidLog.model');
const { SensorEvent } = require('../models/SensorEvent.model');
const { AuditLog } = require('../models/AuditLog.model');

/**
 * Enqueue a locally recorded offline event into `SyncOutbox` for asynchronous
 * Local-to-Cloud (MongoDB Atlas / Cloud Hub) synchronization.
 * Never blocks or throws on local safety monitoring paths.
 */
const enqueueForCloudSync = async ({
  entityType,
  entityId,
  payload,
  organisationId = null,
  versionTag = null,
}) => {
  const tag = versionTag || (payload && payload.updatedAt ? new Date(payload.updatedAt).getTime() : Date.now());
  const idempotencyKey = `${entityType}:${entityId}:${tag}`;

  const item = await SyncOutbox.findOneAndUpdate(
    { idempotencyKey },
    {
      $setOnInsert: {
        idempotencyKey,
        organisationId: organisationId || (payload && payload.organisationId) || null,
        entityType,
        entityId: String(entityId),
        operation: 'UPSERT',
        payload,
        syncStatus: 'PENDING',
        retryCount: 0,
        nextRetryAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );
  return item;
};

/**
 * Process an incoming batch of sync items idempotently on the Cloud Receiver (`POST /api/sync/batch`).
 * Replaying the same batch multiple times produces 0 duplicate records.
 */
const applyIncomingSyncBatch = async (items = []) => {
  let applied = 0;
  let duplicatesIgnored = 0;

  for (const item of items) {
    const { idempotencyKey, entityType, payload = {} } = item;
    if (!idempotencyKey || !entityType) continue;

    if (entityType === 'INCIDENT') {
      const existing = await Incident.findOne({ idempotencyKey });
      if (existing) {
        duplicatesIgnored += 1;
        continue;
      }
      await Incident.findOneAndUpdate(
        { idempotencyKey },
        {
          $set: {
            ...payload,
            idempotencyKey,
          },
        },
        { upsert: true, new: true }
      );
      applied += 1;
    } else if (entityType === 'RFID_LOG') {
      const occurredAt = payload.occurredAt ? new Date(payload.occurredAt) : new Date();
      const existing = await RfidLog.findOne({
        rfidUid: payload.rfidUid,
        deviceCode: payload.deviceCode,
        occurredAt,
      });
      if (existing) {
        duplicatesIgnored += 1;
        continue;
      }
      await RfidLog.create({ ...payload, occurredAt });
      applied += 1;
    } else if (entityType === 'SENSOR_EVENT') {
      const occurredAt = payload.occurredAt ? new Date(payload.occurredAt) : new Date();
      const existing = await SensorEvent.findOne({
        deviceCode: payload.deviceCode,
        sensorType: payload.sensorType,
        occurredAt,
      });
      if (existing) {
        duplicatesIgnored += 1;
        continue;
      }
      await SensorEvent.create({ ...payload, occurredAt });
      applied += 1;
    } else if (entityType === 'AUDIT_LOG') {
      const occurredAt = payload.occurredAt ? new Date(payload.occurredAt) : new Date();
      const existing = await AuditLog.findOne({
        action: payload.action,
        entityId: payload.entityId,
        occurredAt,
      });
      if (existing) {
        duplicatesIgnored += 1;
        continue;
      }
      await AuditLog.create({ ...payload, occurredAt });
      applied += 1;
    }
  }

  return { applied, duplicatesIgnored, totalProcessed: items.length };
};

/**
 * Run a single background synchronization cycle:
 * - Fetches up to `batchSize` PENDING or due FAILED_RETRY outbox records.
 * - Dispatches them to `customTransport(batch)` (or local batch processor).
 * - On success: marks records `SYNCED`.
 * - On failure: increments `retryCount`, records `lastError`, and sets exponential backoff
 *   (`nextRetryAt = now + min(300s, 2^retryCount * 5s)`).
 */
const runCloudSyncCycle = async ({ batchSize = 25, customTransport = null } = {}) => {
  const now = new Date();
  const pendingItems = await SyncOutbox.find({
    syncStatus: { $in: ['PENDING', 'FAILED_RETRY'] },
    nextRetryAt: { $lte: now },
  })
    .sort({ createdAt: 1 })
    .limit(batchSize);

  if (pendingItems.length === 0) {
    return { attempted: 0, synced: 0, failed: 0 };
  }

  const batchPayload = pendingItems.map((doc) => ({
    outboxId: doc.outboxId,
    idempotencyKey: doc.idempotencyKey,
    organisationId: doc.organisationId ? String(doc.organisationId) : null,
    entityType: doc.entityType,
    entityId: doc.entityId,
    operation: doc.operation,
    payload: doc.payload,
  }));

  try {
    if (typeof customTransport === 'function') {
      await customTransport(batchPayload);
    } else {
      await applyIncomingSyncBatch(batchPayload);
    }

    const ids = pendingItems.map((d) => d._id);
    await SyncOutbox.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          syncStatus: 'SYNCED',
          syncedAt: new Date(),
          lastError: null,
        },
      }
    );

    return { attempted: pendingItems.length, synced: pendingItems.length, failed: 0 };
  } catch (err) {
    for (const doc of pendingItems) {
      const nextRetryCount = (doc.retryCount || 0) + 1;
      const backoffSec = Math.min(300, Math.pow(2, nextRetryCount) * 5);
      doc.syncStatus = 'FAILED_RETRY';
      doc.retryCount = nextRetryCount;
      doc.lastError = err.message || 'Cloud sync transport error';
      doc.nextRetryAt = new Date(Date.now() + backoffSec * 1000);
      await doc.save();
    }
    return {
      attempted: pendingItems.length,
      synced: 0,
      failed: pendingItems.length,
      error: err.message,
    };
  }
};

const getCloudSyncStatusSummary = async () => {
  const [pending, synced, failedRetry, recentOutbox] = await Promise.all([
    SyncOutbox.countDocuments({ syncStatus: 'PENDING' }),
    SyncOutbox.countDocuments({ syncStatus: 'SYNCED' }),
    SyncOutbox.countDocuments({ syncStatus: 'FAILED_RETRY' }),
    SyncOutbox.find({})
      .sort({ createdAt: -1 })
      .limit(12)
      .select('outboxId idempotencyKey entityType entityId syncStatus retryCount syncedAt createdAt')
      .lean(),
  ]);

  const cloudSyncEnabled = process.env.CLOUD_SYNC_ENABLED === 'true';
  return {
    cloudSyncEnabled,
    cloudSyncState:
      pending === 0 && failedRetry === 0
        ? cloudSyncEnabled
          ? 'ONLINE_SYNCED'
          : 'OFFLINE_LOCAL_ONLY'
        : 'PENDING_SYNC',
    pendingCount: pending,
    syncedCount: synced,
    failedRetryCount: failedRetry,
    recentOutbox,
  };
};

let cloudSyncTimer = null;
const startCloudSyncWorker = (intervalMs = 15000) => {
  if (cloudSyncTimer) return cloudSyncTimer;
  cloudSyncTimer = setInterval(async () => {
    try {
      await runCloudSyncCycle({ batchSize: 25 });
    } catch (_e) {}
  }, intervalMs);
  cloudSyncTimer.unref();
  return cloudSyncTimer;
};

const stopCloudSyncWorker = () => {
  if (cloudSyncTimer) {
    clearInterval(cloudSyncTimer);
    cloudSyncTimer = null;
  }
};

module.exports = {
  enqueueForCloudSync,
  applyIncomingSyncBatch,
  runCloudSyncCycle,
  getCloudSyncStatusSummary,
  startCloudSyncWorker,
  stopCloudSyncWorker,
};
