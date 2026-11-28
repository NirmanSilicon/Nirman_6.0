/**
 * Generate 3072-dim embeddings for all standards in DB that currently have NULL embeddings.
 * Preserves all existing embeddings.
 */
const { Pool } = require('pg');
require('dotenv').config();
const { generateMissingStandardsEmbeddings } = require('../embeddings');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const missingCountRes = await pool.query('SELECT count(*) as count FROM standards WHERE embedding IS NULL');
  let missing = parseInt(missingCountRes.rows[0].count, 10);
  console.log(`Initial standards missing embeddings: ${missing}`);

  let totalProcessed = 0;
  let totalSuccessful = 0;
  let totalFailed = 0;

  while (missing > 0) {
    const batchSize = Math.min(25, missing);
    console.log(`Processing batch of ${batchSize} standards (${missing} remaining)...`);
    
    try {
      const res = await generateMissingStandardsEmbeddings(batchSize);
      totalProcessed += res.successful + res.failed;
      totalSuccessful += res.successful;
      totalFailed += res.failed;

      console.log(`Batch finished: ${res.successful} successful, ${res.failed} failed.`);

      // Update remaining
      const checkRes = await pool.query('SELECT count(*) as count FROM standards WHERE embedding IS NULL');
      missing = parseInt(checkRes.rows[0].count, 10);

      // Brief pause to respect API rate limits
      await new Promise(r => setTimeout(r, 600));
    } catch (err) {
      console.error('Batch error:', err.message);
      // Brief backoff
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  const finalCheck = await pool.query(`
    SELECT 
      count(*) as total,
      count(embedding) as with_embedding,
      count(*) - count(embedding) as without_embedding
    FROM standards
  `);

  console.log('\n--- EMBEDDING GENERATION COMPLETE ---');
  console.table(finalCheck.rows);

  await pool.end();
}

run().catch(err => {
  console.error('Fatal error:', err);
  pool.end();
});
