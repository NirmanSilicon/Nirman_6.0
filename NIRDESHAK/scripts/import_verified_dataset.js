// =========================================================
// Nirdeshak - Verified Dataset Ingestion Script
// Imports 16 primary candidates + 3 supporting references
// Target Database: nirdeshak_clean_20261126
// =========================================================

const fs = require('fs');
const path = require('path');
const { getCleanPool, NEW_DB_NAME } = require('./setup_clean_database');

async function importVerifiedDataset() {
  const dataPath = path.join(__dirname, '..', 'data', 'verified_standards.json');
  const relPath = path.join(__dirname, '..', 'data', 'standard_relationships.json');

  if (!fs.existsSync(dataPath)) {
    throw new Error(`Data file not found at ${dataPath}`);
  }

  const standards = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const relationships = JSON.parse(fs.readFileSync(relPath, 'utf8'));

  console.log(`[Import]: Loaded ${standards.length} standards from JSON.`);
  console.log(`[Import]: Loaded ${relationships.length} relationships from JSON.`);

  if (standards.length !== 19) {
    throw new Error(`Expected exactly 19 standards, found ${standards.length}`);
  }

  const client = await getCleanPool().connect();
  try {
    await client.query('BEGIN;');

    // Step 1: Clean any existing records in clean database (resumable)
    await client.query('TRUNCATE standard_relationships, standards RESTART IDENTITY CASCADE;');

    // Step 2: Insert standards
    console.log(`[Import]: Inserting 19 standards into '${NEW_DB_NAME}'...`);
    const isNumberToIdMap = new Map();

    const insertStandardSql = `
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
        safety_requirements,
        testing_requirements,
        version,
        publication_year,
        status,
        amendments,
        supersedes,
        superseded_by,
        certification,
        source,
        is_primary_candidate
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      ) RETURNING id, is_number, canonical_id;
    `;

    for (const std of standards) {
      const res = await client.query(insertStandardSql, [
        std.canonical_id,
        std.is_number,
        std.title,
        std.scope,
        std.category,
        std.description,
        std.application,
        JSON.stringify(std.technical_requirements || []),
        JSON.stringify(std.materials || []),
        JSON.stringify(std.performance_requirements || []),
        JSON.stringify(std.safety_requirements || []),
        JSON.stringify(std.testing_requirements || []),
        std.version,
        std.publication_year,
        std.status,
        JSON.stringify(std.amendments || []),
        JSON.stringify(std.supersedes || []),
        JSON.stringify(std.superseded_by || []),
        JSON.stringify(std.certification || {}),
        std.source,
        std.is_primary_candidate
      ]);

      const inserted = res.rows[0];
      isNumberToIdMap.set(inserted.is_number, inserted.id);
      isNumberToIdMap.set(inserted.canonical_id, inserted.id);
    }

    console.log(`[Import]: Successfully inserted ${standards.length} standards.`);

    // Step 3: Insert relationships
    console.log(`[Import]: Inserting standard relationships...`);
    const insertRelSql = `
      INSERT INTO standard_relationships (
        source_standard_id,
        target_standard_id,
        source_is_number,
        target_is_number,
        relationship_type,
        evidence,
        source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7);
    `;

    let insertedRelCount = 0;
    for (const rel of relationships) {
      const sourceId = isNumberToIdMap.get(rel.source_is_number) || isNumberToIdMap.get(rel.source_canonical_id) || null;
      const targetId = isNumberToIdMap.get(rel.target_is_number) || isNumberToIdMap.get(rel.target_canonical_id) || null;

      await client.query(insertRelSql, [
        sourceId,
        targetId,
        rel.source_is_number,
        rel.target_is_number,
        rel.relationship_type,
        rel.evidence,
        'OFFICIAL_BIS_STANDARDS_RELATIONSHIP'
      ]);
      insertedRelCount++;
    }

    console.log(`[Import]: Successfully inserted ${insertedRelCount} relationships.`);

    await client.query('COMMIT;');
    console.log(`[Import]: Ingestion transaction committed successfully.`);

    // Step 4: Verification queries
    const countCheck = await client.query('SELECT COUNT(*) as total FROM standards;');
    const primaryCheck = await client.query('SELECT COUNT(*) as primary_count FROM standards WHERE is_primary_candidate = true;');
    const supportingCheck = await client.query('SELECT COUNT(*) as supporting_count FROM standards WHERE is_primary_candidate = false;');
    const relCheck = await client.query('SELECT COUNT(*) as rel_count FROM standard_relationships;');

    console.log('[Import Verification]:', {
      total_standards: parseInt(countCheck.rows[0].total, 10),
      primary_standards: parseInt(primaryCheck.rows[0].primary_count, 10),
      supporting_standards: parseInt(supportingCheck.rows[0].supporting_count, 10),
      relationships: parseInt(relCheck.rows[0].rel_count, 10)
    });

    return {
      success: true,
      total_standards: parseInt(countCheck.rows[0].total, 10),
      primary_standards: parseInt(primaryCheck.rows[0].primary_count, 10),
      supporting_standards: parseInt(supportingCheck.rows[0].supporting_count, 10),
      relationships: parseInt(relCheck.rows[0].rel_count, 10)
    };
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error(`[Import Error]: Transaction rolled back:`, err.message);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  importVerifiedDataset()
    .then(r => {
      console.log('Result:', r);
      process.exit(0);
    })
    .catch(err => {
      console.error('Import failed:', err);
      process.exit(1);
    });
}

module.exports = { importVerifiedDataset };
