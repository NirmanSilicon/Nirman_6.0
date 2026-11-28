const { query, closePool } = require('../database');

async function select85Products() {
  const councilsRes = await query(`
    SELECT DISTINCT division_council 
    FROM product_families 
    ORDER BY division_council
  `);
  const councils = councilsRes.rows.map(r => r.division_council);

  const selectedList = [];

  for (const council of councils) {
    const res = await query(`
      SELECT pf.id, pf.canonical_name, pf.division_council, pf.subcategory,
             s.is_number, s.title as standard_title, psm.relationship_type
      FROM product_families pf
      JOIN product_standard_mappings psm ON pf.id = psm.product_family_id
      JOIN standards s ON psm.standard_id = s.id
      WHERE pf.division_council = $1
      ORDER BY 
        CASE WHEN psm.relationship_type = 'primary_specification' THEN 1 ELSE 2 END,
        pf.id
    `, [council]);

    // Group by product family id to get unique products with their standards
    const byProduct = new Map();
    for (const row of res.rows) {
      if (!byProduct.has(row.id)) {
        byProduct.set(row.id, {
          id: row.id,
          canonical_name: row.canonical_name,
          division_council: row.division_council,
          subcategory: row.subcategory,
          standards: []
        });
      }
      byProduct.get(row.id).standards.push({
        is_number: row.is_number,
        title: row.standard_title,
        rel: row.relationship_type
      });
    }

    const products = Array.from(byProduct.values());
    console.log(`Council: ${council} -> ${products.length} mapped products`);
  }

  await closePool();
}

select85Products().catch(err => {
  console.error(err);
  process.exit(1);
});
