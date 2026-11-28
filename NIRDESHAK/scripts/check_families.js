const { query, closePool } = require('../database');

async function check() {
  const glasses = await query(`
    SELECT id, canonical_name, division_council, subcategory
    FROM product_families
    WHERE canonical_name ILIKE '%glass%' OR canonical_name ILIKE '%eye%' OR canonical_name ILIKE '%spectacle%'
  `);
  console.log('Glasses/Eye families:', glasses.rows);

  const cables = await query(`
    SELECT id, canonical_name, division_council, subcategory
    FROM product_families
    WHERE canonical_name ILIKE '%pvc%cable%' OR canonical_name ILIKE '%copper%cable%'
  `);
  console.log('Cables families:', cables.rows);

  await closePool();
}

check().catch(console.error);
