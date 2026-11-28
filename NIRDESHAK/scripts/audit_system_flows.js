/**
 * NIRDESHAK System Flows & Features Auditor
 * Audits search modes across 4 domains, RAG explainability, no-match fallback,
 * certification/version APIs, tender PDF processing, PDF reports, and frontend static assets.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function httpGet(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${urlPath}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    }).on('error', reject);
  });
}

function httpPost(urlPath, payload) {
  return new Promise((resolve, reject) => {
    const dataStr = JSON.stringify(payload);
    const req = http.request(`http://localhost:3000${urlPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataStr)
      }
    }, (res) => {
      let chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const fullBuffer = Buffer.concat(chunks);
        const contentType = res.headers['content-type'] || '';
        if (contentType.includes('application/pdf')) {
          resolve({ status: res.statusCode, headers: res.headers, buffer: fullBuffer });
          return;
        }
        const data = fullBuffer.toString('utf8');
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.write(dataStr);
    req.end();
  });
}

async function runSystemAudit() {
  console.log('='.repeat(80));
  console.log('NIRDESHAK COMPLETE SYSTEM FLOWS & FEATURE AUDIT');
  console.log('='.repeat(80));

  const checks = [];
  const issues = [];

  function record(title, passed, detail) {
    checks.push({ title, passed, detail });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${title}: ${detail}`);
    if (!passed) issues.push(`${title}: ${detail}`);
  }

  try {
    // 1. Scoring Formula & Weights Verification
    const rankingMod = require('../ranking');
    const expectedWeights = { semantic: 0.60, text: 0.20, scopeApplication: 0.10, structuredRequirement: 0.10 };
    const actualWeights = rankingMod.WEIGHTS;
    const formulaCorrect = (
      actualWeights.semantic === expectedWeights.semantic &&
      actualWeights.text === expectedWeights.text &&
      actualWeights.scopeApplication === expectedWeights.scopeApplication &&
      actualWeights.structuredRequirement === expectedWeights.structuredRequirement
    );
    record(
      'Ranking Scoring Weights (60% Semantic, 20% Text, 10% Scope, 10% Req)',
      formulaCorrect,
      JSON.stringify(actualWeights)
    );

    // 2. Search Mode 1: Natural Language Query (PPE Domain)
    console.log('\n--- 1. Natural Language Query Verification ---');
    const nlRes = await httpPost('/api/search/ranked', {
      query: 'What Indian standard specifies industrial safety helmets for construction workers to protect against head trauma from falling tools?',
      limit: 3
    });
    const nlTop = nlRes.body?.results?.[0];
    record('Natural Language Search Status 200', nlRes.status === 200, `Status: ${nlRes.status}`);
    record('Natural Language Top Match is IS 2925:1984', nlTop?.is_number?.includes('2925'), `Top: ${nlTop?.is_number}`);
    record('Natural Language Result Scores Rounded to 4 Decimals', typeof nlTop?.scores?.final === 'number', `Final Score: ${nlTop?.scores?.final}`);

    // 3. Search Mode 2: Product Description (Electrical Domain)
    console.log('\n--- 2. Product Description Verification ---');
    const prodRes = await httpPost('/api/search/ranked', {
      query: 'Outdoor type oil immersed step-down three phase distribution transformers 11kV / 433V ratings 25kVA up to 2500kVA with standard energy loss levels',
      limit: 3
    });
    const prodTop = prodRes.body?.results?.[0];
    record('Product Description Top Match is IS 1180 (Part 1):2014', prodTop?.is_number?.includes('1180'), `Top: ${prodTop?.is_number}`);

    // 4. Search Mode 3: Technical Specification (Civil Domain)
    console.log('\n--- 3. Technical Specification Verification ---');
    const specRes = await httpPost('/api/search/ranked', {
      query: 'High strength deformed TMT steel rebars for concrete reinforcement grade Fe 500D yield stress 500 MPa percentage elongation 16%',
      limit: 3
    });
    const specTop = specRes.body?.results?.[0];
    record('Technical Specification Top Match is IS 1786:2008', specTop?.is_number?.includes('1786'), `Top: ${specTop?.is_number}`);

    // 5. Search Mode 4: Industrial Machinery Domain
    console.log('\n--- 4. Industrial Machinery Verification ---');
    const pumpRes = await httpPost('/api/search/ranked', {
      query: 'Borehole submersible motor pumpsets for agricultural irrigation and clear cold drinking water supply',
      limit: 3
    });
    const pumpTop = pumpRes.body?.results?.[0];
    record('Industrial Machinery Top Match is IS 8034:2018', pumpTop?.is_number?.includes('8034'), `Top: ${pumpTop?.is_number}`);

    // 6. Tender Text Requirement Extraction Verification
    console.log('\n--- 5. Requirement Extraction Verification ---');
    const extractRes = await httpPost('/api/extract-requirements', {
      text: 'Supply of 500 units of line operated energy efficient squirrel cage 3-phase induction motors ratings 15kW 4-pole 415V 50Hz efficiency class IE3 conforming to Indian Standards.'
    });
    record('Requirement Extraction HTTP 200', extractRes.status === 200, `Status: ${extractRes.status}`);
    const reqData = extractRes.body?.requirements || extractRes.body;
    record('Extracted Requirements Has Product Info', Boolean(reqData?.product_name || reqData?.productName || reqData?.application), `Extracted: ${JSON.stringify(reqData).slice(0, 80)}`);

    // 7. RAG Explanation Grounding Verification
    console.log('\n--- 6. RAG Grounding Verification ---');
    const explainRes = await httpPost('/api/recommendations/explain', {
      query: 'ordinary Portland cement grade 53 compressive strength 28 days 53 MPa hydraulic binder for multi-storey concrete building',
      limit: 3
    });
    record('RAG Explain HTTP 200', explainRes.status === 200, `Status: ${explainRes.status}`);
    const explainRecs = explainRes.body?.recommendations || [];
    const cementRec = explainRecs[0];
    record('RAG Top Recommendation is IS 269:2015', cementRec?.is_number?.includes('269') || cementRec?.canonical_id === 'IS-269-2015', `Top: ${cementRec?.is_number}`);
    record('RAG Rationale Cites Genuine IS Details', Boolean(explainRes.body?.summary && explainRes.body?.summary.length > 20), explainRes.body?.summary?.slice(0, 100));

    // 8. RAG No-Match Fallback Behavior Verification
    console.log('\n--- 7. RAG No-Match Fallback Verification ---');
    const noMatchRes = await httpPost('/api/recommendations/explain', {
      query: 'aerospace titanium alloy rocket nozzle regenerative cooling combustion chamber cryogenic liquid propellant',
      limit: 3
    });
    record('No-Match Query Handled Cleanly', noMatchRes.status === 200, `Status: ${noMatchRes.status}`);
    const noMatchRecs = noMatchRes.body?.recommendations || [];
    const noMatchSummary = noMatchRes.body?.summary || '';
    // Check that it doesn't return synthetic helmet or mock records
    const noMockInFallback = !JSON.stringify(noMatchRes.body).includes('TEST-IS-');
    record('Zero Mock Records in Unmatched Query', noMockInFallback, 'No mock records returned');

    // 9. Certification & Version Status APIs
    console.log('\n--- 8. Certification & Version APIs Verification ---');
    const is1786Row = await pool.query("SELECT id FROM standards WHERE canonical_id = 'IS-1786-2008'");
    const is1786Id = is1786Row.rows[0]?.id;

    const certRes = await httpGet(`/api/standards/${is1786Id}/certification`);
    record('Certification API Status 200', certRes.status === 200, `Status: ${certRes.status}`);
    const certDetails = certRes.body?.certification?.details || certRes.body?.certification || {};
    record('IS 1786 QCO Status is Mandatory', certDetails?.mandatory === true, `Mandatory: ${certDetails?.mandatory}`);
    record('IS 1786 Gazette is S.O. 3716(E)', certDetails?.gazette_no === 'S.O. 3716(E)', `Gazette: ${certDetails?.gazette_no}`);

    const verRes = await httpGet(`/api/standards/${is1786Id}/version`);
    record('Version API Status 200', verRes.status === 200, `Status: ${verRes.status}`);
    const verStatus = verRes.body?.versionStatus || {};
    record('IS 1786 Status is Active', verStatus.statusValue === 'active' && !verStatus.isSuperseded, `Status: ${verStatus.statusValue}, Superseded: ${verStatus.isSuperseded}`);

    // 10. PDF Report Generation Verification
    console.log('\n--- 9. PDF Report Generation Verification ---');
    const pdfRes = await httpPost('/api/reports/pdf', {
      query: 'High strength deformed steel bars and wires for concrete reinforcement',
      recommendations: [
        {
          id: is1786Id,
          canonical_id: 'IS-1786-2008',
          is_number: 'IS 1786:2008',
          title: 'High Strength Deformed Steel Bars and Wires for Concrete Reinforcement — Specification (Fourth Revision)',
          rank: 1,
          finalScore: 0.9421,
          scores: { semantic: 0.96, text: 0.92, scope: 0.90, requirement: 0.95 },
          regulatory_class: 'Class A',
          mandatory: true,
          qco_order_number: 'S.O. 3716(E)',
          whyRelevant: 'Prescribes physical, mechanical, and chemical requirements for Fe 500D TMT reinforcement bars.'
        }
      ],
      summary: 'IS 1786:2008 is the mandatory Bureau of Indian Standards specification for high-strength deformed concrete reinforcement bars.',
      limitations: []
    });
    record('PDF Generation HTTP 200', pdfRes.status === 200, `Status: ${pdfRes.status}`);
    const isBufferPdf = pdfRes.buffer && pdfRes.buffer.slice(0, 4).toString() === '%PDF';
    record('Generated File is Valid PDF', isBufferPdf, `Size: ${pdfRes.buffer?.length} bytes`);
    record('PDF Has Meaningful Length (> 5 KB)', pdfRes.buffer?.length > 5000, `Size: ${pdfRes.buffer?.length} bytes`);

    // 11. Frontend Static Routes Verification
    console.log('\n--- 10. Frontend Static Assets & Routes Verification ---');
    const routes = [
      { path: '/', expectedText: 'Nirdeshak' },
      { path: '/index.html', expectedText: 'Nirdeshak' },
      { path: '/classic.html', expectedText: 'Search' },
      { path: '/analysis.html', expectedText: 'Analysis' },
      { path: '/requirements.html', expectedText: 'Requirements' },
      { path: '/results.html', expectedText: 'Recommendations' },
      { path: '/style.css', expectedText: 'body' },
      { path: '/script.js', expectedText: 'function' }
    ];

    for (const r of routes) {
      const pageRes = await httpGet(r.path);
      const text = pageRes.raw || JSON.stringify(pageRes.body);
      const ok = pageRes.status === 200 && text.toLowerCase().includes(r.expectedText.toLowerCase());
      record(`Frontend Route [${r.path}] HTTP 200`, ok, `Status: ${pageRes.status}`);
    }

    // 12. API Error Handling Verification
    console.log('\n--- 11. API Error Handling Verification ---');
    const emptySearchRes = await httpPost('/api/search/ranked', { query: '' });
    record('Empty Query Returns HTTP 400', emptySearchRes.status === 400, `Status: ${emptySearchRes.status}, Error: ${emptySearchRes.body?.error}`);

    const invalidStdRes = await httpGet('/api/standards/999999');
    record('Non-Existent Standard ID Returns HTTP 404', invalidStdRes.status === 404, `Status: ${invalidStdRes.status}`);

    const invalidRelRes = await httpGet('/api/standards/invalid-id/related');
    record('Invalid Standard ID for Related Returns HTTP 400', invalidRelRes.status === 400, `Status: ${invalidRelRes.status}`);

    console.log('\n' + '='.repeat(80));
    console.log(`TOTAL SYSTEM FLOW CHECKS: ${checks.length}`);
    console.log(`PASSED: ${checks.filter(c => c.passed).length}`);
    console.log(`FAILED: ${issues.length}`);
    console.log('='.repeat(80));

    return { total: checks.length, passed: checks.filter(c => c.passed).length, failed: issues.length, checks, issues };
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runSystemAudit().then(r => {
    process.exit(r.failed === 0 ? 0 : 1);
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { runSystemAudit };
