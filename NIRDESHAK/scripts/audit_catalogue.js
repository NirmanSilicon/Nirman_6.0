const { query } = require('../database');

async function auditCatalogue() {
  console.log('====================================================');
  console.log('1. PRODUCT CATALOGUE & COVERAGE AUDIT');
  console.log('====================================================\n');

  // Total counts
  const pfCountRes = await query('SELECT count(*) FROM product_families');
  const pcCountRes = await query('SELECT count(*) FROM product_categories');
  const paCountRes = await query('SELECT count(*) FROM product_aliases');
  const psmCountRes = await query('SELECT count(*) FROM product_standard_mappings');
  const sCountRes = await query('SELECT count(*) FROM standards');

  const totalFamilies = parseInt(pfCountRes.rows[0].count, 10);
  const totalCategories = parseInt(pcCountRes.rows[0].count, 10);
  const totalAliases = parseInt(paCountRes.rows[0].count, 10);
  const totalMappings = parseInt(psmCountRes.rows[0].count, 10);
  const totalStandards = parseInt(sCountRes.rows[0].count, 10);

  console.log(`Total Product Families:   ${totalFamilies}`);
  console.log(`Total Product Categories: ${totalCategories}`);
  console.log(`Total Product Aliases:    ${totalAliases}`);
  console.log(`Total Standards:          ${totalStandards}`);
  console.log(`Total Mappings:           ${totalMappings}\n`);

  // Distribution across 17 BIS Division Councils
  console.log('--- Distribution Across All 17 BIS Division Councils ---');
  const councilDistSql = `
    SELECT 
      ps.council_number,
      ps.division_council_code AS code,
      ps.name AS council_name,
      COUNT(DISTINCT pc.id) AS categories_count,
      COUNT(DISTINCT pf.id) AS families_count,
      COUNT(DISTINCT pa.id) AS aliases_count,
      COUNT(DISTINCT psm.id) AS mappings_count
    FROM product_sectors ps
    LEFT JOIN product_categories pc ON ps.id = pc.sector_id
    LEFT JOIN product_families pf ON ps.id = pf.sector_id
    LEFT JOIN product_aliases pa ON pf.id = pa.product_family_id
    LEFT JOIN product_standard_mappings psm ON pf.id = psm.product_family_id
    GROUP BY ps.id, ps.council_number, ps.division_council_code, ps.name
    ORDER BY ps.council_number ASC;
  `;
  const distRes = await query(councilDistSql);
  console.table(distRes.rows);

  // Check for duplicate product families
  console.log('\n--- Checking for Duplicate Product Families ---');
  const dupNameSql = `
    SELECT LOWER(canonical_name) AS name, count(*) 
    FROM product_families 
    GROUP BY LOWER(canonical_name) 
    HAVING count(*) > 1;
  `;
  const dupNameRes = await query(dupNameSql);
  console.log(`Duplicate canonical names: ${dupNameRes.rows.length}`);
  if (dupNameRes.rows.length > 0) {
    console.log(dupNameRes.rows);
  }

  const dupCodeSql = `
    SELECT family_code, count(*) 
    FROM product_families 
    GROUP BY family_code 
    HAVING count(*) > 1;
  `;
  const dupCodeRes = await query(dupCodeSql);
  console.log(`Duplicate family codes: ${dupCodeRes.rows.length}`);
  if (dupCodeRes.rows.length > 0) {
    console.log(dupCodeRes.rows);
  }

  // Check for suspicious or short aliases (< 3 chars)
  console.log('\n--- Checking Short or Problematic Aliases ---');
  const shortAliasSql = `
    SELECT pa.alias_term, pa.alias_type, pf.canonical_name, pf.family_code
    FROM product_aliases pa
    JOIN product_families pf ON pa.product_family_id = pf.id
    WHERE LENGTH(TRIM(pa.alias_term)) < 3
    ORDER BY LENGTH(TRIM(pa.alias_term)) ASC, pa.alias_term ASC;
  `;
  const shortRes = await query(shortAliasSql);
  console.log(`Aliases with length < 3 chars: ${shortRes.rows.length}`);
  console.log(shortRes.rows);

  // Check for aliases shared across multiple families
  console.log('\n--- Checking Aliases Duplicated Across Different Families ---');
  const crossAliasSql = `
    SELECT LOWER(TRIM(alias_term)) AS term, count(DISTINCT product_family_id) AS family_count, array_agg(DISTINCT product_family_id) AS fids
    FROM product_aliases
    GROUP BY LOWER(TRIM(alias_term))
    HAVING count(DISTINCT product_family_id) > 1
    ORDER BY count(DISTINCT product_family_id) DESC
    LIMIT 20;
  `;
  const crossAliasRes = await query(crossAliasSql);
  console.log(`Aliases mapped to multiple families: ${crossAliasRes.rows.length}`);
  console.log(crossAliasRes.rows.slice(0, 10));

  // Section 2: Coverage Calculations
  console.log('\n====================================================');
  console.log('2. PRODUCT-STANDARD COVERAGE CALCULATIONS');
  console.log('====================================================\n');

  // Families with at least 1 standard mapped
  const mappedFamiliesSql = `
    SELECT 
      pf.id,
      pf.family_code,
      pf.canonical_name,
      pf.division_council,
      count(psm.id) AS total_mappings,
      count(CASE WHEN psm.verification_status = 'VERIFIED' THEN 1 END) AS verified_mappings,
      count(CASE WHEN psm.verification_status != 'VERIFIED' OR psm.verification_status IS NULL THEN 1 END) AS unverified_mappings,
      count(CASE WHEN psm.relationship_type ILIKE '%primary%' THEN 1 END) AS primary_mappings,
      count(CASE WHEN psm.relationship_type NOT ILIKE '%primary%' THEN 1 END) AS non_primary_mappings
    FROM product_families pf
    JOIN product_standard_mappings psm ON pf.id = psm.product_family_id
    GROUP BY pf.id, pf.family_code, pf.canonical_name, pf.division_council;
  `;
  const mfRes = await query(mappedFamiliesSql);
  const mappedFamilies = mfRes.rows;

  const withAtLeastOne = mappedFamilies.filter(f => parseInt(f.verified_mappings, 10) >= 1).length;
  const withMultiple = mappedFamilies.filter(f => parseInt(f.verified_mappings, 10) > 1).length;
  const onlySupporting = mappedFamilies.filter(f => parseInt(f.primary_mappings, 10) === 0 && parseInt(f.non_primary_mappings, 10) > 0).length;
  const withUnverified = mappedFamilies.filter(f => parseInt(f.unverified_mappings, 10) > 0).length;
  const unmappedCount = totalFamilies - mappedFamilies.length;

  console.log(`Product families with >= 1 verified standard: ${withAtLeastOne} (${((withAtLeastOne / totalFamilies) * 100).toFixed(2)}%)`);
  console.log(`Product families with > 1 verified standard:   ${withMultiple} (${((withMultiple / totalFamilies) * 100).toFixed(2)}%)`);
  console.log(`Product families with ONLY supporting refs:    ${onlySupporting} (${((onlySupporting / totalFamilies) * 100).toFixed(2)}%)`);
  console.log(`Product families with unverified mappings:     ${withUnverified} (${((withUnverified / totalFamilies) * 100).toFixed(2)}%)`);
  console.log(`Product families with NO standard mapping:     ${unmappedCount} (${((unmappedCount / totalFamilies) * 100).toFixed(2)}%)`);

  process.exit(0);
}

auditCatalogue().catch(err => {
  console.error(err);
  process.exit(1);
});
