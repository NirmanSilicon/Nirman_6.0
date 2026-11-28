const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const stdCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'standards' ORDER BY ordinal_position");
  console.log('--- STANDARDS COLUMNS ---');
  stdCols.rows.forEach(r => console.log(r.column_name + ' (' + r.data_type + ')'));

  const psmCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'product_standard_mappings' ORDER BY ordinal_position");
  console.log('\n--- PRODUCT_STANDARD_MAPPINGS COLUMNS ---');
  psmCols.rows.forEach(r => console.log(r.column_name + ' (' + r.data_type + ')'));

  const pfCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'product_families' ORDER BY ordinal_position");
  console.log('\n--- PRODUCT_FAMILIES COLUMNS ---');
  pfCols.rows.forEach(r => console.log(r.column_name + ' (' + r.data_type + ')'));

  await pool.end();
}
check();
