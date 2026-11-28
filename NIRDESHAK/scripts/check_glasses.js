const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const glasses = await pool.query(`
    SELECT is_number, title, scope, category, division_council, technical_requirements, materials, performance_requirements, safety_requirements, testing_requirements, certification
    FROM standards
    WHERE is_number = 'IS 5983:1980';
  `);
  console.log('IS 5983:', JSON.stringify(glasses.rows[0], null, 2));

  // Let's also check how product_families maps to IS 5983
  const mapping = await pool.query(`
    SELECT pf.canonical_name, pf.division_council, s.is_number, s.title, psm.relationship_type
    FROM product_families pf
    JOIN product_standard_mappings psm ON pf.id = psm.product_family_id
    JOIN standards s ON psm.standard_id = s.id
    WHERE pf.canonical_name ILIKE '%eye%' OR pf.canonical_name ILIKE '%glass%' OR s.is_number = 'IS 5983:1980';
  `);
  console.log('Glasses mappings:', JSON.stringify(mapping.rows, null, 2));

  await pool.end();
}

main().catch(console.error);
