const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const res = await pool.query(`
    SELECT pf.canonical_name, pf.division_council, count(psm.id) as map_count
    FROM product_families pf
    LEFT JOIN product_standard_mappings psm ON psm.product_family_id = pf.id
    WHERE pf.coverage_status = 'DISCOVERED_CATALOGUE_ONLY'
    GROUP BY pf.canonical_name, pf.division_council
    LIMIT 5
  `);
  console.table(res.rows);
  await pool.end();
}
check().catch(console.error);
