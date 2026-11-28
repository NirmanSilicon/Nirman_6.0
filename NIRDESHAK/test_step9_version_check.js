// =========================================================
// Nirdeshak - Step 9: Version & Amendment Check Engine Test Suite
// Verifies:
// 1. Module loading & interface exports
// 2. Status normalization pure functions
// 3. Amendment parsing pure functions
// 4. Supersession parsing pure functions
// 5. Version status classification & precedence rules
// 6. Human-readable factual summary generation
// 7. Standard 1 Live API response
// 8. Standard 2 Live API response
// 9. Nonexistent standard (404 Not Found)
// 10. Invalid standard ID (400 Bad Request)
// 11. Unknown metadata handling
// 12. Raw-vector protection (zero leakage)
// 13. API key and secret protection
// 14. Database read-only behavior & schema integrity
// =========================================================

const http = require('http');
const { query } = require('./database');
const {
  validateStandardId,
  normalizeStatus,
  parseAmendments,
  normalizeSupersessionReference,
  evaluateVersionStatus,
  generateVersionSummary,
  getStandardVersionStatus
} = require('./versionCheck');

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

async function runStep9Tests() {
  console.log('====================================================');
  console.log('STARTING NIRDESHAK STEP 9: VERSION & AMENDMENT TESTS');
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
  assert(typeof normalizeStatus === 'function', 'normalizeStatus is exported');
  assert(typeof parseAmendments === 'function', 'parseAmendments is exported');
  assert(typeof normalizeSupersessionReference === 'function', 'normalizeSupersessionReference is exported');
  assert(typeof evaluateVersionStatus === 'function', 'evaluateVersionStatus is exported');
  assert(typeof generateVersionSummary === 'function', 'generateVersionSummary is exported');
  assert(typeof getStandardVersionStatus === 'function', 'getStandardVersionStatus is exported');

  // -------------------------------------------------------------------------
  // Part 2: Status Normalization Unit Tests
  // -------------------------------------------------------------------------
  console.log('\n--- PART 2: STATUS NORMALIZATION ---');
  assert(normalizeStatus('active').category === 'current', 'Status "active" -> category "current"');
  assert(normalizeStatus('current').category === 'current', 'Status "current" -> category "current"');
  assert(normalizeStatus('valid').category === 'current', 'Status "valid" -> category "current"');
  assert(normalizeStatus('  ACTIVE  ').category === 'current', 'Status "  ACTIVE  " normalized to "current"');
  assert(normalizeStatus('superseded').category === 'superseded', 'Status "superseded" -> category "superseded"');
  assert(normalizeStatus('withdrawn').category === 'withdrawn', 'Status "withdrawn" -> category "withdrawn"');
  assert(normalizeStatus('obsolete').category === 'obsolete', 'Status "obsolete" -> category "obsolete"');
  assert(normalizeStatus('inactive').category === 'inactive', 'Status "inactive" -> category "inactive"');
  assert(normalizeStatus('amended').category === 'amended', 'Status "amended" -> category "amended"');
  assert(normalizeStatus('some_unknown_value').category === 'unknown', 'Unknown status -> category "unknown"');
  assert(normalizeStatus('draft').category === 'unknown', 'Status "draft" -> category "unknown"');
  assert(normalizeStatus(null).category === 'unknown', 'Null status -> category "unknown"');
  assert(normalizeStatus(undefined).category === 'unknown', 'Undefined status -> category "unknown"');
  assert(normalizeStatus('').category === 'unknown', 'Empty string status -> category "unknown"');
  assert(normalizeStatus('   ').category === 'unknown', 'Whitespace status -> category "unknown"');

  // -------------------------------------------------------------------------
  // Part 3: Amendment Parsing Unit Tests
  // -------------------------------------------------------------------------
  console.log('\n--- PART 3: AMENDMENT PARSING ---');
  const emptyNullAmd = parseAmendments(null);
  assert(!emptyNullAmd.hasAmendments && emptyNullAmd.amendmentInfo.length === 0, 'Null amendments -> hasAmendments: false, []');

  const emptyArrAmd = parseAmendments([]);
  assert(!emptyArrAmd.hasAmendments && emptyArrAmd.amendmentInfo.length === 0, 'Empty array amendments -> hasAmendments: false, []');

  const emptyStrAmd = parseAmendments('');
  assert(!emptyStrAmd.hasAmendments && emptyStrAmd.amendmentInfo.length === 0, 'Empty string amendments -> hasAmendments: false, []');

  const arrAmd = parseAmendments(['Amendment 1 (2024)', 'Amendment 2 (2025)']);
  assert(arrAmd.hasAmendments && arrAmd.amendmentInfo.length === 2, 'Array amendments parsed correctly');

  const jsonArrAmd = parseAmendments('["Amendment 1 (2024)", "Amendment 2 (2025)"]');
  assert(jsonArrAmd.hasAmendments && jsonArrAmd.amendmentInfo.length === 2, 'JSON array string amendments parsed correctly');

  const jsonObjAmd = parseAmendments({ amendmentNumber: 1, year: 2025 });
  assert(jsonObjAmd.hasAmendments && jsonObjAmd.amendmentInfo.length === 1, 'Object amendments parsed correctly');

  const emptyObjAmd = parseAmendments({});
  assert(!emptyObjAmd.hasAmendments && emptyObjAmd.amendmentInfo.length === 0, 'Empty object amendments -> hasAmendments: false, []');

  const plainStrAmd = parseAmendments('Amendment No. 1 published in BIS Gazette');
  assert(plainStrAmd.hasAmendments && plainStrAmd.amendmentInfo[0] === 'Amendment No. 1 published in BIS Gazette', 'Plain text string amendment parsed safely');

  const malformedJsonAmd = parseAmendments('[{"broken: true');
  assert(malformedJsonAmd.hasAmendments && malformedJsonAmd.amendmentInfo[0] === '[{"broken: true', 'Malformed JSON string parsed safely as text without throwing');

  // -------------------------------------------------------------------------
  // Part 4: Supersession Parsing Unit Tests
  // -------------------------------------------------------------------------
  console.log('\n--- PART 4: SUPERSESSION PARSING ---');
  assert(normalizeSupersessionReference(null) === null, 'Null supersession ref -> null');
  assert(normalizeSupersessionReference([]) === null, 'Empty array supersession ref -> null');
  assert(normalizeSupersessionReference('') === null, 'Empty string supersession ref -> null');
  assert(normalizeSupersessionReference('   ') === null, 'Whitespace supersession ref -> null');
  assert(normalizeSupersessionReference('IS 1234:2020') === 'IS 1234:2020', 'Plain string reference returned trimmed');
  assert(normalizeSupersessionReference('  IS 1234:2020  ') === 'IS 1234:2020', 'Trimmed whitespace reference returned');
  assert(normalizeSupersessionReference(['IS 1234:2020']) === 'IS 1234:2020', 'Single item array unwrapped to string');
  assert(Array.isArray(normalizeSupersessionReference(['IS 1234:2020', 'IS 5678:2022'])), 'Multi item array returned as array');
  assert(normalizeSupersessionReference('["IS 1234:2020"]') === 'IS 1234:2020', 'JSON array string unwrapped to reference');
  assert(normalizeSupersessionReference({ is_number: 'IS 1234:2020' }) === 'IS 1234:2020', 'Object with is_number extracted to string');

  // -------------------------------------------------------------------------
  // Part 5: Precedence & Overall Version Status Classification Unit Tests
  // -------------------------------------------------------------------------
  console.log('\n--- PART 5: PRECEDENCE & VERSION CLASSIFICATION ---');
  // Precedence 1: Explicit superseded_by takes highest precedence
  const caseSupersededBy = evaluateVersionStatus({
    status: 'active', // even if status claims active
    superseded_by: 'IS 9999:2026',
    amendments: ['Amd 1'],
    version: 'REV-1',
    publication_year: 2020
  });
  assert(caseSupersededBy.statusCategory === 'superseded', 'Precedence 1: superseded_by overrides active status');
  assert(caseSupersededBy.isSuperseded === true, 'isSuperseded is true');
  assert(caseSupersededBy.supersededBy === 'IS 9999:2026', 'supersededBy reference preserved');

  // Precedence 1: Status explicitly "superseded"
  const caseStatusSuperseded = evaluateVersionStatus({
    status: 'superseded',
    superseded_by: null,
    amendments: []
  });
  assert(caseStatusSuperseded.statusCategory === 'superseded' && caseStatusSuperseded.isSuperseded === true, 'Explicit status "superseded" classifies as superseded');

  // Precedence 2: Withdrawn
  const caseWithdrawn = evaluateVersionStatus({
    status: 'withdrawn',
    amendments: []
  });
  assert(caseWithdrawn.statusCategory === 'withdrawn', 'Precedence 2: status "withdrawn"');

  // Precedence 2: Obsolete
  const caseObsolete = evaluateVersionStatus({
    status: 'obsolete',
    amendments: []
  });
  assert(caseObsolete.statusCategory === 'obsolete', 'Precedence 2: status "obsolete"');

  // Precedence 2: Inactive
  const caseInactive = evaluateVersionStatus({
    status: 'inactive',
    amendments: []
  });
  assert(caseInactive.statusCategory === 'inactive', 'Precedence 2: status "inactive"');

  // Precedence 3: Explicit status amended
  const caseAmendedStatus = evaluateVersionStatus({
    status: 'amended',
    amendments: []
  });
  assert(caseAmendedStatus.statusCategory === 'amended', 'Precedence 3: explicit status "amended"');

  // Precedence 4: Active without amendments
  const caseActiveClean = evaluateVersionStatus({
    status: 'active',
    amendments: [],
    version: 'REV-2026',
    publication_year: 2026
  });
  assert(caseActiveClean.statusCategory === 'current', 'Precedence 4: active standard -> category "current"');
  assert(caseActiveClean.hasAmendments === false, 'hasAmendments is false');

  // Precedence 4: Active with amendments
  const caseActiveAmended = evaluateVersionStatus({
    status: 'active',
    amendments: ['Amd 1 (2025)'],
    version: 'REV-2026',
    publication_year: 2026
  });
  assert(caseActiveAmended.statusCategory === 'current', 'Active with amendments preserves category "current"');
  assert(caseActiveAmended.hasAmendments === true, 'hasAmendments is true');

  // Precedence 5: Unknown status with amendments -> category "amended"
  const caseUnknownAmended = evaluateVersionStatus({
    status: 'some_unknown_value',
    amendments: ['Amd 1 (2025)']
  });
  assert(caseUnknownAmended.statusCategory === 'amended', 'Unknown status with amendments classifies as "amended"');

  // Precedence 5: Unknown status with no amendments -> category "unknown"
  const caseUnknownClean = evaluateVersionStatus({
    status: 'some_unknown_value',
    amendments: []
  });
  assert(caseUnknownClean.statusCategory === 'unknown', 'Unknown status with no amendments classifies as "unknown"');

  // Missing version and publication year handling
  const caseMissingMeta = evaluateVersionStatus({
    status: 'active',
    version: null,
    publication_year: null
  });
  assert(caseMissingMeta.version === null, 'Missing version defaults to null');
  assert(caseMissingMeta.publicationYear === null, 'Missing publicationYear defaults to null');

  // Supersedes another standard
  const caseSupersedes = evaluateVersionStatus({
    status: 'active',
    supersedes: 'IS 1000:2010'
  });
  assert(caseSupersedes.supersedes === 'IS 1000:2010', 'supersedes field correctly populated');

  // -------------------------------------------------------------------------
  // Part 6: Human-Readable Summary Unit Tests
  // -------------------------------------------------------------------------
  console.log('\n--- PART 6: SUMMARY GENERATION ---');
  const sumActive = generateVersionSummary({
    statusCategory: 'current',
    statusValue: 'active',
    hasAmendments: false
  });
  assert(sumActive === 'Database status indicates this standard is active.', 'Summary for active standard');

  const sumActiveAmd = generateVersionSummary({
    statusCategory: 'current',
    statusValue: 'active',
    hasAmendments: true
  });
  assert(sumActiveAmd === 'Database status indicates this standard is active, with amendment information available.', 'Summary for active standard with amendments');

  const sumSupersededBy = generateVersionSummary({
    statusCategory: 'superseded',
    isSuperseded: true,
    supersededBy: 'IS 9999:2026'
  });
  assert(sumSupersededBy === 'Database metadata indicates that this standard has been superseded by IS 9999:2026.', 'Summary for superseded standard with reference');

  const sumSupersededNoRef = generateVersionSummary({
    statusCategory: 'superseded',
    isSuperseded: true,
    supersededBy: null
  });
  assert(sumSupersededNoRef === 'Database metadata indicates that this standard has been superseded.', 'Summary for superseded standard without reference');

  const sumWithdrawn = generateVersionSummary({ statusCategory: 'withdrawn' });
  assert(sumWithdrawn === 'Database status indicates this standard has been withdrawn.', 'Summary for withdrawn standard');

  const sumObsolete = generateVersionSummary({ statusCategory: 'obsolete' });
  assert(sumObsolete === 'Database status indicates this standard is obsolete.', 'Summary for obsolete standard');

  const sumInactive = generateVersionSummary({ statusCategory: 'inactive' });
  assert(sumInactive === 'Database status indicates this standard is inactive.', 'Summary for inactive standard');

  const sumAmended = generateVersionSummary({ statusCategory: 'amended' });
  assert(sumAmended === 'Database metadata indicates that amendment information is available for this standard.', 'Summary for amended standard');

  const sumUnknown = generateVersionSummary({ statusCategory: 'unknown' });
  assert(sumUnknown === 'Current version status cannot be determined from the available database metadata.', 'Summary for unknown status standard');

  // Check no unsupported legal terminology
  const allSummaries = [sumActive, sumActiveAmd, sumSupersededBy, sumWithdrawn, sumObsolete, sumInactive, sumAmended, sumUnknown].join(' ').toLowerCase();
  assert(!allSummaries.includes('legally valid'), 'No "legally valid" claim in summaries');
  assert(!allSummaries.includes('legally mandatory'), 'No "legally mandatory" claim in summaries');
  assert(!allSummaries.includes('officially approved'), 'No "officially approved" claim in summaries');

  // -------------------------------------------------------------------------
  // Part 7: Live API — Standard 1
  // -------------------------------------------------------------------------
  console.log('\n--- PART 7: LIVE API - STANDARD 1 ---');
  const apiStd1 = await httpGet('/api/standards/1/version');
  assert(apiStd1.status === 200, 'GET /api/standards/1/version returns HTTP 200');
  assert(apiStd1.body.success === true, 'Response body has success: true');
  assert(apiStd1.body.standardId === 1, 'Standard ID is 1');
  assert(apiStd1.body.is_number === 'TEST-IS-2925-MOCK', 'is_number is TEST-IS-2925-MOCK');
  assert(typeof apiStd1.body.title === 'string' && apiStd1.body.title.length > 0, 'title is present and non-empty');

  const vs1 = apiStd1.body.versionStatus;
  assert(vs1.statusCategory === 'current', 'Standard 1 statusCategory is "current"');
  assert(vs1.statusValue === 'active', 'Standard 1 statusValue is "active"');
  assert(vs1.hasAmendments === true, 'Standard 1 hasAmendments is true (matches synthetic seed data)');
  assert(Array.isArray(vs1.amendmentInfo) && vs1.amendmentInfo.length > 0, 'Standard 1 amendmentInfo is non-empty array');
  assert(vs1.isSuperseded === false, 'Standard 1 isSuperseded is false');
  assert(vs1.supersededBy === null, 'Standard 1 supersededBy is null');
  assert(vs1.version === 'TEST-REV-2026', 'Standard 1 version is "TEST-REV-2026"');
  assert(vs1.publicationYear === 2026, 'Standard 1 publicationYear is 2026');
  assert(vs1.summary.includes('active') && vs1.summary.includes('amendment'), 'Standard 1 summary accurately reflects active status with amendments');

  // -------------------------------------------------------------------------
  // Part 8: Live API — Standard 2
  // -------------------------------------------------------------------------
  console.log('\n--- PART 8: LIVE API - STANDARD 2 ---');
  const apiStd2 = await httpGet('/api/standards/2/version');
  assert(apiStd2.status === 200, 'GET /api/standards/2/version returns HTTP 200');
  assert(apiStd2.body.success === true, 'Response body has success: true');
  assert(apiStd2.body.standardId === 2, 'Standard ID is 2');
  assert(apiStd2.body.is_number === 'TEST-IS-4151-MOCK', 'is_number is TEST-IS-4151-MOCK');

  const vs2 = apiStd2.body.versionStatus;
  assert(vs2.statusCategory === 'current', 'Standard 2 statusCategory is "current"');
  assert(vs2.statusValue === 'active', 'Standard 2 statusValue is "active"');
  assert(vs2.hasAmendments === false, 'Standard 2 hasAmendments is false');
  assert(Array.isArray(vs2.amendmentInfo) && vs2.amendmentInfo.length === 0, 'Standard 2 amendmentInfo is empty array');
  assert(vs2.isSuperseded === false, 'Standard 2 isSuperseded is false');
  assert(vs2.supersededBy === null, 'Standard 2 supersededBy is null');
  assert(vs2.version === 'TEST-REV-2026', 'Standard 2 version is "TEST-REV-2026"');
  assert(vs2.publicationYear === 2026, 'Standard 2 publicationYear is 2026');
  assert(vs2.summary === 'Database status indicates this standard is active.', 'Standard 2 summary is clean active statement');

  // -------------------------------------------------------------------------
  // Part 9: Error Handling — Nonexistent & Invalid Standard IDs
  // -------------------------------------------------------------------------
  console.log('\n--- PART 9: ERROR HANDLING ---');
  const api404 = await httpGet('/api/standards/999999/version');
  assert(api404.status === 404, 'GET /api/standards/999999/version returns HTTP 404');
  assert(api404.body.success === false, '404 response has success: false');
  assert(api404.body.error && api404.body.error.includes('999999'), '404 response mentions nonexistent ID');

  const api400Str = await httpGet('/api/standards/abc/version');
  assert(api400Str.status === 400, 'GET /api/standards/abc/version returns HTTP 400');
  assert(api400Str.body.success === false, '400 response has success: false');

  const api400Neg = await httpGet('/api/standards/-5/version');
  assert(api400Neg.status === 400, 'GET /api/standards/-5/version returns HTTP 400');

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
  console.log(`STEP 9 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runStep9Tests().catch(err => {
  console.error('Fatal error in Step 9 tests:', err);
  process.exit(1);
});
