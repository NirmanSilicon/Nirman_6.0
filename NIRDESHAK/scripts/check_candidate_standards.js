const { query, closePool } = require('../database');

async function checkCandidates() {
  const stds = await query(`
    SELECT id, is_number, title, status, division_council, category
    FROM standards
    WHERE is_number ILIKE ANY(ARRAY[
      '%1884%', '%14257%', '%61439%6%', '%1948%', '%2742%', '%8415%', '%14940%', '%15139%', '%5423%', '%1135%', '%15633%', '%9436%', '%9438%'
    ])
    ORDER BY is_number;
  `);
  console.log('Matching standards in DB:');
  console.table(stds.rows);

  // Check product details for Product 306, 299, 727, 18
  const prods = await query(`
    SELECT id, canonical_name, division_council, subcategory, coverage_status
    FROM product_families
    WHERE id IN (306, 299, 727, 18);
  `);
  console.log('\nTarget products:');
  console.table(prods.rows);

  await closePool();
}

checkCandidates().catch(e => {
  console.error(e);
  process.exit(1);
});
