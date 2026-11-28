const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkCrossCouncil() {
  console.log('Auditing Cross-Council Mappings...\n');

  const res = await pool.query(`
    SELECT psm.id as mapping_id,
           pf.id as product_id, pf.canonical_name as product_name, pf.division_council as product_council,
           s.id as standard_id, s.is_number, s.title as standard_title, s.division_council as standard_council,
           psm.relationship_type, psm.applicability_explanation
    FROM product_standard_mappings psm
    JOIN product_families pf ON psm.product_family_id = pf.id
    JOIN standards s ON psm.standard_id = s.id
    WHERE LOWER(pf.division_council) != LOWER(s.division_council)
    ORDER BY s.division_council, pf.division_council, psm.id ASC;
  `);

  console.log(`Total cross-council mappings: ${res.rows.length}`);

  // Group by (standard_council -> product_council)
  const crossGroup = {};
  res.rows.forEach(r => {
    const key = `${r.standard_council} -> ${r.product_council}`;
    crossGroup[key] = (crossGroup[key] || 0) + 1;
  });

  console.log('\nCross-Council Matrix:');
  console.table(crossGroup);

  // Print all distinct standards involved in cross-council mappings
  const crossStds = {};
  res.rows.forEach(r => {
    if (!crossStds[r.is_number]) {
      crossStds[r.is_number] = {
        title: r.standard_title,
        council: r.standard_council,
        count: 0,
        sampleProducts: []
      };
    }
    crossStds[r.is_number].count++;
    if (crossStds[r.is_number].sampleProducts.length < 3) {
      crossStds[r.is_number].sampleProducts.push(`${r.product_name} (${r.product_council})`);
    }
  });

  console.log('\nStandards involved in cross-council mappings:');
  Object.entries(crossStds).forEach(([num, info]) => {
    console.log(`- ${num} [${info.council}] (${info.count} mappings): "${info.title.substring(0, 50)}"`);
    console.log(`    Sample products: ${info.sampleProducts.join('; ')}`);
  });

  await pool.end();
}

checkCrossCouncil().catch(console.error);
