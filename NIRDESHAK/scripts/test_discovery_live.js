const { discoverStandards } = require('../productDiscovery');

async function test() {
  const queries = [
    "53 Grade Ordinary Portland Cement",
    "Submersible pumpset for borewell",
    "PVC insulated domestic cables",
    "Two-wheeler protective helmet",
    "Ashwagandha root extract",
    "Packaged drinking water",
    "Industrial safety helmet",
    "Heritage Tourism Hotel and Resort Hospitality" // Discovered catalogue family without standard
  ];

  for (const q of queries) {
    console.log(`\n==================================================`);
    console.log(`QUERY: "${q}"`);
    console.log(`==================================================`);
    const res = await discoverStandards(q, { limit: 3 });
    console.log(`Success: ${res.success}, HasMatch: ${res.hasMatch}, Count: ${res.count}`);
    if (res.matchedProductFamilies && res.matchedProductFamilies.length > 0) {
      console.log(`Matched Family: ${res.matchedProductFamilies[0].canonicalName} (${res.matchedProductFamilies[0].divisionCouncil}) [Coverage: ${res.matchedProductFamilies[0].coverageStatus}]`);
    }
    if (res.recommendations && res.recommendations.length > 0) {
      res.recommendations.forEach(r => {
        console.log(`  -> Rank ${r.rank}: ${r.is_number} - ${r.title.slice(0, 70)}... (${r.standard_type || 'Spec'}) [Mandatory: ${r.regulatoryCompliance?.isMandatoryQco ? 'YES' : 'NO'}]`);
      });
    } else if (res.fallbackNotice) {
      console.log(`  Fallback Message: ${res.fallbackNotice.message}`);
      console.log(`  Context: ${res.fallbackNotice.contextDetails}`);
    }
  }
}

test().catch(console.error).finally(() => process.exit(0));
