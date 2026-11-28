const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function print11() {
  const res = await pool.query(`
    SELECT pf.id, pf.family_code, pf.canonical_name, pf.division_council, pf.coverage_status
    FROM product_families pf
    WHERE pf.coverage_status = 'VERIFIED_SUPPORTING_ONLY'
    ORDER BY pf.id
  `);
  console.log('The 11 VERIFIED_SUPPORTING_ONLY records:');
  res.rows.forEach((r, idx) => {
    console.log(`${idx + 1}. ID ${r.id} | Code: ${r.family_code} | Name: "${r.canonical_name}" | Council: ${r.division_council}`);
  });
  await pool.end();
}

print11();
