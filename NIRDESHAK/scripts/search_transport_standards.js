const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function searchStandards() {
  const res = await pool.query(`
    SELECT id, is_number, title, division_council, category
    FROM standards
    WHERE title ILIKE '%automotive%' OR title ILIKE '%motor vehicle%' OR title ILIKE '%terminology%' OR division_council ILIKE '%transport%'
    ORDER BY id ASC;
  `);
  console.log(`Found ${res.rows.length} transport/automotive standards:`);
  console.table(res.rows);
  await pool.end();
}

searchStandards().catch(console.error);
