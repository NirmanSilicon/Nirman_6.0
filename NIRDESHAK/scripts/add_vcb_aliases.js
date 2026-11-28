const { query } = require('../database');

async function run() {
  const r = await query("SELECT id FROM product_families WHERE family_code = 'PF-ETD-HV-CIRCUIT-BREAKER'");
  if (r.rows.length === 0) {
    console.error('Family not found');
    process.exit(1);
  }
  const fid = r.rows[0].id;
  const newAliases = [
    { term: 'vacuum circuit breaker', type: 'synonym' },
    { term: 'vacuum circuit breakers', type: 'synonym' },
    { term: 'indoor vacuum circuit breaker', type: 'synonym' },
    { term: '11kV vacuum circuit breaker', type: 'synonym' },
    { term: 'vacuum breaker', type: 'synonym' }
  ];

  for (const a of newAliases) {
    await query(
      `INSERT INTO product_aliases (product_family_id, alias_term, alias_type) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (product_family_id, alias_term) DO NOTHING`,
      [fid, a.term, a.type]
    );
  }
  console.log('VCB aliases added successfully');
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
