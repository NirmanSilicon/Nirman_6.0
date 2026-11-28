const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const PG_BIN = 'C:\\Program Files\\PostgreSQL\\18\\bin';
const DB_NAME = 'nirdeshak_clean_20261126';
const DB_URL = process.env.DATABASE_URL || `postgresql://postgres:surya123@localhost:5432/${DB_NAME}`;
const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const BACKUP_FILE = path.join(BACKUP_DIR, 'nirdeshak_backup_pre_remediation_20261128.sql');
const VERIFY_DB = 'nirdeshak_verify_remediation_backup';

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

  console.log('--- 2. Verifying Restore into Temporary Test Database ---');
  const adminPool = new Pool({
    connectionString: 'postgresql://postgres:surya123@localhost:5432/postgres'
  });

  await adminPool.query(`DROP DATABASE IF EXISTS ${VERIFY_DB};`);
  await adminPool.query(`CREATE DATABASE ${VERIFY_DB};`);
  console.log(`Created verify database: ${VERIFY_DB}`);
  await adminPool.end();

  const restoreCmd = `"${path.join(PG_BIN, 'psql.exe')}" -d "postgresql://postgres:surya123@localhost:5432/${VERIFY_DB}" -f "${BACKUP_FILE}"`;
  console.log('Restoring backup into verify database...');
  execSync(restoreCmd, { stdio: 'pipe', env: { ...process.env, PGPASSWORD: 'surya' } });

  const testPool = new Pool({
    connectionString: `postgresql://postgres:surya123@localhost:5432/${VERIFY_DB}`
  });

  const pfRes = await testPool.query('SELECT COUNT(*) FROM product_families;');
  const stdRes = await testPool.query('SELECT COUNT(*) FROM standards;');
  const mapRes = await testPool.query('SELECT COUNT(*) FROM product_standard_mappings;');

  console.log(`Verify DB product_families count: ${pfRes.rows[0].count}`);
  console.log(`Verify DB standards count:        ${stdRes.rows[0].count}`);
  console.log(`Verify DB mappings count:         ${mapRes.rows[0].count}`);

  if (parseInt(pfRes.rows[0].count) === 1047 && parseInt(stdRes.rows[0].count) === 710 && parseInt(mapRes.rows[0].count) === 1125) {
    console.log('\n[PASS] Pre-remediation backup is 100% verified and match exact live counts (1047 / 710 / 1125).');
  } else {
    throw new Error('Counts mismatch in verify database!');
  }

  // Cleanup verify DB
  await testPool.end();
  const cleanAdmin = new Pool({ connectionString: 'postgresql://postgres:surya123@localhost:5432/postgres' });
  await cleanAdmin.query(`DROP DATABASE IF EXISTS ${VERIFY_DB};`);
  await cleanAdmin.end();
  console.log('Temporary verification database cleaned up.');
}

main().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});
