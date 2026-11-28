require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function runBackup() {
  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = '20261127_193300';
  const dbUrl = new URL(process.env.DATABASE_URL);
  const dbUser = dbUrl.username || 'postgres';
  const dbPass = dbUrl.password || 'postgres';
  const dbHost = dbUrl.hostname || 'localhost';
  const dbPort = dbUrl.port || '5432';
  const dbName = dbUrl.pathname.replace(/^\//, '') || 'nirdeshak_clean_20261126';

  const pgDumpPath = 'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe';
  const dumpFile = path.join(backupDir, `nirdeshak_clean_pre_universal_expansion_${timestamp}.dump`);
  const sqlFile = path.join(backupDir, `nirdeshak_clean_pre_universal_expansion_${timestamp}.sql`);

  console.log('[Step 1] Creating PostgreSQL custom format dump...');
  const env = { ...process.env, PGPASSWORD: dbPass };
  execSync(`"${pgDumpPath}" -h ${dbHost} -p ${dbPort} -U ${dbUser} -F c -b -v -f "${dumpFile}" ${dbName}`, { env, stdio: 'inherit' });
  console.log(`Dump created: ${dumpFile} (${fs.statSync(dumpFile).size} bytes)`);

  console.log('[Step 2] Creating PostgreSQL plain text SQL backup...');
  execSync(`"${pgDumpPath}" -h ${dbHost} -p ${dbPort} -U ${dbUser} -F p -b -v -f "${sqlFile}" ${dbName}`, { env, stdio: 'inherit' });
  console.log(`SQL backup created: ${sqlFile} (${fs.statSync(sqlFile).size} bytes)`);

  console.log('Pre-universal-expansion backup complete!');
}

runBackup().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});
