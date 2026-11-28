const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const res = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'standards'
    ORDER BY ordinal_position
  `);
  console.table(res.rows);
  await pool.end();
}
check().catch(console.error);
