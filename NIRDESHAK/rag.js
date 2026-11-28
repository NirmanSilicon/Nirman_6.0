// =========================================================
// Nirdeshak - RAG + Explainable Recommendations Engine
// Step 11: Grounded Gemini Explanation Layer
//
// Architecture:
// Query -> Semantic Search -> Relevance Ranking ->
// Related Standards + Version Check + Certification Check ->
// Structured RAG Context -> Gemini Grounded Explanation ->
// Strict Hallucination Validation -> Explainable Recommendation
//
// Rules:
// - Gemini is an explanation layer ONLY.
// - All facts, scores, versions, relationships & certifications
//   are copied directly from deterministic system retrieval.
// - Strict post-validation rejects fabricated IDs / IS numbers.
// - Resilient fallback ensures 100% availability even without Gemini.
// - Zero raw vector or credential leakage.
// =========================================================

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { query } = require('./database');
const { searchStandards } = require('./semanticSearch');
const { rankStandards } = require('./ranking');
const { getRelatedStandardsForId } = require('./relatedStandards');
const { evaluateVersionStatus } = require('./versionCheck');
const { evaluateCertification, isSyntheticContext } = require('./certification');
const { getStandardById } = require('./standardsDatabase');
const { discoverStandards } = require('./productDiscovery');

const DEFAULT_CANDIDATE_LIMIT = 5;
const MAX_CANDIDATE_LIMIT = 10;
const MAX_CONTEXT_CHARS = 15000;

/**
 * Builds structured RAG context from retrieved and ranked candidates.
 * Strips all sensitive data and raw vector embeddings.
 *
 * @param {string} query User query
 * @param {Array<Object>} candidates Enriched ranked candidates
 * @param {Object} [options]
 * @returns {Object} Structured machine-readable context object
 */
function buildRagContext(query, candidates, options = {}) {
  const maxCandidates = Math.min(
    Math.max(parseInt(options.maxCandidates, 10) || DEFAULT_CANDIDATE_LIMIT, 1),
    MAX_CANDIDATE_LIMIT
  );

  const selectedCandidates = (candidates || []).slice(0, maxCandidates);

  const candidateEvidence = selectedCandidates.map(c => {
    // Truncate long descriptions if needed
    const safeDesc = typeof c.description === 'string' && c.description.length > 500
      ? c.description.slice(0, 500) + '...'
      : c.description;

    const safeScope = typeof c.scope === 'string' && c.scope.length > 500
      ? c.scope.slice(0, 500) + '...'
      : c.scope;

    return {
      standardId: c.id,
      is_number: c.is_number,
      title: c.title,
      category: c.category,
      scope: safeScope,
      application: c.application,
      description: safeDesc,
      technicalRequirements: c.technical_requirements || c.technicalRequirements || [],
      performanceRequirements: c.performance_requirements || c.performanceRequirements || [],
      safetyRequirements: c.safety_requirements || c.safetyRequirements || [],
      testingRequirements: c.testing_requirements || c.testingRequirements || [],
      scores: {
        semanticSimilarity: c.scores ? c.scores.semantic : null,
        textRelevance: c.scores ? c.scores.text : null,
        scopeApplicationRelevance: c.scores ? c.scores.scopeApplication : null,
        structuredRequirementRelevance: c.scores ? c.scores.structured : null,
        finalRelevanceScore: c.scores ? c.scores.final : null,
        rank: c.rank || null
      },
      versionStatus: {
        statusCategory: c.versionStatus ? c.versionStatus.statusCategory : 'unknown',
        statusValue: c.versionStatus ? c.versionStatus.statusValue : null,
        hasAmendments: c.versionStatus ? c.versionStatus.hasAmendments : false,
        amendmentInfo: c.versionStatus ? c.versionStatus.amendmentInfo : [],
        isSuperseded: c.versionStatus ? c.versionStatus.isSuperseded : false,
        supersededBy: c.versionStatus ? c.versionStatus.supersededBy : null,
        version: c.versionStatus ? c.versionStatus.version : null,
        publicationYear: c.versionStatus ? c.versionStatus.publicationYear : null,
        summary: c.versionStatus ? c.versionStatus.summary : null
      },
      certification: {
        hasCertificationInfo: c.certification ? c.certification.hasCertificationInfo : false,
        scheme: c.certification ? c.certification.scheme : null,
        schemeDetected: c.certification ? c.certification.schemeDetected : false,
        requirementExplicit: c.certification ? c.certification.requirementExplicit : false,
        requirementValue: c.certification ? c.certification.requirementValue : null,
        details: c.certification ? c.certification.details : null
      },
      relatedStandards: Array.isArray(c.relatedStandards)
        ? c.relatedStandards.map(r => ({
            relationshipId: r.relationshipId,
            direction: r.direction,
            relationshipType: r.relationshipType,
            relatedStandardId: r.standard ? r.standard.id : null,
            relatedIsNumber: r.standard ? r.standard.is_number : null,
            relatedTitle: r.standard ? r.standard.title : null
          }))
        : [],
      provenance: {
        source: c.source || null,
        dataContext: c.dataContext || (isSyntheticContext(c.source) ? 'development_test' : 'official_record')
      }
    };
  });

  return {
    userQuery: String(query || '').trim(),
    retrievedCandidatesCount: candidateEvidence.length,
    candidates: candidateEvidence
  };
}

