const mongoose = require('mongoose');

const PLAN_TIERS = {
  STARTER: {
    planTier: 'STARTER',
    name: 'Starter Industrial Plan',
    monthlyPriceInr: 4999,
    yearlyPriceInr: 49990,
    limits: { maxSites: 1, maxCameras: 4, maxWorkers: 25, maxDevices: 4 },
  },
  PROFESSIONAL: {
    planTier: 'PROFESSIONAL',
    name: 'Professional Multi-Zone Plan',
    monthlyPriceInr: 14999,
    yearlyPriceInr: 149990,
    limits: { maxSites: 3, maxCameras: 16, maxWorkers: 150, maxDevices: 16 },
  },
  ENTERPRISE: {
    planTier: 'ENTERPRISE',
    name: 'Enterprise Multi-Site Plan',
    monthlyPriceInr: 39999,
    yearlyPriceInr: 399990,
    limits: { maxSites: 25, maxCameras: 120, maxWorkers: 2000, maxDevices: 120 },
  },
};

const subscriptionSchema = new mongoose.Schema(
  {
    organisationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      unique: true,
      index: true,
    },
    planTier: {
      type: String,
      enum: ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'],
      default: 'STARTER',
    },
    billingCycle: {
      type: String,
      enum: ['MONTHLY', 'YEARLY'],
      default: 'MONTHLY',
    },
    status: {
      type: String,
      enum: ['TRIALING', 'ACTIVE', 'PAST_DUE', 'EXPIRED'],
      default: 'TRIALING',
      index: true,
    },
    limits: {
      maxSites: { type: Number, default: 1 },
      maxCameras: { type: Number, default: 4 },
      maxWorkers: { type: Number, default: 25 },
      maxDevices: { type: Number, default: 4 },
    },
    currentPeriodStart: { type: Date, default: Date.now },
    currentPeriodEnd: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
subscriptionSchema.virtual('subscriptionId').get(function getSubId() {
  return this._id ? this._id.toString() : undefined;
});

const paymentTransactionSchema = new mongoose.Schema(
  {
    organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
    provider: { type: String, default: 'RAZORPAY_TEST' },
    razorpayOrderId: { type: String, required: true, index: true },
    razorpayPaymentId: { type: String, default: null },
    amountInr: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['CREATED', 'PAID', 'FAILED'], default: 'CREATED' },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
    planTier: { type: String, required: true },
    billingCycle: { type: String, required: true },
    amountInr: { type: Number, required: true },
    taxAmountInr: { type: Number, default: 0 },
    totalAmountInr: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    paidAt: { type: Date, default: Date.now },
    lineItems: { type: Array, default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.invoiceId = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);
invoiceSchema.virtual('invoiceId').get(function getInvId() {
  return this._id ? this._id.toString() : undefined;
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);
const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);
const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = {
  PLAN_TIERS,
  Subscription,
  PaymentTransaction,
  Invoice,
};
