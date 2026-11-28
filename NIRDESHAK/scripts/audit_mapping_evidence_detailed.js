const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function auditMappingEvidence() {
  console.log('====================================================');
  console.log('NIRDESHAK ALL 1,201 MAPPINGS EVIDENCE AUDIT');
  console.log('====================================================\n');

  // 1. Total mappings count
  const countRes = await pool.query('SELECT count(*) as total FROM product_standard_mappings');
  const total = parseInt(countRes.rows[0].total, 10);
  console.log(`Total Relationship Rows: ${total}`);

  // 2. Foreign Key Integrity Check
  const brokenProductFk = await pool.query(`
    SELECT psm.id, psm.product_family_id 
    FROM product_standard_mappings psm 
    LEFT JOIN product_families pf ON psm.product_family_id = pf.id 
    WHERE pf.id IS NULL;
  `);
  console.log(`Broken Product Family FKs: ${brokenProductFk.rows.length}`);

  const brokenStandardFk = await pool.query(`
    SELECT psm.id, psm.standard_id 
    FROM product_standard_mappings psm 
    LEFT JOIN standards s ON psm.standard_id = s.id 
    WHERE s.id IS NULL;
  `);
  console.log(`Broken Standard FKs: ${brokenStandardFk.rows.length}`);

  // 3. Duplicate Mappings Check (same product + standard)
  const duplicates = await pool.query(`
    SELECT product_family_id, standard_id, count(*) as freq
    FROM product_standard_mappings
    GROUP BY product_family_id, standard_id
    HAVING count(*) > 1;
  `);
  console.log(`Duplicate (Product + Standard) pairs: ${duplicates.rows.length}`);
  if (duplicates.rows.length > 0) {
    console.table(duplicates.rows);
  }

  // 4. Missing Evidence Source
  const missingSource = await pool.query(`
    SELECT id, product_family_id, standard_id, relationship_type
    FROM product_standard_mappings
    WHERE evidence_source IS NULL OR TRIM(evidence_source) = '';
  `);
  console.log(`Mappings with NULL or Empty evidence_source: ${missingSource.rows.length}`);

  // 5. Missing Applicability Explanation
  const missingExplanation = await pool.query(`
    SELECT id, product_family_id, standard_id, relationship_type
    FROM product_standard_mappings
    WHERE applicability_explanation IS NULL OR TRIM(applicability_explanation) = '';
  `);
  console.log(`Mappings with NULL or Empty applicability_explanation: ${missingExplanation.rows.length}`);

  // 6. Generic Evidence Sources Audit
  // Examples of generic evidence: bare homepage URLs or vague generic phrases
  const genericSource = await pool.query(`
    SELECT id, product_family_id, standard_id, relationship_type, evidence_source, applicability_explanation
    FROM product_standard_mappings
    WHERE evidence_source ILIKE 'https://www.services.bis.gov.in/'
       OR evidence_source ILIKE 'https://www.services.bis.gov.in'
       OR evidence_source ILIKE 'http://www.services.bis.gov.in/'
       OR evidence_source ILIKE 'http://www.services.bis.gov.in'
       OR evidence_source ILIKE 'BIS Portal'
       OR evidence_source ILIKE 'Official Website'
       OR evidence_source ILIKE 'General Reference';
  `);
  console.log(`Mappings with Generic Evidence Sources (bare portal URL): ${genericSource.rows.length}`);

  // 7. Specific Evidence Breakdown
  const evidenceCategories = await pool.query(`
    SELECT 
      CASE 
        WHEN evidence_source ILIKE '%QCO%' OR evidence_source ILIKE '%Order%' OR evidence_source ILIKE '%Gazette%' OR evidence_source ILIKE '%S.O.%' THEN 'Statutory QCO / Gazette Order'
        WHEN evidence_source ILIKE '%Product Manual%' OR evidence_source ILIKE '%PM/%' THEN 'BIS Product Manual / LIMS'
        WHEN evidence_source ILIKE '%Council%' OR evidence_source ILIKE '%Committee%' OR evidence_source ILIKE '%CED%' OR evidence_source ILIKE '%ETD%' OR evidence_source ILIKE '%CHD%' OR evidence_source ILIKE '%MED%' OR evidence_source ILIKE '%TXD%' OR evidence_source ILIKE '%FAD%' OR evidence_source ILIKE '%MTD%' OR evidence_source ILIKE '%PCD%' THEN 'BIS Sectional Technical Committee Scope'
        WHEN evidence_source ILIKE '%IRC%' OR evidence_source ILIKE '%MORTH%' OR evidence_source ILIKE '%CPWD%' OR evidence_source ILIKE '%CEA%' OR evidence_source ILIKE '%RDSO%' THEN 'Departmental Specification (IRC/MORTH/CPWD/CEA/RDSO)'
        WHEN evidence_source ILIKE '%https://www.services.bis.gov.in/%' THEN 'BIS e-Sale Portal URL'
        ELSE 'Other Documented Source'
      END as evidence_category,
      count(*) as count
    FROM product_standard_mappings
    GROUP BY 1
    ORDER BY count DESC;
  `);
  console.log('\nEvidence Source Classification:');
  console.table(evidenceCategories.rows);

  // 8. Verification Status breakdown
  const verStatus = await pool.query(`
    SELECT verification_status, count(*) as count
    FROM product_standard_mappings
    GROUP BY verification_status
    ORDER BY count DESC;
  `);
  console.log('\nVerification Status Breakdown:');
  console.table(verStatus.rows);

  // 9. Mandatory Status breakdown
  const manStatus = await pool.query(`
    SELECT mandatory_status, count(*) as count
    FROM product_standard_mappings
    GROUP BY mandatory_status
    ORDER BY count DESC;
  `);
  console.log('\nMandatory Status Breakdown:');
  console.table(manStatus.rows);

  await pool.end();
}

auditMappingEvidence().catch(err => {
  console.error(err);
  pool.end();
});
