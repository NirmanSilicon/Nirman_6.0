const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const res = await pool.query(`
    SELECT division_council, count(*) as count 
    FROM standards 
    GROUP BY division_council 
    ORDER BY count DESC
  `);
  console.log('Standards per council in DB:');
  console.table(res.rows);

  // Check specific standard numbers in DB
  const sample = await pool.query(`
    SELECT is_number, title 
    FROM standards 
    WHERE is_number LIKE '%1200%' OR is_number LIKE '%1367%' OR is_number LIKE '%1969%' OR is_number LIKE '%16503%' OR is_number LIKE '%5120%'
  `);
  console.log('Sample standards in DB matching keys:');
  console.table(sample.rows);

  await pool.end();
}
check().catch(console.error);
