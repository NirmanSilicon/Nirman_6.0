const { discoverStandards } = require('../productDiscovery');
const { searchStandards } = require('../semanticSearch');
const { rankStandards } = require('../ranking');

const COUNCIL_TEST_QUERIES = [
  { council: 'AYD', name: 'Ayush', query: 'Ayurvedic herbal plant drugs and medicinal botanicals', expected: 'IS 16125:2014' },
  { council: 'CHD', name: 'Chemical', query: 'Personal protective equipment safety footwear with steel toecap', expected: 'IS 15298 (Part 2):2016' },
  { council: 'CED', name: 'Civil Engineering', query: 'Portland Pozzolana Cement for structural building construction', expected: 'IS 1489 (Part 1):2015' },
  { council: 'LITD', name: 'Electronics and IT', query: 'Information technology equipment safety including electrical business equipment', expected: 'IS 13252 (Part 1):2010' },
  { council: 'ETD', name: 'Electrotechnical', query: 'PVC insulated unsheathed electrical cable 1100V rated voltage', expected: 'IS 694:2010' },
  { council: 'EED', name: 'Energy Management', query: 'Crystalline silicon terrestrial photovoltaic PV modules', expected: 'IS 14286:2010' },
  { council: 'FAD', name: 'Food and Agriculture', query: 'Agricultural tractors test code and general requirements', expected: 'IS 12220:1987' },
  { council: 'MSD', name: 'Management and Systems', query: 'Quality management systems requirements for organization compliance', expected: 'IS/ISO 9001:2015' },
  { council: 'MED', name: 'Mechanical Engineering', query: 'Electric overhead travelling crane and gantry crane code of practice', expected: 'IS 3177:2020' },
  { council: 'MHD', name: 'Medical Equipment', query: 'Respiratory protective devices self contained breathing apparatus', expected: 'IS 10245 (Part 2):1994' },
  { council: 'MTD', name: 'Metallurgical Engineering', query: 'Hot rolled medium and high tensile structural steel', expected: 'IS 2062:2011' },
  { council: 'PCD', name: 'Petroleum and Coal', query: 'Methods for measurement of air pollution PM2.5 gravimetric method', expected: 'IS 5182 (Part 23):2006' },
  { council: 'PGD', name: 'Production & General', query: 'Hexagon head bolts screws and nuts metric product grade A and B', expected: 'IS 1364 (Part 1):2018' },
  { council: 'SSD', name: 'Service Sector', query: 'Quality management systems for public service delivery organizations', expected: 'IS 15700:2018' },
  { council: 'TXD', name: 'Textiles', query: 'High visibility warning clothes for industrial workplace safety', expected: 'IS 16391:2015' },
  { council: 'TED', name: 'Transport Engineering', query: 'Protective helmets for two wheeler motorcycle riders', expected: 'IS 4151:2015' },
  { council: 'WRD', name: 'Water Resources', query: 'Polyethylene pipes for irrigation laterals drip irrigation systems', expected: 'IS 12786:1989' }
];

