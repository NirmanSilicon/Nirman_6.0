const fs = require('fs');
const path = require('path');
const { query, closePool } = require('../database');

async function extractDetails() {
  // 1. Stale coverage_status analysis
  const staleRes = await query(`
    WITH product_counts AS (
      SELECT 
        pf.id,
        pf.canonical_name,
        pf.division_council,
        pf.coverage_status as stored_status,
        COUNT(psm.id) as mapping_count,
        COUNT(CASE WHEN psm.relationship_type = 'primary_specification' THEN 1 END) as primary_count,
        COUNT(CASE WHEN psm.relationship_type != 'primary_specification' THEN 1 END) as supporting_count
      FROM product_families pf
      LEFT JOIN product_standard_mappings psm ON pf.id = psm.product_family_id
      GROUP BY pf.id, pf.canonical_name, pf.division_council, pf.coverage_status
    )
    SELECT *,
      CASE 
        WHEN mapping_count = 0 AND stored_status != 'NO_APPLICABLE_STANDARD_FOUND' THEN 'ORPHANED_COVERAGE_STATUS'
        WHEN primary_count > 0 AND stored_status = 'VERIFIED_SUPPORTING_ONLY' THEN 'UNDERCLASSIFIED_PRIMARY'
        WHEN primary_count = 0 AND mapping_count > 0 AND stored_status = 'VERIFIED_PRIMARY' THEN 'OVERCLASSIFIED_PRIMARY'
        ELSE 'CONSISTENT'
      END as inconsistency_type
    FROM product_counts
    WHERE 
      (mapping_count = 0 AND stored_status NOT IN ('NO_APPLICABLE_STANDARD_FOUND', 'PRODUCT_CLARIFICATION_REQUIRED', 'DISCOVERED_CATALOGUE_ONLY'))
      OR (primary_count > 0 AND stored_status = 'VERIFIED_SUPPORTING_ONLY')
      OR (primary_count = 0 AND mapping_count > 0 AND stored_status = 'VERIFIED_PRIMARY')
    ORDER BY id ASC;
  `);

  console.log(`Found ${staleRes.rows.length} stale / inconsistent products.`);

  // 2. Duplicate pairs deep dive
  const dupIds = [12, 611, 3, 593, 6, 599, 4, 597];
  const dupRes = await query(`
    SELECT 
      pf.id,
      pf.canonical_name,
      pf.division_council,
      pf.subcategory,
      pf.description,
      pf.coverage_status,
      json_agg(json_build_object(
        'mapping_id', psm.id,
        'relationship_type', psm.relationship_type,
        'verification_status', psm.verification_status,
        'is_number', s.is_number,
        'title', s.title
      )) as mappings
    FROM product_families pf
    LEFT JOIN product_standard_mappings psm ON pf.id = psm.product_family_id
    LEFT JOIN standards s ON psm.standard_id = s.id
    WHERE pf.id = ANY($1::int[])
    GROUP BY pf.id, pf.canonical_name, pf.division_council, pf.subcategory, pf.description, pf.coverage_status
    ORDER BY pf.canonical_name ASC, pf.id ASC;
  `, [dupIds]);

  // 3. Civil Engineering specific standards analysis
  const ceStandards = ['IS 15988:2013', 'IS 1893 (Part 1):2016', 'IS 456:2000', 'IS 10262:2019', 'IS 516 (Part 1/Sec 1):2021'];
  const ceRes = await query(`
    SELECT 
      s.is_number,
      s.title,
      COUNT(psm.id) as mapping_count,
      json_agg(json_build_object(
        'product_id', pf.id,
        'product_name', pf.canonical_name,
        'relationship_type', psm.relationship_type,
        'verification_status', psm.verification_status
      )) as products
    FROM standards s
    LEFT JOIN product_standard_mappings psm ON s.id = psm.standard_id
    LEFT JOIN product_families pf ON psm.product_family_id = pf.id
    WHERE s.is_number = ANY($1::text[])
    GROUP BY s.id, s.is_number, s.title
    ORDER BY s.is_number ASC;
  `, [ceStandards]);

  fs.writeFileSync(path.join(__dirname, 'audit_extracted_data.json'), JSON.stringify({
    staleProducts: staleRes.rows,
    duplicates: dupRes.rows,
    ceStandards: ceRes.rows
  }, null, 2), 'utf8');

  console.log('Saved audit_extracted_data.json');
  await closePool();
}

extractDetails().catch(e => {
  console.error(e);
  process.exit(1);
});
