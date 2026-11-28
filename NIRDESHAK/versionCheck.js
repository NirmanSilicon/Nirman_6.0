// =========================================================
// Nirdeshak - Version & Amendment Check Engine
// Step 9: Version, Status, Amendment & Supersession Detection
//
// Deterministic, rule-based engine:
// - Evaluates version, publication_year, status, amendments,
//   supersedes, and superseded_by.
// - Normalizes status values without hallucinations or LLMs.
// - Classifies version status using strict precedence.
// - Produces factual, database-grounded summaries.
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
 * Deterministically normalizes a raw status string into a recognized category.
 *
 * Mappings:
 * - 'active', 'current', 'valid' => 'current'
 * - 'superseded' => 'superseded'
 * - 'withdrawn' => 'withdrawn'
 * - 'obsolete' => 'obsolete'
 * - 'inactive' => 'inactive'
 * - 'amended' => 'amended'
 * - all others (unknown, null, empty) => 'unknown'
 *
 * @param {*} rawStatus
 * @returns {{ category: string, normalized: string|null }}
 */
function normalizeStatus(rawStatus) {
  if (rawStatus === null || rawStatus === undefined) {
    return { category: 'unknown', normalized: null };
  }

  const str = String(rawStatus).trim().toLowerCase();
  if (str.length === 0) {
    return { category: 'unknown', normalized: null };
  }

  switch (str) {
    case 'active':
    case 'current':
    case 'valid':
      return { category: 'current', normalized: str };

    case 'superseded':
      return { category: 'superseded', normalized: 'superseded' };

    case 'withdrawn':
      return { category: 'withdrawn', normalized: 'withdrawn' };

    case 'obsolete':
      return { category: 'obsolete', normalized: 'obsolete' };

    case 'inactive':
      return { category: 'inactive', normalized: 'inactive' };

    case 'amended':
      return { category: 'amended', normalized: 'amended' };

    default:
      return { category: 'unknown', normalized: str };
  }
}

/**
 * Safely parses amendment metadata from common database representations.
 * Handles: JSON arrays, JSON objects, raw strings, null, undefined, empty values.
 *
 * @param {*} amendmentsInput
 * @returns {{ hasAmendments: boolean, amendmentInfo: Array<*> }}
 */
function parseAmendments(amendmentsInput) {
  if (amendmentsInput === null || amendmentsInput === undefined || amendmentsInput === false) {
    return { hasAmendments: false, amendmentInfo: [] };
  }

  // If already an array
  if (Array.isArray(amendmentsInput)) {
    const cleaned = amendmentsInput.filter(item => item !== null && item !== undefined && item !== '');
    return {
      hasAmendments: cleaned.length > 0,
      amendmentInfo: cleaned
    };
  }

  // If a string (could be JSON or plain text description)
  if (typeof amendmentsInput === 'string') {
    const trimmed = amendmentsInput.trim();
    if (trimmed.length === 0) {
      return { hasAmendments: false, amendmentInfo: [] };
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(item => item !== null && item !== undefined && item !== '');
        return {
          hasAmendments: cleaned.length > 0,
          amendmentInfo: cleaned
        };
      }
      if (parsed && typeof parsed === 'object') {
        const hasKeys = Object.keys(parsed).length > 0;
        return {
          hasAmendments: hasKeys,
          amendmentInfo: hasKeys ? [parsed] : []
        };
      }
    } catch (e) {
      // Plain text amendment note or unparseable string
      return {
        hasAmendments: true,
        amendmentInfo: [trimmed]
      };
    }
  }

  // If an object
  if (typeof amendmentsInput === 'object') {
    const hasKeys = Object.keys(amendmentsInput).length > 0;
    return {
      hasAmendments: hasKeys,
      amendmentInfo: hasKeys ? [amendmentsInput] : []
    };
  }

  return { hasAmendments: false, amendmentInfo: [] };
}

/**
 * Normalizes a supersession reference field (supersedes or superseded_by).
 * Converts arrays, JSON strings, or plain strings to clean reference(s) or null.
 *
 * @param {*} refInput
 * @returns {string|Array<string>|null}
 */
function normalizeSupersessionReference(refInput) {
  if (refInput === null || refInput === undefined || refInput === false) {
    return null;
  }

  // If array
  if (Array.isArray(refInput)) {
    const cleaned = refInput
      .map(item => (typeof item === 'string' ? item.trim() : item && item.is_number ? String(item.is_number).trim() : item))
      .filter(item => item !== null && item !== undefined && item !== '');
    if (cleaned.length === 0) return null;
    return cleaned.length === 1 ? cleaned[0] : cleaned;
  }

  // If string
  if (typeof refInput === 'string') {
    const trimmed = refInput.trim();
    if (trimmed.length === 0) return null;

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return normalizeSupersessionReference(parsed);
      }
      if (parsed && typeof parsed === 'object' && parsed.is_number) {
        return String(parsed.is_number).trim();
      }
    } catch (e) {
      // Return as plain reference string
    }
    return trimmed;
  }

  // If object with is_number or standard reference
  if (typeof refInput === 'object') {
    if (refInput.is_number) return String(refInput.is_number).trim();
    if (Object.keys(refInput).length === 0) return null;
    return refInput;
  }

  return null;
}

/**
 * Evaluates the full version and amendment status for a standard record.
 * Follows strict deterministic precedence:
 * 1. Explicit superseded / superseded_by information
 * 2. Explicit withdrawn / obsolete / inactive status
 * 3. Explicit amended status
 * 4. Explicit active / current / valid status
 * 5. Otherwise unknown
 *
 * @param {Object} standard Record containing version, publication_year, status, amendments, supersedes, superseded_by
 * @returns {Object} Structured versionStatus
 */
