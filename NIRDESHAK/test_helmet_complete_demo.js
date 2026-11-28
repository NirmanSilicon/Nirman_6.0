// =========================================================
// NIRDESHAK — COMPREHENSIVE PRODUCTION-LIKE HELMET DEMO SUITE
// Profile: Industrial Safety Helmet (IS 2925:1984)
//
// Validates all 41 acceptance criteria across:
// 1. Product Description
// 2. Technical Specification
// 3. Natural Language (English)
// 4. Natural Language (Hindi)
// 5. Natural Language (Odia)
// 6. Tender PDF Document
// 7. Data integrity, related standards, gap detection, and PDF generation
// =========================================================

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';

const QUERIES = {
  productDescription: "Procurement of industrial safety helmets for construction workers. The helmets should provide protection against mechanical impact and falling objects and be suitable for industrial work environments.",
  techSpec: "Industrial safety helmet with shell and harness for construction-site workers. Requirements include size, shell and harness construction, workmanship and finish, mass, shock absorption resistance, penetration resistance, flammability resistance, electrical resistance, water absorption and heat resistance.",
  nlQueryEnglish: "We need protective headgear for workers at construction sites. The helmet should protect against impacts and penetration and also meet the relevant fire, electrical, heat and water resistance requirements. Identify the applicable Indian Standard and the supporting testing or related standards.",
  nlQueryHindi: "निर्माण स्थल पर काम करने वाले श्रमिकों के लिए औद्योगिक सुरक्षा हेलमेट चाहिए। हेलमेट सिर को यांत्रिक आघात और गिरने वाली वस्तुओं से सुरक्षा दे। इसके लिए लागू भारतीय मानक बताइए।",
  nlQueryOdia: "ନିର୍ମାଣ ସ୍ଥଳରେ କାମ କରୁଥିବା ଶ୍ରମିକଙ୍କ ପାଇଁ ଔଦ୍ୟୋଗିକ ସୁରକ୍ଷା ହେଲମେଟ ଆବଶ୍ୟକ। ହେଲମେଟ ଯାନ୍ତ୍ରିକ ଆଘାତ ଏବଂ ପଡୁଥିବା ବସ୍ତୁରୁ ମୁଣ୍ଡକୁ ସୁରକ୍ଷା ଦେବା ଉଚିତ। ଏଥିପାଇଁ ପ୍ରୟୋଜ୍ୟ ଭାରତୀୟ ମାନକ କଣ?"
};

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failedCount++;
  }
}

async function getBrowser() {
  try {
    return await chromium.launch({ channel: 'msedge', headless: true });
  } catch (e) {
    return await chromium.launch({ headless: true });
  }
}

/**
 * Robust, kerning-aware PDF text stream decoder
 */
function extractTextFromPdfBuffer(pdfBuf) {
  const binary = pdfBuf.toString('binary');
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m;
  const allText = [];

  while ((m = streamRegex.exec(binary)) !== null) {
    let streamData = Buffer.from(m[1], 'binary');
    try {
      const zlib = require('zlib');
      streamData = zlib.inflateSync(streamData);
    } catch (e) {}
    const streamStr = streamData.toString('binary');

    // Match TJ arrays (handles kerning within a phrase)
    const tjRegex = /\[([\s\S]*?)\]\s*TJ/g;
    let tj;
    while ((tj = tjRegex.exec(streamStr)) !== null) {
      const inner = tj[1];
      let arrayText = '';
      const hexRegex = /<([0-9a-fA-F]+)>/g;
      let h;
      while ((h = hexRegex.exec(inner)) !== null) {
        try {
          arrayText += Buffer.from(h[1], 'hex').toString('utf8');
        } catch (e) {}
      }
      const litRegex = /\(([^)]*)\)/g;
      let lit;
      while ((lit = litRegex.exec(inner)) !== null) {
        arrayText += lit[1];
      }
      allText.push(arrayText);
    }

    // Match single Tj strings
    const singleTjRegex = /<([0-9a-fA-F]+)>\s*Tj/g;
    let stj;
    while ((stj = singleTjRegex.exec(streamStr)) !== null) {
      try {
        allText.push(Buffer.from(stj[1], 'hex').toString('utf8'));
      } catch (e) {}
    }

    const singleLitTj = /\(([^)]*)\)\s*Tj/g;
    let slit;
    while ((slit = singleLitTj.exec(streamStr)) !== null) {
      allText.push(slit[1]);
    }
  }

  return allText.join(' ') + ' ' + binary;
}

