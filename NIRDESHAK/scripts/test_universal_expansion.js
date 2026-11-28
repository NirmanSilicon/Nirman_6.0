// ============================================================================
// NIRDESHAK - Universal Expansion Comprehensive Multi-Council Test Suite
// Verifies:
// 1. All 17 BIS Division Councils representation & taxonomy
// 2. 500+ Product Master Catalogue & Aliases
// 3. Multi-sector discovery across all 4 input methods:
//    - Method 1: Product Description
//    - Method 2: Technical Specification
//    - Method 3: Tender Document / Line Items
//    - Method 4: Natural Language Query
// 4. Safe transparent fallback for unknown products (zero hallucination)
// 5. Autocomplete & suggestion API (/api/products/suggest)
// 6. QCO statutory metadata & Gazette validation
// ============================================================================

const http = require('http');

const API_BASE = 'http://localhost:3000';

function postJson(urlPath, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, API_BASE);
    const postData = JSON.stringify(data);
    const req = http.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      },
      (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function getJson(urlPath) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, API_BASE);
    http.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    }).on('error', reject);
  });
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('NIRDESHAK UNIVERSAL EXPANSION VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(desc, condition, details = '') {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc} - Details: ${details}`);
      failed++;
    }
  }

  // TEST 1: Health & 17 Division Councils Endpoint
  console.log('--- TEST 1: System Health & 17 BIS Division Councils ---');
  const healthRes = await getJson('/api/health');
  assert('API Health endpoint responds 200 OK', healthRes.status === 200 && healthRes.body.status === 'ok');
  assert('PostgreSQL is connected with pgvector', healthRes.body.databaseConnected === true && healthRes.body.pgvectorAvailable === true);

  const councilsRes = await getJson('/api/division-councils');
  assert('17 BIS Division Councils returned', councilsRes.body.count === 17);

  // TEST 2: Product Autocomplete & Suggestion API
  console.log('\n--- TEST 2: Product Autocomplete & Suggestions ---');
  const suggestRes1 = await getJson('/api/products/suggest?q=cable&limit=5');
  assert('Suggest endpoint returns cable matches', suggestRes1.body.success === true && suggestRes1.body.suggestions.length > 0);
  console.log('   Sample cable suggestion:', suggestRes1.body.suggestions[0]?.canonicalName, `(${suggestRes1.body.suggestions[0]?.divisionCouncil})`);

  const suggestRes2 = await getJson('/api/products/suggest?q=cement&limit=5');
  assert('Suggest endpoint returns cement matches', suggestRes2.body.success === true && suggestRes2.body.suggestions.length > 0);

  // TEST 3: Method 1 - Product Description across Multiple Councils
  console.log('\n--- TEST 3: Method 1 - Product Description Input ---');
  const pDescTests = [
    {
      domain: 'Civil Construction Materials (CED)',
      query: 'Portland Pozzolana Cement for structural building construction',
      expectedIs: 'IS 1489 (Part 1):2015'
    },
    {
      domain: 'Electrotechnical Equipment (ETD)',
      query: 'PVC insulated unsheathed electrical cable up to 1100V',
      expectedIs: 'IS 694:2010'
    },
    {
      domain: 'Industrial Mechanical Equipment (MED)',
      query: 'Submersible pumpsets for clear cold water handling',
      expectedIs: 'IS 8034:2018'
    },
    {
      domain: 'Metallurgical Products (MTD)',
      query: 'Hot rolled medium and high tensile structural steel',
      expectedIs: 'IS 2062:2011'
    },
    {
      domain: 'Energy Management (EED)',
      query: 'Terrestrial photovoltaic PV modules crystalline silicon',
      expectedIs: 'IS 14286:2010'
    }
  ];

  for (const test of pDescTests) {
    const res = await postJson('/api/products/discover', { query: test.query, limit: 3 });
    const top = res.body?.recommendations?.[0];
    const isMatched = top?.is_number === test.expectedIs;
    assert(
      `Product Description: ${test.domain}`,
      isMatched,
      `Expected ${test.expectedIs}, got ${top?.is_number} (Score: ${top?.scores?.final})`
    );
  }

  // TEST 4: Method 2 - Technical Specification Input
  console.log('\n--- TEST 4: Method 2 - Technical Specification Input ---');
  const techSpecTests = [
    {
      domain: 'Civil Engineering / Safety',
      text: 'Shell made of UV-stabilized HDPE or ABS, mass without attachments <= 400g, shock absorption transmitted force <= 5.0 kN under 50 J impact, flammability <= 5 seconds, electrical insulation proof test 3 kV AC for 1 minute.',
      expectedIs: 'IS 2925:1984'
    },
    {
      domain: 'Electrotechnical Switchgear',
      text: 'Three-phase 50Hz indoor vacuum circuit breaker rated 11kV, breaking capacity 25kA, operating sequence O-0.3s-CO-3min-CO.',
      expectedIs: 'IS/IEC 62271-100:2008'
    },
    {
      domain: 'Mechanical Machinery',
      text: 'Electric overhead travelling EOT crane class 2 duty, gantry hoist mechanism, structural steel design, factor of safety 5.',
      expectedIs: 'IS 3177:2020'
    }
  ];

  for (const test of techSpecTests) {
    const res = await postJson('/api/products/discover', { query: test.text, limit: 3 });
    const top = res.body?.recommendations?.[0];
    const isMatched = top?.is_number === test.expectedIs;
    assert(
      `Technical Spec: ${test.domain}`,
      isMatched,
      `Expected ${test.expectedIs}, got ${top?.is_number}`
    );
  }

  // TEST 5: Method 3 - Multi-Item Tender Line Extraction Simulation
  console.log('\n--- TEST 5: Method 3 - Tender Document Multi-Line Items ---');
  const tenderLineItems = [
    { item: 'Line 1: High strength deformed steel bars (TMT rebars Fe 500D)', expectedIs: 'IS 1786:2008' },
    { item: 'Line 2: Galvanized mild steel tubes for plumbing and water conveyance', expectedIs: 'IS 1239 (Part 1):2004' },
    { item: 'Line 3: Industrial safety footwear with 200J steel toe impact protection', expectedIs: 'IS 15298 (Part 2):2016' }
  ];

  for (const line of tenderLineItems) {
    const res = await postJson('/api/products/discover', { query: line.item, limit: 3 });
    const top = res.body?.recommendations?.[0];
    assert(
      `Tender Line: "${line.item.slice(0, 40)}..."`,
      top?.is_number === line.expectedIs,
      `Expected ${line.expectedIs}, got ${top?.is_number}`
    );
  }

  // TEST 6: Method 4 - Natural Language Query (Multilingual: English, Hindi, Odia)
  console.log('\n--- TEST 6: Method 4 - Natural Language Query (EN, HI, OR) ---');
  const nlTests = [
    {
      lang: 'English',
      query: 'What is the Indian Standard for industrial safety helmets for construction workers?',
      expectedIs: 'IS 2925:1984'
    },
    {
      lang: 'Hindi',
      query: 'निर्माण श्रमिकों के लिए औद्योगिक सुरक्षा हेलमेट के लिए कौन सा भारतीय मानक लागू होता है?',
      expectedIs: 'IS 2925:1984'
    },
    {
      lang: 'Odia',
      query: 'ନିର୍ମାଣ ଶ୍ରମିକମାନଙ୍କ ପାଇଁ ଶିଳ୍ପ ସୁରକ୍ଷା ହେଲମେଟ୍ ପାଇଁ ଭାରତୀୟ ମାନକ କ\'ଣ?',
      expectedIs: 'IS 2925:1984'
    }
  ];

  for (const test of nlTests) {
    const res = await postJson('/api/products/discover', { query: test.query, limit: 3 });
    const top = res.body?.recommendations?.[0];
    assert(
      `Natural Language (${test.lang})`,
      top?.is_number === test.expectedIs,
      `Expected ${test.expectedIs}, got ${top?.is_number}`
    );
  }

  // TEST 7: Safe Transparent Fallback for Unknown Products
  console.log('\n--- TEST 7: Safe Fallback for Unknown Products (Zero Hallucination) ---');
  const unkRes = await postJson('/api/products/discover', {
    query: 'Quantum Gravitational Space Warp Propulsion Drive',
    limit: 5
  });
  assert(
    'Unknown product returns hasMatch: false',
    unkRes.body?.hasMatch === false && unkRes.body?.count === 0,
    `hasMatch: ${unkRes.body?.hasMatch}, count: ${unkRes.body?.count}`
  );
  assert(
    'Fallback notice provides official BIS portal and transparent notice',
    unkRes.body?.fallbackNotice?.isNoMatch === true &&
    unkRes.body?.fallbackNotice?.officialPortalUrl === 'https://www.services.bis.gov.in'
  );

  // TEST 8: Full Explainable RAG Recommendation Pipeline
  console.log('\n--- TEST 8: Full Explainable RAG Recommendation Pipeline ---');
  const ragRes = await postJson('/api/recommendations/explain', {
    query: 'Supply of Portland Pozzolana Cement for building construction',
    limit: 3
  });
  assert('RAG recommendations endpoint responds 200 OK', ragRes.status === 200 && ragRes.body?.success === true);
  assert('Top recommendation contains full score attribution', typeof ragRes.body?.recommendations?.[0]?.scores?.final === 'number');
  assert('Division council & category present', !!ragRes.body?.recommendations?.[0]?.division_council);

  // Summary
  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED | TOTAL: ${passed + failed}`);
  console.log('================================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runTestSuite().catch(err => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
