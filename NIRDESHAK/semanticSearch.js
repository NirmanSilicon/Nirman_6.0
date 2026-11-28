// =========================================================
// Nirdeshak - Semantic Search & Matching Module
// Step 6: Vector Search via pgvector & Gemini Embeddings
// Handles: Query embedding, pgvector cosine similarity search,
// input validation, limit clamping, and clean metadata formatting.
// =========================================================

const { query } = require('./database');
const { generateEmbedding, EXPECTED_DIMENSION } = require('./embeddings');

const DEFAULT_SEARCH_LIMIT = 5;
const MAX_SEARCH_LIMIT = 50;

/**
 * Validates and sanitizes the search limit option.
 * @param {*} limitInput
 * @returns {number} Clean integer limit between 1 and MAX_SEARCH_LIMIT
 */
function sanitizeLimit(limitInput) {
  if (limitInput === undefined || limitInput === null || limitInput === '') {
    return DEFAULT_SEARCH_LIMIT;
  }
  const parsed = parseInt(limitInput, 10);
  if (isNaN(parsed) || parsed <= 0) {
    return DEFAULT_SEARCH_LIMIT;
  }
  return Math.min(parsed, MAX_SEARCH_LIMIT);
}

/**
 * Validates the raw search query input.
 * Accepts either:
 * 1. String: "Safety helmet for construction workers..."
 * 2. Object with a 'query' or 'text' property: { query: "..." }
 *
 * @param {string|Object} queryInput
 * @returns {string} Trimmed, non-empty query string
 * @throws {Error} With statusCode = 400 if invalid or empty
 */
function validateQueryInput(queryInput) {
  if (queryInput === undefined || queryInput === null) {
    const err = new Error('Query parameter is required and cannot be empty.');
    err.statusCode = 400;
    throw err;
  }

  let text = '';
  if (typeof queryInput === 'string') {
    text = queryInput.trim();
  } else if (typeof queryInput === 'object') {
    if (typeof queryInput.query === 'string') {
      text = queryInput.query.trim();
    } else if (typeof queryInput.text === 'string') {
      text = queryInput.text.trim();
    } else {
      const err = new Error('Invalid query input: expected a non-empty string or an object with a "query" property.');
      err.statusCode = 400;
      throw err;
    }
  } else {
    const err = new Error(`Unsupported query input type: ${typeof queryInput}. String expected.`);
    err.statusCode = 400;
    throw err;
  }

  if (!text) {
    const err = new Error('Query text cannot be empty or whitespace-only.');
    err.statusCode = 400;
    throw err;
  }

  return text;
}

/**
 * Performs semantic vector similarity search against Indian Standards in PostgreSQL.
 *
 * 1. Generates query vector embedding using gemini-embedding-2.
 * 2. Executes pgvector cosine distance search against standards with valid embeddings.
 * 3. Returns standard metadata sorted by highest semantic similarity (lowest distance).
 * 4. Strictly excludes raw 3072-dimensional vector arrays from output.
 *
 * @param {string|Object} queryInput Natural-language search string or object
 * @param {Object} [options]
 * @param {number} [options.limit=5] Maximum number of results to return
 * @returns {Promise<{ success: boolean, query: string, count: number, limit: number, results: Array<Object> }>}
 */
