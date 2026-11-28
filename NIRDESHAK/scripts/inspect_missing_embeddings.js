const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function inspectMissing() {
  const res = await pool.query(`
    SELECT id, canonical_id, is_number, title, division_council, status, publication_year
    FROM standards
    WHERE embedding IS NULL
    ORDER BY id ASC;
  `);

  console.log(`Found ${res.rows.length} standards with embedding IS NULL.`);
  console.log('Sample missing standards (first 10):');
  console.table(res.rows.slice(0, 10));
  console.log('Sample missing standards (last 10):');
  console.table(res.rows.slice(-10));

  const byCouncil = await pool.query(`
    SELECT division_council, count(*) as count
    FROM standards
    WHERE embedding IS NULL
    GROUP BY division_council
    ORDER BY count DESC;
  `);
  console.log('\nMissing embeddings by Division Council:');
  console.table(byCouncil.rows);

  await pool.end();
}

inspectMissing();
