// =========================================================
// Nirdeshak - Standards Database Operations Module
// Step 4: Standards Database Setup
// Handles: Schema creation, table definitions, indexes,
// pgvector support, CRUD operations, relationships, and seeding.
// =========================================================

const { query, checkConnection } = require('./database');

/**
 * Initializes the PostgreSQL database schema for Indian Standards.
 * Creates pgvector extension (if available), standards table,
 * standard_relationships table, and performance indexes.
 */
async function initDatabaseSchema() {
  const connState = await checkConnection();
  if (!connState.isConnected) {
    throw new Error(`Database connection failed: ${connState.error}`);
  }

  // 1. Try enabling pgvector extension
  let pgvectorEnabled = false;
  try {
    await query('CREATE EXTENSION IF NOT EXISTS vector;');
    pgvectorEnabled = true;
  } catch (extErr) {
    // If pgvector is not installed on PostgreSQL server, log notice and continue with standard types
    console.warn('[PostgreSQL Schema Notice]: pgvector extension is not available on this server. Proceeding without native vector column type.');
  }

  // 2. Create standards table
  const createStandardsTableSql = `
    CREATE TABLE IF NOT EXISTS standards (
      id SERIAL PRIMARY KEY,
      canonical_id VARCHAR(128) UNIQUE,
      is_number VARCHAR(128) UNIQUE NOT NULL,
      title TEXT NOT NULL,
      scope TEXT,
      category VARCHAR(150),
      description TEXT,
      application TEXT,
      technical_requirements JSONB DEFAULT '[]'::jsonb,
      materials JSONB DEFAULT '[]'::jsonb,
      performance_requirements JSONB DEFAULT '[]'::jsonb,
      safety_requirements JSONB DEFAULT '[]'::jsonb,
      testing_requirements JSONB DEFAULT '[]'::jsonb,
      version VARCHAR(256),
      publication_year INTEGER,
      status VARCHAR(50) DEFAULT 'active',
      amendments JSONB DEFAULT '[]'::jsonb,
      supersedes JSONB DEFAULT '[]'::jsonb,
      superseded_by JSONB DEFAULT '[]'::jsonb,
      certification JSONB DEFAULT '{}'::jsonb,
      source TEXT NOT NULL,
      is_primary_candidate BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await query(createStandardsTableSql);

  // 3. Add or migrate vector column if pgvector extension is enabled
  // Default dimension 3072 matches Gemini Embedding 2 (gemini-embedding-2)
  const embeddingDim = parseInt(process.env.GEMINI_EMBEDDING_DIMENSION || '3072', 10);
  if (pgvectorEnabled) {
    try {
      await query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'standards' AND column_name = 'embedding'
          ) THEN
            -- Safely migrate column dimension if necessary
            BEGIN
              ALTER TABLE standards ALTER COLUMN embedding TYPE vector(${embeddingDim});
            EXCEPTION
              WHEN OTHERS THEN
                NULL;
            END;
          ELSE
            ALTER TABLE standards ADD COLUMN embedding vector(${embeddingDim});
          END IF;
        END $$;
      `);
    } catch (colErr) {
      console.warn(`[PostgreSQL Schema Notice]: Could not configure embedding vector(${embeddingDim}) column:`, colErr.message);
    }
  }

  // 4. Create standard_relationships table
  const createRelationshipsTableSql = `
    CREATE TABLE IF NOT EXISTS standard_relationships (
      id SERIAL PRIMARY KEY,
      source_standard_id INTEGER NOT NULL REFERENCES standards(id) ON DELETE CASCADE,
      target_standard_id INTEGER NOT NULL REFERENCES standards(id) ON DELETE CASCADE,
      relationship_type VARCHAR(50) NOT NULL,
      source TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_standard_relationship UNIQUE (source_standard_id, target_standard_id, relationship_type)
    );
  `;
  await query(createRelationshipsTableSql);

  // 5. Create Database Indexes
  const createIndexesSql = `
    CREATE INDEX IF NOT EXISTS idx_standards_is_number ON standards(is_number);
    CREATE INDEX IF NOT EXISTS idx_standards_category ON standards(category);
    CREATE INDEX IF NOT EXISTS idx_standards_status ON standards(status);
    CREATE INDEX IF NOT EXISTS idx_std_rel_source ON standard_relationships(source_standard_id);
    CREATE INDEX IF NOT EXISTS idx_std_rel_target ON standard_relationships(target_standard_id);
    CREATE INDEX IF NOT EXISTS idx_std_rel_type ON standard_relationships(relationship_type);
  `;
  await query(createIndexesSql);

  return {
    success: true,
    pgvectorEnabled: pgvectorEnabled,
    tables: ['standards', 'standard_relationships']
  };
}

