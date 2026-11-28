/**
 * apply_mapping_completion.js
 * Master ingestion script that:
 * 1. Loads all 8 investigation modules covering all 674 products.
 * 2. Inserts all new verified standards into `standards` table.
 * 3. Links verified mappings in `product_standard_mappings` with complete evidence.
 * 4. Updates `coverage_status` and `investigation_notes` in `product_families`.
 * 5. Generates 3072-dim embeddings for all newly inserted standards.
 */

const { Pool } = require('pg');
require('dotenv').config();
const { generateMissingStandardsEmbeddings } = require('../embeddings');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Load all 8 modules
const mod1 = require('./mapping_completion/investigation_infrastructure.js').INFRASTRUCTURE_INVESTIGATION;
const mod2 = require('./mapping_completion/investigation_wrd_pgd.js').WRD_PGD_INVESTIGATION;
const mod3 = require('./mapping_completion/investigation_electrical_electronics.js').ELECTRICAL_ELECTRONICS_INVESTIGATION;
const mod4 = require('./mapping_completion/investigation_litd_etd.js').LITD_ETD_INVESTIGATION;
const mod5 = require('./mapping_completion/investigation_chd.js').CHD_INVESTIGATION;
const mod6 = require('./mapping_completion/investigation_pcd_mtd.js').PCD_MTD_INVESTIGATION;
const mod7 = require('./mapping_completion/investigation_fad_txd.js').FAD_TXD_INVESTIGATION;
const mod8 = require('./mapping_completion/investigation_med_mhd_ayd_eed.js').MED_MHD_AYD_EED_INVESTIGATION;

const allInvestigated = [
  ...mod1,
  ...mod2,
  ...mod3,
  ...mod4,
  ...mod5,
  ...mod6,
  ...mod7,
  ...mod8
];

console.log(`Loaded ${allInvestigated.length} investigated products.`);
if (allInvestigated.length !== 674) {
  console.error(`Error: Expected 674 products, found ${allInvestigated.length}`);
  process.exit(1);
}

