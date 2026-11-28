// =========================================================
// Nirdeshak - Semantic Embeddings Module
// Step 5: Gemini Embeddings
// Handles:
// - Gemini Embedding API integration (gemini-embedding-2)
// - Text preparation for standards and requirements
// - Requirement embedding generation
// - Standard embedding generation
// - Validation of embedding responses and vector dimensions
// - Storing/updating embeddings in PostgreSQL via standardsDatabase
// - Robust error handling
// =========================================================

const { GoogleGenerativeAI } = require('@google/generative-ai');
const {
  getStandardById,
  updateStandardEmbedding,
  getStandardsMissingEmbeddings,
  getEmbeddingStatistics
} = require('./standardsDatabase');

// Default supported model and dimension
// gemini-embedding-2 is the officially supported multimodal embedding model
const DEFAULT_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2';
const EXPECTED_DIMENSION = parseInt(process.env.GEMINI_EMBEDDING_DIMENSION || '3072', 10);

/**
 * Validates that an API key is available in environment.
 * @returns {string} The validated API key
 */
function getApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim() || apiKey === 'your_gemini_api_key_here') {
    const error = new Error('Gemini API key is not configured on the server. Please set GEMINI_API_KEY in the server environment (.env file).');
    error.statusCode = 503;
    throw error;
  }
  return apiKey.trim();
}

/**
 * Initializes and returns a GoogleGenerativeAI client instance.
 * @returns {GoogleGenerativeAI}
 */
function getAiClient() {
  const apiKey = getApiKey();
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Helper to format a single field if present and non-empty.
 * @param {string} label 
 * @param {*} value 
 * @returns {string|null}
 */
function formatField(label, value) {
  if (value === undefined || value === null) return null;

  if (Array.isArray(value)) {
    const cleanItems = value
      .map(item => {
        if (typeof item === 'object' && item !== null) {
          return Object.entries(item).map(([k, v]) => `${k}: ${v}`).join(', ');
        }
        return String(item).trim();
      })
      .filter(item => item.length > 0);

    if (cleanItems.length === 0) return null;
    return `${label}: ${cleanItems.join('; ')}`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value)
      .map(([k, v]) => `${k}: ${v}`)
      .filter(entry => entry.length > 0);
    if (entries.length === 0) return null;
    return `${label}: ${entries.join('; ')}`;
  }

  const str = String(value).trim();
  if (!str) return null;
  return `${label}: ${str}`;
}

/**
 * Prepares a clean, semantic text representation of an Indian Standard.
 * Combines essential standard fields without inventing or modifying information.
 *
 * Uses:
 * - IS number
 * - title
 * - scope
 * - category
 * - application
 * - technical requirements
 * - safety requirements
 * - testing requirements
 *
 * @param {Object} standard The standard record from PostgreSQL
 * @returns {string} Prepared text ready for embedding
 */
function prepareTextForStandard(standard) {
  if (!standard || typeof standard !== 'object') {
    throw new Error('Invalid standard record: an object is required for text preparation.');
  }

  const parts = [];

  // IS Number and Title (Primary identification)
  const isNumber = standard.is_number ? String(standard.is_number).trim() : '';
  const title = standard.title ? String(standard.title).trim() : '';
  if (isNumber && title) {
    parts.push(`Standard: ${isNumber} - ${title}`);
  } else if (isNumber) {
    parts.push(`Standard: ${isNumber}`);
  } else if (title) {
    parts.push(`Title: ${title}`);
  }

  // Core semantic fields
  const categoryField = formatField('Category', standard.category);
  if (categoryField) parts.push(categoryField);

  const scopeField = formatField('Scope', standard.scope);
  if (scopeField) parts.push(scopeField);

  const applicationField = formatField('Application', standard.application);
  if (applicationField) parts.push(applicationField);

  // Technical, Safety, and Testing requirements
  const techField = formatField('Technical Requirements', standard.technical_requirements);
  if (techField) parts.push(techField);

  const safetyField = formatField('Safety Requirements', standard.safety_requirements);
  if (safetyField) parts.push(safetyField);

  const testingField = formatField('Testing Requirements', standard.testing_requirements);
  if (testingField) parts.push(testingField);

  // Fallback if structured fields are sparse but description exists
  if (parts.length <= 1 && standard.description) {
    const descField = formatField('Description', standard.description);
    if (descField) parts.push(descField);
  }

  const preparedText = parts.join('\n').trim();
  if (!preparedText) {
    throw new Error('Unable to prepare text for standard: no meaningful text fields found.');
  }

  return preparedText;
}

