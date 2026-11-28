const { query, closePool } = require('../database');

async function checkTrueOrphans() {
  const invalid1893ProductIds = [13, 129, 310, 365, 617, 618, 1040];
  
  const res = await query(`
    WITH product_all_maps AS (
      SELECT 
        pf.id,
        pf.canonical_name,
        count(psm.id) as total_mappings,
        count(CASE WHEN s.is_number = 'IS 15988:2013' OR (s.is_number = 'IS 1893 (Part 1):2016' AND pf.id = ANY($1::int[])) THEN 1 END) as to_remove,
        string_agg(s.is_number, '; ') as all_standards
      FROM product_families pf
      JOIN product_standard_mappings psm ON pf.id = psm.product_family_id
      JOIN standards s ON psm.standard_id = s.id
      GROUP BY pf.id, pf.canonical_name
    )
    SELECT *, (total_mappings - to_remove) as remaining_mappings
    FROM product_all_maps
    WHERE to_remove > 0
    ORDER BY (total_mappings - to_remove) ASC, id ASC;
  `, [invalid1893ProductIds]);

  console.table(res.rows.map(r => ({
    id: r.id,
    name: r.canonical_name,
    total: r.total_mappings,
    to_remove: r.to_remove,
    remaining: r.remaining_mappings,
    standards: r.all_standards
  })));

  const zeroRemaining = res.rows.filter(r => parseInt(r.remaining_mappings, 10) === 0);
  console.log(`\nProducts that would be left with 0 mappings: ${zeroRemaining.length}`);
  if (zeroRemaining.length > 0) {
    console.table(zeroRemaining);
  }

  await closePool();
}

checkTrueOrphans().catch(e => {
  console.error(e);
  process.exit(1);
});
