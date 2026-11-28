const { query, closePool } = require('../database');

async function check() {
  const ids = [96, 302, 305, 339, 388, 790, 819, 1008, 1012, 1016, 1021, 1022, 1023, 1024, 432];
  for (const id of ids) {
    const res = await query(`
      SELECT psm.id, pf.canonical_name, s.is_number, psm.relationship_type 
      FROM product_standard_mappings psm 
      JOIN product_families pf ON psm.product_family_id = pf.id 
      JOIN standards s ON psm.standard_id = s.id 
      WHERE pf.id = $1
    `, [id]);
    console.log(`Product [${id}]: ` + (res.rows.length > 0 ? res.rows.map(r => `${r.is_number} (${r.relationship_type})`).join(', ') : 'NO MAPPINGS'));
  }
  await closePool();
}

check().catch(console.error);
