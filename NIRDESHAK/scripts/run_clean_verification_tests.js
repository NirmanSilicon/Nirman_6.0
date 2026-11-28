/**
 * NIRDESHAK Clean Verification Test Suite
 * Comprehensive automated verification tests against the clean database (nirdeshak_clean_20261126)
 * and running Express API server (http://localhost:3000).
 */

const http = require('http');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
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

function httpPost(path, payload) {
  return new Promise((resolve, reject) => {
    const dataStr = JSON.stringify(payload);
    const req = http.request(`http://localhost:3000${path}`, {
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

async function runTests() {
  console.log('='.repeat(80));
  console.log('NIRDESHAK COMPLETE CLEAN DATABASE & SYSTEM VERIFICATION');
  console.log('='.repeat(80));
  console.log(`Database URL: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const results = [];
  function assert(name, condition, details = '') {
    results.push({ name, passed: Boolean(condition), details });
    const mark = condition ? 'PASS' : 'FAIL';
    console.log(`[${mark}] ${name}${details ? ' - ' + details : ''}`);
  }

  try {
    // 1. Health check endpoint
    const health = await httpGet('/api/health');
    assert('API Server Health', health.status === 200 && health.body.status === 'ok', `status: ${health.status}`);

    // 2. Database Connection & Info
    const dbInfo = await pool.query(`
      SELECT current_database() as db_name,
             version() as pg_version,
             (SELECT extversion FROM pg_extension WHERE extname = 'vector') as vector_version
    `);
    const dbRow = dbInfo.rows[0];
    assert('Connected Database Name', dbRow.db_name === 'nirdeshak_clean_20261126', `DB: ${dbRow.db_name}`);
    assert('PostgreSQL Version 18.x', dbRow.pg_version.includes('PostgreSQL 18'), dbRow.pg_version.split(',')[0]);
    assert('pgvector Extension Version', dbRow.vector_version === '0.8.6' || dbRow.vector_version?.startsWith('0.8'), `pgvector v${dbRow.vector_version}`);

    // 3. Standards Count Verification
    const countRes = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_primary_candidate = true) as primary_count,
        COUNT(*) FILTER (WHERE is_primary_candidate = false) as supporting_count,
        COUNT(*) FILTER (WHERE is_number LIKE 'TEST-%' OR title LIKE '%TEST%') as synthetic_count,
        COUNT(*) FILTER (WHERE is_primary_candidate = true AND certification->>'regulatory_class' ILIKE 'Class A%') as class_a_count,
        COUNT(*) FILTER (WHERE is_primary_candidate = true AND certification->>'regulatory_class' ILIKE 'Class B%') as class_b_count,
        COUNT(*) FILTER (WHERE is_primary_candidate = true AND certification->>'regulatory_class' ILIKE 'Class C%') as class_c_count
      FROM standards
    `);
    const counts = countRes.rows[0];
    assert('Total Standards Count is 19', parseInt(counts.total) === 19, `Found: ${counts.total}`);
    assert('Primary Candidate Count is 16', parseInt(counts.primary_count) === 16, `Found: ${counts.primary_count}`);
    assert('Supporting Reference Count is 3', parseInt(counts.supporting_count) === 3, `Found: ${counts.supporting_count}`);
    assert('Zero Synthetic/Mock Records', parseInt(counts.synthetic_count) === 0, `Synthetic count: ${counts.synthetic_count}`);
    assert('Regulatory Breakdown (12 Class A, 2 Class B, 2 Class C)', 
      parseInt(counts.class_a_count) === 12 && parseInt(counts.class_b_count) === 2 && parseInt(counts.class_c_count) === 2,
      `Class A: ${counts.class_a_count}, Class B: ${counts.class_b_count}, Class C: ${counts.class_c_count}`
    );

    // 4. Embeddings Verification
    const embRes = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(embedding) as embedded,
        COUNT(*) FILTER (WHERE embedding IS NULL) as missing,
        COUNT(*) FILTER (WHERE vector_dims(embedding) = 3072) as dims_3072,
        COUNT(*) FILTER (WHERE vector_dims(embedding) != 3072) as non_3072
      FROM standards
    `);
    const emb = embRes.rows[0];
    assert('All 19 Records Have Embeddings', parseInt(emb.embedded) === 19, `Embedded: ${emb.embedded}/${emb.total}`);
    assert('All Embeddings Are 3072-Dimensional', parseInt(emb.dims_3072) === 19 && parseInt(emb.non_3072) === 0, `3072-dim: ${emb.dims_3072}, Non-3072: ${emb.non_3072}`);

    // 5. Standard Relationships Verification
    const relRes = await pool.query(`
      SELECT 
        COUNT(*) as total_relationships,
        COUNT(DISTINCT source_standard_id) as sources,
        COUNT(DISTINCT target_standard_id) as targets
      FROM standard_relationships
    `);
    const rel = relRes.rows[0];
    assert('Standard Relationships Count is 13', parseInt(rel.total_relationships) === 13, `Found: ${rel.total_relationships} relationships`);

    // Verify foreign key integrity: every non-null standard id points to an existing record
    const danglingRes = await pool.query(`
      SELECT sr.* FROM standard_relationships sr
      LEFT JOIN standards s1 ON sr.source_standard_id = s1.id
      LEFT JOIN standards s2 ON sr.target_standard_id = s2.id
      WHERE (sr.source_standard_id IS NOT NULL AND s1.id IS NULL)
         OR (sr.target_standard_id IS NOT NULL AND s2.id IS NULL)
    `);
    assert('Zero Dangling Foreign Keys in Relationships', danglingRes.rowCount === 0, `Dangling: ${danglingRes.rowCount}`);

    // 6. Regulatory & Legal Specifics Check
    // (a) IS 694 tripartite metadata reconciliation (Standard Title, QCO Schedule, Product Manual)
    const is694 = await pool.query("SELECT * FROM standards WHERE canonical_id = 'IS-694-2010'");
    const row694 = is694.rows[0];
    const cert694 = row694.certification || {};
    const gazette694 = cert694.gazette_no || '';

    const is694TitleCorrect = row694.title.includes('450/750 V') && (cert694.official_standard_title || '').includes('450/750 V');
    assert('IS 694:2010 Official Title Specifies 450/750 V', is694TitleCorrect, row694.title);
    assert('IS 694:2010 QCO Schedule Description Specifies 1100 V', (cert694.qco_schedule_description || '').includes('1100 V'), cert694.qco_schedule_description);
    assert('IS 694:2010 Product Manual Title Specifies 1100 V', (cert694.product_manual_title || '').includes('1100 V'), cert694.product_manual_title);
    assert('IS 694:2010 Certification Scope Specifies 1100 V', (cert694.certification_scope || '').includes('1100 V'), cert694.certification_scope);
    assert('IS 694:2010 Rated Voltage in Standard is 450/750 V', cert694.rated_voltage_in_standard === 'Up to and including 450/750 V', cert694.rated_voltage_in_standard);
    assert('IS 694:2010 QCO Product Coverage Specifies 1100 V', (cert694.qco_product_coverage || '').includes('1100 V'), cert694.qco_product_coverage);
    assert('IS 694:2010 Discrepancy Note Explains 450/750 V vs 1100 V', Boolean(cert694.discrepancy_note && cert694.discrepancy_note.includes('450/750 V') && cert694.discrepancy_note.includes('1100 V')), cert694.discrepancy_note?.slice(0, 60));
    assert('IS 694:2010 Source References Cites CMD 2014, S.O. 189(E), PM 2024', Boolean(cert694.source_references?.official_standard_source && cert694.source_references?.qco_source && cert694.source_references?.product_manual_source), JSON.stringify(cert694.source_references));
    assert('IS 694:2010 QCO is S.O. 189(E) 2003', gazette694.includes('189(E)') && !gazette694.includes('280(E)'), gazette694);
    assert('IS 694:2010 Schedule Serial is 20', cert694.schedule_serial === 20 || cert694.schedule_item?.includes('20'), `Item: ${cert694.schedule_item}`);
    assert('IS 694:2010 Commencement Date is 17 August 2003', cert694.effective_date === '2003-08-17', `Effective: ${cert694.effective_date}`);
    assert('IS 694:2010 Product Manual is PM/IS 694/5/March 2024', cert694.product_manual_ref === 'PM/IS 694/5/March 2024', cert694.product_manual_ref);

    // (a.1) IS 8828 / IS/IEC 60898-1 S.O. 189(E) Serial 10 and 17 August 2003 Commencement
    const is60898 = await pool.query("SELECT * FROM standards WHERE canonical_id = 'IS-IEC-60898-1-2015'");
    const row60898 = is60898.rows[0];
    const cert60898 = row60898.certification || {};
    assert('IS 8828 Original Schedule Serial is 10', cert60898.schedule_serial === 10 || cert60898.schedule_item?.includes('10'), `Item: ${cert60898.schedule_item}`);
    assert('IS 8828 Original Commencement is 17 August 2003', cert60898.effective_date === '2003-08-17', `Effective: ${cert60898.effective_date}`);
    assert('Successor IS/IEC 60898-1 Adoption Evidence Separated', Boolean(cert60898.successor_adoption_note), cert60898.successor_adoption_note?.slice(0, 80));

    // (b) IS 8034 Submersible Pumpsets Class B Voluntary
    const is8034 = await pool.query("SELECT * FROM standards WHERE canonical_id = 'IS-8034-2018'");
    const row8034 = is8034.rows[0];
    const regClass8034 = row8034.certification?.regulatory_class || '';
    const isMandatory8034 = Boolean(row8034.certification?.mandatory);
    assert('IS 8034:2018 Classified as Class B Voluntary', regClass8034 === 'Class B' && !isMandatory8034, `Class: ${regClass8034}, Mandatory: ${isMandatory8034}`);

    // (c) IS 4151 Legal Grounding
    const is4151 = await pool.query("SELECT * FROM standards WHERE canonical_id = 'IS-4151-2015'");
    const row4151 = is4151.rows[0];
    const gazette4151 = row4151.certification?.gazette_no || '';
    const statutory4151 = row4151.certification?.statutory_basis || '';
    assert('IS 4151:2015 S.O. 4252(E) & BIS Act 2016 Sections 16, 25', gazette4151.includes('4252(E)') && /Section.*16/i.test(statutory4151), `QCO: ${gazette4151}, Basis: ${statutory4151}`);

    // (d) IS 1239 (Part 1):2004 Footnote
    const is1239 = await pool.query("SELECT * FROM standards WHERE canonical_id = 'IS-1239-Part-1-2004'");
    const row1239 = is1239.rows[0];
    const certStr1239 = JSON.stringify(row1239.certification || {});
    assert('IS 1239 S.O. 281(E) Latest Amendments Footnote Recorded', certStr1239.includes('latest') || certStr1239.includes('amendment'), 'QCO Footnote preserved');

    // (e) IS 12615 Edition Status
    const is12615 = await pool.query("SELECT * FROM standards WHERE canonical_id = 'IS-12615-2018'");
    const row12615 = is12615.rows[0];
    const notes12615 = JSON.stringify(row12615.certification || {}) + JSON.stringify(row12615.amendments || {});
    assert('IS 12615 Baseline is 2018 with 2026 Revision Noted', row12615.is_number.includes('12615:2018') && notes12615.includes('2026'), row12615.is_number);

    // 7. Domain Search & Semantic Retrieval Tests
    console.log('\n--- DOMAIN SEMANTIC & RANKED SEARCH VERIFICATION ---');
    const domainQueries = [
      {
        domain: 'PPE and Safety',
        query: 'industrial safety helmets for construction workers mechanical impact and falling objects',
        expectedCanonical: 'IS-2925-1984',
        expectedIs: 'IS 2925'
      },
      {
        domain: 'Electrical Equipment (Transformers)',
        query: 'three phase outdoor distribution transformer mineral oil cooled 11kV 25kVA to 2500kVA',
        expectedCanonical: 'IS-1180-Part-1-2014',
        expectedIs: 'IS 1180'
      },
      {
        domain: 'Electrical Equipment (Switchgear)',
        query: 'circuit breakers for overcurrent protection miniature circuit breaker MCB domestic installations 10kA',
        expectedCanonical: 'IS-IEC-60898-1-2015',
        expectedIs: 'IS/IEC 60898-1'
      },
      {
        domain: 'Civil Materials (Rebar)',
        query: 'high strength deformed steel bars and wires for concrete reinforcement TMT rebars Fe 500D Fe 550D',
        expectedCanonical: 'IS-1786-2008',
        expectedIs: 'IS 1786'
      },
      {
        domain: 'Civil Materials (Cement)',
        query: 'ordinary Portland cement 43 grade 53 grade hydraulic cement compressive strength',
        expectedCanonical: 'IS-269-2015',
        expectedIs: 'IS 269'
      },
      {
        domain: 'Industrial Machinery (Pumps)',
        query: 'submersible pumpsets for clear cold drinking water deep well borehole agricultural irrigation',
        expectedCanonical: 'IS-8034-2018',
        expectedIs: 'IS 8034'
      },
      {
        domain: 'Industrial Machinery (Motors)',
        query: 'line operated three phase squirrel cage induction motors energy efficient IE2 IE3 ratings',
        expectedCanonical: 'IS-12615-2018',
        expectedIs: 'IS 12615'
      }
    ];

    for (const dq of domainQueries) {
      const res = await httpPost('/api/search/ranked', {
        query: dq.query,
        limit: 5
      });

      const topRec = res.body?.results?.[0];
      const topCanonical = topRec?.canonical_id;
      const topIs = topRec?.is_number;
      const pass = topCanonical === dq.expectedCanonical || (topIs && topIs.includes(dq.expectedIs));
      assert(
        `Search [${dq.domain}] Top Match`,
        pass,
        `Expected: ${dq.expectedIs} (${dq.expectedCanonical}), Got: ${topIs} (${topCanonical}) [FinalScore: ${topRec?.finalScore}]`
      );
    }

    // 8. Exclusion of Supporting Reference Standards from Primary Ranked Search
    const refSearch = await httpPost('/api/search/ranked', {
      query: 'aggregates from natural sources for concrete coarse and fine aggregate grading',
      limit: 5
    });
    const foundRefAsPrimary = (refSearch.body?.results || []).some(
      r => (r.canonical_id === 'IS-383-2016' || r.is_number?.includes('383')) && r.is_primary_candidate !== false
    );
    assert('Supporting Reference Standards Excluded from Primary Ranked Search', !foundRefAsPrimary, 'IS-383 correctly excluded from primary search');

    // 9. API /api/recommendations/explain Endpoint Test (RAG & Grounding)
    console.log('\n--- RAG EXPLANATION VERIFICATION ---');
    const explainRes = await httpPost('/api/recommendations/explain', {
      query: 'industrial safety helmets for construction workers mechanical impact and falling objects',
      limit: 3
    });
    assert('Explain Endpoint HTTP 200', explainRes.status === 200, `Status: ${explainRes.status}`);
    const explainBody = explainRes.body;
    assert('Explain Contains Real Recommendations', explainBody.recommendations && explainBody.recommendations.length > 0, `Count: ${explainBody.recommendations?.length}`);
    const hasIs2925 = explainBody.recommendations?.some(r => r.is_number?.includes('2925') || r.canonical_id === 'IS-2925-1984');
    const topExplain = explainBody.recommendations?.[0];
    assert('Explain Top Standard is IS 2925:1984', topExplain && (topExplain.is_number?.includes('2925') || topExplain.canonical_id === 'IS-2925-1984'), `Top: ${topExplain?.is_number}`);
    assert('Explain Includes IS 2925 in Recommendations', hasIs2925, 'Found IS 2925 in recommendations list');
    assert('Explanation Summary Provided', Boolean(explainBody.summary && explainBody.summary.length > 20), explainBody.summary?.substring(0, 80) + '...');

    // 10. Static Frontend Files Verification
    console.log('\n--- FRONTEND STATIC ASSETS VERIFICATION ---');
    const staticPages = ['/index.html', '/classic.html', '/analysis.html', '/results.html'];
    for (const page of staticPages) {
      const pageRes = await httpGet(page);
      assert(`Static File [${page}] Status 200`, pageRes.status === 200, `Status: ${pageRes.status}`);
    }

    // 10. Standards Relationships API Verification
    console.log('\n--- STANDARDS RELATIONSHIPS API VERIFICATION ---');
    const is456Row = await pool.query("SELECT id FROM standards WHERE canonical_id = 'IS-456-2000'");
    const is456Id = is456Row.rows[0].id;
    const relApiRes = await httpGet(`/api/standards/${is456Id}/related`);
    assert('Related Standards Endpoint Status 200', relApiRes.status === 200, `Status: ${relApiRes.status}`);
    const relatedList = relApiRes.body?.related_standards || relApiRes.body?.results || [];
    const relCount = Array.isArray(relatedList) ? relatedList.length : 0;
    assert('IS 456 Has Related Standards', relCount >= 3, `Found ${relCount} related standards`);

    // 11. Version & Certification API Verification
    const versionRes = await httpGet(`/api/standards/${is456Id}/version`);
    assert('Version API Endpoint Status 200', versionRes.status === 200 && versionRes.body?.success, `Version status: ${versionRes.body?.versionStatus}`);

    const certRes = await httpGet(`/api/standards/${is456Id}/certification`);
    assert('Certification API Endpoint Status 200', certRes.status === 200 && certRes.body?.success, `Regulatory class: ${certRes.body?.regulatory_class || certRes.body?.certification?.regulatory_class}`);

    // 12. PDF Report Generation Verification
    console.log('\n--- PDF REPORT GENERATION VERIFICATION ---');
    const pdfRes = await httpPost('/api/reports/pdf', {
      query: explainBody.query || 'industrial safety helmet for construction site protection against head trauma',
      recommendations: explainBody.recommendations,
      summary: explainBody.summary,
      limitations: explainBody.limitations || []
    });
    const isPdf = pdfRes.status === 200 && pdfRes.buffer && pdfRes.buffer.slice(0, 4).toString() === '%PDF';
    assert('PDF Report Generated Successfully', isPdf, `Status: ${pdfRes.status}, Size: ${pdfRes.buffer?.length} bytes`);

    // 13. Security Check (No Leaked Credentials in Responses)
    console.log('\n--- SECURITY & LEAK CHECKS ---');
    const healthStr = JSON.stringify(health.body);
    const explainStr = JSON.stringify(explainBody);
    const dbPass = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).password : '';
    const geminiKey = process.env.GEMINI_API_KEY || '';

    const noDbPassLeak = !dbPass || (!healthStr.includes(dbPass) && !explainStr.includes(dbPass));
    const noKeyLeak = !geminiKey || (!healthStr.includes(geminiKey) && !explainStr.includes(geminiKey));
    assert('Database Password Not Leaked in API Responses', noDbPassLeak, 'Protected');
    assert('Gemini API Key Not Leaked in API Responses', noKeyLeak, 'Protected');

    // Summary
    console.log('\n' + '='.repeat(80));
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = results.filter(r => !r.passed).length;
    console.log(`TEST SUMMARY: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
    console.log('='.repeat(80));

    if (failedTests > 0) {
      console.log('\nFAILED CHECKS:');
      results.filter(r => !r.passed).forEach(f => console.log(` - ${f.name}: ${f.details}`));
      process.exit(1);
    } else {
      console.log('\nALL VERIFICATION CHECKS PASSED PERFECTLY!');
      process.exit(0);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