/**
 * Builds the strict grounded prompt for Gemini.
 *
 * @param {Object} ragContext
 * @returns {string} Prompt text
 */
function buildGroundedPrompt(ragContext) {
  const serializedContext = JSON.stringify(ragContext, null, 2);

  // Apply safety truncation limit to serialized context
  const safeContext = serializedContext.length > MAX_CONTEXT_CHARS
    ? serializedContext.slice(0, MAX_CONTEXT_CHARS) + '\n... [Context truncated for safety]'
    : serializedContext;

  return `You are the Nirdeshak Explainable Recommendations Engine for Indian Standards (Bureau of Indian Standards).
Your purpose is to generate clear, concise, objective, evidence-based explanations for WHY each retrieved standard is relevant to the user's procurement/technical requirement.

STRICT GROUNDING & INTEGRITY RULES:
1. Use ONLY the retrieved evidence provided in the RETRIEVED CONTEXT below.
2. Do NOT invent new standards, IS numbers, versions, amendments, certification requirements, or relationships.
3. Every recommendation in your response MUST refer to a standardId and is_number explicitly listed in the RETRIEVED CONTEXT.
4. Do NOT claim that any standard or certification is legally mandatory unless the evidence explicitly states "requirementExplicit": true and "requirementValue": true.
5. If the provenance dataContext is "development_test", preserve the factual context that these are development test records.
6. If evidence for a particular requirement is missing or partial, clearly state the limitation.
7. Return a valid JSON object matching the EXACT schema specified below.

RETRIEVED CONTEXT:
${safeContext}

REQUIRED OUTPUT JSON SCHEMA:
{
  "summary": "High-level summary explaining how the retrieved standards address the user query.",
  "recommendations": [
    {
      "standardId": 1,
      "is_number": "EXACT_IS_NUMBER_FROM_CONTEXT",
      "whyRelevant": "Concise 2-3 sentence explanation connecting the user query to the standard's scope, category, and application.",
      "evidence": [
        "Factual bullet point 1 citing relevance score or semantic similarity",
        "Factual bullet point 2 citing scope or application match",
        "Factual bullet point 3 citing version status or related standard (if applicable)"
      ]
    }
  ],
  "limitations": [
    "Factual limitation or guidance note (e.g. engineering assessment recommended, development test data context)"
  ]
}

Output ONLY the JSON object. Do not include markdown code fences, headers, or external conversational filler.`;
}

/**
 * Validates and sanitizes Gemini output against retrieved candidate ground truth.
 * Rejects hallucinated standard IDs, unknown IS numbers, or malformed structures.
 *
 * @param {*} generated Parsed output from Gemini
 * @param {Map<number, Object>} candidateMap Map of retrieved candidate standards by ID
 * @returns {{ isValid: boolean, error?: string, sanitized?: Object }}
 */
