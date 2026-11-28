const { query, closePool } = require('../database');
const { isConclusivelyInvalid } = require('../runtimeRelevanceValidator');

async function findMoreAnomalies() {
  const res = await query(`
    SELECT psm.id as mapping_id, pf.id as product_id, pf.canonical_name, pf.division_council as product_council,
           pf.subcategory, s.id as standard_id, s.is_number, s.title as standard_title,
           s.division_council as standard_council, psm.relationship_type, psm.applicability_explanation
    FROM product_standard_mappings psm
    JOIN product_families pf ON psm.product_family_id = pf.id
    JOIN standards s ON psm.standard_id = s.id
    ORDER BY psm.id
  `);

  console.log(`Inspecting ${res.rows.length} current mappings...`);
  const suspicious = [];

  for (const row of res.rows) {
    const invalidCheck = isConclusivelyInvalid(
      row.canonical_name,
      row.product_council,
      row.is_number,
      row.standard_title,
      row.standard_council
    );

    if (invalidCheck.isInvalid) {
      suspicious.push({ ...row, reason: invalidCheck.reason, rule: 'validator_rule' });
      continue;
    }

    // Additional cross-domain heuristic checks:
    const pName = row.canonical_name.toLowerCase();
    const sTitle = row.standard_title.toLowerCase();
    const isNum = row.is_number;

    // Tyres having Safety Glass:
    if (pName.includes('tyre') && sTitle.includes('safety glass')) {
      suspicious.push({ ...row, reason: 'Tyre mapped to safety glass', rule: 'tyre_glass_mismatch' });
    }

    // Food having valves or machinery:
    if ((pName.includes('noodle') || pName.includes('pasta') || pName.includes('biscuit') || pName.includes('tea') || pName.includes('coffee') || pName.includes('rice') || pName.includes('flour') || pName.includes('cereal') || pName.includes('milk') || pName.includes('ghee')) &&
        (sTitle.includes('valve') || sTitle.includes('pump') || sTitle.includes('crane') || sTitle.includes('cable') || sTitle.includes('motor') || sTitle.includes('transformer'))) {
      suspicious.push({ ...row, reason: 'Food product mapped to industrial equipment/valve', rule: 'food_vs_industrial_mech' });
    }

    // Apparel/footwear having industrial machinery:
    if ((pName.includes('shirt') || pName.includes('saree') || pName.includes('underwear') || pName.includes('trouser')) &&
        (sTitle.includes('valve') || sTitle.includes('transformer') || sTitle.includes('pump') || sTitle.includes('switchgear'))) {
      suspicious.push({ ...row, reason: 'Apparel mapped to heavy equipment', rule: 'apparel_vs_heavy_equipment' });
    }

    // Glass for road transport mapped to non-transport / non-automotive:
    if (isNum.includes('2553 (Part 2)') && !pName.includes('glass') && !pName.includes('glazing') && !pName.includes('vehicle') && !pName.includes('automotive') && !pName.includes('windscreen') && !pName.includes('car ') && !pName.includes('bus') && !pName.includes('truck')) {
      suspicious.push({ ...row, reason: 'Road transport glass mapped to non-vehicle product', rule: 'road_glass_non_vehicle' });
    }
  }

  console.log(`Found ${suspicious.length} suspicious or invalid mappings:`);
  for (const s of suspicious) {
    console.log(`Mapping ID: ${s.mapping_id} | Product: [${s.product_id}] "${s.canonical_name}" (${s.product_council}) -> Standard: ${s.is_number} "${s.standard_title}" [Rel: ${s.relationship_type}] | Rule: ${s.rule} | Reason: ${s.reason}`);
  }

  await closePool();
}

findMoreAnomalies().catch(console.error);