function evaluateVersionStatus(standard) {
  if (!standard || typeof standard !== 'object') {
    return {
      statusCategory: 'unknown',
      statusValue: null,
      hasAmendments: false,
      amendmentInfo: [],
      isSuperseded: false,
      supersededBy: null,
      supersedes: null,
      version: null,
      publicationYear: null,
      summary: 'Current version status cannot be determined from the available database metadata.'
    };
  }

  // 1. Parse Status
  const rawStatus = standard.status !== undefined && standard.status !== null ? String(standard.status) : null;
  const statusNorm = normalizeStatus(rawStatus);

  // 2. Parse Amendments
  const amendmentData = parseAmendments(standard.amendments);

  // 3. Parse Supersession
  const supersededByRef = normalizeSupersessionReference(standard.superseded_by);
  const supersedesRef = normalizeSupersessionReference(standard.supersedes);
  const isSuperseded = supersededByRef !== null || statusNorm.category === 'superseded';

  // 4. Version & Publication Year metadata
  const version = (standard.version && typeof standard.version === 'string' && standard.version.trim().length > 0)
    ? standard.version.trim()
    : (standard.version || null);

  const pubYearParsed = parseInt(standard.publication_year, 10);
  const publicationYear = !isNaN(pubYearParsed) ? pubYearParsed : null;

  // 5. Precedence Classification
  let statusCategory = 'unknown';

  if (isSuperseded) {
    statusCategory = 'superseded';
  } else if (statusNorm.category === 'withdrawn') {
    statusCategory = 'withdrawn';
  } else if (statusNorm.category === 'obsolete') {
    statusCategory = 'obsolete';
  } else if (statusNorm.category === 'inactive') {
    statusCategory = 'inactive';
  } else if (statusNorm.category === 'amended') {
    statusCategory = 'amended';
  } else if (statusNorm.category === 'current') {
    statusCategory = 'current';
  } else if (amendmentData.hasAmendments) {
    statusCategory = 'amended';
  } else {
    statusCategory = 'unknown';
  }

  // 6. Generate Human-Readable Summary
  const summary = generateVersionSummary({
    statusCategory,
    statusValue: statusNorm.normalized,
    hasAmendments: amendmentData.hasAmendments,
    amendmentInfo: amendmentData.amendmentInfo,
    isSuperseded,
    supersededBy: supersededByRef,
    supersedes: supersedesRef,
    version,
    publicationYear
  });

  return {
    statusCategory,
    statusValue: statusNorm.normalized,
    hasAmendments: amendmentData.hasAmendments,
    amendmentInfo: amendmentData.amendmentInfo,
    isSuperseded,
    supersededBy: supersededByRef,
    supersedes: supersedesRef,
    version,
    publicationYear,
    summary
  };
}

/**
 * Generates a factual, database-grounded summary description.
 * Strictly avoids unsupported legal assertions.
 *
 * @param {Object} statusData
 * @returns {string} Summary statement
 */
function generateVersionSummary(statusData) {
  const { statusCategory, isSuperseded, supersededBy, supersedes, hasAmendments, statusValue } = statusData;

  if (isSuperseded) {
    if (supersededBy) {
      const refStr = Array.isArray(supersededBy) ? supersededBy.join(', ') : String(supersededBy);
      return `Database metadata indicates that this standard has been superseded by ${refStr}.`;
    }
    return 'Database metadata indicates that this standard has been superseded.';
  }

  if (statusCategory === 'withdrawn') {
    return 'Database status indicates this standard has been withdrawn.';
  }

  if (statusCategory === 'obsolete') {
    return 'Database status indicates this standard is obsolete.';
  }

  if (statusCategory === 'inactive') {
    return 'Database status indicates this standard is inactive.';
  }

  if (statusCategory === 'amended') {
    return 'Database metadata indicates that amendment information is available for this standard.';
  }

  if (statusCategory === 'current') {
    if (hasAmendments) {
      return `Database status indicates this standard is ${statusValue || 'active'}, with amendment information available.`;
    }
    if (supersedes) {
      const refStr = Array.isArray(supersedes) ? supersedes.join(', ') : String(supersedes);
      return `Database status indicates this standard is ${statusValue || 'active'} (supersedes ${refStr}).`;
    }
    return `Database status indicates this standard is ${statusValue || 'active'}.`;
  }

  return 'Current version status cannot be determined from the available database metadata.';
}

/**
 * Retrieves standard by ID from the database and returns its version/amendment status.
 * Safe projection: Raw embedding vector is never queried or returned.
 *
 * @param {number|string} standardId
 * @returns {Promise<{ success: boolean, standardId: number, is_number: string, title: string, versionStatus: Object }>}
 */
async function getStandardVersionStatus(standardId) {
  const cleanId = validateStandardId(standardId);

  const sql = `
    SELECT 
      id,
      is_number,
      title,
      version,
      publication_year,
      status,
      amendments,
      supersedes,
      superseded_by
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
  const versionStatus = evaluateVersionStatus(row);

  return {
    success: true,
    standardId: row.id,
    is_number: row.is_number,
    title: row.title,
    versionStatus
  };
}

module.exports = {
  validateStandardId,
  normalizeStatus,
  parseAmendments,
  normalizeSupersessionReference,
  evaluateVersionStatus,
  generateVersionSummary,
  getStandardVersionStatus
};