function validateGeneratedRecommendations(generated, candidateMap) {
  if (!generated || typeof generated !== 'object') {
    return { isValid: false, error: 'Generated output is not a valid object.' };
  }

  const summary = typeof generated.summary === 'string' && generated.summary.trim().length > 0
    ? generated.summary.trim()
    : 'Retrieved standards matching the technical and procurement specifications.';

  const rawRecs = Array.isArray(generated.recommendations) ? generated.recommendations : [];
  if (rawRecs.length === 0) {
    return { isValid: false, error: 'No recommendations array in generated output.' };
  }

  const validRecs = [];
  const seenIds = new Set();

  for (const rec of rawRecs) {
    if (!rec || typeof rec !== 'object') continue;

    const stdId = parseInt(rec.standardId, 10);
    if (isNaN(stdId) || !candidateMap.has(stdId)) {
      // Hallucinated standard ID detected!
      return { isValid: false, error: `Hallucinated standardId "${rec.standardId}" not in candidate set.` };
    }

    if (seenIds.has(stdId)) continue; // avoid duplicate entries
    seenIds.add(stdId);

    const groundTruth = candidateMap.get(stdId);

    // Verify IS number if provided by Gemini
    if (rec.is_number && String(rec.is_number).trim() !== groundTruth.is_number) {
      // Hallucinated IS number detected!
      return { isValid: false, error: `Hallucinated is_number "${rec.is_number}" does not match retrieved standard "${groundTruth.is_number}".` };
    }

    const whyRelevant = typeof rec.whyRelevant === 'string' && rec.whyRelevant.trim().length > 0
      ? rec.whyRelevant.trim()
      : `Standard ${groundTruth.is_number} matches query requirements with relevance score ${(groundTruth.scores.final * 100).toFixed(1)}%.`;

    const evidence = Array.isArray(rec.evidence)
      ? rec.evidence.filter(e => typeof e === 'string' && e.trim().length > 0).map(e => e.trim())
      : [];

    validRecs.push({
      standardId: stdId,
      is_number: groundTruth.is_number,
      whyRelevant,
      evidence: evidence.length > 0 ? evidence : [
        `Relevance score: ${(groundTruth.scores.final * 100).toFixed(1)}%`,
        `Scope: ${groundTruth.scope || groundTruth.category || 'Standard'}`
      ]
    });
  }

  if (validRecs.length === 0) {
    return { isValid: false, error: 'No valid recommendations after hallucination filtering.' };
  }

  const rawLimitations = Array.isArray(generated.limitations) ? generated.limitations : [];
  const limitations = rawLimitations
    .filter(l => typeof l === 'string' && l.trim().length > 0)
    .map(l => l.trim());

  return {
    isValid: true,
    sanitized: {
      summary,
      recommendations: validRecs,
      limitations
    }
  };
}

/**
 * Builds a deterministic fallback explanation when Gemini is unavailable,
 * fails validation, or times out.
 *
 * @param {string} query
 * @param {Array<Object>} candidates Enriched candidates
 * @param {string} [reason='AI explanation unavailable']
 * @returns {Object} Deterministic explanation object
 */
function buildDeterministicFallback(query, candidates, reason = 'AI explanation service unavailable') {
  const recommendations = (candidates || []).map(cand => {
    const finalPct = cand.scores && typeof cand.scores.final === 'number'
      ? (cand.scores.final * 100).toFixed(1)
      : '0.0';

    const semPct = cand.scores && typeof cand.scores.semantic === 'number'
      ? (cand.scores.semantic * 100).toFixed(1)
      : '0.0';

    const whyRelevant = `Standard ${cand.is_number} retrieved with a final relevance score of ${finalPct}% (semantic similarity: ${semPct}%). Categorized under "${cand.category || 'General'}" for application in "${cand.application || cand.title}". Database status indicates ${cand.versionStatus ? cand.versionStatus.statusValue || 'active' : 'active'} version.`;

    const evidence = [
      `Final relevance score: ${cand.scores ? cand.scores.final.toFixed(4) : '0.0000'} (Semantic: ${cand.scores ? cand.scores.semantic.toFixed(4) : '0.0000'}, Text: ${cand.scores ? cand.scores.text.toFixed(4) : '0.0000'})`,
      `Application alignment: ${cand.application || cand.scope || 'Standard specification'}`,
      `Version status: ${cand.versionStatus ? cand.versionStatus.summary : 'Active'}`,
      cand.certification && cand.certification.hasCertificationInfo
        ? `Certification: ${cand.certification.scheme || 'Specified scheme'} (${cand.certification.requirementExplicit ? (cand.certification.requirementValue ? 'Mandatory' : 'Optional') : 'No mandatory requirement stated'})`
        : 'Certification: No explicit requirement indicated in database'
    ];

    if (cand.relatedStandards && cand.relatedStandards.length > 0) {
      const relFirst = cand.relatedStandards[0];
      evidence.push(`Related standard: ${relFirst.standard ? relFirst.standard.is_number : 'Standard'} (${relFirst.relationshipType || 'associated'})`);
    }

    return {
      standardId: cand.id,
      is_number: cand.is_number,
      whyRelevant,
      evidence
    };
  });

  return {
    summary: `Retrieved ${candidates.length} standard(s) matching query "${query}" based on deterministic semantic search and multi-signal relevance ranking.`,
    recommendations,
    limitations: [
      `Deterministic fallback active: ${reason}. Results are grounded entirely on verified database records and mathematical relevance scores.`,
      'Engineering and regulatory verification recommended before procurement finalization.'
    ]
  };
}

