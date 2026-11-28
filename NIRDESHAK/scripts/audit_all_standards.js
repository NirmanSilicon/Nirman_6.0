const { query } = require('../database');

async function auditStandards() {
  console.log('====================================================');
  console.log('3. STANDARDS AUDIT (ALL 58 RECORDS)');
  console.log('====================================================\n');

  const sql = `
    SELECT 
      s.id,
      s.is_number,
      s.title,
      s.division_council,
      s.standard_type,
      s.technical_committee,
      s.version,
      s.publication_year,
      s.reaffirmation_year,
      s.status,
      s.verification_status,
      s.source,
      CASE WHEN s.embedding IS NOT NULL THEN 'AVAILABLE (3072)' ELSE 'MISSING' END AS embedding_status,
      COALESCE(ro.qco_name, s.certification->>'qco_name', 'Voluntary / Not Notified') AS qco_name,
      COALESCE(ro.gazette_no, s.certification->>'gazette_no', 'N/A') AS gazette_no,
      CASE 
        WHEN srl.is_mandatory = true OR (s.certification->>'mandatory')::boolean = true THEN 'MANDATORY_QCO'
        WHEN s.standard_type ILIKE '%code%' OR s.title ILIKE '%code of practice%' THEN 'CODE_OF_PRACTICE'
        WHEN s.standard_type ILIKE '%test%' OR s.title ILIKE '%method%' OR s.title ILIKE '%test code%' THEN 'TEST_METHOD'
        ELSE 'VOLUNTARY'
      END AS regulatory_classification,
      (SELECT count(*) FROM product_standard_mappings psm WHERE psm.standard_id = s.id) AS mapped_products_count
    FROM standards s
    LEFT JOIN standard_regulatory_links srl ON s.id = srl.standard_id
    LEFT JOIN regulatory_orders ro ON srl.regulatory_order_id = ro.id
    ORDER BY s.id ASC;
  `;

  const res = await query(sql);
  console.log(`Audited ${res.rows.length} standards.\n`);

  res.rows.forEach((row, idx) => {
    console.log(`[${idx + 1}/58] ID: ${row.id} | ${row.is_number}`);
    console.log(`       Title:       ${row.title}`);
    console.log(`       Council:     ${row.division_council || 'N/A'} | Type: ${row.standard_type} | TC: ${row.technical_committee || 'N/A'}`);
    console.log(`       Edition:     ${row.version || 'N/A'} | Pub: ${row.publication_year} | Reaff: ${row.reaffirmation_year || 'N/A'}`);
    console.log(`       Status:      ${row.status} | Verified: ${row.verification_status} | Embed: ${row.embedding_status}`);
    console.log(`       Regulatory:  ${row.regulatory_classification} (${row.gazette_no})`);
    console.log(`       QCO Order:   ${row.qco_name}`);
    console.log(`       Source:      ${row.source}`);
    console.log(`       Mapped Prods:${row.mapped_products_count}`);
    console.log('----------------------------------------------------');
  });

  // Summary statistics for standards
  const summarySql = `
    SELECT 
      COALESCE(division_council, 'Unclassified') AS council,
      count(*) AS count,
      count(CASE WHEN embedding IS NOT NULL THEN 1 END) AS embedded_count,
      count(CASE WHEN status = 'active' THEN 1 END) AS active_count,
      count(CASE WHEN status != 'active' THEN 1 END) AS superseded_count
    FROM standards
    GROUP BY division_council
    ORDER BY count DESC;
  `;
  const summaryRes = await query(summarySql);
  console.log('\n--- Standards Distribution by Division Council ---');
  console.table(summaryRes.rows);

  process.exit(0);
}

auditStandards().catch(err => {
  console.error(err);
  process.exit(1);
});