/**
 * Prepares a clean, semantic text representation of a requirement.
 * Accepts either:
 * 1. A string of raw requirement text
 * 2. A structured requirement object with fields like product, category, application, etc.
 *
 * Example Output:
 * Product: Safety Helmet
 * Category: Industrial Safety Equipment
 * Application: Construction Workers
 * Performance: Protection against mechanical impact
 * Safety: Impact protection
 *
 * @param {string|Object} requirementInput
 * @returns {string} Prepared requirement text ready for embedding
 */
function prepareTextForRequirement(requirementInput) {
  if (requirementInput === undefined || requirementInput === null) {
    throw new Error('Requirement input is required and cannot be null or empty.');
  }

  // Direct string input
  if (typeof requirementInput === 'string') {
    const trimmed = requirementInput.trim();
    if (!trimmed) {
      throw new Error('Requirement text cannot be empty.');
    }
    return trimmed;
  }

  // Object input
  if (typeof requirementInput === 'object') {
    // If object has a direct 'text' or 'requirement' or 'query' string property without other fields
    if (requirementInput.text && typeof requirementInput.text === 'string' && Object.keys(requirementInput).length === 1) {
      const trimmed = requirementInput.text.trim();
      if (!trimmed) throw new Error('Requirement text cannot be empty.');
      return trimmed;
    }
    if (requirementInput.requirement && typeof requirementInput.requirement === 'string' && Object.keys(requirementInput).length === 1) {
      const trimmed = requirementInput.requirement.trim();
      if (!trimmed) throw new Error('Requirement text cannot be empty.');
      return trimmed;
    }

    const parts = [];

    // Product name
    const productVal = requirementInput.product || requirementInput.product_name || requirementInput.productName;
    const productField = formatField('Product', productVal);
    if (productField) parts.push(productField);

    // Category
    const categoryField = formatField('Category', requirementInput.category);
    if (categoryField) parts.push(categoryField);

    // Application / Intended Use
    const appVal = requirementInput.application || requirementInput.intended_use || requirementInput.intendedUse;
    const appField = formatField('Application', appVal);
    if (appField) parts.push(appField);

    // Performance requirements
    const perfVal = requirementInput.performance || requirementInput.performance_requirements || requirementInput.performanceRequirements;
    const perfField = formatField('Performance', perfVal);
    if (perfField) parts.push(perfField);

    // Safety requirements
    const safetyVal = requirementInput.safety || requirementInput.safety_requirements || requirementInput.safetyRequirements;
    const safetyField = formatField('Safety', safetyVal);
    if (safetyField) parts.push(safetyField);

    // Technical requirements
    const techVal = requirementInput.technical || requirementInput.technical_requirements || requirementInput.technicalRequirements;
    const techField = formatField('Technical', techVal);
    if (techField) parts.push(techField);

    // Testing requirements
    const testVal = requirementInput.testing || requirementInput.testing_requirements || requirementInput.testingRequirements;
    const testField = formatField('Testing', testVal);
    if (testField) parts.push(testField);

    // Materials
    const matVal = requirementInput.materials || requirementInput.material_requirements || requirementInput.materialRequirements;
    const matField = formatField('Materials', matVal);
    if (matField) parts.push(matField);

    // If none of the specific fields matched, check for general fields
    if (parts.length === 0) {
      const general = requirementInput.query || requirementInput.description || requirementInput.raw_input || requirementInput.rawInput;
      if (general) {
        const genField = formatField('Requirement', general);
        if (genField) parts.push(genField);
      }
    }

    const preparedText = parts.join('\n').trim();
    if (!preparedText) {
      throw new Error('Invalid requirement object: no readable requirement fields found.');
    }

    return preparedText;
  }

  throw new Error(`Unsupported requirement input type: ${typeof requirementInput}. Expected string or object.`);
}

