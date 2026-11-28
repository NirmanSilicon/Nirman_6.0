const { execSync } = require('child_process');
const path = require('path');

const TEST_FILES = [
  'scripts/test_universal_expansion.js',
  'test_helmet_complete_demo.js',
  'test_step5_full.js',
  'test_step6_semantic_search.js',
  'test_step7_ranking.js',
  'test_step8_related_standards.js',
  'test_step9_version_check.js',
  'test_step10_certification.js',
  'test_step11_rag.js',
  'test_step12_dashboard.js',
  'test_step13_pdf_report.js',
  'test_step14_mvp.js',
  'test_e2e.js'
];

async function runRegressionSuite() {
  console.log('====================================================');
  console.log('6. REGRESSION TESTING SUITE');
  console.log('====================================================\n');

  const results = [];

  for (const testFile of TEST_FILES) {
    const fullPath = path.join(__dirname, '..', testFile);
    console.log(`Running ${testFile}...`);
    const t0 = Date.now();
    let status = 'PASS';
    let output = '';
    let errorDetail = '';

    try {
      output = execSync(`node "${fullPath}"`, {
        cwd: path.join(__dirname, '..'),
        timeout: 45000,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      });
    } catch (err) {
      status = 'FAIL';
      output = err.stdout ? err.stdout.toString() : '';
      errorDetail = (err.stderr ? err.stderr.toString() : '') || err.message;
    }

    const elapsed = Date.now() - t0;

    // Check pass/fail indicators in output
    const passMatches = (output.match(/PASS|✅|passed/gi) || []).length;
    const failMatches = (output.match(/FAIL|❌|failed/gi) || []).length;

    results.push({
      file: testFile,
      status,
      elapsedMs: elapsed,
      passIndicators: passMatches,
      failIndicators: failMatches,
      snippet: output.slice(-400).trim(),
      errorDetail: errorDetail.slice(0, 300).trim()
    });

    console.log(`-> ${testFile}: ${status} (${elapsed}ms) [Pass: ${passMatches}, Fail: ${failMatches}]`);
  }

  console.log('\n====================================================');
  console.log('REGRESSION SUITE SUMMARY');
  console.log('====================================================');
  console.table(results.map(r => ({
    file: r.file,
    status: r.status,
    elapsedMs: r.elapsedMs,
    passCount: r.passIndicators,
    failCount: r.failIndicators
  })));

  process.exit(0);
}

runRegressionSuite().catch(e => {
  console.error(e);
  process.exit(1);
});
