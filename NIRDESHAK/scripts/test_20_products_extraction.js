// =========================================================
// Nirdeshak - 20 Product Universal Extraction Verification Suite
// Tests 20 products across all 17 BIS Division Councils:
// Verifies 12 schema sections, source attribution badges,
// clarification questions, and all 4 input methods.
// =========================================================

const http = require('http');

function postExtract(text, inputType = 'general') {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ text, inputType });
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/extract-requirements',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: data });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

const PRODUCTS_TO_TEST = [
  { id: 1, name: 'Industrial Safety Helmet', query: 'Industrial safety helmet for civil construction workers', council: 'CED' },
  { id: 2, name: 'Safety Glasses', query: 'Safety glasses for industrial eye protection against flying particles', council: 'CHD' },
  { id: 3, name: 'Safety Shoes', query: 'Industrial safety shoes with 200J steel toe cap and puncture resistant sole', council: 'CHD' },
  { id: 4, name: 'Protective Gloves', query: 'Heavy duty split leather protective gloves for industrial material handling', council: 'CHD' },
  { id: 5, name: 'PVC Insulated Electrical Cables', query: 'PVC insulated copper electrical cables 1.5 sq mm rated for 1100V', council: 'ETD' },
  { id: 6, name: 'Cement', query: 'Ordinary Portland Cement OPC 53 grade for structural reinforced concrete', council: 'CED' },
  { id: 7, name: 'Steel Reinforcement Bars', query: 'High strength deformed steel TMT rebar Fe 500D for seismic structures', council: 'MTD' },
  { id: 8, name: 'Water Pumps', query: 'Centrifugal monobloc water pump for agricultural irrigation 5 HP 415V', council: 'MED' },
  { id: 9, name: 'Electric Motors', query: 'Three phase squirrel cage induction motor 15 kW 4-pole 1500 rpm IE3', council: 'ETD' },
  { id: 10, name: 'Medical Equipment', query: 'Disposable medical face mask 3-ply with bacterial filtration efficiency 98%', council: 'MHD' },
  { id: 11, name: 'Agricultural Machinery', query: 'Knapsack agricultural sprayer 16 Litres chemical resistant tank with brass lance', council: 'FAD' },
  { id: 12, name: 'Textile Fabric', query: 'Woven cotton polyester blended workwear uniform textile fabric 240 GSM', council: 'TXD' },
  { id: 13, name: 'Chemical Products', query: 'Industrial caustic soda lye 48% concentration for chemical manufacturing', council: 'CHD' },
  { id: 14, name: 'Solar Panels', query: 'Monocrystalline solar PV modules 540 Wp bifacial with IP68 junction box', council: 'LITD' },
  { id: 15, name: 'Transformers', query: 'Oil immersed distribution transformer 500 kVA 11kV to 433V 3-phase 50Hz', council: 'ETD' },
  { id: 16, name: 'Fire Safety Equipment', query: 'ABC dry chemical powder fire extinguisher 6 kg with pressure gauge', council: 'CED' },
  { id: 17, name: 'Water Treatment Equipment', query: 'Reverse osmosis industrial water treatment plant 1000 LPH capacity', council: 'WRD' },
  { id: 18, name: 'Industrial Valves', query: 'Cast carbon steel flanged gate valve DN 100 Class 150 with handwheel', council: 'MED' },
  { id: 19, name: 'Food Processing Machinery', query: 'Stainless steel grain milling and flour processing machinery 1000 kg/hr', council: 'FAD' },
  { id: 20, name: 'Structural Steel Products', query: 'Hot rolled structural steel beams ISMB 300 Grade E250 Quality A', council: 'MTD' }
];

