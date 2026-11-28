require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runMigration() {
  const client = await pool.connect();
  try {
    const sqlPath = path.join(__dirname, 'migrations', '001_universal_expansion_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('[Migration] Applying 001_universal_expansion_schema.sql to database:', process.env.DATABASE_URL);
    await client.query(sql);
    console.log('[Migration] Migration completed successfully!');

    // Verify existing data preservation
    const stdCount = await client.query('SELECT count(*) FROM standards');
    const relCount = await client.query('SELECT count(*) FROM standard_relationships');
    console.log(`[Verification] standards count preserved: ${stdCount.rows[0].count}`);
    console.log(`[Verification] standard_relationships count preserved: ${relCount.rows[0].count}`);

    // Verify new tables
    const tableRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('[Verification] Tables present in public schema:');
    tableRes.rows.forEach(r => console.log(' -', r.table_name));

  } catch (err) {
    console.error('[Migration ERROR]:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error(err);
  process.exit(1);
});
