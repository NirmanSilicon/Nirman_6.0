// =========================================================
// Nirdeshak Step 14 — Full MVP Testing & Final Integration Verification
// Complete End-to-End Validation of All 5 Journeys, Data Consistency,
// Security, Error Matrix, Responsive Layouts, Accessibility, and DB Integrity
// =========================================================

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { query } = require('./database');
const {
  validateReportPayload,
  generatePdfReportBuffer,
  sanitizeReportFilename
} = require('./pdfReport');

/**
 * Extracts and decodes text streams from a PDF binary buffer.
 */
function extractTextFromPdf(buf) {
  const s = buf.toString('binary');
  const parts = [];
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m;
  while ((m = streamRegex.exec(s)) !== null) {
    let streamData = Buffer.from(m[1], 'binary');
    try {
      streamData = zlib.inflateSync(streamData);
    } catch (e) {}
    const streamStr = streamData.toString('binary');
    const hexRegex = /<([0-9a-fA-F]+)>/g;
    let h;
    while ((h = hexRegex.exec(streamStr)) !== null) {
      try {
        parts.push(Buffer.from(h[1], 'hex').toString('utf8'));
      } catch (e) {}
    }
  }
  return parts.join('');
}

async function getBrowser() {
  try {
    return await chromium.launch({ channel: 'msedge', headless: true });
  } catch (edgeErr) {
    return await chromium.launch({ channel: 'chrome', headless: true });
  }
}

async function verifyDatabaseSnapshot() {
  const stdRes = await query('SELECT id, is_number, vector_dims(embedding) as dims FROM standards ORDER BY id;');
  const relRes = await query('SELECT id, source_standard_id, target_standard_id, relationship_type FROM standard_relationships ORDER BY id;');
  const tablesRes = await query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;");

  return {
    standardsCount: stdRes.rows.length,
    standards: stdRes.rows,
    relationshipsCount: relRes.rows.length,
    relationships: relRes.rows,
    tables: tablesRes.rows.map(r => r.tablename)
  };
}

