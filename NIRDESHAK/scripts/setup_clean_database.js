// =========================================================
// Nirdeshak - Clean Database & Schema Setup Script
// Target: nirdeshak_clean_20261126
// =========================================================

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const NEW_DB_NAME = 'nirdeshak_clean_20261126';

function getAdminPool() {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && databaseUrl.trim()) {
    // Replace database name in URL with 'postgres' for administrative operations
    const url = new URL(databaseUrl.trim());
    url.pathname = '/postgres';
    return new Pool({ connectionString: url.toString() });
  }

  return new Pool({
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: 'postgres'
  });
}

function getCleanPool() {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && databaseUrl.trim()) {
    const url = new URL(databaseUrl.trim());
    url.pathname = `/${NEW_DB_NAME}`;
    return new Pool({ connectionString: url.toString() });
  }

  return new Pool({
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: NEW_DB_NAME
  });
}

async function setupCleanDatabase() {
  console.log(`[Clean DB Setup]: Starting setup for '${NEW_DB_NAME}' on PostgreSQL 18...`);

  // Step 1: Create database if not exists
  const adminPool = getAdminPool();
  try {
    const checkRes = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [NEW_DB_NAME]
    );

    if (checkRes.rows.length === 0) {
      console.log(`[Clean DB Setup]: Database '${NEW_DB_NAME}' does not exist. Creating...`);
      await adminPool.query(`CREATE DATABASE ${NEW_DB_NAME};`);
      console.log(`[Clean DB Setup]: Database '${NEW_DB_NAME}' created successfully.`);
    } else {
      console.log(`[Clean DB Setup]: Database '${NEW_DB_NAME}' already exists. Reusing.`);
    }
  } finally {
    await adminPool.end();
  }

  // Step 2: Connect to clean database and apply schema
  const cleanPool = getCleanPool();
  try {
    const versionRes = await cleanPool.query('SELECT version();');
    console.log(`[Clean DB Setup]: Connected to '${NEW_DB_NAME}'. PostgreSQL Version:`, versionRes.rows[0].version.split(',')[0]);

    // Step 2.1: Enable pgvector extension
    console.log(`[Clean DB Setup]: Enabling 'vector' extension...`);
    await cleanPool.query('CREATE EXTENSION IF NOT EXISTS vector;');
    const extCheck = await cleanPool.query(`SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';`);
    if (extCheck.rows.length === 0) {
      throw new Error("Failed to install or locate 'vector' extension in new database!");
    }
    console.log(`[Clean DB Setup]: pgvector extension is active: version ${extCheck.rows[0].extversion}`);

    // Step 2.2: Create standards table
    console.log(`[Clean DB Setup]: Creating 'standards' table with vector(3072)...`);
    const createStandardsSql = `
      CREATE TABLE IF NOT EXISTS standards (
        id SERIAL PRIMARY KEY,
        canonical_id VARCHAR(128) UNIQUE NOT NULL,
        is_number VARCHAR(128) UNIQUE NOT NULL,
        title TEXT NOT NULL,
        scope TEXT,
        category VARCHAR(128),
        description TEXT,
        application TEXT,
        technical_requirements JSONB DEFAULT '[]'::jsonb,
        materials JSONB DEFAULT '[]'::jsonb,
        performance_requirements JSONB DEFAULT '[]'::jsonb,
        safety_requirements JSONB DEFAULT '[]'::jsonb,
        testing_requirements JSONB DEFAULT '[]'::jsonb,
        version VARCHAR(128),
        publication_year INTEGER,
        status VARCHAR(32) DEFAULT 'active',
        amendments JSONB DEFAULT '[]'::jsonb,
        supersedes JSONB DEFAULT '[]'::jsonb,
        superseded_by JSONB DEFAULT '[]'::jsonb,
        certification JSONB DEFAULT '{}'::jsonb,
        source TEXT,
        is_primary_candidate BOOLEAN DEFAULT true,
        embedding vector(3072),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await cleanPool.query(createStandardsSql);

    // Step 2.3: Indexes on standards
    console.log(`[Clean DB Setup]: Creating performance indexes on 'standards'...`);
    await cleanPool.query(`CREATE INDEX IF NOT EXISTS idx_standards_is_number ON standards (is_number);`);
    await cleanPool.query(`CREATE INDEX IF NOT EXISTS idx_standards_canonical_id ON standards (canonical_id);`);
    await cleanPool.query(`CREATE INDEX IF NOT EXISTS idx_standards_category ON standards (category);`);
    await cleanPool.query(`CREATE INDEX IF NOT EXISTS idx_standards_status ON standards (status);`);
    await cleanPool.query(`CREATE INDEX IF NOT EXISTS idx_standards_is_primary ON standards (is_primary_candidate);`);

    // Step 2.4: Create standard_relationships table
    console.log(`[Clean DB Setup]: Creating 'standard_relationships' table...`);
    const createRelationshipsSql = `
      CREATE TABLE IF NOT EXISTS standard_relationships (
        id SERIAL PRIMARY KEY,
        source_standard_id INTEGER REFERENCES standards(id) ON DELETE CASCADE,
        target_standard_id INTEGER REFERENCES standards(id) ON DELETE CASCADE,
        source_is_number VARCHAR(128),
        target_is_number VARCHAR(128),
        relationship_type VARCHAR(64) NOT NULL,
        evidence TEXT,
        source TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE standards ALTER COLUMN version TYPE VARCHAR(256);
      ALTER TABLE standards ALTER COLUMN is_number TYPE VARCHAR(128);
      ALTER TABLE standards ALTER COLUMN canonical_id TYPE VARCHAR(128);
      ALTER TABLE standard_relationships ALTER COLUMN source_is_number TYPE VARCHAR(128);
      ALTER TABLE standard_relationships ALTER COLUMN target_is_number TYPE VARCHAR(128);
    `;
    await cleanPool.query(createRelationshipsSql);

    await cleanPool.query(`CREATE INDEX IF NOT EXISTS idx_relationships_source ON standard_relationships (source_standard_id);`);
    await cleanPool.query(`CREATE INDEX IF NOT EXISTS idx_relationships_target ON standard_relationships (target_standard_id);`);
    await cleanPool.query(`CREATE INDEX IF NOT EXISTS idx_relationships_type ON standard_relationships (relationship_type);`);

    // Verify tables
    const tablesRes = await cleanPool.query(`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
    `);
    console.log(`[Clean DB Setup]: Tables in '${NEW_DB_NAME}':`, tablesRes.rows.map(r => r.table_name));

    // Verify vector column
    const colRes = await cleanPool.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'standards' AND column_name = 'embedding';
    `);
    console.log(`[Clean DB Setup]: Embedding column details:`, colRes.rows[0]);

    console.log(`[Clean DB Setup]: Database '${NEW_DB_NAME}' setup completed successfully!`);
    return { success: true, dbName: NEW_DB_NAME };
  } finally {
    await cleanPool.end();
  }
}

if (require.main === module) {
  setupCleanDatabase()
    .then(r => {
      console.log('Result:', r);
      process.exit(0);
    })
    .catch(err => {
      console.error('Clean DB setup error:', err);
      process.exit(1);
    });
}

module.exports = { setupCleanDatabase, NEW_DB_NAME, getCleanPool };
