const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function getBrowser() {
  try {
    return await chromium.launch({ channel: 'msedge', headless: true });
  } catch (edgeErr) {
    console.log('Edge launch fallback to Chrome:', edgeErr.message);
    return await chromium.launch({ channel: 'chrome', headless: true });
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('STARTING MODULAR NIRDESHAK PLAYWRIGHT E2E TESTS');
  console.log('====================================================\n');

  const browser = await getBrowser();
  const context = await browser.newContext({
    permissions: ['clipboard-read', 'clipboard-write']
  });
  const page = await context.newPage();

  let passed = 0;
  let failed = 0;
  const consoleErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon.ico')) {
        consoleErrors.push(text);
      }
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Open Website & Verify No Broken Imports
    console.log('1. Navigating to http://localhost:3000 ...');
    await page.goto('http://localhost:3000/classic.html', { waitUntil: 'networkidle', timeout: 15000 });
    const title = await page.title();
    assert(title.includes('Nirdeshak'), `Page title contains "Nirdeshak" (actual: "${title}")`);
    assert(consoleErrors.length === 0, `No JS console errors or broken imports on load (errors: ${consoleErrors.join(', ') || 'none'})`);

    // 2. Test Empty Input Validation (Test 9)
    console.log('\n2. Testing Empty Input Validation (Test 9)...');
    await page.click('#tab-product-description');
    await page.fill('#inputProductDescription', '');
    await page.click('#analyseBtn');
    
    await page.waitForSelector('#validationError', { state: 'visible', timeout: 5000 });
    const valErrorText = await page.textContent('#validationError');
    assert(valErrorText.includes('Please enter a product or procurement description'), 'Empty input validation error shown correctly');

    // 3. Test Product Description & Requirement Extraction (Tests 1 & 6)
    console.log('\n3. Testing Product Description & Live Gemini Extraction (Tests 1 & 6)...');
    await page.fill('#inputProductDescription', 'Safety helmet for construction workers providing protection against mechanical impact.');
    await page.click('#analyseBtn');

    await page.waitForSelector('#extractedRequirementsSection', { state: 'visible', timeout: 35000 });
    assert(true, '"Extracted Requirements" section appeared');

    const viewTableText = await page.textContent('#requirementsViewMode');
    assert(viewTableText.toLowerCase().includes('safety helmet'), 'Extracted result contains "Safety helmet"');
    assert(viewTableText.toLowerCase().includes('construction workers'), 'Extracted result contains "construction workers"');
    assert(viewTableText.toLowerCase().includes('mechanical impact'), 'Extracted result contains "mechanical impact"');

    // 4. Test Edit Requirements (Test 7)
    console.log('\n4. Testing Edit Requirements Form & Save (Test 7)...');
    await page.click('#editRequirementsBtn');
    await page.waitForSelector('#requirementsEditMode', { state: 'visible', timeout: 5000 });
    assert(true, 'Requirements Edit Mode is visible');

    await page.fill('#editProductName', 'Heavy Duty Industrial Safety Helmet');
    await page.fill('#editTechnicalRequirements', 'Impact resistance up to 50 Joules\nReinforced HDPE shell');
    await page.click('#saveRequirementsBtn');

    await page.waitForSelector('#requirementsViewMode', { state: 'visible', timeout: 5000 });
    const updatedTableText = await page.textContent('#requirementsViewMode');
    assert(updatedTableText.includes('Heavy Duty Industrial Safety Helmet'), 'View table updated with edited Product Name');
    assert(updatedTableText.includes('Impact resistance up to 50 Joules'), 'View table updated with edited technical requirements');

    // 5. Test Copy JSON (Test 8)
    console.log('\n5. Testing Copy JSON to Clipboard (Test 8)...');
    await page.click('#copyRequirementsJsonBtn');
    await page.waitForTimeout(500);
    const copyBtnText = await page.textContent('#copyRequirementsJsonBtn');
    assert(copyBtnText.includes('Copied JSON!'), 'Copy JSON button provided visual success confirmation');

    // 6. Test Technical Specification Input (Test 2)
    console.log('\n6. Testing Technical Specification Input (Test 2)...');
    await page.click('#tab-technical-specification');
    await page.fill('#inputTechnicalSpecification', '11kV 3-Phase 50Hz indoor vacuum circuit breaker with rated short circuit breaking capacity 25kA and copper busbars.');
    await page.click('#analyseBtn');

    await page.waitForFunction(() => {
      const el = document.getElementById('requirementsViewMode');
      return el && el.textContent.toLowerCase().includes('circuit breaker');
    }, { timeout: 35000 });
    
    const techTableText = await page.textContent('#requirementsViewMode');
    assert(techTableText.toLowerCase().includes('circuit breaker'), 'Technical Specification extracted "circuit breaker"');

    // 7. Test Natural Language Query Input (Test 3)
    console.log('\n7. Testing Natural Language Query Input (Test 3)...');
    await page.click('#tab-natural-language-query');
    await page.fill('#inputNaturalLanguage', 'What are the technical and safety requirements for industrial safety footwear with steel toe cap?');
    await page.click('#analyseBtn');

    await page.waitForFunction(() => {
      const el = document.getElementById('requirementsViewMode');
      return el && (el.textContent.toLowerCase().includes('footwear') || el.textContent.toLowerCase().includes('safety'));
    }, { timeout: 35000 });

    const nlTableText = await page.textContent('#requirementsViewMode');
    assert(nlTableText.toLowerCase().includes('footwear') || nlTableText.toLowerCase().includes('safety'), 'Natural Language Query extracted footwear/safety requirements');

    // 8. Test Invalid File Validation (Test 10)
    console.log('\n8. Testing Invalid File Type Validation (Test 10)...');
    await page.click('#tab-tender-pdf');
    const dummyTxtPath = path.join(__dirname, 'dummy_invalid.txt');
    fs.writeFileSync(dummyTxtPath, 'This is a plain text file, not a PDF.', 'utf8');

    const fileInput = await page.$('#pdfFileInput');
    await fileInput.setInputFiles(dummyTxtPath);
    await page.waitForSelector('#validationError', { state: 'visible', timeout: 5000 });
    const invalidFileMsg = await page.textContent('#validationError');
    assert(invalidFileMsg.toLowerCase().includes('not a pdf'), 'Invalid non-PDF upload triggered immediate validation error');

    if (fs.existsSync(dummyTxtPath)) fs.unlinkSync(dummyTxtPath);

    // 9. Test Valid Tender PDF Upload & Processing (Tests 4 & 5)
    console.log('\n9. Testing Valid Tender PDF Upload & Processing (Tests 4 & 5)...');
    const testPdfPath = path.join(__dirname, 'test_sample_tender.pdf');
    const validPdfContent = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 135 >> stream
BT
/F1 12 Tf
72 712 Td
(GOVERNMENT PROCUREMENT NOTICE - TENDER NO 2026-BIS-01) Tj
0 -20 Td
(Procurement of High Voltage Electrical Insulators for Power Distribution) Tj
ET
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000281 00000 n 
0000000466 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
543
%%EOF`;
    fs.writeFileSync(testPdfPath, validPdfContent, 'utf8');

    await fileInput.setInputFiles(testPdfPath);
    const fileNameDisplayed = await page.textContent('#selectedFileName');
    assert(fileNameDisplayed.includes('test_sample_tender.pdf'), 'Valid PDF selected and displayed in UI');

    console.log('   Clicking "Analyse" button for Tender PDF...');
    await page.click('#analyseBtn');

    await page.waitForFunction(() => {
      const summary = document.getElementById('submissionSummary');
      const reqs = document.getElementById('extractedRequirementsSection');
      return summary && summary.textContent.includes('Extracted Document Content') &&
             reqs && reqs.style.display !== 'none';
    }, { timeout: 40000 });

    const pdfSummaryText = await page.textContent('#submissionSummary');
    assert(pdfSummaryText.includes('Extracted Document Content'), 'Tender PDF extracted document content preview rendered');

    const pdfReqsText = await page.textContent('#requirementsViewMode');
    assert(pdfReqsText.length > 50, 'Tender PDF structured requirements table rendered');

    if (fs.existsSync(testPdfPath)) fs.unlinkSync(testPdfPath);

    // 10. Check Console Errors across full session
    assert(consoleErrors.length === 0, `Zero console errors throughout full test session (errors: ${consoleErrors.join(', ') || 'none'})`);

  } catch (err) {
    console.error('\n[EXCEPTION DURING TEST]:', err);
    failed++;
  } finally {
    await browser.close();
  }

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
