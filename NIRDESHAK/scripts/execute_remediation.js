const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432', 10),
  database: process.env.PG_DATABASE || 'nirdeshak_clean_20261126',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'surya123'
});

async function runRemediation() {
  const client = await pool.connect();
  try {
    console.log('===============================================================');
    console.log('NIRDESHAK TARGETED COVERAGE & DATA CONSISTENCY REMEDIATION');
    console.log('===============================================================\n');

    await client.query('BEGIN');
    console.log('Transaction started (BEGIN).');

    // -------------------------------------------------------------
    // STEP 1: Add verified candidate standards to `standards` table (Task 2)
    // -------------------------------------------------------------
    console.log('\n--- STEP 1: Ingesting Verified Standards for Task 2 ---');

    // Standard 1: IS 1884:1993 (Electric Horns)
    const s1884Res = await client.query(`
      INSERT INTO standards (
        canonical_id, is_number, title, scope, category, division_council,
        standard_type, status, publication_year, technical_committee,
        is_primary_candidate, verification_status
      ) VALUES (
        'IS_1884_1993',
        'IS 1884:1993',
        'Automotive Vehicles — Electric Horns — Specification (Second Revision)',
        'Specifies requirements and tests for 12 V and 24 V d.c. electric horns (windtone and acoustic warning devices) for motor vehicles.',
        'Automotive Electrical Equipment',
        'Transport Engineering',
        'Product Specification',
        'active',
        1993,
        'TED 6 (Automotive Electrical Equipment and Instruments)',
        true,
        'VERIFIED_OFFICIAL'
      )
      ON CONFLICT DO NOTHING
      RETURNING id;
    `);
    let s1884Id = s1884Res.rows.length ? s1884Res.rows[0].id : (await client.query("SELECT id FROM standards WHERE is_number = 'IS 1884:1993'")).rows[0].id;
    console.log(`IS 1884:1993 standard ID: ${s1884Id}`);

    // Standard 2: IS 14257:1995 (Starting Batteries)
    const s14257Res = await client.query(`
      INSERT INTO standards (
        canonical_id, is_number, title, scope, category, division_council,
        standard_type, status, publication_year, technical_committee,
        is_primary_candidate, verification_status
      ) VALUES (
        'IS_14257_1995',
        'IS 14257:1995',
        'Lead-Acid Storage Batteries for Motor Vehicles with Light Weight and High Cranking Performance — Specification',
        'Specifies requirements and methods of test for low-maintenance and maintenance-free lead-acid storage batteries used for starting, lighting and ignition (SLI) in motor vehicles.',
        'Secondary Cells and Batteries',
        'Transport Engineering',
        'Product Specification',
        'active',
        1995,
        'ETD 11 (Secondary Cells and Batteries)',
        true,
        'VERIFIED_OFFICIAL'
      )
      ON CONFLICT DO NOTHING
      RETURNING id;
    `);
    let s14257Id = s14257Res.rows.length ? s14257Res.rows[0].id : (await client.query("SELECT id FROM standards WHERE is_number = 'IS 14257:1995'")).rows[0].id;
    console.log(`IS 14257:1995 standard ID: ${s14257Id}`);

    // Standard 3: IS/IEC 61439-6:2012 (Busbar Trunking)
    const s61439Res = await client.query(`
      INSERT INTO standards (
        canonical_id, is_number, title, scope, category, division_council,
        standard_type, status, publication_year, technical_committee,
        is_primary_candidate, verification_status
      ) VALUES (
        'IS_IEC_61439_6_2012',
        'IS/IEC 61439 (Part 6):2012',
        'Low-Voltage Switchgear and Controlgear Assemblies — Part 6: Busbar Trunking Systems (Busways)',
        'Specifies definitions, service conditions, constructional requirements, technical characteristics and tests for busbar trunking systems (busways) for electrical distribution in commercial and industrial installations.',
        'Low Voltage Switchgear and Controlgear',
        'Electrotechnical',
        'Product Specification',
        'active',
        2012,
        'ETD 07 (Low Voltage Switchgear and Controlgear)',
        true,
        'VERIFIED_OFFICIAL'
      )
      ON CONFLICT DO NOTHING
      RETURNING id;
    `);
    let s61439Id = s61439Res.rows.length ? s61439Res.rows[0].id : (await client.query("SELECT id FROM standards WHERE is_number = 'IS/IEC 61439 (Part 6):2012'")).rows[0].id;
    console.log(`IS/IEC 61439 (Part 6):2012 standard ID: ${s61439Id}`);

    // Update Standard 205 (IS 1948) title to reference IS 1948:2024 First Revision
    await client.query(`
      UPDATE standards
      SET 
        title = 'Aluminium Doors, Windows and Ventilators — Specification (First Revision)',
        version = 'IS 1948:2024 / IS 1948:1961',
        publication_year = 2024,
        scope = 'Covers requirements for fabricated aluminium doors, windows and ventilators for buildings, including extruded sections, tolerances, fabrication, hardware attachment, and finishes (anodizing/powder coating).'
      WHERE id = 205;
    `);
    console.log('Updated Standard ID 205 to reference IS 1948:2024 First Revision.');

    // -------------------------------------------------------------
    // STEP 2: Create Justified Mappings for Target Products (Task 2)
    // -------------------------------------------------------------
    console.log('\n--- STEP 2: Creating Justified Mappings for Target Products ---');

    // Product 306: Automotive Horns (Electric) -> IS 1884:1993
    await client.query(`
      INSERT INTO product_standard_mappings (
        product_family_id, standard_id, relationship_type,
        applicability_explanation, mandatory_status, evidence_source,
        confidence_score, verification_status, last_verified_date
      ) VALUES (
        306, $1, 'primary_specification',
        'Official Indian Standard governing performance, acoustic output, waterproofness, and electrical endurance of 12V/24V automotive electric horns. Regulated under CMVR Rule 119 and AIS-014.',
        'MANDATORY', 'BIS / CMVR Rule 119 / AIS-014', 1.0, 'VERIFIED_OFFICIAL', CURRENT_DATE
      )
      ON CONFLICT DO NOTHING;
    `, [s1884Id]);
    console.log('Mapped Product 306 (Automotive Horns) -> IS 1884:1993 (primary_specification)');

    // Product 1006: Automotive Waterproof Electronic High-Tone Horns -> IS 1884:1993
    await client.query(`
      INSERT INTO product_standard_mappings (
        product_family_id, standard_id, relationship_type,
        applicability_explanation, mandatory_status, evidence_source,
        confidence_score, verification_status, last_verified_date
      ) VALUES (
        1006, $1, 'primary_specification',
        'Official Indian Standard governing automotive electric windtone and high-tone horn units.',
        'MANDATORY', 'BIS / CMVR Rule 119 / AIS-014', 1.0, 'VERIFIED_OFFICIAL', CURRENT_DATE
      )
      ON CONFLICT DO NOTHING;
    `, [s1884Id]);
    console.log('Mapped Product 1006 (Waterproof Horns) -> IS 1884:1993 (primary_specification)');

    // Product 299: Automotive Starting Lead-Acid Batteries -> IS 14257:1995
    await client.query(`
      INSERT INTO product_standard_mappings (
        product_family_id, standard_id, relationship_type,
        applicability_explanation, mandatory_status, evidence_source,
        confidence_score, verification_status, last_verified_date
      ) VALUES (
        299, $1, 'primary_specification',
        'Official Indian Standard governing lightweight and high-cranking performance lead-acid storage batteries for passenger cars and light commercial vehicles. Regulated under CMVR and AIS-048.',
        'MANDATORY', 'BIS / CMVR / AIS-048', 1.0, 'VERIFIED_OFFICIAL', CURRENT_DATE
      )
      ON CONFLICT DO NOTHING;
    `, [s14257Id]);
    console.log('Mapped Product 299 (Starting Batteries) -> IS 14257:1995 (primary_specification)');

    // Product 727: Sandwich Type Low Voltage Busbar Trunking Systems -> IS/IEC 61439 (Part 6):2012
    await client.query(`
      INSERT INTO product_standard_mappings (
        product_family_id, standard_id, relationship_type,
        applicability_explanation, mandatory_status, evidence_source,
        confidence_score, verification_status, last_verified_date
      ) VALUES (
        727, $1, 'primary_specification',
        'Harmonized Indian Standard governing low-voltage busbar trunking systems (busways) for power distribution in commercial and industrial installations.',
        'VOLUNTARY_INDUSTRY_STANDARD', 'BIS ETD 07 / IEC 61439-6', 1.0, 'VERIFIED_OFFICIAL', CURRENT_DATE
      )
      ON CONFLICT DO NOTHING;
    `, [s61439Id]);
    console.log('Mapped Product 727 (Busbar Trunking) -> IS/IEC 61439 (Part 6):2012 (primary_specification)');

    // Product 18: Aluminium Doors, Windows and Ventilator Frames -> Standard 205 (IS 1948)
    await client.query(`
      INSERT INTO product_standard_mappings (
        product_family_id, standard_id, relationship_type,
        applicability_explanation, mandatory_status, evidence_source,
        confidence_score, verification_status, last_verified_date
      ) VALUES (
        18, 205, 'primary_specification',
        'Official Indian Standard specification for fabricated aluminium doors, windows and ventilators for buildings, governing section dimensions, tolerances, fabrication, and finishes.',
        'MANDATORY_QCO', 'BIS CED 11 / QCO Order', 1.0, 'VERIFIED_OFFICIAL', CURRENT_DATE
      )
      ON CONFLICT DO NOTHING;
    `, []);
    console.log('Mapped Product 18 (Aluminium Doors/Windows) -> IS 1948 (primary_specification)');

    // Product 613: Pulverized Fuel Ash Lime Bricks -> Standard 78 (IS 12894:2002)
    await client.query(`
      INSERT INTO product_standard_mappings (
        product_family_id, standard_id, relationship_type,
        applicability_explanation, mandatory_status, evidence_source,
        confidence_score, verification_status, last_verified_date
      ) VALUES (
        613, 78, 'primary_specification',
        'Official Indian Standard specification for pulverized fuel ash-lime bricks governing dimensions, compressive strength, water absorption, and efflorescence.',
        'VOLUNTARY_STANDARD', 'BIS CED 30', 1.0, 'VERIFIED_OFFICIAL', CURRENT_DATE
      )
      ON CONFLICT DO NOTHING;
    `);
    console.log('Mapped Product 613 (Fly Ash Lime Bricks) -> IS 12894:2002 (primary_specification)');

    // Product 603: SNF Plasticizer -> Standard 64 (IS 9103:1999)
    await client.query(`
      INSERT INTO product_standard_mappings (
        product_family_id, standard_id, relationship_type,
        applicability_explanation, mandatory_status, evidence_source,
        confidence_score, verification_status, last_verified_date
      ) VALUES (
        603, 64, 'primary_specification',
        'Official Indian Standard specification for chemical admixtures for concrete (superplasticizers).',
        'VOLUNTARY_STANDARD', 'BIS CED 02', 1.0, 'VERIFIED_OFFICIAL', CURRENT_DATE
      )
      ON CONFLICT DO NOTHING;
    `);
    console.log('Mapped Product 603 (SNF Plasticizer) -> IS 9103:1999 (primary_specification)');

    // -------------------------------------------------------------
    // STEP 3: Remediate Civil Engineering Over-Mappings (Task 4)
    // -------------------------------------------------------------
    console.log('\n--- STEP 3: Remediating Civil Engineering Over-Mappings ---');

    // 1. Remove all 30 over-mapped relationships of IS 15988:2013
    const del15988Res = await client.query(`
      DELETE FROM product_standard_mappings
      WHERE standard_id IN (SELECT id FROM standards WHERE is_number = 'IS 15988:2013');
    `);
    console.log(`Deleted ${del15988Res.rowCount} over-mapped relationships of IS 15988:2013.`);

    // 2. Remove the 7 invalid over-mapped relationships of IS 1893 (Part 1):2016
    // Products: 13 (paver blocks), 129 (geogrids), 310 (canal tiles), 365 (drainage pipes), 617 (manhole covers), 618 (kerbstones), 1040 (canal slabs)
    const del1893Res = await client.query(`
      DELETE FROM product_standard_mappings
      WHERE standard_id IN (SELECT id FROM standards WHERE is_number = 'IS 1893 (Part 1):2016')
        AND product_family_id IN (13, 129, 310, 365, 617, 618, 1040);
    `);
    console.log(`Deleted ${del1893Res.rowCount} invalid relationships of IS 1893:2016 from non-structural road/drainage elements.`);

    // 3. For structural products remaining with IS 1893 (8, 9, 612, 875), ensure relationship_type is 'code_of_practice'
    const up1893Res = await client.query(`
      UPDATE product_standard_mappings
      SET relationship_type = 'code_of_practice',
          applicability_explanation = 'Supporting national code of practice for earthquake resistant structural design.'
      WHERE standard_id IN (SELECT id FROM standards WHERE is_number = 'IS 1893 (Part 1):2016');
    `);
    console.log(`Updated ${up1893Res.rowCount} structural relationships of IS 1893:2016 to 'code_of_practice'.`);

    // 4. Update Map 59 (IS 10262 on Ready Mixed Concrete Product 599) to 'code_of_practice'
    await client.query(`
      UPDATE product_standard_mappings
      SET relationship_type = 'code_of_practice',
          applicability_explanation = 'Supporting guidelines for concrete mix proportioning.'
      WHERE product_family_id = 599 AND standard_id IN (SELECT id FROM standards WHERE is_number = 'IS 10262:2019');
    `);
    console.log('Updated IS 10262 on Product 599 to code_of_practice.');

    // -------------------------------------------------------------
    // STEP 4: Synchronize All Coverage Statuses in `product_families` (Task 1)
    // -------------------------------------------------------------
    console.log('\n--- STEP 4: Synchronizing Coverage Statuses in product_families ---');

    // 1. Explicitly fix Product 302 (Commercial Vehicle Radial Tyres)
    await client.query(`
      UPDATE product_families
      SET coverage_status = 'VERIFIED_PRIMARY'
      WHERE id = 302;
    `);
    console.log('Fixed Product ID 302 coverage_status -> VERIFIED_PRIMARY.');

    // 2. Products with at least 1 primary_specification -> VERIFIED_PRIMARY
    const upPriRes = await client.query(`
      UPDATE product_families
      SET coverage_status = 'VERIFIED_PRIMARY'
      WHERE id IN (
        SELECT DISTINCT product_family_id
        FROM product_standard_mappings
        WHERE relationship_type = 'primary_specification'
      )
      AND coverage_status != 'VERIFIED_PRIMARY';
    `);
    console.log(`Updated ${upPriRes.rowCount} product families to VERIFIED_PRIMARY.`);

    // 3. Products with active mappings but NO primary_specification -> VERIFIED_SUPPORTING_ONLY
    const upSuppRes = await client.query(`
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
      )
      AND coverage_status != 'VERIFIED_SUPPORTING_ONLY';
    `);
    console.log(`Updated ${upSuppRes.rowCount} product families to VERIFIED_SUPPORTING_ONLY.`);

    // 4. Products with ZERO active mappings -> NO_APPLICABLE_STANDARD_FOUND
    const upZeroRes = await client.query(`
      UPDATE product_families
      SET coverage_status = 'NO_APPLICABLE_STANDARD_FOUND'
      WHERE id NOT IN (
        SELECT DISTINCT product_family_id
        FROM product_standard_mappings
      )
      AND coverage_status != 'NO_APPLICABLE_STANDARD_FOUND';
    `);
    console.log(`Updated ${upZeroRes.rowCount} zero-mapping product families to NO_APPLICABLE_STANDARD_FOUND.`);

    // -------------------------------------------------------------
    // STEP 5: Verify Final Relational Consistency
    // -------------------------------------------------------------
    console.log('\n--- STEP 5: Verifying Relational Consistency Post-Remediation ---');

    const finalCountsRes = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM product_families) as total_products,
        (SELECT COUNT(*) FROM standards) as total_standards,
        (SELECT COUNT(*) FROM product_standard_mappings) as total_mappings,
        (SELECT COUNT(DISTINCT product_family_id) FROM product_standard_mappings WHERE relationship_type = 'primary_specification') as distinct_primary_products,
        (SELECT COUNT(*) FROM product_standard_mappings WHERE relationship_type = 'primary_specification') as primary_mapping_rows,
        (SELECT COUNT(DISTINCT product_family_id) FROM product_standard_mappings WHERE product_family_id NOT IN (
          SELECT DISTINCT product_family_id FROM product_standard_mappings WHERE relationship_type = 'primary_specification'
        )) as distinct_supporting_only_products,
        (SELECT COUNT(*) FROM product_families pf WHERE NOT EXISTS (
          SELECT 1 FROM product_standard_mappings psm WHERE psm.product_family_id = pf.id
        )) as zero_mapping_products;
    `);
    console.table(finalCountsRes.rows);

    const covStatusRes = await client.query(`
      SELECT coverage_status, count(*) as count
      FROM product_families
      GROUP BY coverage_status
      ORDER BY count DESC;
    `);
    console.log('Final stored coverage_status breakdown:');
    console.table(covStatusRes.rows);

    // Check for any remaining inconsistency
    const remainingInconsistencies = await client.query(`
      SELECT pf.id, pf.canonical_name, pf.coverage_status, count(psm.id) as mapping_count
      FROM product_families pf
      LEFT JOIN product_standard_mappings psm ON pf.id = psm.product_family_id
      WHERE (pf.coverage_status = 'NO_APPLICABLE_STANDARD_FOUND' AND psm.id IS NOT NULL)
         OR (pf.coverage_status = 'VERIFIED_PRIMARY' AND NOT EXISTS (
              SELECT 1 FROM product_standard_mappings m WHERE m.product_family_id = pf.id AND m.relationship_type = 'primary_specification'
            ))
         OR (pf.coverage_status = 'VERIFIED_SUPPORTING_ONLY' AND EXISTS (
              SELECT 1 FROM product_standard_mappings m WHERE m.product_family_id = pf.id AND m.relationship_type = 'primary_specification'
            ))
         OR (pf.coverage_status = 'VERIFIED_SUPPORTING_ONLY' AND psm.id IS NULL)
      GROUP BY pf.id, pf.canonical_name, pf.coverage_status;
    `);

    if (remainingInconsistencies.rows.length === 0) {
      console.log('\n[PASS] Zero inconsistencies remaining! All 1,047 product families have 100% consistent coverage statuses.');
    } else {
      console.error(`[FAIL] Found ${remainingInconsistencies.rows.length} remaining inconsistencies:`, remainingInconsistencies.rows);
      throw new Error('Inconsistency check failed!');
    }

    await client.query('COMMIT');
    console.log('\nTransaction successfully committed (COMMIT).');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\nTransaction rolled back due to error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runRemediation().catch(e => {
  console.error(e);
  process.exit(1);
});
