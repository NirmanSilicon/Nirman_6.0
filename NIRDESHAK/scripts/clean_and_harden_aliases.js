const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  console.log('====================================================');
  console.log('PART 4: CLEAN AND HARDEN PRODUCT ALIASES');
  console.log('====================================================\n');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Add columns to product_aliases for confidence, provenance, context_keywords
    console.log('1. Altering product_aliases to add confidence, provenance, context_keywords...');
    await client.query(`
      ALTER TABLE product_aliases 
      ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(4, 3) DEFAULT 0.900,
      ADD COLUMN IF NOT EXISTS provenance VARCHAR(64) DEFAULT 'seed_catalogue',
      ADD COLUMN IF NOT EXISTS context_keywords TEXT[] DEFAULT '{}';
    `);

    // 2. Remove pure English stopwords that were mistakenly added as standalone aliases
    console.log('2. Removing meaningless standalone stopwords (AND, IS, THE, OF, FOR, IN, TO, WITH)...');
    const stopwords = ['and', 'is', 'the', 'of', 'for', 'in', 'to', 'with', 'on', 'by', 'all', 'etc'];
    const delRes = await client.query(`
      DELETE FROM product_aliases 
      WHERE LOWER(TRIM(alias_term)) = ANY($1)
      RETURNING id, alias_term, product_family_id;
    `, [stopwords]);
    console.log(`Removed ${delRes.rowCount} stopword aliases.`);

    // 3. Address over-broad standalone generic words: AUTOMOTIVE, INDUSTRIAL
    console.log('3. Refining broad single-word generic aliases (AUTOMOTIVE, INDUSTRIAL)...');
    
    const autoFamilies = await client.query(`
      SELECT pa.id, pa.product_family_id, pf.canonical_name 
      FROM product_aliases pa 
      JOIN product_families pf ON pa.product_family_id = pf.id 
      WHERE LOWER(pa.alias_term) = 'automotive';
    `);
    for (const r of autoFamilies.rows) {
      const words = r.canonical_name.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w !== 'automotive');
      const specificTerm = 'automotive ' + (words[0] || 'component');
      // Check if specificTerm already exists
      const exists = await client.query('SELECT id FROM product_aliases WHERE product_family_id = $1 AND LOWER(alias_term) = LOWER($2)', [r.product_family_id, specificTerm]);
      if (exists.rows.length > 0) {
        await client.query('DELETE FROM product_aliases WHERE id = $1', [r.id]);
      } else {
        await client.query(`
          UPDATE product_aliases 
          SET alias_term = $1, alias_type = 'composite_synonym', confidence_score = 0.920, provenance = 'hardened_composite'
          WHERE id = $2;
        `, [specificTerm, r.id]);
      }
    }
    console.log(`Processed ${autoFamilies.rowCount} generic 'automotive' aliases.`);

    const indFamilies = await client.query(`
      SELECT pa.id, pa.product_family_id, pf.canonical_name 
      FROM product_aliases pa 
      JOIN product_families pf ON pa.product_family_id = pf.id 
      WHERE LOWER(pa.alias_term) = 'industrial';
    `);
    for (const r of indFamilies.rows) {
      const words = r.canonical_name.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w !== 'industrial');
      const specificTerm = 'industrial ' + (words[0] || 'equipment');
      const exists = await client.query('SELECT id FROM product_aliases WHERE product_family_id = $1 AND LOWER(alias_term) = LOWER($2)', [r.product_family_id, specificTerm]);
      if (exists.rows.length > 0) {
        await client.query('DELETE FROM product_aliases WHERE id = $1', [r.id]);
      } else {
        await client.query(`
          UPDATE product_aliases 
          SET alias_term = $1, alias_type = 'composite_synonym', confidence_score = 0.920, provenance = 'hardened_composite'
          WHERE id = $2;
        `, [specificTerm, r.id]);
      }
    }
    console.log(`Processed ${indFamilies.rowCount} generic 'industrial' aliases.`);

    // 4. Configure context keywords for ambiguous abbreviations
    console.log('4. Hardening legitimate industry abbreviations with context keywords...');
    const abbreviations = [
      {
        term: 'SP',
        familyId: 7, // Chemical Admixtures
        context: ['concrete', 'admixture', 'cement', 'slump', 'plasticizer', 'superplasticizer', 'mortar', 'construction']
      },
      {
        term: 'SP',
        familyId: 49, // Submersible Borewell Pumpsets
        context: ['pump', 'water', 'borewell', 'submersible', 'motor', 'pumpset', 'irrigation', 'agriculture', 'well']
      },
      {
        term: 'SP',
        familyId: 71, // Smartphones
        context: ['phone', 'smartphone', 'mobile', 'cellular', 'handset', 'screen', 'device', 'android', 'ios']
      },
      {
        term: 'PV',
        familyId: 41, // Solar PV Modules
        context: ['solar', 'photovoltaic', 'module', 'panel', 'cell', 'sun', 'power', 'renewable', 'energy', 'watt']
      },
      {
        term: 'PV',
        familyId: 57, // Pressure Vessels
        context: ['pressure', 'vessel', 'boiler', 'tank', 'unfired', 'welded', 'cylinder', 'gas', 'steam']
      },
      {
        term: 'PE',
        familyId: 25, // HDPE Pipes
        context: ['polyethylene', 'pipe', 'water', 'hdpe', 'fitting', 'tubing', 'drainage', 'supply']
      },
      {
        term: 'PC',
        familyId: 68, // Desktop Computers
        context: ['computer', 'desktop', 'workstation', 'personal computer', 'cpu', 'monitor', 'keyboard', 'it']
      }
    ];

    for (const abbr of abbreviations) {
      await client.query(`
        UPDATE product_aliases 
        SET alias_type = 'abbreviation', 
            confidence_score = 0.850, 
            provenance = 'industry_abbreviation',
            context_keywords = $1
        WHERE LOWER(alias_term) = LOWER($2) AND product_family_id = $3;
      `, [abbr.context, abbr.term, abbr.familyId]);
    }
    console.log(`Configured context keywords for ${abbreviations.length} ambiguous abbreviation mappings.`);

    // 5. Add Multilingual Synonyms (Hindi & Odia) for Core Procurement Families
    console.log('5. Adding validated multilingual synonyms (Hindi & Odia)...');
    const multilingual = [
      // Helmets
      { familyId: 1, term: 'सुरक्षा हेलमेट', type: 'multilingual_hi', lang: 'hi', conf: 0.980 },
      { familyId: 1, term: 'औद्योगिक सुरक्षा शिरस्त्राण', type: 'multilingual_hi', lang: 'hi', conf: 0.950 },
      { familyId: 1, term: 'ସୁରକ୍ଷା ହେଲମେଟ', type: 'multilingual_or', lang: 'or', conf: 0.980 },
      { familyId: 2, term: 'हेलमेट दोपहिया', type: 'multilingual_hi', lang: 'hi', conf: 0.980 },
      { familyId: 2, term: 'ଦୁଇଚକିଆ ହେଲମେଟ', type: 'multilingual_or', lang: 'or', conf: 0.980 },
      // Cement
      { familyId: 8, term: 'सीमेंट', type: 'multilingual_hi', lang: 'hi', conf: 0.980 },
      { familyId: 8, term: 'ସିମେଣ୍ଟ', type: 'multilingual_or', lang: 'or', conf: 0.980 },
      { familyId: 9, term: 'पोर्टलैंड सीमेंट', type: 'multilingual_hi', lang: 'hi', conf: 0.980 },
      // Steel Rebars
      { familyId: 15, term: 'टीएमटी सरिया', type: 'multilingual_hi', lang: 'hi', conf: 0.980 },
      { familyId: 15, term: 'ରିବାର ଷ୍ଟିଲ୍', type: 'multilingual_or', lang: 'or', conf: 0.980 },
      // Cables
      { familyId: 30, term: 'बिजली का तार', type: 'multilingual_hi', lang: 'hi', conf: 0.980 },
      { familyId: 30, term: 'ବିଦ୍ୟୁତ ତାର', type: 'multilingual_or', lang: 'or', conf: 0.980 },
      // Drinking Water
      { familyId: 58, term: 'पीने का पानी', type: 'multilingual_hi', lang: 'hi', conf: 0.980 },
      { familyId: 58, term: 'ପିଇବା ପାଣି', type: 'multilingual_or', lang: 'or', conf: 0.980 },
      // Water Pumps
      { familyId: 49, term: 'सबमर्सिबल पंप', type: 'multilingual_hi', lang: 'hi', conf: 0.980 },
      { familyId: 49, term: 'ସବମର୍ସିବଲ ପମ୍ପ', type: 'multilingual_or', lang: 'or', conf: 0.980 }
    ];

    for (const m of multilingual) {
      await client.query(`
        INSERT INTO product_aliases (product_family_id, alias_term, alias_type, confidence_score, provenance)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (product_family_id, alias_term) DO UPDATE 
        SET alias_type = EXCLUDED.alias_type,
            confidence_score = EXCLUDED.confidence_score,
            provenance = EXCLUDED.provenance;
      `, [m.familyId, m.term, m.type, m.conf, `multilingual_${m.lang}`]);
    }
    console.log(`Added/Updated ${multilingual.length} validated Hindi and Odia synonyms.`);

    await client.query('COMMIT');
    console.log('\n✅ PART 4 COMPLETE: Product aliases successfully cleaned, contextualized and hardened.');

    // Print summary stats
    const totalAliases = await client.query('SELECT count(*) FROM product_aliases');
    const aliasTypes = await client.query('SELECT alias_type, count(*) FROM product_aliases GROUP BY alias_type ORDER BY count(*) DESC');
    console.log('\nUpdated Total Product Aliases:', totalAliases.rows[0].count);
    console.table(aliasTypes.rows);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in Part 4:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
