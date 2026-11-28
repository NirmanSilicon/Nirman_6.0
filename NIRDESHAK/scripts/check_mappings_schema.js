const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const res = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'product_standard_mappings'
    ORDER BY ordinal_position
  `);
  console.table(res.rows);

  const existingMappings = await pool.query(`
    SELECT relationship_type, count(*) as count 
    FROM product_standard_mappings 
    GROUP BY relationship_type
  `);
  console.table(existingMappings.rows);

  await pool.end();
}
check().catch(console.error);
