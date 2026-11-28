// =========================================================
// Nirdeshak Step 13 — PDF Report Generation Test Suite
// Verifies 20 comprehensive requirements using Playwright & Backend Unit Tests
// =========================================================

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const {
  validateReportPayload,
  generatePdfReportBuffer,
  sanitizeReportFilename,
  formatScorePercent,
  formatStatusLabel
} = require('./pdfReport');

/**
 * Extracts and decodes text streams from a PDF binary buffer.
 * Decompresses zlib streams (if any) and converts hex character codes (<hex>) to UTF-8.
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

async function runStep13Tests() {
  console.log('====================================================');
  console.log('STARTING NIRDESHAK STEP 13: PDF REPORT GENERATION TESTS');
  console.log('====================================================\n');

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

  // Sample enriched recommendation data for testing
  const sampleReportData = {
    query: 'Industrial safety helmet for construction',
    originalQuery: 'Supply of industrial safety helmets for construction workers at site',
    count: 2,
    recommendations: [
      {
        standardId: 1,
        is_number: 'TEST-IS-2925-MOCK',
        title: '[DEVELOPMENT TEST RECORD] Industrial Safety Helmets Specification (Synthetic Verification)',
        scores: {
          semantic: 0.681,
          text: 0.8,
          scopeApplication: 0.4,
          structured: 0.5,
          final: 0.658,
          rank: 1
        },
        versionStatus: {
          statusCategory: 'current',
          statusValue: 'active',
          hasAmendments: true,
          amendmentInfo: ['Amendment 1'],
          version: 'TEST-REV-2026',
          publicationYear: 2026,
          summary: 'Database status indicates standard is active.'
        },
        certification: {
          hasCertificationInfo: true,
          scheme: 'Mock ISI Scheme',
          requirementExplicit: true,
          requirementValue: 'Mandatory in synthetic test spec',
          source: 'DEVELOPMENT_TEST_DATA',
          dataContext: 'development_test'
        },
        relatedStandards: [
          {
            relationshipId: 1,
            direction: 'outgoing',
            relationshipType: 'testing',
            standard: {
              id: 2,
              is_number: 'TEST-IS-4151-MOCK',
              title: '[DEVELOPMENT TEST RECORD] Protective Helmets Testing Methods',
              category: 'Personal Safety'
            }
          }
        ],
        explanation: {
          whyRelevant: 'Specifies industrial safety helmets designed to absorb mechanical impact in construction environments.',
          evidence: [
            'Relevance score: 65.8%',
            'Scope matches industrial head protection requirements'
          ]
        },
        source: 'DEVELOPMENT_TEST_DATA',
        dataContext: 'development_test'
      },
      {
        standardId: 2,
        is_number: 'TEST-IS-4151-MOCK',
        title: '[DEVELOPMENT TEST RECORD] Protective Helmets Testing Methods (Synthetic Verification)',
        scores: {
          semantic: 0.56,
          text: 0.4,
          scopeApplication: 0.3,
          structured: 0.2,
          final: 0.46,
          rank: 2
        },
        versionStatus: {
          statusCategory: 'current',
          statusValue: 'active',
          hasAmendments: false,
          version: 'TEST-REV-2026',
          publicationYear: 2026
        },
        certification: {
          hasCertificationInfo: false,
          scheme: null,
          requirementExplicit: false
        },
        relatedStandards: [],
        explanation: {
          whyRelevant: 'Prescribes laboratory testing methods for protective helmets referenced by TEST-IS-2925-MOCK.',
          evidence: ['Testing method relationship to TEST-IS-2925-MOCK']
        },
        source: 'DEVELOPMENT_TEST_DATA',
        dataContext: 'development_test'
      }
    ],
    summary: 'Retrieved 2 standards matching safety helmets and related testing procedures.',
    limitations: ['Data context is development_test (synthetic test records).'],
    explanationGenerated: true,
    extractedRequirements: {
      product_name: 'Industrial Safety Helmet',
      product_category: 'Personal Protective Equipment',
      application: 'Construction head protection',
      technical_requirements: ['Impact attenuation up to 50J', 'Adjustable headband'],
      safety_requirements: ['Electrical insulation up to 440V']
    },
    generatedAt: '2026-09-27T00:30:00.000Z'
  };

  // ----------------------------------------------------
  // TEST 1: Backend Module Exports & Functions
  // ----------------------------------------------------
  console.log('--- PART 1: MODULE EXPORTS & VALIDATION ---');
  assert(typeof validateReportPayload === 'function', 'validateReportPayload is exported');
  assert(typeof generatePdfReportBuffer === 'function', 'generatePdfReportBuffer is exported');
  assert(typeof sanitizeReportFilename === 'function', 'sanitizeReportFilename is exported');
  assert(typeof formatScorePercent === 'function', 'formatScorePercent is exported');
  assert(typeof formatStatusLabel === 'function', 'formatStatusLabel is exported');

  // ----------------------------------------------------
  // TEST 2: Payload Validation (Valid & Invalid Cases)
  // ----------------------------------------------------
  console.log('\n--- PART 2: PAYLOAD VALIDATION ---');
  const validRes = validateReportPayload(sampleReportData);
  assert(validRes.isValid === true, 'Valid payload passes validation');
  assert(validRes.sanitized.count === 2, 'Sanitized payload preserves count');

  const emptyRes = validateReportPayload({});
  assert(emptyRes.isValid === false, 'Empty payload is rejected with isValid: false');
  assert(emptyRes.error.includes('query'), 'Error identifies missing query');

  const nullRes = validateReportPayload(null);
  assert(nullRes.isValid === false, 'Null payload is rejected safely');

  // ----------------------------------------------------
  // TEST 3: Safe Filename Sanitization
  // ----------------------------------------------------
  console.log('\n--- PART 3: FILENAME SANITIZATION & SECURITY ---');
  assert(
    sanitizeReportFilename('Safety Helmet #123 / Draft') === 'nirdeshak-report-safety-helmet-123-draft.pdf',
    'Sanitizes special characters into clean hyphenated slug'
  );
  assert(
    sanitizeReportFilename('../../etc/passwd') === 'nirdeshak-report-etc-passwd.pdf',
    'Completely neutralizes directory traversal sequences'
  );
  assert(
    sanitizeReportFilename('') === 'nirdeshak-procurement-report.pdf',
    'Empty query defaults to safe fallback filename'
  );
  assert(
    sanitizeReportFilename(null) === 'nirdeshak-procurement-report.pdf',
    'Null query defaults to safe fallback filename'
  );

  // ----------------------------------------------------
  // TEST 4: Score Formatting Formula (finalScore * 100)
  // ----------------------------------------------------
  console.log('\n--- PART 4: RELEVANCE SCORE PERCENTAGE FORMULA ---');
  assert(formatScorePercent(0.717) === '71.7%', '0.717 formats as "71.7%"');
  assert(formatScorePercent(0.658) === '65.8%', '0.658 formats as "65.8%"');
  assert(formatScorePercent(0) === '0.0%', '0 formats as "0.0%"');
  assert(formatScorePercent(1.0) === '100.0%', '1.0 formats as "100.0%"');

  // ----------------------------------------------------
  // TEST 5: Direct PDF Buffer Generation
  // ----------------------------------------------------
  console.log('\n--- PART 5: DIRECT PDF BUFFER GENERATION ---');
  const pdfBuffer = await generatePdfReportBuffer(sampleReportData);
  assert(Buffer.isBuffer(pdfBuffer), 'generatePdfReportBuffer returns a Node.js Buffer');
  assert(pdfBuffer.length > 3000, `Generated PDF buffer is non-trivial size: ${pdfBuffer.length} bytes`);

  // ----------------------------------------------------
  // TEST 6: PDF Binary Header Magic Bytes (%PDF-)
  // ----------------------------------------------------
  console.log('\n--- PART 6: PDF BINARY INTEGRITY ---');
  const header = pdfBuffer.slice(0, 5).toString('utf8');
  assert(header === '%PDF-', `Binary begins with valid PDF magic bytes "%PDF-" (actual: "${header}")`);

  // Extract decoded text from PDF stream
  const pdfText = extractTextFromPdf(pdfBuffer);

  // ----------------------------------------------------
  // TEST 7: Header & Prototype Indicator
  // ----------------------------------------------------
  console.log('\n--- PART 7: HEADER & PROVENANCE TEXT ---');
  assert(pdfText.includes('NIRDESHAK'), 'PDF contains "NIRDESHAK" branding');
  assert(
    pdfText.includes('Indian Standards Recommendation Engine') || pdfText.includes('Indian Standards'),
    'PDF contains engine subtitle'
  );
  assert(
    pdfText.includes('Evaluation Prototype') || pdfText.includes('Development Data'),
    'PDF clearly states prototype/development indicator'
  );

  // ----------------------------------------------------
  // TEST 8: Query & Requirement Summary
  // ----------------------------------------------------
  console.log('\n--- PART 8: QUERY & REQUIREMENTS CONTENT ---');
  assert(
    pdfText.includes('Supply of industrial safety helmets') || pdfText.includes('safety helmets'),
    'PDF includes user requirement text'
  );
  assert(pdfText.includes('Industrial Safety Helmet'), 'PDF includes extracted product name');

  // ----------------------------------------------------
  // TEST 9: Executive Recommendation Summary
  // ----------------------------------------------------
  console.log('\n--- PART 9: EXECUTIVE SUMMARY METRICS ---');
  assert(pdfText.includes('STANDARDS MATCHED'), 'PDF contains "STANDARDS MATCHED" metric box');
  assert(pdfText.includes('TOP RELEVANCE SCORE'), 'PDF contains "TOP RELEVANCE SCORE" metric box');
  assert(pdfText.includes('VERSION STATUS'), 'PDF contains "VERSION STATUS" metric box');
  assert(pdfText.includes('CERTIFICATION STATUS'), 'PDF contains "CERTIFICATION STATUS" metric box');
  assert(!pdfText.includes('legal compliance score'), 'Does NOT claim to be a legal compliance score');
  assert(!pdfText.includes('probability of compliance'), 'Does NOT claim to be probability of compliance');

  // ----------------------------------------------------
  // TEST 10: Recommended Standards & Component Breakdown
  // ----------------------------------------------------
  console.log('\n--- PART 10: RECOMMENDED STANDARDS & COMPONENT SCORES ---');
  assert(pdfText.includes('TEST-IS-2925-MOCK'), 'PDF includes standard TEST-IS-2925-MOCK');
  assert(pdfText.includes('TEST-IS-4151-MOCK'), 'PDF includes standard TEST-IS-4151-MOCK');
  assert(pdfText.includes('Relevance Score: 65.8%'), 'PDF contains formatted final relevance score');
  assert(pdfText.includes('Semantic Similarity: 68.1%'), 'PDF contains semantic component score');
  assert(pdfText.includes('Keyword Match: 80.0%'), 'PDF contains keyword text component score');
  assert(pdfText.includes('Scope & Application: 40.0%'), 'PDF contains scope & application component score');

  // ----------------------------------------------------
  // TEST 11: Version & Neutral Terminology
  // ----------------------------------------------------
  console.log('\n--- PART 11: VERSION STATUS & AMENDMENT INFO ---');
  assert(pdfText.includes('DATABASE STATUS:'), 'PDF uses neutral label "DATABASE STATUS"');
  assert(pdfText.includes('TEST-REV-2026'), 'PDF contains standard version TEST-REV-2026');
  assert(!pdfText.includes('Legally valid standard'), 'Does NOT make unsupported legal claims');

  // ----------------------------------------------------
  // TEST 12: Certification & Development Context
  // ----------------------------------------------------
  console.log('\n--- PART 12: CERTIFICATION STATUS & CONTEXT ---');
  assert(pdfText.includes('CERTIFICATION SCHEME:'), 'PDF contains certification scheme field');
  assert(pdfText.includes('Mock ISI Scheme'), 'PDF includes detected scheme name');
  assert(pdfText.includes('Development/Test Data'), 'Clearly labels synthetic test context as Development/Test Data');

  // ----------------------------------------------------
  // TEST 13: Related Standards & Notice
  // ----------------------------------------------------
  console.log('\n--- PART 13: RELATED STANDARDS & NOTICE ---');
  assert(pdfText.includes('Non-Mandatory Technical Reference'), 'PDF labels related standards as non-mandatory reference');
  assert(pdfText.includes('Type: testing'), 'PDF includes relationship type');

  // ----------------------------------------------------
  // TEST 14: AI Explanation & Grounding
  // ----------------------------------------------------
  console.log('\n--- PART 14: AI EXPLANATION & GROUNDING ---');
  assert(pdfText.includes('AI-Generated Grounded Explanation:'), 'PDF labels AI explanation section accurately');
  assert(pdfText.includes('Retrieved Evidence Signals:'), 'PDF includes retrieved evidence section');

  // ----------------------------------------------------
  // TEST 15: Regulatory Notice & Disclaimers
  // ----------------------------------------------------
  console.log('\n--- PART 15: STATUTORY & REGULATORY DISCLAIMERS ---');
  assert(pdfText.includes('REGULATORY & STATUTORY DISCLAIMER'), 'PDF includes regulatory disclaimer heading');
  assert(pdfText.includes('Quality Control Orders'), 'PDF references Quality Control Orders (QCOs)');
  assert(pdfText.includes('Bureau of Indian Standards (BIS)'), 'PDF references official BIS authority');

  // ----------------------------------------------------
  // TEST 16: Zero Raw Vector & API Key Leaks in PDF
  // ----------------------------------------------------
  console.log('\n--- PART 16: VECTOR & CREDENTIAL LEAK PROTECTION ---');
  assert(!pdfText.includes('AIzaSy'), 'Zero Gemini API keys leaked in PDF');
  assert(!pdfText.includes('GEMINI_API_KEY'), 'Zero GEMINI_API_KEY tokens in PDF');
  assert(!pdfText.includes('postgres://'), 'Zero DB connection strings in PDF');
  assert(!/\[\s*-?0\.\d{3,},\s*-?0\.\d{3,}/.test(pdfText), 'Zero raw vector arrays leaked in PDF');

  // ----------------------------------------------------
  // TEST 17: Empty State PDF Report Handling
  // ----------------------------------------------------
  console.log('\n--- PART 17: EMPTY STATE REPORT GENERATION ---');
  const emptyPdfBuffer = await generatePdfReportBuffer({
    query: 'Unknown product with zero matches',
    recommendations: [],
    count: 0
  });
  assert(Buffer.isBuffer(emptyPdfBuffer) && emptyPdfBuffer.length > 2000, 'Empty recommendations report generates clean PDF buffer');
  const emptyText = extractTextFromPdf(emptyPdfBuffer);
  assert(
    emptyText.includes('No matching Indian Standards were retrieved'),
    'Empty state PDF explains no matching standards found'
  );

  // ----------------------------------------------------
  // TEST 18: HTTP POST /api/reports/pdf Endpoint
  // ----------------------------------------------------
  console.log('\n--- PART 18: LIVE HTTP ENDPOINT VERIFICATION ---');
  const httpRes = await fetch('http://localhost:3000/api/reports/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sampleReportData)
  });
  assert(httpRes.status === 200, `POST /api/reports/pdf returns HTTP 200 (actual: ${httpRes.status})`);
  assert(
    httpRes.headers.get('content-type').includes('application/pdf'),
    'Content-Type is application/pdf'
  );
  const disposition = httpRes.headers.get('content-disposition') || '';
  assert(
    disposition.includes('attachment') && disposition.includes('.pdf'),
    `Content-Disposition is attachment with .pdf filename: "${disposition}"`
  );

  const httpEmptyRes = await fetch('http://localhost:3000/api/reports/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert(httpEmptyRes.status === 400, 'Empty body returns HTTP 400');

  // ----------------------------------------------------
  // TEST 19 & 20: Playwright Browser UI & Download Trigger
  // ----------------------------------------------------
  console.log('\n--- PART 19 & 20: PLAYWRIGHT BROWSER UI VERIFICATION ---');
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
    await page.goto('http://localhost:3000/classic.html', { waitUntil: 'networkidle', timeout: 15000 });

    // Verify report.js is exposed on window
    const reportObjExists = await page.evaluate(() => {
      return (
        typeof window.NirdeshakReport !== 'undefined' &&
        typeof window.NirdeshakReport.downloadPdfReport === 'function' &&
        typeof window.NirdeshakReport.setReportData === 'function' &&
        typeof window.NirdeshakReport.getReportData === 'function'
      );
    });
    assert(reportObjExists, 'report.js functions successfully exposed on window.NirdeshakReport');

    // Run query to populate dashboard and report cache
    await page.click('#tab-product-description');
    await page.fill('#inputProductDescription', 'Industrial safety helmets for construction workers');
    await page.click('#analyseBtn');

    await page.waitForSelector('#dashboardContent', { state: 'visible', timeout: 25000 });

    // Verify Download PDF Report button is visible
    const downloadBtnVisible = await page.isVisible('#downloadPdfReportBtn');
    assert(downloadBtnVisible, '"Download PDF Report" button is visible in dashboard header actions');

    // Trigger PDF download via browser click and catch download event
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    await page.click('#downloadPdfReportBtn');
    const download = await downloadPromise;

    const suggestedFilename = download.suggestedFilename();
    assert(suggestedFilename.endsWith('.pdf'), `Download triggered with PDF filename: "${suggestedFilename}"`);

    // Verify downloaded file stream begins with %PDF-
    const downloadStream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of downloadStream) {
      chunks.push(chunk);
    }
    const downloadedBuffer = Buffer.concat(chunks);
    assert(
      downloadedBuffer.slice(0, 5).toString('utf8') === '%PDF-',
      'Downloaded file is valid binary PDF starting with "%PDF-"'
    );

    // Verify no JS errors
    assert(consoleErrors.length === 0, `Zero JS console errors observed in browser (errors: ${consoleErrors.join(', ') || 'none'})`);

  } finally {
    await browser.close();
  }

  console.log('\n====================================================');
  console.log(`STEP 13 TESTS SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStep13Tests().catch(err => {
  console.error('Fatal error during Step 13 tests:', err);
  process.exit(1);
});
