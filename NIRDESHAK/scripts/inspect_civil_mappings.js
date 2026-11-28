const { query, closePool } = require('../database');

async function inspectCivilMappings() {
  const targetStandards = [
    'IS 15988:2013',
    'IS 1893 (Part 1):2016',
    'IS 456:2000',
    'IS 10262:2019',
    'IS 516 (Part 1/Sec 1):2021'
  ];

  const res = await query(`
    SELECT 
      psm.id as mapping_id,
      s.is_number,
      s.title as standard_title,
      pf.id as product_id,
      pf.canonical_name as product_name,
      psm.relationship_type,
      psm.verification_status
    FROM product_standard_mappings psm
    JOIN standards s ON psm.standard_id = s.id
    JOIN product_families pf ON psm.product_family_id = pf.id
    WHERE s.is_number = ANY($1::text[])
    ORDER BY s.is_number ASC, pf.id ASC;
  `, [targetStandards]);

  console.log(`Found ${res.rows.length} mappings for the 5 standards:`);
  
  const byStd = {};
  for (const r of res.rows) {
    if (!byStd[r.is_number]) byStd[r.is_number] = [];
    byStd[r.is_number].push(r);
  }

  for (const [isNum, rows] of Object.entries(byStd)) {
    console.log(`\n=== ${isNum} (${rows.length} mappings) ===`);
    rows.forEach(r => console.log(`  [Map ${r.mapping_id}] Prod ${r.product_id}: "${r.product_name}" -> ${r.relationship_type}`));
  }

  await closePool();
}

inspectCivilMappings().catch(e => {
  console.error(e);
  process.exit(1);
});
