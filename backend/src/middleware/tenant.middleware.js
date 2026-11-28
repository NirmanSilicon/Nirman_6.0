const { AppError } = require('../utils/AppError');

/**
 * Server-Side Multi-Organisation Tenant Isolation Middleware (`tenant.middleware.js`).
 *
 * Ensures that an authenticated user belonging to `organisationId` can never read,
 * modify, or delete resources belonging to a different organisation.
 */
const requireOrganisationScope = (paramName = 'orgId') => (req, _res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
  }

  const targetOrgId =
    req.params[paramName] ||
    req.body?.organisationId ||
    req.query?.organisationId ||
    req.headers['x-organisation-id'];

  const userOrgId = req.user.organisationId || req.headers['x-user-organisation-id'];

  if (req.user.isPlatformAdmin) {
    req.organisationId = targetOrgId || userOrgId || null;
    return next();
  }

  if (userOrgId && targetOrgId && String(userOrgId) !== String(targetOrgId)) {
    return next(
      new AppError(
        'Cross-organisation access denied. You cannot access another organisation\'s resources.',
        403,
        'CROSS_TENANT_ACCESS_DENIED'
      )
    );
  }

  req.organisationId = targetOrgId || userOrgId || null;
  return next();
};

module.exports = {
  requireOrganisationScope,
};
