const express = require('express');
const {
  createOrganisation,
  getOrganisationById,
  createSite,
  createBuilding,
  createFloor,
  updateOnboardingStep,
} = require('../controllers/organisation.controller');
const {
  getPlans,
  getCurrentSubscription,
  createCheckoutOrder,
  handleRazorpayWebhook,
  listInvoices,
} = require('../controllers/billing.controller');
const {
  anchorIncidentHash,
  verifyAnchoredIncident,
} = require('../services/blockchain.service');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireOrganisationScope } = require('../middleware/tenant.middleware');
const { enforceSubscriptionQuota } = require('../middleware/subscriptionQuota.middleware');
const { sendSuccess } = require('../utils/apiResponse');

const router = express.Router();

// Public / Webhook endpoints
router.get('/subscriptions/plans', getPlans);
router.post('/billing/webhooks/razorpay', handleRazorpayWebhook);

// Authenticated multi-organisation SaaS, billing & optional blockchain anchoring routes
router.post('/organisations', requireAuth, createOrganisation);
router.get('/organisations/:orgId', requireAuth, requireOrganisationScope('orgId'), getOrganisationById);
router.post(
  '/organisations/:orgId/sites',
  requireAuth,
  requireOrganisationScope('orgId'),
  enforceSubscriptionQuota('SITE'),
  createSite
);
router.post('/organisations/:orgId/buildings', requireAuth, requireOrganisationScope('orgId'), createBuilding);
router.post('/organisations/:orgId/floors', requireAuth, requireOrganisationScope('orgId'), createFloor);
router.patch('/organisations/:orgId/onboarding', requireAuth, requireOrganisationScope('orgId'), updateOnboardingStep);

router.get('/subscriptions/current/:orgId', requireAuth, requireOrganisationScope('orgId'), getCurrentSubscription);
router.post('/billing/checkout', requireAuth, createCheckoutOrder);
router.get('/billing/invoices', requireAuth, listInvoices);

router.post('/blockchain/record/:incidentId', requireAuth, async (req, res, next) => {
  try {
    const result = await anchorIncidentHash(req.params.incidentId);
    return sendSuccess(res, 200, 'Incident SHA-256 recordHash anchored', result);
  } catch (err) {
    return next(err);
  }
});

router.get('/blockchain/verify/:incidentId', requireAuth, async (req, res, next) => {
  try {
    const result = await verifyAnchoredIncident(req.params.incidentId);
    return sendSuccess(res, 200, 'Anchored incident verification complete', result);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
