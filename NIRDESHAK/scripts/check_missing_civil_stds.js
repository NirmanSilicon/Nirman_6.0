const { query, closePool } = require('../database');

async function check() {
  const r = await query(`
    SELECT id, is_number, title 
    FROM standards 
    WHERE is_number ILIKE ANY(ARRAY['%16714%', '%12089%', '%12894%', '%2222%', '%9103%', '%16354%']);
  `);
  console.log(`Found ${r.rows.length} standards:`);
  console.table(r.rows);
  await closePool();
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});
