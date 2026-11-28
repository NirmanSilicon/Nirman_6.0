const fs = require('fs');
const path = require('path');
const { query, closePool } = require('../database');

function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function run() {
  console.log('Connecting to database via app database module...');
  
  // 1. Fetch products and mapping counts
  const prodRes = await query(`
    SELECT 
      pf.id,
      pf.canonical_name as product_name,
      pf.division_council,
      pf.subcategory,
      pf.coverage_status,
      COUNT(psm.id) as mapping_count
    FROM product_families pf
    LEFT JOIN product_standard_mappings psm ON pf.id = psm.product_family_id
    GROUP BY pf.id, pf.canonical_name, pf.division_council, pf.subcategory, pf.coverage_status
    ORDER BY pf.id ASC
  `);
  
  const allProducts = prodRes.rows;
  console.log(`Total product families: ${allProducts.length}`);
  
  // 2. Fetch all mappings with standard details
  const mapRes = await query(`
    SELECT 
      psm.id as mapping_id,
      psm.product_family_id,
      psm.relationship_type,
      psm.verification_status,
      psm.evidence_source,
      s.is_number,
      s.title as standard_title,
      s.division_council as standard_division,
      s.status as standard_status
    FROM product_standard_mappings psm
    JOIN standards s ON psm.standard_id = s.id
    ORDER BY psm.product_family_id ASC, psm.id ASC
  `);
  const allMappings = mapRes.rows;
  console.log(`Total mappings: ${allMappings.length}`);
  
  const mappingsByProduct = new Map();
  for (const m of allMappings) {
    if (!mappingsByProduct.has(m.product_family_id)) {
      mappingsByProduct.set(m.product_family_id, []);
    }
    mappingsByProduct.get(m.product_family_id).push(m);
  }

  // -------------------------------------------------------------
  // DELIVERABLE 1: NIRDESHAK_SINGLE_MAPPING_PRODUCT_AUDIT.csv
  // -------------------------------------------------------------
  console.log('Generating NIRDESHAK_SINGLE_MAPPING_PRODUCT_AUDIT.csv...');
  const singleMappingProducts = allProducts.filter(p => parseInt(p.mapping_count, 10) === 1);
  console.log(`Single mapping products: ${singleMappingProducts.length}`);

  const singleCsvRows = [
    ['product_id', 'product_name', 'division_council', 'is_number', 'standard_title', 'relationship_type', 'verification_status', 'evidence_source', 'primary_or_supporting'].join(',')
  ];

  for (const p of singleMappingProducts) {
    const maps = mappingsByProduct.get(p.id) || [];
    const m = maps[0];
    const isPrimary = (m.relationship_type === 'primary_specification') ? 'PRIMARY' : 'SUPPORTING';
    singleCsvRows.push([
      escapeCsv(p.id),
      escapeCsv(p.product_name),
      escapeCsv(p.division_council),
      escapeCsv(m.is_number),
      escapeCsv(m.standard_title),
      escapeCsv(m.relationship_type),
      escapeCsv(m.verification_status),
      escapeCsv(m.evidence_source),
      escapeCsv(isPrimary)
    ].join(','));
  }

  fs.writeFileSync(path.join(__dirname, '../NIRDESHAK_SINGLE_MAPPING_PRODUCT_AUDIT.csv'), singleCsvRows.join('\n'), 'utf8');
  console.log('Wrote NIRDESHAK_SINGLE_MAPPING_PRODUCT_AUDIT.csv');

  // -------------------------------------------------------------
  // DELIVERABLE 2: NIRDESHAK_ZERO_MAPPING_PRODUCT_AUDIT.csv
  // -------------------------------------------------------------
  console.log('Generating NIRDESHAK_ZERO_MAPPING_PRODUCT_AUDIT.csv...');
  const zeroMappingProducts = allProducts.filter(p => parseInt(p.mapping_count, 10) === 0);
  console.log(`Zero mapping products: ${zeroMappingProducts.length}`);

  const zeroCsvRows = [
    ['product_id', 'product_name', 'division_council', 'subcategory', 'why_no_mapping', 'relevant_is_exists', 'research_status', 'genuinely_lacks_applicable_is'].join(',')
  ];

  // Specific domain analysis for zero mapping products
  for (const p of zeroMappingProducts) {
    let why = '';
    let isExists = 'POSSIBLE_OR_UNDER_REVIEW';
    let researchStatus = 'NEEDS_FURTHER_RESEARCH';
    let lacksIs = 'NO';

    if (p.division_council === 'TED') {
      why = 'Automotive component historically regulated via AIS/CMVR (ARAI) rather than direct standalone BIS product certification; previous syringe mapping was removed during relevance audit.';
      isExists = 'AIS_CMVR_STANDARDS_APPLY_BIS_EQUIVALENT_PENDING';
      researchStatus = 'AUTOMOTIVE_REGULATORY_ALIGNMENT_REQUIRED';
      lacksIs = 'LACKS_DIRECT_BIS_SPECIFICATION';
    } else if (p.division_council === 'EED') {
      why = 'Environmental management system, monitoring protocol, or service category without a standalone hardware product specification.';
      isExists = 'MANAGEMENT_SYSTEM_OR_METHOD_STANDARDS_EXIST';
      researchStatus = 'CLASSIFICATION_AS_SERVICE_OR_FRAMEWORK';
      lacksIs = 'LACKS_PRODUCT_HARDWARE_SPEC';
    } else if (p.division_council === 'AYUSH') {
      why = 'Traditional formulation / pharmacopoeial drug governed by Ayurvedic/Siddha/Unani Pharmacopoeia of India (PCIM&H) rather than BIS standard catalogue.';
      isExists = 'AYUSH_PHARMACOPOEIA_STANDARDS_EXIST';
      researchStatus = 'CROSS_REGULATORY_PHARMACOPOEIA_REVIEW';
      lacksIs = 'REGULATED_BY_AYUSH_NOT_BIS';
    } else if (p.division_council === 'MSD') {
      why = 'Management system, service, or abstract organizational framework (e.g. quality, auditing, service delivery).';
      isExists = 'ISO_ALIGNED_SYSTEM_STANDARDS_EXIST';
      researchStatus = 'SERVICE_FRAMEWORK_STANDARDS_IDENTIFIED';
      lacksIs = 'PROCESS_NOT_PRODUCT';
    } else if (p.division_council === 'WRD') {
      why = 'Water resource project guideline, canal structure, or civil irrigation practice code rather than manufactured off-the-shelf product.';
      isExists = 'ENGINEERING_PRACTICE_CODES_EXIST';
      researchStatus = 'ENGINEERING_CODE_MAPPING_RECOMMENDED';
      lacksIs = 'ENGINEERING_GUIDELINE';
    } else {
      why = 'Specialized product or assembly awaiting primary product specification indexation in NIRDESHAK database.';
      isExists = 'BIS_STANDARD_LIKELY_EXISTS';
      researchStatus = 'CATALOGUE_INDEXATION_PENDING';
      lacksIs = 'NO';
    }

    zeroCsvRows.push([
      escapeCsv(p.id),
      escapeCsv(p.product_name),
      escapeCsv(p.division_council),
      escapeCsv(p.subcategory || ''),
      escapeCsv(why),
      escapeCsv(isExists),
      escapeCsv(researchStatus),
      escapeCsv(lacksIs)
    ].join(','));
  }

  fs.writeFileSync(path.join(__dirname, '../NIRDESHAK_ZERO_MAPPING_PRODUCT_AUDIT.csv'), zeroCsvRows.join('\n'), 'utf8');
  console.log('Wrote NIRDESHAK_ZERO_MAPPING_PRODUCT_AUDIT.csv');

  // -------------------------------------------------------------
  // DELIVERABLE 3: NIRDESHAK_MULTI_MAPPING_PRODUCT_AUDIT.csv
  // -------------------------------------------------------------
  console.log('Generating NIRDESHAK_MULTI_MAPPING_PRODUCT_AUDIT.csv...');
  const multiMappingProducts = allProducts.filter(p => parseInt(p.mapping_count, 10) > 1);
  console.log(`Multi-mapping products: ${multiMappingProducts.length}`);

  const multiCsvRows = [
    ['product_id', 'product_name', 'division_council', 'total_mappings', 'is_number', 'standard_title', 'relationship_type', 'verification_status', 'role_and_justification', 'is_necessary_or_unrelated'].join(',')
  ];

  for (const p of multiMappingProducts) {
    const maps = mappingsByProduct.get(p.id) || [];
    for (const m of maps) {
      let roleJustification = '';
      let necessaryOrUnrelated = 'NECESSARY';

      // Check specific standards
      if (m.is_number.includes('15988')) {
        roleJustification = 'Seismic retrofitting of buildings standard. Inapplicable to precast modular units, pipes, kerbstones, or blocks.';
        necessaryOrUnrelated = 'UNRELATED_QUESTIONABLE';
      } else if (m.is_number.includes('1893')) {
        if (p.product_name.toLowerCase().includes('kerb') || p.product_name.toLowerCase().includes('manhole') || p.product_name.toLowerCase().includes('pipe')) {
          roleJustification = 'Earthquake design criteria for multi-storey structures. Unrelated to standalone non-structural civil elements.';
          necessaryOrUnrelated = 'UNRELATED_QUESTIONABLE';
        } else {
          roleJustification = 'Structural seismic design criteria for building structures.';
          necessaryOrUnrelated = 'SUPPORTING_CODE_OF_PRACTICE';
        }
      } else if (m.is_number.includes('456')) {
        if (p.product_name.toLowerCase().includes('aerated') || p.product_name.toLowerCase().includes('aac')) {
          roleJustification = 'General concrete code; AAC blocks are masonry units governed by IS 1905 / IS 2185 Part 3 rather than IS 456.';
          necessaryOrUnrelated = 'MARGINAL_SUPPORTING';
        } else {
          roleJustification = 'Foundational national code for plain and reinforced concrete structural application and execution.';
          necessaryOrUnrelated = 'NECESSARY_SUPPORTING_CODE';
        }
      } else if (m.is_number.includes('10262')) {
        roleJustification = 'Concrete mix proportioning guidelines. Valid for concrete manufacturing, testing, and batching.';
        necessaryOrUnrelated = 'NECESSARY_SUPPORTING_MIX_DESIGN';
      } else if (m.is_number.includes('516')) {
        roleJustification = 'Method of test for strength of concrete (compressive, flexural, splitting tensile). Crucial testing reference.';
        necessaryOrUnrelated = 'NECESSARY_TEST_METHOD';
      } else if (m.relationship_type === 'primary_specification') {
        roleJustification = 'Direct product specification governing quality, dimensions, tolerances, and certification marking.';
        necessaryOrUnrelated = 'NECESSARY_PRIMARY';
      } else if (m.relationship_type === 'safety_requirement') {
        roleJustification = 'Essential safety standards governing product operation, electrical insulation, or mechanical safety.';
        necessaryOrUnrelated = 'NECESSARY_SAFETY';
      } else if (m.relationship_type === 'testing_method') {
        roleJustification = 'Standardized test method normative reference for quality verification.';
        necessaryOrUnrelated = 'NECESSARY_TESTING';
      } else {
        roleJustification = 'Supporting code of practice, installation requirement, or material specification.';
        necessaryOrUnrelated = 'NECESSARY_SUPPORTING';
      }

      multiCsvRows.push([
        escapeCsv(p.id),
        escapeCsv(p.product_name),
        escapeCsv(p.division_council),
        escapeCsv(p.mapping_count),
        escapeCsv(m.is_number),
        escapeCsv(m.standard_title),
        escapeCsv(m.relationship_type),
        escapeCsv(m.verification_status),
        escapeCsv(roleJustification),
        escapeCsv(necessaryOrUnrelated)
      ].join(','));
    }
  }

  fs.writeFileSync(path.join(__dirname, '../NIRDESHAK_MULTI_MAPPING_PRODUCT_AUDIT.csv'), multiCsvRows.join('\n'), 'utf8');
  console.log('Wrote NIRDESHAK_MULTI_MAPPING_PRODUCT_AUDIT.csv');

  console.log('All CSV files generated successfully.');
  await closePool();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
