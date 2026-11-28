/**
 * NIRDESHAK Pre-Remediation Backup & Before-State Recorder
 */
const { Pool } = require('pg');
const fs = require('fs');
const { execSync } = require('child_process');
require('dotenv').config();

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log('Recording before-state from database:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
    const res = await pool.query(`
      SELECT id, canonical_id, is_number, title, version, certification, amendments, supersedes, superseded_by
      FROM standards
      WHERE canonical_id IN ('IS-694-2010', 'IS-IEC-60898-1-2015')
      ORDER BY id;
    `);

    const timestamp = '20261127_003500';
    const beforeStatePath = `backups/before_remediation_records_${timestamp}.json`;
    fs.writeFileSync(beforeStatePath, JSON.stringify(res.rows, null, 2));
    console.log(`Before-state saved to ${beforeStatePath}:`);
    res.rows.forEach(r => {
      console.log(` - ${r.canonical_id} (${r.is_number}):`);
      console.log(`   Title: ${r.title}`);
      console.log(`   Gazette No: ${r.certification?.gazette_no}`);
      console.log(`   Schedule Item: ${r.certification?.schedule_item}`);
      console.log(`   Effective Date: ${r.certification?.effective_date}`);
      console.log(`   Commencement Note: ${r.certification?.commencement_clause_note}`);
    });

    // Also backup standard_relationships before state
    const relRes = await pool.query(`
      SELECT * FROM standard_relationships
      WHERE source_is_number LIKE '%8828%' OR target_is_number LIKE '%8828%'
         OR source_is_number LIKE '%60898%' OR target_is_number LIKE '%60898%'
         OR source_is_number LIKE '%694%' OR target_is_number LIKE '%694%';
    `);
    fs.writeFileSync(`backups/before_remediation_relationships_${timestamp}.json`, JSON.stringify(relRes.rows, null, 2));

    // Fresh pg_dump of nirdeshak_clean_20261126
    const dumpPath = `backups/nirdeshak_clean_pre_remediation_${timestamp}.dump`;
    const sqlPath = `backups/nirdeshak_clean_pre_remediation_${timestamp}.sql`;

    const pgDump = 'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe';
    const dbUrl = new URL(process.env.DATABASE_URL);
    const pgPass = decodeURIComponent(dbUrl.password);
    console.log(`Creating fresh custom-format backup at ${dumpPath}...`);
    execSync(`"${pgDump}" -U ${dbUrl.username} -h ${dbUrl.hostname} -p ${dbUrl.port || 5432} -F c -b -f "${dumpPath}" nirdeshak_clean_20261126`, {
      env: { ...process.env, PGPASSWORD: pgPass }
    });
    console.log(`Custom-format backup completed (${fs.statSync(dumpPath).size} bytes).`);

    console.log(`Creating plain SQL backup at ${sqlPath}...`);
    execSync(`"${pgDump}" -U ${dbUrl.username} -h ${dbUrl.hostname} -p ${dbUrl.port || 5432} -F p -f "${sqlPath}" nirdeshak_clean_20261126`, {
      env: { ...process.env, PGPASSWORD: pgPass }
    });
    console.log(`Plain SQL backup completed (${fs.statSync(sqlPath).size} bytes).`);

    console.log('Pre-remediation backup and before-state recording COMPLETED.');
  } catch (err) {
    console.error('Backup / before-state failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
