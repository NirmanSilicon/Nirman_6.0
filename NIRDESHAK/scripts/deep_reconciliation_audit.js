const { query, closePool } = require('../database');

async function runDeepAudit() {
  console.log('===============================================================');
  console.log('NIRDESHAK DEEP DATABASE AUDIT & RECONCILIATION');
  console.log('===============================================================\n');

  // 1. Current coverage_status column in product_families
  const covStatusRes = await query(`
    SELECT coverage_status, count(*) as count
    FROM product_families
    GROUP BY coverage_status
    ORDER BY count DESC;
  `);
  console.log('1. Current stored coverage_status in product_families:');
  console.table(covStatusRes.rows);

  // 2. Mapping count per product family
  const mappingCountsRes = await query(`
    SELECT 
      pf.id as product_id,
      pf.canonical_name,
      pf.division_council,
      pf.coverage_status as stored_coverage_status,
      count(psm.id) as mapping_count,
      count(CASE WHEN psm.relationship_type = 'primary_specification' THEN 1 END) as primary_count,
      count(CASE WHEN psm.relationship_type != 'primary_specification' THEN 1 END) as supporting_count
    FROM product_families pf
    LEFT JOIN product_standard_mappings psm ON pf.id = psm.product_family_id
    GROUP BY pf.id, pf.canonical_name, pf.division_council, pf.coverage_status
    ORDER BY pf.id;
  `);
  const products = mappingCountsRes.rows;

  let zeroMappings = 0;
  let singleMapping = 0;
  let multiMapping = 0;

  let hasPrimaryOnly = 0;
  let hasSupportingOnly = 0;
  let hasBothPrimaryAndSupporting = 0;
  let noMappings = 0;

  let staleCoverageStatusCount = 0;
  const staleExamples = [];

  for (const p of products) {
    const totalM = parseInt(p.mapping_count, 10);
    const primM = parseInt(p.primary_count, 10);
    const suppM = parseInt(p.supporting_count, 10);

    if (totalM === 0) {
      zeroMappings++;
      noMappings++;
      if (p.stored_coverage_status !== 'CANDIDATE_UNVERIFIED' && p.stored_coverage_status !== 'DISCOVERED_CATALOGUE_ONLY') {
        staleCoverageStatusCount++;
        staleExamples.push({ id: p.product_id, name: p.canonical_name, stored: p.stored_coverage_status, actual: 'ZERO_MAPPINGS' });
      }
    } else if (totalM === 1) {
      singleMapping++;
      if (primM === 1) {
        hasPrimaryOnly++;
        if (p.stored_coverage_status !== 'VERIFIED_PRIMARY') {
          staleCoverageStatusCount++;
          if (staleExamples.length < 10) staleExamples.push({ id: p.product_id, name: p.canonical_name, stored: p.stored_coverage_status, actual: 'HAS_PRIMARY' });
        }
      } else {
        hasSupportingOnly++;
        if (p.stored_coverage_status !== 'VERIFIED_SUPPORTING_ONLY') {
          staleCoverageStatusCount++;
          if (staleExamples.length < 10) staleExamples.push({ id: p.product_id, name: p.canonical_name, stored: p.stored_coverage_status, actual: 'HAS_SUPPORTING_ONLY' });
        }
      }
    } else {
      multiMapping++;
      if (primM > 0 && suppM > 0) hasBothPrimaryAndSupporting++;
      else if (primM > 0) hasPrimaryOnly++;
      else hasSupportingOnly++;
    }
  }

  console.log('\n2. Derived Actual Coverage Metrics:');
  console.log(`- Products with 0 mappings: ${zeroMappings}`);
  console.log(`- Products with 1 mapping: ${singleMapping}`);
  console.log(`- Products with >1 mappings: ${multiMapping}`);
  console.log(`- Distinct products with at least one primary mapping: ${hasPrimaryOnly + hasBothPrimaryAndSupporting}`);
  console.log(`  * Primary only: ${hasPrimaryOnly}`);
  console.log(`  * Both primary and supporting: ${hasBothPrimaryAndSupporting}`);
  console.log(`- Distinct products with supporting-only mappings: ${hasSupportingOnly}`);
  console.log(`- Distinct products with NO mappings: ${noMappings}`);
  console.log(`- Stale stored coverage_status values found: ${staleCoverageStatusCount}`);
  console.log('Sample stale records:');
  console.table(staleExamples.slice(0, 5));

  // 3. Breakdown of single mapping products: primary vs supporting
  const singleMapBreakdown = await query(`
    SELECT psm.relationship_type, count(*) as count
    FROM (
      SELECT product_family_id
      FROM product_standard_mappings
      GROUP BY product_family_id
      HAVING count(*) = 1
    ) single_prods
    JOIN product_standard_mappings psm ON single_prods.product_family_id = psm.product_family_id
    GROUP BY psm.relationship_type;
  `);
  console.log('\n3. Relationship types among the 897 single-mapping products:');
  console.table(singleMapBreakdown.rows);

  // 4. Breakdown of the 68 zero-mapping products by council
  const zeroMapCouncils = await query(`
    SELECT pf.division_council, count(*) as count
    FROM product_families pf
    LEFT JOIN product_standard_mappings psm ON pf.id = psm.product_family_id
    WHERE psm.id IS NULL
    GROUP BY pf.division_council
    ORDER BY count DESC;
  `);
  console.log('\n4. Breakdown of the 68 zero-mapping products by Division Council:');
  console.table(zeroMapCouncils.rows);

  // 5. Inspect 42 zero-mapping Transport Engineering products
  const tedZero = await query(`
    SELECT pf.id, pf.canonical_name, pf.subcategory, pf.description
    FROM product_families pf
    LEFT JOIN product_standard_mappings psm ON pf.id = psm.product_family_id
    WHERE psm.id IS NULL AND pf.division_council = 'Transport Engineering'
    ORDER BY pf.id;
  `);
  console.log(`\n5. Sample of the ${tedZero.rows.length} Transport Engineering products with 0 mappings:`);
  console.table(tedZero.rows.slice(0, 10));

  // 6. Inspect the 5 Civil Engineering standards
  const isNums = ['IS 15988:2013', 'IS 1893 (Part 1):2016', 'IS 456:2000', 'IS 10262:2019', 'IS 516 (Part 1/Sec 1):2021'];
  const civilStandardsUsage = await query(`
    SELECT s.is_number, s.title, count(psm.id) as mapping_count
    FROM standards s
    LEFT JOIN product_standard_mappings psm ON s.id = psm.standard_id
    WHERE s.is_number = ANY($1::text[])
    GROUP BY s.is_number, s.title
    ORDER BY mapping_count DESC;
  `, [isNums]);
  console.log('\n6. Usage count of the 5 Civil Engineering standards:');
  console.table(civilStandardsUsage.rows);

  // 7. Inspect products mapped to these 5 standards
  const concreteProducts = [
    'Precast Reinforced Concrete Pipes',
    'Concrete Paver Blocks',
    'Concrete Hollow Masonry Blocks',
    'AAC Blocks',
    'Concrete Drainage Pipes',
    'Ready Mixed Concrete',
    'Precast Concrete Manhole Covers',
    'Concrete Kerbstones'
  ];
  const civilSpecificMappings = await query(`
    SELECT pf.id as p_id, pf.canonical_name, s.is_number, psm.relationship_type, psm.applicability_explanation
    FROM product_standard_mappings psm
    JOIN product_families pf ON psm.product_family_id = pf.id
    JOIN standards s ON psm.standard_id = s.id
    WHERE s.is_number = ANY($1::text[])
      AND pf.canonical_name ~* 'Precast|Paver|Masonry Blocks|AAC|Drainage Pipes|Ready Mixed Concrete|Manhole|Kerbstone'
    ORDER BY pf.canonical_name, s.is_number;
  `, [isNums]);
  console.log(`\n7. Mappings of these 5 standards to specific concrete products (${civilSpecificMappings.rows.length} rows):`);
  console.table(civilSpecificMappings.rows.slice(0, 15));

  // 8. Investigate Duplicate Product Families
  const duplicatesRes = await query(`
    SELECT a.id as id1, a.canonical_name as name1, a.division_council as council1,
           b.id as id2, b.canonical_name as name2, b.division_council as council2
    FROM product_families a
    JOIN product_families b ON a.id < b.id 
      AND (
        LOWER(TRIM(a.canonical_name)) = LOWER(TRIM(b.canonical_name))
        OR LOWER(REGEXP_REPLACE(a.canonical_name, '[^a-zA-Z0-9]', '', 'g')) = LOWER(REGEXP_REPLACE(b.canonical_name, '[^a-zA-Z0-9]', '', 'g'))
      )
    ORDER BY a.canonical_name;
  `);
  console.log(`\n8. Duplicate Product Families identified (${duplicatesRes.rows.length} pairs):`);
  console.table(duplicatesRes.rows);

  await closePool();
}

runDeepAudit().catch(console.error);
