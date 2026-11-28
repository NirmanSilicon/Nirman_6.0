const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function analyzeAllMappings() {
  console.log('--- Auditing All 1,201 Mappings in Detail ---\n');

  const mappings = await pool.query(`
    SELECT psm.id as mapping_id,
           pf.id as product_id, pf.canonical_name as product_name, pf.division_council as product_council, pf.subcategory as product_subcategory,
           s.id as standard_id, s.is_number, s.title as standard_title, s.division_council as standard_council, s.category as standard_category, s.scope as standard_scope,
           psm.relationship_type, psm.mandatory_status, psm.evidence_source, psm.applicability_explanation, psm.confidence_score, psm.verification_status
    FROM product_standard_mappings psm
    JOIN product_families pf ON psm.product_family_id = pf.id
    JOIN standards s ON psm.standard_id = s.id
    ORDER BY psm.id ASC;
  `);

  console.log(`Total mappings retrieved: ${mappings.rows.length}`);

  // 1. Group by Standard and count occurrences
  const stdMapCount = {};
  mappings.rows.forEach(m => {
    stdMapCount[m.is_number] = (stdMapCount[m.is_number] || 0) + 1;
  });

  const sortedStdCounts = Object.entries(stdMapCount).sort((a, b) => b[1] - a[1]);
  console.log('\nTop 15 Most Mapped Standards:');
  sortedStdCounts.slice(0, 15).forEach(([num, cnt]) => {
    const sample = mappings.rows.find(m => m.is_number === num);
    console.log(`  ${num} (${cnt} mappings) [${sample.standard_council}]: "${sample.standard_title.substring(0, 50)}..."`);
  });

  // 2. Identify obvious cross-domain anomalies
  console.log('\n--- Checking Major Cross-Domain Inconsistencies ---');
  const anomalies = [];
  mappings.rows.forEach(m => {
    const pCouncil = (m.product_council || '').toLowerCase();
    const sCouncil = (m.standard_council || '').toLowerCase();
    const sTitle = m.standard_title.toLowerCase();
    const pName = m.product_name.toLowerCase();

    let isSuspicious = false;
    let reason = '';

    // Check IS 10258 (Syringes) mapped to non-medical products
    if (m.is_number.includes('10258') && !pName.includes('syringe') && !pName.includes('medical') && !pName.includes('needle')) {
      isSuspicious = true;
      reason = 'Sterile Hypodermic Syringes mapped to non-medical product';
    }

    // Medical standards (MHD) mapped to automotive/civil/metallurgical/electrical
    if (sCouncil.includes('medical') && (pCouncil.includes('transport') || pCouncil.includes('metallurgical') || pCouncil.includes('civil') || pCouncil.includes('electrotechnical'))) {
      if (!pName.includes('medical') && !pName.includes('hospital') && !pName.includes('health') && !pName.includes('steril')) {
        isSuspicious = true;
        reason = `Medical standard [${m.is_number}] mapped to ${m.product_council} product`;
      }
    }

    // Transport standards mapped to medical/civil/chemical
    if (sCouncil.includes('transport') && (pCouncil.includes('medical') || pCouncil.includes('ayush') || pCouncil.includes('food'))) {
      isSuspicious = true;
      reason = `Transport standard [${m.is_number}] mapped to ${m.product_council} product`;
    }

    // Food standards mapped to electrotechnical/metallurgical/transport
    if (sCouncil.includes('food') && (pCouncil.includes('electrotechnical') || pCouncil.includes('transport') || pCouncil.includes('metallurgical'))) {
      if (!pName.includes('food') && !pName.includes('water') && !pName.includes('grain') && !pName.includes('beverage')) {
        isSuspicious = true;
        reason = `Food standard [${m.is_number}] mapped to ${m.product_council} product`;
      }
    }

    if (isSuspicious) {
      anomalies.push({
        mapping_id: m.mapping_id,
        product_id: m.product_id,
        product_name: m.product_name,
        product_council: m.product_council,
        is_number: m.is_number,
        standard_title: m.standard_title,
        standard_council: m.standard_council,
        relationship_type: m.relationship_type,
        explanation: m.applicability_explanation,
        reason: reason
      });
    }
  });

  console.log(`Found ${anomalies.length} suspicious mappings!`);
  console.log('\nSample suspicious mappings:');
  anomalies.slice(0, 10).forEach(a => {
    console.log(`  Mapping #${a.mapping_id}: Product "${a.product_name}" (${a.product_council}) -> Standard ${a.is_number} "${a.standard_title.substring(0, 40)}" (${a.standard_council}) | Reason: ${a.reason}`);
  });

  await pool.end();
}

analyzeAllMappings().catch(console.error);
