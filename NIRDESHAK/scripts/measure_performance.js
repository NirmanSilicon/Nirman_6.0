const http = require('http');

const API_BASE = 'http://localhost:3000';

function postJson(urlPath, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, API_BASE);
    const postData = JSON.stringify(data);
    const t0 = Date.now();
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
          const elapsed = Date.now() - t0;
          try {
            resolve({ status: res.statusCode, body: JSON.parse(body), latencyMs: elapsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body, latencyMs: elapsed });
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
    const t0 = Date.now();
    http.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const elapsed = Date.now() - t0;
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body), latencyMs: elapsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body, latencyMs: elapsed });
        }
      });
    }).on('error', reject);
  });
}

function calcStats(latencies) {
  const sorted = [...latencies].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = Math.round((sum / sorted.length) * 10) / 10;
  const median = sorted[Math.floor(sorted.length / 2)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  return { min, mean, median, p95, max };
}

async function measurePerformance() {
  console.log('====================================================');
  console.log('7. PERFORMANCE & LATENCY MEASUREMENTS');
  console.log('====================================================\n');

  const iterations = 10;

  // 1. Autocomplete Suggestions
  console.log(`--- 1. Product Autocomplete Latency (/api/products/suggest) [${iterations} runs] ---`);
  const terms = ['cable', 'cement', 'pipe', 'steel', 'pump', 'trans', 'gear', 'valve', 'switch', 'motor'];
  const suggestLatencies = [];
  for (let i = 0; i < iterations; i++) {
    const res = await getJson(`/api/products/suggest?q=${terms[i % terms.length]}&limit=5`);
    suggestLatencies.push(res.latencyMs);
  }
  const suggestStats = calcStats(suggestLatencies);
  console.log('Autocomplete Stats (ms):', suggestStats);

  // 2. Product Discovery
  console.log(`\n--- 2. Product Discovery Latency (/api/products/discover) [${iterations} runs] ---`);
  const discoveryQueries = [
    'Portland Pozzolana Cement for structural building construction',
    'PVC insulated unsheathed electrical cable up to 1100V',
    'Submersible pumpsets for clear cold water handling',
    'Hot rolled medium and high tensile structural steel',
    'Terrestrial photovoltaic PV modules crystalline silicon',
    'Electric overhead travelling crane and gantry crane',
    'Protective helmets for two wheeler motor vehicles',
    'Industrial safety footwear with steel toecap',
    'Three-phase energy efficient induction motors',
    'High-voltage alternating-current circuit-breakers'
  ];
  const discoveryLatencies = [];
  for (let i = 0; i < iterations; i++) {
    const res = await postJson('/api/products/discover', { query: discoveryQueries[i], limit: 3 });
    discoveryLatencies.push(res.latencyMs);
  }
  const discoveryStats = calcStats(discoveryLatencies);
  console.log('Discovery Stats (ms):', discoveryStats);

  // 3. Semantic Search
  console.log(`\n--- 3. Semantic Search Latency (/api/search/semantic) [${iterations} runs] ---`);
  const semanticLatencies = [];
  for (let i = 0; i < iterations; i++) {
    const res = await postJson('/api/search/semantic', { query: discoveryQueries[i], limit: 5 });
    semanticLatencies.push(res.latencyMs);
  }
  const semanticStats = calcStats(semanticLatencies);
  console.log('Semantic Search Stats (ms):', semanticStats);

  // 4. Ranked Search
  console.log(`\n--- 4. Ranked Search Latency (/api/search/ranked) [${iterations} runs] ---`);
  const rankedLatencies = [];
  for (let i = 0; i < iterations; i++) {
    const res = await postJson('/api/search/ranked', { query: discoveryQueries[i], limit: 5 });
    rankedLatencies.push(res.latencyMs);
  }
  const rankedStats = calcStats(rankedLatencies);
  console.log('Ranked Search Stats (ms):', rankedStats);

  // 5. Multi-Product Tender Processing Simulation
  console.log(`\n--- 5. Multi-Product Tender Line Processing Simulation [${iterations} runs] ---`);
  const tenderLineLatencies = [];
  const sampleTenderLines = [
    'Line 1: High strength deformed steel bars Fe 500D for reinforced concrete structures',
    'Line 2: Galvanized mild steel tubes nominal bore 50mm heavy class for water plumbing',
    'Line 3: Industrial safety footwear with 200J steel toe impact protection and fuel oil resistant sole'
  ];
  for (let i = 0; i < iterations; i++) {
    const t0 = Date.now();
    // Simulate batch processing of tender lines in parallel
    await Promise.all(sampleTenderLines.map(line => postJson('/api/products/discover', { query: line, limit: 3 })));
    const elapsed = Date.now() - t0;
    tenderLineLatencies.push(elapsed);
  }
  const tenderStats = calcStats(tenderLineLatencies);
  console.log('Multi-Product Tender Batch Processing Stats (ms):', tenderStats);

  // Summary Table
  console.log('\n====================================================');
  console.log('PERFORMANCE BENCHMARK SUMMARY TABLE');
  console.log('====================================================');
  console.table([
    { Operation: 'Product Autocomplete (/api/products/suggest)', ...suggestStats },
    { Operation: 'Product Discovery (/api/products/discover)', ...discoveryStats },
    { Operation: 'Semantic Vector Search (/api/search/semantic)', ...semanticStats },
    { Operation: 'Ranked Multi-Signal Search (/api/search/ranked)', ...rankedStats },
    { Operation: 'Multi-Product Tender Batch (3 lines parallel)', ...tenderStats }
  ]);

  process.exit(0);
}

measurePerformance().catch(err => {
  console.error(err);
  process.exit(1);
});
