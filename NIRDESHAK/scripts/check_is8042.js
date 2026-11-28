const { query, closePool } = require('../database');

async function check() {
  const r = await query(`SELECT id, is_number, title FROM standards WHERE is_number ILIKE '%8042%'`);
  console.log('IS 8042 matches:', r.rows);
  await closePool();
}
check();
