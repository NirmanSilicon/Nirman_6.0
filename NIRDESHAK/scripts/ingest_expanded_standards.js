/**
 * Ingest Expanded Verified BIS Standards into PostgreSQL database
 */
const { Pool } = require('pg');
require('dotenv').config();

const { EXPANDED_STANDARDS: s1 } = require('./expansion/standards_data');
const { ETD_STANDARDS: s2 } = require('./expansion/standards_etd');
const { MED_STANDARDS: s3 } = require('./expansion/standards_med');
const { CHD_STANDARDS: s4, MTD_STANDARDS: s5 } = require('./expansion/standards_chd_mtd');
const { LITD_STANDARDS: s6, MHD_STANDARDS: s7, FAD_STANDARDS: s8 } = require('./expansion/standards_litd_mhd_fad');
const { OTHER_COUNCILS_STANDARDS: s9 } = require('./expansion/standards_other_councils');
const { ADDITIONAL_STANDARDS: s10 } = require('./expansion/standards_additional');
const { BATCH2_STANDARDS: s11 } = require('./expansion/standards_registry_batch2');
const { BATCH3_STANDARDS: s12 } = require('./expansion/standards_registry_batch3');
const { BATCH4_STANDARDS: s13 } = require('./expansion/standards_registry_batch4');
const { BATCH5_STANDARDS: s14 } = require('./expansion/standards_registry_batch5');

const allCurated = [...s1, ...s2, ...s3, ...s4, ...s5, ...s6, ...s7, ...s8, ...s9, ...s10, ...s11, ...s12, ...s13, ...s14];

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function ingest() {
  console.log(`Loaded ${allCurated.length} curated standards across 14 modules.`);

  // Deduplicate by is_number
  const uniqueMap = new Map();
  for (const s of allCurated) {
    if (!uniqueMap.has(s.is_number)) {
      uniqueMap.set(s.is_number, s);
    }
  }
  console.log(`Unique curated standards: ${uniqueMap.size}`);

  const existingRes = await pool.query('SELECT is_number FROM standards');
  const existingSet = new Set(existingRes.rows.map(r => r.is_number));
  console.log(`Existing standards in DB: ${existingSet.size}`);

  let inserted = 0;
  let skipped = 0;

  for (const s of uniqueMap.values()) {
    if (existingSet.has(s.is_number)) {
      skipped++;
      continue;
    }

    const insertQuery = `
      INSERT INTO standards (
        canonical_id, is_number, title, scope, category, description, application,
        technical_requirements, materials, performance_requirements, safety_requirements,
        testing_requirements, version, publication_year, reaffirmation_year, status,
        certification, source, is_primary_candidate, division_council, standard_type,
        technical_committee, verification_status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11,
        $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21,
        $22, $23
      )
    `;

    const values = [
      s.canonical_id || `IS-${s.is_number.replace(/[^A-Za-z0-9]/g, '-')}`,
      s.is_number,
      s.title,
      s.scope || null,
      s.category || null,
      s.description || null,
      s.application || null,
      s.technical_requirements ? JSON.stringify(s.technical_requirements) : null,
      s.materials ? JSON.stringify(s.materials) : null,
      s.performance_requirements ? JSON.stringify(s.performance_requirements) : null,
      s.safety_requirements ? JSON.stringify(s.safety_requirements) : null,
      s.testing_requirements ? JSON.stringify(s.testing_requirements) : null,
      s.version || 'Current Edition',
      s.publication_year || null,
      s.reaffirmation_year || null,
      s.status || 'active',
      s.certification ? JSON.stringify(s.certification) : JSON.stringify({ regulatory_class: 'Class B', mandatory: false }),
      s.source || 'https://www.services.bis.gov.in',
      s.is_primary_candidate !== undefined ? s.is_primary_candidate : true,
      s.division_council || 'Civil Engineering',
      s.standard_type || 'specification',
      s.technical_committee || null,
      'VERIFIED'
    ];

    await pool.query(insertQuery, values);
    inserted++;
  }

  const finalRes = await pool.query('SELECT count(*) as count FROM standards');
  console.log(`\n--- INGESTION COMPLETE ---`);
  console.log(`Newly inserted: ${inserted}`);
  console.log(`Skipped existing: ${skipped}`);
  console.log(`Total standards in DB now: ${finalRes.rows[0].count}`);

  const councilBreakdown = await pool.query(`
    SELECT division_council, count(*) as count 
    FROM standards 
    GROUP BY division_council 
    ORDER BY count DESC
  `);
  console.table(councilBreakdown.rows);

  await pool.end();
}

ingest().catch(err => {
  console.error('Ingestion failed:', err);
  pool.end();
});
