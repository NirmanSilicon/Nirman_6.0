/**
 * NIRDESHAK Performance Benchmarking Suite
 * Measures 10 iterations of Autocomplete, Discovery, Semantic Search, Ranked Search, and Tender Batch
 */
const http = require('http');

function postJson(path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const start = Date.now();
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
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
          const duration = Date.now() - start;
          try {
            resolve({ status: res.statusCode, body: JSON.parse(body), duration });
          } catch {
            resolve({ status: res.statusCode, body, duration });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function getJson(path) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    http.get({ hostname: 'localhost', port: 3000, path }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const duration = Date.now() - start;
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body), duration });
        } catch {
          resolve({ status: res.statusCode, body, duration });
        }
      });
    }).on('error', reject);
  });
}

function stats(durations) {
  durations.sort((a, b) => a - b);
  const min = durations[0];
  const max = durations[durations.length - 1];
  const sum = durations.reduce((a, b) => a + b, 0);
  const avg = Math.round((sum / durations.length) * 10) / 10;
  const p50 = durations[Math.floor(durations.length * 0.5)];
  const p95 = durations[Math.floor(durations.length * 0.95)];
  return { min, max, avg, p50, p95 };
}

async function runBenchmarks() {
  console.log('======================================================');
  console.log('  NIRDESHAK 10-ITERATION PERFORMANCE BENCHMARK SUITE  ');
  console.log('======================================================\n');

  const benchmarkResults = {};

  // 1. Autocomplete
  console.log('1. Benchmarking Autocomplete (/api/products/suggest)...');
  const acDurations = [];
  for (let i = 0; i < 10; i++) {
    const res = await getJson('/api/products/suggest?q=cable&limit=10');
    acDurations.push(res.duration);
  }
  benchmarkResults['Autocomplete'] = stats(acDurations);

  // 2. Product Discovery
  console.log('2. Benchmarking Product Discovery (/api/products/discover)...');
  const discDurations = [];
  for (let i = 0; i < 10; i++) {
    const res = await postJson('/api/products/discover', { query: 'Ordinary Portland Cement 53 grade', limit: 5 });
    discDurations.push(res.duration);
  }
  benchmarkResults['Product Discovery'] = stats(discDurations);

  // 3. Semantic Search
  console.log('3. Benchmarking Semantic Vector Search (/api/standards/search)...');
  const semDurations = [];
  for (let i = 0; i < 10; i++) {
    const res = await postJson('/api/standards/search', { query: 'submersible borehole water pumpset', limit: 5 });
    semDurations.push(res.duration);
  }
  benchmarkResults['Semantic Search'] = stats(semDurations);

  // 4. Ranked RAG Recommendation
  console.log('4. Benchmarking Multi-Signal Ranking (/api/standards/recommend)...');
  const rankDurations = [];
  for (let i = 0; i < 10; i++) {
    const res = await postJson('/api/standards/recommend', { query: 'protective helmets for two wheeler riders', limit: 5 });
    rankDurations.push(res.duration);
  }
  benchmarkResults['Ranked Recommendation'] = stats(rankDurations);

  // 5. Tender Batch Processing (3 items simulated)
  console.log('5. Benchmarking Tender Batch Multi-Item Processing...');
  const tenderDurations = [];
  const tenderItems = [
    'TMT steel rebars Fe 500D for reinforced concrete columns',
    'PVC insulated unsheathed copper cables 1100V',
    'Industrial safety protective footwear with steel toe cap'
  ];
  for (let i = 0; i < 10; i++) {
    const start = Date.now();
    await Promise.all(tenderItems.map(item => postJson('/api/products/discover', { query: item, limit: 3 })));
    tenderDurations.push(Date.now() - start);
  }
  benchmarkResults['Tender Batch (3 items)'] = stats(tenderDurations);

  console.log('\n======================================================');
  console.log('BENCHMARK SUMMARY (milliseconds):');
  console.log('======================================================');
  console.table(benchmarkResults);

  // Write results JSON for report generation
  const fs = require('fs');
  fs.writeFileSync('scripts/benchmark_results.json', JSON.stringify(benchmarkResults, null, 2));
}

runBenchmarks().catch(console.error);
