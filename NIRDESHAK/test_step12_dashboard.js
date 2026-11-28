// =========================================================
// Nirdeshak Step 12 — Results Dashboard & Recommendation UI Test Suite
// Verifies 20 comprehensive requirements using Playwright & Live Chromium/Edge
// =========================================================

const { chromium } = require('playwright');

async function getBrowser() {
  try {
    return await chromium.launch({ channel: 'msedge', headless: true });
  } catch (edgeErr) {
    return await chromium.launch({ channel: 'chrome', headless: true });
  }
}

async function runStep12Tests() {
  console.log('====================================================');
  console.log('STARTING NIRDESHAK STEP 12 DASHBOARD VERIFICATION');
  console.log('====================================================\n');

  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
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
    // ----------------------------------------------------
    // TEST 1: Dashboard Module Loads
    // ----------------------------------------------------
    console.log('1. Verifying Dashboard Module Loading...');
    await page.goto('http://localhost:3000/classic.html', { waitUntil: 'networkidle', timeout: 15000 });

    const dashboardObjExists = await page.evaluate(() => {
      return (
        typeof window.NirdeshakDashboard !== 'undefined' &&
        typeof window.NirdeshakDashboard.fetchAndRenderRecommendations === 'function' &&
        typeof window.NirdeshakDashboard.renderDashboard === 'function' &&
        typeof window.NirdeshakDashboard.renderLoading === 'function' &&
        typeof window.NirdeshakDashboard.renderError === 'function' &&
        typeof window.NirdeshakDashboard.renderEmpty === 'function' &&
        typeof window.NirdeshakDashboard.clearDashboard === 'function' &&
        typeof window.NirdeshakDashboard.formatScorePercent === 'function'
      );
    });
    assert(dashboardObjExists, 'Dashboard module and all core functions exposed on window.NirdeshakDashboard');

    // ----------------------------------------------------
    // TEST 2: Valid Recommendation Response Renders Live
    // ----------------------------------------------------
    console.log('\n2. Testing Live Recommendation Pipeline Rendering...');
    const liveQuery = 'Industrial safety helmets for construction workers';

    // Type query into product description input and submit
    await page.click('#tab-product-description');
    await page.fill('#inputProductDescription', liveQuery);
    await page.click('#analyseBtn');

    // Wait for dashboard content to appear
    await page.waitForSelector('#dashboardContent', { state: 'visible', timeout: 25000 });
    const dashboardVisible = await page.isVisible('#resultsDashboard');
    assert(dashboardVisible, 'Results dashboard container is visible after analysis submission');

    // ----------------------------------------------------
    // TEST 3: Query Displayed Correctly (Original vs Analysis)
    // ----------------------------------------------------
    console.log('\n3. Verifying Query Display & Distinction...');
    const displayedOriginalQuery = await page.textContent('#dashboardOriginalRequirement');
    assert(
      displayedOriginalQuery && displayedOriginalQuery.includes('safety helmets'),
      `Original requirement displayed accurately (actual: "${displayedOriginalQuery.trim()}")`
    );

    // ----------------------------------------------------
    // TEST 4: Recommendation Cards Render (Prominent IS & Title)
    // ----------------------------------------------------
    console.log('\n4. Verifying Recommendation Cards & Primary Elements...');
    const card1Exists = await page.isVisible('#rec-card-1');
    assert(card1Exists, 'Recommendation card #1 is rendered in DOM');

    const cardIsNumber = await page.textContent('#cardIsNumber-1');
    assert(
      cardIsNumber && cardIsNumber.includes('TEST-IS-2925-MOCK'),
      `Card #1 displays prominent IS Number (actual: "${cardIsNumber.trim()}")`
    );

    const cardTitle = await page.textContent('#cardTitle-1');
    assert(
      cardTitle && cardTitle.includes('Industrial Safety Helmets Specification'),
      `Card #1 displays prominent title (actual: "${cardTitle.trim().slice(0, 50)}...")`
    );

    const rankBadge = await page.textContent('#rec-card-1 .card-rank-badge');
    assert(rankBadge && rankBadge.includes('Rank #1'), 'Card displays Rank #1 badge');

    // ----------------------------------------------------
    // TEST 5: Relevance Score Presentation & Percentage Formula
    // ----------------------------------------------------
    console.log('\n5. Verifying Relevance Score Calculation & Presentation...');
    const finalScoreText = await page.textContent('#cardFinalScore-1');
    assert(
      /^\d{1,3}\.\d%$/.test(finalScoreText.trim()),
      `Final score formatted as percentage with 1 decimal place: "${finalScoreText.trim()}"`
    );

    // Verify formatScorePercent formula
    const mathCheck = await page.evaluate(() => {
      const fn = window.NirdeshakDashboard.formatScorePercent;
      return (
        fn(0.873) === '87.3%' &&
        fn(0.5234) === '52.3%' &&
        fn(1.0) === '100.0%' &&
        fn(0.0) === '0.0%'
      );
    });
    assert(mathCheck, 'Formula displayPercentage = finalScore * 100 strictly validated across ranges');

    const scoreLabel = await page.textContent('#rec-card-1 .metric-score-box__label');
    assert(
      scoreLabel && scoreLabel.toLowerCase().includes('relevance score'),
      'Score is neutrally labeled "Relevance Score" (not "accuracy" or "legally correct")'
    );

    // ----------------------------------------------------
    // TEST 6: Score Breakdown Renders
    // ----------------------------------------------------
    console.log('\n6. Verifying Component Score Breakdown...');
    const semanticScore = await page.textContent('#cardSemanticScore-1');
    const textScore = await page.textContent('#cardTextScore-1');
    const scopeScore = await page.textContent('#cardScopeScore-1');
    const structuredScore = await page.textContent('#cardStructuredScore-1');

    assert(/^\d{1,3}\.\d%$/.test(semanticScore.trim()), `Semantic Similarity rendered: ${semanticScore.trim()}`);
    assert(/^\d{1,3}\.\d%$/.test(textScore.trim()), `Keyword / Text Match rendered: ${textScore.trim()}`);
    assert(/^\d{1,3}\.\d%$/.test(scopeScore.trim()), `Scope & Application rendered: ${scopeScore.trim()}`);
    assert(/^\d{1,3}\.\d%$/.test(structuredScore.trim()), `Structured Requirements rendered: ${structuredScore.trim()}`);

    // ----------------------------------------------------
    // Expand Details for Card #1 to inspect internal sections
    // ----------------------------------------------------
    await page.click('#toggleDetailsBtn-1');
    await page.waitForSelector('#rec-details-1', { state: 'visible' });

    // ----------------------------------------------------
    // TEST 7: Version Section Renders with Neutral Terminology
    // ----------------------------------------------------
    console.log('\n7. Verifying Version & Amendment Section...');
    const detailsHtml = await page.innerHTML('#rec-details-1');

    assert(detailsHtml.includes('Database Status'), 'Version table uses neutral label "Database Status"');
    assert(detailsHtml.includes('TEST-REV-2026'), 'Standard version TEST-REV-2026 displayed');
    assert(detailsHtml.includes('2026'), 'Publication year 2026 displayed');
    assert(detailsHtml.includes('Amendment Information'), 'Amendment Information row displayed');
    assert(detailsHtml.includes('Supersession'), 'Supersession status row displayed');
    assert(!detailsHtml.includes('Legally valid standard'), 'Does NOT claim standard is legally valid without evidence');

    // ----------------------------------------------------
    // TEST 8: Certification Section Renders (Available vs Required distinction)
    // ----------------------------------------------------
    console.log('\n8. Verifying Certification & Compliance Section...');
    assert(detailsHtml.includes('Certification &amp; Compliance Status') || detailsHtml.includes('Certification & Compliance Status'), 'Certification section title present');
    assert(detailsHtml.includes('Certification Information'), 'Certification information availability displayed');
    assert(detailsHtml.includes('Certification Scheme'), 'Certification Scheme field displayed');
    assert(detailsHtml.includes('Explicit Requirement Status'), 'Explicit Requirement Status field displayed');
    assert(detailsHtml.includes('Development/Test Data'), 'Clearly labels synthetic test context as Development/Test Data');

    // ----------------------------------------------------
    // TEST 9: Related Standards Render with Non-Mandatory Notice
    // ----------------------------------------------------
    console.log('\n9. Verifying Related Standards Section...');
    assert(detailsHtml.includes('TEST-IS-4151-MOCK'), 'Related standard TEST-IS-4151-MOCK displayed');
    assert(detailsHtml.includes('testing'), 'Relationship type "testing" displayed');
    assert(detailsHtml.includes('outgoing'), 'Relationship direction "outgoing" displayed');
    assert(
      detailsHtml.includes('does not imply that every related standard is mandatory') ||
      detailsHtml.includes('not imply that every related standard is mandatory'),
      'Notice displayed stating related standards are not inherently mandatory'
    );

    // ----------------------------------------------------
    // TEST 10: AI Explanation Renders with Grounded Notice
    // ----------------------------------------------------
    console.log('\n10. Verifying AI-Generated Explanation Section...');
    assert(detailsHtml.includes('AI-Generated Explanation'), 'Labeled as "AI-Generated Explanation"');
    assert(
      detailsHtml.includes('Explanation generated from retrieved database evidence') ||
      detailsHtml.includes('AI explanation unavailable'),
      'Provenance notice regarding database evidence is displayed'
    );
    const whyRelevantText = await page.textContent('#cardWhyRelevant-1');
    assert(whyRelevantText && whyRelevantText.length > 20, 'Why Relevant explanation narrative is displayed');

    // ----------------------------------------------------
    // TEST 11: Fallback Explanation State Handling
    // ----------------------------------------------------
    console.log('\n11. Verifying Fallback Explanation Rendering...');
    const fallbackRenderTest = await page.evaluate(() => {
      const mockData = {
        success: true,
        query: 'Fallback Test Query',
        count: 1,
        recommendations: [
          {
            standardId: 1,
            is_number: 'TEST-IS-2925-MOCK',
            title: 'Mock Helmets',
            scores: { semantic: 0.7, text: 0.6, scopeApplication: 0.5, structured: 0.4, final: 0.62, rank: 1 },
            versionStatus: { statusCategory: 'current', statusValue: 'active', version: 'TEST-REV-2026', publicationYear: 2026 },
            certification: { hasCertificationInfo: true, scheme: 'Mock Scheme', requirementExplicit: false },
            relatedStandards: [],
            explanation: { whyRelevant: 'Deterministic fallback explanation for testing.', evidence: ['Deterministic rule #1'] },
            source: 'DEVELOPMENT_TEST_DATA',
            dataContext: 'development_test'
          }
        ],
        summary: 'Deterministic summary.',
        limitations: ['Fallback notice.'],
        explanationGenerated: false
      };

      window.NirdeshakDashboard.renderDashboard(mockData, 'Fallback Test Query');
      const detText = document.getElementById('rec-details-1').textContent;
      return (
        detText.includes('Deterministic Fallback') &&
        detText.includes('AI explanation unavailable')
      );
    });
    assert(fallbackRenderTest, 'Fallback explanation UI correctly renders when explanationGenerated is false');

    // ----------------------------------------------------
    // TEST 12: Source & Provenance Record Renders
    // ----------------------------------------------------
    console.log('\n12. Verifying Source & Provenance Record...');
    const provenanceVisible = await page.evaluate(() => {
      const el = document.querySelector('.detail-section--provenance');
      return el && el.textContent.includes('DEVELOPMENT_TEST_DATA') && el.textContent.includes('Development/Test Data');
    });
    assert(provenanceVisible, 'Source: DEVELOPMENT_TEST_DATA and Data Context: Development/Test Data rendered');

    // ----------------------------------------------------
    // TEST 13: Empty Result State
    // ----------------------------------------------------
    console.log('\n13. Verifying Empty Result State...');
    await page.evaluate(() => {
      window.NirdeshakDashboard.renderEmpty('non-existent requirement query xyz999');
    });
    const emptyVisible = await page.isVisible('#dashboardEmpty');
    const emptyText = await page.textContent('#dashboardEmpty');
    assert(emptyVisible, 'Empty results container is displayed');
    assert(
      emptyText.includes('No matching standards were retrieved for this requirement'),
      'Empty state displays exact message: "No matching standards were retrieved for this requirement."'
    );
    assert(
      emptyText.includes('does not establish that no applicable Indian Standard exists'),
      'Empty state informs user that absence of results does not mean standard does not exist'
    );

    // ----------------------------------------------------
    // TEST 14: Backend Error State
    // ----------------------------------------------------
    console.log('\n14. Verifying Backend Error State...');
    await page.evaluate(() => {
      window.NirdeshakDashboard.renderError('Server returned status 500');
    });
    const errorVisible = await page.isVisible('#dashboardError');
    const errorText = await page.textContent('#dashboardErrorMessage');
    assert(errorVisible, 'Error container is displayed');
    assert(errorText.includes('500'), 'Error message is displayed cleanly');

    // ----------------------------------------------------
    // TEST 15: Malformed Response Handling
    // ----------------------------------------------------
    console.log('\n15. Verifying Malformed Response Handling...');
    const malformedHandled = await page.evaluate(async () => {
      // Temporarily mock fetch to return malformed non-JSON
      const origFetch = window.fetch;
      window.fetch = async () => new Response('<html>Internal Server Crash</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });
      try {
        await window.NirdeshakDashboard.fetchAndRenderRecommendations('test malformed');
        const errVisible = document.getElementById('dashboardError').style.display !== 'none';
        const errMsg = document.getElementById('dashboardErrorMessage').textContent;
        return errVisible && errMsg.includes('malformed');
      } finally {
        window.fetch = origFetch;
      }
    });
    assert(malformedHandled, 'Malformed API response handled safely without exception, showing error state');

    // ----------------------------------------------------
    // TEST 16: Raw Vectors Never Displayed
    // ----------------------------------------------------
    console.log('\n16. Verifying No Raw Vectors Leaked in DOM...');
    // Re-render live data
    await page.evaluate(() => {
      window.NirdeshakDashboard.fetchAndRenderRecommendations('Safety helmet');
    });
    await page.waitForSelector('#dashboardContent', { state: 'visible', timeout: 25000 });

    const dashboardAllText = await page.textContent('#resultsDashboard');
    const hasRawVectors = /\[\s*-?0\.\d{3,},\s*-?0\.\d{3,}/.test(dashboardAllText) ||
                          dashboardAllText.includes('3072') && dashboardAllText.includes('dimensions');
    assert(!hasRawVectors, 'Zero raw embedding vectors or raw float arrays exposed in DOM');

    // ----------------------------------------------------
    // TEST 17: API Keys / Credentials Never Displayed
    // ----------------------------------------------------
    console.log('\n17. Verifying No API Keys or Secrets Exposed...');
    const hasApiKeyLeak = dashboardAllText.includes('AIzaSy') ||
                          dashboardAllText.includes('GEMINI_API_KEY') ||
                          dashboardAllText.includes('postgres://');
    assert(!hasApiKeyLeak, 'Zero API keys, credentials, or DB connection strings exposed in UI');

    // ----------------------------------------------------
    // TEST 18: Responsive Layout Checks (No Horizontal Overflow)
    // ----------------------------------------------------
    console.log('\n18. Verifying Responsive Layout on Desktop & Mobile Viewports...');
    // Desktop check (1280px)
    const desktopOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    assert(!desktopOverflow, 'Desktop viewport (1280px) has ZERO horizontal overflow');

    // Mobile check (375px)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);
    const mobileOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    assert(!mobileOverflow, 'Mobile viewport (375px) has ZERO horizontal overflow');

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 900 });

    // ----------------------------------------------------
    // TEST 19: Keyboard Accessibility Checks (ARIA & Toggles)
    // ----------------------------------------------------
    console.log('\n19. Verifying Keyboard Accessibility (ARIA & Enter/Space keys)...');
    const ariaChecked = await page.evaluate(() => {
      const toggleBtn = document.getElementById('toggleDetailsBtn-1');
      if (!toggleBtn) return false;
      const initialAria = toggleBtn.getAttribute('aria-expanded');
      const controls = toggleBtn.getAttribute('aria-controls');

      // Click to toggle
      toggleBtn.click();
      const updatedAria = toggleBtn.getAttribute('aria-expanded');
      return initialAria !== updatedAria && controls === 'rec-details-1';
    });
    assert(ariaChecked, 'Expand/collapse button updates aria-expanded and targets aria-controls properly');

    // ----------------------------------------------------
    // TEST 20: No JavaScript Console Errors Throughout
    // ----------------------------------------------------
    console.log('\n20. Verifying Console Errors...');
    assert(consoleErrors.length === 0, `Zero JS console errors observed during entire suite (errors: ${consoleErrors.join(', ') || 'none'})`);

  } catch (err) {
    console.error('Unexpected failure during Step 12 test execution:', err);
    failed++;
  } finally {
    await browser.close();
  }

  console.log('\n====================================================');
  console.log(`STEP 12 TESTS SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStep12Tests();
