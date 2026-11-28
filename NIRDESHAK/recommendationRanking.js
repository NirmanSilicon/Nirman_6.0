// =========================================================
// Nirdeshak - Recommendation Ranking & Top-K Module
// Handles: Selection, formatting, and ranking of top-K relevant
// Indian Standards according to the multi-signal scoring formula:
// Final_Score = 0.60(Semantic) + 0.20(Text) + 0.10(Scope) + 0.10(Requirement)
// =========================================================

const { rankStandards } = require('./ranking');

const SCORING_WEIGHTS = {
  semantic: 0.60,
  text: 0.20,
  scope: 0.10,
  requirement: 0.10
};

/**
 * Validates and normalizes recommendation score fields.
 * Ensures each recommendation includes both root-level score attributes
 * and nested scores object for backward compatibility.
 *
 * @param {Object} item Standard object with scores
 * @param {number} rank Assigned rank (1-indexed)
 * @returns {Object} Normalized recommendation object
 */
function formatRecommendationItem(item, rank) {
  if (!item) return null;

  const rawScores = item.scores || {};
  const semantic = typeof item.semantic_similarity === 'number'
    ? item.semantic_similarity
    : (typeof rawScores.semantic === 'number' ? rawScores.semantic : 0);

  const text = typeof item.text_match === 'number'
    ? item.text_match
    : (typeof rawScores.text === 'number' ? rawScores.text : 0);

  const scope = typeof item.scope_match === 'number'
    ? item.scope_match
    : (typeof rawScores.scopeApplication === 'number' ? rawScores.scopeApplication : (typeof rawScores.scope === 'number' ? rawScores.scope : 0));

  const requirement = typeof item.requirement_match === 'number'
    ? item.requirement_match
    : (typeof rawScores.structuredRequirement === 'number'
        ? rawScores.structuredRequirement
        : (typeof rawScores.structured === 'number' ? rawScores.structured : 0));

  let final = typeof item.final_score === 'number'
    ? item.final_score
    : (typeof rawScores.final === 'number' ? rawScores.final : null);

  // If final score is not provided, compute using exact formula
  if (final === null || isNaN(final)) {
    final = Math.max(0, Math.min(1,
      semantic * SCORING_WEIGHTS.semantic +
      text * SCORING_WEIGHTS.text +
      scope * SCORING_WEIGHTS.scope +
      requirement * SCORING_WEIGHTS.requirement
    ));
    final = Math.round(final * 10000) / 10000;
  }

  const assignedRank = typeof item.rank === 'number' ? item.rank : rank;

  return {
    ...item,
    rank: assignedRank,
    is_number: item.is_number || item.standard_number || 'N/A',
    title: item.title || 'Untitled Standard',
    final_score: Math.round(final * 10000) / 10000,
    semantic_similarity: Math.round(semantic * 10000) / 10000,
    text_match: Math.round(text * 10000) / 10000,
    scope_match: Math.round(scope * 10000) / 10000,
    requirement_match: Math.round(requirement * 10000) / 10000,
    scores: {
      semantic: Math.round(semantic * 10000) / 10000,
      text: Math.round(text * 10000) / 10000,
      scopeApplication: Math.round(scope * 10000) / 10000,
      structured: Math.round(requirement * 10000) / 10000,
      structuredRequirement: Math.round(requirement * 10000) / 10000,
      final: Math.round(final * 10000) / 10000,
      rank: assignedRank
    }
  };
}

/**
 * Ranks candidate standards and selects the top-K recommendations.
 * Sorts in descending order of Final_Score and assigns ranks 1, 2, 3...
 *
 * @param {string} queryText User procurement requirement
 * @param {Array<Object>} candidates Candidate standards from retrieval
 * @param {number} [k=3] Maximum number of top recommendations to return
 * @returns {Array<Object>} Array of top-K recommendations
 */
function rankAndSelectTopK(queryText, candidates = [], k = 3) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return [];
  }

  // If candidates already have formatted scores, sort them directly; otherwise run rankStandards
  const hasPrecomputed = candidates.every(c => (c.scores && typeof c.scores.final === 'number') || typeof c.final_score === 'number');
  let ranked;
  if (hasPrecomputed) {
    ranked = [...candidates].sort((a, b) => {
      const scoreA = typeof a.final_score === 'number' ? a.final_score : (a.scores ? a.scores.final : 0);
      const scoreB = typeof b.final_score === 'number' ? b.final_score : (b.scores ? b.scores.final : 0);
      return scoreB - scoreA;
    });
  } else {
    ranked = rankStandards(queryText, candidates);
  }

  // 2. Select top K candidates (or all available if fewer than K)
  const topK = ranked.slice(0, Math.max(1, k));

  // 3. Format with both root-level and nested score contracts
  return topK.map((item, index) => formatRecommendationItem(item, index + 1));
}

module.exports = {
  SCORING_WEIGHTS,
  formatRecommendationItem,
  rankAndSelectTopK
};
