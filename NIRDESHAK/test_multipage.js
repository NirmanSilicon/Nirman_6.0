// =========================================================
// Nirdeshak — Multi-Page Application End-to-End Test Suite
// Verifies complete workflow across all 6 pages:
// index.html -> analysis.html -> processing.html -> requirements.html -> analyzing.html -> results.html -> PDF Download
// =========================================================

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function getBrowser() {
  try {
    return await chromium.launch({ channel: 'msedge', headless: true });
  } catch (e) {
    return await chromium.launch({ channel: 'chrome', headless: true });
  }
}

async function runMultiPageTests() {
  console.log('================================================================');
  console.log('STARTING NIRDESHAK MULTI-PAGE APPLICATION VERIFICATION SUITE');
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
    // ---------------------------------------------------------
    // 1. PAGE 1: LANDING PAGE (index.html)
    // ---------------------------------------------------------
    console.log('--- 1. VERIFYING PAGE 1: LANDING PAGE (index.html) ---');
    await page.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle' });
    
    assert(await page.title().then(t => t.includes('Nirdeshak')), 'Landing page title contains "Nirdeshak"');
    assert(await page.isVisible('.main-header__title'), 'Main header NIRDESHAK branding is visible');
    assert(await page.isVisible('.hero__heading'), 'Hero heading is visible');
    assert(await page.isVisible('#startAnalysisBtn'), 'Primary CTA "Start New Analysis" is present');

    // Verify absence of full analysis forms or dashboard cards on landing page
    const hasInputGrid = await page.isVisible('.input-options__grid');
    const hasDashboard = await page.isVisible('.results-dashboard');
    assert(!hasInputGrid, 'Landing page does NOT contain input options grid');
    assert(!hasDashboard, 'Landing page does NOT contain results dashboard');

    // Click CTA to navigate to analysis.html
    await page.click('#startAnalysisBtn');
    await page.waitForURL('**/analysis.html');
    assert(page.url().includes('analysis.html'), 'Clicking "Start New Analysis" navigated to analysis.html');

    // ---------------------------------------------------------
    // 2. PAGE 2: NEW ANALYSIS (analysis.html)
    // ---------------------------------------------------------
    console.log('\n--- 2. VERIFYING PAGE 2: NEW ANALYSIS (analysis.html) ---');
    assert(await page.isVisible('.step-indicator'), 'Step indicator is rendered on analysis.html');
    
    // Verify Step 1 is active
    const step1Active = await page.evaluate(() => {
      const s1 = document.querySelector('.step-indicator__item');
      return s1 && s1.classList.contains('step-indicator__item--active');
    });
    assert(step1Active, 'Step 1 (Input) is marked as active in step indicator');

    assert(await page.isVisible('#tab-product-description'), 'Product Description tab visible');
    assert(await page.isVisible('#tab-technical-specification'), 'Technical Specification tab visible');
    assert(await page.isVisible('#tab-tender-pdf'), 'Tender Document (PDF) tab visible');
    assert(await page.isVisible('#tab-natural-language-query'), 'Natural Language Query tab visible');

    // Test empty input validation
    await page.click('#continueBtn');
    const validationVisible = await page.isVisible('#validationError');
    assert(validationVisible, 'Empty input triggers validation error on analysis.html');

    // Fill valid Product Description query
    const sampleQuery = 'Industrial safety helmets for construction workers';
    await page.fill('#inputProductDescription', sampleQuery);
    
    // Click Continue to navigate to processing.html
    await page.click('#continueBtn');
    await page.waitForURL('**/processing.html');
    assert(page.url().includes('processing.html'), 'Submitting valid input navigated to processing.html');

    // ---------------------------------------------------------
    // 3. PAGE 3: DOCUMENT / REQUIREMENT PROCESSING (processing.html)
    // ---------------------------------------------------------
    console.log('\n--- 3. VERIFYING PAGE 3: PROCESSING (processing.html) ---');
    assert(await page.isVisible('#progressTimeline'), 'Progress timeline is rendered on processing.html');
    
    // Wait for requirement extraction to complete and auto-redirect to requirements.html
    await page.waitForURL('**/requirements.html', { timeout: 25000 });
    assert(page.url().includes('requirements.html'), 'Processing completed and automatically navigated to requirements.html');

    // ---------------------------------------------------------
    // 4. PAGE 4: REQUIREMENT REVIEW (requirements.html)
    // ---------------------------------------------------------
    console.log('\n--- 4. VERIFYING PAGE 4: REQUIREMENT REVIEW (requirements.html) ---');
    assert(await page.isVisible('#extractedRequirementsSection'), 'Extracted requirements section is visible');
    
    // Check view table contents
    const viewText = await page.textContent('#requirementsViewMode');
    assert(
      viewText.toLowerCase().includes('helmet') || viewText.toLowerCase().includes('safety'),
      'Extracted requirements display product / safety parameters'
    );

    // Test Edit Mode toggle
    await page.click('#editRequirementsBtn');
    assert(await page.isVisible('#requirementsEditMode'), 'Edit Mode opened successfully');
    
    // Edit Product Name
    await page.fill('#editProductName', 'Industrial safety helmets for construction workers (Heavy Duty)');
    await page.click('#saveRequirementsBtn');
    assert(await page.isVisible('#requirementsViewMode'), 'Save changes restored View Mode');
    
    const updatedViewText = await page.textContent('#requirementsViewMode');
    assert(updatedViewText.includes('Heavy Duty'), 'Updated product name is reflected in View Mode');

    // Click "Continue to Analysis"
    await page.click('#continueToAnalysisBtn');
    await page.waitForURL('**/analyzing.html');
    assert(page.url().includes('analyzing.html'), 'Clicking "Continue to Analysis" navigated to analyzing.html');

    // ---------------------------------------------------------
    // 5. PAGE 5: ANALYSIS PROGRESS (analyzing.html)
    // ---------------------------------------------------------
    console.log('\n--- 5. VERIFYING PAGE 5: ANALYSIS PROGRESS (analyzing.html) ---');
    assert(await page.isVisible('#analysisTimeline'), 'Intelligence pipeline timeline is visible');
    
    // Wait for standards analysis API call to complete and redirect to results.html
    await page.waitForURL('**/results.html', { timeout: 35000 });
    assert(page.url().includes('results.html'), 'Analysis completed and automatically navigated to results.html');

    // ---------------------------------------------------------
    // 6. PAGE 6: RESULTS & RECOMMENDATIONS (results.html)
    // ---------------------------------------------------------
    console.log('\n--- 6. VERIFYING PAGE 6: RESULTS & RECOMMENDATIONS (results.html) ---');
    assert(await page.isVisible('#resultsDashboard'), 'Results dashboard is visible');
    
    // Verify recommended standards are rendered
    await page.waitForSelector('.recommendation-card', { state: 'visible', timeout: 10000 });
    const cardCount = await page.locator('.recommendation-card').count();
    assert(cardCount >= 1, `At least 1 recommendation card displayed (actual: ${cardCount})`);

    const dashboardText = await page.textContent('#resultsDashboard');
    assert(dashboardText.includes('IS 2925') || dashboardText.includes('TEST-IS-2925-MOCK'), 'Standard IS 2925 or TEST-IS-2925-MOCK displayed');
    assert(dashboardText.includes('Relevance') || dashboardText.includes('PRIMARY RELEVANT STANDARD'), 'Relevance or Primary Relevant Standard displayed');
    assert(dashboardText.includes('Status') || dashboardText.includes('Database Status') || dashboardText.includes('STANDARD DETAILS'), 'Version and amendment section displayed');
    assert(dashboardText.includes('Certification') || dashboardText.includes('CERTIFICATION'), 'Certification section displayed');
    assert(dashboardText.includes('AI-Generated Explanation'), 'AI explanation section displayed');

    // Verify PDF Report Download on Results Page
    assert(await page.isVisible('#downloadPdfReportBtn'), 'Download PDF Report button is present');
    const downloadPromise = page.waitForEvent('download', { timeout: 20000 });
    await page.click('#downloadPdfReportBtn');
    const download = await downloadPromise;
    const downloadPath = await download.path();
    const pdfBuf = fs.readFileSync(downloadPath);

    assert(download.suggestedFilename().endsWith('.pdf'), `PDF downloaded with filename "${download.suggestedFilename()}"`);
    assert(pdfBuf.slice(0, 5).toString('binary') === '%PDF-', 'Downloaded PDF begins with valid magic bytes "%PDF-"');

    // Test "Start New Analysis" button on results page
    await page.click('#startNewAnalysisBtn');
    await page.waitForURL('**/analysis.html');
    assert(page.url().includes('analysis.html'), 'Clicking "Start New Analysis" returns to analysis.html');

    // ---------------------------------------------------------
    // 7. TENDER PDF FULL MULTI-PAGE WORKFLOW
    // ---------------------------------------------------------
    console.log('\n--- 7. VERIFYING TENDER PDF MULTI-PAGE WORKFLOW ---');
    await page.click('#tab-tender-pdf');
    
    const samplePdfPath = path.join(__dirname, 'test_tender.pdf');
    if (!fs.existsSync(samplePdfPath)) {
      // Create minimal valid PDF
      const minimalPdf = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000102 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF';
      fs.writeFileSync(samplePdfPath, minimalPdf);
    }

    const fileInput = await page.locator('#pdfFileInput');
    await fileInput.setInputFiles(samplePdfPath);
    assert(await page.isVisible('#fileSelectedBox'), 'Selected PDF metadata displayed in UI');

    await page.click('#continueBtn');
    await page.waitForURL('**/processing.html');
    assert(page.url().includes('processing.html'), 'Tender PDF submission navigated to processing.html');

    await page.waitForURL('**/requirements.html', { timeout: 25000 });
    assert(page.url().includes('requirements.html'), 'Tender PDF processing reached requirements.html');

    await page.click('#continueToAnalysisBtn');
    await page.waitForURL('**/analyzing.html');
    assert(page.url().includes('analyzing.html'), 'Tender PDF review reached analyzing.html');

    await page.waitForURL('**/results.html', { timeout: 35000 });
    assert(page.url().includes('results.html'), 'Tender PDF analysis reached results.html');

    // ---------------------------------------------------------
    // 8. JAVASCRIPT CONSOLE AUDIT
    // ---------------------------------------------------------
    console.log('\n--- 8. JAVASCRIPT CONSOLE AUDIT ---');
    const criticalErrors = consoleErrors.filter(e => !e.includes('favicon.ico'));
    assert(criticalErrors.length === 0, `Zero critical JS console errors observed (errors: ${criticalErrors.length > 0 ? criticalErrors.join(', ') : 'none'})`);

  } catch (err) {
    console.error('[ERROR in Multi-Page Test Suite]:', err);
    failed++;
  } finally {
    await browser.close();
  }

  console.log('\n================================================================');
  console.log(`MULTI-PAGE TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runMultiPageTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
