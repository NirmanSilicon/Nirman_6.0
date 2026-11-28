const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const res = await pool.query(`
    SELECT psm.*, pf.canonical_name, s.is_number, s.title
    FROM product_standard_mappings psm
    JOIN product_families pf ON psm.product_family_id = pf.id
    JOIN standards s ON psm.standard_id = s.id
    WHERE s.is_number = 'IS 10258:2002' OR pf.canonical_name ILIKE '%Safety Glass for Road Vehicles%';
  `);
  console.log('Sample rows:', JSON.stringify(res.rows, null, 2));
  await pool.end();
}

check().catch(console.error);