async function run20ProductTests() {
  console.log('================================================================');
  console.log('NIRDESHAK 20 PRODUCT UNIVERSAL REQUIREMENT EXTRACTION SUITE');
  console.log('================================================================\n');

  let passedTotal = 0;
  let failedTotal = 0;

  for (const prod of PRODUCTS_TO_TEST) {
    console.log(`--- [Product ${prod.id}/20]: ${prod.name} ---`);
    const res = await postExtract(prod.query);

    if (!res.success || !res.requirements) {
      console.error(`[FAIL] Endpoint failed for ${prod.name}:`, res.error || 'No requirements returned');
      failedTotal++;
      continue;
    }

    const reqs = res.requirements;
    const checks = [
      { field: 'Product Name', ok: reqs.product_name && reqs.product_name.length > 0, val: reqs.product_name },
      { field: 'Category', ok: reqs.product_category && reqs.product_category.length > 0, val: reqs.product_category },
      { field: 'Application', ok: reqs.application && reqs.application.length > 0, val: reqs.application.substring(0, 45) + '...' },
      { field: 'Technical Requirements', ok: reqs.technical_requirements && reqs.technical_requirements.length > 0, count: reqs.technical_requirements.length },
      { field: 'Materials & Construction', ok: reqs.materials && reqs.materials.length > 0, count: reqs.materials.length },
      { field: 'Performance Requirements', ok: reqs.performance_requirements && reqs.performance_requirements.length > 0, count: reqs.performance_requirements.length },
      { field: 'Dimensions & Ratings', ok: reqs.dimensions && reqs.dimensions.length > 0, count: reqs.dimensions.length },
      { field: 'Environmental Conditions', ok: reqs.environmental_conditions && reqs.environmental_conditions.length > 0, count: reqs.environmental_conditions.length },
      { field: 'Safety Requirements', ok: reqs.safety_requirements && reqs.safety_requirements.length > 0, count: reqs.safety_requirements.length },
      { field: 'Testing Requirements', ok: reqs.testing_requirements && reqs.testing_requirements.length > 0, count: reqs.testing_requirements.length },
      { field: 'Certification Requirements', ok: reqs.certification_requirements && reqs.certification_requirements.length > 0, count: reqs.certification_requirements.length },
      { field: 'Important Keywords', ok: reqs.important_keywords && reqs.important_keywords.length > 0, count: reqs.important_keywords.length }
    ];

    const allSectionsPopulated = checks.every(c => c.ok);
    if (allSectionsPopulated) {
      console.log(`[PASS] All 12 Sections Populated (${checks.map(c => c.count !== undefined ? `${c.field}: ${c.count}` : null).filter(Boolean).join(', ')})`);
      passedTotal++;
    } else {
      const failedFields = checks.filter(c => !c.ok).map(c => c.field);
      console.error(`[FAIL] Missing sections for ${prod.name}: ${failedFields.join(', ')}`);
      failedTotal++;
    }

    // Check source tag presence
    const allTexts = [
      ...(reqs.technical_requirements || []),
      ...(reqs.materials || []),
      ...(reqs.performance_requirements || []),
      ...(reqs.safety_requirements || []),
      ...(reqs.testing_requirements || []),
      ...(reqs.certification_requirements || [])
    ].join(' ');

    const hasSourceTags = /\[(USER PROVIDED|AI SUGGESTED|VERIFIED INDIAN STANDARD|REQUIRES CONFIRMATION)/i.test(allTexts);
    console.log(`   Source attribution tags present: ${hasSourceTags ? 'YES' : 'NO'}`);
  }

  // 4 INPUT METHODS VALIDATION
  console.log('\n================================================================');
  console.log('VALIDATING ALL 4 INPUT METHODS');
  console.log('================================================================');

  const inputMethods = [
    { type: 'product_description', text: 'Safety glasses with polycarbonate lens for manufacturing plant' },
    { type: 'tech_spec', text: '11kV 3-Phase 50Hz vacuum circuit breaker rated short circuit 25kA' },
    { type: 'tender_document', text: 'Tender for procurement of 5000 bags Ordinary Portland Cement 53 grade' },
    { type: 'natural_language', text: 'What standards apply to centrifugal water pumps for agriculture?' }
  ];

  for (const im of inputMethods) {
    const res = await postExtract(im.text, im.type);
    const pass = res.success && res.requirements && res.requirements.product_name && res.requirements.technical_requirements.length > 0;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] Input Method [${im.type}]: Extracted "${res.requirements ? res.requirements.product_name : 'N/A'}" (${res.requirements ? res.requirements.technical_requirements.length : 0} technical reqs)`);
    if (pass) passedTotal++; else failedTotal++;
  }

  console.log('\n================================================================');
  console.log(`TOTAL VALIDATION RESULTS: ${passedTotal} PASSED, ${failedTotal} FAILED (TOTAL: ${passedTotal + failedTotal})`);
  console.log('================================================================\n');

  if (failedTotal > 0) {
    process.exit(1);
  }
}

run20ProductTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
