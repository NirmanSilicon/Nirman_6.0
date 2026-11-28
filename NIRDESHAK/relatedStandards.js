// =========================================================
// Nirdeshak - Related & Normative Standards Discovery Module
// Step 8: Standard Relationships Engine
// Handles: Bidirectional relationship queries (outgoing/incoming),
// relationship-type filtering, deduplication by relationshipId,
// and safe metadata projection (zero raw vector leakage).
// =========================================================

const { query } = require('./database');

const SUPPORTED_RELATIONSHIP_TYPES = [
  'normative',
  'testing',
  'safety',
  'installation',
  'performance',
  'materials',
  'sampling',
  'terminology',
  'allied'
];

/**
 * Validates and parses a standard ID input.
 * @param {*} idInput
 * @returns {number} Valid positive integer ID
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
 * Normalizes an optional relationship type filter string.
 * @param {*} typeInput
 * @returns {string|null} Trimmed, lowercase relationship type or null if not provided
 */
function normalizeRelationshipType(typeInput) {
  if (!typeInput || typeof typeInput !== 'string') return null;
  const trimmed = typeInput.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Retrieves related standards for a given standard ID in both directions.
 *
 * Direction logic:
 * - 'outgoing': standard is source_standard_id (points to target)
 * - 'incoming': standard is target_standard_id (pointed to by source)
 *
 * Deduplicates by relationshipId to ensure no relationship record is duplicated.
 *
 * @param {number|string} standardId Numeric standard ID
 * @param {Object} [options]
 * @param {string} [options.relationshipType] Optional filter (e.g. 'testing', 'normative')
 * @param {string} [options.direction='all'] 'all' | 'outgoing' | 'incoming'
 * @returns {Promise<{ success: boolean, standardId: number, is_number: string, count: number, results: Array<Object> }>}
 */
async function getRelatedStandardsForId(standardId, options = {}) {
  const cleanId = validateStandardId(standardId);
  const relTypeFilter = normalizeRelationshipType(options.relationshipType);
  const directionFilter = (options.direction || 'all').toLowerCase();

  // 1. Verify standard exists in database
  const stdCheckSql = 'SELECT id, is_number, title FROM standards WHERE id = $1 LIMIT 1;';
  const stdCheckRes = await query(stdCheckSql, [cleanId]);

  if (!stdCheckRes.rows || stdCheckRes.rows.length === 0) {
    const notFoundErr = new Error(`Standard with identifier "${cleanId}" not found in database.`);
    notFoundErr.statusCode = 404;
    throw notFoundErr;
  }

  const standard = stdCheckRes.rows[0];
  const resultsMap = new Map(); // Keyed by relationshipId for deduplication

  // 2. Query Outgoing Relationships (Standard is source)
  if (directionFilter === 'all' || directionFilter === 'outgoing') {
    let outgoingSql = `
      SELECT 
        r.id AS relationship_id,
        r.relationship_type,
        r.source AS relationship_source,
        r.created_at AS relationship_created_at,
        s.id AS related_id,
        s.is_number,
        s.title,
        s.scope,
        s.category,
        s.description,
        s.application,
        s.technical_requirements,
        s.materials,
        s.performance_requirements,
        s.safety_requirements,
        s.testing_requirements,
        s.version,
        s.publication_year,
        s.status,
        s.certification
      FROM standard_relationships r
      JOIN standards s ON s.id = r.target_standard_id
      WHERE r.source_standard_id = $1
    `;
    const outgoingParams = [cleanId];

    if (relTypeFilter) {
      outgoingSql += ` AND LOWER(r.relationship_type) = $2`;
      outgoingParams.push(relTypeFilter);
    }
    outgoingSql += ` ORDER BY r.id ASC;`;

    const outgoingRes = await query(outgoingSql, outgoingParams);
    for (const row of outgoingRes.rows) {
      resultsMap.set(row.relationship_id, {
        relationshipId: row.relationship_id,
        direction: 'outgoing',
        relationshipType: row.relationship_type,
        relationshipSource: row.relationship_source,
        standard: {
          id: row.related_id,
          is_number: row.is_number,
          title: row.title,
          scope: row.scope,
          category: row.category,
          description: row.description,
          application: row.application,
          technical_requirements: row.technical_requirements || [],
          materials: row.materials || [],
          performance_requirements: row.performance_requirements || [],
          safety_requirements: row.safety_requirements || [],
          testing_requirements: row.testing_requirements || [],
          version: row.version,
          publication_year: row.publication_year,
          status: row.status,
          certification: row.certification || {}
        }
      });
    }
  }

  // 3. Query Incoming Relationships (Standard is target)
  if (directionFilter === 'all' || directionFilter === 'incoming') {
    let incomingSql = `
      SELECT 
        r.id AS relationship_id,
        r.relationship_type,
        r.source AS relationship_source,
        r.created_at AS relationship_created_at,
        s.id AS related_id,
        s.is_number,
        s.title,
        s.scope,
        s.category,
        s.description,
        s.application,
        s.technical_requirements,
        s.materials,
        s.performance_requirements,
        s.safety_requirements,
        s.testing_requirements,
        s.version,
        s.publication_year,
        s.status,
        s.certification
      FROM standard_relationships r
      JOIN standards s ON s.id = r.source_standard_id
      WHERE r.target_standard_id = $1
    `;
    const incomingParams = [cleanId];

    if (relTypeFilter) {
      incomingSql += ` AND LOWER(r.relationship_type) = $2`;
      incomingParams.push(relTypeFilter);
    }
    incomingSql += ` ORDER BY r.id ASC;`;

    const incomingRes = await query(incomingSql, incomingParams);
    for (const row of incomingRes.rows) {
      // Deduplicate by relationshipId
      if (!resultsMap.has(row.relationship_id)) {
        resultsMap.set(row.relationship_id, {
          relationshipId: row.relationship_id,
          direction: 'incoming',
          relationshipType: row.relationship_type,
          relationshipSource: row.relationship_source,
          standard: {
            id: row.related_id,
            is_number: row.is_number,
            title: row.title,
            scope: row.scope,
            category: row.category,
            description: row.description,
            application: row.application,
            technical_requirements: row.technical_requirements || [],
            materials: row.materials || [],
            performance_requirements: row.performance_requirements || [],
            safety_requirements: row.safety_requirements || [],
            testing_requirements: row.testing_requirements || [],
            version: row.version,
            publication_year: row.publication_year,
            status: row.status,
            certification: row.certification || {}
          }
        });
      }
    }
  }

  const results = Array.from(resultsMap.values());

  return {
    success: true,
    standardId: standard.id,
    is_number: standard.is_number,
    count: results.length,
    results
  };
}

/**
 * Batch finds related standards for multiple standard IDs.
 * @param {Array<number>} standardIds
 * @param {Object} [options]
 * @returns {Promise<Map<number, Array<Object>>>}
 */
async function getRelatedStandardsForMultipleIds(standardIds, options = {}) {
  if (!Array.isArray(standardIds) || standardIds.length === 0) {
    return new Map();
  }

  const resultsByStandardId = new Map();
  for (const id of standardIds) {
    try {
      const relData = await getRelatedStandardsForId(id, options);
      resultsByStandardId.set(id, relData.results);
    } catch (err) {
      // If one standard not found, set empty list for that standard
      resultsByStandardId.set(id, []);
    }
  }
  return resultsByStandardId;
}

module.exports = {
  SUPPORTED_RELATIONSHIP_TYPES,
  validateStandardId,
  normalizeRelationshipType,
  getRelatedStandardsForId,
  getRelatedStandardsForMultipleIds
};
