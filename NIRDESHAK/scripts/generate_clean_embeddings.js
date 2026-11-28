// =========================================================
// Nirdeshak - Embeddings Generation for Clean Database
// Generates 3072-dimensional vector embeddings for all 19 standards
// Target: nirdeshak_clean_20261126
// =========================================================

const { getCleanPool, NEW_DB_NAME } = require('./setup_clean_database');
const {
  generateEmbedding,
  prepareTextForStandard,
  validateEmbedding,
  DEFAULT_EMBEDDING_MODEL,
  EXPECTED_DIMENSION
} = require('../embeddings');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateWithRetry(text, isNumber, maxRetries = 4) {
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
      // Exponential backoff with jitter
      const backoff = Math.pow(2, attempt) * 1000 + Math.random() * 500;
      await sleep(backoff);
    }
  }
}

async function generateCleanEmbeddings() {
  console.log(`[Embeddings]: Generating embeddings for '${NEW_DB_NAME}' using model '${DEFAULT_EMBEDDING_MODEL}' (Dim: ${EXPECTED_DIMENSION})...`);

  const pool = getCleanPool();
  try {
    // 1. Fetch standards missing embeddings or fetch all
    const selectRes = await pool.query(`
      SELECT 
        id, is_number, title, scope, category, description, application,
        technical_requirements, materials, performance_requirements,
        safety_requirements, testing_requirements, version, status
      FROM standards
      WHERE embedding IS NULL
      ORDER BY id ASC;
    `);

    const missingStandards = selectRes.rows;
    console.log(`[Embeddings]: Found ${missingStandards.length} standards needing embeddings.`);

    if (missingStandards.length === 0) {
      console.log(`[Embeddings]: All standards in '${NEW_DB_NAME}' already have embeddings.`);
    }

    let successCount = 0;
    const failedStandards = [];

    for (let i = 0; i < missingStandards.length; i++) {
      const std = missingStandards[i];
      const isNumber = std.is_number;
      console.log(`[Embeddings] (${i + 1}/${missingStandards.length}) Processing: ${isNumber}...`);

      try {
        const textToEmbed = prepareTextForStandard(std);
        const vectorValues = await generateWithRetry(textToEmbed, isNumber);

        // Format for pgvector: '[v1, v2, ...]'
        const vectorStr = `[${vectorValues.join(',')}]`;

        await pool.query(
          `UPDATE standards SET embedding = $1::vector, updated_at = NOW() WHERE id = $2;`,
          [vectorStr, std.id]
        );

        successCount++;
        console.log(`[Embeddings] (${i + 1}/${missingStandards.length}) Embedded ${isNumber} successfully (3072-dim).`);

        // Brief delay between API calls to avoid rate limits
        await sleep(400);
      } catch (err) {
        console.error(`[Embeddings Error] Failed to generate/store embedding for ${isNumber}:`, err.message);
        failedStandards.push({ id: std.id, is_number: isNumber, error: err.message });
      }
    }

    // Verification check
    const totalCheck = await pool.query('SELECT COUNT(*) as total FROM standards;');
    const embeddedCheck = await pool.query('SELECT COUNT(*) as embedded FROM standards WHERE embedding IS NOT NULL;');
    const missingCheck = await pool.query('SELECT COUNT(*) as missing FROM standards WHERE embedding IS NULL;');
    const dimsCheck = await pool.query('SELECT is_number, vector_dims(embedding) as dim FROM standards WHERE embedding IS NOT NULL ORDER BY id ASC;');

    const total = parseInt(totalCheck.rows[0].total, 10);
    const embedded = parseInt(embeddedCheck.rows[0].embedded, 10);
    const missing = parseInt(missingCheck.rows[0].missing, 10);

    const incorrectDims = dimsCheck.rows.filter(r => r.dim !== EXPECTED_DIMENSION);

    console.log('\n========================================================');
    console.log('[Embeddings Verification Summary]:');
    console.log(`- Total standards: ${total}`);
    console.log(`- Embedded standards: ${embedded}`);
    console.log(`- Missing embeddings: ${missing}`);
    console.log(`- Incorrect dimension count: ${incorrectDims.length}`);
    console.log('========================================================\n');

    if (failedStandards.length > 0) {
      console.error('[Embeddings Incomplete]: Failed standards:', failedStandards);
      throw new Error(`Embedding generation incomplete: ${failedStandards.length} standards failed.`);
    }

    if (missing > 0 || embedded !== total || incorrectDims.length > 0) {
      throw new Error(`Embedding verification failed: total=${total}, embedded=${embedded}, missing=${missing}, incorrectDims=${incorrectDims.length}`);
    }

    return {
      success: true,
      total,
      embedded,
      missing,
      incorrectDimensionCount: incorrectDims.length,
      sampleDimensions: dimsCheck.rows.slice(0, 3)
    };
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  generateCleanEmbeddings()
    .then(r => {
      console.log('Result:', r);
      process.exit(0);
    })
    .catch(err => {
      console.error('Embedding generation failed:', err);
      process.exit(1);
    });
}

module.exports = { generateCleanEmbeddings };
