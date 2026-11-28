const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const res = await pool.query("SELECT id, canonical_name, division_council FROM product_families WHERE coverage_status = 'DISCOVERED_CATALOGUE_ONLY'");
  console.log(`Remaining ${res.rows.length} items:`);
  res.rows.forEach(r => console.log(`${r.id} | ${r.division_council} | ${r.canonical_name}`));
  await pool.end();
}
check();
