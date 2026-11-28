const { query, closePool } = require('../database');

async function checkCandidates() {
  const stds = await query(`
    SELECT id, is_number, title 
    FROM standards 
    WHERE is_number ILIKE ANY(ARRAY[
      '%1786%', '%1608%', '%1599%', '%458%', '%456%', '%269%', '%1489%', '%455%', '%8042%',
      '%2925%', '%5983%', '%8521%', '%15298%', '%10258%', '%10654%', '%694%', '%10810%',
      '%1180%', '%2026%', '%335%', '%15636%', '%15633%', '%2185%', '%516%', '%10262%',
      '%4926%', '%9103%', '%12894%', '%1884%', '%14257%', '%61439%'
    ])
    ORDER BY is_number;
  `);

  console.log(`Found ${stds.rows.length} relevant standards in DB:`);
  console.table(stds.rows);
  await closePool();
}

checkCandidates().catch(e => {
  console.error(e);
  process.exit(1);
});
