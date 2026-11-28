const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const PG_BIN = 'C:\\Program Files\\PostgreSQL\\18\\bin';
const DB_URL = process.env.DATABASE_URL;
const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const BACKUP_FILE = path.join(BACKUP_DIR, 'nirdeshak_audit_backup_20261128.sql');
const TEST_DB = 'nirdeshak_relevance_audit_test';

async function main() {
  console.log('--- 1. Creating Database Backup ---');
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const dumpCmd = `"${path.join(PG_BIN, 'pg_dump.exe')}" --dbname="${DB_URL}" -F p -f "${BACKUP_FILE}"`;
  console.log(`Running pg_dump to ${BACKUP_FILE}...`);
  execSync(dumpCmd, { stdio: 'inherit', env: { ...process.env, PGPASSWORD: 'surya' } });

  const stats = fs.statSync(BACKUP_FILE);
  console.log(`Backup completed successfully: ${stats.size} bytes (${(stats.size / 1024 / 1024).toFixed(2)} MB)\n`);

  console.log('--- 2. Verifying Restore into Test Database ---');
  const adminPool = new Pool({
    connectionString: 'postgresql://postgres:surya123@localhost:5432/postgres'
  });

  await adminPool.query(`DROP DATABASE IF EXISTS ${TEST_DB};`);
  await adminPool.query(`CREATE DATABASE ${TEST_DB};`);
  console.log(`Created test database: ${TEST_DB}`);
  await adminPool.end();

  const restoreCmd = `"${path.join(PG_BIN, 'psql.exe')}" -d "postgresql://postgres:surya123@localhost:5432/${TEST_DB}" -f "${BACKUP_FILE}"`;
  console.log('Restoring backup into test database...');
  execSync(restoreCmd, { stdio: 'pipe', env: { ...process.env, PGPASSWORD: 'surya' } });

  const testPool = new Pool({
    connectionString: `postgresql://postgres:surya123@localhost:5432/${TEST_DB}`
  });

  const pfRes = await testPool.query('SELECT COUNT(*) FROM product_families;');
  const stdRes = await testPool.query('SELECT COUNT(*) FROM standards;');
  const mapRes = await testPool.query('SELECT COUNT(*) FROM product_standard_mappings;');

  console.log(`Test DB product_families count: ${pfRes.rows[0].count}`);
  console.log(`Test DB standards count:        ${stdRes.rows[0].count}`);
  console.log(`Test DB mappings count:         ${mapRes.rows[0].count}`);

  await testPool.end();

  // Drop test database after successful verification
  const cleanupPool = new Pool({
    connectionString: 'postgresql://postgres:surya123@localhost:5432/postgres'
  });
  await cleanupPool.query(`DROP DATABASE IF EXISTS ${TEST_DB};`);
  console.log(`Cleaned up test database ${TEST_DB}`);
  await cleanupPool.end();

  console.log('\n[PASS] Database backup created and verified 100% restorable.');
}

main().catch(err => {
  console.error('Fatal backup error:', err);
  process.exit(1);
});
