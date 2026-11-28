// =================================================================
// NIRDESHAK - MULTI-STANDARD DETAILED INFORMATION SUITE
// Validates:
// 1. All recommended Indian Standards (Rank #1, #2, #3) have complete,
//    distinct, uncopied detailed standards information.
// 2. Technical, performance, safety, and testing requirements are distinct.
// 3. Related standards, version, QCO regulatory info, and RAG explanations
//    are specific to each recommended standard.
// 4. Interactive selection / "View Details" dynamically updates the
//    Standard Details panel for any selected recommendation.
// 5. PDF generation contains comprehensive details for every recommendation.
// =================================================================

const { chromium } = require('playwright');
const http = require('http');

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

function makeApiRequest(postData) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(postData);
    const req = http.request(
      'http://localhost:3000/api/recommendations/explain',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'X-Nirdeshak-Demo': 'true'
        }
      },
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function extractTextFromPdfBuffer(pdfBuf) {
  const zlib = require('zlib');
  const binary = pdfBuf.toString('binary');
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m;
  const allText = [];

  while ((m = streamRegex.exec(binary)) !== null) {
    let streamData = Buffer.from(m[1], 'binary');
    try {
      streamData = zlib.inflateSync(streamData);
    } catch (e) {}
    const streamStr = streamData.toString('binary');

    // Match TJ arrays
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

async function runMultiStandardDetailsTests() {
  console.log('================================================================');
  console.log('STARTING MULTI-STANDARD DETAILED INFORMATION VERIFICATION SUITE');
  console.log('================================================================\n');

  // ---------------------------------------------------------
  // 1. BACKEND API DETAILED DATA VERIFICATION
  // ---------------------------------------------------------
  console.log('--- 1. BACKEND API MULTI-STANDARD DETAILS ---');
  const apiRes = await makeApiRequest({
    query: 'Procurement of industrial safety helmets for construction workers. The helmets should provide protection against mechanical impact and falling objects and be suitable for industrial work environments.',
    limit: 3
  });

  assert(apiRes.status === 200, 'Recommendation API returned HTTP 200');
  assert(apiRes.body.success === true, 'API response success flag is true');
  const recs = apiRes.body.recommendations || [];
  assert(recs.length === 3, `API returned top 3 recommendations (actual: ${recs.length})`);

  const rec1 = recs.find(r => (r.rank === 1 || (r.scores && r.scores.rank === 1)));
  const rec2 = recs.find(r => (r.rank === 2 || (r.scores && r.scores.rank === 2)));
  const rec3 = recs.find(r => (r.rank === 3 || (r.scores && r.scores.rank === 3)));

  assert(!!rec1 && rec1.is_number === 'IS 2925:1984', 'Rank #1 is IS 2925:1984');
  assert(!!rec2 && rec2.is_number === 'IS 4151:2015', 'Rank #2 is IS 4151:2015');
  assert(!!rec3 && rec3.is_number === 'IS 2745:1983', 'Rank #3 is IS 2745:1983');

  // Verify Rank #1 has distinct technical details
  assert(Array.isArray(rec1.technicalRequirements) && rec1.technicalRequirements.length >= 5, 'Rank #1 has complete technical requirements array');
  assert(rec1.technicalRequirements.some(t => t.includes('Harness') || t.includes('Shell')), 'Rank #1 technical requirements include Shell and Harness');
  assert(Array.isArray(rec1.testingRequirements) && rec1.testingRequirements.some(t => (t.clause || String(t)).includes('8.1')), 'Rank #1 testing requirements include Clause 8.1');
  assert(Array.isArray(rec1.relatedStandards) && rec1.relatedStandards.some(r => (r.standardNumber || (r.standard && r.standard.is_number)).includes('IS 7692')), 'Rank #1 related standards include IS 7692');
  assert(rec1.explanation && rec1.explanation.whyRelevant.includes('industrial safety helmets'), 'Rank #1 explanation is specific to industrial safety helmets');

  // Verify Rank #2 has distinct technical details (IS 4151)
  assert(Array.isArray(rec2.technicalRequirements) && rec2.technicalRequirements.length >= 4, 'Rank #2 has complete technical requirements array');
  assert(rec2.technicalRequirements.some(t => t.toLowerCase().includes('motorcycle') || t.toLowerCase().includes('rider') || t.toLowerCase().includes('liner') || t.toLowerCase().includes('retention')), 'Rank #2 technical requirements specify motorcycle rider protective headgear');
  assert(Array.isArray(rec2.testingRequirements) && rec2.testingRequirements.some(t => JSON.stringify(t).toLowerCase().includes('impact') || JSON.stringify(t).toLowerCase().includes('retention') || JSON.stringify(t).toLowerCase().includes('rigidity')), 'Rank #2 testing requirements specify motorcycle impact/retention tests');
  assert(Array.isArray(rec2.relatedStandards) && rec2.relatedStandards.some(r => (r.standardNumber || (r.standard && r.standard.is_number)).includes('IS 9973')), 'Rank #2 related standards include IS 9973 (Visors)');
  assert(rec2.explanation && (rec2.explanation.whyRelevant.toLowerCase().includes('motorcycle') || (rec2.explanation.groundedAnalysis && rec2.explanation.groundedAnalysis.toLowerCase().includes('motorcycle'))), 'Rank #2 explanation is specific to motorcycle riders');

  // Verify Rank #3 has distinct technical details (IS 2745)
  assert(Array.isArray(rec3.technicalRequirements) && rec3.technicalRequirements.length >= 4, 'Rank #3 has complete technical requirements array');
  assert(rec3.technicalRequirements.some(t => t.toLowerCase().includes('firemen') || t.toLowerCase().includes('civil defence') || t.toLowerCase().includes('non-metal')), 'Rank #3 technical requirements specify firemen and civil defence personnel');
  assert(Array.isArray(rec3.testingRequirements) && rec3.testingRequirements.some(t => JSON.stringify(t).toLowerCase().includes('heat') || JSON.stringify(t).toLowerCase().includes('shock') || JSON.stringify(t).toLowerCase().includes('radiant') || JSON.stringify(t).toLowerCase().includes('electrical')), 'Rank #3 testing requirements specify fire/heat testing');
  assert(Array.isArray(rec3.relatedStandards) && rec3.relatedStandards.some(r => (r.standardNumber || (r.standard && r.standard.is_number)).includes('IS 9995')), 'Rank #3 related standards include IS 9995 (Visors for firemen)');
  assert(rec3.explanation && (rec3.explanation.whyRelevant.toLowerCase().includes('firemen') || rec3.explanation.whyRelevant.toLowerCase().includes('civil defence')), 'Rank #3 explanation is specific to firemen/civil defence');

  // Verify no data duplication across standards
  assert(rec1.title !== rec2.title, 'Rank #1 and Rank #2 have different titles');
  assert(rec2.title !== rec3.title, 'Rank #2 and Rank #3 have different titles');
  assert(rec1.explanation.whyRelevant !== rec2.explanation.whyRelevant, 'Rank #1 and Rank #2 have distinct RAG explanations');
  assert(rec2.explanation.whyRelevant !== rec3.explanation.whyRelevant, 'Rank #2 and Rank #3 have distinct RAG explanations');

  // ---------------------------------------------------------
  // 2. BROWSER UI DYNAMIC SELECTION & MULTI-STANDARD DISPLAY
  // ---------------------------------------------------------
  console.log('\n--- 2. BROWSER UI MULTI-STANDARD DYNAMIC DISPLAY ---');
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  } catch (e) {
    browser = await chromium.launch({ headless: true });
  }
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:3000/analysis.html', { waitUntil: 'networkidle' });
    await page.fill('#inputProductDescription', 'Procurement of industrial safety helmets for construction workers. The helmets should provide protection against mechanical impact and falling objects and be suitable for industrial work environments.');
    await page.click('#continueBtn');
    await page.waitForURL('**/processing.html');
    await page.waitForURL('**/requirements.html', { timeout: 15000 });
    await page.click('#continueToAnalysisBtn');
    await page.waitForURL('**/analyzing.html');
    await page.waitForURL('**/results.html', { timeout: 15000 });
    await page.waitForSelector('.recommendation-card', { timeout: 10000 });

    const cards = await page.$$('.recommendation-card');
    assert(cards.length === 3, `UI rendered 3 recommendation cards (actual: ${cards.length})`);

    // Verify initial detail panel displays Rank #1 (IS 2925:1984)
    let panelHeading = await page.textContent('#detailPanelHeading');
    assert(panelHeading.includes('IS 2925:1984'), 'Detail panel initially displays IS 2925:1984');
    let panelContent = await page.textContent('#standardDetailPanel');
    assert(panelContent.includes('Harness') && panelContent.includes('Shell'), 'Detail panel displays IS 2925 technical requirements');
    assert(panelContent.includes('IS 7692') && panelContent.includes('IS 9695'), 'Detail panel displays IS 2925 related standards');

    // Select Rank #2 by clicking its "View Details" button
    console.log('\n[Action] Clicking "View Details" on Rank #2 (IS 4151)...');
    await page.click('#viewDetailsBtn-2');
    await page.waitForTimeout(300);

    panelHeading = await page.textContent('#detailPanelHeading');
    assert(panelHeading.includes('IS 4151:2015'), 'Detail panel dynamically updated to IS 4151:2015');
    panelContent = await page.textContent('#standardDetailPanel');
    assert(panelContent.toLowerCase().includes('motorcycle') || panelContent.toLowerCase().includes('rider'), 'Detail panel displays IS 4151 motorcycle application and technical requirements');
    assert(panelContent.includes('IS 9973'), 'Detail panel displays IS 4151 related standard IS 9973');
    assert(!panelContent.includes('Clause 8.1 - Shock absorption resistance (Drop impact attenuation measuring transmitted force)'), 'Detail panel does NOT display IS 2925 Clause 8.1 text under IS 4151');

    // Select Rank #3 by clicking its "View Details" button
    console.log('\n[Action] Clicking "View Details" on Rank #3 (IS 2745)...');
    await page.click('#viewDetailsBtn-3');
    await page.waitForTimeout(300);

    panelHeading = await page.textContent('#detailPanelHeading');
    assert(panelHeading.includes('IS 2745:1983'), 'Detail panel dynamically updated to IS 2745:1983');
    panelContent = await page.textContent('#standardDetailPanel');
    assert(panelContent.toLowerCase().includes('firemen') || panelContent.toLowerCase().includes('civil defence'), 'Detail panel displays IS 2745 firemen/civil defence application and requirements');
    assert(panelContent.includes('IS 9995'), 'Detail panel displays IS 2745 related standard IS 9995');
    assert(!panelContent.includes('Clause 8.1 - Shock absorption resistance (Drop impact attenuation measuring transmitted force)'), 'Detail panel does NOT display IS 2925 Clause 8.1 text under IS 2745');

    // Switch back to Rank #1 using the top tab switcher in the detail panel
    console.log('\n[Action] Clicking Rank #1 top switcher tab in detail panel...');
    await page.click('#detailTabBtn-1');
    await page.waitForTimeout(300);

    panelHeading = await page.textContent('#detailPanelHeading');
    assert(panelHeading.includes('IS 2925:1984'), 'Detail panel returned to IS 2925:1984 via tab switcher');

    // ---------------------------------------------------------
    // 3. PDF REPORT MULTI-STANDARD VERIFICATION
    // ---------------------------------------------------------
    console.log('\n--- 3. PDF REPORT MULTI-STANDARD CONTENT ---');
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.click('#downloadPdfReportBtn')
    ]);

    const downloadStream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of downloadStream) chunks.push(chunk);
    const pdfBuf = Buffer.concat(chunks);
    const pdfDecoded = extractTextFromPdfBuffer(pdfBuf);

    assert(pdfDecoded.includes('IS 2925:1984') || pdfDecoded.includes('IS 2925'), 'PDF includes Rank #1 (IS 2925)');
    assert(pdfDecoded.includes('IS 4151:2015') || pdfDecoded.includes('IS 4151'), 'PDF includes Rank #2 (IS 4151)');
    assert(pdfDecoded.includes('IS 2745:1983') || pdfDecoded.includes('IS 2745'), 'PDF includes Rank #3 (IS 2745)');
    assert(pdfDecoded.includes('IS 9973'), 'PDF includes IS 4151 related standard IS 9973');
    assert(pdfDecoded.includes('IS 9995'), 'PDF includes IS 2745 related standard IS 9995');

  } finally {
    await browser.close();
  }

  // ---------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------
  console.log('\n================================================================');
  console.log(`MULTI-STANDARD DETAILS SUITE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runMultiStandardDetailsTests().catch(err => {
  console.error('Fatal error running multi-standard suite:', err);
  process.exit(1);
});