/**
 * Validates an embedding vector returned by the Gemini API.
 * Ensures the response is an array of valid finite numbers and matches the expected dimension.
 *
 * @param {Array<number>} values The vector array
 * @param {number} [expectedDimension] Optional expected dimension (defaults to EXPECTED_DIMENSION)
 * @returns {boolean} True if valid
 * @throws {Error} Detailed error if validation fails
 */
function validateEmbedding(values, expectedDimension = EXPECTED_DIMENSION) {
  if (!Array.isArray(values)) {
    throw new Error('Embedding validation failed: response is not an array.');
  }

  if (values.length === 0) {
    throw new Error('Embedding validation failed: vector is empty.');
  }

  if (expectedDimension && values.length !== expectedDimension) {
    throw new Error(
      `Embedding dimension mismatch: expected ${expectedDimension} dimensions, but received ${values.length}.`
    );
  }

  // Verify elements are valid finite numbers
  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    if (typeof val !== 'number' || !Number.isFinite(val)) {
      throw new Error(`Embedding validation failed: element at index ${i} is not a valid finite number (${val}).`);
    }
  }

  return true;
}

/**
 * Calls Google Gemini Embedding API to generate an embedding for a text string.
 *
 * @param {string} text The text to embed
 * @param {Object} [options]
 * @param {string} [options.model] Embedding model name (defaults to gemini-embedding-2)
 * @param {number} [options.dimension] Expected dimension (defaults to 3072)
 * @returns {Promise<{ values: Array<number>, dimension: number, model: string }>}
 */
async function generateEmbedding(text, options = {}) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Text is required for embedding generation and cannot be empty.');
  }

  const modelName = options.model || DEFAULT_EMBEDDING_MODEL;
  const expectedDim = options.dimension || EXPECTED_DIMENSION;
  const maxAttempts = options.maxAttempts || 3;
  const ai = getAiClient();

  let lastErr = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const model = ai.getGenerativeModel({ model: modelName });
      const result = await model.embedContent(text.trim());

      if (!result || !result.embedding || !result.embedding.values) {
        throw new Error('Gemini API returned an empty or invalid embedding structure.');
      }

      const values = result.embedding.values;
      validateEmbedding(values, expectedDim);

      return {
        values,
        dimension: values.length,
        model: modelName
      };
    } catch (err) {
      lastErr = err;
      const isTransient = !err.statusCode || err.statusCode === 503 || err.statusCode === 429 ||
        (err.message && (
          err.message.includes('fetch failed') ||
          err.message.includes('timeout') ||
          err.message.includes('ECONNRESET') ||
          err.message.includes('ENOTFOUND') ||
          err.message.includes('overloaded') ||
          err.message.includes('no such host')
        ));

      if (attempt < maxAttempts && isTransient) {
        const delay = 600 * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      break;
    }
  }

  // Distinguish API / network / configuration errors
  if (lastErr && lastErr.statusCode === 503) {
    throw lastErr;
  }
  const message = (lastErr && lastErr.message) || 'Unknown error occurred during Gemini embedding generation.';
  const wrappedError = new Error(`Gemini Embedding API Error: ${message}`);
  wrappedError.originalError = lastErr;
  throw wrappedError;
}

/**
 * Generates an embedding for a tender/user requirement.
 * Accepts structured object or raw text.
 *
 * @param {string|Object} requirementInput
 * @param {Object} [options]
 * @returns {Promise<{ success: boolean, text: string, embedding: Array<number>, dimension: number, model: string }>}
 */
async function generateRequirementEmbedding(requirementInput, options = {}) {
  const preparedText = prepareTextForRequirement(requirementInput);
  const { values, dimension, model } = await generateEmbedding(preparedText, options);

  return {
    success: true,
    text: preparedText,
    embedding: values,
    dimension,
    model
  };
}

