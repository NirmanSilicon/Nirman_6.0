const http = require('http');
const { query, closePool } = require('../database');

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

// 15 Explicitly Required Products with their expected standards & domain
const EXPLICIT_15_TARGETS = [
  { name: 'Industrial Safety Glasses', council: 'Transport Engineering', search: 'Safety Glass for Road Vehicles', expectedIs: 'IS 2553' },
  { name: 'Industrial Safety Helmets', council: 'Civil Engineering', search: 'Industrial Safety Helmets', expectedIs: 'IS 2925:1984' },
  { name: 'Sterile Hypodermic Syringes', council: 'Medical Equipment and Hospital Planning', search: 'Sterile Single-Use Hypodermic Syringes', expectedIs: 'IS 10258:2002' },
  { name: 'Electrical Cables', council: 'Electrotechnical', search: 'PVC Insulated Unsheathed Cables', expectedIs: 'IS 694:2010' },
  { name: 'Transformers', council: 'Electrotechnical', search: 'Outdoor Oil-Immersed Distribution Transformers', expectedIs: 'IS 1180 (Part 1):2014' },
  { name: 'Cement', council: 'Civil Engineering', search: 'Ordinary Portland Cement (OPC)', expectedIs: 'IS 269:2015' },
  { name: 'Steel Reinforcement Bars', council: 'Civil Engineering', search: 'High Strength Deformed Steel Bars (TMT Rebars)', expectedIs: 'IS 1786:2008' },
  { name: 'Water Pumps', council: 'Mechanical Engineering', search: 'Submersible Borewell Pumpsets for Clean Water', expectedIs: 'IS 8034:2018' },
  { name: 'Medical Equipment', council: 'Medical Equipment and Hospital Planning', search: 'Intensive Care Mechanical Ventilators', expectedIs: 'IS 13450 (Part 1):2018' },
  { name: 'Agricultural Machinery', council: 'Food and Agriculture', search: 'Rotavators (Rotary Tillers)', expectedIs: 'IS 17045:2018' },
  { name: 'Textile Products', council: 'Textiles', search: 'Cotton Sewing Threads', expectedIs: 'IS 1720:1978' },
  { name: 'Industrial Valves', council: 'Mechanical Engineering', search: 'Industrial Steel Gate, Globe and Check Valves', expectedIs: 'IS 14846:2000' },
  { name: 'Solar Panels', council: 'Electrotechnical', search: 'Crystalline Silicon Terrestrial Photovoltaic (PV) Modules', expectedIs: 'IS 14286:2010' },
  { name: 'Road Transport Safety Glass', council: 'Transport Engineering', search: 'Safety Glass for Road Vehicles', expectedIs: 'IS 2553 (Part 2):2019' },
  { name: 'Chemical Products', council: 'Chemical', search: 'Caustic Soda (Sodium Hydroxide)', expectedIs: 'IS 252:2013' }
];