async function searchStandards(queryInput, options = {}) {
  const cleanQuery = validateQueryInput(queryInput);
  const cleanLimit = sanitizeLimit(options.limit);

  let queryVector = null;
  try {
    // 1. Generate query vector embedding using existing module
    const embedResult = await generateEmbedding(cleanQuery);
    queryVector = embedResult.values;

    if (!Array.isArray(queryVector) || queryVector.length !== EXPECTED_DIMENSION) {
      throw new Error(`Query embedding dimension mismatch: expected ${EXPECTED_DIMENSION}, got ${queryVector ? queryVector.length : 0}`);
    }
  } catch (embedErr) {
    if (options.allowFallback === false) {
      throw embedErr;
    }
    console.warn('[Semantic Search]: Vector embedding unavailable, using database text fallback:', embedErr.message);
    return await fallbackDatabaseSearch(cleanQuery, cleanLimit);
  }

  // 2. Format vector for pgvector input: '[0.01, -0.02, ...]'
  const vectorStr = `[${queryVector.join(',')}]`;

  // 3. PostgreSQL pgvector Cosine Distance (<=>) query
  // Cosine distance = 1 - cosine_similarity. Lower distance = higher similarity.
  // Similarity = 1 - distance.
  const filterPrimary = options.includeSupporting ? '' : 'AND (is_primary_candidate = true OR is_primary_candidate IS NULL)';
  const filterActive = options.includeSuperseded ? '' : "AND (status IS NULL OR status = 'active')";

  const sql = `
    SELECT 
      id,
      canonical_id,
      is_number,
      title,
      scope,
      category,
      description,
      application,
      technical_requirements,
      materials,
      performance_requirements,
      safety_requirements,
      testing_requirements,
      version,
      publication_year,
      status,
      amendments,
      supersedes,
      superseded_by,
      certification,
      source,
      is_primary_candidate,
      created_at,
      updated_at,
      ROUND((embedding <=> $1::vector)::numeric, 6) AS distance,
      ROUND((1 - (embedding <=> $1::vector))::numeric, 6) AS similarity
    FROM standards
    WHERE embedding IS NOT NULL
      AND (is_number NOT LIKE 'TEST-%')
      AND (source IS NULL OR source NOT LIKE '%DEVELOPMENT_TEST%')
      ${filterPrimary}
      ${filterActive}
    ORDER BY embedding <=> $1::vector ASC
    LIMIT $2;
  `;

  const queryRes = await query(sql, [vectorStr, cleanLimit]);

  // 4. Format results to ensure numeric types and clean metadata
  const results = queryRes.rows.map(row => ({
    id: row.id,
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
    amendments: row.amendments || [],
    supersedes: row.supersedes || [],
    superseded_by: row.superseded_by || [],
    certification: row.certification,
    source: row.source,
    distance: parseFloat(row.distance),
    similarity: parseFloat(row.similarity)
  }));

  return {
    success: true,
    query: cleanQuery,
    count: results.length,
    limit: cleanLimit,
    results
  };
}

/**
 * Fallback keyword & text-matching search against PostgreSQL standards repository
 * used when external embedding generation is unavailable (e.g. offline, DNS failure, quota).
 */
async function fallbackDatabaseSearch(cleanQuery, limit) {
  const queryTokens = cleanQuery
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(token => token.length >= 3);

  const sql = `
    SELECT 
      id,
      canonical_id,
      is_number,
      title,
      scope,
      category,
      description,
      application,
      technical_requirements,
      materials,
      performance_requirements,
      safety_requirements,
      testing_requirements,
      version,
      publication_year,
      status,
      amendments,
      supersedes,
      superseded_by,
      certification,
      source,
      is_primary_candidate,
      created_at,
      updated_at
    FROM standards
    WHERE (is_number NOT LIKE 'TEST-%')
      AND (source IS NULL OR source NOT LIKE '%DEVELOPMENT_TEST%')
      AND (is_primary_candidate = true OR is_primary_candidate IS NULL)
      AND (status IS NULL OR status = 'active');
  `;

  const queryRes = await query(sql);
  const rows = queryRes.rows || [];

  const results = rows.map(row => {
    const combined = [
      row.title || '',
      row.is_number || '',
      row.category || '',
      row.description || '',
      row.scope || '',
      row.application || '',
      Array.isArray(row.technical_requirements) ? row.technical_requirements.join(' ') : (row.technical_requirements || ''),
      Array.isArray(row.materials) ? row.materials.join(' ') : (row.materials || ''),
      Array.isArray(row.performance_requirements) ? row.performance_requirements.join(' ') : (row.performance_requirements || ''),
      Array.isArray(row.safety_requirements) ? row.safety_requirements.join(' ') : (row.safety_requirements || ''),
      Array.isArray(row.testing_requirements) ? row.testing_requirements.join(' ') : (row.testing_requirements || '')
    ].join(' ').toLowerCase();

    let matches = 0;
    for (const t of queryTokens) {
      if (combined.includes(t)) matches++;
    }
    const overlap = queryTokens.length > 0 ? (matches / queryTokens.length) : 0;
    const similarity = matches > 0 ? Math.min(0.95, parseFloat((0.40 + overlap * 0.55).toFixed(6))) : 0.0;
    const distance = parseFloat((1 - similarity).toFixed(6));

    return {
      id: row.id,
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
      amendments: row.amendments || [],
      supersedes: row.supersedes || [],
      superseded_by: row.superseded_by || [],
      certification: row.certification,
      source: row.source,
      matches,
      distance,
      similarity
    };
  });

  // Only return standards that actually have keyword overlap with the query
  const matchedOnly = results.filter(r => r.matches > 0);
  matchedOnly.sort((a, b) => b.similarity - a.similarity || b.matches - a.matches);
  const slicedResults = matchedOnly.slice(0, limit);

  return {
    success: true,
    query: cleanQuery,
    count: slicedResults.length,
    limit,
    results: slicedResults,
    fallback: true
  };
}

module.exports = {
  searchStandards,
  validateQueryInput,
  sanitizeLimit,
  DEFAULT_SEARCH_LIMIT,
  MAX_SEARCH_LIMIT
};
