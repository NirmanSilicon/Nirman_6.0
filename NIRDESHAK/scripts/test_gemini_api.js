const { generateEmbedding, DEFAULT_EMBEDDING_MODEL, EXPECTED_DIMENSION } = require('../embeddings');
require('dotenv').config();

async function testApi() {
  console.log(`Testing Gemini Embedding API with model=${DEFAULT_EMBEDDING_MODEL}, dimension=${EXPECTED_DIMENSION}...`);
  try {
    const res = await generateEmbedding('Test standard embedding check');
    console.log('SUCCESS! Generated embedding array length:', res.values.length, 'model:', res.model);
  } catch (err) {
    console.error('API Error:', err.message);
    if (err.originalError) {
      console.error('Original Error details:', err.originalError.message);
    }
  }
}

testApi();
