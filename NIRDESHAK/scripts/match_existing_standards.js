const fs = require('fs');
const { query } = require('../database');

async function matchExisting() {
  const unmapped = JSON.parse(fs.readFileSync('scripts/unmapped_674_products.json', 'utf8'));
  const standardsRes = await query(`SELECT id, is_number, title, division_council FROM standards`);
  const standards = standardsRes.rows;

  console.log('Total unmapped products:', unmapped.length);
  console.log('Total standards in DB:', standards.length);

  const potentialMatches = [];

  for (const prod of unmapped) {
    const nameLower = prod.canonical_name.toLowerCase();
    const matchedStandards = [];

    for (const std of standards) {
      const titleLower = std.title.toLowerCase();
      // Simple keyword matching heuristics
      const nameWords = nameLower.split(/[\s,\(\)\/—\-]+/).filter(w => w.length > 3);
      let matchCount = 0;
      for (const w of nameWords) {
        if (titleLower.includes(w)) matchCount++;
      }
      if (matchCount >= 2 || (nameWords.length === 1 && matchCount === 1 && titleLower.includes(nameWords[0]))) {
        matchedStandards.push({ is_number: std.is_number, title: std.title, standard_id: std.id, matchCount });
      }
    }

    if (matchedStandards.length > 0) {
      matchedStandards.sort((a, b) => b.matchCount - a.matchCount);
      potentialMatches.push({ product: prod, matches: matchedStandards.slice(0, 3) });
    }
  }

  console.log('Products with potential existing standard matches:', potentialMatches.length);
  console.log('Sample matches (first 10):');
  for (const m of potentialMatches.slice(0, 10)) {
    console.log(`- [${m.product.division_council_code}] ${m.product.canonical_name}`);
    for (const s of m.matches) {
      console.log(`    -> ${s.is_number}: ${s.title}`);
    }
  }
}

matchExisting().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
