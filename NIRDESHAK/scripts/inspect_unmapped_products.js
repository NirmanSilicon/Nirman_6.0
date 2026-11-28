const fs = require('fs');
const { query } = require('../database');

async function main() {
  const sample = await query(`SELECT * FROM product_families LIMIT 1`);
  console.log('product_families columns:', Object.keys(sample.rows[0]));
  const catSample = await query(`SELECT * FROM product_categories LIMIT 1`);
  console.log('product_categories columns:', Object.keys(catSample.rows[0]));

  const res = await query(`
    SELECT pf.id, pf.canonical_name, pf.family_code, pf.sector_id, ps.division_council_code, ps.name as sector_name, pc.category_name, pf.coverage_status
    FROM product_families pf
    JOIN product_sectors ps ON pf.sector_id = ps.id
    LEFT JOIN product_categories pc ON pf.category_id = pc.id
    WHERE pf.coverage_status = 'DISCOVERED_CATALOGUE_ONLY'
    ORDER BY ps.division_council_code, pf.canonical_name
  `);

  console.log('Total DISCOVERED_CATALOGUE_ONLY families:', res.rows.length);

  const byCouncil = {};
  for (const r of res.rows) {
    byCouncil[r.division_council_code] = (byCouncil[r.division_council_code] || 0) + 1;
  }
  console.log('Unmapped by Council:', byCouncil);

  // Write out full list to json for investigation
  fs.writeFileSync('scripts/unmapped_674_products.json', JSON.stringify(res.rows, null, 2));
  console.log('Saved to scripts/unmapped_674_products.json');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });


