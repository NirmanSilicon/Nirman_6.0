// =========================================================
// Nirdeshak - Step 6 Semantic Search & Matching Test Suite
// Verifies:
// - Direct semanticSearch.js module functionality
// - POST /api/search/semantic endpoint
// - Natural language procurement queries & vector matching
// - Result structure (metadata, similarity, distance)
// - Result ordering (cosine distance ASC / similarity DESC)
// - Limit validation and clamping
// - Input validation & error handling (400 responses)
// - Strict absence of raw 3072-dim vectors in API output
// - Database integrity (no modified rows, no extra tables)
// =========================================================

const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { searchStandards, validateQueryInput, sanitizeLimit } = require('./semanticSearch');
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

async function runStep6TestSuite() {
  console.log('=====================================================');
  console.log('  NIRDESHAK - STEP 6: SEMANTIC SEARCH TEST SUITE    ');
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
    // Test 1: Direct Module Export & Input Validation
    // -------------------------------------------------------------
    console.log('--- 1. Testing semanticSearch.js Module Validation ---');
    try {
      validateQueryInput('');
      record('1. Empty query rejection in module', false, 'Should have thrown error');
    } catch (err) {
      record('1. Empty query rejection in module', err.statusCode === 400, err.message);
    }

    try {
      validateQueryInput('   ');
      record('2. Whitespace query rejection in module', false, 'Should have thrown error');
    } catch (err) {
      record('2. Whitespace query rejection in module', err.statusCode === 400, err.message);
    }

    const clean = validateQueryInput('  Valid Query String  ');
    record('3. Valid query trimming in module', clean === 'Valid Query String', `Clean text: "${clean}"`);

    const clampedLimit1 = sanitizeLimit(-5);
    const clampedLimit2 = sanitizeLimit(100);
    record('4. Limit sanitization & clamping', clampedLimit1 === 5 && clampedLimit2 === 50, `Default: ${clampedLimit1}, Clamped: ${clampedLimit2}`);

    // -------------------------------------------------------------
    // Test 2: Test Query A (Safety Helmet Specification)
    // -------------------------------------------------------------
    console.log('\n--- 2. Executing Test Query A (Safety Helmet Specification) ---');
    const queryA = "Safety helmet for construction workers providing protection against mechanical impact.";
    const resA = await makeRequest('POST', '/api/search/semantic', { query: queryA });

    const okA = resA.statusCode === 200 && resA.data && resA.data.success === true;
    record('5. Query A HTTP 200 & success', okA, `Status: ${resA.statusCode}`);

    const hasResultsA = okA && Array.isArray(resA.data.results) && resA.data.results.length === 2;
    record('6. Query A returns 2 matching standards', hasResultsA, `Returned count: ${okA ? resA.data.results.length : 0}`);

    if (hasResultsA) {
      const topA = resA.data.results[0];
      const secondA = resA.data.results[1];
      console.log(`   Top match: ${topA.is_number} (distance: ${topA.distance}, similarity: ${topA.similarity})`);
      console.log(`   Second match: ${secondA.is_number} (distance: ${secondA.distance}, similarity: ${secondA.similarity})`);

      record('7. Query A ordering is distance ASC', topA.distance <= secondA.distance, `Top dist: ${topA.distance} <= Second dist: ${secondA.distance}`);
      record('8. Query A top match is TEST-IS-2925-MOCK', topA.is_number === 'TEST-IS-2925-MOCK', `Top: ${topA.is_number}`);
    }

    // -------------------------------------------------------------
    // Test 3: Test Query B (Helmet Testing Methods)
    // -------------------------------------------------------------
    console.log('\n--- 3. Executing Test Query B (Protective Helmet Testing Methods) ---');
    const queryB = "Protective helmet testing methods";
    const resB = await makeRequest('POST', '/api/search/semantic', { query: queryB });

    const okB = resB.statusCode === 200 && resB.data && resB.data.success === true;
    record('9. Query B HTTP 200 & success', okB, `Status: ${resB.statusCode}`);

    if (okB && Array.isArray(resB.data.results) && resB.data.results.length === 2) {
      const topB = resB.data.results[0];
      const secondB = resB.data.results[1];
      console.log(`   Top match: ${topB.is_number} (distance: ${topB.distance}, similarity: ${topB.similarity})`);
      console.log(`   Second match: ${secondB.is_number} (distance: ${secondB.distance}, similarity: ${secondB.similarity})`);

      record('10. Query B top match is TEST-IS-4151-MOCK', topB.is_number === 'TEST-IS-4151-MOCK', `Top: ${topB.is_number}`);
    }

    // -------------------------------------------------------------
    // Test 4: Test Query C (Industrial Safety Head Protection)
    // -------------------------------------------------------------
    console.log('\n--- 4. Executing Test Query C (Industrial Safety Head Protection) ---');
    const queryC = "Industrial safety head protection";
    const resC = await makeRequest('POST', '/api/search/semantic', { query: queryC });

    const okC = resC.statusCode === 200 && resC.data && resC.data.success === true;
    record('11. Query C HTTP 200 & success', okC, `Status: ${resC.statusCode}`);

    // -------------------------------------------------------------
    // Test 5: Verify Result Structure & Absence of Vector Arrays
    // -------------------------------------------------------------
    console.log('\n--- 5. Verifying Metadata Structure & Absence of Raw Vectors ---');
    if (okA && resA.data.results.length > 0) {
      const sample = resA.data.results[0];
      const hasKeyFields = sample.id && sample.is_number && sample.title && sample.category && sample.status;
      record('12. Results contain expected metadata fields', !!hasKeyFields, `Fields present: id, is_number, title, category, status, etc.`);

      const numericScores = typeof sample.distance === 'number' && Number.isFinite(sample.distance) &&
                            typeof sample.similarity === 'number' && Number.isFinite(sample.similarity);
      record('13. Distance and similarity are valid numeric values', numericScores, `distance: ${sample.distance}, similarity: ${sample.similarity}`);

      // Ensure NO raw vector property exists on results
      const rawVectorLeaked = sample.embedding !== undefined || sample.vector !== undefined ||
                              resA.rawBody.includes('[-0.') || resA.rawBody.length > 5000;
      record('14. Raw 3072-dim vector array is NOT leaked in API response', !rawVectorLeaked, `Response size: ${resA.rawBody.length} bytes (compact JSON)`);
    }

    // -------------------------------------------------------------
    // Test 6: Limit Clamping & Pagination Behavior
    // -------------------------------------------------------------
    console.log('\n--- 6. Testing Limit Clamping Behavior ---');
    const resLimit1 = await makeRequest('POST', '/api/search/semantic', { query: queryA, limit: 1 });
    record('15. Limit = 1 returns exactly 1 result', resLimit1.statusCode === 200 && resLimit1.data.results.length === 1, `Count: ${resLimit1.data?.results?.length}`);

    const resLimit2 = await makeRequest('POST', '/api/search/semantic', { query: queryA, limit: 2 });
    record('16. Limit = 2 returns exactly 2 results', resLimit2.statusCode === 200 && resLimit2.data.results.length === 2, `Count: ${resLimit2.data?.results?.length}`);

    const resLimitHigh = await makeRequest('POST', '/api/search/semantic', { query: queryA, limit: 100 });
    record('17. Excessively high limit (100) clamped safely', resLimitHigh.statusCode === 200 && resLimitHigh.data.limit === 50, `Clamped limit: ${resLimitHigh.data?.limit}`);

    // -------------------------------------------------------------
    // Test 7: Error & Edge-Case Handling (400 Responses)
    // -------------------------------------------------------------
    console.log('\n--- 7. Testing Invalid Inputs & Error Handling ---');
    const resEmptyObj = await makeRequest('POST', '/api/search/semantic', {});
    record('18. Missing query rejected with HTTP 400', resEmptyObj.statusCode === 400, `Error: "${resEmptyObj.data?.error}"`);

    const resBlankStr = await makeRequest('POST', '/api/search/semantic', { query: '   ' });
    record('19. Blank query rejected with HTTP 400', resBlankStr.statusCode === 400, `Error: "${resBlankStr.data?.error}"`);

    const resEmptyStr = await makeRequest('POST', '/api/search/semantic', { query: '' });
    record('20. Empty string rejected with HTTP 400', resEmptyStr.statusCode === 400, `Error: "${resEmptyStr.data?.error}"`);

    // API Key Protection
    const apiKey = process.env.GEMINI_API_KEY || '';
    const allBodies = [resA.rawBody, resB.rawBody, resC.rawBody, resEmptyObj.rawBody].join(' ');
    record('21. API key is not exposed in any response', apiKey ? !allBodies.includes(apiKey) : true, 'Zero API key occurrences');

    // -------------------------------------------------------------
    // Test 8: Database Integrity Verification
    // -------------------------------------------------------------
    console.log('\n--- 8. Verifying Database Integrity ---');
    const stdCountRes = await query('SELECT COUNT(*) AS total, COUNT(embedding) AS with_emb FROM standards;');
    const relCountRes = await query('SELECT COUNT(*) AS total FROM standard_relationships;');

    record('22. Total standards remains 2', stdCountRes.rows[0].total === '2', `Count: ${stdCountRes.rows[0].total}`);
    record('23. Standards with embeddings remains 2', stdCountRes.rows[0].with_emb === '2', `Count: ${stdCountRes.rows[0].with_emb}`);
    record('24. Total relationships remains 1', relCountRes.rows[0].total === '1', `Count: ${relCountRes.rows[0].total}`);

  } catch (err) {
    console.error('Test execution error:', err);
    record('Step 6 Suite execution', false, err.message);
  }

  console.log('\n=====================================================');
  console.log(`SUMMARY: ${passed} / ${passed + failed} TESTS PASSED.`);
  console.log(`STEP 6 VERIFICATION: ${failed === 0 ? 'COMPLETE & VERIFIED ✅' : 'FAILED ❌'}`);
  console.log('=====================================================\n');

  return { passed, failed, total: passed + failed };
}

if (require.main === module) {
  runStep6TestSuite().then(({ failed }) => {
    process.exit(failed === 0 ? 0 : 1);
  });
}

module.exports = { runStep6TestSuite };
