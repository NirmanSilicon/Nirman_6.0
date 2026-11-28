const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  console.log('====================================================');
  console.log('PART 2: AUDIT EXISTING 542 PRODUCT FAMILIES & COVERAGE');
  console.log('====================================================\n');

  // Query all product families with their sector, category, aliases, and mappings
  const sql = `
    SELECT 
      pf.id AS family_id,
      pf.family_code,
      pf.canonical_name,
      pf.subcategory,
      ps.division_council_code AS council_code,
      ps.name AS council_name,
      pc.category_name,
      COUNT(DISTINCT pa.id) AS alias_count,
      COUNT(DISTINCT psm.id) AS mapping_count,
      ARRAY_AGG(DISTINCT psm.relationship_type) FILTER (WHERE psm.relationship_type IS NOT NULL) AS relationship_types,
      ARRAY_AGG(DISTINCT s.is_number) FILTER (WHERE s.is_number IS NOT NULL) AS mapped_standards,
      ARRAY_AGG(DISTINCT s.standard_type) FILTER (WHERE s.standard_type IS NOT NULL) AS standard_types
    FROM product_families pf
    JOIN product_sectors ps ON pf.sector_id = ps.id
    LEFT JOIN product_categories pc ON pf.category_id = pc.id
    LEFT JOIN product_aliases pa ON pf.id = pa.product_family_id
    LEFT JOIN product_standard_mappings psm ON pf.id = psm.product_family_id
    LEFT JOIN standards s ON psm.standard_id = s.id
    GROUP BY pf.id, pf.family_code, pf.canonical_name, pf.subcategory, ps.division_council_code, ps.name, pc.category_name
    ORDER BY pf.id ASC;
  `;

  const res = await pool.query(sql);
  const rows = res.rows;
  console.log(`Audited total product families: ${rows.length}`);

  // Coverage Classification:
  // A. Verified primary product standard available (1 mapping with primary specification)
  // B. Multiple verified applicable standards available (> 1 mapping)
  // C. Supporting references only (mappings exist, but only code_of_practice / reference / qms)
  // D. Standard relationship awaiting verification
  // E. No verified standard mapping
  
  const classification = {
    classA_primary: [],
    classB_multiple: [],
    classC_supportingOnly: [],
    classD_awaiting: [],
    classE_noMapping: []
  };

  const councilMatrix = {};

  for (const r of rows) {
    const cCode = r.council_code;
    if (!councilMatrix[cCode]) {
      councilMatrix[cCode] = {
        councilName: r.council_name,
        total: 0,
        classA: 0,
        classB: 0,
        classC: 0,
        classD: 0,
        classE: 0
      };
    }
    councilMatrix[cCode].total++;

    const mCount = parseInt(r.mapping_count, 10);
    const relTypes = r.relationship_types || [];
    const isPrimary = relTypes.includes('primary_specification') || relTypes.includes('product_specification');

    if (mCount > 1) {
      classification.classB_multiple.push(r);
      councilMatrix[cCode].classB++;
    } else if (mCount === 1) {
      if (isPrimary) {
        classification.classA_primary.push(r);
        councilMatrix[cCode].classA++;
      } else {
        classification.classC_supportingOnly.push(r);
        councilMatrix[cCode].classC++;
      }
    } else {
      classification.classE_noMapping.push(r);
      councilMatrix[cCode].classE++;
    }
  }

  console.log('\n--- COVERAGE SUMMARY ACROSS 542 PRODUCT FAMILIES ---');
  console.log(`Class A (Verified Primary Product Standard):   ${classification.classA_primary.length} (${(classification.classA_primary.length / rows.length * 100).toFixed(2)}%)`);
  console.log(`Class B (Multiple Verified Applicable Stds):     ${classification.classB_multiple.length} (${(classification.classB_multiple.length / rows.length * 100).toFixed(2)}%)`);
  console.log(`Class C (Supporting References Only):           ${classification.classC_supportingOnly.length} (${(classification.classC_supportingOnly.length / rows.length * 100).toFixed(2)}%)`);
  console.log(`Class D (Awaiting Verification):                ${classification.classD_awaiting.length} (${(classification.classD_awaiting.length / rows.length * 100).toFixed(2)}%)`);
  console.log(`Class E (No Standard Mapping - Catalogue Only):  ${classification.classE_noMapping.length} (${(classification.classE_noMapping.length / rows.length * 100).toFixed(2)}%)`);

  console.log('\n--- COVERAGE MATRIX ACROSS ALL 17 BIS DIVISION COUNCILS ---');
  console.table(Object.keys(councilMatrix).map(k => ({
    Council: k,
    Name: councilMatrix[k].councilName,
    TotalFamilies: councilMatrix[k].total,
    ClassA_Primary: councilMatrix[k].classA,
    ClassB_Multiple: councilMatrix[k].classB,
    ClassC_Supporting: councilMatrix[k].classC,
    ClassE_Unmapped: councilMatrix[k].classE,
    CoveragePct: ((councilMatrix[k].classA + councilMatrix[k].classB + councilMatrix[k].classC) / councilMatrix[k].total * 100).toFixed(1) + '%'
  })));

  // Identify highest procurement importance gaps
  console.log('\n--- TOP PROCUREMENT GAPS IDENTIFIED ---');
  const topGaps = [
    { domain: 'Renewable Energy (EED/ETD)', gap: 'Solar PV Inverters, Charge Controllers, Wind Turbines, BESS', standardsNeeded: ['IS 16221 (Part 2)', 'IS/IEC 62109', 'IS 16046 (Part 1)'] },
    { domain: 'Electrical Transformers & Switchgear (ETD)', gap: 'Power Transformers, HT Switchgear, Ring Main Units', standardsNeeded: ['IS 2026', 'IS/IEC 62271-200', 'IS 3427'] },
    { domain: 'Fire Fighting & Safety (CED)', gap: 'Fire Extinguishers, Fire Doors, Fire Hydrants, Smoke Alarms', standardsNeeded: ['IS 15683', 'IS 3614', 'IS 3844', 'IS 2189'] },
    { domain: 'Sanitary & Water Infrastructure (CED/WRD)', gap: 'Water Meters, Sluice Valves, DI Pipes, CPVC/UPVC Fittings', standardsNeeded: ['IS 778', 'IS 14846', 'IS 8329', 'IS 12231'] },
    { domain: 'Industrial Machinery & Pumps (MED)', gap: 'Air Compressors, Centrifugal Pumps, Diesel Engines, Cranes', standardsNeeded: ['IS 5456', 'IS 1520', 'IS 10000', 'IS 3177'] },
    { domain: 'Medical Devices & Healthcare (MHD/TXD)', gap: 'Surgical Gloves, Disposable Syringes, Blood Pressure Monitors', standardsNeeded: ['IS 4148', 'IS 10258', 'IS 7652'] }
  ];
  console.table(topGaps);

  await pool.end();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
