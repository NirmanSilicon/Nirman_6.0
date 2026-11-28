const mongoose = require('mongoose');

const addVirtualId = (schema, virtualName) => {
  schema.virtual(virtualName).get(function getId() {
    return this._id ? this._id.toString() : undefined;
  });
};

const toJsonWithVirtualId = (virtualName) => ({
  virtuals: true,
  transform: (_doc, ret) => {
    ret[virtualName] = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const organisationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    industryType: {
      type: String,
      enum: ['MANUFACTURING', 'CONSTRUCTION', 'WAREHOUSE', 'LABORATORY', 'UTILITIES', 'GENERAL_INDUSTRIAL'],
      default: 'GENERAL_INDUSTRIAL',
    },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    emergencyPhone: { type: String, default: null, trim: true },
    address: { type: String, default: null, trim: true },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED', 'INACTIVE'], default: 'ACTIVE' },
    onboardingStep: { type: Number, default: 1, min: 1, max: 11 },
  },
  { timestamps: true, toJSON: toJsonWithVirtualId('organisationId') }
);
addVirtualId(organisationSchema, 'organisationId');

const siteSchema = new mongoose.Schema(
  {
    organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
    siteCode: { type: String, required: true, uppercase: true, trim: true },
    siteName: { type: String, required: true, trim: true },
    address: { type: String, default: null, trim: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true, toJSON: toJsonWithVirtualId('siteId') }
);
addVirtualId(siteSchema, 'siteId');
siteSchema.index({ organisationId: 1, siteCode: 1 }, { unique: true });

const buildingSchema = new mongoose.Schema(
  {
    organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true, index: true },
    buildingCode: { type: String, required: true, uppercase: true, trim: true },
    buildingName: { type: String, required: true, trim: true },
  },
  { timestamps: true, toJSON: toJsonWithVirtualId('buildingId') }
);
addVirtualId(buildingSchema, 'buildingId');

const floorSchema = new mongoose.Schema(
  {
    organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true, index: true },
    buildingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', required: true, index: true },
    floorNumber: { type: Number, required: true },
    floorName: { type: String, required: true, trim: true },
  },
  { timestamps: true, toJSON: toJsonWithVirtualId('floorId') }
);
addVirtualId(floorSchema, 'floorId');

const safetyPolicySchema = new mongoose.Schema(
  {
    organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, unique: true },
    requiredPPE: { type: [String], default: ['helmet', 'safety_vest'] },
    confidenceThresholdLow: { type: Number, default: 0.4, min: 0.05, max: 0.95 },
    confidenceThresholdHigh: { type: Number, default: 0.68, min: 0.1, max: 0.99 },
    warningGraceSeconds: { type: Number, default: 120, min: 5, max: 600 },
  },
  { timestamps: true, toJSON: toJsonWithVirtualId('policyId') }
);
addVirtualId(safetyPolicySchema, 'policyId');

const Organisation = mongoose.model('Organisation', organisationSchema);
const Site = mongoose.model('Site', siteSchema);
const Building = mongoose.model('Building', buildingSchema);
const Floor = mongoose.model('Floor', floorSchema);
const SafetyPolicy = mongoose.model('SafetyPolicy', safetyPolicySchema);

module.exports = {
  Organisation,
  Site,
  Building,
  Floor,
  SafetyPolicy,
};
