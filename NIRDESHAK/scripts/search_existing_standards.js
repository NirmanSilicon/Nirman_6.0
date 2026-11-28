const { query, closePool } = require('../database');

async function search() {
  const r = await query(`
    SELECT id, is_number, title, division_council, status
    FROM standards
    WHERE title ILIKE '%busbar%' 
       OR title ILIKE '%horn%' 
       OR title ILIKE '%battery%'
       OR title ILIKE '%window%'
       OR title ILIKE '%door%'
    ORDER BY division_council, is_number;
  `);
  console.log(`Found ${r.rows.length} matching standards:`);
  console.table(r.rows);
  await closePool();
}

search().catch(e => {
  console.error(e);
  process.exit(1);
});
