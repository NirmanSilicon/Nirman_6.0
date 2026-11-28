const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function inspectGeneric() {
  const res = await pool.query(`
    SELECT psm.id, psm.product_family_id, psm.standard_id, psm.relationship_type, psm.mandatory_status,
           pf.canonical_name, s.is_number, s.title, s.technical_committee, s.division_council,
           psm.evidence_source, psm.applicability_explanation
    FROM product_standard_mappings psm
    JOIN product_families pf ON psm.product_family_id = pf.id
    JOIN standards s ON psm.standard_id = s.id
    WHERE psm.evidence_source ILIKE '%https://www.services.bis.gov.in/%'
       OR psm.evidence_source ILIKE '%https://www.services.bis.gov.in'
    ORDER BY psm.id ASC;
  `);

  console.log(`Found ${res.rows.length} mappings with generic portal URL.`);
  console.log('Sample rows:');
  console.table(res.rows.slice(0, 10).map(r => ({
    id: r.id,
    product: r.canonical_name,
    standard: r.is_number,
    committee: r.technical_committee,
    evidence: r.evidence_source
  })));

  await pool.end();
}

inspectGeneric();
