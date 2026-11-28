const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runAudit() {
  console.log('=== 1. DATABASE COUNT RECONCILIATION ===');
  
  // Total Product Families
  const pfTotal = await pool.query('SELECT count(*) as total FROM product_families');
  console.log('Product Families Total:', pfTotal.rows[0].total);

  // Status breakdown in product_families
  const pfStatuses = await pool.query(`
    SELECT coverage_status, count(*) as count 
    FROM product_families 
    GROUP BY coverage_status 
    ORDER BY count DESC
  `);
  console.log('\nProduct Families by coverage_status:');
  console.table(pfStatuses.rows);

  // Standards Total, with and without embeddings
  const stdTotal = await pool.query(`
    SELECT 
      count(*) as total_standards,
      count(embedding) as with_embedding,
      count(*) - count(embedding) as without_embedding
    FROM standards
  `);
  console.log('\nStandards Embedding Counts:');
  console.table(stdTotal.rows);

  // Product-Standard Mappings
  const psmTotal = await pool.query(`
    SELECT 
      count(*) as total_mappings,
      count(DISTINCT product_family_id) as distinct_products_mapped,
      count(DISTINCT standard_id) as distinct_standards_mapped
    FROM product_standard_mappings
  `);
  console.log('\nProduct-Standard Mappings Total:');
  console.table(psmTotal.rows);

  const psmTypes = await pool.query(`
    SELECT relationship_type, count(*) as count 
    FROM product_standard_mappings 
    GROUP BY relationship_type 
    ORDER BY count DESC
  `);
  console.log('\nMappings by relationship_type:');
  console.table(psmTypes.rows);

  console.log('\n=== 2. DIVISION COUNCIL RECONCILIATION ===');
  const councilSummary = await pool.query(`
    SELECT 
      division_council,
      count(*) as total_products,
      count(*) FILTER (WHERE coverage_status = 'VERIFIED_PRIMARY') as verified_primary,
      count(*) FILTER (WHERE coverage_status = 'SUPPORTING_REFERENCES_ONLY') as supporting_ref_only,
      count(*) FILTER (WHERE coverage_status = 'VERIFIED_SUPPORTING_ONLY') as verified_supporting_only,
      count(*) FILTER (WHERE coverage_status IN ('SUPPORTING_REFERENCES_ONLY', 'VERIFIED_SUPPORTING_ONLY')) as all_supporting,
      count(*) FILTER (WHERE coverage_status = 'CANDIDATE_UNVERIFIED') as candidate_unverified,
      count(*) FILTER (WHERE coverage_status = 'NO_APPLICABLE_STANDARD_FOUND') as no_applicable_std,
      count(*) FILTER (WHERE coverage_status = 'PRODUCT_CLARIFICATION_REQUIRED') as clarification_req,
      count(*) FILTER (WHERE coverage_status = 'DISCOVERED_CATALOGUE_ONLY') as discovered_catalogue_only
    FROM product_families
    GROUP BY division_council
    ORDER BY total_products DESC
  `);
  console.table(councilSummary.rows);

  // Investigate the 11 records with VERIFIED_SUPPORTING_ONLY vs SUPPORTING_REFERENCES_ONLY
  console.log('\n=== INVESTIGATING THE 11 RECORDS ===');
  const elevenRecords = await pool.query(`
    SELECT pf.id, pf.family_code, pf.canonical_name, pf.division_council, pf.coverage_status,
           psm.relationship_type, s.is_number, s.title
    FROM product_families pf
    LEFT JOIN product_standard_mappings psm ON pf.id = psm.product_family_id
    LEFT JOIN standards s ON psm.standard_id = s.id
    WHERE pf.coverage_status = 'VERIFIED_SUPPORTING_ONLY'
    ORDER BY pf.id
  `);
  console.table(elevenRecords.rows);

  await pool.end();
}

runAudit().catch(err => {
  console.error(err);
  pool.end();
});
