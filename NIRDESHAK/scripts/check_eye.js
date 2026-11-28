const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const stds = await pool.query(`
    SELECT is_number, title, category, division_council
    FROM standards
    WHERE title ILIKE '%eye%' OR title ILIKE '%spectacle%' OR title ILIKE '%goggle%' OR is_number ILIKE '%5983%' OR is_number ILIKE '%8521%' OR title ILIKE '%protective%'
    LIMIT 10;
  `);
  console.log('Standards matching:', stds.rows);

  const pf = await pool.query(`
    SELECT canonical_name, division_council, subcategory, technical_keywords
    FROM product_families
    WHERE canonical_name ILIKE '%eye%' OR canonical_name ILIKE '%spectacle%' OR canonical_name ILIKE '%goggle%' OR canonical_name ILIKE '%safety glass%'
    LIMIT 10;
  `);
  console.log('Product families matching:', pf.rows);

  await pool.end();
}

main().catch(console.error);
