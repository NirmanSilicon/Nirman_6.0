const { query, closePool } = require('../database');

async function search() {
  const r = await query(`
    SELECT id, is_number, title 
    FROM standards 
    WHERE title ILIKE '%brick%' 
       OR title ILIKE '%slag%' 
       OR title ILIKE '%pozzolan%' 
       OR title ILIKE '%pipe%'
       OR title ILIKE '%door%'
       OR title ILIKE '%kerb%'
       OR title ILIKE '%manhole%'
    ORDER BY is_number;
  `);
  console.log(`Found ${r.rows.length} standards:`);
  console.table(r.rows);
  await closePool();
}

search().catch(e => {
  console.error(e);
  process.exit(1);
});