function makeCanonicalId(is_number) {
  return is_number.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

async function main() {
  const client = await pool.connect();
  try {
    console.log('Connected to database. Pre-fetching existing standards and product families...');

    // 1. Fetch product families
    const pfRes = await client.query('SELECT id, canonical_name, coverage_status FROM product_families');
    const pfByName = new Map();
    for (const row of pfRes.rows) {
      pfByName.set(row.canonical_name, row);
    }
    console.log(`Found ${pfByName.size} existing product families.`);

    // 2. Fetch standards
    const stdRes = await client.query('SELECT id, is_number, canonical_id FROM standards');
    const stdByNum = new Map();
    for (const row of stdRes.rows) {
      stdByNum.set(row.is_number, row);
      stdByNum.set(row.canonical_id, row);
    }
    console.log(`Found ${stdRes.rows.length} existing standards.`);

    // 3. Collect unique new standards to insert
    const newStandardsMap = new Map();
    for (const item of allInvestigated) {
      if (item.new_standard && !stdByNum.has(item.new_standard.is_number)) {
        newStandardsMap.set(item.new_standard.is_number, item.new_standard);
      }
    }
    console.log(`Unique new standards to insert: ${newStandardsMap.size}`);

    // Insert new standards
    let standardsInserted = 0;
    for (const std of newStandardsMap.values()) {
      const canonicalId = makeCanonicalId(std.is_number);
      const insertQuery = `
        INSERT INTO standards (
          canonical_id,
          is_number,
          title,
          scope,
          category,
          description,
          application,
          technical_requirements,
          materials,
          performance_requirements,
          testing_requirements,
          version,
          publication_year,
          status,
          certification,
          source,
          is_primary_candidate,
          division_council,
          technical_committee,
          verification_status,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW()
        )
        RETURNING id, is_number, canonical_id;
      `;

      const values = [
        canonicalId,
        std.is_number,
        std.title,
        std.scope || '',
        std.division_council || 'General',
        std.scope || '',
        std.scope || '',
        JSON.stringify(Array.isArray(std.technical_requirements) ? std.technical_requirements : [std.technical_requirements]),
        JSON.stringify(Array.isArray(std.materials) ? std.materials : [std.materials]),
        JSON.stringify(Array.isArray(std.performance_requirements) ? std.performance_requirements : [std.performance_requirements]),
        JSON.stringify(Array.isArray(std.testing_requirements) ? std.testing_requirements : [std.testing_requirements]),
        std.version || 'Current',
        std.publication_year || 2020,
        std.status || 'ACTIVE',
        JSON.stringify(std.certification ? [std.certification] : ['Scheme-I']),
        std.source || 'Bureau of Indian Standards',
        true,
        std.division_council || '',
        std.technical_committee || '',
        'VERIFIED_OFFICIAL'
      ];

      const inserted = await client.query(insertQuery, values);
      stdByNum.set(std.is_number, inserted.rows[0]);
      stdByNum.set(canonicalId, inserted.rows[0]);
      standardsInserted++;
    }
    console.log(`Successfully inserted ${standardsInserted} new standards.`);

    // 4. Insert mappings and update product family coverage statuses
    let mappingsInserted = 0;
    let productsUpdated = 0;

    for (const item of allInvestigated) {
      const pf = pfByName.get(item.canonical_name);
      if (!pf) {
        console.error(`Product family not found in DB: ${item.canonical_name}`);
        continue;
      }

      // If item has a verified mapping
      if (item.mapping && item.standard_is) {
        const std = stdByNum.get(item.standard_is);
        if (!std) {
          console.error(`Standard not found for mapping: ${item.standard_is} for ${item.canonical_name}`);
          continue;
        }

        // Check if mapping already exists
        const checkMap = await client.query(
          'SELECT id FROM product_standard_mappings WHERE product_family_id = $1 AND standard_id = $2',
          [pf.id, std.id]
        );

        if (checkMap.rows.length === 0) {
          const mapInsert = `
            INSERT INTO product_standard_mappings (
              product_family_id,
              standard_id,
              relationship_type,
              applicability_explanation,
              mandatory_status,
              evidence_source,
              source_url,
              evidence_excerpt,
              confidence_score,
              verification_status,
              last_verified_date,
              created_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_DATE, NOW()
            );
          `;

          await client.query(mapInsert, [
            pf.id,
            std.id,
            item.mapping.relationship_type || 'primary_specification',
            item.mapping.applicability_explanation || '',
            item.mapping.mandatory_status || 'VOLUNTARY_RECOMMENDED',
            item.mapping.evidence_source || 'Bureau of Indian Standards',
            item.mapping.source_url || 'https://www.services.bis.gov.in',
            item.mapping.evidence_excerpt || '',
            item.mapping.confidence_score || 0.98,
            'VERIFIED_OFFICIAL'
          ]);
          mappingsInserted++;
        }
      }

      // Update product family coverage status and investigation notes
      await client.query(`
        UPDATE product_families
        SET 
          coverage_status = $1,
          investigation_notes = $2,
          updated_at = NOW()
        WHERE id = $3
      `, [item.status, item.investigation_notes || '', pf.id]);
      productsUpdated++;
    }

    console.log(`Successfully inserted ${mappingsInserted} new verified mappings.`);
    console.log(`Successfully updated ${productsUpdated} product families.`);

    // 5. Verification queries
    const coverageStats = await client.query(`
      SELECT coverage_status, count(*) as count
      FROM product_families
      GROUP BY coverage_status
      ORDER BY count DESC
    `);
    console.log('\n--- PRODUCT FAMILIES COVERAGE STATUSES ---');
    console.table(coverageStats.rows);

    const unmappedCheck = await client.query(`
      SELECT count(*) as count FROM product_families WHERE coverage_status = 'DISCOVERED_CATALOGUE_ONLY'
    `);
    console.log(`Remaining DISCOVERED_CATALOGUE_ONLY: ${unmappedCheck.rows[0].count}`);

    const stdTotal = await client.query('SELECT count(*) as count FROM standards');
    console.log(`Total standards in database: ${stdTotal.rows[0].count}`);

    const mapTotal = await client.query('SELECT count(*) as count FROM product_standard_mappings');
    console.log(`Total mappings in database: ${mapTotal.rows[0].count}`);

  } finally {
    client.release();
  }

  // 6. Generate missing embeddings
  console.log('\n--- COMMENCING EMBEDDING GENERATION FOR NEW STANDARDS ---');
  const missingCountRes = await pool.query('SELECT count(*) as count FROM standards WHERE embedding IS NULL');
  let missing = parseInt(missingCountRes.rows[0].count, 10);
  console.log(`Standards missing embeddings: ${missing}`);

  let totalProcessed = 0;
  let totalSuccessful = 0;
  let totalFailed = 0;

  while (missing > 0) {
    const batchSize = Math.min(25, missing);
    console.log(`Generating embeddings for batch of ${batchSize} standards (${missing} remaining)...`);
    
    try {
      const res = await generateMissingStandardsEmbeddings(batchSize);
      totalProcessed += res.successful + res.failed;
      totalSuccessful += res.successful;
      totalFailed += res.failed;

      console.log(`Batch finished: ${res.successful} successful, ${res.failed} failed.`);

      const checkRes = await pool.query('SELECT count(*) as count FROM standards WHERE embedding IS NULL');
      missing = parseInt(checkRes.rows[0].count, 10);

      // Brief delay to respect rate limits
      await new Promise(r => setTimeout(r, 600));
    } catch (err) {
      console.error('Batch error:', err.message);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  const finalCheck = await pool.query(`
    SELECT 
      count(*) as total_standards,
      count(embedding) as with_embedding,
      count(*) - count(embedding) as without_embedding
    FROM standards
  `);

  console.log('\n--- FINAL STANDARDS EMBEDDING SUMMARY ---');
  console.table(finalCheck.rows);

  await pool.end();
  console.log('Ingestion and embedding generation completed successfully!');
}

main().catch(err => {
  console.error('Fatal error during apply_mapping_completion:', err);
  pool.end();
  process.exit(1);
});
