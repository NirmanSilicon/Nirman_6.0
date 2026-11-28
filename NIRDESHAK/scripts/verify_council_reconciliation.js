const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function verifyCouncils() {
  console.log('=== DIVISION COUNCIL RECONCILIATION AUDIT ===\n');

  const sql = `
    SELECT 
      division_council,
      count(*) as total_products,
      count(*) FILTER (WHERE coverage_status = 'VERIFIED_PRIMARY') as verified_primary,
      count(*) FILTER (WHERE coverage_status = 'VERIFIED_SUPPORTING_ONLY') as verified_supporting_only,
      count(*) FILTER (WHERE coverage_status = 'CANDIDATE_UNVERIFIED') as candidate_unverified,
      count(*) FILTER (WHERE coverage_status = 'NO_APPLICABLE_STANDARD_FOUND') as no_applicable_std,
      count(*) FILTER (WHERE coverage_status = 'PRODUCT_CLARIFICATION_REQUIRED') as clarification_req
    FROM product_families
    GROUP BY division_council
    ORDER BY total_products DESC;
  `;

  const res = await pool.query(sql);
  console.table(res.rows);

  // Calculate Column Totals
  let sumTotal = 0;
  let sumPrimary = 0;
  let sumSupporting = 0;
  let sumCandidate = 0;
  let sumNoStd = 0;
  let sumClarification = 0;

  res.rows.forEach(r => {
    sumTotal += parseInt(r.total_products, 10);
    sumPrimary += parseInt(r.verified_primary, 10);
    sumSupporting += parseInt(r.verified_supporting_only, 10);
    sumCandidate += parseInt(r.candidate_unverified, 10);
    sumNoStd += parseInt(r.no_applicable_std, 10);
    sumClarification += parseInt(r.clarification_req, 10);
  });

  console.log('\n--- COLUMN SUM VERIFICATION ---');
  console.log(`Sum of Council Totals: ${sumTotal} (Expected: 1047) -> ${sumTotal === 1047 ? 'MATCH' : 'MISMATCH'}`);
  console.log(`Sum of Verified Primary: ${sumPrimary} (Expected: 781) -> ${sumPrimary === 781 ? 'MATCH' : 'MISMATCH'}`);
  console.log(`Sum of Supporting Only: ${sumSupporting} (Expected: 252) -> ${sumSupporting === 252 ? 'MATCH' : 'MISMATCH'}`);
  console.log(`Sum of Candidate Unverified: ${sumCandidate} (Expected: 11) -> ${sumCandidate === 11 ? 'MATCH' : 'MISMATCH'}`);
  console.log(`Sum of No Standard Found: ${sumNoStd} (Expected: 2) -> ${sumNoStd === 2 ? 'MATCH' : 'MISMATCH'}`);
  console.log(`Sum of Clarification Req: ${sumClarification} (Expected: 1) -> ${sumClarification === 1 ? 'MATCH' : 'MISMATCH'}`);

  const rowSumCheck = sumPrimary + sumSupporting + sumCandidate + sumNoStd + sumClarification;
  console.log(`\nCross-Category Sum: ${rowSumCheck} (Expected: 1047) -> ${rowSumCheck === 1047 ? 'MATCH' : 'MISMATCH'}`);

  await pool.end();
}

verifyCouncils().catch(err => {
  console.error(err);
  pool.end();
});
