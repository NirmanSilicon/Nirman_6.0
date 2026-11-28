const { query, closePool } = require('../database');

async function auditAllRemainingMappings() {
  const mappings = await query(`
    SELECT psm.id, pf.id as p_id, pf.canonical_name, pf.division_council as p_council, pf.subcategory,
           s.id as s_id, s.is_number, s.title, s.division_council as s_council, psm.relationship_type,
           psm.applicability_explanation
    FROM product_standard_mappings psm
    JOIN product_families pf ON psm.product_family_id = pf.id
    JOIN standards s ON psm.standard_id = s.id
    ORDER BY psm.id
  `);

  console.log(`Auditing all ${mappings.rows.length} mappings...`);
  const flagged = [];

  for (const m of mappings.rows) {
    const pName = m.canonical_name.toLowerCase();
    const sTitle = m.title.toLowerCase();
    const isNum = m.is_number;

    // Rule 1: Safety glass on non-glass products
    if (isNum.includes('2553') && !pName.includes('glass') && !pName.includes('glazing') && !pName.includes('windscreen') && !pName.includes('window')) {
      flagged.push({ m, rule: 'road_safety_glass_mismatch', reason: `Safety Glass assigned to non-glass: ${m.canonical_name}` });
    }

    // Rule 2: Sluice valve on non-valve / non-fluid-handling products
    if (isNum.includes('14846') && !pName.includes('valve') && !pName.includes('water') && !pName.includes('irrigation') && !pName.includes('pipeline') && !pName.includes('gate')) {
      flagged.push({ m, rule: 'sluice_valve_mismatch', reason: `Sluice valve assigned to non-valve: ${m.canonical_name}` });
    }

    // Rule 3: Syringes
    if (isNum.includes('10258') && !pName.includes('syringe') && !pName.includes('hypodermic') && !pName.includes('injection')) {
      flagged.push({ m, rule: 'syringe_mismatch', reason: `Hypodermic syringe assigned to non-syringe: ${m.canonical_name}` });
    }

    // Rule 4: Cleanroom apparel fabric (IS 16890)
    if (isNum.includes('16890') && !pName.includes('cleanroom') && !pName.includes('apparel') && !pName.includes('garment') && !pName.includes('fabric')) {
      flagged.push({ m, rule: 'cleanroom_mismatch', reason: `Cleanroom fabric assigned to non-fabric: ${m.canonical_name}` });
    }

    // Rule 5: Thermal underwear (IS 16738)
    if (isNum.includes('16738') && !pName.includes('underwear') && !pName.includes('thermal') && !pName.includes('innerwear')) {
      flagged.push({ m, rule: 'underwear_mismatch', reason: `Underwear assigned to non-apparel: ${m.canonical_name}` });
    }

    // Rule 6: Medical electrical equipment (IS 13450) on non-medical / non-hospital products
    if (isNum.includes('13450') && m.p_council !== 'Medical Equipment and Hospital Planning' && !pName.includes('medical') && !pName.includes('hospital') && !pName.includes('patient') && !pName.includes('ecg') && !pName.includes('ventilator') && !pName.includes('x-ray') && !pName.includes('ultrasound') && !pName.includes('defibrillator') && !pName.includes('dialysis') && !pName.includes('infant')) {
      flagged.push({ m, rule: 'medical_electrical_mismatch', reason: `Medical electrical standard assigned to non-medical: ${m.canonical_name} (${m.p_council})` });
    }

    // Rule 7: Concrete standard (IS 456) on non-civil products (unless structural civil foundations)
    if (isNum === 'IS 456:2000' && m.p_council !== 'Civil Engineering' && !pName.includes('foundation') && !pName.includes('civil') && !pName.includes('structural') && !pName.includes('building') && !pName.includes('tower') && !pName.includes('substation')) {
      flagged.push({ m, rule: 'concrete_code_mismatch', reason: `IS 456 concrete code assigned to non-civil product: ${m.canonical_name} (${m.p_council})` });
    }
  }

  console.log(`\nFlagged ${flagged.length} discrepancies:`);
  flagged.forEach(f => {
    console.log(`[Mapping ID: ${f.m.id}] Rule: ${f.rule} | Product: [${f.m.p_id}] "${f.m.canonical_name}" (${f.m.p_council}) -> Standard: ${f.m.is_number} "${f.m.title}"`);
  });

  await closePool();
}

auditAllRemainingMappings().catch(console.error);