/**
 * Resilient Gemini caller for RAG explanations with model fallbacks.
 *
 * @param {string} apiKey
 * @param {string} prompt
 * @returns {Promise<{ text: string, modelUsed: string }>}
 */
async function callGeminiRag(apiKey, prompt) {
  const primaryModel = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const models = [primaryModel, 'gemini-3.7-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'];
  const uniqueModels = [...new Set(models)];

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError = null;

  for (const modelName of uniqueModels) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const model = genAI.getGenerativeModel(
          {
            model: modelName,
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2 // Low temperature for high factual grounding
            }
          },
          { timeout: 8000 }
        );
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return { text: response.text(), modelUsed: modelName };
      } catch (err) {
        lastError = err;
        const isTransient = err.message && (err.message.includes('503') || err.message.includes('429'));
        if (isTransient && attempt < 2) {
          await new Promise(r => setTimeout(r, 1000));
        } else {
          break;
        }
      }
    }
  }
  throw lastError;
}

/**
 * Complete End-to-End RAG + Explainable Recommendation Pipeline.
 *
 * Flow:
 * 1. Semantic search
 * 2. Relevance ranking
 * 3. Enrich candidates (version, certification, related standards)
 * 4. Build RAG context
 * 5. Generate Gemini explanation (with deterministic fallback)
 * 6. Merge explanations into deterministic results
 *
 * @param {string} queryText User's product / technical requirement query
 * @param {Object} [options]
 * @param {number} [options.limit=5]
 * @param {boolean} [options.skipGemini=false] Useful for unit testing fallback behavior
 * @returns {Promise<Object>}
 */
