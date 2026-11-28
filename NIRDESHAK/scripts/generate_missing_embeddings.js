require('dotenv').config();
const { Pool } = require('pg');
const {
  generateEmbedding,
  prepareTextForStandard,
  validateEmbedding,
  DEFAULT_EMBEDDING_MODEL,
  EXPECTED_DIMENSION
} = require('../embeddings');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateWithRetry(text, isNumber, maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      attempt++;
      const result = await generateEmbedding(text, {
        model: DEFAULT_EMBEDDING_MODEL,
        expectedDimension: EXPECTED_DIMENSION
      });

      validateEmbedding(result.values, EXPECTED_DIMENSION);
      return result.values;
    } catch (err) {
      console.warn(`[Embeddings Warning] Attempt ${attempt}/${maxRetries} failed for ${isNumber}: ${err.message}`);
      if (attempt >= maxRetries) {
        throw err;
      }
      await sleep(1500 * attempt);
    }
  }
}

async function generateMissingEmbeddings() {
  console.log(`[Embeddings]: Finding standards with missing embeddings in database...`);
  
  try {
    const res = await pool.query(`
      SELECT id, canonical_id, is_number, title, scope, category, description, application,
             technical_requirements, materials, performance_requirements,
             safety_requirements, testing_requirements, version, status
      FROM standards
      WHERE embedding IS NULL
      ORDER BY id ASC;
    `);

    const missing = res.rows;
    console.log(`[Embeddings]: Found ${missing.length} standards missing embeddings.`);

    if (missing.length === 0) {
      console.log('[Embeddings]: All standards already have 3072-dimensional embeddings.');
      return;
    }

    let success = 0;
    let failed = 0;

    for (let i = 0; i < missing.length; i++) {
      const std = missing[i];
      console.log(`[Embeddings] (${i + 1}/${missing.length}) Generating for ${std.is_number} (${std.canonical_id})...`);
      
      try {
        const text = prepareTextForStandard(std);
        const vectorValues = await generateWithRetry(text, std.is_number);
        const vectorStr = `[${vectorValues.join(',')}]`;

        await pool.query(
          `UPDATE standards SET embedding = $1::vector, updated_at = NOW() WHERE id = $2;`,
          [vectorStr, std.id]
        );

        success++;
        console.log(`[Embeddings] (${i + 1}/${missing.length}) Stored 3072-dim embedding for ${std.is_number}`);
        await sleep(350); // Be respectful of Gemini rate limits
      } catch (err) {
        console.error(`[Embeddings Error] Could not generate embedding for ${std.is_number}:`, err.message);
        failed++;
      }
    }

    console.log(`\n================================================================================`);
    console.log(`EMBEDDINGS GENERATION COMPLETE: ${success} succeeded, ${failed} failed.`);
    console.log(`================================================================================\n`);

  } finally {
    await pool.end();
  }
}

generateMissingEmbeddings().catch(err => {
  console.error(err);
  process.exit(1);
});
