const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function normalizeStatuses() {
  console.log('=== NORMALIZING COVERAGE STATUSES ===');

  // 1. Update SUPPORTING_REFERENCES_ONLY to VERIFIED_SUPPORTING_ONLY
  const updateRes = await pool.query(`
    UPDATE product_families
    SET coverage_status = 'VERIFIED_SUPPORTING_ONLY', updated_at = NOW()
    WHERE coverage_status = 'SUPPORTING_REFERENCES_ONLY';
  `);
  console.log(`Updated ${updateRes.rowCount} product families from SUPPORTING_REFERENCES_ONLY to VERIFIED_SUPPORTING_ONLY.`);

  // 2. Query distinct coverage_status
  const statusRes = await pool.query(`
    SELECT coverage_status, count(*) as count
    FROM product_families
    GROUP BY coverage_status
    ORDER BY count DESC;
  `);
  console.log('\nUpdated Product Families coverage_status distribution:');
  console.table(statusRes.rows);

  // 3. Check for any illegal or unexpected statuses
  const illegalRes = await pool.query(`
    SELECT id, family_code, canonical_name, coverage_status
    FROM product_families
    WHERE coverage_status NOT IN (
      'VERIFIED_PRIMARY',
      'VERIFIED_SUPPORTING_ONLY',
      'CANDIDATE_UNVERIFIED',
      'NO_APPLICABLE_STANDARD_FOUND',
      'PRODUCT_CLARIFICATION_REQUIRED'
    );
  `);
  console.log(`Illegal/Unexpected statuses count: ${illegalRes.rows.length}`);

  // 4. Validate that total equals exactly 1047
  const totalRes = await pool.query('SELECT count(*) as total FROM product_families');
  console.log(`Total Product Families: ${totalRes.rows[0].total}`);

  await pool.end();
}

normalizeStatuses().catch(err => {
  console.error(err);
  pool.end();
});
