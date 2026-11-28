const mongoose = require('mongoose');

const SYNC_ENTITY_TYPES = [
  'INCIDENT',
  'INCIDENT_EVIDENCE',
  'RFID_LOG',
  'SENSOR_EVENT',
  'AUDIT_LOG',
];

const SYNC_STATUSES = ['PENDING', 'SYNCED', 'FAILED_RETRY'];

const syncOutboxSchema = new mongoose.Schema(
  {
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    organisationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organisation',
      default: null,
      index: true,
    },
    entityType: {
      type: String,
      enum: SYNC_ENTITY_TYPES,
      required: true,
      index: true,
    },
    entityId: {
      type: String,
      required: true,
      trim: true,
    },
    operation: {
      type: String,
      enum: ['UPSERT'],
      default: 'UPSERT',
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    syncStatus: {
      type: String,
      enum: SYNC_STATUSES,
      default: 'PENDING',
      index: true,
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    nextRetryAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastError: {
      type: String,
      default: null,
    },
    syncedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.outboxId = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

syncOutboxSchema.virtual('outboxId').get(function getOutboxId() {
  return this._id ? this._id.toString() : undefined;
});

syncOutboxSchema.index({ syncStatus: 1, nextRetryAt: 1 });

const SyncOutbox = mongoose.model('SyncOutbox', syncOutboxSchema);

module.exports = {
  SyncOutbox,
  SYNC_ENTITY_TYPES,
  SYNC_STATUSES,
};
