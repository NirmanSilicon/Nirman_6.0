const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function verify() {
  console.log('====================================================');
  console.log('NIRDESHAK FINAL DATABASE VERIFICATION');
  console.log('====================================================\n');

  // 1. Total Product Families
  const pfRes = await pool.query('SELECT count(*) as total FROM product_families');
  console.log(`Total Product Families: ${pfRes.rows[0].total}`);

  // 2. Status distribution
  const statusRes = await pool.query('SELECT coverage_status, count(*) as count FROM product_families GROUP BY coverage_status ORDER BY count DESC');
  console.log('\nProduct Coverage Status Distribution:');
  console.table(statusRes.rows);

  // 3. Check DISCOVERED_CATALOGUE_ONLY
  const discRes = await pool.query("SELECT count(*) as count FROM product_families WHERE coverage_status = 'DISCOVERED_CATALOGUE_ONLY'");
  console.log(`\nRemaining DISCOVERED_CATALOGUE_ONLY: ${discRes.rows[0].count}`);

  // 4. Standards count and embeddings
  const stdRes = await pool.query('SELECT count(*) as total, count(embedding) as with_embedding, count(*) - count(embedding) as without_embedding FROM standards');
  console.log('\nStandards Count & Embeddings:');
  console.table(stdRes.rows);

  // 5. Product Standard Mappings count
  const mapRes = await pool.query('SELECT relationship_type, count(*) as count FROM product_standard_mappings GROUP BY relationship_type ORDER BY count DESC');
  console.log('\nProduct Standard Mappings:');
  console.table(mapRes.rows);

  // 6. Distribution across 17 Division Councils
  const councilRes = await pool.query(`
    SELECT 
      pf.division_council,
      count(DISTINCT pf.id) as total_products,
      count(DISTINCT CASE WHEN pf.coverage_status = 'VERIFIED_PRIMARY' THEN pf.id END) as verified_primary,
      count(DISTINCT CASE WHEN pf.coverage_status = 'SUPPORTING_REFERENCES_ONLY' THEN pf.id END) as supporting_only,
      count(DISTINCT CASE WHEN pf.coverage_status = 'CANDIDATE_UNVERIFIED' THEN pf.id END) as candidate_unverified,
      count(DISTINCT CASE WHEN pf.coverage_status = 'NO_APPLICABLE_STANDARD_FOUND' THEN pf.id END) as no_std_found,
      count(DISTINCT CASE WHEN pf.coverage_status = 'PRODUCT_CLARIFICATION_REQUIRED' THEN pf.id END) as clarification_req
    FROM product_families pf
    GROUP BY pf.division_council
    ORDER BY total_products DESC;
  `);
  console.log('\nCouncil-by-Council Breakdown:');
  console.table(councilRes.rows);

  await pool.end();
}

verify().catch(err => {
  console.error(err);
  pool.end();
});
