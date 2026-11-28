const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  console.log('Fixing NULL evidence sources for mapping 50 and 51...');
  
  await pool.query(`
    UPDATE product_standard_mappings 
    SET evidence_source = 'https://www.services.bis.gov.in/php/BIS_2.0/bisconnect/knowyourstandards/indian_standards/isdetails/1349 (Ministry of Steel QCO S.O. 281(E), Schedule Serial 2)'
    WHERE id = 50
  `);

  await pool.query(`
    UPDATE product_standard_mappings 
    SET evidence_source = 'https://www.services.bis.gov.in/php/BIS_2.0/bisconnect/knowyourstandards/indian_standards/isdetails/3001 (DPIIT Footwear QCO S.O. 3857(E) / QCO 2023)'
    WHERE id = 51
  `);

  const res = await pool.query('SELECT id, product_family_id, standard_id, evidence_source FROM product_standard_mappings WHERE id IN (50, 51)');
  console.log('Verification result:', res.rows);
  
  const nullCheck = await pool.query('SELECT count(*) FROM product_standard_mappings WHERE evidence_source IS NULL');
  console.log('Remaining NULL evidence sources in product_standard_mappings:', nullCheck.rows[0].count);

  console.log('Fixing sector_id for 24 Metallurgical Engineering product families...');
  const fixSectorRes = await pool.query(`
    UPDATE product_families 
    SET sector_id = 11 
    WHERE division_council = 'Metallurgical Engineering' AND sector_id IS NULL
  `);
  console.log('Updated Metallurgical Engineering families sector_id:', fixSectorRes.rowCount);

  const remainingSectorNull = await pool.query('SELECT count(*) FROM product_families WHERE sector_id IS NULL');
  console.log('Remaining product_families with sector_id NULL:', remainingSectorNull.rows[0].count);

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
