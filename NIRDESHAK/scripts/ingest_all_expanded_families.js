/**
 * Complete Universal Product Families Ingestion
 * Expands product_families to 1,000+ across all 17 BIS Division Councils.
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const { NEW_FAMILIES: ayushFamilies } = require('./expansion/families_data');
const { CHD_FAMILIES } = require('./expansion/families_batch_chemical');
const { CED_FAMILIES, LITD_FAMILIES, ETD_FAMILIES } = require('./expansion/families_batch_infrastructure');
const { MED_FAMILIES, MTD_FAMILIES, PGD_FAMILIES, PCD_FAMILIES } = require('./expansion/families_batch_manufacturing');
const { MHD_FAMILIES, FAD_FAMILIES, TXD_FAMILIES, TED_FAMILIES, EED_FAMILIES, WRD_FAMILIES, MSD_FAMILIES, SSD_FAMILIES } = require('./expansion/families_batch_consumer_life');

// Helper to convert items to full family objects
function prepareBatch(items, sectorId, councilCode, councilName) {
  return items.map((item, idx) => {
    const slug = item.name.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 32);
    const code = `FAM_${councilCode}_${slug}_${idx + 1}`;
    
    // Auto aliases from synonyms and name
    const aliases = [
      { term: item.name.toLowerCase(), type: "canonical", confidence: 1.0, provenance: "curated" },
      ...(item.syns || []).map(s => ({ term: s.toLowerCase(), type: "synonym", confidence: 0.9, provenance: "industry_expansion" }))
    ];

    return {
      family_code: code,
      canonical_name: item.name,
      category_id: item.catId,
      sector_id: sectorId,
      division_council: councilName,
      subcategory: item.subcat,
      description: item.desc,
      applications: item.apps,
      technical_keywords: item.keywords || [item.name.toLowerCase()],
      common_synonyms: item.syns || [],
      industry_terminology: [item.subcat],
      alternate_names: item.syns || [],
      common_abbreviations: [],
      aliases
    };
  });
}

// Ingest script
async function run() {
  console.log('Preparing all council family collections...');

  const allBatches = [
    // Sector 1: AYUSH (25)
    ...ayushFamilies,
    // Sector 2: Chemical (35)
    ...prepareBatch(CHD_FAMILIES, 2, "CHD", "Chemical"),
    // Sector 3: Civil Engineering (50)
    ...prepareBatch(CED_FAMILIES, 3, "CED", "Civil Engineering"),
    // Sector 4: Electronics & IT (35)
    ...prepareBatch(LITD_FAMILIES, 4, "LITD", "Electronics and Information Technology"),
    // Sector 5: Electrotechnical (50)
    ...prepareBatch(ETD_FAMILIES, 5, "ETD", "Electrotechnical"),
    // Sector 6: Environment & Ecology (20)
    ...prepareBatch(EED_FAMILIES, 6, "EED", "Environment and Ecology"),
    // Sector 7: Food & Agriculture (35)
    ...prepareBatch(FAD_FAMILIES, 7, "FAD", "Food and Agriculture"),
    // Sector 8: Management & Systems (15)
    ...prepareBatch(MSD_FAMILIES, 8, "MSD", "Management and Systems"),
    // Sector 9: Mechanical Engineering (45)
    ...prepareBatch(MED_FAMILIES, 9, "MED", "Mechanical Engineering"),
    // Sector 10: Medical Equipment (25)
    ...prepareBatch(MHD_FAMILIES, 10, "MHD", "Medical Equipment and Hospital Planning"),
    // Sector 11: Metallurgy (35)
    ...prepareBatch(MTD_FAMILIES, 11, "MTD", "Metallurgical Engineering"),
    // Sector 12: Petroleum & Coal (25)
    ...prepareBatch(PCD_FAMILIES, 12, "PCD", "Petroleum, Coal and Related Products"),
    // Sector 13: Production & General Engineering (25)
    ...prepareBatch(PGD_FAMILIES, 13, "PGD", "Production and General Engineering"),
    // Sector 14: Service Sector (15)
    ...prepareBatch(SSD_FAMILIES, 14, "SSD", "Service Sector"),
    // Sector 15: Textiles (30)
    ...prepareBatch(TXD_FAMILIES, 15, "TXD", "Textiles"),
    // Sector 16: Transport (30)
    ...prepareBatch(TED_FAMILIES, 16, "TED", "Transport Engineering"),
    // Sector 17: Water Resources (20)
    ...prepareBatch(WRD_FAMILIES, 17, "WRD", "Water Resources")
  ];

  console.log(`Total curated families in expansion pool: ${allBatches.length}`);

  let insertedFam = 0;
  let skippedFam = 0;
  let insertedAlias = 0;

  for (const f of allBatches) {
    if (!f.family_code || !f.canonical_name) continue;

    const existRes = await pool.query('SELECT id FROM product_families WHERE family_code = $1', [f.family_code]);
    let famId;
    if (existRes.rows.length > 0) {
      famId = existRes.rows[0].id;
      skippedFam++;
    } else {
      const insRes = await pool.query(`
        INSERT INTO product_families (
          family_code, canonical_name, category_id, sector_id, division_council,
          subcategory, description, applications, technical_keywords, common_synonyms,
          industry_terminology, alternate_names, common_abbreviations, coverage_status, source
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        ) RETURNING id
      `, [
        f.family_code,
        f.canonical_name,
        f.category_id || 1,
        f.sector_id || 3,
        f.division_council || 'Civil Engineering',
        f.subcategory || null,
        f.description || null,
        f.applications || null,
        JSON.stringify(f.technical_keywords || []),
        JSON.stringify(f.common_synonyms || []),
        JSON.stringify(f.industry_terminology || []),
        JSON.stringify(f.alternate_names || []),
        JSON.stringify(f.common_abbreviations || []),
        'DISCOVERED_CATALOGUE_ONLY',
        'BIS Universal Product Catalogue Expansion 2026'
      ]);
      famId = insRes.rows[0].id;
      insertedFam++;
    }

    // Ingest aliases
    if (f.aliases && f.aliases.length > 0) {
      for (const a of f.aliases) {
        if (!a.term || !a.term.trim()) continue;
        const existAlias = await pool.query(
          'SELECT id FROM product_aliases WHERE product_family_id = $1 AND lower(alias_term) = lower($2)',
          [famId, a.term.trim()]
        );
        if (existAlias.rows.length === 0) {
          await pool.query(`
            INSERT INTO product_aliases (
              product_family_id, alias_term, alias_type, confidence_score, provenance, context_keywords
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            famId,
            a.term.trim(),
            a.type || 'synonym',
            a.confidence || 0.9,
            a.provenance || 'curated_expansion',
            f.technical_keywords || []
          ]);
          insertedAlias++;
        }
      }
    }
  }

  console.log(`\n--- FAMILY INGESTION COMPLETE ---`);
  console.log(`Newly inserted families: ${insertedFam}`);
  console.log(`Existing skipped families: ${skippedFam}`);
  console.log(`Newly inserted aliases: ${insertedAlias}`);

  const totalFamRes = await pool.query('SELECT count(*) as count FROM product_families');
  const totalAliasRes = await pool.query('SELECT count(*) as count FROM product_aliases');
  console.log(`\nTotal product families in DB now: ${totalFamRes.rows[0].count}`);
  console.log(`Total product aliases in DB now: ${totalAliasRes.rows[0].count}`);

  const councilStats = await pool.query(`
    SELECT division_council, count(*) as count 
    FROM product_families 
    GROUP BY division_council 
    ORDER BY count DESC
  `);
  console.table(councilStats.rows);

  await pool.end();
}

run().catch(err => {
  console.error('Fatal ingestion error:', err);
  pool.end();
});
