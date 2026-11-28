const { Subscription } = require('../models/Subscription.model');
const { Site } = require('../models/Organisation.model');
const { AppError } = require('../utils/AppError');

/**
 * Safety-Preserving Subscription Quota Middleware (`subscriptionQuota.middleware.js`).
 *
 * CRITICAL SAFETY CONTINUITY RULE:
 * - This middleware is ONLY attached to administrative capacity-expansion endpoints
 *   (e.g., adding new sites/cameras/workers beyond plan limits under `/api/organisations/:orgId/...`).
 * - It is NEVER attached to `/api/detections`, `/api/rfid/scan`, `/api/sensors/events`,
 *   `/api/devices/heartbeat`, the 120-second grace timer, emergency alerts, or `/api/incidents`.
 * - Subscription expiry or quota exhaustion NEVER disables local safety monitoring or alerts.
 */
const enforceSubscriptionQuota = (resourceType) => async (req, _res, next) => {
  try {
    const orgId = req.params.orgId || req.organisationId || req.body?.organisationId;
    if (!orgId) return next();

    const sub = await Subscription.findOne({ organisationId: orgId });
    if (!sub) return next();

    if (sub.status === 'EXPIRED') {
      return next(
        new AppError(
          'Subscription has expired. Administrative expansion is paused until renewal, while all active safety monitoring and emergency alerts remain 100% operational.',
          403,
          'SUBSCRIPTION_EXPIRED_ADMIN_LOCKED'
        )
      );
    }

    if (resourceType === 'SITE') {
      const currentSites = await Site.countDocuments({ organisationId: orgId, status: 'ACTIVE' });
      if (currentSites >= sub.limits.maxSites) {
        return next(
          new AppError(
            `Plan quota exceeded: ${sub.planTier} plan allows up to ${sub.limits.maxSites} site(s). Please upgrade your subscription.`,
            403,
            'QUOTA_EXCEEDED'
          )
        );
      }
    }

    if (resourceType === 'CAMERA') {
      const requestedCameraCount = Number(req.body?.currentCamerasCount ?? 0);
      if (requestedCameraCount >= sub.limits.maxCameras) {
        return next(
          new AppError(
            `Plan quota exceeded: ${sub.planTier} plan allows up to ${sub.limits.maxCameras} camera(s).`,
            403,
            'QUOTA_EXCEEDED'
          )
        );
      }
    }

    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  enforceSubscriptionQuota,
};
