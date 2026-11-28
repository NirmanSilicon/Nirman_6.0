const http = require('http');
const { query, closePool } = require('../database');

function makeRequest(path, method = 'POST', body = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  });
}

async function runValidation() {
  console.log('========================================================================');
  console.log('NIRDESHAK: COMPREHENSIVE POST-REMEDIATION VALIDATION SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(cond, desc) {
    if (cond) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  }

  // 1. Database Integrity Checks
  console.log('--- 1. DATABASE INTEGRITY CHECKS ---');
  const dbCounts = await query(`
    SELECT 
      (SELECT COUNT(*) FROM product_families) as total_products,
      (SELECT COUNT(*) FROM standards) as total_standards,
      (SELECT COUNT(*) FROM product_standard_mappings) as total_mappings,
      (SELECT COUNT(*) FROM product_families WHERE coverage_status = 'VERIFIED_PRIMARY') as primary_count,
      (SELECT COUNT(*) FROM product_families WHERE coverage_status = 'VERIFIED_SUPPORTING_ONLY') as supporting_count,
      (SELECT COUNT(*) FROM product_families WHERE coverage_status = 'NO_APPLICABLE_STANDARD_FOUND') as zero_count;
  `);
  const r = dbCounts.rows[0];

  assert(parseInt(r.total_products) === 1041, 'Total product families is exactly 1,041 (1,047 - 6 consolidated duplicates)');
  assert(parseInt(r.total_standards) === 714, 'Total standards is exactly 714 (710 + 4 verified ingested standards)');
  assert(parseInt(r.total_mappings) === 1086, 'Total mappings is exactly 1,086');
  assert(parseInt(r.primary_count) === 784, 'Stored VERIFIED_PRIMARY is exactly 784');
  assert(parseInt(r.supporting_count) === 193, 'Stored VERIFIED_SUPPORTING_ONLY is exactly 193');
  assert(parseInt(r.zero_count) === 64, 'Stored NO_APPLICABLE_STANDARD_FOUND is exactly 64');
  assert(parseInt(r.primary_count) + parseInt(r.supporting_count) + parseInt(r.zero_count) === 1041, 'Coverage statuses sum to exactly 1,041');

  // Check zero stale coverage statuses
  const staleRes = await query(`
    SELECT pf.id, pf.canonical_name, pf.coverage_status
    FROM product_families pf
    LEFT JOIN product_standard_mappings psm ON pf.id = psm.product_family_id
    WHERE (pf.coverage_status = 'NO_APPLICABLE_STANDARD_FOUND' AND psm.id IS NOT NULL)
       OR (pf.coverage_status = 'VERIFIED_PRIMARY' AND NOT EXISTS (
            SELECT 1 FROM product_standard_mappings m WHERE m.product_family_id = pf.id AND m.relationship_type = 'primary_specification'
          ))
       OR (pf.coverage_status = 'VERIFIED_SUPPORTING_ONLY' AND EXISTS (
            SELECT 1 FROM product_standard_mappings m WHERE m.product_family_id = pf.id AND m.relationship_type = 'primary_specification'
          ))
       OR (pf.coverage_status = 'VERIFIED_SUPPORTING_ONLY' AND psm.id IS NULL);
  `);
  assert(staleRes.rows.length === 0, 'Zero stale coverage statuses remain across entire database');

  // Check IS 15988:2013 has zero over-mappings
  const s15988Res = await query(`
    SELECT count(*) FROM product_standard_mappings psm
    JOIN standards s ON psm.standard_id = s.id
    WHERE s.is_number = 'IS 15988:2013';
  `);
  assert(parseInt(s15988Res.rows[0].count) === 0, 'IS 15988:2013 has 0 over-mappings on individual products');

  // Check IS 1893:2016 mappings are strictly structural codes
  const s1893Res = await query(`
    SELECT count(*) FROM product_standard_mappings psm
    JOIN standards s ON psm.standard_id = s.id
    WHERE s.is_number = 'IS 1893 (Part 1):2016'
      AND psm.product_family_id IN (13, 129, 310, 365, 617, 618, 1040);
  `);
  assert(parseInt(s1893Res.rows[0].count) === 0, 'IS 1893:2016 has 0 mappings on kerbstones, manholes, drainage pipes or geogrids');

  // 2. Newly Remediated Products Verification
  console.log('\n--- 2. VERIFYING SPECIFIC REMEDIATED PRODUCTS ---');
  const targetProds = await query(`
    SELECT pf.id, pf.canonical_name, pf.coverage_status, s.is_number, psm.relationship_type
    FROM product_families pf
    JOIN product_standard_mappings psm ON pf.id = psm.product_family_id
    JOIN standards s ON psm.standard_id = s.id
    WHERE pf.id IN (18, 299, 302, 306, 727, 603, 613, 1006)
    ORDER BY pf.id;
  `);
  console.table(targetProds.rows);

  assert(targetProds.rows.some(r => r.id === 18 && r.is_number.includes('1948') && r.coverage_status === 'VERIFIED_PRIMARY'), 'Product 18 (Aluminium Doors/Windows) mapped to IS 1948');
  assert(targetProds.rows.some(r => r.id === 299 && r.is_number.includes('14257') && r.coverage_status === 'VERIFIED_PRIMARY'), 'Product 299 (Starting Batteries) mapped to IS 14257:1995');
  assert(targetProds.rows.some(r => r.id === 302 && r.is_number.includes('15636') && r.coverage_status === 'VERIFIED_PRIMARY'), 'Product 302 (Radial Tyres) mapped to IS 15636:2012');
  assert(targetProds.rows.some(r => r.id === 306 && r.is_number.includes('1884') && r.coverage_status === 'VERIFIED_PRIMARY'), 'Product 306 (Automotive Horns) mapped to IS 1884:1993');
  assert(targetProds.rows.some(r => r.id === 727 && r.is_number.includes('61439') && r.coverage_status === 'VERIFIED_PRIMARY'), 'Product 727 (Busbar Trunking) mapped to IS/IEC 61439-6');
  assert(targetProds.rows.some(r => r.id === 613 && r.is_number.includes('12894') && r.coverage_status === 'VERIFIED_PRIMARY'), 'Product 613 (Fly Ash Lime Bricks) mapped to IS 12894:2002');
  assert(targetProds.rows.some(r => r.id === 603 && r.is_number.includes('9103') && r.coverage_status === 'VERIFIED_PRIMARY'), 'Product 603 (SNF Plasticizer) mapped to IS 9103:1999');

  // 3. API Recommendation Tests Across All 4 Input Methods
  console.log('\n--- 3. TESTING API ENDPOINTS & ALL 4 INPUT METHODS ---');

  // Method 1: Product Description
  console.log('\n[Method 1: Product Description]');
  const m1 = await makeRequest('/api/products/discover', 'POST', {
    query: 'Portland Pozzolana Cement for civil building construction',
    limit: 3
  });
  assert(m1.status === 200, 'Method 1 (Description) HTTP status 200');
  const m1Stds = (m1.body?.recommendations || []).map(x => x.is_number || x.standard_number);
  assert(m1Stds.some(s => s && (s.includes('1489') || s.includes('269'))), 'Method 1 recommends Cement standard (IS 1489 / IS 269)');

  // Method 2: Technical Specifications
  console.log('\n[Method 2: Technical Specification]');
  const m2 = await makeRequest('/api/products/discover', 'POST', {
    query: 'Industrial safety helmet shell HDPE UV resistant, shock absorption transmitted force <= 5.0 kN under 50 J impact, flammability <= 5 seconds, electrical insulation 3 kV AC proof test.',
    limit: 3
  });
  assert(m2.status === 200, 'Method 2 (Specification) HTTP status 200');
  const m2Stds = (m2.body?.recommendations || []).map(x => x.is_number || x.standard_number);
  assert(m2Stds.some(s => s && s.includes('2925')), 'Method 2 recommends IS 2925:1984 for Helmets');

  // Method 3: Tender Document Line Item
  console.log('\n[Method 3: Tender Document Line Item]');
  const m3 = await makeRequest('/api/products/discover', 'POST', {
    query: 'Tender Line Item 04: High strength deformed steel bars (TMT rebars Fe 500D) for concrete reinforcement',
    limit: 3
  });
  assert(m3.status === 200, 'Method 3 (Tender) HTTP status 200');
  const m3Stds = (m3.body?.recommendations || []).map(x => x.is_number || x.standard_number);
  assert(m3Stds.some(s => s && s.includes('1786')), 'Method 3 recommends IS 1786 for TMT Steel Bars');

  // Method 4: Natural Language Query
  console.log('\n[Method 4: Natural Language Query]');
  const m4 = await makeRequest('/api/products/discover', 'POST', {
    query: 'What standard governs sterile single use hypodermic injection syringes in hospitals?',
    limit: 3
  });
  assert(m4.status === 200, 'Method 4 (Query) HTTP status 200');
  const m4Stds = (m4.body?.recommendations || []).map(x => x.is_number || x.standard_number);
  assert(m4Stds.some(s => s && s.includes('10258')), 'Method 4 recommends Syringe standard IS 10258:2002');

  // 4. Multilingual Search Tests (Hindi & Odia)
  console.log('\n--- 4. MULTILINGUAL SEARCH TESTS (HINDI & ODIA) ---');
  
  // Hindi: सुरक्षा हेलमेट (Safety Helmet)
  const hi1 = await makeRequest('/api/products/discover', 'POST', {
    query: 'सुरक्षा हेलमेट',
    limit: 3
  });
  const hi1Stds = (hi1.body?.recommendations || []).map(x => x.is_number || x.standard_number);
  assert(hi1Stds.some(s => s && s.includes('2925')), 'Hindi search "सुरक्षा हेलमेट" recommends IS 2925');

  // Hindi: सीमेंट (Cement)
  const hi2 = await makeRequest('/api/products/discover', 'POST', {
    query: 'पोर्टलैंड सीमेंट',
    limit: 3
  });
  const hi2Stds = (hi2.body?.recommendations || []).map(x => x.is_number || x.standard_number);
  assert(hi2Stds.some(s => s && (s.includes('269') || s.includes('1489') || s.includes('455'))), 'Hindi search "पोर्टलैंड सीमेंट" recommends Portland Cement standards');

  // Odia: ସୁରକ୍ଷା ହେଲମେଟ (Safety Helmet)
  const od1 = await makeRequest('/api/products/discover', 'POST', {
    query: 'ସୁରକ୍ଷା ହେଲମେଟ',
    limit: 3
  });
  const od1Stds = (od1.body?.recommendations || []).map(x => x.is_number || x.standard_number);
  assert(od1Stds.some(s => s && s.includes('2925')), 'Odia search "ସୁରକ୍ଷା ହେଲମେଟ" recommends IS 2925');

  // 5. Verification Against False Positives (Cleanliness)
  console.log('\n--- 5. CHECKING UNRELATED RECOMMENDATIONS CLEANLINESS ---');
  // Check that automotive horns do NOT recommend syringes
  const hornCheck = await makeRequest('/api/products/discover', 'POST', {
    query: 'Automotive Horns (Electric)',
    limit: 5
  });
  const hornStds = (hornCheck.body?.recommendations || []).map(x => x.is_number || x.standard_number);
  assert(!hornStds.some(s => s && s.includes('10258')), 'Automotive Horn does NOT recommend Syringes (IS 10258)');

  // Check that precast kerbstones do NOT recommend seismic retrofitting IS 15988
  const kerbCheck = await makeRequest('/api/products/discover', 'POST', {
    query: 'Precast Concrete Kerbstones',
    limit: 5
  });
  const kerbStds = (kerbCheck.body?.recommendations || []).map(x => x.is_number || x.standard_number);
  assert(!kerbStds.some(s => s && s.includes('15988')), 'Precast Kerbstones do NOT recommend Seismic Retrofitting (IS 15988)');

  console.log('\n========================================================================');
  console.log(`VALIDATION SUMMARY: Passed: ${passed} | Failed: ${failed}`);
  console.log('========================================================================');

  await closePool();
  if (failed > 0) process.exit(1);
}

runValidation().catch(e => {
  console.error(e);
  process.exit(1);
});
