const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkSchema() {
  const cols = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'product_standard_mappings' 
    ORDER BY ordinal_position
  `);
  console.table(cols.rows);

  const sample = await pool.query('SELECT * FROM product_standard_mappings LIMIT 3');
  console.log('Sample row:');
  console.log(sample.rows[0]);

  await pool.end();
}

checkSchema();
