const { query, closePool } = require('../database');

async function findGenuineStandards() {
  const terms = ['seat belt', 'mirror', 'pallet truck', 'brake', 'leaf spring', 'continuity', 'airbag'];
  for (const t of terms) {
    const s = await query(`SELECT id, is_number, title FROM standards WHERE title ILIKE $1`, [`%${t}%`]);
    console.log(`Term: "${t}" -> ${s.rows.length} standards found:`);
    s.rows.forEach(r => console.log(`   [${r.id}] ${r.is_number}: ${r.title}`));
  }
  await closePool();
}

findGenuineStandards().catch(console.error);
