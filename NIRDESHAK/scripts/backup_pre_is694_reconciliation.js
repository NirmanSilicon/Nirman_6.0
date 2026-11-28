require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runBackup() {
  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = '20261127_185200';

  console.log('[Step 1] Recording before-state for IS-694-2010...');
  const res = await pool.query("SELECT * FROM standards WHERE canonical_id = 'IS-694-2010'");
  const beforeFile = path.join(backupDir, `before_is694_reconciliation_${timestamp}.json`);
  fs.writeFileSync(beforeFile, JSON.stringify(res.rows[0], null, 2), 'utf8');
  console.log(`Saved before-state to: ${beforeFile}`);
  await pool.end();

  const dbUrl = new URL(process.env.DATABASE_URL);
  const dbUser = dbUrl.username || 'postgres';
  const dbPass = dbUrl.password || 'postgres';
  const dbHost = dbUrl.hostname || 'localhost';
  const dbPort = dbUrl.port || '5432';
  const dbName = dbUrl.pathname.replace(/^\//, '') || 'nirdeshak_clean_20261126';

  const pgDumpPath = 'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe';
  const dumpFile = path.join(backupDir, `nirdeshak_clean_pre_is694_reconciliation_${timestamp}.dump`);
  const sqlFile = path.join(backupDir, `nirdeshak_clean_pre_is694_reconciliation_${timestamp}.sql`);

  console.log('[Step 2] Creating PostgreSQL custom format dump...');
  const env = { ...process.env, PGPASSWORD: dbPass };
  execSync(`"${pgDumpPath}" -h ${dbHost} -p ${dbPort} -U ${dbUser} -F c -b -v -f "${dumpFile}" ${dbName}`, { env, stdio: 'inherit' });
  console.log(`Dump created: ${dumpFile} (${fs.statSync(dumpFile).size} bytes)`);

  console.log('[Step 3] Creating PostgreSQL plain text SQL backup...');
  execSync(`"${pgDumpPath}" -h ${dbHost} -p ${dbPort} -U ${dbUser} -F p -b -v -f "${sqlFile}" ${dbName}`, { env, stdio: 'inherit' });
  console.log(`SQL backup created: ${sqlFile} (${fs.statSync(sqlFile).size} bytes)`);

  console.log('Pre-reconciliation backup complete!');
}

runBackup().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});
