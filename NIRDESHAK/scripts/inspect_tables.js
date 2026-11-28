const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const sampleStandard = await pool.query(`
    SELECT is_number, title, scope, category, division_council, technical_requirements, materials, performance_requirements, safety_requirements, testing_requirements, certification
    FROM standards
    WHERE is_number IN ('IS 2925:1984', 'IS 5983:1980', 'IS 15298 (Part 2):2016', 'IS 694:2010', 'IS 269:2015')
    LIMIT 5;
  `);
  console.log('Sample Standards:', JSON.stringify(sampleStandard.rows, null, 2));

  await pool.end();
}

main().catch(console.error);