/**
 * Retrieves standards with simple filtering by category, status, and is_number.
 * @param {Object} filters
 * @param {string} [filters.category] Filter by exact or partial category
 * @param {string} [filters.status] Filter by status ('active', 'withdrawn', etc.)
 * @param {string} [filters.is_number] Filter by IS number (case-insensitive partial match)
 * @param {number} [filters.limit=50]
 * @param {number} [filters.offset=0]
 */
async function getAllStandards(filters = {}) {
  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (filters.category) {
    conditions.push(`category ILIKE $${paramIdx++}`);
    params.push(`%${filters.category.trim()}%`);
  }

  if (filters.status) {
    conditions.push(`status = $${paramIdx++}`);
    params.push(filters.status.trim().toLowerCase());
  }

  if (filters.is_number) {
    conditions.push(`is_number ILIKE $${paramIdx++}`);
    params.push(`%${filters.is_number.trim()}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(parseInt(filters.limit || 50, 10), 100);
  const offset = Math.max(parseInt(filters.offset || 0, 10), 0);

  const countQuery = `SELECT COUNT(*) AS total FROM standards ${whereClause};`;
  const countRes = await query(countQuery, params);
  const total = parseInt(countRes.rows[0].total, 10);

  const selectQuery = `
    SELECT 
      id, is_number, title, scope, category, description, application,
      technical_requirements, materials, performance_requirements,
      safety_requirements, testing_requirements, version, publication_year,
      status, amendments, supersedes, superseded_by, certification, source,
      created_at, updated_at
    FROM standards
    ${whereClause}
    ORDER BY is_number ASC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++};
  `;
  params.push(limit, offset);

  const res = await query(selectQuery, params);
  return {
    total,
    limit,
    offset,
    standards: res.rows
  };
}

/**
 * Retrieves a single standard by its integer ID or IS number string.
 * Supports:
 * - Integer ID matching (e.g. 3, 4, 5)
 * - Exact IS number string matching (e.g. 'IS 4151:2015')
 * - Prefix IS number matching (e.g. 'IS 4151', 'IS 2745')
 * - Numeric standard code matching (e.g. 4151, 2745, 2925)
 * Prioritizes official records over development test records.
 *
 * @param {number|string} idOrIsNumber
 */
async function getStandardById(idOrIsNumber) {
  if (!idOrIsNumber) return null;
  const clean = String(idOrIsNumber).trim();
  const num = /^\d+$/.test(clean) ? parseInt(clean, 10) : null;
  const digits = clean.replace(/[^0-9]/g, '');

  const sql = `
    SELECT * FROM standards 
    WHERE (id = $1)
       OR (is_number ILIKE $2)
       OR (is_number ILIKE $3)
       OR ($4 != '' AND is_number ~* ('(^|[^0-9])' || $4 || '([^0-9]|$)'))
    ORDER BY 
      (CASE WHEN is_number NOT LIKE 'TEST-%' THEN 0 ELSE 1 END),
      (CASE 
        WHEN id = $1 THEN 1 
        WHEN is_number ILIKE $2 THEN 2 
        WHEN is_number ILIKE $3 THEN 3 
        ELSE 4 
      END)
    LIMIT 1;
  `;
  const res = await query(sql, [num !== null ? num : -1, clean, clean + '%', digits]);
  return res.rows[0] || null;
}

/**
 * Retrieves related standards for a given standard ID.
 * @param {number} standardId Numeric ID of standard
 * @param {string} [relationshipType] Optional filter (normative_reference, testing, safety, etc.)
 */
async function getRelatedStandards(standardId, relationshipType = null) {
  let sql = `
    SELECT 
      r.id AS relationship_id,
      r.relationship_type,
      r.source AS relationship_source,
      r.created_at AS relationship_created_at,
      s.id AS related_standard_id,
      s.is_number,
      s.title,
      s.category,
      s.status,
      s.publication_year,
      s.version
    FROM standard_relationships r
    JOIN standards s ON s.id = r.target_standard_id
    WHERE r.source_standard_id = $1
  `;
  const params = [standardId];

  if (relationshipType) {
    sql += ` AND r.relationship_type = $2`;
    params.push(relationshipType.trim());
  }

  sql += ` ORDER BY s.is_number ASC;`;
  const res = await query(sql, params);
  return res.rows;
}

/**
 * Inserts a new standard record into the database.
 * @param {Object} data
 */
async function createStandard(data) {
  if (!data || !data.is_number || !data.title || !data.source) {
    throw new Error('Standard must contain is_number, title, and source.');
  }

  const sql = `
    INSERT INTO standards (
      is_number, title, scope, category, description, application,
      technical_requirements, materials, performance_requirements,
      safety_requirements, testing_requirements, version, publication_year,
      status, amendments, supersedes, superseded_by, certification, source
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12, $13,
      $14, $15, $16, $17, $18, $19
    )
    RETURNING *;
  `;

  const params = [
    data.is_number.trim(),
    data.title.trim(),
    data.scope || null,
    data.category || null,
    data.description || null,
    data.application || null,
    JSON.stringify(data.technical_requirements || []),
    JSON.stringify(data.materials || []),
    JSON.stringify(data.performance_requirements || []),
    JSON.stringify(data.safety_requirements || []),
    JSON.stringify(data.testing_requirements || []),
    data.version || null,
    data.publication_year ? parseInt(data.publication_year, 10) : null,
    (data.status || 'active').toLowerCase(),
    JSON.stringify(data.amendments || []),
    JSON.stringify(data.supersedes || []),
    JSON.stringify(data.superseded_by || []),
    JSON.stringify(data.certification || {}),
    data.source.trim()
  ];

  const res = await query(sql, params);
  return res.rows[0];
}

/**
 * Updates an existing standard record.
 * @param {number} id Numeric standard ID
 * @param {Object} data Update fields
 */
async function updateStandard(id, data) {
  const current = await getStandardById(id);
  if (!current) {
    return null;
  }

  const updatedData = { ...current, ...data };
  const sql = `
    UPDATE standards SET
      is_number = $1,
      title = $2,
      scope = $3,
      category = $4,
      description = $5,
      application = $6,
      technical_requirements = $7,
      materials = $8,
      performance_requirements = $9,
      safety_requirements = $10,
      testing_requirements = $11,
      version = $12,
      publication_year = $13,
      status = $14,
      amendments = $15,
      supersedes = $16,
      superseded_by = $17,
      certification = $18,
      source = $19,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $20
    RETURNING *;
  `;

  const params = [
    updatedData.is_number.trim(),
    updatedData.title.trim(),
    updatedData.scope || null,
    updatedData.category || null,
    updatedData.description || null,
    updatedData.application || null,
    JSON.stringify(updatedData.technical_requirements || []),
    JSON.stringify(updatedData.materials || []),
    JSON.stringify(updatedData.performance_requirements || []),
    JSON.stringify(updatedData.safety_requirements || []),
    JSON.stringify(updatedData.testing_requirements || []),
    updatedData.version || null,
    updatedData.publication_year ? parseInt(updatedData.publication_year, 10) : null,
    (updatedData.status || 'active').toLowerCase(),
    JSON.stringify(updatedData.amendments || []),
    JSON.stringify(updatedData.supersedes || []),
    JSON.stringify(updatedData.superseded_by || []),
    JSON.stringify(updatedData.certification || {}),
    updatedData.source.trim(),
    id
  ];

  const res = await query(sql, params);
  return res.rows[0];
}

/**
 * Inserts a relationship between two standards.
 * @param {number} sourceStandardId
 * @param {number} targetStandardId
 * @param {string} relationshipType ('normative_reference', 'testing', 'safety', etc.)
 * @param {string} source Authoritative source reference
 */
async function createRelationship(sourceStandardId, targetStandardId, relationshipType, source) {
  const sql = `
    INSERT INTO standard_relationships (
      source_standard_id, target_standard_id, relationship_type, source
    ) VALUES ($1, $2, $3, $4)
    ON CONFLICT (source_standard_id, target_standard_id, relationship_type) DO UPDATE
    SET source = EXCLUDED.source
    RETURNING *;
  `;
  const res = await query(sql, [sourceStandardId, targetStandardId, relationshipType, source]);
  return res.rows[0];
}

/**
 * In accordance with strict guidelines, synthetic test records (TEST-IS-*)
 * are permanently disabled to prevent mock pollution in verified production environments.
 */
async function seedDevelopmentTestRecords() {
  return {
    seeded: false,
    message: 'Synthetic test record seeding disabled in verified application environment.'
  };
}

/**
 * Updates the vector embedding for a specific standard.
 * @param {number} standardId
 * @param {Array<number>} vectorArray
 */
async function updateStandardEmbedding(standardId, vectorArray) {
  if (!Array.isArray(vectorArray) || vectorArray.length === 0) {
    throw new Error('Invalid embedding vector: must be a non-empty array of numbers.');
  }

  // Format vector as pgvector string representation: '[0.01, -0.02, ...]'
  const vectorStr = `[${vectorArray.join(',')}]`;
  const sql = `
    UPDATE standards 
    SET embedding = $1::vector, updated_at = CURRENT_TIMESTAMP 
    WHERE id = $2 
    RETURNING id, is_number, title, updated_at;
  `;
  const res = await query(sql, [vectorStr, standardId]);
  return res.rows[0] || null;
}

/**
 * Retrieves standards that do not yet have vector embeddings.
 * @param {number} [limit=50]
 */
async function getStandardsMissingEmbeddings(limit = 50) {
  const sql = `
    SELECT 
      id, is_number, title, scope, category, description, application,
      technical_requirements, materials, performance_requirements,
      safety_requirements, testing_requirements, version, publication_year, status
    FROM standards
    WHERE embedding IS NULL
    ORDER BY id ASC
    LIMIT $1;
  `;
  const res = await query(sql, [Math.min(parseInt(limit, 10) || 50, 100)]);
  return res.rows;
}

/**
 * Retrieves statistics on standard embedding coverage.
 */
async function getEmbeddingStatistics() {
  const sql = `
    SELECT 
      COUNT(*) AS total,
      COUNT(embedding) AS with_embeddings,
      COUNT(*) - COUNT(embedding) AS without_embeddings
    FROM standards;
  `;
  const res = await query(sql);
  const row = res.rows[0] || {};
  return {
    total: parseInt(row.total || 0, 10),
    withEmbeddings: parseInt(row.with_embeddings || 0, 10),
    withoutEmbeddings: parseInt(row.without_embeddings || 0, 10)
  };
}

module.exports = {
  initDatabaseSchema,
  getAllStandards,
  getStandardById,
  getRelatedStandards,
  createStandard,
  updateStandard,
  createRelationship,
  seedDevelopmentTestRecords,
  updateStandardEmbedding,
  getStandardsMissingEmbeddings,
  getEmbeddingStatistics
};
