// =========================================================
// Nirdeshak - Certification & Compliance Check Engine
// Step 10: Standard Certification & Compliance Module
//
// Deterministic, rule-based engine:
// - Analyzes standards.certification and standards.source.
// - Parses diverse certification formats safely (objects, arrays, strings).
// - Detects certification schemes (BIS, CRS, Hallmarking, ISI, etc.).
// - Accurately differentiates "certification exists" from "mandatory requirement".
// - Preserves data provenance and flags synthetic development/test records.
// - Zero LLM usage or external web requests.
// =========================================================

const { query } = require('./database');

/**
 * Validates and parses a standard ID input.
 * @param {*} idInput
 * @returns {number} Positive integer ID
 * @throws {Error} With statusCode = 400 if invalid
 */
function validateStandardId(idInput) {
  if (idInput === undefined || idInput === null || idInput === '') {
    const err = new Error('Standard ID is required.');
    err.statusCode = 400;
    throw err;
  }
  const id = parseInt(idInput, 10);
  if (isNaN(id) || id <= 0) {
    const err = new Error(`Invalid standard ID "${idInput}": positive integer expected.`);
    err.statusCode = 400;
    throw err;
  }
  return id;
}

/**
 * Parses raw certification data into a normalized structure.
 * Handles: null, undefined, empty strings, booleans, plain text,
 * JSON objects, JSON arrays, JSON strings, and malformed JSON.
 *
 * @param {*} value
 * @returns {{ hasCertificationInfo: boolean, data: *, rawType: string }}
 */
function parseCertification(value) {
  if (value === null || value === undefined) {
    return { hasCertificationInfo: false, data: null, rawType: 'null' };
  }

  // Boolean handling (alone not certification data)
  if (typeof value === 'boolean') {
    return { hasCertificationInfo: false, data: null, rawType: 'boolean' };
  }

  // Array handling
  if (Array.isArray(value)) {
    const cleaned = value.filter(item => item !== null && item !== undefined && item !== '');
    if (cleaned.length === 0) {
      return { hasCertificationInfo: false, data: null, rawType: 'array' };
    }
    return { hasCertificationInfo: true, data: cleaned, rawType: 'array' };
  }

  // String handling (plain text or JSON string)
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return { hasCertificationInfo: false, data: null, rawType: 'empty_string' };
    }

    try {
      const parsed = JSON.parse(trimmed);
      return parseCertification(parsed);
    } catch (e) {
      // Plain text or unparseable JSON
      return { hasCertificationInfo: true, data: trimmed, rawType: 'string' };
    }
  }

  // Object handling
  if (typeof value === 'object') {
    const nonNullKeys = Object.keys(value).filter(k => value[k] !== null && value[k] !== undefined && value[k] !== '');
    if (nonNullKeys.length === 0) {
      return { hasCertificationInfo: false, data: null, rawType: 'object' };
    }
    return { hasCertificationInfo: true, data: value, rawType: 'object' };
  }

  return { hasCertificationInfo: false, data: null, rawType: typeof value };
}

/**
 * Deterministically detects certification scheme from parsed certification data.
 * Checks explicit scheme fields first, then known keywords.
 * Known terms: BIS, CRS, Hallmarking, ISI, certification, licence, registration, conformity, compliance.
 *
 * @param {*} data Parsed certification data
 * @returns {{ scheme: string|null, schemeDetected: boolean }}
 */
function detectCertificationScheme(data) {
  if (!data) {
    return { scheme: null, schemeDetected: false };
  }

  // 1. Check explicit fields in an object
  if (typeof data === 'object' && !Array.isArray(data)) {
    if (data.scheme && typeof data.scheme === 'string' && data.scheme.trim().length > 0) {
      return { scheme: data.scheme.trim(), schemeDetected: true };
    }
    if (data.scheme_name && typeof data.scheme_name === 'string' && data.scheme_name.trim().length > 0) {
      return { scheme: data.scheme_name.trim(), schemeDetected: true };
    }
    if (data.type && typeof data.type === 'string' && data.type.trim().length > 0) {
      return { scheme: data.type.trim(), schemeDetected: true };
    }
    if (data.mark && typeof data.mark === 'string' && data.mark.trim().length > 0) {
      return { scheme: data.mark.trim(), schemeDetected: true };
    }
  }

  // 2. Keyword detection in serialized or string data
  const text = (typeof data === 'string' ? data : JSON.stringify(data));
  const KNOWN_SCHEMES = [
    { regex: /\bBIS\b/i, name: 'BIS' },
    { regex: /\bCRS\b/i, name: 'CRS' },
    { regex: /\bHallmarking\b/i, name: 'Hallmarking' },
    { regex: /\bISI\b/i, name: 'ISI' },
    { regex: /\blicen[sc]e\b/i, name: 'Licence' },
    { regex: /\bregistration\b/i, name: 'Registration' },
    { regex: /\bconformity\b/i, name: 'Conformity' },
    { regex: /\bcompliance\b/i, name: 'Compliance' },
    { regex: /\bcertification\b/i, name: 'Certification' }
  ];

  for (const item of KNOWN_SCHEMES) {
    if (item.regex.test(text)) {
      return { scheme: item.name, schemeDetected: true };
    }
  }

  return { scheme: null, schemeDetected: false };
}

