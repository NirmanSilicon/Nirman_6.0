// =========================================================
// Nirdeshak - Step 11: RAG + Explainable Recommendations Engine Test Suite
// Verifies:
// 1. Module loading & interface exports
// 2. buildRagContext context construction & size limits
// 3. buildGroundedPrompt prompt grounding & integrity rules
// 4. validateGeneratedRecommendations hallucination rejection
//    (fabricated standard IDs, unknown IS numbers, malformed schemas)
// 5. buildDeterministicFallback factual fallback generation
// 6. Live API endpoint POST /api/recommendations/explain (Query A & B)
// 7. Hallucination-free candidate attribution
// 8. Provenance & synthetic development/test data identification
// 9. Input validation & error handling (HTTP 400)
// 10. Raw vector & API key security protection
// 11. Database read-only behavior & schema integrity
// =========================================================

const http = require('http');
const { query } = require('./database');
const {
  DEFAULT_CANDIDATE_LIMIT,
  MAX_CANDIDATE_LIMIT,
  MAX_CONTEXT_CHARS,
  buildRagContext,
  buildGroundedPrompt,
  validateGeneratedRecommendations,
  buildDeterministicFallback,
  getExplainableRecommendations
} = require('./rag');

const SERVER_URL = 'http://127.0.0.1:3000';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

