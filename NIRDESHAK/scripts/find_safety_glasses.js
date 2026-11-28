const { query, closePool } = require('../database');

async function findGlasses() {
  const pf = await query(`
    SELECT id, canonical_name, division_council, subcategory
    FROM product_families 
    WHERE canonical_name ~* 'eye|safety glass|spectacle|goggle'
  `);
  console.log('Product families for eye/glasses:');
  console.table(pf.rows);

  const s = await query(`
    SELECT id, is_number, title, division_council
    FROM standards 
    WHERE title ~* 'eye|safety glass|spectacle|goggle|5983|8521'
  `);
  console.log('Standards for eye/glasses:');
  console.table(s.rows);

  await closePool();
}

findGlasses().catch(console.error);
