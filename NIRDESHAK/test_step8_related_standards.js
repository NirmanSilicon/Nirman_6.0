// =========================================================
// Nirdeshak - Step 8: Related / Normative Standards Engine Test Suite
// Verifies:
// 1. Module loading & interface exports
// 2. Input validation & normalization (400 on invalid IDs)
// 3. Bidirectional discovery (outgoing from ID 1, incoming to ID 2)
// 4. Direction filtering ('all', 'outgoing', 'incoming')
// 5. Relationship-type filtering (exact & case-insensitive)
// 6. Unsupported / non-matching relationship types (clean empty results)
// 7. Nonexistent standard (clean 404 response)
// 8. Deduplication by relationshipId
// 9. Batch multi-standard related lookup
// 10. HTTP API endpoint GET /api/standards/:id/related
// 11. Response schema & metadata completeness
// 12. Zero raw vector or API key leakage
// 13. Read-only database preservation & integrity
// =========================================================

const http = require('http');
const { query } = require('./database');
const {
  SUPPORTED_RELATIONSHIP_TYPES,
  validateStandardId,
  normalizeRelationshipType,
  getRelatedStandardsForId,
  getRelatedStandardsForMultipleIds
} = require('./relatedStandards');

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

function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`${SERVER_URL}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const body = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: null, raw: data });
        }
      });
    }).on('error', reject);
  });
}

async function runStep8Tests() {
  console.log('====================================================');
  console.log('STARTING NIRDESHAK STEP 8: RELATED STANDARDS TESTS');
  console.log('====================================================\n');

  // Snapshot initial database state for read-only verification
  const initialStdRes = await query('SELECT count(*)::int AS count FROM standards;');
  const initialRelRes = await query('SELECT count(*)::int AS count FROM standard_relationships;');
  const initialStdCount = initialStdRes.rows[0].count;
  const initialRelCount = initialRelRes.rows[0].count;

  // -------------------------------------------------------------------------
  // Part 1: Module Loading & Interface Verification
  // -------------------------------------------------------------------------
  console.log('--- PART 1: MODULE LOADING & INTERFACES ---');
  assert(typeof validateStandardId === 'function', 'validateStandardId is exported as a function');
  assert(typeof normalizeRelationshipType === 'function', 'normalizeRelationshipType is exported as a function');
  assert(typeof getRelatedStandardsForId === 'function', 'getRelatedStandardsForId is exported as a function');
  assert(typeof getRelatedStandardsForMultipleIds === 'function', 'getRelatedStandardsForMultipleIds is exported as a function');
  assert(Array.isArray(SUPPORTED_RELATIONSHIP_TYPES) && SUPPORTED_RELATIONSHIP_TYPES.includes('testing') && SUPPORTED_RELATIONSHIP_TYPES.includes('normative'), 'SUPPORTED_RELATIONSHIP_TYPES includes standard types');

  // -------------------------------------------------------------------------
  // Part 2: Input Validation Unit Tests
  // -------------------------------------------------------------------------
  console.log('\n--- PART 2: INPUT VALIDATION & NORMALIZATION ---');
  assert(validateStandardId(1) === 1, 'validateStandardId accepts numeric 1');
  assert(validateStandardId('2') === 2, 'validateStandardId parses string "2" to integer 2');

  let invalidIdCaught = false;
  try {
    validateStandardId('invalid');
  } catch (err) {
    invalidIdCaught = (err.statusCode === 400);
  }
  assert(invalidIdCaught, 'validateStandardId throws 400 on non-numeric string');

  let negativeIdCaught = false;
  try {
    validateStandardId(-5);
  } catch (err) {
    negativeIdCaught = (err.statusCode === 400);
  }
  assert(negativeIdCaught, 'validateStandardId throws 400 on negative integer');

  let emptyIdCaught = false;
  try {
    validateStandardId('');
  } catch (err) {
    emptyIdCaught = (err.statusCode === 400);
  }
  assert(emptyIdCaught, 'validateStandardId throws 400 on empty string');

  assert(normalizeRelationshipType(' TESTING ') === 'testing', 'normalizeRelationshipType trims and lowercases');
  assert(normalizeRelationshipType(null) === null, 'normalizeRelationshipType returns null for null input');
  assert(normalizeRelationshipType('') === null, 'normalizeRelationshipType returns null for empty string');

  // -------------------------------------------------------------------------
  // Part 3: Direct Module Discovery (Outgoing from ID 1)
  // -------------------------------------------------------------------------
  console.log('\n--- PART 3: MODULE DIRECT QUERY - STANDARD 1 OUTGOING ---');
  const modRes1 = await getRelatedStandardsForId(1);
  assert(modRes1.success === true, 'getRelatedStandardsForId(1) returns success: true');
  assert(modRes1.standardId === 1, 'getRelatedStandardsForId(1) returns standardId: 1');
  assert(modRes1.count === 1, 'getRelatedStandardsForId(1) returns count: 1');
  assert(modRes1.results && modRes1.results.length === 1, 'getRelatedStandardsForId(1) results array has length 1');
  
  const rel1 = modRes1.results[0];
  assert(rel1.relationshipId === 1, 'Relationship ID is 1');
  assert(rel1.direction === 'outgoing', 'Direction is "outgoing" for Standard 1');
  assert(rel1.relationshipType === 'testing', 'Relationship type is "testing"');
  assert(rel1.standard && rel1.standard.id === 2, 'Related standard is ID 2');
  assert(rel1.standard.is_number === 'TEST-IS-4151-MOCK', 'Related standard is_number is TEST-IS-4151-MOCK');

  // -------------------------------------------------------------------------
  // Part 4: Direct Module Discovery (Incoming to ID 2)
  // -------------------------------------------------------------------------
  console.log('\n--- PART 4: MODULE DIRECT QUERY - STANDARD 2 INCOMING ---');
  const modRes2 = await getRelatedStandardsForId(2);
  assert(modRes2.success === true, 'getRelatedStandardsForId(2) returns success: true');
  assert(modRes2.standardId === 2, 'getRelatedStandardsForId(2) returns standardId: 2');
  assert(modRes2.count === 1, 'getRelatedStandardsForId(2) returns count: 1');
  
  const rel2 = modRes2.results[0];
  assert(rel2.relationshipId === 1, 'Incoming relationship ID is 1');
  assert(rel2.direction === 'incoming', 'Direction is "incoming" for Standard 2');
  assert(rel2.relationshipType === 'testing', 'Relationship type is "testing"');
  assert(rel2.standard && rel2.standard.id === 1, 'Related standard is ID 1');
  assert(rel2.standard.is_number === 'TEST-IS-2925-MOCK', 'Related standard is_number is TEST-IS-2925-MOCK');

  // -------------------------------------------------------------------------
  // Part 5: Direction Filtering
  // -------------------------------------------------------------------------
  console.log('\n--- PART 5: DIRECTION FILTERING ---');
  const modDirOut1 = await getRelatedStandardsForId(1, { direction: 'outgoing' });
  assert(modDirOut1.count === 1 && modDirOut1.results[0].direction === 'outgoing', 'Standard 1 with direction="outgoing" returns 1 result');

  const modDirIn1 = await getRelatedStandardsForId(1, { direction: 'incoming' });
  assert(modDirIn1.count === 0 && modDirIn1.results.length === 0, 'Standard 1 with direction="incoming" returns 0 results');

  const modDirOut2 = await getRelatedStandardsForId(2, { direction: 'outgoing' });
  assert(modDirOut2.count === 0 && modDirOut2.results.length === 0, 'Standard 2 with direction="outgoing" returns 0 results');

  const modDirIn2 = await getRelatedStandardsForId(2, { direction: 'incoming' });
  assert(modDirIn2.count === 1 && modDirIn2.results[0].direction === 'incoming', 'Standard 2 with direction="incoming" returns 1 result');

  // -------------------------------------------------------------------------
  // Part 6: Relationship Type Filtering
  // -------------------------------------------------------------------------
  console.log('\n--- PART 6: RELATIONSHIP TYPE FILTERING ---');
  const modFilteredMatch = await getRelatedStandardsForId(1, { relationshipType: 'testing' });
  assert(modFilteredMatch.count === 1, 'Filter ?relationshipType=testing matches 1 record');

  const modFilteredCase = await getRelatedStandardsForId(1, { relationshipType: 'TESTING' });
  assert(modFilteredCase.count === 1, 'Filter ?relationshipType=TESTING matches 1 record (case-insensitive)');

  const modFilteredNone = await getRelatedStandardsForId(1, { relationshipType: 'installation' });
  assert(modFilteredNone.count === 0 && Array.isArray(modFilteredNone.results), 'Filter ?relationshipType=installation returns 0 records cleanly');

  // -------------------------------------------------------------------------
  // Part 7: Nonexistent Standard Error Handling
  // -------------------------------------------------------------------------
  console.log('\n--- PART 7: NONEXISTENT STANDARD HANDLING ---');
  let notFoundCaught = false;
  try {
    await getRelatedStandardsForId(999999);
  } catch (err) {
    notFoundCaught = (err.statusCode === 404);
  }
  assert(notFoundCaught, 'Querying nonexistent standard ID 999999 throws error with statusCode 404');

  // -------------------------------------------------------------------------
  // Part 8: Batch Multi-ID Lookup
  // -------------------------------------------------------------------------
  console.log('\n--- PART 8: BATCH MULTI-ID LOOKUP ---');
  const batchMap = await getRelatedStandardsForMultipleIds([1, 2, 999999]);
  assert(batchMap instanceof Map, 'getRelatedStandardsForMultipleIds returns a Map');
  assert(batchMap.has(1) && batchMap.get(1).length === 1, 'Batch map contains 1 relation for standard 1');
  assert(batchMap.has(2) && batchMap.get(2).length === 1, 'Batch map contains 1 relation for standard 2');
  assert(batchMap.has(999999) && batchMap.get(999999).length === 0, 'Batch map returns empty array for nonexistent standard');

  // -------------------------------------------------------------------------
  // Part 9: HTTP API Endpoint Tests
  // -------------------------------------------------------------------------
  console.log('\n--- PART 9: HTTP API ENDPOINT TESTS ---');
  
  // Test 9.1: GET /api/standards/1/related
  const apiRes1 = await httpGet('/api/standards/1/related');
  assert(apiRes1.status === 200, 'GET /api/standards/1/related returns HTTP 200');
  assert(apiRes1.body.success === true, 'Response body has success: true');
  assert(apiRes1.body.standardId === 1, 'Response standardId is 1');
  assert(apiRes1.body.count === 1, 'Response count is 1');
  assert(Array.isArray(apiRes1.body.results), 'Response results is an array');
  assert(apiRes1.body.results[0].direction === 'outgoing', 'API result has direction: "outgoing"');
  assert(apiRes1.body.results[0].standard.id === 2, 'API result points to standard ID 2');

  // Test 9.2: GET /api/standards/2/related
  const apiRes2 = await httpGet('/api/standards/2/related');
  assert(apiRes2.status === 200, 'GET /api/standards/2/related returns HTTP 200');
  assert(apiRes2.body.standardId === 2, 'Response standardId is 2');
  assert(apiRes2.body.count === 1, 'Response count is 1');
  assert(apiRes2.body.results[0].direction === 'incoming', 'API result has direction: "incoming"');
  assert(apiRes2.body.results[0].standard.id === 1, 'API result points to source standard ID 1');

  // Test 9.3: GET /api/standards/1/related?relationshipType=testing
  const apiFilterMatch = await httpGet('/api/standards/1/related?relationshipType=testing');
  assert(apiFilterMatch.status === 200 && apiFilterMatch.body.count === 1, 'HTTP filter ?relationshipType=testing returns 1');

  // Test 9.4: GET /api/standards/1/related?relationshipType=installation
  const apiFilterNoMatch = await httpGet('/api/standards/1/related?relationshipType=installation');
  assert(apiFilterNoMatch.status === 200 && apiFilterNoMatch.body.count === 0 && apiFilterNoMatch.body.results.length === 0, 'HTTP filter ?relationshipType=installation returns count 0 and empty array');

  // Test 9.5: Case-insensitive query param ?relationshipType=TESTING
  const apiFilterCase = await httpGet('/api/standards/1/related?relationshipType=TESTING');
  assert(apiFilterCase.status === 200 && apiFilterCase.body.count === 1, 'HTTP filter ?relationshipType=TESTING is case-insensitive');

  // Test 9.6: GET /api/standards/999999/related (404 expected)
  const api404 = await httpGet('/api/standards/999999/related');
  assert(api404.status === 404, 'GET /api/standards/999999/related returns HTTP 404');
  assert(api404.body.success === false, '404 response body has success: false');
  assert(typeof api404.body.error === 'string' && api404.body.error.includes('999999'), '404 response provides clear descriptive error');

  // Test 9.7: GET /api/standards/abc/related (400 expected)
  const api400 = await httpGet('/api/standards/abc/related');
  assert(api400.status === 400, 'GET /api/standards/abc/related returns HTTP 400 for non-numeric ID');
  assert(api400.body.success === false, '400 response body has success: false');

  // -------------------------------------------------------------------------
  // Part 10: Metadata Completeness & Raw Vector Protection
  // -------------------------------------------------------------------------
  console.log('\n--- PART 10: METADATA COMPLETENESS & VECTOR PROTECTION ---');
  const targetStd = apiRes1.body.results[0].standard;
  assert(typeof targetStd.id === 'number', 'Standard has numeric ID');
  assert(typeof targetStd.is_number === 'string' && targetStd.is_number.length > 0, 'Standard has valid is_number');
  assert(typeof targetStd.title === 'string' && targetStd.title.length > 0, 'Standard has valid title');
  assert(typeof targetStd.scope === 'string', 'Standard has scope');
  assert(typeof targetStd.category === 'string', 'Standard has category');
  assert(typeof targetStd.description === 'string', 'Standard has description');
  assert(typeof targetStd.application === 'string', 'Standard has application');
  assert(typeof targetStd.version === 'string', 'Standard has version');
  assert(typeof targetStd.publication_year === 'number', 'Standard has publication_year');
  assert(typeof targetStd.status === 'string', 'Standard has status');
  assert(typeof targetStd.certification === 'object', 'Standard has certification object');

  // Check that raw vector embedding is NOT returned
  assert(targetStd.embedding === undefined, 'Raw embedding vector is NOT present in standard object');
  assert(!apiRes1.raw.includes('"embedding"'), 'Raw JSON response does NOT contain any "embedding" key');

  // Check no sensitive env vars leaked
  assert(!apiRes1.raw.includes('AIzaSy'), 'No Gemini API keys leaked in HTTP response');
  assert(!apiRes1.raw.includes('postgres://'), 'No database connection strings leaked in HTTP response');

  // -------------------------------------------------------------------------
  // Part 11: Deduplication Verification
  // -------------------------------------------------------------------------
  console.log('\n--- PART 11: DEDUPLICATION LOGIC VERIFICATION ---');
  // Both directions queried for ID 1
  const modAllDir = await getRelatedStandardsForId(1, { direction: 'all' });
  const relIds = modAllDir.results.map(r => r.relationshipId);
  const uniqueRelIds = new Set(relIds);
  assert(relIds.length === uniqueRelIds.size, 'No duplicate relationshipId in results array');

  // -------------------------------------------------------------------------
  // Part 12: Read-Only Database Behavior & Integrity Verification
  // -------------------------------------------------------------------------
  console.log('\n--- PART 12: DATABASE READ-ONLY & INTEGRITY VERIFICATION ---');
  const postStdRes = await query('SELECT count(*)::int AS count FROM standards;');
  const postRelRes = await query('SELECT count(*)::int AS count FROM standard_relationships;');
  const postStdCount = postStdRes.rows[0].count;
  const postRelCount = postRelRes.rows[0].count;

  assert(postStdCount === initialStdCount, `Standards table row count unchanged: ${postStdCount} === ${initialStdCount}`);
  assert(postRelCount === initialRelCount, `Relationships table row count unchanged: ${postRelCount} === ${initialRelCount}`);

  // Verify embedding integrity
  const embCheckRes = await query(`
    SELECT id, is_number, 
           (embedding IS NOT NULL) AS has_embedding,
           vector_dims(embedding) AS dims
    FROM standards 
    ORDER BY id ASC;
  `);

  assert(embCheckRes.rows.length === 2, 'Exactly 2 standards in database');
  assert(embCheckRes.rows.every(r => r.has_embedding && r.dims === 3072), 'Both standards maintain 3072-dimensional embeddings');

  // Verify relationship data unchanged
  const relCheckRes = await query('SELECT * FROM standard_relationships WHERE id = 1;');
  assert(relCheckRes.rows.length === 1, 'Relationship ID 1 exists');
  assert(relCheckRes.rows[0].source_standard_id === 1, 'Relationship source_standard_id is 1');
  assert(relCheckRes.rows[0].target_standard_id === 2, 'Relationship target_standard_id is 2');
  assert(relCheckRes.rows[0].relationship_type === 'testing', 'Relationship relationship_type is "testing"');

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n====================================================');
  console.log(`STEP 8 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runStep8Tests().catch(err => {
  console.error('Fatal error in Step 8 tests:', err);
  process.exit(1);
});
