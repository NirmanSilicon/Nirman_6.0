const { query, closePool } = require('../database');

async function run() {
  console.log('--- INVESTIGATING 777 VS 778 ---');
  const r1 = await query(`SELECT count(*) FROM product_families WHERE coverage_status = 'VERIFIED_PRIMARY';`);
  console.log('PF coverage_status = VERIFIED_PRIMARY:', r1.rows[0].count);
  
  const r2 = await query(`
    SELECT count(DISTINCT pf.id) 
    FROM product_families pf 
    JOIN product_standard_mappings psm ON pf.id = psm.product_family_id 
    WHERE pf.coverage_status = 'VERIFIED_PRIMARY' AND psm.relationship_type = 'primary_specification';
  `);
  console.log('PF with coverage_status = VERIFIED_PRIMARY AND relationship_type = primary_specification:', r2.rows[0].count);

  const r3 = await query(`
    SELECT count(*) 
    FROM product_standard_mappings psm 
    JOIN product_families pf ON pf.id = psm.product_family_id 
    WHERE pf.coverage_status = 'VERIFIED_PRIMARY' AND psm.relationship_type = 'primary_specification';
  `);
  console.log('Mappings where PF.coverage_status = VERIFIED_PRIMARY AND psm.relationship_type = primary_specification:', r3.rows[0].count);

  const r4 = await query(`
    SELECT pf.id, pf.canonical_name, pf.coverage_status, psm.relationship_type
    FROM product_families pf
    JOIN product_standard_mappings psm ON pf.id = psm.product_family_id
    WHERE psm.relationship_type = 'primary_specification' AND pf.coverage_status != 'VERIFIED_PRIMARY';
  `);
  console.log('Products with primary mapping but pf.coverage_status != VERIFIED_PRIMARY:');
  console.table(r4.rows);

  const r5 = await query(`
    SELECT pf.id, pf.canonical_name, pf.coverage_status, count(psm.id) as mapping_count
    FROM product_families pf
    LEFT JOIN product_standard_mappings psm ON pf.id = psm.product_family_id AND psm.relationship_type = 'primary_specification'
    WHERE pf.coverage_status = 'VERIFIED_PRIMARY' AND psm.id IS NULL
    GROUP BY pf.id, pf.canonical_name, pf.coverage_status;
  `);
  console.log('Products with pf.coverage_status = VERIFIED_PRIMARY but NO primary mapping:');
  console.table(r5.rows);

  // Check standards with is_primary_candidate
  const r6 = await query(`
    SELECT count(*) FROM standards WHERE is_primary_candidate = true;
  `);
  console.log('Standards with is_primary_candidate = true:', r6.rows[0].count);

  // Check distinct standards mapped as primary
  const r7 = await query(`
    SELECT count(DISTINCT standard_id) FROM product_standard_mappings WHERE relationship_type = 'primary_specification';
  `);
  console.log('Distinct standard_ids mapped as primary_specification:', r7.rows[0].count);

  await closePool();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
