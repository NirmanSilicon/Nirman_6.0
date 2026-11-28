/**
 * NIRDESHAK Read-Only Database Auditor
 * Systematically audits nirdeshak_clean_20261126 schema, records, embeddings,
 * constraints, relationships, and verifies rollback database availability.
 */

const { Pool } = require('pg');
require('dotenv').config();

const cleanPool = new Pool({ connectionString: process.env.DATABASE_URL });
const rollbackPool = new Pool({ connectionString: process.env.PREVIOUS_DATABASE_URL });

async function auditDatabase() {
  console.log('='.repeat(80));
  console.log('NIRDESHAK INDEPENDENT READ-ONLY DATABASE AUDIT');
  console.log('='.repeat(80));

  const auditReport = {
    database: {},
    schema: {},
    records: [],
    relationships: [],
    embeddings: {},
    rollbackDb: {},
    issues: []
  };

  try {
    // 1. Connection & Engine Info
    const dbInfo = await cleanPool.query(`
      SELECT current_database() as db_name,
             version() as pg_version,
             (SELECT extversion FROM pg_extension WHERE extname = 'vector') as vector_version
    `);
    const info = dbInfo.rows[0];
    auditReport.database = {
      name: info.db_name,
      version: info.pg_version,
      vectorVersion: info.vector_version
    };
    console.log(`[Database]: ${info.db_name}`);
    console.log(`[Version]: ${info.pg_version.split(',')[0]}`);
    console.log(`[pgvector]: v${info.vector_version}`);

    if (info.db_name !== 'nirdeshak_clean_20261126') {
      auditReport.issues.push(`Connected DB is '${info.db_name}' instead of 'nirdeshak_clean_20261126'.`);
    }

    // 2. Schema: Tables, Columns, Constraints & Indexes
    const tablesRes = await cleanPool.query(`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
    `);
    auditReport.schema.tables = tablesRes.rows.map(r => r.table_name);
    console.log(`[Tables]:`, auditReport.schema.tables.join(', '));

    // Constraints
    const constraintsRes = await cleanPool.query(`
      SELECT tc.constraint_name, tc.table_name, tc.constraint_type, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name;
    `);
    auditReport.schema.constraints = constraintsRes.rows;

    // Foreign Keys
    const fkRes = await cleanPool.query(`
      SELECT
        tc.table_name, kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
    `);
    auditReport.schema.foreignKeys = fkRes.rows;
    console.log(`[Foreign Keys]: Found ${fkRes.rowCount} foreign key constraints`);

    // Indexes
    const idxRes = await cleanPool.query(`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `);
    auditReport.schema.indexes = idxRes.rows;
    console.log(`[Indexes]: Found ${idxRes.rowCount} indexes`);

    // 3. Standards Records Deep Audit
    const stdsRes = await cleanPool.query(`
      SELECT 
        id, canonical_id, is_number, title, scope, category, 
        version, publication_year, status, is_primary_candidate,
        technical_requirements, materials, performance_requirements, 
        safety_requirements, testing_requirements, amendments, 
        supersedes, superseded_by, certification, source,
        (embedding IS NOT NULL) as has_embedding,
        CASE WHEN embedding IS NOT NULL THEN vector_dims(embedding) ELSE 0 END as embedding_dims,
        created_at, updated_at
      FROM standards
      ORDER BY id;
    `);

    console.log(`\n[Standards Records Count]: ${stdsRes.rowCount}`);
    const seenCanonicals = new Set();
    const seenIsNumbers = new Set();

    let primaryCount = 0;
    let supportingCount = 0;
    let syntheticCount = 0;
    let zeroDimCount = 0;
    let non3072Count = 0;

    for (const row of stdsRes.rows) {
      if (row.is_primary_candidate) primaryCount++;
      else supportingCount++;

      if (row.is_number.includes('TEST-') || row.title.includes('TEST') || (row.source && row.source === 'DEVELOPMENT_TEST')) {
        syntheticCount++;
        auditReport.issues.push(`Synthetic record detected: ${row.is_number} (ID ${row.id})`);
      }

      if (seenCanonicals.has(row.canonical_id)) {
        auditReport.issues.push(`Duplicate canonical_id: ${row.canonical_id}`);
      }
      seenCanonicals.add(row.canonical_id);

      if (!row.has_embedding) {
        zeroDimCount++;
        auditReport.issues.push(`Missing embedding on standard ${row.is_number} (${row.canonical_id})`);
      } else if (row.embedding_dims !== 3072) {
        non3072Count++;
        auditReport.issues.push(`Non-3072 dimension (${row.embedding_dims}) on standard ${row.is_number}`);
      }

      // Check for empty or fabricated title
      if (!row.title || row.title.trim().length < 5) {
        auditReport.issues.push(`Invalid or empty title on standard ${row.is_number}`);
      }

      auditReport.records.push({
        id: row.id,
        canonical_id: row.canonical_id,
        is_number: row.is_number,
        title: row.title,
        regulatory_class: row.certification?.regulatory_class || 'UNKNOWN',
        scheme: row.certification?.scheme || 'UNKNOWN',
        mandatory: row.certification?.mandatory ?? null,
        gazette_no: row.certification?.gazette_no || null,
        is_primary_candidate: row.is_primary_candidate,
        embedding_dims: row.embedding_dims
      });
    }

    console.log(` - Primary candidates: ${primaryCount}`);
    console.log(` - Supporting references: ${supportingCount}`);
    console.log(` - Synthetic records: ${syntheticCount}`);
    console.log(` - Embedded records: ${stdsRes.rowCount - zeroDimCount}/${stdsRes.rowCount}`);
    console.log(` - 3072-dim embeddings: ${stdsRes.rowCount - non3072Count}/${stdsRes.rowCount}`);

    // Check for all-zero vectors
    const zeroVecRes = await cleanPool.query(`
      SELECT id, canonical_id, is_number 
      FROM standards 
      WHERE embedding <#> embedding = 0;
    `);
    console.log(` - All-zero vectors: ${zeroVecRes.rowCount}`);
    if (zeroVecRes.rowCount > 0) {
      auditReport.issues.push(`Found ${zeroVecRes.rowCount} all-zero vectors in standards table.`);
    }

    // 4. Standard Relationships Deep Audit
    const relsRes = await cleanPool.query(`
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

    console.log(`\n[Standard Relationships Count]: ${relsRes.rowCount}`);
    let danglingFkCount = 0;
    let selfReferencingCount = 0;

    for (const r of relsRes.rows) {
      if (r.source_standard_id && !r.s1_is) {
        danglingFkCount++;
        auditReport.issues.push(`Dangling source_standard_id ${r.source_standard_id} on relationship ${r.id}`);
      }
      if (r.target_standard_id && !r.s2_is) {
        danglingFkCount++;
        auditReport.issues.push(`Dangling target_standard_id ${r.target_standard_id} on relationship ${r.id}`);
      }
      if (r.source_standard_id && r.target_standard_id && r.source_standard_id === r.target_standard_id) {
        selfReferencingCount++;
        auditReport.issues.push(`Self-referencing relationship on standard ID ${r.source_standard_id}`);
      }

      auditReport.relationships.push({
        id: r.id,
        type: r.relationship_type,
        source: r.source_is_number || r.s1_is,
        target: r.target_is_number || r.s2_is,
        source_id: r.source_standard_id,
        target_id: r.target_standard_id,
        evidence: r.evidence?.substring(0, 80) + '...'
      });
    }

    console.log(` - Dangling foreign keys: ${danglingFkCount}`);
    console.log(` - Self-referencing edges: ${selfReferencingCount}`);

    // 5. Rollback Database Availability Verification
    console.log('\n[Rollback Database Verification]:');
    try {
      const rollbackInfo = await rollbackPool.query(`
        SELECT current_database() as db_name,
               (SELECT count(*) FROM standards) as count,
               (SELECT count(*) FROM standard_relationships) as rel_count
      `);
      const rb = rollbackInfo.rows[0];
      auditReport.rollbackDb = {
        accessible: true,
        db_name: rb.db_name,
        standards_count: parseInt(rb.count),
        relationships_count: parseInt(rb.rel_count)
      };
      console.log(` - Rollback DB '${rb.db_name}' accessible: YES`);
      console.log(` - Standards in rollback DB: ${rb.count}`);
      console.log(` - Relationships in rollback DB: ${rb.rel_count}`);
    } catch (rbErr) {
      auditReport.rollbackDb = {
        accessible: false,
        error: rbErr.message
      };
      auditReport.issues.push(`Rollback DB not accessible: ${rbErr.message}`);
      console.log(` - Rollback DB accessible: NO (${rbErr.message})`);
    }

    console.log('\n' + '='.repeat(80));
    console.log(`AUDIT ISSUES FOUND: ${auditReport.issues.length}`);
    if (auditReport.issues.length > 0) {
      auditReport.issues.forEach(iss => console.log(` [!] ${iss}`));
    } else {
      console.log(' ZERO ISSUES FOUND IN DATABASE AUDIT.');
    }
    console.log('='.repeat(80));

    return auditReport;
  } catch (err) {
    console.error('Database audit failed:', err);
    throw err;
  } finally {
    await cleanPool.end();
    await rollbackPool.end();
  }
}

if (require.main === module) {
  auditDatabase().then(report => {
    const fs = require('fs');
    fs.writeFileSync('scripts/audit_database_result.json', JSON.stringify(report, null, 2));
    process.exit(report.issues.length === 0 ? 0 : 1);
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { auditDatabase };
