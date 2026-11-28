const { query, closePool } = require('../database');

async function check() {
  const r = await query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'product_families'`);
  console.table(r.rows);
  await closePool();
}
check();
