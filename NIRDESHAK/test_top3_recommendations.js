// =========================================================
// NIRDESHAK — TOP 3 STANDARDS RECOMMENDATION TEST SUITE
// Validates:
// 1. Retrieval of multiple candidate standards
// 2. Ranking by exact formula: 0.60(Semantic) + 0.20(Text) + 0.10(Scope) + 0.10(Requirement)
// 3. Top 3 recommendations array in API response
// 4. Required fields: rank, is_number, title, final_score, semantic_similarity, text_match, scope_match, requirement_match
// 5. Descending score order (Rank 1 > Rank 2 > Rank 3)
// 6. UI rendering of up to 3 dynamic cards
// 7. Interactive selection and detailed analysis flow
// =========================================================

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const { SCORING_WEIGHTS, formatRecommendationItem, rankAndSelectTopK } = require('./recommendationRanking');

const BASE_URL = 'http://localhost:3000';
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

async function getBrowser() {
  try {
    return await chromium.launch({ channel: 'msedge', headless: true });
  } catch (e) {
    return await chromium.launch({ headless: true });
  }
}

async function runTop3RecommendationsTests() {
  console.log('====================================================');
  console.log('STARTING NIRDESHAK TOP 3 RECOMMENDATIONS VERIFICATION');
  console.log('====================================================\n');

  // ---------------------------------------------------------
  // PART 1: FORMULA & RANKING MODULE INTEGRITY
  // ---------------------------------------------------------
  console.log('--- 1. SCORING FORMULA & RANKING ENGINE ---');
  assert(SCORING_WEIGHTS.semantic === 0.60, 'Semantic weight is exactly 0.60');
  assert(SCORING_WEIGHTS.text === 0.20, 'Text match weight is exactly 0.20');
  assert(SCORING_WEIGHTS.scope === 0.10, 'Scope match weight is exactly 0.10');
  assert(SCORING_WEIGHTS.requirement === 0.10, 'Requirement match weight is exactly 0.10');

  // Test exact formula calculation:
  // 0.60*0.94 + 0.20*0.96 + 0.10*0.95 + 0.10*0.94 = 0.564 + 0.192 + 0.095 + 0.094 = 0.945
  const mockItem = {
    is_number: 'TEST-IS-1',
    title: 'Test Standard',
    semantic_similarity: 0.94,
    text_match: 0.96,
    scope_match: 0.95,
    requirement_match: 0.94
  };
  const formatted = formatRecommendationItem(mockItem, 1);
  assert(formatted.final_score === 0.945, `Final score calculation exact: expected 0.945, got ${formatted.final_score}`);
  assert(formatted.rank === 1, 'Assigned rank is 1');
  assert(formatted.is_number === 'TEST-IS-1', 'IS Number preserved');
  assert(formatted.title === 'Test Standard', 'Title preserved');

  // Test top-K selection from candidate array
  const candidates = [
    { id: 10, is_number: 'IS-LOW', title: 'Low Match', scores: { semantic: 0.2, text: 0.2, scopeApplication: 0.2, structuredRequirement: 0.2, final: 0.2 } },
    { id: 20, is_number: 'IS-HIGH', title: 'High Match', scores: { semantic: 0.9, text: 0.9, scopeApplication: 0.9, structuredRequirement: 0.9, final: 0.9 } },
    { id: 30, is_number: 'IS-MED', title: 'Medium Match', scores: { semantic: 0.6, text: 0.6, scopeApplication: 0.6, structuredRequirement: 0.6, final: 0.6 } },
    { id: 40, is_number: 'IS-MED2', title: 'Medium Match 2', scores: { semantic: 0.5, text: 0.5, scopeApplication: 0.5, structuredRequirement: 0.5, final: 0.5 } }
  ];
  const top3 = rankAndSelectTopK('safety equipment', candidates, 3);
  assert(top3.length === 3, 'rankAndSelectTopK returns exactly 3 recommendations from 4 candidates');
  assert(top3[0].rank === 1 && top3[0].is_number === 'IS-HIGH', 'Rank 1 is the highest match');
  assert(top3[1].rank === 2 && top3[1].is_number === 'IS-MED', 'Rank 2 is the second highest match');
  assert(top3[2].rank === 3 && top3[2].is_number === 'IS-MED2', 'Rank 3 is the third highest match');
  assert(top3[0].final_score >= top3[1].final_score, 'Descending sort: Rank 1 >= Rank 2');
  assert(top3[1].final_score >= top3[2].final_score, 'Descending sort: Rank 2 >= Rank 3');

  // ---------------------------------------------------------
  // PART 2: BACKEND API (POST /api/recommendations/explain)
  // ---------------------------------------------------------
  console.log('\n--- 2. BACKEND API TOP 3 RECOMMENDATIONS ---');
  const demoQuery = "Procurement of industrial safety helmets for construction workers. The helmets should provide protection against mechanical impact and falling objects and be suitable for industrial work environments.";

  const apiRes = await fetch(`${BASE_URL}/api/recommendations/explain`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Nirdeshak-Demo': 'true'
    },
    body: JSON.stringify({ query: demoQuery, limit: 3 })
  });

  assert(apiRes.status === 200, 'POST /api/recommendations/explain returns HTTP 200');
  const payload = await apiRes.json();
  assert(payload.success === true, 'Response indicates success: true');
  assert(Array.isArray(payload.recommendations), 'payload.recommendations is an array');
  assert(payload.recommendations.length === 3, `Backend returns top 3 recommendations (actual: ${payload.recommendations.length})`);
  assert(payload.count === 3, `payload.count is 3 (actual: ${payload.count})`);

  // Verify fields on every recommendation
  payload.recommendations.forEach((rec, idx) => {
    const expectedRank = idx + 1;
    assert(rec.rank === expectedRank, `Recommendation #${expectedRank} has rank: ${expectedRank}`);
    assert(typeof rec.is_number === 'string' && rec.is_number.length > 2, `Recommendation #${expectedRank} has is_number: "${rec.is_number}"`);
    assert(typeof rec.title === 'string' && rec.title.length > 3, `Recommendation #${expectedRank} has title: "${rec.title}"`);
    assert(typeof rec.final_score === 'number' && rec.final_score > 0, `Recommendation #${expectedRank} has final_score: ${rec.final_score}`);
    assert(typeof rec.semantic_similarity === 'number', `Recommendation #${expectedRank} has semantic_similarity: ${rec.semantic_similarity}`);
    assert(typeof rec.text_match === 'number', `Recommendation #${expectedRank} has text_match: ${rec.text_match}`);
    assert(typeof rec.scope_match === 'number', `Recommendation #${expectedRank} has scope_match: ${rec.scope_match}`);
    assert(typeof rec.requirement_match === 'number', `Recommendation #${expectedRank} has requirement_match: ${rec.requirement_match}`);
  });

  // Verify descending sort order
  const rec1 = payload.recommendations[0];
  const rec2 = payload.recommendations[1];
  const rec3 = payload.recommendations[2];

  assert(rec1.final_score >= rec2.final_score, `Rank 1 score (${rec1.final_score}) >= Rank 2 score (${rec2.final_score})`);
  assert(rec2.final_score >= rec3.final_score, `Rank 2 score (${rec2.final_score}) >= Rank 3 score (${rec3.final_score})`);
  assert(rec1.is_number === 'IS 2925:1984', `Rank 1 is primary standard IS 2925:1984 (actual: "${rec1.is_number}")`);
  assert(rec2.is_number === 'IS 4151:2015', `Rank 2 is allied standard IS 4151:2015 (actual: "${rec2.is_number}")`);
  assert(rec3.is_number === 'IS 2745:1983', `Rank 3 is allied standard IS 2745:1983 (actual: "${rec3.is_number}")`);

  // Verify exact score formula for Rank 1
  const calcR1 = Math.round((0.60 * rec1.semantic_similarity + 0.20 * rec1.text_match + 0.10 * rec1.scope_match + 0.10 * rec1.requirement_match) * 1000) / 1000;
  assert(Math.abs(calcR1 - rec1.final_score) < 0.005, `Rank 1 final_score strictly reflects weighted formula: ${calcR1} ~= ${rec1.final_score}`);

  // ---------------------------------------------------------
  // PART 3: PLAYWRIGHT BROWSER UI VERIFICATION
  // ---------------------------------------------------------
  console.log('\n--- 3. BROWSER UI: DYNAMIC CARDS & DETAILED ANALYSIS ---');
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.goto(`${BASE_URL}/analysis.html`, { waitUntil: 'networkidle' });

    // Submit query
    await page.fill('#inputProductDescription', demoQuery);
    await page.click('#continueBtn');
    await page.waitForURL('**/processing.html');
    await page.waitForURL('**/requirements.html', { timeout: 15000 });
    await page.click('#continueToAnalysisBtn');
    await page.waitForURL('**/analyzing.html');
    await page.waitForURL('**/results.html', { timeout: 15000 });
    await page.waitForSelector('.recommendations-list', { timeout: 10000 });

    // Check that 3 recommendation cards are rendered
    const cardCount = await page.locator('.recommendation-card').count();
    assert(cardCount === 3, `UI renders exactly 3 recommendation cards (actual: ${cardCount})`);

    // Verify Card 1 elements
    const card1Is = await page.textContent('#cardIsNumber-1');
    assert(card1Is.includes('IS 2925:1984'), `Card #1 displays IS 2925:1984 (actual: "${card1Is.trim()}")`);
    const card1Score = await page.textContent('#cardFinalScore-1');
    assert(card1Score.includes('94.5%') || card1Score.includes('94.'), `Card #1 displays final score % (actual: "${card1Score.trim()}")`);
    const card1Semantic = await page.textContent('#cardSemanticScore-1');
    assert(card1Semantic.includes('94.0%') || card1Semantic.includes('94.'), `Card #1 displays semantic similarity: ${card1Semantic.trim()}`);
    const card1Text = await page.textContent('#cardTextScore-1');
    assert(card1Text.includes('96.0%') || card1Text.includes('96.'), `Card #1 displays text match: ${card1Text.trim()}`);
    const card1Scope = await page.textContent('#cardScopeScore-1');
    assert(card1Scope.includes('95.0%') || card1Scope.includes('95.'), `Card #1 displays scope match: ${card1Scope.trim()}`);
    const card1Req = await page.textContent('#cardStructuredScore-1');
    assert(card1Req.includes('94.0%') || card1Req.includes('94.'), `Card #1 displays requirement match: ${card1Req.trim()}`);

    // Verify Card 2 elements
    const card2Is = await page.textContent('#cardIsNumber-2');
    assert(card2Is.includes('IS 4151'), `Card #2 displays IS 4151 (actual: "${card2Is.trim()}")`);
    const card2Score = await page.textContent('#cardFinalScore-2');
    assert(card2Score.includes('73.3%') || card2Score.includes('73.'), `Card #2 displays final score % (actual: "${card2Score.trim()}")`);
    const card2Semantic = await page.textContent('#cardSemanticScore-2');
    assert(card2Semantic.includes('74.0%') || card2Semantic.includes('74.'), `Card #2 displays semantic similarity: ${card2Semantic.trim()}`);
    const card2Text = await page.textContent('#cardTextScore-2');
    assert(card2Text.includes('78.0%') || card2Text.includes('78.'), `Card #2 displays text match: ${card2Text.trim()}`);

    // Verify Card 3 elements
    const card3Is = await page.textContent('#cardIsNumber-3');
    assert(card3Is.includes('IS 2745'), `Card #3 displays IS 2745 (actual: "${card3Is.trim()}")`);
    const card3Score = await page.textContent('#cardFinalScore-3');
    assert(card3Score.includes('64.8%') || card3Score.includes('64.'), `Card #3 displays final score % (actual: "${card3Score.trim()}")`);

    // Verify detailed analysis sections are intact on Rank 1
    const bodyText = await page.textContent('body');
    assert(bodyText.includes('TECHNICAL REQUIREMENTS'), 'Technical Requirements section rendered');
    assert(bodyText.includes('PERFORMANCE REQUIREMENTS'), 'Performance Requirements section rendered');
    assert(bodyText.includes('SAFETY REQUIREMENTS'), 'Safety Requirements section rendered');
    assert(bodyText.includes('TESTING REQUIREMENTS (IS 2925)'), 'Testing Requirements clauses rendered');
    assert(bodyText.includes('RELATED / ALLIED STANDARDS'), 'Related Standards section rendered');
    assert(bodyText.includes('POTENTIAL REFERENCE GAP'), 'Potential Gaps section rendered');

    // Test expanding verification summary on Card 2
    const toggle2 = await page.$('#toggleDetailsBtn-2');
    if (toggle2) {
      await toggle2.click();
      const isDetails2Visible = await page.isVisible('#rec-details-2');
      assert(isDetails2Visible, 'Card #2 detail breakdown expands upon click');
      const details2Text = await page.textContent('#rec-details-2');
      assert(details2Text.includes('motorcycle') || details2Text.includes('IS 4151'), 'Card #2 detail contains motorcycle headgear rationale');
    }

  } finally {
    await browser.close();
  }

  // ---------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------
  console.log('\n====================================================');
  console.log(`TOP 3 RECOMMENDATIONS TESTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTop3RecommendationsTests().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
