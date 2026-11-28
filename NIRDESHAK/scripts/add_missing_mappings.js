const { query } = require('../database');

async function run() {
  console.log('Adding missing mappings...');

  // 1. Map Galvanized Mild Steel Tubes (GI Pipes, id 23) to IS 1239 (Part 1):2004 (id 14)
  await query(`
    INSERT INTO product_standard_mappings 
      (product_family_id, standard_id, relationship_type, applicability_explanation, mandatory_status, confidence_score)
    VALUES 
      (23, 14, 'primary_specification', 'IS 1239 (Part 1) specifies requirements for galvanized and black mild steel tubes for water, gas and steam lines.', 'MANDATORY_QCO', 1.000)
    ON CONFLICT (product_family_id, standard_id, relationship_type) DO NOTHING;
  `);
  console.log('Mapped PF-CED-GI-PIPES to IS 1239 (Part 1):2004');

  // Also add aliases for GI Pipes
  await query(`
    INSERT INTO product_aliases (product_family_id, alias_term, alias_type)
    VALUES 
      (23, 'galvanized mild steel tubes', 'synonym'),
      (23, 'mild steel tubes', 'synonym'),
      (23, 'GI tubes', 'synonym'),
      (23, 'galvanized steel pipe', 'synonym')
    ON CONFLICT (product_family_id, alias_term) DO NOTHING;
  `);

  // 2. Insert or find product family for Safety Footwear
  let fid = null;
  const famRes = await query("SELECT id FROM product_families WHERE family_code = 'PF-CHD-SAFETY-FOOTWEAR'");
  if (famRes.rows.length > 0) {
    fid = famRes.rows[0].id;
  } else {
    // Get sector for Chemical (CHD)
    const secRes = await query("SELECT id FROM product_sectors WHERE division_council_code = 'CHD'");
    const secId = secRes.rows[0]?.id || 2;

    const insRes = await query(`
      INSERT INTO product_families 
        (family_code, canonical_name, sector_id, division_council, subcategory, description, applications, coverage_status)
      VALUES 
        ('PF-CHD-SAFETY-FOOTWEAR', 'Industrial Safety Footwear and Protective Boots', $1, 'Chemical', 'Personal Protective Equipment', 
         'Footwear fitted with protective toecaps designed to provide protection against injury from impact when tested at minimum 200 J energy.',
         'Construction sites, manufacturing units, foundries, mining and warehousing facilities.', 'VERIFIED_STANDARDS')
      RETURNING id;
    `, [secId]);
    fid = insRes.rows[0].id;
    console.log('Created product family PF-CHD-SAFETY-FOOTWEAR with id', fid);
  }

  // Add aliases for Safety Footwear
  const footwearAliases = [
    { term: 'safety footwear', type: 'synonym' },
    { term: 'industrial safety footwear', type: 'synonym' },
    { term: 'safety shoes', type: 'synonym' },
    { term: 'safety boots', type: 'synonym' },
    { term: 'steel toe shoes', type: 'synonym' },
    { term: 'steel toe boots', type: 'synonym' },
    { term: 'protective footwear', type: 'synonym' }
  ];

  for (const fa of footwearAliases) {
    await query(`
      INSERT INTO product_aliases (product_family_id, alias_term, alias_type)
      VALUES ($1, $2, $3)
      ON CONFLICT (product_family_id, alias_term) DO NOTHING;
    `, [fid, fa.term, fa.type]);
  }

  // Link to IS 15298 (Part 2):2016 (id 4)
  await query(`
    INSERT INTO product_standard_mappings 
      (product_family_id, standard_id, relationship_type, applicability_explanation, mandatory_status, confidence_score)
    VALUES 
      ($1, 4, 'primary_specification', 'IS 15298 (Part 2) is the mandatory Indian Standard for industrial safety footwear with 200J toecap impact protection.', 'MANDATORY_QCO', 1.000)
    ON CONFLICT (product_family_id, standard_id, relationship_type) DO NOTHING;
  `, [fid]);
  console.log('Mapped PF-CHD-SAFETY-FOOTWEAR to IS 15298 (Part 2):2016');

  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