async function runCompleteHelmetDemoTests() {
  console.log('================================================================');
  console.log('STARTING NIRDESHAK COMPLETE HELMET PROCUREMENT DEMO SUITE');
  console.log('================================================================\n');

  const browser = await getBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon.ico')) {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  try {
    // ---------------------------------------------------------
    // 1. DIRECT API VERIFICATIONS ACROSS ALL 5 TEXT INPUTS
    // ---------------------------------------------------------
    console.log('--- 1. API VERIFICATIONS (ALL 5 INPUT QUERIES) ---');

    for (const [key, qText] of Object.entries(QUERIES)) {
      const res = await fetch(`${BASE_URL}/api/recommendations/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Nirdeshak-Demo': 'true' },
        body: JSON.stringify({ query: qText, demoMode: true })
      });
      assert(res.status === 200, `API [${key}] returns HTTP 200`);
      const data = await res.json();
      assert(data.success === true, `API [${key}] indicates success: true`);
      assert(data.recommendations && data.recommendations.length > 0, `API [${key}] returns recommendations`);
      const top = data.recommendations[0];
      assert(top.is_number === 'IS 2925:1984', `API [${key}] identifies IS 2925:1984`);
      assert(top.title.includes('Industrial Safety Helmets'), `API [${key}] title matches official BIS title`);
    }

    // ---------------------------------------------------------
    // 2. VERIFY CANONICAL DATA STRUCTURES & ACCURACY (Items 7-26)
    // ---------------------------------------------------------
    console.log('\n--- 2. CANONICAL HELMET DATA STRUCTURES & LOGICAL RULES ---');
    const canonRes = await fetch(`${BASE_URL}/api/recommendations/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Nirdeshak-Demo': 'true' },
      body: JSON.stringify({ query: QUERIES.productDescription, demoMode: true })
    });
    const canonData = await canonRes.json();
    const canonRec = canonData.recommendations[0];

    // Item 7: Technical Requirements
    assert(Array.isArray(canonRec.technicalRequirements) && canonRec.technicalRequirements.length >= 6, 'Technical requirements present and detailed');
    assert(canonRec.technicalRequirements.some(t => t.toLowerCase().includes('shell')), 'Technical requirements contain Shell');
    assert(canonRec.technicalRequirements.some(t => t.toLowerCase().includes('harness')), 'Technical requirements contain Harness');

    // Item 8: Performance Requirements
    assert(Array.isArray(canonRec.performanceRequirements) && canonRec.performanceRequirements.length === 6, 'Performance requirements contain exactly 6 verified items');
    assert(canonRec.performanceRequirements.includes('Shock absorption resistance'), 'Performance contains Shock absorption resistance');
    assert(canonRec.performanceRequirements.includes('Penetration resistance'), 'Performance contains Penetration resistance');

    // Item 9: Safety Requirements
    assert(Array.isArray(canonRec.safetyRequirements) && canonRec.safetyRequirements.length >= 6, 'Safety requirements present');
    assert(canonRec.safetyRequirements.some(s => s.toLowerCase().includes('mechanical impact')), 'Safety specifies mechanical impact protection');
    assert(canonRec.safetyRequirements.some(s => s.toLowerCase().includes('penetration')), 'Safety specifies penetration protection');

    // Item 10: Testing Requirements
    assert(Array.isArray(canonRec.testingRequirements) && canonRec.testingRequirements.length === 10, 'Testing requirements contain exactly 10 clauses (Clause 4 to 8.6)');
    assert(canonRec.testingRequirements.some(c => c.clause === 'Clause 4'), 'Testing includes Clause 4 Sizes');
    assert(canonRec.testingRequirements.some(c => c.clause === 'Clause 8.1'), 'Testing includes Clause 8.1 Shock absorption');
    assert(canonRec.testingRequirements.some(c => c.clause === 'Clause 8.6'), 'Testing includes Clause 8.6 Heat resistance');

    // Item 11 & 12 & 13: Related Standards (IS 7692, IS 9695, etc.)
    const relData = canonRec.relatedStandardsData;
    assert(relData && relData.testEquipment && relData.testEquipment[0].is_number === 'IS 7692', 'IS 7692 is categorized under Test Equipment Related');
    assert(relData && relData.sampling && relData.sampling[0].is_number === 'IS 9695', 'IS 9695 is categorized under Sampling Related');
    assert(relData && relData.relatedHelmetProducts && relData.relatedHelmetProducts.some(p => p.is_number === 'IS 2745'), 'IS 2745 included under Related Helmet Products');
    assert(relData && relData.relatedHelmetProducts && relData.relatedHelmetProducts.some(p => p.is_number === 'IS 4151'), 'IS 4151 included under Related Helmet Products');
    assert(relData && relData.relatedComponents && relData.relatedComponents.some(c => c.is_number === 'IS 9973'), 'IS 9973 included under Related Components / Visors');

    // Item 14, 15, 16: Non-fabrication of empty categories
    assert(canonRec.normativeNotice.includes('No separately verified normative reference'), 'Normative category explicitly states none verified');
    assert(canonRec.terminologyNotice.includes('No separately verified terminology'), 'Terminology category explicitly states none verified');
    assert(canonRec.installationNotice.includes('No separate installation standard'), 'Installation category explicitly states none verified');
    assert(canonRec.safetyStandardsNotice.includes('No separately linked safety standard'), 'Safety standards category explicitly states none verified');

    // Item 17 & 18: Version & Amendment source awareness
    const vStat = canonRec.versionStatus;
    assert(vStat.currentCatalogue.amendmentCount === 8, 'Current catalogue listing shows 8 amendments');
    assert(vStat.historicalProductManual.amendmentCount === 4, 'Historical Jan 2019 Product Manual preserved with 4 amendments');
    assert(vStat.reaffirmedYear === 2020, 'Reaffirmed year is 2020');

    // Item 19 & 20: Certification / QCO context
    const cert = canonRec.certification;
    assert(cert.qcoOrder.includes('Helmet Quality Control Order, 2023') || cert.qcoOrder.includes('Police Force'), 'QCO 2023 accurately titled');
    assert(cert.gazetteNotification === 'S.O. 4649(E)', 'Gazette notification is S.O. 4649(E)');
    assert(cert.scheme.includes('Scheme-I'), 'Scheme is Scheme-I / Standard Mark');
    assert(cert.manufacturerLicenseStatus.includes('No specific manufacturer licence is fabricated'), 'Manufacturer license status is NOT fabricated');

    // Item 21 & 22: Gap Detection
    const gap = canonRec.gapDetection;
    assert(gap && gap.hasGap === true, 'Gap detection is active');
    assert(gap.gapTitle === 'POTENTIAL REFERENCE GAP', 'Gap title is POTENTIAL REFERENCE GAP');
    assert(gap.gapStatus.includes('Human Verification Required'), 'Gap status requires Human Verification');
    assert(gap.gapDisclaimer.includes('NOT imply that the tender specification is invalid'), 'Gap disclaimer warns against calling tender invalid');
    assert(gap.potentialReferences.some(r => r.is_number === 'IS 7692'), 'Potential reference includes IS 7692');
    assert(gap.potentialReferences.some(r => r.is_number === 'IS 9695'), 'Potential reference includes IS 9695');

    // Item 23: Grounded AI Explanation
    assert(canonRec.explanation.whyRelevant.includes('IS 2925:1984'), 'AI explanation references IS 2925:1984');
    assert(canonRec.explanation.whyRelevant.includes('industrial safety helmets'), 'AI explanation references industrial safety helmets');

    // Item 24: Provenance
    assert(canonRec.sources.some(s => s.includes('BIS Product Manual')), 'Provenance includes BIS Product Manual');
    assert(canonRec.sources.some(s => s.includes('BIS e-Sale')), 'Provenance includes BIS e-Sale');
    assert(canonRec.sources.some(s => s.includes('S.O. 4649(E)')), 'Provenance includes QCO S.O. 4649(E)');

    // Item 25 & 26: No Confidence % and No Mock IDs in recommendation payload
    const payloadStr = JSON.stringify(canonData);
    assert(!payloadStr.includes('Confidence 54'), 'No misleading Confidence 54% in recommendation');
    assert(!payloadStr.includes('Confidence 95'), 'No misleading Confidence 95% in recommendation');
    assert(!payloadStr.includes('TEST-IS-2925-MOCK'), 'No TEST-IS-2925-MOCK in demo recommendation payload');
    assert(!payloadStr.includes('TEST-IS-4151-MOCK'), 'No TEST-IS-4151-MOCK in demo recommendation payload');

    // ---------------------------------------------------------
    // 3. PLAYWRIGHT MULTI-PAGE FLOW: HINDI WORKFLOW
    // ---------------------------------------------------------
    console.log('\n--- 3. BROWSER WORKFLOW: MULTILINGUAL HINDI INPUT ---');
    await page.goto(`${BASE_URL}/analysis.html`, { waitUntil: 'networkidle' });

    // Select natural language tab
    await page.click('#tab-natural-language-query');
    await page.selectOption('#nlLanguageSelect', 'hi');
    const inputVal = await page.inputValue('#inputNaturalLanguage');
    assert(inputVal.includes('हेलमेट') || inputVal.includes('श्रमिकों'), 'Hindi query auto-populated on Hindi language selection');

    // Continue to Processing
    await page.click('#continueBtn');
    await page.waitForURL('**/processing.html');
    assert(page.url().includes('processing.html'), 'Navigated to processing.html');

    // Wait for Review page
    await page.waitForURL('**/requirements.html', { timeout: 15000 });
    assert(page.url().includes('requirements.html'), 'Navigated to requirements.html');

    const reqTableText = await page.textContent('#requirementsViewMode');
    assert(reqTableText.includes('हिन्दी') || reqTableText.includes('Industrial Safety Helmet'), 'Requirement review renders Hindi language or helmet product');

    // Continue to Analyzing
    await page.click('#continueToAnalysisBtn');
    await page.waitForURL('**/analyzing.html');
    assert(page.url().includes('analyzing.html'), 'Navigated to analyzing.html');

    // Item 27: Processing states visible
    const statusTextEl = await page.waitForSelector('#pipelineStatusText', { state: 'visible' });
    const progressMsg = await statusTextEl.textContent();
    assert(progressMsg && progressMsg.length > 5, `Processing stage visibly displayed: "${progressMsg}"`);

    // Wait for Results page
    await page.waitForURL('**/results.html', { timeout: 15000 });
    assert(page.url().includes('results.html'), 'Navigated to results.html');

    const dashboardText = await page.textContent('#resultsDashboard');
    assert(dashboardText.includes('IS 2925:1984'), 'Results prominently display IS 2925:1984');
    assert(dashboardText.includes('PRIMARY RELEVANT STANDARD'), 'Displays PRIMARY RELEVANT STANDARD');
    assert(dashboardText.includes('TECHNICAL REQUIREMENTS'), 'Displays TECHNICAL REQUIREMENTS section');
    assert(dashboardText.includes('PERFORMANCE REQUIREMENTS'), 'Displays PERFORMANCE REQUIREMENTS section');
    assert(dashboardText.includes('SAFETY REQUIREMENTS'), 'Displays SAFETY REQUIREMENTS section');
    assert(dashboardText.includes('TESTING REQUIREMENTS (IS 2925)'), 'Displays TESTING REQUIREMENTS (IS 2925) section');
    assert(dashboardText.includes('RELATED / ALLIED STANDARDS'), 'Displays RELATED / ALLIED STANDARDS section');
    assert(dashboardText.includes('IS 7692'), 'Displays related standard IS 7692 (Headforms)');
    assert(dashboardText.includes('IS 9695'), 'Displays related standard IS 9695 (Sampling)');
    assert(dashboardText.includes('POTENTIAL REFERENCE GAP'), 'Displays POTENTIAL REFERENCE GAP card');
    assert(!dashboardText.includes('TEST-IS-2925-MOCK'), 'Zero mock IDs on results page');
    assert(!dashboardText.includes('Notice on Limitations:'), 'Notice on Limitations box removed from results page');
    assert(!dashboardText.includes('This prototype demonstration uses a curated standards record'), 'Prototype demonstration limitation notice removed from results page');

    // ---------------------------------------------------------
    // 4. PLAYWRIGHT MULTI-PAGE FLOW: TENDER PDF WORKFLOW
    // ---------------------------------------------------------
    console.log('\n--- 4. BROWSER WORKFLOW: TENDER PDF UPLOAD ---');
    await page.goto(`${BASE_URL}/analysis.html`, { waitUntil: 'networkidle' });
    await page.click('#tab-tender-pdf');
    await page.click('#loadDemoPdfBtn');
    await page.waitForSelector('#fileSelectedBox', { state: 'visible', timeout: 5000 });
    assert(await page.isVisible('#fileSelectedBox'), 'Demo tender PDF attached');

    await page.click('#continueBtn');
    await page.waitForURL('**/processing.html');
    await page.waitForURL('**/requirements.html', { timeout: 15000 });
    await page.click('#continueToAnalysisBtn');
    await page.waitForURL('**/analyzing.html');
    await page.waitForURL('**/results.html', { timeout: 15000 });

    const tenderResultText = await page.textContent('#resultsDashboard');
    assert(tenderResultText.includes('IS 2925:1984'), 'Tender PDF flow identifies IS 2925:1984');

    // ---------------------------------------------------------
    // 5. PDF REPORT VALIDATION (Items 28-37)
    // ---------------------------------------------------------
    console.log('\n--- 5. PDF PROCUREMENT REPORT VALIDATION ---');
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.click('#downloadPdfReportBtn')
    ]);

    const downloadStream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of downloadStream) chunks.push(chunk);
    const pdfBuf = Buffer.concat(chunks);
    const pdfDecoded = extractTextFromPdfBuffer(pdfBuf);

    assert(pdfBuf.slice(0, 5).toString('ascii') === '%PDF-', 'Downloaded PDF begins with valid %PDF- magic bytes');
    assert(pdfDecoded.includes('IS 2925:1984') || pdfDecoded.includes('IS 2925'), 'PDF contains primary standard IS 2925:1984');
    assert(pdfDecoded.includes('TECHNICAL REQUIREMENTS'), 'PDF contains TECHNICAL REQUIREMENTS section');
    assert(pdfDecoded.includes('PERFORMANCE') && pdfDecoded.includes('SAFETY'), 'PDF contains PERFORMANCE & SAFETY REQUIREMENTS section');
    assert(pdfDecoded.includes('TESTING REQUIREMENTS'), 'PDF contains TESTING REQUIREMENTS section');
    assert(pdfDecoded.includes('IS 7692') && pdfDecoded.includes('IS 9695'), 'PDF contains related standards IS 7692 and IS 9695');
    assert(pdfDecoded.includes('POTENTIAL GAPS') || pdfDecoded.includes('POTENTIAL REFERENCE GAP'), 'PDF contains POTENTIAL GAPS section');
    assert(pdfDecoded.includes('Human Verification Required'), 'PDF includes Human Verification Required notice');
    assert(pdfDecoded.includes('S.O. 4649(E)'), 'PDF contains Helmet QCO 2023 / S.O. 4649(E)');

    // Security & Data Leaks (Items 35-37)
    assert(!pdfDecoded.includes('AIzaSy'), 'Zero Gemini API keys in PDF report');
    assert(!pdfDecoded.includes('GEMINI_API_KEY'), 'Zero GEMINI_API_KEY tokens in PDF report');
    assert(!pdfDecoded.includes('DATABASE_URL'), 'Zero DATABASE_URL in PDF report');
    assert(!pdfDecoded.includes('TEST-IS-2925-MOCK'), 'Zero mock IDs in PDF report');
    assert(!pdfDecoded.includes('TEST-IS-4151-MOCK'), 'Zero mock relationship IDs in PDF report');

    // ---------------------------------------------------------
    // 6. RESPONSIVE VIEWPORT & ACCESSIBILITY (Items 38-41)
    // ---------------------------------------------------------
    console.log('\n--- 6. RESPONSIVE VIEWPORT & ACCESSIBILITY AUDIT ---');

    // Desktop: 1280 x 800
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(200);
    const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    assert(!desktopOverflow, 'Desktop viewport (1280x800) has zero horizontal overflow');

    // Mobile: 375 x 812
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(200);
    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    assert(!mobileOverflow, 'Mobile viewport (375x812) has zero horizontal overflow');

    // Accessibility
    const hasDownloadAria = await page.getAttribute('#downloadPdfReportBtn', 'aria-label');
    assert(hasDownloadAria && hasDownloadAria.length > 5, 'Download PDF button has descriptive aria-label');

    const toggleBtnAria = await page.getAttribute('#toggleDetailsBtn-1', 'aria-expanded');
    assert(toggleBtnAria === 'false' || toggleBtnAria === 'true', 'Toggle technical details button exposes aria-expanded');

    // Console Audit
    assert(consoleErrors.length === 0, `Zero critical console errors observed during entire run (errors: ${consoleErrors.join(', ') || 'none'})`);

    console.log('\n================================================================');
    console.log(`HELMET COMPLETE DEMO RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('Test execution error:', err);
    failedCount++;
  } finally {
    await browser.close();
  }

  process.exit(failedCount > 0 ? 1 : 0);
}

runCompleteHelmetDemoTests();
