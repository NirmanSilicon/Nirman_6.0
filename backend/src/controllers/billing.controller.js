const crypto = require('crypto');
const {
  PLAN_TIERS,
  Subscription,
  PaymentTransaction,
  Invoice,
} = require('../models/Subscription.model');
const { Site } = require('../models/Organisation.model');
const { AppError } = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');

const getRazorpayTestSecret = () =>
  process.env.RAZORPAY_TEST_WEBHOOK_SECRET || 'rzp_test_webhook_secret_smartppe_2026';

const getPlans = (_req, res) => {
  return sendSuccess(res, 200, 'Subscription plans retrieved', {
    plans: Object.values(PLAN_TIERS),
  });
};

const getCurrentSubscription = async (req, res, next) => {
  try {
    const orgId = req.params.orgId || req.query.organisationId || req.organisationId;
    const sub = await Subscription.findOne({ organisationId: orgId });
    if (!sub) {
      throw new AppError('Subscription not found for this organisation.', 404, 'SUBSCRIPTION_NOT_FOUND');
    }
    const sitesUsed = await Site.countDocuments({ organisationId: orgId, status: 'ACTIVE' });
    return sendSuccess(res, 200, 'Current subscription retrieved', {
      subscription: sub,
      usage: {
        sitesUsed,
        maxSites: sub.limits.maxSites,
      },
      safetyContinuityGuarantee:
        'Local PPE detection, 120-second grace warnings, speaker alerts, and critical emergency SOS remain active even if subscription expires.',
    });
  } catch (err) {
    return next(err);
  }
};

const createCheckoutOrder = async (req, res, next) => {
  try {
    const { organisationId, planTier = 'PROFESSIONAL', billingCycle = 'MONTHLY' } = req.body;
    const tierConfig = PLAN_TIERS[String(planTier).toUpperCase()];
    if (!tierConfig) {
      throw new AppError('Invalid planTier.', 400, 'VALIDATION_ERROR');
    }

    let sub = await Subscription.findOne({ organisationId });
    if (!sub) {
      sub = await Subscription.create({
        organisationId,
        planTier: tierConfig.planTier,
        billingCycle,
        status: 'TRIALING',
        limits: tierConfig.limits,
      });
    }

    const amountInr =
      billingCycle === 'YEARLY' ? tierConfig.yearlyPriceInr : tierConfig.monthlyPriceInr;
    const razorpayOrderId = `order_test_${crypto.randomBytes(6).toString('hex')}`;

    const tx = await PaymentTransaction.create({
      organisationId,
      subscriptionId: sub._id,
      razorpayOrderId,
      amountInr,
      status: 'CREATED',
    });

    return sendSuccess(res, 201, 'Razorpay Test Mode checkout order created', {
      orderId: razorpayOrderId,
      amountInr,
      currency: 'INR',
      planTier: tierConfig.planTier,
      billingCycle,
      transactionId: tx._id.toString(),
      mode: 'RAZORPAY_TEST',
    });
  } catch (err) {
    return next(err);
  }
};

const handleRazorpayWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'] || '';
    const { razorpayOrderId, razorpayPaymentId, planTier = 'PROFESSIONAL', billingCycle = 'MONTHLY' } = req.body;

    const expectedSig = crypto
      .createHmac('sha256', getRazorpayTestSecret())
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (!signature || signature !== expectedSig) {
      throw new AppError('Invalid Razorpay webhook HMAC-SHA256 signature.', 401, 'INVALID_WEBHOOK_SIGNATURE');
    }

    const tx = await PaymentTransaction.findOne({ razorpayOrderId });
    if (!tx) {
      throw new AppError('Payment transaction order not found.', 404, 'ORDER_NOT_FOUND');
    }

    tx.status = 'PAID';
    tx.razorpayPaymentId = razorpayPaymentId;
    tx.paidAt = new Date();
    await tx.save();

    const tierConfig = PLAN_TIERS[String(planTier).toUpperCase()] || PLAN_TIERS.PROFESSIONAL;
    const sub = await Subscription.findByIdAndUpdate(
      tx.subscriptionId,
      {
        $set: {
          planTier: tierConfig.planTier,
          billingCycle,
          status: 'ACTIVE',
          limits: tierConfig.limits,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(
            Date.now() + (billingCycle === 'YEARLY' ? 365 : 30) * 24 * 60 * 60 * 1000
          ),
        },
      },
      { new: true }
    );

    const taxInr = Math.round(tx.amountInr * 0.18);
    const invoice = await Invoice.create({
      invoiceNumber: `INV-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
      organisationId: tx.organisationId,
      planTier: tierConfig.planTier,
      billingCycle,
      amountInr: tx.amountInr,
      taxAmountInr: taxInr,
      totalAmountInr: tx.amountInr + taxInr,
      lineItems: [
        {
          description: `SmartPPE Warden's Eye — ${tierConfig.name} (${billingCycle})`,
          amountInr: tx.amountInr,
        },
      ],
    });

    return sendSuccess(res, 200, 'Payment verified, subscription activated, and invoice generated', {
      subscription: sub,
      invoice,
    });
  } catch (err) {
    return next(err);
  }
};

const listInvoices = async (req, res, next) => {
  try {
    const orgId = req.query.organisationId || req.organisationId;
    const filter = orgId ? { organisationId: orgId } : {};
    const invoices = await Invoice.find(filter).sort({ createdAt: -1 });
    return sendSuccess(res, 200, 'Invoices retrieved', {
      invoices,
      total: invoices.length,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getRazorpayTestSecret,
  getPlans,
  getCurrentSubscription,
  createCheckoutOrder,
  handleRazorpayWebhook,
  listInvoices,
};
