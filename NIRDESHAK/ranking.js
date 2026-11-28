// =========================================================
// Nirdeshak - Relevance Ranking Engine Module
// Step 7: Multi-Signal Deterministic Relevance Scoring
// Handles: Weighted relevance scoring (Semantic 60%, Text 20%,
// Scope/Application 10%, Structured Requirements 10%),
// deterministic tie-breaking, and transparent score attribution.
// =========================================================

const WEIGHTS = {
  semantic: 0.60,
  text: 0.20,
  scopeApplication: 0.10,
  structuredRequirement: 0.10
};

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'for', 'of', 'with', 'in', 'on', 'at',
  'to', 'from', 'by', 'as', 'is', 'are', 'was', 'were', 'be', 'been',
  'this', 'that', 'these', 'those', 'it', 'its', 'into', 'over', 'under'
]);

/**
 * Tokenizes text into lowercase, punctuation-free terms.
 * Filters out common stop words and single/two-character noise.
 * @param {string} text
 * @returns {Array<string>} Array of clean token strings
 */
function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(token => token.length >= 3 && !STOP_WORDS.has(token));
}

/**
 * Recursively extracts plain text from strings, arrays, and JSONB objects.
 * @param {*} field
 * @returns {string} Combined text string
 */
function extractTextFromField(field) {
  if (field === null || field === undefined) return '';
  if (typeof field === 'string') return field;
  if (typeof field === 'number') return String(field);
  if (Array.isArray(field)) {
    return field.map(item => extractTextFromField(item)).join(' ');
  }
  if (typeof field === 'object') {
    return Object.values(field).map(item => extractTextFromField(item)).join(' ');
  }
  return '';
}

/**
 * Calculates deterministic token overlap ratio between query tokens and target text.
 * Returns a float between 0.0 and 1.0.
 * @param {Array<string>} queryTokens Unique query tokens
 * @param {string} targetText String content to check against
 * @returns {number} Value in [0, 1]
 */
function computeOverlapRatio(queryTokens, targetText) {
  if (!queryTokens || queryTokens.length === 0) return 0;
  if (!targetText || typeof targetText !== 'string') return 0;

  const targetTokens = new Set(tokenize(targetText));
  if (targetTokens.size === 0) return 0;

  let matches = 0;
  for (const token of queryTokens) {
    if (targetTokens.has(token)) {
      matches++;
    }
  }

  return matches / queryTokens.length;
}

/**
 * Validates and normalizes semantic similarity into [0, 1].
 * @param {Object} candidate Standard candidate from semantic search
 * @returns {number} Normalized semantic score in [0, 1]
 */
