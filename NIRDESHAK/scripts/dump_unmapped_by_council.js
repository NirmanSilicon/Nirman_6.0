const fs = require('fs');
const unmapped = JSON.parse(fs.readFileSync('scripts/unmapped_674_products.json', 'utf8'));

const byCouncil = {};
for (const p of unmapped) {
  if (!byCouncil[p.division_council_code]) byCouncil[p.division_council_code] = [];
  byCouncil[p.division_council_code].push(p);
}

for (const [council, prods] of Object.entries(byCouncil)) {
  console.log(`\n=== COUNCIL ${council} (${prods.length} products) ===`);
  const cats = {};
  for (const p of prods) {
    const cat = p.category_name || 'Uncategorized';
    if (!cats[cat]) cats[cat] = [];
    cats[cat].push(p.canonical_name);
  }
  for (const [cat, names] of Object.entries(cats)) {
    console.log(`  [Category: ${cat}] (${names.length})`);
    for (const n of names) {
      console.log(`    - ${n}`);
    }
  }
}