/**
 * Determines whether certification metadata explicitly asserts a mandatory or optional requirement.
 * Critical rule: Does NOT infer requirement merely from certification name.
 *
 * @param {*} data Parsed certification data
 * @returns {{ requirementExplicit: boolean, requirementValue: boolean|null }}
 */
function detectExplicitRequirement(data) {
  if (!data || typeof data !== 'object') {
    // If plain string, check for explicit assertion words
    if (typeof data === 'string') {
      const lower = data.toLowerCase();
      if (lower.includes('mandatory: true') || lower.includes('required: true') || lower.includes('compulsory: true')) {
        return { requirementExplicit: true, requirementValue: true };
      }
      if (lower.includes('mandatory: false') || lower.includes('required: false') || lower.includes('optional: true')) {
        return { requirementExplicit: true, requirementValue: false };
      }
    }
    return { requirementExplicit: false, requirementValue: null };
  }

  // Array handling: check any item with explicit requirement
  if (Array.isArray(data)) {
    for (const item of data) {
      const subReq = detectExplicitRequirement(item);
      if (subReq.requirementExplicit) return subReq;
    }
    return { requirementExplicit: false, requirementValue: null };
  }

  // Object fields to check
  const reqFields = ['mandatory', 'required', 'compulsory', 'is_mandatory', 'is_required'];

  for (const field of reqFields) {
    if (field in data) {
      const val = data[field];
      if (typeof val === 'boolean') {
        return { requirementExplicit: true, requirementValue: val };
      }
      if (typeof val === 'string') {
        const strLower = val.trim().toLowerCase();
        if (strLower === 'true' || strLower === 'yes' || strLower === 'mandatory' || strLower === 'required') {
          return { requirementExplicit: true, requirementValue: true };
        }
        if (strLower === 'false' || strLower === 'no' || strLower === 'optional' || strLower === 'voluntary') {
          return { requirementExplicit: true, requirementValue: false };
        }
      }
    }
  }

  return { requirementExplicit: false, requirementValue: null };
}

/**
 * Determines whether a source or metadata string indicates synthetic development/test data.
 * @param {string|null} sourceText
 * @returns {boolean}
 */
function isSyntheticContext(sourceText) {
  if (!sourceText || typeof sourceText !== 'string') return false;
  const lower = sourceText.toLowerCase();
  return lower.includes('development_test') || lower.includes('synthetic') || lower.includes('mock') || lower.includes('test record');
}

/**
 * Normalizes full certification details into an API-ready object.
 *
 * @param {*} certificationRaw
 * @param {string} [standardSource=null]
 * @returns {Object} Normalized certification metadata
 */
function evaluateCertification(certificationRaw, standardSource = null) {
  const parsed = parseCertification(certificationRaw);

  const effectiveSource = (parsed.data && typeof parsed.data === 'object' && parsed.data.source)
    ? parsed.data.source
    : standardSource;

  const isSynthetic = isSyntheticContext(effectiveSource) || (parsed.data && isSyntheticContext(JSON.stringify(parsed.data)));
  const dataContext = isSynthetic ? 'development_test' : (parsed.hasCertificationInfo ? 'official_record' : 'none');

  if (!parsed.hasCertificationInfo) {
    return {
      hasCertificationInfo: false,
      scheme: null,
      schemeDetected: false,
      requirementExplicit: false,
      requirementValue: null,
      details: null,
      source: effectiveSource || null,
      dataContext
    };
  }

  const schemeInfo = detectCertificationScheme(parsed.data);
  const requirementInfo = detectExplicitRequirement(parsed.data);

  return {
    hasCertificationInfo: true,
    scheme: schemeInfo.scheme,
    schemeDetected: schemeInfo.schemeDetected,
    requirementExplicit: requirementInfo.requirementExplicit,
    requirementValue: requirementInfo.requirementValue,
    details: parsed.data,
    source: effectiveSource || null,
    dataContext
  };
}

/**
 * Retrieves standard certification details from the database by ID.
 * Strict safe projection: Omits raw embedding vector column.
 *
 * @param {number|string} standardId
 * @returns {Promise<{ success: boolean, standardId: number, is_number: string, title: string, certification: Object }>}
 */
async function getStandardCertification(standardId) {
  const cleanId = validateStandardId(standardId);

  const sql = `
    SELECT 
      id,
      is_number,
      title,
      certification,
      source
    FROM standards
    WHERE id = $1
    LIMIT 1;
  `;

  const res = await query(sql, [cleanId]);
  if (!res.rows || res.rows.length === 0) {
    const notFoundErr = new Error(`Standard with identifier "${cleanId}" not found in database.`);
    notFoundErr.statusCode = 404;
    throw notFoundErr;
  }

  const row = res.rows[0];
  const certification = evaluateCertification(row.certification, row.source);

  return {
    success: true,
    standardId: row.id,
    is_number: row.is_number,
    title: row.title,
    certification
  };
}

module.exports = {
  validateStandardId,
  parseCertification,
  detectCertificationScheme,
  detectExplicitRequirement,
  isSyntheticContext,
  evaluateCertification,
  getStandardCertification
};
