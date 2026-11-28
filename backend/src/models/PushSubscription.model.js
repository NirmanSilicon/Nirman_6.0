const mongoose = require('mongoose');

const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['WORKER', 'SUPERVISOR', 'ADMINISTRATOR'],
      required: true,
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.subscriptionId = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

pushSubscriptionSchema.virtual('subscriptionId').get(function getSubId() {
  return this._id ? this._id.toString() : undefined;
});

const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema);

module.exports = { PushSubscription };