/**
 * Generates an embedding for an Indian Standard object without storing it.
 *
 * @param {Object} standard Standard record
 * @param {Object} [options]
 * @returns {Promise<{ success: boolean, standardId: number, is_number: string, text: string, embedding: Array<number>, dimension: number, model: string }>}
 */
async function generateStandardEmbedding(standard, options = {}) {
  const preparedText = prepareTextForStandard(standard);
  const { values, dimension, model } = await generateEmbedding(preparedText, options);

  return {
    success: true,
    standardId: standard.id,
    is_number: standard.is_number,
    text: preparedText,
    embedding: values,
    dimension,
    model
  };
}

/**
 * Generates an embedding for a specific standard and stores it in PostgreSQL (standards.embedding).
 *
 * @param {number|string} idOrIsNumber Numeric ID or IS number string
 * @param {Object} [options]
 * @returns {Promise<{ success: boolean, standardId: number, is_number: string, title: string, dimension: number, model: string }>}
 */
async function generateAndStoreStandardEmbedding(idOrIsNumber, options = {}) {
  const standard = await getStandardById(idOrIsNumber);
  if (!standard) {
    const notFoundError = new Error(`Standard with identifier "${idOrIsNumber}" not found in database.`);
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  // Generate embedding
  const { embedding: values, dimension, model } = await generateStandardEmbedding(standard, options);

  // Store in PostgreSQL standards.embedding column via standardsDatabase
  const updated = await updateStandardEmbedding(standard.id, values);
  if (!updated) {
    throw new Error(`Failed to update embedding for standard ID ${standard.id}.`);
  }

  return {
    success: true,
    standardId: updated.id,
    is_number: updated.is_number,
    title: updated.title,
    dimension,
    model
  };
}

/**
 * Generates embeddings in batch for standards that currently have NULL embeddings.
 * Ensures standards with existing embeddings are not unnecessarily regenerated.
 *
 * @param {number} [limit=50] Maximum number of standards to process
 * @param {Object} [options]
 * @returns {Promise<{ success: boolean, totalFound: number, successful: number, failed: number, results: Array<Object> }>}
 */
async function generateMissingStandardsEmbeddings(limit = 50, options = {}) {
  const pendingStandards = await getStandardsMissingEmbeddings(limit);

  if (!pendingStandards || pendingStandards.length === 0) {
    return {
      success: true,
      message: 'All standards in the database already have embeddings. No records were regenerated.',
      totalFound: 0,
      successful: 0,
      failed: 0,
      results: []
    };
  }

  const results = [];
  let successful = 0;
  let failed = 0;

  for (const standard of pendingStandards) {
    try {
      const { embedding: values, dimension, model } = await generateStandardEmbedding(standard, options);
      await updateStandardEmbedding(standard.id, values);

      successful++;
      results.push({
        id: standard.id,
        is_number: standard.is_number,
        success: true,
        dimension,
        model
      });
    } catch (err) {
      failed++;
      results.push({
        id: standard.id,
        is_number: standard.is_number,
        success: false,
        error: err.message
      });
    }
  }

  return {
    success: true,
    totalFound: pendingStandards.length,
    successful,
    failed,
    results
  };
}

/**
 * Retrieves the embedding coverage status from PostgreSQL.
 *
 * @returns {Promise<{ success: boolean, total: number, withEmbeddings: number, withoutEmbeddings: number, model: string, dimension: number }>}
 */
async function getEmbeddingsStatus() {
  const stats = await getEmbeddingStatistics();
  return {
    success: true,
    total: stats.total,
    withEmbeddings: stats.withEmbeddings,
    withoutEmbeddings: stats.withoutEmbeddings,
    model: DEFAULT_EMBEDDING_MODEL,
    dimension: EXPECTED_DIMENSION
  };
}

module.exports = {
  DEFAULT_EMBEDDING_MODEL,
  EXPECTED_DIMENSION,
  prepareTextForStandard,
  prepareTextForRequirement,
  validateEmbedding,
  generateEmbedding,
  generateRequirementEmbedding,
  generateStandardEmbedding,
  generateAndStoreStandardEmbedding,
  generateMissingStandardsEmbeddings,
  getEmbeddingsStatus
};
