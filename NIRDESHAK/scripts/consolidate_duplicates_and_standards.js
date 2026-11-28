const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432', 10),
  database: process.env.PG_DATABASE || 'nirdeshak_clean_20261126',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'surya123'
});

async function mergePair(client, canonicalId, duplicateId) {
  const p1Res = await client.query('SELECT * FROM product_families WHERE id = $1', [canonicalId]);
  const p2Res = await client.query('SELECT * FROM product_families WHERE id = $1', [duplicateId]);

  if (p1Res.rows.length === 0 || p2Res.rows.length === 0) {
    console.log(`Pair (${canonicalId}, ${duplicateId}) - one or both records already absent.`);
    return;
  }

  const p1 = p1Res.rows[0];
  const p2 = p2Res.rows[0];

  function mergeArrays(a, b) {
    const arr1 = Array.isArray(a) ? a : [];
    const arr2 = Array.isArray(b) ? b : [];
    return [...new Set([...arr1, ...arr2])];
  }

  const mergedSynonyms = mergeArrays(p1.common_synonyms, p2.common_synonyms);
  const mergedKeywords = mergeArrays(p1.technical_keywords, p2.technical_keywords);
  const mergedAltNames = mergeArrays(p1.alternate_names, p2.alternate_names);
  const mergedIndustry = mergeArrays(p1.industry_terminology, p2.industry_terminology);
  const mergedAbbr = mergeArrays(p1.common_abbreviations, p2.common_abbreviations);

  let mergedDesc = p1.description || p2.description;
  let mergedApps = p1.applications || p2.applications;

  // Update canonical record
  await client.query(`
    UPDATE product_families
    SET 
      common_synonyms = $1::jsonb,
      technical_keywords = $2::jsonb,
      alternate_names = $3::jsonb,
      industry_terminology = $4::jsonb,
      common_abbreviations = $5::jsonb,
      description = $6,
      applications = $7,
      updated_at = NOW()
    WHERE id = $8;
  `, [
    JSON.stringify(mergedSynonyms),
    JSON.stringify(mergedKeywords),
    JSON.stringify(mergedAltNames),
    JSON.stringify(mergedIndustry),
    JSON.stringify(mergedAbbr),
    mergedDesc,
    mergedApps,
    canonicalId
  ]);

  // Remove duplicate mappings on duplicateId
  await client.query('DELETE FROM product_standard_mappings WHERE product_family_id = $1', [duplicateId]);

  // Remove duplicate product family row
  await client.query('DELETE FROM product_families WHERE id = $1', [duplicateId]);
  console.log(`Successfully merged duplicate Product ID ${duplicateId} into canonical Product ID ${canonicalId} ("${p1.canonical_name}").`);
}

