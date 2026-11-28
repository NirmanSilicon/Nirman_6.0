const mongoose = require('mongoose');
const {
  Organisation,
  Site,
  Building,
  Floor,
  SafetyPolicy,
} = require('../models/Organisation.model');
const { Subscription, PLAN_TIERS } = require('../models/Subscription.model');
const { encryptCameraCredentials } = require('../utils/crypto.util');
const { AppError } = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');

const createOrganisation = async (req, res, next) => {
  try {
    const { name, slug, industryType, contactEmail, emergencyPhone, address, planTier = 'STARTER' } = req.body;
    if (!name || !slug || !contactEmail) {
      throw new AppError('name, slug, and contactEmail are required.', 400, 'VALIDATION_ERROR');
    }

    const existing = await Organisation.findOne({ slug: String(slug).toLowerCase().trim() });
    if (existing) {
      throw new AppError(`Organisation slug '${slug}' already exists.`, 409, 'DUPLICATE_RESOURCE');
    }

    const org = await Organisation.create({
      name,
      slug: String(slug).toLowerCase().trim(),
      industryType: industryType || 'GENERAL_INDUSTRIAL',
      contactEmail,
      emergencyPhone: emergencyPhone || null,
      address: address || null,
      onboardingStep: 1,
    });

    const tierConfig = PLAN_TIERS[String(planTier).toUpperCase()] || PLAN_TIERS.STARTER;
    const subscription = await Subscription.create({
      organisationId: org._id,
      planTier: tierConfig.planTier,
      billingCycle: 'MONTHLY',
      status: 'TRIALING',
      limits: tierConfig.limits,
    });

    const policy = await SafetyPolicy.create({
      organisationId: org._id,
      requiredPPE: ['helmet', 'safety_vest'],
    });

    return sendSuccess(res, 201, 'Organisation onboarded with default subscription and safety policy', {
      organisation: org,
      subscription,
      safetyPolicy: policy,
    });
  } catch (err) {
    return next(err);
  }
};

const getOrganisationById = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(orgId)) {
      throw new AppError('Invalid organisationId.', 400, 'INVALID_IDENTIFIER');
    }
    const org = await Organisation.findById(orgId);
    if (!org) {
      throw new AppError('Organisation not found.', 404, 'ORGANISATION_NOT_FOUND');
    }
    const [sites, buildings, floors, policy, subscription] = await Promise.all([
      Site.find({ organisationId: org._id }),
      Building.find({ organisationId: org._id }),
      Floor.find({ organisationId: org._id }),
      SafetyPolicy.findOne({ organisationId: org._id }),
      Subscription.findOne({ organisationId: org._id }),
    ]);

    return sendSuccess(res, 200, 'Organisation hierarchy retrieved', {
      organisation: org,
      sites,
      buildings,
      floors,
      safetyPolicy: policy,
      subscription,
    });
  } catch (err) {
    return next(err);
  }
};

const createSite = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { siteCode, siteName, address } = req.body;
    if (!siteCode || !siteName) {
      throw new AppError('siteCode and siteName are required.', 400, 'VALIDATION_ERROR');
    }
    const site = await Site.create({
      organisationId: orgId,
      siteCode: String(siteCode).toUpperCase().trim(),
      siteName,
      address: address || null,
    });
    return sendSuccess(res, 201, 'Site created', { site });
  } catch (err) {
    return next(err);
  }
};

const createBuilding = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { siteId, buildingCode, buildingName } = req.body;
    const building = await Building.create({
      organisationId: orgId,
      siteId,
      buildingCode: String(buildingCode).toUpperCase().trim(),
      buildingName,
    });
    return sendSuccess(res, 201, 'Building created', { building });
  } catch (err) {
    return next(err);
  }
};

const createFloor = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { siteId, buildingId, floorNumber, floorName } = req.body;
    const floor = await Floor.create({
      organisationId: orgId,
      siteId,
      buildingId,
      floorNumber: Number(floorNumber),
      floorName,
    });
    return sendSuccess(res, 201, 'Floor created', { floor });
  } catch (err) {
    return next(err);
  }
};

const updateOnboardingStep = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { step, rtspUsername, rtspPassword } = req.body;
    const org = await Organisation.findByIdAndUpdate(
      orgId,
      { $set: { onboardingStep: Math.min(11, Math.max(1, Number(step || 1))) } },
      { new: true }
    );
    let encryptedCredentialsPreview = null;
    if (rtspUsername || rtspPassword) {
      const cipher = encryptCameraCredentials(`${rtspUsername || ''}:${rtspPassword || ''}`);
      encryptedCredentialsPreview = {
        algorithm: 'AES-256-GCM',
        masked: '********',
        storedCipherLength: cipher ? cipher.length : 0,
      };
    }
    return sendSuccess(res, 200, 'Onboarding wizard step updated', {
      organisation: org,
      encryptedCredentialsPreview,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createOrganisation,
  getOrganisationById,
  createSite,
  createBuilding,
  createFloor,
  updateOnboardingStep,
};
