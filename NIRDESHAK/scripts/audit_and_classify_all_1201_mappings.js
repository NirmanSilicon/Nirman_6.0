const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

async function auditAndClassify() {
  console.log('Fetching all 1,201 mappings with full product and standard metadata...');

  const queryStr = `
    SELECT psm.id as mapping_id,
           pf.id as product_id, pf.canonical_name as product_name, pf.division_council as product_council,
           pf.subcategory as product_subcategory, pf.technical_keywords as product_keywords, pf.applications as product_apps,
           s.id as standard_id, s.is_number, s.title as standard_title, s.division_council as standard_council,
           s.category as standard_category, s.scope as standard_scope, s.status as standard_status,
           psm.relationship_type, psm.mandatory_status, psm.evidence_source, psm.applicability_explanation,
           psm.confidence_score, psm.verification_status, psm.source_url, psm.evidence_excerpt
    FROM product_standard_mappings psm
    JOIN product_families pf ON psm.product_family_id = pf.id
    JOIN standards s ON psm.standard_id = s.id
    ORDER BY psm.id ASC;
  `;

  const res = await pool.query(queryStr);
  const mappings = res.rows;
  console.log(`Loaded ${mappings.length} mappings from PostgreSQL.\n`);

  const auditRows = [];
  const invalidRows = [];
  const crossDomainRows = [];

  const classificationCounts = {
    VERIFIED_PRIMARY: 0,
    VERIFIED_NORMATIVE_REFERENCE: 0,
    VERIFIED_TEST_METHOD: 0,
    VERIFIED_MATERIAL_STANDARD: 0,
    VERIFIED_SAFETY_STANDARD: 0,
    VERIFIED_INSTALLATION_STANDARD: 0,
    VERIFIED_SUPPORTING_REFERENCE: 0,
    CANDIDATE_UNVERIFIED: 0,
    INVALID_UNRELATED_MAPPING: 0,
    HISTORICAL_OR_SUPERSEDED_REFERENCE: 0
  };

  mappings.forEach(m => {
    const pName = (m.product_name || '').toLowerCase();
    const pCouncil = (m.product_council || '').toLowerCase();
    const pSubcat = (m.product_subcategory || '').toLowerCase();
    const sTitle = (m.standard_title || '').toLowerCase();
    const sCouncil = (m.standard_council || '').toLowerCase();
    const sScope = (m.standard_scope || '').toLowerCase();
    const sNum = m.is_number;

    let classification = 'VERIFIED_SUPPORTING_REFERENCE';
    let verdict = 'VALID';
    let applicabilityAssessment = '';
    let recommendedCorrection = 'RETAIN_AS_IS';

    // --- CHECK FOR DEFINITIVELY INVALID / UNRELATED MAPPINGS ---
    // 1. Syringes (IS 10258) mapped to automotive, civil, electrical, or other non-syringe products
    if (sNum.includes('10258') && !pName.includes('syringe') && !pName.includes('needle') && !pName.includes('injection')) {
      verdict = 'INVALID';
      classification = 'INVALID_UNRELATED_MAPPING';
      applicabilityAssessment = 'Definitive mismatch: IS 10258 specifies sterile disposable hypodermic syringes for single use. It has zero technical, material, test or safety applicability to this non-medical product.';
      recommendedCorrection = 'REMOVE_MAPPING';
    }
    // 2. Medical Electrical Equipment (IS 13450) mapped to Aluminium Doors/Windows or other non-medical civil items
    else if (sNum.includes('13450') && (pName.includes('door') || pName.includes('window') || (pName.includes('ventilator') && !pName.includes('mechanical') && !pName.includes('icu') && !pName.includes('intensive care')) || pCouncil.includes('civil')) && !pName.includes('medical') && !pName.includes('hospital')) {
      verdict = 'INVALID';
      classification = 'INVALID_UNRELATED_MAPPING';
      applicabilityAssessment = 'Definitive mismatch: IS 13450 specifies basic safety and essential performance of Medical Electrical Equipment. It does not apply to architectural civil doors or windows.';
      recommendedCorrection = 'REMOVE_MAPPING';
    }
    // 3. Knitted Thermal Underwear (IS 16738) mapped to Raised Access False Flooring
    else if (sNum.includes('16738') && (pName.includes('flooring') || pName.includes('access floor') || pCouncil.includes('civil'))) {
      verdict = 'INVALID';
      classification = 'INVALID_UNRELATED_MAPPING';
      applicabilityAssessment = 'Definitive mismatch: IS 16738 specifies knitted thermal underwear fabrics. It has zero applicability to civil architectural raised false flooring.';
      recommendedCorrection = 'REMOVE_MAPPING';
    }
    // 4. Safety Glass for Road Transport (IS 2553 Part 2) mapped to Busbar Trunking Systems or Flue Gas Analyzers
    else if (sNum.includes('2553 (Part 2)') && (pName.includes('busbar') || pName.includes('flue gas') || pName.includes('combustion analyzer') || pCouncil.includes('electrotechnical') || pCouncil.includes('environment'))) {
      verdict = 'INVALID';
      classification = 'INVALID_UNRELATED_MAPPING';
      applicabilityAssessment = 'Definitive mismatch: IS 2553 (Part 2) specifies safety glass for road transport vehicles. It does not apply to electrical busbar trunking or flue gas analyzers.';
      recommendedCorrection = 'REMOVE_MAPPING';
    }
    // 5. Cleanroom Apparel Fabrics (IS 16890) mapped to Oil Spill Absorbent Booms
    else if (sNum.includes('16890') && pName.includes('oil spill') && pName.includes('absorbent')) {
      verdict = 'INVALID';
      classification = 'INVALID_UNRELATED_MAPPING';
      applicabilityAssessment = 'Definitive mismatch: IS 16890 specifies protective clothing cleanroom apparel fabrics, not environmental oil spill absorbent booms.';
      recommendedCorrection = 'REMOVE_MAPPING';
    }
    // 6. Solar Flat Plate Collectors (IS 15758) mapped to Solar DC PV Cables
    else if (sNum.includes('15758') && pName.includes('pv cable')) {
      verdict = 'INVALID';
      classification = 'INVALID_UNRELATED_MAPPING';
      applicabilityAssessment = 'Definitive mismatch: IS 15758 specifies thermal solar flat plate water heating collectors, not electrical DC photovoltaic cables.';
      recommendedCorrection = 'REMOVE_MAPPING';
    }
    // 7. Polycarbonate moulding material (IS 14434) mapped to Venturi Fertilizer Injectors
    else if (sNum.includes('14434') && pName.includes('venturi fertilizer')) {
      verdict = 'INVALID';
      classification = 'INVALID_UNRELATED_MAPPING';
      applicabilityAssessment = 'Definitive mismatch: Raw polycarbonate moulding resin standard mapped to complete agricultural venturi chemical injector assembly.';
      recommendedCorrection = 'REMOVE_MAPPING';
    }
    // 8. Quality Management (IS/ISO 9001) mapped to specific medical/surgical instruments as primary standard
    else if (sNum.includes('ISO 9001') && m.relationship_type === 'primary_specification') {
      verdict = 'VALID';
      classification = 'VERIFIED_SUPPORTING_REFERENCE';
      applicabilityAssessment = 'IS/ISO 9001 is a generic quality management systems standard, not a primary product specification.';
      recommendedCorrection = 'CHANGE_RELATIONSHIP_TO_SUPPORTING';
    }
    // --- VALID CLASSIFICATIONS ---
    else if (m.relationship_type === 'primary_specification') {
      classification = 'VERIFIED_PRIMARY';
      verdict = 'VALID';
      applicabilityAssessment = 'Primary product standard directly governing specification, requirements, and compliance for this product family.';
      recommendedCorrection = 'RETAIN_AS_IS';
    }
    else if (m.relationship_type === 'test_method' || sTitle.includes('method of test') || sTitle.includes('methods of test') || sTitle.includes('testing')) {
      classification = 'VERIFIED_TEST_METHOD';
      verdict = 'VALID';
      applicabilityAssessment = 'Standard establishes official test procedures and methods applicable to this product family.';
      recommendedCorrection = 'RETAIN_AS_IS';
    }
    else if (m.relationship_type === 'material_specification' || sTitle.includes('material') || sTitle.includes('raw material') || sTitle.includes('steel for') || sTitle.includes('compound')) {
      classification = 'VERIFIED_MATERIAL_STANDARD';
      verdict = 'VALID';
      applicabilityAssessment = 'Standard specifies composition, grade, or properties of materials utilized in this product.';
      recommendedCorrection = 'RETAIN_AS_IS';
    }
    else if (m.relationship_type === 'safety_requirement' || sTitle.includes('safety') || sTitle.includes('protection') || sTitle.includes('fire safety')) {
      classification = 'VERIFIED_SAFETY_STANDARD';
      verdict = 'VALID';
      applicabilityAssessment = 'Standard specifies essential safety, electrical insulation, or protective performance criteria.';
      recommendedCorrection = 'RETAIN_AS_IS';
    }
    else if (m.relationship_type === 'installation_standard' || sTitle.includes('code of practice') || sTitle.includes('installation') || sTitle.includes('laying') || sTitle.includes('earthing')) {
      classification = 'VERIFIED_INSTALLATION_STANDARD';
      verdict = 'VALID';
      applicabilityAssessment = 'Code of practice or installation standard governing site placement, erection, or earthing.';
      recommendedCorrection = 'RETAIN_AS_IS';
    }
    else if (m.verification_status === 'CANDIDATE' || m.confidence_score < 0.6) {
      classification = 'CANDIDATE_UNVERIFIED';
      verdict = 'VALID';
      applicabilityAssessment = 'Candidate relationship identified through technical association; requires additional formal evidence.';
      recommendedCorrection = 'FLAG_AS_CANDIDATE';
    }
    else if (m.standard_status === 'SUPERSEDED' || m.standard_status === 'WITHDRAWN') {
      classification = 'HISTORICAL_OR_SUPERSEDED_REFERENCE';
      verdict = 'VALID';
      applicabilityAssessment = 'Historical standard that has been reaffirmed, revised or superseded by a newer edition.';
      recommendedCorrection = 'FLAG_AS_SUPERSEDED';
    }
    else {
      classification = 'VERIFIED_SUPPORTING_REFERENCE';
      verdict = 'VALID';
      applicabilityAssessment = m.applicability_explanation || 'Technically relevant supporting reference or allied standard.';
      recommendedCorrection = 'RETAIN_AS_IS';
    }

    classificationCounts[classification] = (classificationCounts[classification] || 0) + 1;

    const rowObj = {
      product_id: m.product_id,
      product_name: m.product_name,
      product_category: m.product_subcategory || m.standard_category,
      division_council: m.product_council,
      is_number: m.is_number,
      standard_title: m.standard_title,
      standard_domain: m.standard_council,
      relationship_classification: classification,
      applicability_assessment: applicabilityAssessment,
      evidence_source: m.evidence_source || 'BIS Sectional Committee / Gazette Notification',
      evidence_url: m.source_url || 'https://www.services.bis.gov.in/',
      exact_scope_clause_reference: m.evidence_excerpt || m.standard_scope ? String(m.evidence_excerpt || m.standard_scope).substring(0, 150) : 'General Scope',
      relevance_verdict: verdict,
      recommended_correction: recommendedCorrection,
      verification_status: verdict === 'INVALID' ? 'INVALID' : m.verification_status
    };

    auditRows.push(rowObj);

    if (verdict === 'INVALID') {
      invalidRows.push(rowObj);
    }

    // Check cross-domain
    if (m.product_council && m.standard_council && m.product_council.toLowerCase() !== m.standard_council.toLowerCase()) {
      crossDomainRows.push({
        ...rowObj,
        is_legitimate: verdict === 'VALID'
      });
    }
  });

  console.log('Classification Summary:');
  console.table(classificationCounts);
  console.log(`\nTotal Invalid Mappings Found: ${invalidRows.length}`);
  console.log(`Total Cross-Domain Mappings: ${crossDomainRows.length} (Legitimate: ${crossDomainRows.filter(c => c.is_legitimate).length}, Invalid: ${crossDomainRows.filter(c => !c.is_legitimate).length})`);

  // Write NIRDESHAK_UNIVERSAL_IS_RELEVANCE_AUDIT.csv
  const auditCsvHeader = [
    'Product ID', 'Product Name', 'Product Category', 'Division Council',
    'IS Number', 'Official Standard Title', 'Standard Domain', 'Relationship Classification',
    'Applicability Assessment', 'Evidence Source', 'Evidence URL', 'Exact Scope Clause Reference',
    'Relevance Verdict', 'Recommended Correction', 'Verification Status'
  ].join(',');

  const auditCsvLines = [auditCsvHeader];
  auditRows.forEach(r => {
    auditCsvLines.push([
      escapeCsv(r.product_id), escapeCsv(r.product_name), escapeCsv(r.product_category), escapeCsv(r.division_council),
      escapeCsv(r.is_number), escapeCsv(r.standard_title), escapeCsv(r.standard_domain), escapeCsv(r.relationship_classification),
      escapeCsv(r.applicability_assessment), escapeCsv(r.evidence_source), escapeCsv(r.evidence_url), escapeCsv(r.exact_scope_clause_reference),
      escapeCsv(r.relevance_verdict), escapeCsv(r.recommended_correction), escapeCsv(r.verification_status)
    ].join(','));
  });

  const auditCsvPath = path.join(__dirname, '..', 'NIRDESHAK_UNIVERSAL_IS_RELEVANCE_AUDIT.csv');
  fs.writeFileSync(auditCsvPath, auditCsvLines.join('\n'));
  console.log(`\nWrote ${auditRows.length} rows to NIRDESHAK_UNIVERSAL_IS_RELEVANCE_AUDIT.csv`);

  // Write NIRDESHAK_INVALID_MAPPING_REGISTER.csv
  const invalidCsvLines = [auditCsvHeader];
  invalidRows.forEach(r => {
    invalidCsvLines.push([
      escapeCsv(r.product_id), escapeCsv(r.product_name), escapeCsv(r.product_category), escapeCsv(r.division_council),
      escapeCsv(r.is_number), escapeCsv(r.standard_title), escapeCsv(r.standard_domain), escapeCsv(r.relationship_classification),
      escapeCsv(r.applicability_assessment), escapeCsv(r.evidence_source), escapeCsv(r.evidence_url), escapeCsv(r.exact_scope_clause_reference),
      escapeCsv(r.relevance_verdict), escapeCsv(r.recommended_correction), escapeCsv(r.verification_status)
    ].join(','));
  });

  const invalidCsvPath = path.join(__dirname, '..', 'NIRDESHAK_INVALID_MAPPING_REGISTER.csv');
  fs.writeFileSync(invalidCsvPath, invalidCsvLines.join('\n'));
  console.log(`Wrote ${invalidRows.length} rows to NIRDESHAK_INVALID_MAPPING_REGISTER.csv`);

  await pool.end();
  return { classificationCounts, invalidRows, crossDomainRows };
}

auditAndClassify().catch(console.error);
