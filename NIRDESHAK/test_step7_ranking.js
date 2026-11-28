// =========================================================
// Nirdeshak - Step 7 Relevance Ranking Test Suite
// Verifies:
// - Direct ranking.js module logic (tokenization, scoring, tie-breaking)
// - POST /api/search/ranked endpoint integration
// - Multi-signal weighted formula verification (60/20/10/10)
// - Score consistency & floating-point precision checks
// - Determinism across repeated queries
// - Query tests A, B, and C
// - Limit handling and clamping
// - Input validation & 400 error handling
// - Zero leakage of raw 3072-dim vectors or API keys
// - Database integrity (read-only verification)
// =========================================================

const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const {
  WEIGHTS,
  tokenize,
  extractTextFromField,
  computeOverlapRatio,
  calculateSemanticScore,
  calculateTextRelevanceScore,
  calculateScopeApplicationScore,
  calculateStructuredRequirementScore,
  rankStandards
} = require('./ranking');
const { query } = require('./database');

const BASE_URL = 'http://127.0.0.1:3000';

function makeRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const headers = {};
    if (postData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      path: endpoint,
      method: method,
      headers: headers,
      timeout: 30000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed,
          rawBody: data
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('Request timed out after 30s')));
    if (postData) req.write(postData);
    req.end();
  });
}

