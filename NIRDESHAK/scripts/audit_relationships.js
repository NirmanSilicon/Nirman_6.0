/**
 * NIRDESHAK Standard Relationships Auditor
 * Deep inspection of all rows in standard_relationships in nirdeshak_clean_20261126
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function auditRelationships() {
  console.log('='.repeat(80));
  console.log('NIRDESHAK STANDARD RELATIONSHIPS AUDIT');
  console.log('='.repeat(80));

  const issues = [];
  const checks = [];

  function record(title, passed, detail) {
    checks.push({ title, passed, detail });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${title}: ${detail}`);
    if (!passed) issues.push(`${title}: ${detail}`);
  }

  try {
    const res = await pool.query(`
      SELECT 
        sr.id, sr.source_standard_id, sr.target_standard_id,
        sr.source_is_number, sr.target_is_number,
        sr.relationship_type, sr.evidence, sr.source,
        s1.canonical_id as source_canonical, s1.is_number as s1_is,
        s2.canonical_id as target_canonical, s2.is_number as s2_is
      FROM standard_relationships sr
      LEFT JOIN standards s1 ON sr.source_standard_id = s1.id
      LEFT JOIN standards s2 ON sr.target_standard_id = s2.id
      ORDER BY sr.id;
    `);

    const rels = res.rows;
    record('Total Relationships Count is 13', rels.length === 13, `Found ${rels.length}`);

    // Check for duplicate edges
    const edgePairs = new Set();
    let duplicateEdges = 0;
    for (const r of rels) {
      const src = r.source_is_number || r.s1_is;
      const tgt = r.target_is_number || r.s2_is;
      const key = `${src} -> ${tgt} [${r.relationship_type}]`;
      if (edgePairs.has(key)) {
        duplicateEdges++;
        issues.push(`Duplicate relationship edge: ${key}`);
      }
      edgePairs.add(key);
    }
    record('No Duplicate Relationship Edges', duplicateEdges === 0, `Duplicates: ${duplicateEdges}`);

    // Check for self-referencing edges
    const selfEdges = rels.filter(r => (r.source_standard_id && r.target_standard_id && r.source_standard_id === r.target_standard_id) || (r.source_is_number && r.source_is_number === r.target_is_number));
    record('No Self-Referencing Edges', selfEdges.length === 0, `Self-referencing: ${selfEdges.length}`);

    // Check helmet relationships: IS 4151 must NOT be classified as testing standard for IS 2925
    const falseHelmetRel = rels.find(r => 
      (r.source_is_number?.includes('2925') || r.s1_is?.includes('2925')) &&
      (r.target_is_number?.includes('4151') || r.s2_is?.includes('4151')) &&
      r.relationship_type?.toLowerCase().includes('testing')
    );
    record('IS 4151 Not Falsely Linked as Testing Standard to IS 2925', !falseHelmetRel, falseHelmetRel ? `Found invalid relationship ID ${falseHelmetRel.id}` : 'Clean - no false helmet testing link');

    // Check IS 8828 predecessor mapping
    const is8828Pred = rels.find(r => r.source_is_number?.includes('8828') && r.target_is_number?.includes('60898-1') && r.relationship_type === 'predecessor_to');
    record('IS 8828 Predecessor to IS/IEC 60898-1 Mapped', Boolean(is8828Pred), is8828Pred?.evidence || 'Missing');

    // Check IS/IEC 60898-1 successor mapping
    const is60898Succ = rels.find(r => r.source_is_number?.includes('60898-1') && r.target_is_number?.includes('8828') && r.relationship_type === 'successor_to');
    record('IS/IEC 60898-1 Successor to IS 8828 Mapped', Boolean(is60898Succ), is60898Succ?.evidence || 'Missing');

    // Check IS 12615 revision mapping
    const is12615Rev = rels.find(r => r.source_is_number?.includes('12615:2018') && r.target_is_number?.includes('12615:2026') && r.relationship_type === 'succeeded_by_revision');
    record('IS 12615:2018 Succeeded by Revision IS 12615:2026 Mapped', Boolean(is12615Rev), is12615Rev?.evidence || 'Missing');

    // Check IS 456 references to supporting standards (IS 1786, IS 269, IS 1489, IS 383, IS 10262)
    const is456Refs = rels.filter(r => (r.source_is_number?.includes('456') || r.s1_is?.includes('456')) && r.relationship_type?.startsWith('references_'));
    record('IS 456 Has Concrete Normative References', is456Refs.length === 5, `Found ${is456Refs.length} references (IS 1786, IS 269, IS 1489, IS 383, IS 10262)`);

    // Check evidence presence for all relationships
    const missingEvidence = rels.filter(r => !r.evidence || r.evidence.trim().length < 10);
    record('All Relationships Have Detailed Technical Evidence', missingEvidence.length === 0, `Missing: ${missingEvidence.length}`);

    console.log('\n' + '='.repeat(80));
    console.log(`TOTAL RELATIONSHIP CHECKS: ${checks.length}`);
    console.log(`PASSED: ${checks.filter(c => c.passed).length}`);
    console.log(`FAILED: ${issues.length}`);
    console.log('='.repeat(80));

    return { total: checks.length, passed: checks.filter(c => c.passed).length, failed: issues.length, checks, issues };
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  auditRelationships().then(r => {
    process.exit(r.failed === 0 ? 0 : 1);
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { auditRelationships };
