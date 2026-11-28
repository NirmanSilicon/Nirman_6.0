const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function deepAudit() {
  console.log('Starting Deep Technical Relevance Audit of all 1,201 Mappings...\n');

  const res = await pool.query(`
    SELECT psm.id as mapping_id,
           pf.id as product_id, pf.canonical_name as product_name, pf.division_council as product_council,
           pf.subcategory as product_subcategory, pf.technical_keywords as product_keywords,
           s.id as standard_id, s.is_number, s.title as standard_title, s.division_council as standard_council,
           s.category as standard_category, s.scope as standard_scope,
           psm.relationship_type, psm.mandatory_status, psm.evidence_source, psm.applicability_explanation,
           psm.confidence_score, psm.verification_status, psm.source_url, psm.evidence_excerpt
    FROM product_standard_mappings psm
    JOIN product_families pf ON psm.product_family_id = pf.id
    JOIN standards s ON psm.standard_id = s.id
    ORDER BY psm.id ASC;
  `);

  const mappings = res.rows;
  console.log(`Auditing ${mappings.length} mappings...`);

  // Count by standard
  const standardStats = {};
  mappings.forEach(m => {
    if (!standardStats[m.is_number]) {
      standardStats[m.is_number] = {
        id: m.standard_id,
        title: m.standard_title,
        council: m.standard_council,
        mappings: []
      };
    }
    standardStats[m.is_number].mappings.push(m);
  });

  console.log(`Unique standards mapped: ${Object.keys(standardStats).length}`);

  // Inspect each mapping for technical validity
  // A mapping is INVALID_UNRELATED_MAPPING if:
  // 1. The standard is completely unrelated to the product and has no plausible technical, material, test, or safety connection.
  // Example: IS 10258 (Hypodermic Syringes) mapped to Automotive products (tyres, helmets, brake pads, seat belts, EV motors).
  // Example: IS 13450 (Medical Electrical Equipment) mapped to Aluminium Doors/Windows or other non-medical civil products.

  const invalidMappings = [];
  const candidateMappings = [];
  const verifiedPrimary = [];
  const verifiedNormative = [];
  const verifiedTest = [];
  const verifiedMaterial = [];
  const verifiedSafety = [];
  const verifiedInstallation = [];
  const verifiedSupporting = [];
  const historicalSuperseded = [];

  mappings.forEach(m => {
    const pName = (m.product_name || '').toLowerCase();
    const pCouncil = (m.product_council || '').toLowerCase();
    const sTitle = (m.standard_title || '').toLowerCase();
    const sCouncil = (m.standard_council || '').toLowerCase();
    const sScope = (m.standard_scope || '').toLowerCase();
    const sNumber = m.is_number;

    let verdict = 'VALID';
    let classification = m.relationship_type || 'supporting_reference';
    let invalidReason = null;

    // Check 1: Syringes (IS 10258) mapped to non-medical products
    if (sNumber.includes('10258') && !pName.includes('syringe') && !pName.includes('medical') && !pName.includes('needle') && !pName.includes('injection')) {
      verdict = 'INVALID';
      classification = 'INVALID_UNRELATED_MAPPING';
      invalidReason = `Standard IS 10258:2002 specifies sterile hypodermic syringes for single use. It has zero technical, material, or safety applicability to ${m.product_name}.`;
    }

    // Check 2: Medical Electrical Equipment (IS 13450) mapped to non-medical non-electrical civil/structural products
    if (sNumber.includes('13450') && (pName.includes('door') || pName.includes('window') || pName.includes('ventilator') || pCouncil.includes('civil') || pCouncil.includes('metallurgical')) && !pName.includes('hospital') && !pName.includes('medical')) {
      verdict = 'INVALID';
      classification = 'INVALID_UNRELATED_MAPPING';
      invalidReason = `Standard IS 13450 (Part 1):2018 specifies general requirements for basic safety and essential performance of Medical Electrical Equipment. It does not apply to ${m.product_name}.`;
    }

    // Check 3: Audio/Video/Similar Electronic Equipment (IS 616) mapped to non-electronic products
    if (sNumber.includes('616') && (pCouncil.includes('food') || pCouncil.includes('textile') || pCouncil.includes('civil')) && !pName.includes('electronic') && !pName.includes('audio') && !pName.includes('video') && !pName.includes('display')) {
      verdict = 'INVALID';
      classification = 'INVALID_UNRELATED_MAPPING';
      invalidReason = `Standard IS 616 specifies audio/video electronic safety. It does not apply to ${m.product_name}.`;
    }

    // Check 4: Concrete Mix Proportioning (IS 10262) or Concrete Testing (IS 516) mapped to non-concrete / non-civil products
    if ((sNumber.includes('10262') || sNumber.includes('516')) && !pCouncil.includes('civil') && !pName.includes('concrete') && !pName.includes('cement') && !pName.includes('mortar') && !pName.includes('aggregate')) {
      verdict = 'INVALID';
      classification = 'INVALID_UNRELATED_MAPPING';
      invalidReason = `Concrete standards (IS 10262 / IS 516) do not apply to ${m.product_name}.`;
    }

    // Check 5: Good Agricultural and Collection Practices for AYUSH (IS 16503) mapped to non-AYUSH/non-herbal products
    if (sNumber.includes('16503') && !pCouncil.includes('ayush') && !pName.includes('herbal') && !pName.includes('ayush') && !pName.includes('medicinal plant')) {
      verdict = 'INVALID';
      classification = 'INVALID_UNRELATED_MAPPING';
      invalidReason = `AYUSH GACP standard IS 16503 does not apply to non-AYUSH product ${m.product_name}.`;
    }

    // Check 6: Seismic evaluation (IS 15988) or earthquake design (IS 1893) mapped to small non-structural components
    if ((sNumber.includes('15988') || sNumber.includes('1893')) && (pCouncil.includes('textile') || pCouncil.includes('food') || pCouncil.includes('chemical') || pCouncil.includes('ayush'))) {
      verdict = 'INVALID';
      classification = 'INVALID_UNRELATED_MAPPING';
      invalidReason = `Seismic building code does not apply to ${m.product_name}.`;
    }

    if (verdict === 'INVALID') {
      invalidMappings.push({ mapping: m, reason: invalidReason });
    }
  });

  console.log(`\nIdentified ${invalidMappings.length} definitively invalid/unrelated mappings.`);
  console.log('Breakdown of invalid mappings by standard:');
  const invByStd = {};
  invalidMappings.forEach(inv => {
    const num = inv.mapping.is_number;
    invByStd[num] = (invByStd[num] || 0) + 1;
  });
  console.table(invByStd);

  await pool.end();
}

deepAudit().catch(console.error);