async function runStep14Tests() {
  console.log('================================================================');
  console.log('STARTING NIRDESHAK STEP 14: FULL MVP INTEGRATION VERIFICATION');
  console.log('================================================================\n');

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

  // ----------------------------------------------------
  // PRE-TEST DATABASE INTEGRITY CHECK
  // ----------------------------------------------------
  console.log('--- 0. PRE-TEST DATABASE INTEGRITY SNAPSHOT ---');
  const initialDb = await verifyDatabaseSnapshot();
  assert(initialDb.standardsCount === 2, 'Initial database contains exactly 2 standards');
  assert(initialDb.relationshipsCount === 1, 'Initial database contains exactly 1 relationship');
  assert(
    initialDb.standards.every(s => s.dims === 3072),
    'Both standards have 3072-dimensional embeddings'
  );
  assert(
    initialDb.relationships[0].source_standard_id === 1 &&
    initialDb.relationships[0].target_standard_id === 2 &&
    initialDb.relationships[0].relationship_type === 'testing',
    'Standard relationship (1 -> 2, "testing") is intact'
  );

  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    acceptDownloads: true
  });
  const page = await context.newPage();
  const consoleErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon.ico')) {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  try {
    // ----------------------------------------------------
    // JOURNEY A — NATURAL LANGUAGE QUERY
    // ----------------------------------------------------
    console.log('\n--- 1. JOURNEY A: NATURAL LANGUAGE QUERY WORKFLOW ---');
    await page.goto('http://localhost:3000/classic.html', { waitUntil: 'networkidle', timeout: 15000 });
    assert(await page.title().then(t => t.includes('Nirdeshak')), 'Page loads with title containing "Nirdeshak"');

    // Select Natural Language Query tab
    await page.click('#tab-natural-language-query');
    const nlQuery = 'Industrial safety helmets for construction workers providing protection against mechanical impact.';
    await page.fill('#inputNaturalLanguage', nlQuery);

    // Start analysis
    await page.click('#analyseBtn');

    // Verify loading state
    const processingVisible = await page.isVisible('#processingStatus') || await page.isVisible('#dashboardLoading');
    assert(processingVisible, 'Processing or dashboard loading state appeared after submission');

    // Wait for recommendation dashboard
    await page.waitForSelector('#dashboardContent', { state: 'visible', timeout: 30000 });
    assert(await page.isVisible('#resultsDashboard'), 'Results dashboard is visible');

    // Verify Recommendation Card #1 elements
    assert(await page.isVisible('#rec-card-1'), 'At least one recommendation card is displayed');
    const card1Is = await page.textContent('#cardIsNumber-1');
    assert(card1Is && card1Is.includes('TEST-IS-2925-MOCK'), 'IS number TEST-IS-2925-MOCK is prominently displayed');

    const card1Title = await page.textContent('#cardTitle-1');
    assert(card1Title && card1Title.length > 10, 'Standard title is prominently displayed');

    const card1Score = await page.textContent('#cardFinalScore-1');
    assert(/^\d{1,3}\.\d%$/.test(card1Score.trim()), `Relevance score formatted as percentage: ${card1Score.trim()}`);

    // Expand details
    await page.click('#toggleDetailsBtn-1');
    await page.waitForSelector('#rec-details-1', { state: 'visible' });

    const card1Details = await page.textContent('#rec-details-1');
    assert(card1Details.includes('Database Status') && card1Details.includes('TEST-REV-2026'), 'Version information is displayed neutrally');
    assert(card1Details.includes('Certification') && card1Details.includes('Development/Test Data'), 'Certification info displayed with Development/Test Data label');
    assert(card1Details.includes('TEST-IS-4151-MOCK'), 'Related standard TEST-IS-4151-MOCK is displayed');
    assert(card1Details.includes('AI-Generated Explanation'), 'AI explanation section is displayed');
    assert(card1Details.includes('DEVELOPMENT_TEST_DATA'), 'Data provenance is displayed');

    // Verify PDF Report button and download
    assert(await page.isVisible('#downloadPdfReportBtn'), 'PDF report button is available in dashboard');

    const [downloadA] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.click('#downloadPdfReportBtn')
    ]);
    assert(downloadA.suggestedFilename().endsWith('.pdf'), `PDF downloaded with filename: "${downloadA.suggestedFilename()}"`);

    const streamA = await downloadA.createReadStream();
    const chunksA = [];
    for await (const chunk of streamA) chunksA.push(chunk);
    const bufA = Buffer.concat(chunksA);
    assert(bufA.slice(0, 5).toString('utf8') === '%PDF-', 'Downloaded PDF begins with valid magic bytes "%PDF-"');

    // ----------------------------------------------------
    // JOURNEY B — TECHNICAL SPECIFICATION INPUT
    // ----------------------------------------------------
    console.log('\n--- 2. JOURNEY B: TECHNICAL SPECIFICATION INPUT WORKFLOW ---');
    await page.click('#tab-technical-specification');
    const techSpecQuery = '11kV, 3-Phase, 50Hz indoor vacuum circuit breaker with rated short circuit breaking capacity 25kA, IP5X enclosure protection';
    await page.fill('#inputTechnicalSpecification', techSpecQuery);

    await page.click('#analyseBtn');
    await page.waitForSelector('#dashboardContent', { state: 'visible', timeout: 30000 });

    const originalReqB = await page.textContent('#dashboardOriginalRequirement');
    assert(originalReqB && originalReqB.includes('circuit breaker'), 'Technical specification text correctly passed into analysis');
    assert(await page.isVisible('#rec-card-1'), 'Dashboard renders recommendations for technical spec');

    const [downloadB] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.click('#downloadPdfReportBtn')
    ]);
    assert(downloadB.suggestedFilename().endsWith('.pdf'), 'PDF report successfully generated from technical specification journey');

    // ----------------------------------------------------
    // JOURNEY C — TENDER PDF WORKFLOW
    // ----------------------------------------------------
    console.log('\n--- 3. JOURNEY C: TENDER PDF WORKFLOW ---');
    await page.click('#tab-tender-pdf');

    // Test PDF file generation
    const samplePdfPath = path.join(__dirname, 'test_sample_tender.pdf');
    if (!fs.existsSync(samplePdfPath)) {
      const validPdf = `%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n4 0 obj << /Length 120 >> stream\nBT /F1 12 Tf 72 712 Td (GOVERNMENT TENDER - INDUSTRIAL SAFETY HELMETS) Tj ET\nendstream endobj\n5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000281 00000 n \n0000000451 00000 n \ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n528\n%%EOF`;
      fs.writeFileSync(samplePdfPath, validPdf, 'utf8');
    }

    await page.setInputFiles('#pdfFileInput', samplePdfPath);
    assert(await page.isVisible('#fileSelectedBox'), 'PDF file selected and meta displayed in UI');

    await page.click('#analyseBtn');
    await page.waitForSelector('#extractedRequirementsSection', { state: 'visible', timeout: 35000 });
    assert(await page.isVisible('#extractedRequirementsSection'), 'Structured requirements section appeared from tender PDF');

    // Test review & edit requirements
    await page.click('#editRequirementsBtn');
    assert(await page.isVisible('#requirementsEditMode'), 'User can review and edit requirements');
    await page.fill('#editProductName', 'Industrial Safety Helmet - Edited For Procurement');
    await page.click('#saveRequirementsBtn');
    assert(await page.isVisible('#requirementsViewMode'), 'Requirements saved and view mode restored');

    // Verify recommendations rendered from tender workflow
    await page.waitForSelector('#dashboardContent', { state: 'visible', timeout: 30000 });
    assert(await page.isVisible('#rec-card-1'), 'Recommendations appeared following tender PDF processing');

    const [downloadC] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.click('#downloadPdfReportBtn')
    ]);
    assert(downloadC.suggestedFilename().endsWith('.pdf'), 'PDF report generated from tender PDF workflow');

    // ----------------------------------------------------
    // JOURNEY D — EMPTY / NO MATCH RESULT
    // ----------------------------------------------------
    console.log('\n--- 4. JOURNEY D: EMPTY / NO MATCH RESULT ---');
    await page.evaluate(() => {
      window.NirdeshakDashboard.renderEmpty('Quantum Gravitational Teleportation Coil');
    });

    assert(await page.isVisible('#dashboardEmpty'), 'Empty results container rendered without crash');
    const emptyText = await page.textContent('#dashboardEmpty');
    assert(
      emptyText.includes('No matching standards were retrieved for this requirement'),
      'Empty state displays exact message: "No matching standards were retrieved for this requirement."'
    );
    assert(
      emptyText.includes('does not establish that no applicable Indian Standard exists'),
      'Notice informs user that lack of matches does not establish standard does not exist'
    );
    assert(!(await page.isVisible('#rec-card-1')), 'Zero fabricated standards displayed');

    // Verify empty state PDF report generation
    const [downloadD] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.click('#downloadPdfReportBtn')
    ]);
    const streamD = await downloadD.createReadStream();
    const chunksD = [];
    for await (const chunk of streamD) chunksD.push(chunk);
    const pdfTextD = extractTextFromPdf(Buffer.concat(chunksD));

    assert(pdfTextD.includes('Quantum Gravitational Teleportation Coil'), 'Empty PDF report includes original query');
    assert(
      pdfTextD.includes('No matching Indian Standards were retrieved'),
      'Empty PDF report includes no-result explanation'
    );

    // ----------------------------------------------------
    // JOURNEY E — INVALID INPUT VALIDATION
    // ----------------------------------------------------
    console.log('\n--- 5. JOURNEY E: INVALID INPUT VALIDATION ---');
    // Test empty query
    await page.click('#tab-product-description');
    await page.fill('#inputProductDescription', '');
    await page.click('#analyseBtn');
    assert(await page.isVisible('#validationError'), 'Empty query triggers validation error');

    // Test whitespace query
    await page.fill('#inputProductDescription', '     ');
    await page.click('#analyseBtn');
    assert(await page.isVisible('#validationError'), 'Whitespace query triggers validation error');

    // Test invalid file type
    await page.click('#tab-tender-pdf');
    const invalidFilePath = path.join(__dirname, 'test_invalid.txt');
    fs.writeFileSync(invalidFilePath, 'Not a pdf', 'utf8');
    await page.setInputFiles('#pdfFileInput', invalidFilePath);
    assert(await page.isVisible('#validationError'), 'Unsupported file type triggers immediate validation error');

    // Verify no stack traces or credentials in error message
    const errText = await page.textContent('#validationError');
    assert(!errText.includes('SELECT') && !errText.includes('postgres') && !errText.includes('AIzaSy'), 'Error message contains zero SQL, DB details, or API keys');

    // ----------------------------------------------------
    // 6. FULL PIPELINE DATA INTEGRITY & SCORE / VERSION / CERT CONSISTENCY
    // ----------------------------------------------------
    console.log('\n--- 6. DATA INTEGRITY & CROSS-LAYER CONSISTENCY ---');
    // Make a direct backend request to POST /api/recommendations/explain
    const testQuery = 'Industrial safety helmets for construction workers';
    const apiRes = await fetch('http://localhost:3000/api/recommendations/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: testQuery, limit: 2 })
    });
    assert(apiRes.status === 200, 'Direct recommendation API call returns HTTP 200');
    const backendData = await apiRes.json();
    assert(backendData.success === true, 'Backend response indicates success: true');

    const topBackendRec = backendData.recommendations[0];
    const expectedFinalPercent = (topBackendRec.scores.final * 100).toFixed(1) + '%';
    const expectedSemanticPercent = (topBackendRec.scores.semantic * 100).toFixed(1) + '%';
    const expectedTextPercent = (topBackendRec.scores.text * 100).toFixed(1) + '%';
    const expectedScopePercent = (topBackendRec.scores.scopeApplication * 100).toFixed(1) + '%';

    // Generate PDF buffer from identical backend data
    const pdfBuf = await generatePdfReportBuffer(backendData);
    const pdfDecoded = extractTextFromPdf(pdfBuf);
    console.log(`[DEBUG] pdfBuf length: ${pdfBuf ? pdfBuf.length : 0}, pdfDecoded length: ${pdfDecoded.length}`);
    if (pdfDecoded.length === 0) {
      console.log(`[DEBUG] pdfBuf first 200 bytes as binary:`, pdfBuf.slice(0, 200).toString('binary'));
    }

    // Verify Score Consistency: Backend == PDF == Dashboard
    assert(
      pdfDecoded.includes(`Relevance Score: ${expectedFinalPercent}`),
      `PDF Relevance Score matches backend formula: ${expectedFinalPercent}`
    );
    assert(
      pdfDecoded.includes(`Semantic Similarity: ${expectedSemanticPercent}`),
      `PDF Semantic component score matches backend: ${expectedSemanticPercent}`
    );
    assert(
      pdfDecoded.includes(`Keyword Match: ${expectedTextPercent}`),
      `PDF Keyword component score matches backend: ${expectedTextPercent}`
    );
    assert(
      pdfDecoded.includes(`Scope & Application: ${expectedScopePercent}`),
      `PDF Scope component score matches backend: ${expectedScopePercent}`
    );

    // Verify Version Consistency: Backend == PDF
    const backendVersion = topBackendRec.versionStatus.version;
    const backendStatusValue = topBackendRec.versionStatus.statusValue;
    assert(pdfDecoded.includes(backendVersion), `PDF includes exact backend version "${backendVersion}"`);
    assert(pdfDecoded.includes(backendStatusValue) || pdfDecoded.includes('Active / Current'), 'PDF preserves backend status value');

    // Verify Certification Consistency: Backend == PDF
    assert(
      pdfDecoded.includes(topBackendRec.certification.scheme),
      `PDF includes exact backend certification scheme "${topBackendRec.certification.scheme}"`
    );
    assert(
      pdfDecoded.includes('Development/Test Data'),
      'PDF correctly displays Development/Test Data label'
    );

    // Verify Related Standard Consistency: Backend == PDF
    const relIs = topBackendRec.relatedStandards[0].standard.is_number;
    assert(pdfDecoded.includes(relIs), `PDF includes exact related standard IS number "${relIs}"`);

    // Verify Grounded AI Explanation
    assert(
      pdfDecoded.includes('AI-Generated Grounded Explanation:'),
      'PDF includes grounded AI explanation header'
    );

    // ----------------------------------------------------
    // 7. SECURITY & SENSITIVE CREDENTIAL VALIDATION
    // ----------------------------------------------------
    console.log('\n--- 7. SECURITY & DATA LEAK VALIDATION ---');
    const allPdfText = pdfDecoded;
    assert(!allPdfText.includes('AIzaSy'), 'Zero Gemini API keys in PDF');
    assert(!allPdfText.includes('GEMINI_API_KEY'), 'Zero GEMINI_API_KEY tokens in PDF');
    assert(!allPdfText.includes('DATABASE_URL'), 'Zero DATABASE_URL tokens in PDF');
    assert(!allPdfText.includes('postgres://'), 'Zero DB connection strings in PDF');
    assert(!allPdfText.includes('SELECT ') && !allPdfText.includes('FROM standards'), 'Zero raw SQL in PDF');
    assert(!/\[\s*-?0\.\d{3,},\s*-?0\.\d{3,}/.test(allPdfText), 'Zero raw vector embeddings in PDF');

    // Test malicious inputs (XSS / path traversal / long strings)
    const sanitizedFilename = sanitizeReportFilename('../../../../etc/shadow\0.pdf');
    assert(
      sanitizedFilename === 'nirdeshak-report-etc-shadow-pdf.pdf' && !sanitizedFilename.includes('..') && !sanitizedFilename.includes('\0'),
      'Neutralizes path traversal and null bytes in filename generator'
    );

    const xssReport = await generatePdfReportBuffer({
      query: '<script>alert("XSS")</script>',
      recommendations: []
    });
    assert(Buffer.isBuffer(xssReport), 'Handles HTML / script-like input safely in PDF generator');

    // ----------------------------------------------------
    // 8. API ERROR MATRIX VALIDATION
    // ----------------------------------------------------
    console.log('\n--- 8. API ERROR MATRIX VALIDATION ---');
    // 400: Missing query
    const res400A = await fetch('http://localhost:3000/api/recommendations/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert(res400A.status === 400, 'POST /api/recommendations/explain with empty body returns 400');

    // 400: Invalid standard ID
    const res400B = await fetch('http://localhost:3000/api/standards/invalid_id/version');
    assert(res400B.status === 400, 'GET /api/standards/:id/version with invalid ID returns 400');

    // 404: Nonexistent standard
    const res404 = await fetch('http://localhost:3000/api/standards/999999/version');
    assert(res404.status === 404, 'GET /api/standards/999999/version returns 404');

    // 400: Malformed report payload
    const resReport400 = await fetch('http://localhost:3000/api/reports/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert(resReport400.status === 400, 'POST /api/reports/pdf with empty body returns 400');

    // ----------------------------------------------------
    // 9. RESPONSIVE UI VALIDATION (Desktop, Tablet, Mobile)
    // ----------------------------------------------------
    console.log('\n--- 9. RESPONSIVE UI VIEWPORT VALIDATION ---');
    // Re-render live recommendations for responsive layout checks
    await page.evaluate((data) => {
      window.NirdeshakDashboard.renderDashboard(data, 'Industrial safety helmets');
    }, backendData);

    // Desktop: 1280 x 800
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(200);
    const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    assert(!desktopOverflow, 'Desktop viewport (1280x800) has zero horizontal overflow');

    // Tablet: 768 x 1024
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(200);
    const tabletOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    assert(!tabletOverflow, 'Tablet viewport (768x1024) has zero horizontal overflow');

    // Mobile: 375 x 812
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(200);
    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    assert(!mobileOverflow, 'Mobile viewport (375x812) has zero horizontal overflow');

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 900 });

    // ----------------------------------------------------
    // 10. ACCESSIBILITY VALIDATION
    // ----------------------------------------------------
    console.log('\n--- 10. ACCESSIBILITY VALIDATION ---');
    const a11yChecks = await page.evaluate(() => {
      const btn = document.getElementById('downloadPdfReportBtn');
      const toggle = document.querySelector('.btn-toggle-details');
      const tabs = Array.from(document.querySelectorAll('.option-card'));

      return {
        downloadHasAriaLabel: !!(btn && btn.getAttribute('aria-label')),
        toggleHasAriaExpanded: !!(toggle && toggle.hasAttribute('aria-expanded')),
        toggleHasAriaControls: !!(toggle && toggle.hasAttribute('aria-controls')),
        tabsHaveRole: tabs.every(t => t.getAttribute('role') === 'tab'),
        tabsHaveAriaSelected: tabs.every(t => t.hasAttribute('aria-selected'))
      };
    });

    assert(a11yChecks.downloadHasAriaLabel, 'Download PDF button has accessible aria-label');
    assert(a11yChecks.toggleHasAriaExpanded, 'Toggle details button exposes aria-expanded');
    assert(a11yChecks.toggleHasAriaControls, 'Toggle details button exposes aria-controls');
    assert(a11yChecks.tabsHaveRole, 'Input option cards have role="tab"');
    assert(a11yChecks.tabsHaveAriaSelected, 'Input option cards expose aria-selected state');

    // ----------------------------------------------------
    // 11. PERFORMANCE & STABILITY CHECK (3 Consecutive Cycles)
    // ----------------------------------------------------
    console.log('\n--- 11. STABILITY & CONSECUTIVE ANALYSIS CYCLES ---');
    for (let cycle = 1; cycle <= 3; cycle++) {
      const cycleRes = await fetch('http://localhost:3000/api/recommendations/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `Cycle ${cycle} test query safety helmets`, limit: 1 })
      });
      assert(cycleRes.status === 200, `Stability Cycle ${cycle}: API responded HTTP 200`);

      const cycleData = await cycleRes.json();
      const cyclePdfBuf = await generatePdfReportBuffer(cycleData);
      assert(Buffer.isBuffer(cyclePdfBuf) && cyclePdfBuf.length > 2000, `Stability Cycle ${cycle}: PDF generated (${cyclePdfBuf.length} bytes)`);
    }

    // ----------------------------------------------------
    // 12. CLEAN STATE RESET WORKFLOW
    // ----------------------------------------------------
    console.log('\n--- 12. CLEAN STATE RESET WORKFLOW ---');
    await page.click('#tab-product-description');
    await page.fill('#inputProductDescription', 'Temporary reset test');
    await page.click('#clearBtn');

    const inputVal = await page.$eval('#inputProductDescription', el => el.value);
    assert(inputVal === '', 'Active input cleared on reset');
    assert(!(await page.isVisible('#submissionConfirmation')), 'Submission confirmation hidden on reset');
    assert(!(await page.isVisible('#resultsDashboard')), 'Results dashboard hidden on reset');

    // ----------------------------------------------------
    // 13. CONSOLE ERRORS AUDIT
    // ----------------------------------------------------
    console.log('\n--- 13. JAVASCRIPT CONSOLE AUDIT ---');
    assert(consoleErrors.length === 0, `Zero JS console errors observed throughout full session (errors: ${consoleErrors.join(', ') || 'none'})`);

  } finally {
    await browser.close();
  }

  // ----------------------------------------------------
  // POST-TEST DATABASE INTEGRITY VERIFICATION
  // ----------------------------------------------------
  console.log('\n--- 14. POST-TEST DATABASE INTEGRITY VERIFICATION ---');
  const postDb = await verifyDatabaseSnapshot();
  assert(postDb.standardsCount === initialDb.standardsCount, `Standards count unchanged: ${postDb.standardsCount} === ${initialDb.standardsCount}`);
  assert(postDb.relationshipsCount === initialDb.relationshipsCount, `Relationships count unchanged: ${postDb.relationshipsCount} === ${initialDb.relationshipsCount}`);
  assert(
    postDb.standards.every(s => s.dims === 3072),
    'Both standards retain exact 3072-dimensional embeddings'
  );
  assert(
    JSON.stringify(postDb.relationships) === JSON.stringify(initialDb.relationships),
    'Relationships table records identical before and after testing'
  );
  assert(
    JSON.stringify(postDb.tables) === JSON.stringify(initialDb.tables),
    'Zero unintended schema modifications or new tables created'
  );

  console.log('\n================================================================');
  console.log(`STEP 14 MVP VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStep14Tests().catch(err => {
  console.error('Fatal error during Step 14 MVP tests:', err);
  process.exit(1);
});
