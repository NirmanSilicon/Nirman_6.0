const { query, closePool } = require('../database');

async function check() {
  const p = await query('SELECT * FROM product_families WHERE id = 432');
  console.log('Product 432:', p.rows[0]);
  const m = await query('SELECT psm.*, s.is_number, s.title FROM product_standard_mappings psm JOIN standards s ON psm.standard_id = s.id WHERE psm.product_family_id = 432');
  console.log('Mappings for 432:', m.rows);
  const s = await query(`SELECT id, is_number, title FROM standards WHERE title ~* 'noodle|pasta|macaroni|cereal' OR description ~* 'noodle|pasta|macaroni'`);
  console.log('Matching standards in DB:', s.rows);

  // Also check if there are other food products with mechanical/electrical standards:
  const foodMech = await query(`
    SELECT psm.id, pf.id as p_id, pf.canonical_name, pf.division_council, s.is_number, s.title, s.division_council as s_council
    FROM product_standard_mappings psm
    JOIN product_families pf ON psm.product_family_id = pf.id
    JOIN standards s ON psm.standard_id = s.id
    WHERE pf.division_council = 'Food and Agriculture'
      AND s.division_council IN ('Mechanical Engineering', 'Electrotechnical', 'Electronics and Information Technology')
      AND pf.subcategory NOT ILIKE '%machinery%' AND pf.subcategory NOT ILIKE '%equipment%'
  `);
  console.log('Food products mapped to mechanical/electrical (non-machinery):', foodMech.rows);

  await closePool();
}

check().catch(console.error);
