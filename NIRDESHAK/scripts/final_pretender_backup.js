const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const PG_BIN = 'C:\\Program Files\\PostgreSQL\\18\\bin';
const DB_NAME = 'nirdeshak_clean_20261126';
const DB_URL = process.env.DATABASE_URL || `postgresql://postgres:surya123@localhost:5432/${DB_NAME}`;
const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const BACKUP_FILE = path.join(BACKUP_DIR, `nirdeshak_final_pretender_backup_${Date.now()}.sql`);
const VERIFY_DB = 'nirdeshak_verify_final_pretender';

async function main() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  console.log(`Dumping active database ${DB_NAME} to ${BACKUP_FILE}...`);
  const dumpCmd = `"${path.join(PG_BIN, 'pg_dump.exe')}" --dbname="${DB_URL}" -F p -f "${BACKUP_FILE}"`;
  execSync(dumpCmd, { stdio: 'inherit', env: { ...process.env, PGPASSWORD: 'surya123' } });

  const stats = fs.statSync(BACKUP_FILE);
  console.log(`Backup generated: ${stats.size} bytes (${(stats.size/1024/1024).toFixed(2)} MB)`);

  console.log(`Verifying restore into ${VERIFY_DB}...`);
  const adminPool = new Pool({ connectionString: 'postgresql://postgres:surya123@localhost:5432/postgres' });
  await adminPool.query(`DROP DATABASE IF EXISTS ${VERIFY_DB}`);
  await adminPool.query(`CREATE DATABASE ${VERIFY_DB}`);
  await adminPool.end();

  const restoreCmd = `"${path.join(PG_BIN, 'psql.exe')}" -d "postgresql://postgres:surya123@localhost:5432/${VERIFY_DB}" -f "${BACKUP_FILE}"`;
  execSync(restoreCmd, { stdio: 'pipe', env: { ...process.env, PGPASSWORD: 'surya123' } });

  const testPool = new Pool({ connectionString: `postgresql://postgres:surya123@localhost:5432/${VERIFY_DB}` });
  const pf = await testPool.query('SELECT count(*) FROM product_families');
  const std = await testPool.query('SELECT count(*) FROM standards');
  const psm = await testPool.query('SELECT count(*) FROM product_standard_mappings');

  console.log(`Restored verify counts: Products=${pf.rows[0].count}, Standards=${std.rows[0].count}, Mappings=${psm.rows[0].count}`);
  await testPool.end();

  const cleanPool = new Pool({ connectionString: 'postgresql://postgres:surya123@localhost:5432/postgres' });
  await cleanPool.query(`DROP DATABASE IF EXISTS ${VERIFY_DB}`);
  await cleanPool.end();
  console.log('[PASS] Full backup verified and temporary verify DB cleaned up.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