function httpPost(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(`${SERVER_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const resBody = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: resBody, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: null, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runStep11Tests() {
  console.log('====================================================');
  console.log('STARTING NIRDESHAK STEP 11: RAG RECOMMENDATION TESTS');
  console.log('====================================================\n');

  // Snapshot database counts for read-only verification
  const initStdRes = await query('SELECT count(*)::int AS count FROM standards;');
  const initRelRes = await query('SELECT count(*)::int AS count FROM standard_relationships;');
  const initialStdCount = initStdRes.rows[0].count;
  const initialRelCount = initRelRes.rows[0].count;

  // -------------------------------------------------------------------------
  // Part 1: Module Loading & Interface Verification
  // -------------------------------------------------------------------------
  console.log('--- PART 1: MODULE LOADING & INTERFACES ---');
  assert(DEFAULT_CANDIDATE_LIMIT === 5, 'DEFAULT_CANDIDATE_LIMIT is 5');
  assert(MAX_CANDIDATE_LIMIT === 10, 'MAX_CANDIDATE_LIMIT is 10');
  assert(MAX_CONTEXT_CHARS === 15000, 'MAX_CONTEXT_CHARS is 15000');
  assert(typeof buildRagContext === 'function', 'buildRagContext is exported');
  assert(typeof buildGroundedPrompt === 'function', 'buildGroundedPrompt is exported');
  assert(typeof validateGeneratedRecommendations === 'function', 'validateGeneratedRecommendations is exported');
  assert(typeof buildDeterministicFallback === 'function', 'buildDeterministicFallback is exported');
  assert(typeof getExplainableRecommendations === 'function', 'getExplainableRecommendations is exported');

  // -------------------------------------------------------------------------
  // Part 2: RAG Context Construction Unit Tests
  // -------------------------------------------------------------------------
  console.log('\n--- PART 2: RAG CONTEXT CONSTRUCTION ---');
  const mockCandidates = [
    {
      id: 1,
      is_number: 'TEST-IS-2925-MOCK',
      title: 'Safety Helmet Spec',
      category: 'PPE',
      scope: 'Standard scope for safety helmets',
      application: 'Construction head protection',
      description: 'Test description',
      scores: { semantic: 0.8, text: 0.5, scopeApplication: 0.5, structured: 0.5, final: 0.7 },
      versionStatus: { statusCategory: 'current', statusValue: 'active', hasAmendments: false, version: '2026' },
      certification: { hasCertificationInfo: true, scheme: 'Mock Scheme', requirementExplicit: false },
      relatedStandards: [{ relationshipId: 1, relationshipType: 'testing', standard: { id: 2, is_number: 'TEST-IS-4151-MOCK' } }],
      source: 'DEVELOPMENT_TEST_DATA'
    }
  ];

  const ctx = buildRagContext('Safety helmets', mockCandidates, { maxCandidates: 5 });
  assert(ctx.userQuery === 'Safety helmets', 'Context preserves user query');
  assert(ctx.retrievedCandidatesCount === 1, 'Context contains 1 candidate');
  assert(ctx.candidates[0].standardId === 1, 'Candidate standardId preserved');
  assert(ctx.candidates[0].is_number === 'TEST-IS-2925-MOCK', 'Candidate is_number preserved');
  assert(ctx.candidates[0].scores.finalRelevanceScore === 0.7, 'Candidate final score preserved');
  assert(ctx.candidates[0].versionStatus.statusCategory === 'current', 'Candidate version status preserved');
  assert(ctx.candidates[0].certification.scheme === 'Mock Scheme', 'Candidate certification scheme preserved');
  assert(ctx.candidates[0].provenance.dataContext === 'development_test', 'Provenance identified as development_test');

  // Check raw vector protection in context
  assert(ctx.candidates[0].embedding === undefined, 'No raw embedding vector in RAG context');

  // -------------------------------------------------------------------------
  // Part 3: Grounded Prompt Construction & Safety Truncation
  // -------------------------------------------------------------------------
  console.log('\n--- PART 3: PROMPT GROUNDING & TRUNCATION ---');
  const prompt = buildGroundedPrompt(ctx);
  assert(prompt.includes('STRICT GROUNDING & INTEGRITY RULES'), 'Prompt contains strict grounding rules');
  assert(prompt.includes('Do NOT invent new standards'), 'Prompt forbids inventing standards');
  assert(prompt.includes('development_test'), 'Prompt instructs preserving development_test context');
  assert(prompt.includes('REQUIRED OUTPUT JSON SCHEMA'), 'Prompt requests valid JSON schema');

  // Oversized context safety truncation
  const hugeMock = [{ ...mockCandidates[0], description: 'X'.repeat(20000) }];
  const hugeCtx = buildRagContext('Query', hugeMock);
  const truncatedPrompt = buildGroundedPrompt(hugeCtx);
  assert(truncatedPrompt.length <= MAX_CONTEXT_CHARS + 1500, 'Context is safely truncated without throwing');

  // -------------------------------------------------------------------------
  // Part 4: Hallucination Rejection & Validation Unit Tests
  // -------------------------------------------------------------------------
  console.log('\n--- PART 4: HALLUCINATION REJECTION & VALIDATION ---');
  const candidateMap = new Map();
  candidateMap.set(1, mockCandidates[0]);

  // Valid Gemini response
  const validOutput = {
    summary: 'Retrieved helmet specifications.',
    recommendations: [
      {
        standardId: 1,
        is_number: 'TEST-IS-2925-MOCK',
        whyRelevant: 'Matches head protection requirements.',
        evidence: ['High semantic similarity', 'Active status']
      }
    ],
    limitations: ['Synthetic record context']
  };
  const valSuccess = validateGeneratedRecommendations(validOutput, candidateMap);
  assert(valSuccess.isValid === true, 'Valid recommendation accepted');
  assert(valSuccess.sanitized.recommendations.length === 1, 'Valid recommendation preserved');

  // Hallucinated standard ID
  const hallIdOutput = {
    summary: 'Summary',
    recommendations: [
      {
        standardId: 9999, // Unknown ID!
        is_number: 'IS-UNKNOWN',
        whyRelevant: 'Fabricated standard'
      }
    ]
  };
  const valHallId = validateGeneratedRecommendations(hallIdOutput, candidateMap);
  assert(valHallId.isValid === false, 'Rejects hallucinated standardId');
  assert(valHallId.error.includes('Hallucinated standardId'), 'Identifies hallucinated standardId error');

  // Hallucinated IS number for valid ID
  const hallIsNumOutput = {
    summary: 'Summary',
    recommendations: [
      {
        standardId: 1,
        is_number: 'IS-FABRICATED-999', // Mismatched IS number!
        whyRelevant: 'Mismatched number'
      }
    ]
  };
  const valHallIsNum = validateGeneratedRecommendations(hallIsNumOutput, candidateMap);
  assert(valHallIsNum.isValid === false, 'Rejects hallucinated is_number');
  assert(valHallIsNum.error.includes('Hallucinated is_number'), 'Identifies hallucinated is_number error');

  // Empty recommendations
  const valEmpty = validateGeneratedRecommendations({ summary: 'Empty', recommendations: [] }, candidateMap);
  assert(valEmpty.isValid === false, 'Rejects empty recommendations array');

  // Malformed non-object
  const valNull = validateGeneratedRecommendations(null, candidateMap);
  assert(valNull.isValid === false, 'Rejects null generated output');

  // -------------------------------------------------------------------------
  // Part 5: Deterministic Fallback Generation Unit Tests
  // -------------------------------------------------------------------------
  console.log('\n--- PART 5: DETERMINISTIC FALLBACK GENERATION ---');
  const fallback = buildDeterministicFallback('Safety helmets', mockCandidates, 'Simulated API outage');
  assert(typeof fallback.summary === 'string' && fallback.summary.includes('Safety helmets'), 'Fallback produces query-grounded summary');
  assert(fallback.recommendations.length === 1, 'Fallback produces candidate recommendations');
  assert(fallback.recommendations[0].standardId === 1, 'Fallback recommendation has correct standardId');
  assert(fallback.recommendations[0].whyRelevant.includes('TEST-IS-2925-MOCK'), 'Fallback explanation mentions IS number');
  assert(fallback.recommendations[0].evidence.length >= 4, 'Fallback provides multiple evidence points');
  assert(fallback.limitations[0].includes('Deterministic fallback active'), 'Fallback limitations explain deterministic status');

  // -------------------------------------------------------------------------
  // Part 6: Live API Endpoint — Query A (Safety Helmet Specification)
  // -------------------------------------------------------------------------
  console.log('\n--- PART 6: LIVE API - QUERY A (SAFETY HELMETS) ---');
  const apiResA = await httpPost('/api/recommendations/explain', {
    query: 'Safety helmet for construction workers providing protection against mechanical impact.',
    limit: 5
  });

  assert(apiResA.status === 200, 'POST /api/recommendations/explain returns HTTP 200');
  assert(apiResA.body.success === true, 'Response body has success: true');
  assert(apiResA.body.count === 2, 'Response returns 2 recommendations');
  assert(Array.isArray(apiResA.body.recommendations), 'recommendations is an array');

  const topRecA = apiResA.body.recommendations[0];
  assert(topRecA.standardId === 1, 'Query A top rank is Standard ID 1 (TEST-IS-2925-MOCK)');
  assert(topRecA.is_number === 'TEST-IS-2925-MOCK', 'Top rank is_number is TEST-IS-2925-MOCK');
  assert(typeof topRecA.explanation.whyRelevant === 'string' && topRecA.explanation.whyRelevant.length > 20, 'whyRelevant explanation is non-empty');
  assert(Array.isArray(topRecA.explanation.evidence) && topRecA.explanation.evidence.length >= 2, 'evidence contains multiple bullet points');
  assert(topRecA.scores && typeof topRecA.scores.final === 'number', 'scores object contains final relevance score');
  assert(topRecA.versionStatus && topRecA.versionStatus.statusCategory === 'current', 'versionStatus preserves active category');
  assert(topRecA.certification && topRecA.certification.dataContext === 'development_test', 'certification preserves development_test context');
  assert(topRecA.dataContext === 'development_test', 'dataContext flagged as development_test');
  assert(Array.isArray(topRecA.relatedStandards) && topRecA.relatedStandards.length === 1, 'relatedStandards includes outgoing relationship to ID 2');

  const secondRecA = apiResA.body.recommendations[1];
  assert(secondRecA.standardId === 2, 'Query A second rank is Standard ID 2 (TEST-IS-4151-MOCK)');
  assert(secondRecA.is_number === 'TEST-IS-4151-MOCK', 'Second rank is_number is TEST-IS-4151-MOCK');
  assert(typeof apiResA.body.summary === 'string' && apiResA.body.summary.length > 20, 'summary is non-empty');
  assert(Array.isArray(apiResA.body.limitations), 'limitations is an array');

  // -------------------------------------------------------------------------
  // Part 7: Live API Endpoint — Query B (Protective Helmet Testing Methods)
  // -------------------------------------------------------------------------
  console.log('\n--- PART 7: LIVE API - QUERY B (TESTING METHODS) ---');
  const apiResB = await httpPost('/api/recommendations/explain', {
    query: 'Protective helmet testing methods and impact attenuation procedures.',
    limit: 5
  });

  assert(apiResB.status === 200, 'Query B returns HTTP 200');
  assert(apiResB.body.success === true, 'Query B success: true');
  assert(apiResB.body.recommendations[0].standardId === 2, 'Query B top rank is Standard ID 2 (TEST-IS-4151-MOCK)');
  assert(apiResB.body.recommendations[0].is_number === 'TEST-IS-4151-MOCK', 'Query B top is_number is TEST-IS-4151-MOCK');

  // -------------------------------------------------------------------------
  // Part 8: Fallback / Bypass Pipeline Verification
  // -------------------------------------------------------------------------
  console.log('\n--- PART 8: DETERMINISTIC PIPELINE FALLBACK MODE ---');
  const bypassRes = await getExplainableRecommendations('Safety helmets', { skipGemini: true });
  assert(bypassRes.success === true, 'Pipeline succeeds in bypass mode');
  assert(bypassRes.explanationGenerated === false, 'explanationGenerated is false in fallback mode');
  assert(bypassRes.recommendations.length === 2, 'All candidates preserved in fallback mode');
  assert(bypassRes.limitations[0].includes('Deterministic fallback active'), 'Fallback explains deterministic rationale');

  // -------------------------------------------------------------------------
  // Part 9: Error Handling — Invalid Inputs
  // -------------------------------------------------------------------------
  console.log('\n--- PART 9: ERROR HANDLING ---');
  const errEmpty = await httpPost('/api/recommendations/explain', { query: '' });
  assert(errEmpty.status === 400, 'Empty query returns HTTP 400');
  assert(errEmpty.body.success === false, 'Empty query body has success: false');

  const errMissing = await httpPost('/api/recommendations/explain', {});
  assert(errMissing.status === 400, 'Missing query returns HTTP 400');

  const errWhitespace = await httpPost('/api/recommendations/explain', { query: '   ' });
  assert(errWhitespace.status === 400, 'Whitespace query returns HTTP 400');

  // -------------------------------------------------------------------------
  // Part 10: Raw Vector & Secrets Protection
  // -------------------------------------------------------------------------
  console.log('\n--- PART 10: RAW VECTOR & SECRETS PROTECTION ---');
  assert(!apiResA.raw.includes('"embedding"'), 'Raw JSON does NOT contain "embedding"');
  assert(!apiResA.raw.includes('AIzaSy'), 'No Gemini API key exposed in response');
  assert(!apiResA.raw.includes('postgres://'), 'No database URL exposed in response');

  // -------------------------------------------------------------------------
  // Part 11: Database Read-Only & Integrity Verification
  // -------------------------------------------------------------------------
  console.log('\n--- PART 11: DATABASE READ-ONLY & INTEGRITY VERIFICATION ---');
  const postStdRes = await query('SELECT count(*)::int AS count FROM standards;');
  const postRelRes = await query('SELECT count(*)::int AS count FROM standard_relationships;');
  const postStdCount = postStdRes.rows[0].count;
  const postRelCount = postRelRes.rows[0].count;

  assert(postStdCount === initialStdCount, `Standards table count unchanged: ${postStdCount} === ${initialStdCount}`);
  assert(postRelCount === initialRelCount, `Relationships table count unchanged: ${postRelCount} === ${initialRelCount}`);

  // Verify embedding integrity
  const embCheck = await query('SELECT id, is_number, vector_dims(embedding) as dims FROM standards ORDER BY id;');
  assert(embCheck.rows.length === 2, 'Exactly 2 standards in database');
  assert(embCheck.rows[0].dims === 3072 && embCheck.rows[1].dims === 3072, 'Both standards maintain 3072-dimensional embeddings');

  // Verify relationship data unchanged
  const relCheck = await query('SELECT * FROM standard_relationships WHERE id = 1;');
  assert(relCheck.rows.length === 1, 'Relationship ID 1 exists');
  assert(relCheck.rows[0].source_standard_id === 1 && relCheck.rows[0].target_standard_id === 2, 'Relationship endpoints unchanged (1 -> 2)');
  assert(relCheck.rows[0].relationship_type === 'testing', 'Relationship type unchanged ("testing")');

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n====================================================');
  console.log(`STEP 11 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runStep11Tests().catch(err => {
  console.error('Fatal error in Step 11 tests:', err);
  process.exit(1);
});