async function runStep7TestSuite() {
  console.log('=====================================================');
  console.log('  NIRDESHAK - STEP 7: RELEVANCE RANKING TEST SUITE  ');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;
  const results = [];

  function record(testName, passedCondition, details = '') {
    if (passedCondition) {
      console.log(`✅ PASS: ${testName} -> ${details}`);
      passed++;
      results.push({ test: testName, status: 'PASS', details });
    } else {
      console.error(`❌ FAIL: ${testName} -> ${details}`);
      failed++;
      results.push({ test: testName, status: 'FAIL', details });
    }
  }

  try {
    // -------------------------------------------------------------
    // Test Group 1: Module Unit Logic & Deterministic Functions
    // -------------------------------------------------------------
    console.log('--- 1. Testing ranking.js Module Unit Logic ---');
    const tokens = tokenize('Safety HELMET for industrial-workers in 2026!');
    const expectedTokens = ['safety', 'helmet', 'industrial', 'workers', '2026'];
    const tokensMatch = JSON.stringify(tokens) === JSON.stringify(expectedTokens);
    record('1. Tokenization filters stop words & punctuation', tokensMatch, `Tokens: [${tokens.join(', ')}]`);

    const extracted = extractTextFromField({
      reqs: ['Shell impact', 'Chinstrap'],
      details: { spec: 'HDPE' }
    });
    record('2. Recursive text extraction from JSON structures', extracted.includes('Shell impact') && extracted.includes('HDPE'), `Extracted: "${extracted}"`);

    const overlap1 = computeOverlapRatio(['helmet', 'safety'], 'Industrial safety helmet specifications');
    record('3. Token overlap ratio computation', overlap1 === 1.0, `Ratio: ${overlap1}`);

    const emptyCandidates = rankStandards('helmet', []);
    record('4. Empty candidate handling returns empty array', Array.isArray(emptyCandidates) && emptyCandidates.length === 0, `Length: ${emptyCandidates.length}`);

    // -------------------------------------------------------------
    // Test Group 2: Live Query A (Safety Helmet Specification)
    // -------------------------------------------------------------
    console.log('\n--- 2. Executing Test Query A (Safety Helmet Specification) ---');
    const queryA = "Safety helmet for construction workers providing protection against mechanical impact.";
    const resA = await makeRequest('POST', '/api/search/ranked', { query: queryA });

    const okA = resA.statusCode === 200 && resA.data && resA.data.success === true;
    record('5. Query A HTTP 200 & success structure', okA, `Status: ${resA.statusCode}`);

    const hasResultsA = okA && Array.isArray(resA.data.results) && resA.data.results.length === 2;
    record('6. Query A returns 2 ranked standards', hasResultsA, `Count: ${okA ? resA.data.results.length : 0}`);

    if (hasResultsA) {
      const topA = resA.data.results[0];
      const secondA = resA.data.results[1];
      console.log(`   Rank 1: ${topA.is_number} | Final Score: ${topA.scores.final} (Semantic: ${topA.scores.semantic}, Text: ${topA.scores.text}, Scope: ${topA.scores.scopeApplication}, Struct: ${topA.scores.structuredRequirement})`);
      console.log(`   Rank 2: ${secondA.is_number} | Final Score: ${secondA.scores.final} (Semantic: ${secondA.scores.semantic}, Text: ${secondA.scores.text}, Scope: ${secondA.scores.scopeApplication}, Struct: ${secondA.scores.structuredRequirement})`);

      record('7. Rank 1 has higher or equal final score than Rank 2', topA.scores.final >= secondA.scores.final, `Rank 1: ${topA.scores.final} >= Rank 2: ${secondA.scores.final}`);
      record('8. Query A top rank is TEST-IS-2925-MOCK', topA.is_number === 'TEST-IS-2925-MOCK', `Top: ${topA.is_number}`);
    }

    // -------------------------------------------------------------
    // Test Group 3: Formula & Weight Verification
    // -------------------------------------------------------------
    console.log('\n--- 3. Verifying Weighted Scoring Formula ---');
    if (hasResultsA) {
      let formulaConsistent = true;
      let maxDiff = 0;

      for (const item of resA.data.results) {
        const sc = item.scores;
        const expected = (
          sc.semantic * WEIGHTS.semantic +
          sc.text * WEIGHTS.text +
          sc.scopeApplication * WEIGHTS.scopeApplication +
          sc.structuredRequirement * WEIGHTS.structuredRequirement
        );
        const diff = Math.abs(sc.final - expected);
        if (diff > maxDiff) maxDiff = diff;
        // Check within floating-point rounding tolerance (0.0002)
        if (diff > 0.0002) {
          formulaConsistent = false;
        }
      }

      record('9. Final score matches weighted formula (60/20/10/10)', formulaConsistent, `Max difference: ${maxDiff.toFixed(6)}`);

      let scoresInRange = true;
      for (const item of resA.data.results) {
        const s = item.scores;
        for (const [k, v] of Object.entries(s)) {
          if (typeof v !== 'number' || isNaN(v) || v < 0 || v > 1) {
            scoresInRange = false;
          }
        }
      }
      record('10. All score components within [0, 1]', scoresInRange, 'All values valid floats in [0, 1]');
    }

    // -------------------------------------------------------------
    // Test Group 4: Live Query B (Helmet Testing Methods)
    // -------------------------------------------------------------
    console.log('\n--- 4. Executing Test Query B (Protective Helmet Testing Methods) ---');
    const queryB = "Protective helmet testing methods";
    const resB = await makeRequest('POST', '/api/search/ranked', { query: queryB });

    const okB = resB.statusCode === 200 && resB.data && resB.data.success === true;
    record('11. Query B HTTP 200 & success structure', okB, `Status: ${resB.statusCode}`);

    if (okB && Array.isArray(resB.data.results) && resB.data.results.length === 2) {
      const topB = resB.data.results[0];
      const secondB = resB.data.results[1];
      console.log(`   Rank 1: ${topB.is_number} | Final Score: ${topB.scores.final}`);
      console.log(`   Rank 2: ${secondB.is_number} | Final Score: ${secondB.scores.final}`);

      record('12. Query B top rank is TEST-IS-4151-MOCK', topB.is_number === 'TEST-IS-4151-MOCK', `Top: ${topB.is_number}`);
    }

    // -------------------------------------------------------------
    // Test Group 5: Live Query C (Industrial Safety Head Protection)
    // -------------------------------------------------------------
    console.log('\n--- 5. Executing Test Query C (Industrial Safety Head Protection) ---');
    const queryC = "Industrial safety head protection";
    const resC = await makeRequest('POST', '/api/search/ranked', { query: queryC });

    const okC = resC.statusCode === 200 && resC.data && resC.data.success === true;
    record('13. Query C HTTP 200 & success structure', okC, `Status: ${resC.statusCode}`);

    // -------------------------------------------------------------
    // Test Group 6: Determinism Test (Repeated Execution)
    // -------------------------------------------------------------
    console.log('\n--- 6. Verifying Determinism Across Multiple Calls ---');
    const det1 = await makeRequest('POST', '/api/search/ranked', { query: queryA });
    const det2 = await makeRequest('POST', '/api/search/ranked', { query: queryA });
    const det3 = await makeRequest('POST', '/api/search/ranked', { query: queryA });

    const det1Str = JSON.stringify(det1.data.results);
    const det2Str = JSON.stringify(det2.data.results);
    const det3Str = JSON.stringify(det3.data.results);

    const isDeterministic = det1Str === det2Str && det2Str === det3Str;
    record('14. Repeated executions yield identical scores & ranks', isDeterministic, '3 consecutive runs evaluated identically');

    // -------------------------------------------------------------
    // Test Group 7: Limit & Pagination Behavior
    // -------------------------------------------------------------
    console.log('\n--- 7. Testing Limit & Pagination Handling ---');
    const resLimit1 = await makeRequest('POST', '/api/search/ranked', { query: queryA, limit: 1 });
    record('15. Limit = 1 returns exactly 1 ranked standard', resLimit1.statusCode === 200 && resLimit1.data.results.length === 1, `Count: ${resLimit1.data?.results?.length}`);

    const resLimit2 = await makeRequest('POST', '/api/search/ranked', { query: queryA, limit: 2 });
    record('16. Limit = 2 returns exactly 2 ranked standards', resLimit2.statusCode === 200 && resLimit2.data.results.length === 2, `Count: ${resLimit2.data?.results?.length}`);

    const resLimitHigh = await makeRequest('POST', '/api/search/ranked', { query: queryA, limit: 100 });
    record('17. Excessive limit (100) clamped safely to 50', resLimitHigh.statusCode === 200 && resLimitHigh.data.limit === 50, `Clamped limit: ${resLimitHigh.data?.limit}`);

    const resLimitNeg = await makeRequest('POST', '/api/search/ranked', { query: queryA, limit: -5 });
    record('18. Negative limit safely defaults to 5', resLimitNeg.statusCode === 200 && resLimitNeg.data.limit === 5, `Default limit: ${resLimitNeg.data?.limit}`);

    // -------------------------------------------------------------
    // Test Group 8: Error & Input Validation (400 Responses)
    // -------------------------------------------------------------
    console.log('\n--- 8. Testing Edge Cases & Input Validation ---');
    const errMissing = await makeRequest('POST', '/api/search/ranked', {});
    record('19. Missing query rejected with HTTP 400', errMissing.statusCode === 400, `Error: "${errMissing.data?.error}"`);

    const errEmpty = await makeRequest('POST', '/api/search/ranked', { query: '' });
    record('20. Empty query rejected with HTTP 400', errEmpty.statusCode === 400, `Error: "${errEmpty.data?.error}"`);

    const errBlank = await makeRequest('POST', '/api/search/ranked', { query: '   ' });
    record('21. Whitespace query rejected with HTTP 400', errBlank.statusCode === 400, `Error: "${errBlank.data?.error}"`);

    // -------------------------------------------------------------
    // Test Group 9: Zero Vector & API Key Leakage
    // -------------------------------------------------------------
    console.log('\n--- 9. Verifying Security & Zero Vector Leakage ---');
    const allResponsesStr = [resA.rawBody, resB.rawBody, resC.rawBody, resLimit1.rawBody].join(' ');
    const vectorLeak = allResponsesStr.includes('[-0.') || allResponsesStr.includes('0.000739') ||
                       (resA.data.results && resA.data.results[0].embedding !== undefined);
    record('22. No 3072-dimensional vector arrays in response', !vectorLeak, `Payload size: ${resA.rawBody.length} bytes`);

    const apiKey = process.env.GEMINI_API_KEY || '';
    const keyLeak = apiKey ? allResponsesStr.includes(apiKey) : false;
    record('23. API key remains completely hidden', !keyLeak, 'Zero API key occurrences in responses');

    // -------------------------------------------------------------
    // Test Group 10: Database Integrity Verification
    // -------------------------------------------------------------
    console.log('\n--- 10. Verifying Database Integrity ---');
    const stdCountRes = await query('SELECT COUNT(*) AS total, COUNT(embedding) AS with_emb FROM standards;');
    const relCountRes = await query('SELECT COUNT(*) AS total FROM standard_relationships;');
    const dimRes = await query('SELECT id, is_number, vector_dims(embedding) FROM standards ORDER BY id;');

    record('24. Standards table count remains 2', stdCountRes.rows[0].total === '2', `Count: ${stdCountRes.rows[0].total}`);
    record('25. Standards with embeddings remains 2', stdCountRes.rows[0].with_emb === '2', `Count: ${stdCountRes.rows[0].with_emb}`);
    record('26. Both embeddings remain 3072 dimensions', dimRes.rows[0].vector_dims === 3072 && dimRes.rows[1].vector_dims === 3072, `Dims: ${dimRes.rows[0].vector_dims}, ${dimRes.rows[1].vector_dims}`);
    record('27. Relationships count remains 1', relCountRes.rows[0].total === '1', `Count: ${relCountRes.rows[0].total}`);

  } catch (err) {
    console.error('Test execution error:', err);
    record('Step 7 Suite Execution', false, err.message);
  }

  console.log('\n=====================================================');
  console.log(`SUMMARY: ${passed} / ${passed + failed} TESTS PASSED.`);
  console.log(`STEP 7 VERIFICATION: ${failed === 0 ? 'COMPLETE & VERIFIED ✅' : 'FAILED ❌'}`);
  console.log('=====================================================\n');

  return { passed, failed, total: passed + failed };
}

if (require.main === module) {
  runStep7TestSuite().then(({ failed }) => {
    process.exit(failed === 0 ? 0 : 1);
  });
}

module.exports = { runStep7TestSuite };
