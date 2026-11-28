const { query, closePool } = require('../database');

async function listFADStandards() {
  const res = await query(`
    SELECT id, is_number, title, division_council
    FROM standards
    WHERE division_council ILIKE '%Food%'
    ORDER BY id
  `);
  console.log(`Found ${res.rows.length} Food & Agriculture standards:`);
  res.rows.forEach(r => console.log(`  [${r.id}] ${r.is_number}: ${r.title.substring(0, 70)}`));
  await closePool();
}

listFADStandards().catch(console.error);
