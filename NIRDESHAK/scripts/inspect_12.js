const { query, closePool } = require('../database');

async function inspect12() {
  const r = await query(`SELECT id, canonical_name, common_synonyms, technical_keywords FROM product_families WHERE id = 12`);
  console.log('Product 12 JSONB columns:', r.rows[0]);
  await closePool();
}
inspect12();
