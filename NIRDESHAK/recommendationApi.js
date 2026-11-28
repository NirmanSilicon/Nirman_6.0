// =========================================================
// Nirdeshak - Recommendation API Client Module
// Handles: Dispatching and validating recommendation requests
// to POST /api/recommendations/explain
// =========================================================

/**
 * Fetches explainable recommendations from the Nirdeshak backend.
 *
 * @param {string} query User procurement requirement
 * @param {Object} [options={}]
 * @param {number} [options.limit=3] Maximum recommendations to return (default 3)
 * @param {string} [options.apiBase=''] Backend base URL
 * @param {boolean} [options.demoMode] Force curated demo mode
 * @param {Object} [options.extractedRequirements] Optional extracted requirement payload
 * @returns {Promise<Object>} Backend response with ranked recommendations array
 */
export async function fetchExplainableRecommendations(query, options = {}) {
  const cleanQuery = typeof query === 'string' ? query.trim() : '';
  if (!cleanQuery) {
    throw new Error('Query text cannot be empty or whitespace-only.');
  }

  const apiBase = options.apiBase || '';
  const endpoint = `${apiBase}/api/recommendations/explain`;

  const headers = {
    'Content-Type': 'application/json'
  };

  // Attach demo header if in demo mode or page context
  const isDemo = options.demoMode !== undefined
    ? options.demoMode
    : (typeof window !== 'undefined' && (
        window.location.pathname.includes('analysis.html') ||
        window.location.pathname.includes('results.html') ||
        window.location.pathname.includes('analyzing.html') ||
        window.location.pathname.includes('requirements.html')
      ));

  if (isDemo) {
    headers['X-Nirdeshak-Demo'] = 'true';
  }

  const bodyPayload = {
    query: cleanQuery,
    limit: options.limit || 3,
    demoMode: isDemo
  };

  if (options.extractedRequirements) {
    bodyPayload.extractedRequirements = options.extractedRequirements;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(bodyPayload)
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}: Recommendation request failed.`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.error) {
        errorDetail = errJson.error;
      }
    } catch (_) {
      // Ignore JSON parse errors on non-200 responses
    }
    const err = new Error(errorDetail);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();

  if (!data || typeof data !== 'object') {
    throw new Error('Malformed API response: Expected JSON object.');
  }

  // Ensure recommendations is always an array
  if (!Array.isArray(data.recommendations)) {
    data.recommendations = [];
  }

  // Verify and normalize each recommendation item
  data.recommendations = data.recommendations.map((rec, idx) => {
    const rank = rec.rank || (rec.scores && rec.scores.rank) || (idx + 1);
    const finalScore = rec.final_score !== undefined
      ? rec.final_score
      : (rec.scores ? rec.scores.final : 0);
    const semantic = rec.semantic_similarity !== undefined
      ? rec.semantic_similarity
      : (rec.scores ? rec.scores.semantic : 0);
    const text = rec.text_match !== undefined
      ? rec.text_match
      : (rec.scores ? rec.scores.text : 0);
    const scope = rec.scope_match !== undefined
      ? rec.scope_match
      : (rec.scores ? (rec.scores.scopeApplication || rec.scores.scope) : 0);
    const req = rec.requirement_match !== undefined
      ? rec.requirement_match
      : (rec.scores ? (rec.scores.structuredRequirement || rec.scores.structured) : 0);

    return {
      ...rec,
      rank,
      is_number: rec.is_number || 'N/A',
      title: rec.title || 'Untitled Standard',
      final_score: finalScore,
      semantic_similarity: semantic,
      text_match: text,
      scope_match: scope,
      requirement_match: req,
      scores: rec.scores || {
        semantic,
        text,
        scopeApplication: scope,
        structured: req,
        final: finalScore,
        rank
      }
    };
  });

  // Ensure recommendations are sorted by rank ascending (i.e. final_score descending)
  data.recommendations.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return (b.final_score || 0) - (a.final_score || 0);
  });

  data.count = data.recommendations.length;

  return data;
}

// Expose on window for browser scripts
if (typeof window !== 'undefined') {
  window.NirdeshakRecommendationApi = {
    fetchExplainableRecommendations
  };
}
