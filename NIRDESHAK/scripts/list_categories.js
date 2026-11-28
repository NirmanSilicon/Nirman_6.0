const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const cats = await pool.query(`
    SELECT pc.id, pc.sector_id, ps.sector_code, pc.category_name
    FROM product_categories pc
    JOIN product_sectors ps ON ps.id = pc.sector_id
    ORDER BY pc.sector_id, pc.id
  `);
  console.log('Categories list:');
  cats.rows.forEach(c => console.log(`[${c.id}] Sector ${c.sector_id} (${c.sector_code}): ${c.category_name}`));
  await pool.end();
}
check().catch(console.error);