async function main() {
  const client = await pool.connect();
  try {
    console.log('========================================================================');
    console.log('CONSOLIDATING 6 DUPLICATE PAIRS & INGESTING IS 8042 (WHITE CEMENT)');
    console.log('========================================================================\n');

    await client.query('BEGIN');

    // 1. Ingest IS 8042:2015 for White Portland Cement
    console.log('--- Step 1: Ingesting IS 8042:2015 for White Portland Cement ---');
    const s8042Res = await client.query(`
      INSERT INTO standards (
        canonical_id, is_number, title, scope, category, division_council,
        standard_type, status, publication_year, technical_committee,
        is_primary_candidate, verification_status
      ) VALUES (
        'IS_8042_2015',
        'IS 8042:2015',
        'White Portland Cement — Specification (Third Revision)',
        'Covers the requirements for manufacture and chemical and physical requirements of white Portland cement used for decorative and architectural concrete finishes, terrazzo, and masonry mortar.',
        'Cement and Hydraulic Binders',
        'Civil Engineering',
        'Product Specification',
        'active',
        2015,
        'CED 02 (Cement and Concrete)',
        true,
        'VERIFIED_OFFICIAL'
      )
      ON CONFLICT DO NOTHING
      RETURNING id;
    `);
    const s8042Id = s8042Res.rows.length ? s8042Res.rows[0].id : (await client.query("SELECT id FROM standards WHERE is_number = 'IS 8042:2015'")).rows[0].id;
    console.log(`IS 8042:2015 standard ID: ${s8042Id}`);

    // Map IS 8042:2015 as primary specification to Product 4 (White Portland Cement)
    await client.query(`
      INSERT INTO product_standard_mappings (
        product_family_id, standard_id, relationship_type,
        applicability_explanation, mandatory_status, evidence_source,
        confidence_score, verification_status, last_verified_date
      ) VALUES (
        4, $1, 'primary_specification',
        'Official Indian Standard specification governing chemical composition, physical properties, whiteness, and compressive strength of White Portland Cement. Mandatory under Cement (Quality Control) Order.',
        'MANDATORY_QCO', 'BIS CED 02 / Cement (Quality Control) Order', 1.0, 'VERIFIED_OFFICIAL', CURRENT_DATE
      )
      ON CONFLICT DO NOTHING;
    `, [s8042Id]);
    console.log('Mapped IS 8042:2015 as primary specification to Product 4 (White Portland Cement).');

    // Transfer IS 4926:2003 from 599 to Product 6 before merge
    console.log('\n--- Step 2: Transferring IS 4926 from 599 to Product 6 ---');
    const s4926Res = await client.query("SELECT id FROM standards WHERE is_number = 'IS 4926:2003'");
    if (s4926Res.rows.length > 0) {
      const s4926Id = s4926Res.rows[0].id;
      // Check if Product 6 already has IS 4926
      const hasMap = await client.query("SELECT id FROM product_standard_mappings WHERE product_family_id = 6 AND standard_id = $1", [s4926Id]);
      if (hasMap.rows.length === 0) {
        await client.query("UPDATE product_standard_mappings SET product_family_id = 6 WHERE product_family_id = 599 AND standard_id = $1", [s4926Id]);
        console.log('Transferred IS 4926:2003 mapping from 599 to 6.');
      }
    }

    // Merge the 6 pairs
    console.log('\n--- Step 3: Executing Safe Merges for the 6 Pairs ---');
    await mergePair(client, 12, 611); // AAC Blocks
    await mergePair(client, 3, 593);   // Portland Slag Cement
    await mergePair(client, 6, 599);   // Ready-Mixed Concrete
    await mergePair(client, 4, 597);   // White Portland Cement
    await mergePair(client, 388, 819); // Hydraulic Hand Pallet Trucks
    await mergePair(client, 339, 790); // Business Continuity

    // Re-synchronize all coverage statuses
    console.log('\n--- Step 4: Re-synchronizing Coverage Statuses ---');
    await client.query(`
      UPDATE product_families
      SET coverage_status = 'VERIFIED_PRIMARY'
      WHERE id IN (
        SELECT DISTINCT product_family_id
        FROM product_standard_mappings
        WHERE relationship_type = 'primary_specification'
      );
    `);
    await client.query(`
      UPDATE product_families
      SET coverage_status = 'VERIFIED_SUPPORTING_ONLY'
      WHERE id IN (
        SELECT DISTINCT product_family_id
        FROM product_standard_mappings
      )
      AND id NOT IN (
        SELECT DISTINCT product_family_id
        FROM product_standard_mappings
        WHERE relationship_type = 'primary_specification'
      );
    `);
    await client.query(`
      UPDATE product_families
      SET coverage_status = 'NO_APPLICABLE_STANDARD_FOUND'
      WHERE id NOT IN (
        SELECT DISTINCT product_family_id
        FROM product_standard_mappings
      );
    `);

    // Verify final counts
    const pfCount = (await client.query('SELECT count(*) FROM product_families')).rows[0].count;
    const stdCount = (await client.query('SELECT count(*) FROM standards')).rows[0].count;
    const psmCount = (await client.query('SELECT count(*) FROM product_standard_mappings')).rows[0].count;
    const priProds = (await client.query("SELECT count(DISTINCT product_family_id) FROM product_standard_mappings WHERE relationship_type = 'primary_specification'")).rows[0].count;
    const suppProds = (await client.query("SELECT count(DISTINCT product_family_id) FROM product_standard_mappings WHERE product_family_id NOT IN (SELECT DISTINCT product_family_id FROM product_standard_mappings WHERE relationship_type = 'primary_specification')")).rows[0].count;
    const zeroProds = (await client.query("SELECT count(*) FROM product_families pf WHERE NOT EXISTS (SELECT 1 FROM product_standard_mappings psm WHERE psm.product_family_id = pf.id)")).rows[0].count;

    console.log('\nPost-Consolidation Live Metrics:');
    console.log(`Total Product Families: ${pfCount} (Target: 1041)`);
    console.log(`Total Indian Standards: ${stdCount} (Target: 714)`);
    console.log(`Total Mappings: ${psmCount}`);
    console.log(`Distinct Primary Products: ${priProds}`);
    console.log(`Distinct Supporting-Only Products: ${suppProds}`);
    console.log(`Zero-Mapping Products: ${zeroProds}`);

    if (parseInt(pfCount) === 1041 && parseInt(stdCount) === 714) {
      console.log('\n[PASS] Validation checks passed perfectly.');
      await client.query('COMMIT');
      console.log('Transaction COMMITTED successfully.');
    } else {
      throw new Error(`Counts mismatch! Expected 1041 products and 714 standards, got ${pfCount} and ${stdCount}`);
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during consolidation, ROLLED BACK:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
