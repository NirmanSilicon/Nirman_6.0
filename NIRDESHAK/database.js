// =========================================================
// Nirdeshak - PostgreSQL Connection & Pool Management
// Step 4: Standards Database Setup
// Handles: Reusable pg.Pool, connection checking, and query execution.
// Credentials remain strictly server-side.
// =========================================================

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

let pool = null;
let connectionState = {
  isConnected: false,
  lastChecked: null,
  error: null,
  version: null,
  pgvectorAvailable: false
};

/**
 * Resolves connection configuration from environment variables.
 * Prioritizes DATABASE_URL, with fallbacks to PG* standard env vars.
 */
function getPoolConfig() {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && databaseUrl.trim() && databaseUrl !== 'postgresql://USERNAME:PASSWORD@localhost:5432/nirdeshak') {
    return {
      connectionString: databaseUrl.trim(),
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      max: 10
    };
  }

  // Fallback connection parameters
  return {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    database: process.env.PGDATABASE || 'nirdeshak',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    max: 10
  };
}

/**
 * Initializes and returns the pg Pool instance.
 */
function getPool() {
  if (!pool) {
    const config = getPoolConfig();
    pool = new Pool(config);

    pool.on('error', (err) => {
      console.error('[PostgreSQL Pool Error]: Unexpected client error:', err.message);
      connectionState.isConnected = false;
      connectionState.error = err.message;
    });
  }
  return pool;
}

/**
 * Executes a parameterized SQL query using the pool.
 * @param {string} text SQL statement
 * @param {Array} [params] Query parameters
 */
async function query(text, params) {
  const p = getPool();
  return p.query(text, params);
}

/**
 * Checks connectivity to the PostgreSQL server and detects PostgreSQL version & pgvector.
 * @returns {Promise<{ isConnected: boolean, version?: string, pgvectorAvailable: boolean, error?: string }>}
 */
async function checkConnection() {
  try {
    const p = getPool();
    const res = await p.query('SELECT version();');
    const versionString = res.rows[0] ? res.rows[0].version : 'Unknown';

    // Check if pgvector extension is available in pg_available_extensions
    let pgvectorAvailable = false;
    try {
      const vecRes = await p.query(
        "SELECT name, installed_version FROM pg_available_extensions WHERE name = 'vector';"
      );
      if (vecRes.rows.length > 0) {
        pgvectorAvailable = true;
      }
    } catch (vErr) {
      // Ignore extension catalog lookup failure
    }

    connectionState = {
      isConnected: true,
      lastChecked: new Date(),
      error: null,
      version: versionString,
      pgvectorAvailable: pgvectorAvailable
    };

    return connectionState;
  } catch (err) {
    connectionState = {
      isConnected: false,
      lastChecked: new Date(),
      error: err.message,
      version: null,
      pgvectorAvailable: false
    };
    return connectionState;
  }
}

/**
 * Returns current connection state without re-querying if recently verified.
 */
function getConnectionState() {
  return connectionState;
}

/**
 * Gracefully closes the database pool.
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    connectionState.isConnected = false;
  }
}

module.exports = {
  getPool,
  query,
  checkConnection,
  getConnectionState,
  closePool
};