async function run85ProductSuite() {
  console.log('========================================================================');
  console.log('NIRDESHAK: 85-PRODUCT COMPREHENSIVE RELEVANCE & ACCURACY AUDIT SUITE');
  console.log('Testing 5 products per council across all 17 BIS Division Councils (85 total)');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;
  let syringeFalsePositives = 0;
  let glassFalsePositives = 0;
  let valveFalsePositives = 0;

  function assert(desc, condition, details = '') {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc} - Details: ${details}`);
      failed++;
    }
  }

  // 1. Fetch 17 Councils
  const councilsRes = await query(`
    SELECT DISTINCT division_council 
    FROM product_families 
    ORDER BY division_council
  `);
  const councils = councilsRes.rows.map(r => r.division_council);
  console.log(`Found ${councils.length} Division Councils.\n`);

  // Build the 85-product roster (exactly 5 per council)
  const roster = [];

  for (const council of councils) {
    // Find products in this council that have mappings
    const productsRes = await query(`
      SELECT DISTINCT ON (pf.id) pf.id, pf.canonical_name, pf.division_council, pf.subcategory,
             s.is_number, s.title as standard_title, psm.relationship_type
      FROM product_families pf
      JOIN product_standard_mappings psm ON pf.id = psm.product_family_id
      JOIN standards s ON psm.standard_id = s.id
      WHERE pf.division_council = $1
      ORDER BY pf.id, 
        CASE WHEN psm.relationship_type = 'primary_specification' THEN 1 ELSE 2 END
      LIMIT 20
    `, [council]);

    // Check if any of our explicit 15 targets belong to this council
    const explicitMatches = EXPLICIT_15_TARGETS.filter(t => t.council.toLowerCase() === council.toLowerCase());
    const councilProducts = [];

    // Prioritize explicit targets
    for (const em of explicitMatches) {
      let row = productsRes.rows.find(r => r.canonical_name.toLowerCase().includes(em.search.toLowerCase()));
      if (!row) {
        const directRes = await query(`
          SELECT pf.id, pf.canonical_name, pf.division_council, pf.subcategory,
                 s.is_number, s.title as standard_title
          FROM product_families pf
          JOIN product_standard_mappings psm ON pf.id = psm.product_family_id
          JOIN standards s ON psm.standard_id = s.id
          WHERE pf.canonical_name ILIKE $1
          LIMIT 1
        `, [`%${em.search}%`]);
        if (directRes.rows.length > 0) row = directRes.rows[0];
      }
      if (row && !councilProducts.some(p => p.id === row.id)) {
        councilProducts.push({
          id: row.id,
          name: row.canonical_name,
          council: council,
          expectedIs: em.expectedIs || row.is_number,
          isExplicitTarget: true,
          targetLabel: em.name
        });
      }
    }

    // Fill remaining up to exactly 5
    for (const r of productsRes.rows) {
      if (councilProducts.length >= 5) break;
      if (!councilProducts.some(p => p.id === r.id)) {
        councilProducts.push({
          id: r.id,
          name: r.canonical_name,
          council: council,
          expectedIs: r.is_number,
          isExplicitTarget: false,
          targetLabel: null
        });
      }
    }

    console.log(`Council [${council}]: selected ${councilProducts.length} test products.`);
    roster.push(...councilProducts);
  }

  console.log(`\nConstructed test roster of ${roster.length} products across 17 councils (Target: 85 products).\n`);
  assert(`Exact 85-product roster created (5 products x 17 councils)`, roster.length === 85, `Got ${roster.length}`);

  // Execute relevance verification for all 85 products
  console.log('--- EXECUTING RELEVANCE VERIFICATION ACROSS 85 PRODUCTS ---');
  let index = 0;
  for (const item of roster) {
    index++;
    const res = await postJson('/api/products/discover', {
      query: item.name,
      limit: 5
    });

    const recs = res.body?.recommendations || [];
    const isNumbers = recs.map(r => r.is_number);

    // Check 1: Zero IS 10258 (Sterile Syringes) on non-syringe products
    const isSyringeProduct = item.name.toLowerCase().includes('syringe');
    const hasSyringeStandard = isNumbers.some(n => n.includes('10258'));
    if (!isSyringeProduct && hasSyringeStandard) {
      syringeFalsePositives++;
      assert(`Zero Syringe standard for "${item.name}"`, false, `Spurious IS 10258 returned!`);
    } else {
      assert(`[#${index}] ${item.council}: "${item.name.substring(0, 45)}" - Clean of Syringe False Positive`, true);
    }

    // Check 2: Zero IS 2553 (Part 2) (Road Transport Safety Glass) on non-glazing products
    const isRoadGlassProduct = (item.name.toLowerCase().includes('safety glass') || item.name.toLowerCase().includes('windscreen')) && item.council === 'Transport Engineering';
    const hasRoadGlass = isNumbers.some(n => n.includes('2553 (Part 2)'));
    if (!isRoadGlassProduct && hasRoadGlass) {
      glassFalsePositives++;
      assert(`Zero Road Safety Glass for non-glazing "${item.name}"`, false, `Spurious IS 2553 (Part 2) returned!`);
    }

    // Check 3: Zero IS 14846 (Sluice Valves) on Food or non-fluid/water handling products
    const isWaterOrFluidHandling = item.name.toLowerCase().includes('valve') || 
                                   item.name.toLowerCase().includes('water') || 
                                   item.name.toLowerCase().includes('sewage') || 
                                   item.name.toLowerCase().includes('irrigation') || 
                                   item.name.toLowerCase().includes('pipeline') || 
                                   item.name.toLowerCase().includes('dam') ||
                                   item.name.toLowerCase().includes('gate');
    const isFoodOrIncompatible = item.council === 'Food and Agriculture' || 
                                 item.council === 'Textiles' || 
                                 item.council === 'AYUSH' || 
                                 item.council === 'Electronics and Information Technology';
    const hasValveStandard = isNumbers.some(n => n.includes('14846'));
    if ((isFoodOrIncompatible || !isWaterOrFluidHandling) && hasValveStandard) {
      valveFalsePositives++;
      assert(`Zero Sluice Valve for non-fluid "${item.name}"`, false, `Spurious IS 14846 returned!`);
    }

    // Check 4: Expected standard relevance for explicit targets
    if (item.isExplicitTarget) {
      const baseNum = item.expectedIs.split(':')[0];
      const expectedMatched = isNumbers.some(n => n.includes(baseNum));
      assert(
        `Explicit Target "${item.targetLabel}": recommends ${item.expectedIs}`,
        expectedMatched,
        `Expected ${item.expectedIs}, got top recs: ${isNumbers.join(', ')}`
      );
    }
  }

  // TEST THE 4 INPUT METHODS EXPLICITLY
  console.log('\n--- TESTING ALL 4 INPUT METHODS ---');

  // Method 1: Product Description
  console.log('\n[Method 1: Product Description]');
  const m1Res = await postJson('/api/products/discover', {
    query: 'Portland Pozzolana Cement for civil building construction',
    limit: 3
  });
  const m1Top = m1Res.body?.recommendations?.[0];
  assert('Method 1 (Product Description): Recommends Cement standard (IS 1489 Part 1)', 
    m1Top?.is_number?.includes('1489') || m1Top?.is_number?.includes('269'),
    `Got ${m1Top?.is_number}`
  );

  // Method 2: Technical Specification
  console.log('\n[Method 2: Technical Specification]');
  const m2Res = await postJson('/api/products/discover', {
    query: 'Industrial safety helmet shell HDPE UV resistant, shock absorption transmitted force <= 5.0 kN under 50 J impact, flammability <= 5 seconds, electrical insulation 3 kV AC proof test.',
    limit: 3
  });
  const m2Top = m2Res.body?.recommendations?.[0];
  assert('Method 2 (Technical Specification): Recommends Helmet standard IS 2925:1984',
    m2Top?.is_number?.includes('2925'),
    `Got ${m2Top?.is_number}`
  );

  // Method 3: Tender Document Line Item
  console.log('\n[Method 3: Tender Document Line Item]');
  const m3Res = await postJson('/api/products/discover', {
    query: 'Tender Line Item 04: High strength deformed steel bars (TMT rebars Fe 500D) for concrete reinforcement',
    limit: 3
  });
  const m3Top = m3Res.body?.recommendations?.[0];
  assert('Method 3 (Tender Line Item): Recommends Rebar standard IS 1786:2008',
    m3Top?.is_number?.includes('1786'),
    `Got ${m3Top?.is_number}`
  );

  // Method 4: Natural Language Query
  console.log('\n[Method 4: Natural Language Query]');
  const m4Res = await postJson('/api/products/discover', {
    query: 'What standard governs sterile single use hypodermic injection syringes in hospitals?',
    limit: 3
  });
  const m4Top = m4Res.body?.recommendations?.[0];
  assert('Method 4 (Natural Language Query): Recommends Syringe standard IS 10258:2002',
    m4Top?.is_number?.includes('10258'),
    `Got ${m4Top?.is_number}`
  );

  console.log('\n========================================================================');
  console.log('AUDIT SUMMARY METRICS:');
  console.log(`Total Assertions Checked: ${passed + failed}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Syringe False Positive Recommendations: ${syringeFalsePositives} (Target: 0)`);
  console.log(`Road Safety Glass False Positive Recommendations: ${glassFalsePositives} (Target: 0)`);
  console.log(`Sluice Valve False Positive Recommendations: ${valveFalsePositives} (Target: 0)`);
  console.log('========================================================================\n');

  await closePool();

  if (failed > 0 || syringeFalsePositives > 0 || glassFalsePositives > 0 || valveFalsePositives > 0) {
    process.exit(1);
  }
}

run85ProductSuite().catch(err => {
  console.error('Fatal error running 85-product suite:', err);
  process.exit(1);
});
