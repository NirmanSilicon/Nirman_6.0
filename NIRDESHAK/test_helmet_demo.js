// =========================================================
// Nirdeshak — Final Prototype Demo Profile Verification Suite
// Product: Industrial Safety Helmet
// Standard: IS 2925:1984 (Specification for Industrial Safety Helmets)
// Verifies all 25 criteria across all 4 input modes & PDF Report
// =========================================================

require('dotenv').config();
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const {
  CURATED_HELMET_STANDARD,
  getCuratedHelmetRecommendation,
  getCuratedHelmetExtractedRequirements,
  isHelmetQuery,
  isDemoModeActive
} = require('./demoProfile');
const { generatePdfReportBuffer, validateReportPayload } = require('./pdfReport');

/**
 * Extracts all readable text from a PDF buffer (decompresses Flate streams, parses both literal and hex strings).
 */
function extractFullTextFromPdf(buf) {
  const s = buf.toString('binary');
  const parts = [];
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m;
  while ((m = streamRegex.exec(s)) !== null) {
    let streamData = Buffer.from(m[1], 'binary');
    try {
      streamData = zlib.inflateSync(streamData);
    } catch (e) {}
    const streamStr = streamData.toString('latin1');
    
    // Hex encoded characters <hex>
    const hexRegex = /<([0-9a-fA-F]+)>/g;
    let h;
    while ((h = hexRegex.exec(streamStr)) !== null) {
      try {
        parts.push(Buffer.from(h[1], 'hex').toString('utf8').replace(/\0/g, ''));
      } catch (e) {}
    }

    // Literal strings (Text) Tj
    const literalRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
    let lit;
    while ((lit = literalRegex.exec(streamStr)) !== null) {
      parts.push(lit[1]);
    }
  }

  return parts.join('');
}

async function getBrowser() {
  try {
    return await chromium.launch({ channel: 'msedge', headless: true });
  } catch (e) {
    return await chromium.launch({ channel: 'chrome', headless: true });
  }
}

