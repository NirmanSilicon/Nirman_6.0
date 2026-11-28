const { query } = require('../database');

async function auditMappings() {
  console.log('====================================================');
  console.log('4. PRODUCT-STANDARD MAPPING AUDIT (ALL 51 ROWS)');
  console.log('====================================================\n');

  const sql = `
    SELECT 
      psm.id AS mapping_id,
      pf.family_code,
      pf.canonical_name AS product_name,
      pf.division_council,
      s.id AS standard_id,
      s.is_number,
      s.title AS standard_title,
      s.status AS standard_status,
      psm.relationship_type,
      psm.mandatory_status,
      psm.confidence_score,
      psm.applicability_explanation,
      psm.evidence_source,
      psm.verification_status,
      ro.qco_name,
      ro.gazette_no,
      srl.is_mandatory AS statutory_mandatory
    FROM product_standard_mappings psm
    JOIN product_families pf ON psm.product_family_id = pf.id
    JOIN standards s ON psm.standard_id = s.id
    LEFT JOIN standard_regulatory_links srl ON s.id = srl.standard_id
    LEFT JOIN regulatory_orders ro ON srl.regulatory_order_id = ro.id
    ORDER BY psm.id ASC;
  `;

  const res = await query(sql);
  console.log(`Audited ${res.rows.length} product-standard mappings.\n`);

  let scopeMatches = 0;
  let qcoClaimsAccurate = 0;
  let historicalProperlyLabelled = 0;

  res.rows.forEach((row, idx) => {
    // Check mandatory claim accuracy
    const claimMandatory = row.mandatory_status === 'MANDATORY_QCO' || row.mandatory_status === 'mandatory';
    const hasGazette = row.gazette_no && row.gazette_no !== 'N/A';
    const qcoAccurate = (!claimMandatory) || (claimMandatory && hasGazette && row.statutory_mandatory);

    console.log(`[${idx + 1}/51] Mapping ID: ${row.mapping_id}`);
    console.log(`       Product:      [${row.family_code}] ${row.product_name} (${row.division_council})`);
    console.log(`       Standard:     [${row.is_number}] ${row.standard_title} (Status: ${row.standard_status})`);
    console.log(`       Rel Type:     ${row.relationship_type} | Conf: ${row.confidence_score} | Verified: ${row.verification_status}`);
    console.log(`       Mandatory:    Claim: ${row.mandatory_status} | Gazette: ${row.gazette_no || 'None'} | Accurate: ${qcoAccurate}`);
    console.log(`       Explanation:  ${row.applicability_explanation}`);
    console.log(`       Source:       ${row.evidence_source}`);
    console.log('----------------------------------------------------');
  });

  process.exit(0);
}

auditMappings().catch(err => {
  console.error(err);
  process.exit(1);
});
