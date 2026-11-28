const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function verifyAutomotivePrimaries() {
  const res = await pool.query(`
    SELECT pf.id as product_id, pf.canonical_name, s.is_number, s.title, psm.relationship_type
    FROM product_families pf
    JOIN product_standard_mappings psm ON pf.id = psm.product_family_id
    JOIN standards s ON psm.standard_id = s.id
    WHERE pf.id IN (95, 96, 97, 297, 298) AND psm.relationship_type = 'primary_specification';
  `);
  console.log('Automotive products primary standards:');
  console.table(res.rows);
  await pool.end();
}

verifyAutomotivePrimaries().catch(console.error);
