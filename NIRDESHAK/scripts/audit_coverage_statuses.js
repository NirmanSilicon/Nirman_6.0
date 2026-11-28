const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function auditCoverage() {
  console.log('=== AUDITING PRODUCT COVERAGE STATUSES VS MAPPINGS ===');

  // Query all products with their mapped relationship types
  const res = await pool.query(`
    SELECT 
      pf.id,
      pf.family_code,
      pf.canonical_name,
      pf.division_council,
      pf.coverage_status,
      count(psm.id) as total_mappings,
      count(psm.id) FILTER (WHERE psm.relationship_type = 'primary_specification') as primary_count,
      count(psm.id) FILTER (WHERE psm.relationship_type != 'primary_specification') as supporting_count,
      array_agg(DISTINCT psm.relationship_type) as rel_types
    FROM product_families pf
    LEFT JOIN product_standard_mappings psm ON pf.id = psm.product_family_id
    GROUP BY pf.id, pf.family_code, pf.canonical_name, pf.division_council, pf.coverage_status
    ORDER BY pf.id ASC;
  `);

  const products = res.rows;
  console.log(`Total Products: ${products.length}`);

  let primaryWithoutPrimaryMapping = [];
  let supportingWithPrimaryMapping = [];
  let nonMappedWithUnexpectedStatus = [];
  let supportingReferencesOnlyCount = 0;
  let verifiedSupportingOnlyCount = 0;

  products.forEach(p => {
    const pCount = parseInt(p.primary_count, 10);
    const sCount = parseInt(p.supporting_count, 10);
    const tCount = parseInt(p.total_mappings, 10);

    if (p.coverage_status === 'SUPPORTING_REFERENCES_ONLY') {
      supportingReferencesOnlyCount++;
    }
    if (p.coverage_status === 'VERIFIED_SUPPORTING_ONLY') {
      verifiedSupportingOnlyCount++;
    }

    if (p.coverage_status === 'VERIFIED_PRIMARY' && pCount === 0) {
      primaryWithoutPrimaryMapping.push(p);
    }

    if ((p.coverage_status === 'VERIFIED_SUPPORTING_ONLY' || p.coverage_status === 'SUPPORTING_REFERENCES_ONLY') && pCount > 0) {
      supportingWithPrimaryMapping.push(p);
    }

    if (tCount === 0 && !['CANDIDATE_UNVERIFIED', 'NO_APPLICABLE_STANDARD_FOUND', 'PRODUCT_CLARIFICATION_REQUIRED', 'DISCOVERED_CATALOGUE_ONLY'].includes(p.coverage_status)) {
      nonMappedWithUnexpectedStatus.push(p);
    }
  });

  console.log(`\nStatus counts:`);
  console.log(`- Products with status 'SUPPORTING_REFERENCES_ONLY': ${supportingReferencesOnlyCount}`);
  console.log(`- Products with status 'VERIFIED_SUPPORTING_ONLY': ${verifiedSupportingOnlyCount}`);
  console.log(`- Total Supporting products: ${supportingReferencesOnlyCount + verifiedSupportingOnlyCount}`);

  console.log(`\nDiscrepancy Checks:`);
  console.log(`1. VERIFIED_PRIMARY products without primary_specification mapping: ${primaryWithoutPrimaryMapping.length}`);
  if (primaryWithoutPrimaryMapping.length > 0) {
    console.table(primaryWithoutPrimaryMapping);
  }

  console.log(`2. Supporting products WITH primary_specification mapping: ${supportingWithPrimaryMapping.length}`);
  if (supportingWithPrimaryMapping.length > 0) {
    console.table(supportingWithPrimaryMapping);
  }

  console.log(`3. Non-mapped products with unexpected status: ${nonMappedWithUnexpectedStatus.length}`);
  if (nonMappedWithUnexpectedStatus.length > 0) {
    console.table(nonMappedWithUnexpectedStatus);
  }

  await pool.end();
}

auditCoverage();
