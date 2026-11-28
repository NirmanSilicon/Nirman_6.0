// =========================================================
// Nirdeshak - Step 10: Certification & Compliance Engine Test Suite
// Verifies:
// 1. Module loading & interface exports
// 2. parseCertification parser robustness (null, empty, objects, arrays, malformed JSON)
// 3. detectCertificationScheme deterministic scheme detection
// 4. detectExplicitRequirement distinguishing existence from mandatory requirement
// 5. evaluateCertification normalization & provenance
// 6. isSyntheticContext synthetic development/test data identification
// 7. Live API for Standard 1 (matches database record)
// 8. Live API for Standard 2 (matches database record)
// 9. Nonexistent standard (404 Not Found)
// 10. Invalid standard IDs (400 Bad Request)
// 11. Raw vector & API key protection (zero leakage)
// 12. Read-only database behavior & schema integrity
// =========================================================

const http = require('http');
const { query } = require('./database');
const {
  validateStandardId,
  parseCertification,
  detectCertificationScheme,
  detectExplicitRequirement,
  isSyntheticContext,
  evaluateCertification,
  getStandardCertification
} = require('./certification');

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

async function runStep10Tests() {
  console.log('====================================================');
  console.log('STARTING NIRDESHAK STEP 10: CERTIFICATION TESTS');
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
  assert(typeof validateStandardId === 'function', 'validateStandardId is exported');
  assert(typeof parseCertification === 'function', 'parseCertification is exported');
  assert(typeof detectCertificationScheme === 'function', 'detectCertificationScheme is exported');
  assert(typeof detectExplicitRequirement === 'function', 'detectExplicitRequirement is exported');
  assert(typeof isSyntheticContext === 'function', 'isSyntheticContext is exported');
  assert(typeof evaluateCertification === 'function', 'evaluateCertification is exported');
  assert(typeof getStandardCertification === 'function', 'getStandardCertification is exported');

  // -------------------------------------------------------------------------
  // Part 2: parseCertification Pure Function Unit Tests
  // -------------------------------------------------------------------------
  console.log('\n--- PART 2: CERTIFICATION PARSER ---');
  const pNull = parseCertification(null);
  assert(!pNull.hasCertificationInfo && pNull.data === null && pNull.rawType === 'null', 'Null certification returns hasCertificationInfo: false');

  const pUndef = parseCertification(undefined);
  assert(!pUndef.hasCertificationInfo && pUndef.data === null && pUndef.rawType === 'null', 'Undefined certification returns hasCertificationInfo: false');

  const pBool = parseCertification(true);
  assert(!pBool.hasCertificationInfo && pBool.data === null, 'Boolean certification returns hasCertificationInfo: false');

  const pEmptyStr = parseCertification('');
  assert(!pEmptyStr.hasCertificationInfo && pEmptyStr.data === null, 'Empty string returns hasCertificationInfo: false');

  const pWhitespace = parseCertification('   ');
  assert(!pWhitespace.hasCertificationInfo && pWhitespace.data === null, 'Whitespace string returns hasCertificationInfo: false');

  const pEmptyObj = parseCertification({});
  assert(!pEmptyObj.hasCertificationInfo && pEmptyObj.data === null, 'Empty object returns hasCertificationInfo: false');

  const pEmptyArr = parseCertification([]);
  assert(!pEmptyArr.hasCertificationInfo && pEmptyArr.data === null, 'Empty array returns hasCertificationInfo: false');

  const pValidObj = parseCertification({ scheme: 'BIS', mandatory: true });
  assert(pValidObj.hasCertificationInfo && pValidObj.data.scheme === 'BIS' && pValidObj.rawType === 'object', 'Valid object returns hasCertificationInfo: true');

  const pValidArr = parseCertification([{ scheme: 'ISI' }]);
  assert(pValidArr.hasCertificationInfo && pValidArr.data.length === 1 && pValidArr.rawType === 'array', 'Valid array returns hasCertificationInfo: true');

  const pJsonStr = parseCertification('{"scheme": "CRS", "mandatory": false}');
  assert(pJsonStr.hasCertificationInfo && pJsonStr.data.scheme === 'CRS', 'JSON string parsed safely');

  const pPlainText = parseCertification('Certification mark required as per Gazette notification.');
  assert(pPlainText.hasCertificationInfo && pPlainText.rawType === 'string', 'Plain text string parsed safely');

  const pMalformed = parseCertification('{"broken json string:');
  assert(pMalformed.hasCertificationInfo && pMalformed.rawType === 'string', 'Malformed JSON string parsed safely as text without throwing');

  // -------------------------------------------------------------------------
  // Part 3: detectCertificationScheme Pure Function Unit Tests
  // -------------------------------------------------------------------------
  console.log('\n--- PART 3: SCHEME DETECTION ---');
  assert(detectCertificationScheme({ scheme: 'BIS' }).scheme === 'BIS', 'Explicit scheme "BIS" detected');
  assert(detectCertificationScheme({ scheme_name: 'ISI' }).scheme === 'ISI', 'Explicit scheme_name "ISI" detected');
  assert(detectCertificationScheme({ type: 'CRS' }).scheme === 'CRS', 'Explicit type "CRS" detected');
  assert(detectCertificationScheme({ mark: 'Hallmarking' }).scheme === 'Hallmarking', 'Explicit mark "Hallmarking" detected');
  assert(detectCertificationScheme('Covered under BIS certification').scheme === 'BIS', 'Text keyword "BIS" detected');
  assert(detectCertificationScheme('Requires CRS registration').scheme === 'CRS', 'Text keyword "CRS" detected');
  assert(detectCertificationScheme('Conformity assessment required').scheme === 'Conformity', 'Text keyword "Conformity" detected');
  assert(detectCertificationScheme('Compliance with standard required').scheme === 'Compliance', 'Text keyword "Compliance" detected');
  assert(detectCertificationScheme('Requires valid licence').scheme === 'Licence', 'Text keyword "Licence" detected');
  assert(detectCertificationScheme('General specifications without mark').schemeDetected === false, 'Text with no scheme returns schemeDetected: false');
  assert(detectCertificationScheme(null).schemeDetected === false, 'Null data returns schemeDetected: false');

  // -------------------------------------------------------------------------
  // Part 4: detectExplicitRequirement Pure Function Unit Tests
  // -------------------------------------------------------------------------
  console.log('\n--- PART 4: EXPLICIT REQUIREMENT DETECTION ---');
  // Distinguish "certification exists" from "explicit requirement"
  const noReqObj = detectExplicitRequirement({ scheme: 'BIS', mark: 'ISI' });
  assert(noReqObj.requirementExplicit === false && noReqObj.requirementValue === null, 'Presence of scheme name does NOT infer mandatory requirement');

  const reqTrueBool = detectExplicitRequirement({ mandatory: true });
  assert(reqTrueBool.requirementExplicit === true && reqTrueBool.requirementValue === true, 'mandatory: true detected');

  const reqFalseBool = detectExplicitRequirement({ mandatory: false });
  assert(reqFalseBool.requirementExplicit === true && reqFalseBool.requirementValue === false, 'mandatory: false detected');

  const reqRequiredBool = detectExplicitRequirement({ required: true });
  assert(reqRequiredBool.requirementExplicit === true && reqRequiredBool.requirementValue === true, 'required: true detected');

  const reqRequiredStr = detectExplicitRequirement({ compulsory: 'yes' });
  assert(reqRequiredStr.requirementExplicit === true && reqRequiredStr.requirementValue === true, 'compulsory: "yes" detected');

  const reqVoluntaryStr = detectExplicitRequirement({ mandatory: 'voluntary' });
  assert(reqVoluntaryStr.requirementExplicit === true && reqVoluntaryStr.requirementValue === false, 'mandatory: "voluntary" detected as false');

  const reqArr = detectExplicitRequirement([{ scheme: 'BIS' }, { required: true }]);
  assert(reqArr.requirementExplicit === true && reqArr.requirementValue === true, 'Explicit requirement in array item detected');

  // -------------------------------------------------------------------------
  // Part 5: isSyntheticContext & Provenance
  // -------------------------------------------------------------------------
  console.log('\n--- PART 5: SYNTHETIC CONTEXT & PROVENANCE ---');
  assert(isSyntheticContext('DEVELOPMENT_TEST_DATA - Synthetic record') === true, 'Identifies DEVELOPMENT_TEST_DATA as synthetic');
  assert(isSyntheticContext('Mock Scheme test record') === true, 'Identifies mock record as synthetic');
  assert(isSyntheticContext('Gazette of India, Department of Consumer Affairs') === false, 'Identifies official record as non-synthetic');
  assert(isSyntheticContext(null) === false, 'Null source returns false');

  // -------------------------------------------------------------------------
  // Part 6: evaluateCertification Normalization
  // -------------------------------------------------------------------------
  console.log('\n--- PART 6: EVALUATE CERTIFICATION NORMALIZATION ---');
  const evalEmpty = evaluateCertification({}, 'DEVELOPMENT_TEST_DATA');
  assert(!evalEmpty.hasCertificationInfo && evalEmpty.dataContext === 'development_test', 'Empty cert preserves synthetic context');

  const evalSynthetic = evaluateCertification({
    scheme: 'Mock Scheme',
    mandatory: false
  }, 'DEVELOPMENT_TEST_DATA');
  assert(evalSynthetic.hasCertificationInfo === true, 'Populated cert hasCertificationInfo: true');
  assert(evalSynthetic.scheme === 'Mock Scheme', 'Scheme preserved');
  assert(evalSynthetic.requirementExplicit === true && evalSynthetic.requirementValue === false, 'Explicit non-mandatory requirement detected');
  assert(evalSynthetic.dataContext === 'development_test', 'dataContext flagged as development_test');

  const evalOfficial = evaluateCertification({
    scheme: 'BIS',
    mandatory: true
  }, 'Official BIS Gazette');
  assert(evalOfficial.hasCertificationInfo === true && evalOfficial.dataContext === 'official_record', 'Official cert flagged as official_record');

  // -------------------------------------------------------------------------
  // Part 7: Live API — Standard 1
  // -------------------------------------------------------------------------
  console.log('\n--- PART 7: LIVE API - STANDARD 1 ---');
  const apiStd1 = await httpGet('/api/standards/1/certification');
  assert(apiStd1.status === 200, 'GET /api/standards/1/certification returns HTTP 200');
  assert(apiStd1.body.success === true, 'Response body has success: true');
  assert(apiStd1.body.standardId === 1, 'Standard ID is 1');
  assert(apiStd1.body.is_number === 'TEST-IS-2925-MOCK', 'is_number is TEST-IS-2925-MOCK');

  const cert1 = apiStd1.body.certification;
  assert(cert1.hasCertificationInfo === true, 'Standard 1 hasCertificationInfo is true');
  assert(cert1.scheme === 'Mock Scheme', 'Standard 1 scheme is "Mock Scheme" (matches stored record)');
  assert(cert1.schemeDetected === true, 'Standard 1 schemeDetected is true');
  assert(cert1.requirementExplicit === true, 'Standard 1 requirementExplicit is true (mandatory: false is explicit)');
  assert(cert1.requirementValue === false, 'Standard 1 requirementValue is false (not mandatory)');
  assert(typeof cert1.details === 'object' && cert1.details.scheme === 'Mock Scheme', 'Standard 1 details matches stored JSON');
  assert(cert1.dataContext === 'development_test', 'Standard 1 dataContext is "development_test"');
  assert(typeof cert1.source === 'string' && cert1.source.includes('DEVELOPMENT_TEST_DATA'), 'Standard 1 source preserves DEVELOPMENT_TEST_DATA');

  // -------------------------------------------------------------------------
  // Part 8: Live API — Standard 2
  // -------------------------------------------------------------------------
  console.log('\n--- PART 8: LIVE API - STANDARD 2 ---');
  const apiStd2 = await httpGet('/api/standards/2/certification');
  assert(apiStd2.status === 200, 'GET /api/standards/2/certification returns HTTP 200');
  assert(apiStd2.body.success === true, 'Response body has success: true');
  assert(apiStd2.body.standardId === 2, 'Standard ID is 2');
  assert(apiStd2.body.is_number === 'TEST-IS-4151-MOCK', 'is_number is TEST-IS-4151-MOCK');

  const cert2 = apiStd2.body.certification;
  assert(cert2.hasCertificationInfo === false, 'Standard 2 hasCertificationInfo is false (stored as empty object {})');
  assert(cert2.scheme === null, 'Standard 2 scheme is null');
  assert(cert2.schemeDetected === false, 'Standard 2 schemeDetected is false');
  assert(cert2.requirementExplicit === false, 'Standard 2 requirementExplicit is false');
  assert(cert2.requirementValue === null, 'Standard 2 requirementValue is null');
  assert(cert2.details === null, 'Standard 2 details is null');
  assert(cert2.dataContext === 'development_test', 'Standard 2 dataContext is "development_test"');

  // -------------------------------------------------------------------------
  // Part 9: Error Handling — Nonexistent & Invalid Standard IDs
  // -------------------------------------------------------------------------
  console.log('\n--- PART 9: ERROR HANDLING ---');
  const api404 = await httpGet('/api/standards/999999/certification');
  assert(api404.status === 404, 'GET /api/standards/999999/certification returns HTTP 404');
  assert(api404.body.success === false, '404 response has success: false');
  assert(api404.body.error && api404.body.error.includes('999999'), '404 response mentions nonexistent ID');

  const api400Str = await httpGet('/api/standards/abc/certification');
  assert(api400Str.status === 400, 'GET /api/standards/abc/certification returns HTTP 400');
  assert(api400Str.body.success === false, '400 response has success: false');

  const api400Neg = await httpGet('/api/standards/-5/certification');
  assert(api400Neg.status === 400, 'GET /api/standards/-5/certification returns HTTP 400');

  // -------------------------------------------------------------------------
  // Part 10: Raw Vector & Secrets Protection
  // -------------------------------------------------------------------------
  console.log('\n--- PART 10: RAW VECTOR & SECRETS PROTECTION ---');
  assert(!apiStd1.raw.includes('"embedding"'), 'Raw JSON for Standard 1 does NOT contain "embedding"');
  assert(!apiStd2.raw.includes('"embedding"'), 'Raw JSON for Standard 2 does NOT contain "embedding"');
  assert(!apiStd1.raw.includes('AIzaSy'), 'No Gemini API key exposed in Standard 1 response');
  assert(!apiStd1.raw.includes('postgres://'), 'No database URL exposed in Standard 1 response');

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
  console.log(`STEP 10 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runStep10Tests().catch(err => {
  console.error('Fatal error in Step 10 tests:', err);
  process.exit(1);
});