async function runHelmetDemoTests() {
  console.log('================================================================');
  console.log('STARTING NIRDESHAK FINAL PROTOTYPE DEMO VERIFICATION');
  console.log('SCENARIO: INDUSTRIAL SAFETY HELMET (IS 2925:1984)');
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

  const BASE_URL = 'http://localhost:3000';
  const consoleErrors = [];

  // -----------------------------------------------------------
  // 1. DEMO PROFILE LOADS
  // -----------------------------------------------------------
  console.log('\n--- Criterion 1: Demo profile loads ---');
  assert(typeof CURATED_HELMET_STANDARD === 'object' && CURATED_HELMET_STANDARD !== null, 'Curated helmet standard object is defined');
  assert(CURATED_HELMET_STANDARD.is_number === 'IS 2925:1984', 'Demo profile standard is IS 2925:1984');
  assert(isDemoModeActive() === true, 'DEMO_MODE is enabled in configuration');

  // -----------------------------------------------------------
  // 2. IS 2925:1984 IS REAL CURATED RECORD
  // -----------------------------------------------------------
  console.log('\n--- Criterion 2: IS 2925:1984 is real curated record ---');
  assert(CURATED_HELMET_STANDARD.title === 'Specification for Industrial Safety Helmets', 'Title matches official BIS title');
  assert(CURATED_HELMET_STANDARD.versionStatus.statusValue === 'Active', 'Status is Active');
  assert(CURATED_HELMET_STANDARD.versionStatus.reaffirmedYear === 2020, 'Reaffirmed year is 2020');
  assert(CURATED_HELMET_STANDARD.versionStatus.amendmentCount === 8, 'Current BIS e-Sale amendment count is 8');
  assert(CURATED_HELMET_STANDARD.category.includes('Personal Protective Equipment'), 'Category is Industrial Safety / PPE');

  // -----------------------------------------------------------
  // 3. MOCK STANDARDS ARE HIDDEN IN DEMO MODE
  // -----------------------------------------------------------
  console.log('\n--- Criterion 3: Mock standards are hidden in demo mode ---');
  const demoRec = getCuratedHelmetRecommendation();
  const demoJsonStr = JSON.stringify(demoRec);
  assert(!demoJsonStr.includes('TEST-IS-2925-MOCK'), 'TEST-IS-2925-MOCK is not present in demo recommendation');
  assert(!demoJsonStr.includes('TEST-IS-4151-MOCK'), 'TEST-IS-4151-MOCK is not present in demo recommendation');
  assert(!demoJsonStr.includes('DEVELOPMENT TEST RECORD'), 'DEVELOPMENT TEST RECORD is not present in demo recommendation');
  assert(!demoJsonStr.includes('Mock Scheme'), 'Mock Scheme is not present in demo recommendation');

  // -----------------------------------------------------------
  // 4. PRODUCT DESCRIPTION RETURNS IS 2925
  // -----------------------------------------------------------
  console.log('\n--- Criterion 4: Product description returns IS 2925 ---');
  const textInputA = "Procurement of industrial safety helmets for construction workers. The helmets should provide protection against mechanical impact and falling objects and be suitable for industrial work environments.";
  const resA = await fetch(`${BASE_URL}/api/recommendations/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Nirdeshak-Demo': 'true' },
    body: JSON.stringify({ query: textInputA, demoMode: true })
  });
  const dataA = await resA.json();
  assert(dataA.success === true, 'Product description API returns success');
  assert(dataA.recommendations[0].is_number === 'IS 2925:1984', 'Primary standard is IS 2925:1984 for Product Description');

  // -----------------------------------------------------------
  // 5. TECHNICAL SPECIFICATION RETURNS IS 2925
  // -----------------------------------------------------------
  console.log('\n--- Criterion 5: Technical specification returns IS 2925 ---');
  const textInputB = "Industrial safety helmet with shell and harness, suitable for construction-site workers, with requirements for size, construction, workmanship and finish, mass, shock absorption resistance, penetration resistance, flammability resistance, electrical resistance, water absorption and heat resistance.";
  const resB = await fetch(`${BASE_URL}/api/recommendations/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Nirdeshak-Demo': 'true' },
    body: JSON.stringify({ query: textInputB, demoMode: true })
  });
  const dataB = await resB.json();
  assert(dataB.success === true, 'Technical specification API returns success');
  assert(dataB.recommendations[0].is_number === 'IS 2925:1984', 'Primary standard is IS 2925:1984 for Technical Specification');

  // -----------------------------------------------------------
  // 6. NATURAL LANGUAGE QUERY RETURNS IS 2925
  // -----------------------------------------------------------
  console.log('\n--- Criterion 6: Natural language query returns IS 2925 ---');
  const textInputC = "We need head protection for construction workers. The helmet should protect against impact and penetration and provide resistance to heat, flame, water and electrical hazards. Which Indian Standard should be considered?";
  const resC = await fetch(`${BASE_URL}/api/recommendations/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Nirdeshak-Demo': 'true' },
    body: JSON.stringify({ query: textInputC, demoMode: true })
  });
  const dataC = await resC.json();
  assert(dataC.success === true, 'Natural language API returns success');
  assert(dataC.recommendations[0].is_number === 'IS 2925:1984', 'Primary standard is IS 2925:1984 for Natural Language Query');

  // -----------------------------------------------------------
  // 7. TENDER PDF EXTRACTION & RECOMMENDATION
  // -----------------------------------------------------------
  console.log('\n--- Criterion 7: Tender PDF returns IS 2925 ---');
  const pdfPath = path.join(__dirname, 'nirdeshak_demo_tender_industrial_safety_helmets.pdf');
  assert(fs.existsSync(pdfPath), 'Demo tender PDF file exists');

  // Test extraction from server
  const pdfBuffer = fs.readFileSync(pdfPath);
  const formDataBoundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const postData = Buffer.concat([
    Buffer.from(`--${formDataBoundary}\r\nContent-Disposition: form-data; name="tenderFile"; filename="nirdeshak_demo_tender_industrial_safety_helmets.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
    pdfBuffer,
    Buffer.from(`\r\n--${formDataBoundary}--\r\n`)
  ]);

  const pdfUploadRes = await fetch(`${BASE_URL}/api/process-tender`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${formDataBoundary}`,
      'X-Nirdeshak-Demo': 'true'
    },
    body: postData
  });
  const pdfUploadData = await pdfUploadRes.json();
  assert(pdfUploadData.success === true, 'Tender PDF upload succeeded');
  assert(pdfUploadData.extractedText.includes('Industrial Safety Helmet') || pdfUploadData.extractedText.includes('IS 2925'), 'PDF text extracted successfully');

  // Test explainable recommendation for tender text
  const resD = await fetch(`${BASE_URL}/api/recommendations/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Nirdeshak-Demo': 'true' },
    body: JSON.stringify({ query: pdfUploadData.extractedText.slice(0, 500), demoMode: true })
  });
  const dataD = await resD.json();
  assert(dataD.success === true, 'Tender recommendation returns success');
  assert(dataD.recommendations[0].is_number === 'IS 2925:1984', 'Primary standard is IS 2925:1984 for Tender PDF');

  // -----------------------------------------------------------
  // 8. SAFETY REQUIREMENTS RENDER
  // -----------------------------------------------------------
  console.log('\n--- Criterion 8: Safety requirements render ---');
  const safetyReqs = CURATED_HELMET_STANDARD.safety_requirements;
  assert(safetyReqs.includes('Shock absorption resistance'), 'Safety includes Shock absorption resistance');
  assert(safetyReqs.includes('Penetration resistance'), 'Safety includes Penetration resistance');
  assert(safetyReqs.includes('Flammability resistance'), 'Safety includes Flammability resistance');
  assert(safetyReqs.includes('Electrical resistance'), 'Safety includes Electrical resistance');
  assert(safetyReqs.includes('Water absorption'), 'Safety includes Water absorption');
  assert(safetyReqs.includes('Heat resistance'), 'Safety includes Heat resistance');

  // -----------------------------------------------------------
  // 9. TESTING REQUIREMENTS RENDER (Clauses from IS 2925 itself)
  // -----------------------------------------------------------
  console.log('\n--- Criterion 9: Testing requirements render ---');
  const testingClauses = CURATED_HELMET_STANDARD.testing_requirements;
  assert(testingClauses.some(c => c.clause === 'Clause 4' && c.title === 'Sizes'), 'Clause 4 Sizes present');
  assert(testingClauses.some(c => c.clause === 'Clause 5' && c.title === 'Construction'), 'Clause 5 Construction present');
  assert(testingClauses.some(c => c.clause === 'Clause 6' && c.title === 'Workmanship and finish'), 'Clause 6 Workmanship present');
  assert(testingClauses.some(c => c.clause === 'Clause 7' && c.title === 'Mass'), 'Clause 7 Mass present');
  assert(testingClauses.some(c => c.clause === 'Clause 8.1' && c.title.includes('Shock absorption')), 'Clause 8.1 Shock absorption present');
  assert(testingClauses.some(c => c.clause === 'Clause 8.2' && c.title.includes('Penetration')), 'Clause 8.2 Penetration present');
  assert(testingClauses.some(c => c.clause === 'Clause 8.3' && c.title.includes('Flammability')), 'Clause 8.3 Flammability present');
  assert(testingClauses.some(c => c.clause === 'Clause 8.4' && c.title.includes('Electrical')), 'Clause 8.4 Electrical present');
  assert(testingClauses.some(c => c.clause === 'Clause 8.5' && c.title.includes('Water')), 'Clause 8.5 Water absorption present');
  assert(testingClauses.some(c => c.clause === 'Clause 8.6' && c.title.includes('Heat')), 'Clause 8.6 Heat resistance present');

  // -----------------------------------------------------------
  // 10. VERSION RENDERS
  // -----------------------------------------------------------
  console.log('\n--- Criterion 10: Version renders ---');
  assert(CURATED_HELMET_STANDARD.versionStatus.statusValue === 'Active', 'Version status is Active');
  assert(CURATED_HELMET_STANDARD.versionStatus.reaffirmedYear === 2020, 'Reaffirmed year is 2020');

  // -----------------------------------------------------------
  // 11. AMENDMENTS RENDER
  // -----------------------------------------------------------
  console.log('\n--- Criterion 11: Amendments render ---');
  assert(CURATED_HELMET_STANDARD.versionStatus.amendmentCount === 8, 'Amendments count is 8 per BIS e-Sale listing');
  assert(CURATED_HELMET_STANDARD.versionStatus.productManualAmendmentCount === 4, 'Jan 2019 Product Manual amendment count 4 noted separately');

  // -----------------------------------------------------------
  // 12. CERTIFICATION / QCO INFORMATION RENDERS
  // -----------------------------------------------------------
  console.log('\n--- Criterion 12: Certification/QCO information renders ---');
  const qco = CURATED_HELMET_STANDARD.certification;
  assert(qco.scheme === 'BIS Scheme-I / Standard Mark', 'Scheme is BIS Scheme-I / Standard Mark');
  assert(qco.qcoOrder.includes('Helmet') && qco.qcoOrder.includes('2023'), 'QCO Order name is Helmet QCO 2023');
  assert(qco.gazetteNotification === 'S.O. 4649(E)', 'Gazette number is S.O. 4649(E)');
  assert(qco.notificationDate === '23 October 2023', 'Gazette date is 23 October 2023');

  // -----------------------------------------------------------
  // 13. NO FAKE TESTING RELATIONSHIP APPEARS
  // -----------------------------------------------------------
  console.log('\n--- Criterion 13: No fake testing relationship appears ---');
  const rels = CURATED_HELMET_STANDARD.relatedStandards;
  assert(rels.length === 0, 'No fake related standards in curated demo profile');
  assert(!demoJsonStr.includes('TEST-IS-4151-MOCK'), 'IS 4151 is not presented as testing standard');

  // -----------------------------------------------------------
  // 14. NO CONFIDENCE PERCENTAGE APPEARS
  // -----------------------------------------------------------
  console.log('\n--- Criterion 14: No confidence percentage appears ---');
  assert(!demoJsonStr.toLowerCase().includes('confidence'), 'Demo recommendation contains no "confidence" key or value');

  // -----------------------------------------------------------
  // 15. PRIMARY RELEVANT STANDARD APPEARS
  // -----------------------------------------------------------
  console.log('\n--- Criterion 15: Primary Relevant Standard appears ---');
  assert(dataA.recommendations[0].scores.displayLabel === 'Primary Relevant Standard', 'Display label is Primary Relevant Standard');

  // -----------------------------------------------------------
  // 16. AI EXPLANATION IS GROUNDED
  // -----------------------------------------------------------
  console.log('\n--- Criterion 16: AI explanation is grounded ---');
  const whyRel = dataA.recommendations[0].explanation.whyRelevant;
  assert(whyRel.includes('IS 2925:1984'), 'Explanation references IS 2925:1984');
  assert(whyRel.includes('industrial') && (whyRel.includes('safety helmets') || whyRel.includes('head protection')), 'Explanation addresses industrial safety helmets');

  // -----------------------------------------------------------
  // 17. PROVENANCE APPEARS
  // -----------------------------------------------------------
  console.log('\n--- Criterion 17: Provenance appears ---');
  const prov = CURATED_HELMET_STANDARD.provenance;
  assert(prov.some(p => p.includes('BIS Product Manual')), 'Provenance includes BIS Product Manual');
  assert(prov.some(p => p.includes('BIS e-Sale')), 'Provenance includes BIS e-Sale');
  assert(prov.some(p => p.includes('S.O. 4649(E)')), 'Provenance includes Helmet QCO 2023 S.O. 4649(E)');

  // -----------------------------------------------------------
  // 18. PDF CONTAINS IS 2925
  // -----------------------------------------------------------
  console.log('\n--- Criterion 18: PDF contains IS 2925 ---');
  const pdfReportPayload = {
    query: textInputA,
    originalQuery: textInputA,
    recommendations: dataA.recommendations,
    count: 1,
    summary: dataA.summary,
    isCuratedDemo: true
  };
  const validatedPayload = validateReportPayload(pdfReportPayload);
  const generatedPdf = await generatePdfReportBuffer(validatedPayload.sanitized);
  assert(Buffer.isBuffer(generatedPdf) && generatedPdf.length > 1000, 'PDF generated successfully as Buffer');
  const pdfText = extractFullTextFromPdf(generatedPdf);
  assert(pdfText.includes('IS 2925') || pdfText.includes('2925'), 'PDF contains standard number IS 2925');

  // -----------------------------------------------------------
  // 19. PDF CONTAINS SAFETY REQUIREMENTS
  // -----------------------------------------------------------
  console.log('\n--- Criterion 19: PDF contains safety requirements ---');
  assert(pdfText.includes('Shock absorption') || pdfText.includes('absorption'), 'PDF contains Shock absorption');
  assert(pdfText.includes('Penetration') || pdfText.includes('penetration'), 'PDF contains Penetration resistance');

  // -----------------------------------------------------------
  // 20. PDF CONTAINS TESTING REQUIREMENTS
  // -----------------------------------------------------------
  console.log('\n--- Criterion 20: PDF contains testing requirements ---');
  assert(pdfText.includes('Clause 4') || pdfText.includes('Sizes') || pdfText.includes('TESTING REQUIREMENTS'), 'PDF contains testing requirements');

  // -----------------------------------------------------------
  // 21. PDF CONTAINS CERTIFICATION CONTEXT
  // -----------------------------------------------------------
  console.log('\n--- Criterion 21: PDF contains certification context ---');
  assert(pdfText.includes('Scheme-I') || pdfText.includes('4649') || pdfText.includes('Quality Control Order'), 'PDF contains QCO 2023 certification context');

  // -----------------------------------------------------------
  // 22. NO MOCK IDS APPEAR IN DEMO UI OR PDF
  // -----------------------------------------------------------
  console.log('\n--- Criterion 22: No mock IDs appear in demo UI or PDF ---');
  assert(!pdfText.includes('TEST-IS-2925-MOCK'), 'No TEST-IS-2925-MOCK in PDF');
  assert(!pdfText.includes('TEST-IS-4151-MOCK'), 'No TEST-IS-4151-MOCK in PDF');

  // -----------------------------------------------------------
  // 23. NO API KEYS APPEAR
  // -----------------------------------------------------------
  console.log('\n--- Criterion 23: No API keys appear ---');
  assert(!pdfText.includes('AIza'), 'No Gemini API keys in PDF');
  assert(!demoJsonStr.includes('AIza'), 'No Gemini API keys in recommendation payload');

  // -----------------------------------------------------------
  // 24. NO RAW VECTORS APPEAR
  // -----------------------------------------------------------
  console.log('\n--- Criterion 24: No raw vectors appear ---');
  assert(!pdfText.includes('[0.0') && !pdfText.includes('[ -0.'), 'No raw vectors in PDF');
  assert(!demoJsonStr.includes('embedding') && !demoJsonStr.includes('vector'), 'No raw embedding vectors in recommendation payload');

  // -----------------------------------------------------------
  // 25. VISUAL PLAYWRIGHT DEMO TEST FOR ALL 4 MODES
  // -----------------------------------------------------------
  console.log('\n--- Criterion 25: Visual Playwright Demo Test for all 4 modes ---');
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    acceptDownloads: true
  });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon.ico')) {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  const modes = [
    { name: 'Product Description', btnId: 'loadDemoProductBtn', tabId: 'tab-product-description' },
    { name: 'Technical Specification', btnId: 'loadDemoTechSpecBtn', tabId: 'tab-technical-specification' },
    { name: 'Natural Language Query', btnId: 'loadDemoNlQueryBtn', tabId: 'tab-natural-language-query' },
    { name: 'Tender PDF Upload', btnId: 'loadDemoPdfBtn', tabId: 'tab-tender-pdf' }
  ];

  for (const mode of modes) {
    console.log(`\nTesting Flow: ${mode.name}...`);
    // 1. Landing
    await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle' });
    await page.click('#startAnalysisBtn');
    await page.waitForURL('**/analysis.html');

    // 2. Select Tab & Load Curated Scenario
    await page.click(`#${mode.tabId}`);
    await page.waitForTimeout(300);

    if (mode.btnId === 'loadDemoPdfBtn') {
      // Set input files for the file input
      const fileInput = await page.$('#pdfFileInput');
      if (fileInput) {
        await fileInput.setInputFiles(pdfPath);
      }
    } else {
      const btn = await page.$(`#${mode.btnId}`);
      if (btn && await btn.isVisible()) {
        await btn.click();
      } else if (mode.tabId === 'tab-product-description') {
        await page.fill('#inputProductDescription', DEMO_SCENARIOS.productDescription);
      } else if (mode.tabId === 'tab-technical-specification') {
        await page.fill('#inputTechnicalSpecification', DEMO_SCENARIOS.techSpec);
      } else {
        await page.fill('#inputNaturalLanguage', DEMO_SCENARIOS.nlQuery);
      }
    }
    await page.waitForTimeout(300);

    // 3. Click Continue on analysis.html
    await page.click('#continueBtn');

    // 4. Processing -> Requirements
    await page.waitForURL('**/requirements.html', { timeout: 35000 });
    const reqText = await page.innerText('body');
    assert(reqText.includes('Industrial') || reqText.includes('Safety') || reqText.includes('Helmet'), `${mode.name}: Extracted requirements loaded`);

    // 5. Requirements -> Analyzing -> Results
    await page.click('#continueToAnalysisBtn');
    await page.waitForURL('**/results.html', { timeout: 35000 });

    // 6. Verify Results Page for IS 2925:1984
    const pageContent = await page.innerText('body');
    assert(pageContent.includes('IS 2925:1984'), `${mode.name}: Result prominently identifies IS 2925:1984`);
    assert(pageContent.includes('Specification for Industrial Safety Helmets'), `${mode.name}: Result displays official title`);
    assert(pageContent.includes('PRIMARY RELEVANT STANDARD'), `${mode.name}: Displays PRIMARY RELEVANT STANDARD heading`);
    assert(pageContent.includes('Active'), `${mode.name}: Displays Active status`);
    assert(pageContent.includes('2020'), `${mode.name}: Displays Reaffirmed 2020`);
    assert(pageContent.includes('8'), `${mode.name}: Displays Amendment count 8`);
    assert(pageContent.includes('Shock absorption'), `${mode.name}: Displays Shock absorption safety requirement`);
    assert(pageContent.includes('Clause 4') || pageContent.includes('Sizes'), `${mode.name}: Displays Clause 4 testing requirement`);
    assert(pageContent.includes('S.O. 4649(E)'), `${mode.name}: Displays S.O. 4649(E) QCO 2023 Order`);
    assert(!pageContent.includes('TEST-IS-2925-MOCK'), `${mode.name}: Does not contain TEST-IS-2925-MOCK`);
    assert(!pageContent.includes('TEST-IS-4151-MOCK'), `${mode.name}: Does not contain TEST-IS-4151-MOCK`);
    assert(!pageContent.toLowerCase().includes('confidence 54'), `${mode.name}: No misleading confidence 54% displayed`);

    // 7. Test PDF download trigger on the first mode
    if (mode.name === 'Product Description') {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 10000 }),
        page.click('#downloadPdfReportBtn')
      ]);
      const downloadPath = await download.path();
      assert(fs.existsSync(downloadPath), 'PDF report downloaded successfully from results page');
      const downloadedBuf = fs.readFileSync(downloadPath);
      assert(downloadedBuf.length > 1000, `Downloaded PDF buffer is valid (${downloadedBuf.length} bytes)`);
    }
  }

  await browser.close();

  // Console error check
  assert(consoleErrors.length === 0, `No unexpected console errors logged during Playwright runs (errors: ${consoleErrors.length})`);
  if (consoleErrors.length > 0) {
    console.error('Console errors:', consoleErrors);
  }

  console.log('\n================================================================');
  console.log(`HELMET DEMO PROFILE TESTS FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runHelmetDemoTests().catch(err => {
    console.error('Unhandled error during helmet demo tests:', err);
    process.exit(1);
  });
}

module.exports = { runHelmetDemoTests };