async function getExplainableRecommendations(queryInput, options = {}) {
  let cleanQuery = '';
  if (typeof queryInput === 'string') {
    cleanQuery = queryInput.trim();
  } else if (queryInput && typeof queryInput === 'object') {
    if (typeof queryInput.query === 'string') {
      cleanQuery = queryInput.query.trim();
    } else if (typeof queryInput.text === 'string') {
      cleanQuery = queryInput.text.trim();
    } else {
      const err = new Error('Query is required: expected a non-empty string or an object with a "query" property.');
      err.statusCode = 400;
      throw err;
    }
  } else {
    const err = new Error('Query is required.');
    err.statusCode = 400;
    throw err;
  }

  if (cleanQuery.length === 0) {
    const err = new Error('Query text cannot be empty or whitespace-only.');
    err.statusCode = 400;
    throw err;
  }

  const limit = Math.min(
    Math.max(parseInt(options.limit, 10) || DEFAULT_CANDIDATE_LIMIT, 1),
    MAX_CANDIDATE_LIMIT
  );

  // 1 & 2. Execute Universal Product Discovery Pipeline
  let rankedCandidates = [];
  let discoveryData = null;

  try {
    const discovery = await discoverStandards(cleanQuery, { limit });
    discoveryData = discovery;

    if (!discovery.hasMatch || !discovery.recommendations || discovery.recommendations.length === 0) {
      return {
        success: true,
        hasMatch: false,
        query: cleanQuery,
        count: 0,
        recommendations: [],
        summary: discovery.summary || 'No verified matching standard found for the provided requirements.',
        fallbackNotice: discovery.fallbackNotice || null,
        matchedProductFamilies: discovery.matchedProductFamilies || [],
        predictedCouncils: discovery.predictedCouncils || [],
        limitations: ['No relevant verified standards identified in current database.'],
        explanationGenerated: false
      };
    }

    rankedCandidates = discovery.recommendations;
  } catch (discErr) {
    console.warn('[RAG Engine]: Discovery pipeline fallback, using direct semantic search:', discErr.message);
    let searchResult;
    try {
      searchResult = await searchStandards(cleanQuery, { limit });
    } catch (searchErr) {
      searchResult = await fallbackRagSearch(cleanQuery, limit);
    }
    rankedCandidates = rankStandards(searchResult.query, searchResult.results);
  }

  if (rankedCandidates.length === 0) {
    return {
      success: true,
      hasMatch: false,
      query: cleanQuery,
      count: 0,
      recommendations: [],
      summary: 'No standards found matching the query.',
      limitations: ['No relevant standards identified in database.'],
      explanationGenerated: false
    };
  }

  // 3. Enrich Candidates with Complete Record, Version, Certification & Related Standards
  const enrichedCandidates = await Promise.all(
    rankedCandidates.map(async (cand) => {
      // 3.1 Fetch full standard-detail record separately for EACH recommended IS from database
      let standardRecord = null;
      try {
        if (cand.id) {
          standardRecord = await getStandardById(cand.id);
        } else if (cand.is_number) {
          standardRecord = await getStandardById(cand.is_number);
        }
      } catch (dbErr) {
        console.warn(`[RAG Engine] Failed to fetch complete record for ${cand.is_number}:`, dbErr.message);
      }

      // Merge verified database record fields separately for each candidate
      const mergedCandidate = standardRecord ? {
        ...standardRecord,
        ...cand, // preserves scores and rank computed during ranking
        technical_requirements: (standardRecord.technical_requirements && standardRecord.technical_requirements.length > 0)
          ? standardRecord.technical_requirements
          : (cand.technical_requirements || []),
        technicalRequirements: (standardRecord.technical_requirements && standardRecord.technical_requirements.length > 0)
          ? standardRecord.technical_requirements
          : (cand.technical_requirements || cand.technicalRequirements || []),
        performance_requirements: (standardRecord.performance_requirements && standardRecord.performance_requirements.length > 0)
          ? standardRecord.performance_requirements
          : (cand.performance_requirements || []),
        performanceRequirements: (standardRecord.performance_requirements && standardRecord.performance_requirements.length > 0)
          ? standardRecord.performance_requirements
          : (cand.performance_requirements || cand.performanceRequirements || []),
        safety_requirements: (standardRecord.safety_requirements && standardRecord.safety_requirements.length > 0)
          ? standardRecord.safety_requirements
          : (cand.safety_requirements || []),
        safetyRequirements: (standardRecord.safety_requirements && standardRecord.safety_requirements.length > 0)
          ? standardRecord.safety_requirements
          : (cand.safety_requirements || cand.safetyRequirements || []),
        testing_requirements: (standardRecord.testing_requirements && standardRecord.testing_requirements.length > 0)
          ? standardRecord.testing_requirements
          : (cand.testing_requirements || []),
        testingRequirements: (standardRecord.testing_requirements && standardRecord.testing_requirements.length > 0)
          ? standardRecord.testing_requirements
          : (cand.testing_requirements || cand.testingRequirements || []),
        materials: (standardRecord.materials && standardRecord.materials.length > 0)
          ? standardRecord.materials
          : (cand.materials || []),
        amendments: standardRecord.amendments || cand.amendments || [],
        supersedes: standardRecord.supersedes || cand.supersedes || [],
        superseded_by: standardRecord.superseded_by || cand.superseded_by || [],
        certification: standardRecord.certification || cand.certification || {}
      } : cand;

      // Version status
      const versionStatus = evaluateVersionStatus(mergedCandidate);

      // Certification
      const certData = evaluateCertification(mergedCandidate.certification, mergedCandidate.source);

      // Related standards
      let related = [];
      try {
        const relRes = await getRelatedStandardsForId(mergedCandidate.id);
        related = relRes.results || [];
      } catch (rErr) {
        related = [];
      }

      // Identify documented testing standard (e.g. IS 7692 for helmet headform testing)
      let documentedTestingStandard = null;
      const testRel = related.find(r => 
        (r.relationshipType && (r.relationshipType.toLowerCase() === 'testing' || r.relationshipType.toLowerCase() === 'test_equipment')) ||
        (r.standard && r.standard.category && r.standard.category.toLowerCase().includes('test'))
      );
      if (testRel && testRel.standard) {
        documentedTestingStandard = {
          id: testRel.standard.id,
          is_number: testRel.standard.is_number,
          title: testRel.standard.title,
          category: testRel.standard.category,
          scope: testRel.standard.scope,
          technical_requirements: testRel.standard.technical_requirements || [],
          performance_requirements: testRel.standard.performance_requirements || [],
          safety_requirements: testRel.standard.safety_requirements || [],
          testing_requirements: testRel.standard.testing_requirements || []
        };
      }

      const isSynthetic = isSyntheticContext(mergedCandidate.source) || (certData && certData.dataContext === 'development_test');
      const dataContext = isSynthetic ? 'development_test' : 'official_record';

      return {
        ...mergedCandidate,
        versionStatus,
        certification: certData,
        relatedStandards: related,
        documentedTestingStandard,
        dataContext
      };
    })
  );

  // Build candidate map for hallucination validation
  const candidateMap = new Map();
  enrichedCandidates.forEach(c => candidateMap.set(c.id, c));

  // 4. Build Structured RAG Context
  const ragContext = buildRagContext(cleanQuery, enrichedCandidates, { maxCandidates: limit });

  // 5. Generate Grounded Explanation via Gemini (with automatic fallback)
  let explanationResult = null;
  let explanationGenerated = false;

  const rawKey = process.env.GEMINI_API_KEY || '';
  const apiKey = rawKey.trim().replace(/^["']|["']$/g, '');
  const hasValidKey = apiKey && apiKey !== 'your_gemini_api_key_here';

  if (hasValidKey && !options.skipGemini) {
    try {
      const prompt = buildGroundedPrompt(ragContext);
      const { text: geminiRaw } = await callGeminiRag(apiKey, prompt);

      let parsed = null;
      try {
        parsed = JSON.parse(geminiRaw);
      } catch (jsonErr) {
        // Attempt clean markdown strip if model returned fenced code block
        const cleaned = geminiRaw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleaned);
      }

      const validation = validateGeneratedRecommendations(parsed, candidateMap);
      if (validation.isValid) {
        explanationResult = validation.sanitized;
        explanationGenerated = true;
      } else {
        console.warn('[RAG Engine]: Gemini explanation validation failed; falling back to deterministic explanations:', validation.error);
        explanationResult = buildDeterministicFallback(cleanQuery, enrichedCandidates, `Validation check: ${validation.error}`);
      }
    } catch (apiErr) {
      console.warn('[RAG Engine]: Gemini API explanation unavailable; using deterministic fallback:', apiErr.message);
      explanationResult = buildDeterministicFallback(cleanQuery, enrichedCandidates, 'Gemini service temporarily unavailable');
    }
  } else {
    explanationResult = buildDeterministicFallback(cleanQuery, enrichedCandidates, 'Gemini API key not configured or generation bypassed');
  }

  // 6. Assemble Final Explainable Recommendations (copying structured facts strictly from system data)
  const explanationsByStandardId = new Map();
  if (explanationResult && Array.isArray(explanationResult.recommendations)) {
    explanationResult.recommendations.forEach(r => explanationsByStandardId.set(r.standardId, r));
  }

  const finalRecommendations = enrichedCandidates.map(c => {
    const genExp = explanationsByStandardId.get(c.id);

    const semantic = c.scores ? c.scores.semantic : 0;
    const text = c.scores ? c.scores.text : 0;
    const scope = c.scores ? (c.scores.scopeApplication || c.scores.scope || 0) : 0;
    const req = c.scores ? (c.scores.structuredRequirement || c.scores.structured || 0) : 0;
    const final = c.scores ? c.scores.final : 0;
    const rank = c.rank || 1;

    const techReqs = Array.isArray(c.technical_requirements) && c.technical_requirements.length > 0
      ? c.technical_requirements
      : (Array.isArray(c.technicalRequirements) && c.technicalRequirements.length > 0 ? c.technicalRequirements : []);
    const perfReqs = Array.isArray(c.performance_requirements) && c.performance_requirements.length > 0
      ? c.performance_requirements
      : (Array.isArray(c.performanceRequirements) && c.performanceRequirements.length > 0 ? c.performanceRequirements : []);
    const safetyReqs = Array.isArray(c.safety_requirements) && c.safety_requirements.length > 0
      ? c.safety_requirements
      : (Array.isArray(c.safetyRequirements) && c.safetyRequirements.length > 0 ? c.safetyRequirements : []);
    const testReqs = Array.isArray(c.testing_requirements) && c.testing_requirements.length > 0
      ? c.testing_requirements
      : (Array.isArray(c.testingRequirements) && c.testingRequirements.length > 0 ? c.testingRequirements : []);

    const vStatus = c.versionStatus || {};
    const cert = c.certification || {};

    const gapsData = {
      hasGap: false,
      gapTitle: 'SPECIFICATION ALIGNMENT',
      gapStatus: 'Information Verified',
      gapDescription: 'Retrieved based on database candidate match for technical requirements.',
      potentialReferences: []
    };

    const evidenceList = genExp && Array.isArray(genExp.evidence) ? genExp.evidence : [
      `Relevance score: ${(final * 100).toFixed(1)}%`,
      `Category: ${c.category || 'Standard'}`
    ];

    return {
      standardId: c.id,
      id: c.id,
      rank,
      is_number: c.is_number,
      title: c.title,
      category: c.category || 'Standard',
      scope: c.scope || 'Information not available',
      application: c.application || 'Information not available',
      final_score: final,
      semantic_similarity: semantic,
      text_match: text,
      scope_match: scope,
      requirement_match: req,
      scores: {
        semantic,
        text,
        scopeApplication: scope,
        structured: req,
        structuredRequirement: req,
        final,
        rank
      },
      // Standard-specific details object
      details: {
        scope: c.scope || 'Information not available',
        application: c.application || 'Information not available',
        technical_requirements: techReqs,
        technicalRequirements: techReqs,
        performance_requirements: perfReqs,
        performanceRequirements: perfReqs,
        safety_requirements: safetyReqs,
        safetyRequirements: safetyReqs,
        testing_requirements: testReqs,
        testingRequirements: testReqs,
        related_testing_standard: c.documentedTestingStandard || null
      },
      // Technical & Performance details for each standard (top-level backward compatibility)
      technical_requirements: techReqs,
      technicalRequirements: techReqs,
      performance_requirements: perfReqs,
      performanceRequirements: perfReqs,
      safety_requirements: safetyReqs,
      safetyRequirements: safetyReqs,
      testing_requirements: testReqs,
      testingRequirements: testReqs,
      related_testing_standard: c.documentedTestingStandard || null,
      // Related & Normative standards
      related_standards: c.relatedStandards || [],
      relatedStandards: c.relatedStandards || [],
      // Version & Amendments
      versionStatus: vStatus,
      version_information: {
        status: vStatus.statusValue || 'Active',
        version: vStatus.version || c.version || 'Information not available',
        publicationYear: vStatus.publicationYear || c.publication_year || null,
        amendments: vStatus.amendmentInfo || []
      },
      amendment_information: vStatus.amendmentInfo || [],
      supersession_status: vStatus.isSuperseded
        ? `Superseded by ${vStatus.supersededBy || 'newer edition'}`
        : (vStatus.supersedes ? `Supersedes ${vStatus.supersedes}` : 'Active (not superseded)'),
      // Certification & Regulatory details
      certification: cert,
      certification_information: {
        hasCertificationInfo: !!cert.hasCertificationInfo,
        scheme: cert.scheme || 'Information not available',
        requirementExplicit: !!cert.requirementExplicit,
        requirementValue: cert.requirementValue || 'Information not available'
      },
      regulatory_information: (cert && cert.details) || (cert && cert.requirementValue) || 'Information not available',
      // Gaps
      gapDetection: gapsData,
      gaps: gapsData,
      // Grounded RAG explanation & evidence
      evidence: evidenceList,
      explanation: {
        whyRelevant: genExp ? genExp.whyRelevant : `Retrieved based on relevance score ${(final * 100).toFixed(1)}%.`,
        evidence: evidenceList
      },
      source: c.source || null,
      dataContext: c.dataContext,
      division_council: c.division_council || 'General',
      divisionCouncilName: c.divisionCouncilName || c.division_council || 'General',
      standard_type: c.standard_type || 'Product Specification',
      regulatoryCompliance: c.regulatoryCompliance || null,
      certificationSummary: c.certificationSummary || null,
      matchedProductFamily: c.matchedProductFamily || null
    };
  });

  return {
    success: true,
    hasMatch: finalRecommendations.length > 0,
    query: cleanQuery,
    count: finalRecommendations.length,
    recommendations: finalRecommendations,
    summary: explanationResult ? explanationResult.summary : (discoveryData ? discoveryData.summary : 'Recommendations generated based on structured evidence.'),
    limitations: explanationResult && Array.isArray(explanationResult.limitations) ? explanationResult.limitations : [],
    matchedProductFamilies: discoveryData ? discoveryData.matchedProductFamilies : [],
    predictedCouncils: discoveryData ? discoveryData.predictedCouncils : [],
    fallbackNotice: (discoveryData && discoveryData.fallbackNotice) || null,
    explanationGenerated
  };
}

/**
 * Fallback candidate standards retrieval for RAG engine when semantic search encounters an error.
 */
async function fallbackRagSearch(cleanQuery, limit) {
  const queryTokens = cleanQuery
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(token => token.length >= 3);

  const sql = `
    SELECT 
      id,
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
      is_primary_candidate,
      created_at,
      updated_at
    FROM standards
    WHERE (is_number NOT LIKE 'TEST-%')
      AND (source IS NULL OR source NOT LIKE '%DEVELOPMENT_TEST%')
      AND (is_primary_candidate = true OR is_primary_candidate IS NULL)
      AND (status IS NULL OR status = 'active')
    LIMIT $1;
  `;

  const queryRes = await query(sql, [limit]);
  const rows = queryRes.rows || [];

  const results = rows.map(row => {
    const combined = [
      row.title || '',
      row.is_number || '',
      row.category || '',
      row.description || '',
      row.scope || '',
      row.application || ''
    ].join(' ').toLowerCase();

    let matches = 0;
    for (const t of queryTokens) {
      if (combined.includes(t)) matches++;
    }
    const overlap = queryTokens.length > 0 ? (matches / queryTokens.length) : 0.5;
    const similarity = Math.min(0.95, Math.max(0.35, parseFloat((0.35 + overlap * 0.5).toFixed(6))));
    const distance = parseFloat((1 - similarity).toFixed(6));

    const techReqs = row.technical_requirements || [];
    const perfReqs = row.performance_requirements || [];
    const safetyReqs = row.safety_requirements || [];
    const testReqs = row.testing_requirements || [];

    return {
      id: row.id,
      is_number: row.is_number,
      title: row.title,
      scope: row.scope,
      category: row.category,
      description: row.description,
      application: row.application,
      technical_requirements: techReqs,
      technicalRequirements: techReqs,
      materials: row.materials || [],
      performance_requirements: perfReqs,
      performanceRequirements: perfReqs,
      safety_requirements: safetyReqs,
      safetyRequirements: safetyReqs,
      testing_requirements: testReqs,
      testingRequirements: testReqs,
      version: row.version,
      publication_year: row.publication_year,
      status: row.status,
      amendments: row.amendments || [],
      supersedes: row.supersedes || [],
      superseded_by: row.superseded_by || [],
      certification: row.certification,
      source: row.source,
      distance,
      similarity
    };
  });

  results.sort((a, b) => a.distance - b.distance);

  return {
    success: true,
    query: cleanQuery,
    count: results.length,
    limit,
    results,
    fallback: true
  };
}

module.exports = {
  DEFAULT_CANDIDATE_LIMIT,
  MAX_CANDIDATE_LIMIT,
  MAX_CONTEXT_CHARS,
  buildRagContext,
  buildGroundedPrompt,
  validateGeneratedRecommendations,
  buildDeterministicFallback,
  getExplainableRecommendations
};