async function runFourMethodsAudit() {
  console.log('====================================================');
  console.log('5. FOUR INPUT METHODS AUDIT ACROSS 17 COUNCILS');
  console.log('====================================================\n');

  console.log('--- Method A: Product Description Input (All 17 Councils) ---');
  let methodAPassed = 0;
  for (const item of COUNCIL_TEST_QUERIES) {
    const t0 = Date.now();
    const res = await discoverStandards(item.query, { limit: 3 });
    const elapsed = Date.now() - t0;
    const top = res.recommendations?.[0];
    const match = top?.is_number === item.expected;
    if (match) methodAPassed++;
    console.log(`[${item.council}] Query: "${item.query.slice(0, 45)}..."`);
    console.log(`       Result: ${match ? 'PASS' : 'FAIL'} | Top: ${top ? top.is_number : 'NONE'} (Expected: ${item.expected}) | Score: ${top?.scores?.final || 'N/A'} | Time: ${elapsed}ms`);
  }
  console.log(`Method A Pass Rate: ${methodAPassed}/17 (${((methodAPassed / 17) * 100).toFixed(1)}%)\n`);

  console.log('--- Method B: Technical Specification Input ---');
  const techSpecs = [
    { council: 'CED', spec: 'Compressive strength 72h >= 16 MPa, Blaine fineness >= 300 m2/kg, fly ash content 15% to 35% by mass.', expected: 'IS 1489 (Part 1):2015' },
    { council: 'ETD', spec: '11kV rated voltage, 25kA breaking capacity, 3-phase, 50Hz, vacuum circuit breaker with operating duty O-0.3s-CO-3min-CO.', expected: 'IS/IEC 62271-100:2008' },
    { council: 'MED', spec: 'Submersible pumpset for 100mm and 150mm borewells, multistage centrifugal pump, radial flow impeller, water filled motor.', expected: 'IS 8034:2018' },
    { council: 'MTD', spec: 'Grade E250 quality A, yield strength min 250 MPa, tensile strength 410 MPa, elongation 23%, carbon equivalent 0.42 max.', expected: 'IS 2062:2011' },
    { council: 'TED', spec: 'Protective helmet for motorcycle riders, dynamic impact absorption test, chin strap retention, peak penetration resistance.', expected: 'IS 4151:2015' }
  ];
  let methodBPassed = 0;
  for (const item of techSpecs) {
    const t0 = Date.now();
    const res = await discoverStandards(item.spec, { limit: 3 });
    const elapsed = Date.now() - t0;
    const top = res.recommendations?.[0];
    const match = top?.is_number === item.expected;
    if (match) methodBPassed++;
    console.log(`[${item.council}] Spec: "${item.spec.slice(0, 50)}..."`);
    console.log(`       Result: ${match ? 'PASS' : 'FAIL'} | Top: ${top ? top.is_number : 'NONE'} (Expected: ${item.expected}) | Score: ${top?.scores?.final || 'N/A'} | Time: ${elapsed}ms`);
  }
  console.log(`Method B Pass Rate: ${methodBPassed}/${techSpecs.length} (${((methodBPassed / techSpecs.length) * 100).toFixed(1)}%)\n`);

  console.log('--- Method C: Tender Document (PDF Simulation / Line Items) ---');
  const tenderLines = [
    { council: 'CED', line: 'Item 1: High strength deformed steel bars Fe 500D for bridge construction', expected: 'IS 1786:2008' },
    { council: 'CED', line: 'Item 2: Galvanized mild steel tubes for plumbing water distribution', expected: 'IS 1239 (Part 1):2004' },
    { council: 'CHD', line: 'Item 3: Industrial safety footwear with steel toecap 200 Joules impact protection', expected: 'IS 15298 (Part 2):2016' },
    { council: 'ETD', line: 'Item 4: Line operated three phase energy efficient ac induction motors IE3 efficiency', expected: 'IS 12615:2018' },
    { council: 'EED', line: 'Item 5: Crystalline silicon terrestrial photovoltaic modules for grid connected solar plant', expected: 'IS 14286:2010' }
  ];
  let methodCPassed = 0;
  for (const item of tenderLines) {
    const t0 = Date.now();
    const res = await discoverStandards(item.line, { limit: 3 });
    const elapsed = Date.now() - t0;
    const top = res.recommendations?.[0];
    const match = top?.is_number === item.expected;
    if (match) methodCPassed++;
    console.log(`[${item.council}] Tender Item: "${item.line.slice(0, 50)}..."`);
    console.log(`       Result: ${match ? 'PASS' : 'FAIL'} | Top: ${top ? top.is_number : 'NONE'} (Expected: ${item.expected}) | Score: ${top?.scores?.final || 'N/A'} | Time: ${elapsed}ms`);
  }
  console.log(`Method C Pass Rate: ${methodCPassed}/${tenderLines.length} (${((methodCPassed / tenderLines.length) * 100).toFixed(1)}%)\n`);

  console.log('--- Method D: Natural Language Query (Multilingual) ---');
  const nlQueries = [
    { lang: 'English', query: 'What is the standard for industrial safety helmets for construction workers?', expected: 'IS 2925:1984' },
    { lang: 'Hindi', query: 'निर्माण कार्य के लिए औद्योगिक सुरक्षा हेलमेट का कौन सा भारतीय मानक है?', expected: 'IS 2925:1984' },
    { lang: 'Odia', query: 'ନିର୍ମାଣ ଶ୍ରମିକମାନଙ୍କ ପାଇଁ ଶିଳ୍ପ ସୁରକ୍ଷା ହେଲମେଟ୍ ପାଇଁ ଭାରତୀୟ ମାନକ କ\'ଣ?', expected: 'IS 2925:1984' },
    { lang: 'English', query: 'Which standard applies to PVC insulated copper wires for domestic wiring?', expected: 'IS 694:2010' },
    { lang: 'English', query: 'What is the Indian Standard testing code for agricultural tractors?', expected: 'IS 12220:1987' }
  ];
  let methodDPassed = 0;
  for (const item of nlQueries) {
    const t0 = Date.now();
    const res = await discoverStandards(item.query, { limit: 3 });
    const elapsed = Date.now() - t0;
    const top = res.recommendations?.[0];
    const match = top?.is_number === item.expected;
    if (match) methodDPassed++;
    console.log(`[${item.lang}] Query: "${item.query.slice(0, 50)}..."`);
    console.log(`       Result: ${match ? 'PASS' : 'FAIL'} | Top: ${top ? top.is_number : 'NONE'} (Expected: ${item.expected}) | Score: ${top?.scores?.final || 'N/A'} | Time: ${elapsed}ms`);
  }
  console.log(`Method D Pass Rate: ${methodDPassed}/${nlQueries.length} (${((methodDPassed / nlQueries.length) * 100).toFixed(1)}%)\n`);

  process.exit(0);
}

runFourMethodsAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
