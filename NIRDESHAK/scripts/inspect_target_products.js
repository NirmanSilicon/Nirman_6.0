const { query, closePool } = require('../database');

async function inspectCandidates() {
  const targets = [
    { name: 'Industrial Safety Glasses', regex: /safety glass|eye/i },
    { name: 'Industrial Safety Helmets', regex: /helmet/i },
    { name: 'Sterile Hypodermic Syringes', regex: /syringe/i },
    { name: 'Electrical Cables', regex: /pvc.*cable|wire/i },
    { name: 'Transformers', regex: /transformer/i },
    { name: 'Cement', regex: /cement/i },
    { name: 'Steel Reinforcement Bars', regex: /reinforcement|tmt|steel bar/i },
    { name: 'Water Pumps', regex: /submersible pump|centrifugal pump|monobloc/i },
    { name: 'Medical Equipment', regex: /ventilator|ecg|sphygmomanometer|dialysis/i },
    { name: 'Agricultural Machinery', regex: /tractor|rotavator|power tiller|thresher/i },
    { name: 'Textile Products', regex: /cotton|jute|polyester|geotextile|tarpaulin/i },
    { name: 'Industrial Valves', regex: /sluice valve|gate valve|ball valve|butterfly valve/i },
    { name: 'Solar Panels', regex: /photovoltaic|pv module|solar/i },
    { name: 'Road Transport Safety Glass', regex: /safety glass.*road|automotive glass/i },
    { name: 'Chemical Products', regex: /caustic soda|sulphuric acid|pvc resin|bleaching/i }
  ];

  for (const t of targets) {
    const res = await query(`
      SELECT pf.id, pf.canonical_name, pf.division_council, s.is_number, s.title, psm.relationship_type
      FROM product_families pf
      JOIN product_standard_mappings psm ON pf.id = psm.product_family_id
      JOIN standards s ON psm.standard_id = s.id
      WHERE pf.canonical_name ~* $1 OR s.title ~* $1
      LIMIT 3
    `, [t.regex.source]);
    console.log(`=== Target: ${t.name} ===`);
    res.rows.forEach(r => {
      console.log(`   Product: [${r.id}] ${r.canonical_name} (${r.division_council}) -> ${r.is_number} (${r.relationship_type}): ${r.title.substring(0, 60)}`);
    });
  }

  await closePool();
}

inspectCandidates().catch(console.error);
