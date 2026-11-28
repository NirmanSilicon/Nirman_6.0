const { query, closePool } = require('../database');

async function checkAutomotive() {
  const ids = [96, 302, 1016, 1022, 1023];
  for (const id of ids) {
    const res = await query(`
      SELECT psm.id, pf.canonical_name, s.is_number, s.title, psm.relationship_type
      FROM product_standard_mappings psm
      JOIN product_families pf ON psm.product_family_id = pf.id
      JOIN standards s ON psm.standard_id = s.id
      WHERE pf.id = $1
    `, [id]);
    console.log(`Product [${id}]:`);
    res.rows.forEach(r => console.log(`  Mapping ${r.id}: ${r.is_number} (${r.relationship_type}) - ${r.title.substring(0, 50)}`));
  }
  await closePool();
}

checkAutomotive().catch(console.error);
