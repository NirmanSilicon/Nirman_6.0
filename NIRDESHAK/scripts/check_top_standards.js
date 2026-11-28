const { query, closePool } = require('../database');

async function checkBulkStandards() {
  const sList = await query(`
    SELECT s.is_number, count(psm.id) as mapping_count
    FROM standards s
    JOIN product_standard_mappings psm ON s.id = psm.standard_id
    GROUP BY s.is_number
    ORDER BY mapping_count DESC
    LIMIT 20
  `);
  console.log('Top 20 most mapped standards:');
  console.table(sList.rows);

  const res = await query(`
    SELECT psm.id, pf.id as p_id, pf.canonical_name, pf.division_council, s.is_number, s.title, psm.relationship_type
    FROM product_standard_mappings psm
    JOIN product_families pf ON psm.product_family_id = pf.id
    JOIN standards s ON psm.standard_id = s.id
    WHERE s.is_number IN ('IS 2553 (Part 2):2019', 'IS 14846:2000', 'IS 10258:2002', 'IS 13450 (Part 1):2018')
    ORDER BY s.is_number, pf.id
  `);
  console.log(`\nDetailed mappings for key scrutinized standards (${res.rows.length} total):`);
  res.rows.forEach(r => {
    console.log(`[${r.is_number}] -> Product [${r.p_id}] "${r.canonical_name}" (${r.division_council}) [Rel: ${r.relationship_type}]`);
  });

  await closePool();
}

checkBulkStandards().catch(console.error);
