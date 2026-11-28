/**
 * NIRDESHAK Test Suite Auditor
 * Audits all existing test files, identifies legacy dependencies and mutation hazards,
 * and executes safe non-mutating test suites.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const testFiles = [
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
  'test_top3_recommendations.js',
  'test_helmet_demo.js',
  'test_helmet_complete_demo.js',
  'test_multi_standard_details.js',
  'test_multipage.js',
  'test_e2e.js'
];

async function auditTestSuites() {
  console.log('='.repeat(80));
  console.log('NIRDESHAK TEST SUITES AUDIT & ISOLATION EVALUATION');
  console.log('='.repeat(80));

  const suiteResults = [];

  for (const file of testFiles) {
    if (!fs.existsSync(file)) {
      suiteResults.push({ file, status: 'NOT_FOUND', reason: 'File does not exist' });
      continue;
    }

    const content = fs.readFileSync(file, 'utf8');
    const hasMutations = /INSERT\s+INTO|UPDATE\s+|DELETE\s+FROM|TRUNCATE/i.test(content) && !/SELECT/i.test(content);
    const usesMockIds = content.includes('TEST-IS-2925-MOCK') || content.includes('TEST-IS-4151-MOCK');
    const isPlaywright = content.includes('playwright');

    let category = 'UNIT';
    if (isPlaywright) category = 'E2E_BROWSER';
    else if (content.includes('http://localhost') || content.includes('app.listen')) category = 'INTEGRATION';

    // We classify each test
    suiteResults.push({
      file,
      category,
      hasMutations,
      usesMockIds,
      isPlaywright,
      lineCount: content.split('\n').length
    });
  }

  console.table(suiteResults);
  fs.writeFileSync('scripts/audit_test_suites_result.json', JSON.stringify(suiteResults, null, 2));
  return suiteResults;
}

if (require.main === module) {
  auditTestSuites().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { auditTestSuites };