function calculateSemanticScore(candidate) {
  if (!candidate || typeof candidate !== 'object') return 0;

  let score = 0;
  const numSim = typeof candidate.similarity === 'number' ? candidate.similarity : parseFloat(candidate.similarity);
  const numDist = typeof candidate.distance === 'number' ? candidate.distance : parseFloat(candidate.distance);

  if (Number.isFinite(numSim)) {
    score = numSim;
  } else if (Number.isFinite(numDist)) {
    score = 1 - numDist;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Calculates general text relevance against title, description, scope,
 * application, and requirements fields.
 * @param {Array<string>} queryTokens
 * @param {Object} standard
 * @returns {number} Score in [0, 1]
 */
function calculateTextRelevanceScore(queryTokens, standard) {
  if (!standard) return 0;

  const combinedText = [
    standard.title || '',
    standard.description || '',
    standard.scope || '',
    standard.application || '',
    extractTextFromField(standard.technical_requirements),
    extractTextFromField(standard.safety_requirements),
    extractTextFromField(standard.testing_requirements)
  ].join(' ');

  return computeOverlapRatio(queryTokens, combinedText);
}

/**
 * Calculates scope and application alignment score.
 * Evaluates whether query requirements align specifically with standard's intended use and domain.
 * @param {Array<string>} queryTokens
 * @param {Object} standard
 * @returns {number} Score in [0, 1]
 */
function calculateScopeApplicationScore(queryTokens, standard) {
  if (!standard) return 0;

  const scopeAppText = [
    standard.scope || '',
    standard.application || ''
  ].join(' ');

  return computeOverlapRatio(queryTokens, scopeAppText);
}

/**
 * Calculates structured requirements and category relevance score.
 * Evaluates category classification and technical/safety/testing specifications.
 * @param {Array<string>} queryTokens
 * @param {Object} standard
 * @returns {number} Score in [0, 1]
 */
function calculateStructuredRequirementScore(queryTokens, standard) {
  if (!standard) return 0;

  const structuredText = [
    standard.category || '',
    extractTextFromField(standard.technical_requirements),
    extractTextFromField(standard.safety_requirements),
    extractTextFromField(standard.testing_requirements)
  ].join(' ');

  return computeOverlapRatio(queryTokens, structuredText);
}

/**
 * Ranks candidate standards using transparent multi-signal weighted scoring.
 *
 * Scoring Formula:
 * finalScore = (semanticScore * 0.60)
 *            + (textScore * 0.20)
 *            + (scopeApplicationScore * 0.10)
 *            + (structuredRequirementScore * 0.10)
 *
 * Deterministic Tie-breaking:
 * 1. finalScore descending
 * 2. semanticScore descending
 * 3. id ascending
 *
 * @param {string} queryText User query or requirement text
 * @param {Array<Object>} candidates Candidate standards returned by semantic search
 * @returns {Array<Object>} Ranked standards with transparent score breakdowns
 */
function rankStandards(queryText, candidates = []) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return [];
  }

  const rawQuery = typeof queryText === 'string' ? queryText.trim() : '';
  const queryTokens = Array.from(new Set(tokenize(rawQuery)));

  const scoredStandards = candidates.map(candidate => {
    // 1. Calculate each deterministic score component (clamped to [0, 1])
    const semanticScore = calculateSemanticScore(candidate);
    const textScore = calculateTextRelevanceScore(queryTokens, candidate);
    const scopeAppScore = calculateScopeApplicationScore(queryTokens, candidate);
    const structuredScore = calculateStructuredRequirementScore(queryTokens, candidate);

    // 2. Compute final weighted score
    const unroundedFinal = (
      semanticScore * WEIGHTS.semantic +
      textScore * WEIGHTS.text +
      scopeAppScore * WEIGHTS.scopeApplication +
      structuredScore * WEIGHTS.structuredRequirement
    );
    const finalScore = Math.max(0, Math.min(1, unroundedFinal));

    // 3. Format scores for API presentation (rounded to 4 decimals)
    const formattedScores = {
      semantic: Math.round(semanticScore * 10000) / 10000,
      text: Math.round(textScore * 10000) / 10000,
      scopeApplication: Math.round(scopeAppScore * 10000) / 10000,
      structuredRequirement: Math.round(structuredScore * 10000) / 10000,
      final: Math.round(finalScore * 10000) / 10000
    };

    // Return standard metadata without any raw embedding vector
    const techReqs = candidate.technical_requirements || candidate.technicalRequirements || [];
    const perfReqs = candidate.performance_requirements || candidate.performanceRequirements || [];
    const safetyReqs = candidate.safety_requirements || candidate.safetyRequirements || [];
    const testReqs = candidate.testing_requirements || candidate.testingRequirements || [];
    const mats = candidate.materials || [];
    const amnds = candidate.amendments || [];
    const rels = candidate.related_standards || candidate.relatedStandards || [];

    return {
      ...candidate,
      id: candidate.id,
      is_number: candidate.is_number,
      title: candidate.title,
      scope: candidate.scope,
      category: candidate.category,
      description: candidate.description,
      application: candidate.application,
      technical_requirements: techReqs,
      technicalRequirements: techReqs,
      materials: mats,
      performance_requirements: perfReqs,
      performanceRequirements: perfReqs,
      safety_requirements: safetyReqs,
      safetyRequirements: safetyReqs,
      testing_requirements: testReqs,
      testingRequirements: testReqs,
      amendments: amnds,
      supersedes: candidate.supersedes || [],
      superseded_by: candidate.superseded_by || candidate.supersededBy || [],
      supersededBy: candidate.supersededBy || candidate.superseded_by || [],
      related_standards: rels,
      relatedStandards: rels,
      version: candidate.version,
      publication_year: candidate.publication_year,
      status: candidate.status,
      certification: candidate.certification,
      source: candidate.source,
      scores: formattedScores,
      _unroundedFinal: unroundedFinal,
      _unroundedSemantic: semanticScore
    };
  });

  // Deterministic sorting
  scoredStandards.sort((a, b) => {
    // 1. Primary: finalScore descending
    if (b._unroundedFinal !== a._unroundedFinal) {
      return b._unroundedFinal - a._unroundedFinal;
    }
    // 2. Secondary: semanticScore descending
    if (b._unroundedSemantic !== a._unroundedSemantic) {
      return b._unroundedSemantic - a._unroundedSemantic;
    }
    // 3. Tertiary: standard ID ascending
    return (a.id || 0) - (b.id || 0);
  });

  // Assign 1-indexed ranks and remove internal sorting floats
  return scoredStandards.map((item, index) => {
    const { _unroundedFinal, _unroundedSemantic, ...cleanStandard } = item;
    return {
      rank: index + 1,
      ...cleanStandard
    };
  });
}

module.exports = {
  WEIGHTS,
  tokenize,
  extractTextFromField,
  computeOverlapRatio,
  calculateSemanticScore,
  calculateTextRelevanceScore,
  calculateScopeApplicationScore,
  calculateStructuredRequirementScore,
  rankStandards
};
