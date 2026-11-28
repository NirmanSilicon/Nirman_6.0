const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function listAll() {
  const res = await pool.query(`
    SELECT psm.id, psm.product_family_id, psm.standard_id, psm.relationship_type, psm.mandatory_status,
           pf.canonical_name, s.is_number, s.title, s.technical_committee, s.division_council, s.certification
    FROM product_standard_mappings psm
    JOIN product_families pf ON psm.product_family_id = pf.id
    JOIN standards s ON psm.standard_id = s.id
    WHERE psm.evidence_source ILIKE '%https://www.services.bis.gov.in/%'
       OR psm.evidence_source ILIKE '%https://www.services.bis.gov.in'
    ORDER BY psm.id ASC;
  `);

  res.rows.forEach(r => {
    console.log(`ID ${r.id} | Product: "${r.canonical_name}" | Standard: ${r.is_number} | TC: ${r.technical_committee} | Mand: ${r.mandatory_status}`);
  });

  await pool.end();
}

listAll();
