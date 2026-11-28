const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const sectors = await pool.query(`
    SELECT ps.id, ps.sector_code, ps.division_council_code, ps.name, count(pf.id) as family_count
    FROM product_sectors ps
    LEFT JOIN product_families pf ON pf.sector_id = ps.id
    GROUP BY ps.id, ps.sector_code, ps.division_council_code, ps.name
    ORDER BY ps.id
  `);
  console.table(sectors.rows);

  const catCount = await pool.query('SELECT count(*) as count FROM product_categories');
  const famCount = await pool.query('SELECT count(*) as count FROM product_families');
  const aliasCount = await pool.query('SELECT count(*) as count FROM product_aliases');
  console.log(`Totals: categories=${catCount.rows[0].count}, families=${famCount.rows[0].count}, aliases=${aliasCount.rows[0].count}`);

  await pool.end();
}
check().catch(console.error);
