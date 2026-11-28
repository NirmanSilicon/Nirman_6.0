/**
 * Comprehensive Evaluation across all 17 BIS Division Councils (5 queries per council = 85 queries)
 */
const { discoverStandards } = require('../productDiscovery');
const fs = require('fs');

const COUNCIL_QUERIES = [
  // 1. AYUSH (AYD)
  { council: "AYD", query: "Ashwagandha standardized root powder extract" },
  { council: "AYD", query: "Triphala churna digestive formulation" },
  { council: "AYD", query: "Classical Chyawanprash avaleha" },
  { council: "AYD", query: "Brahmi memory and cognitive herbal extract" },
  { council: "AYD", query: "Cold pressed pure neem oil for dermatology" },

  // 2. Chemical (CHD)
  { council: "CHD", query: "Caustic soda flakes for industrial scouring" },
  { council: "CHD", query: "Stable bleaching powder for municipal water disinfection" },
  { council: "CHD", query: "Technical sulfuric acid 98% commercial grade" },
  { council: "CHD", query: "Synthetic detergent washing powder" },
  { council: "CHD", query: "Grade 1 toilet soap with 76% TFM" },

  // 3. Civil Engineering (CED)
  { council: "CED", query: "Ordinary Portland Cement 53 grade" },
  { council: "CED", query: "Portland Pozzolana Cement fly ash based" },
  { council: "CED", query: "Ready mixed concrete RMC batching" },
  { council: "CED", query: "Vitrified polished porcelain floor tiles" },
  { council: "CED", query: "Precast concrete paving blocks for footpaths" },

  // 4. Electronics and IT (LITD)
  { council: "LITD", query: "Laptop personal computer system with power adapter" },
  { council: "LITD", query: "Smart LED television display monitor" },
  { council: "LITD", query: "Rechargeable lithium ion battery pack for electronic devices" },
  { council: "LITD", query: "Desktop laser printer and scanner" },
  { council: "LITD", query: "Biometric optical fingerprint scanner terminal" },

  // 5. Electrotechnical (ETD)
  { council: "ETD", query: "Distribution transformer 11kV step down" },
  { council: "ETD", query: "Low voltage XLPE power cables 1.1kV" },
  { council: "ETD", query: "Miniature circuit breaker 10kA for domestic protection" },
  { council: "ETD", query: "Residual current circuit breaker 30mA earth leakage" },
  { council: "ETD", query: "Energy efficient 3-phase induction motor IE3" },

  // 6. Environment and Ecology (EED)
  { council: "EED", query: "High volume air sampler for PM2.5 and PM10 particulate monitoring" },
  { council: "EED", query: "Biodegradable starch based compostable carry bags" },
  { council: "EED", query: "Precision sound level meter for noise pollution audit" },
  { council: "EED", query: "Continuous ambient air quality monitoring system" },
  { council: "EED", query: "Industrial reverse osmosis desalination membranes" },

  // 7. Food and Agriculture (FAD)
  { council: "FAD", query: "Fortified whole wheat chakki atta" },
  { council: "FAD", query: "Processed cereal based weaning foods for infants" },
  { council: "FAD", query: "Infant milk substitute baby formula powder" },
  { council: "FAD", query: "Packaged natural mineral water in bottles" },
  { council: "FAD", query: "Spray dried skimmed milk powder" },

  // 8. Management and Systems (MSD)
  { council: "MSD", query: "Quality management system ISO 9001 certification framework" },
  { council: "MSD", query: "Environmental management system ISO 14001 auditing" },
  { council: "MSD", query: "Occupational health and safety ISO 45001" },
  { council: "MSD", query: "Energy management system ISO 50001" },
  { council: "MSD", query: "Information security management ISO/IEC 27001 ISMS" },

  // 9. Mechanical Engineering (MED)
  { council: "MED", query: "Submersible pumpset for deep tube well borewell" },
  { council: "MED", query: "Unitary room window air conditioner" },
  { council: "MED", query: "Split air conditioner with inverter cooling" },
  { council: "MED", query: "Sluice valve for municipal water supply pipelines" },
  { council: "MED", query: "Electric wire rope hoist for material handling" },

  // 10. Medical Equipment (MHD)
  { council: "MHD", query: "Sterile single-use plastic hypodermic syringe" },
  { council: "MHD", query: "Single use sterile rubber surgical operating gloves" },
  { council: "MHD", query: "Clinical electronic digital thermometer" },
  { council: "MHD", query: "Multi parameter bedside patient vital signs monitor" },
  { council: "MHD", query: "Hospital ICU mechanical ventilator life support" },

  // 11. Metallurgical Engineering (MTD)
  { council: "MTD", query: "Structural steel plates and sections Fe 410" },
  { council: "MTD", query: "High strength deformed TMT rebars Fe 500D" },
  { council: "MTD", query: "Cold rolled non-oriented electrical steel CRNO" },
  { council: "MTD", query: "Electrolytic tough pitch copper busbars ETP" },
  { council: "MTD", query: "Special high grade zinc ingots for galvanizing" },

  // 12. Petroleum and Coal (PCD)
  { council: "PCD", query: "Motor gasoline BS-VI petrol fuel" },
  { council: "PCD", query: "High speed diesel BS-VI commercial fuel" },
  { council: "PCD", query: "Synthetic multigrade engine oil SAE 5W-30" },
  { council: "PCD", query: "Lithium complex extreme pressure grease EP-2" },
  { council: "PCD", query: "Fully refined white paraffin wax slab" },

  // 13. Production and General Engineering (PGD)
  { council: "PGD", query: "High tensile hexagonal bolts grade 8.8" },
  { council: "PGD", query: "High tensile heavy hex nuts grade 8" },
  { council: "PGD", query: "Digital vernier caliper precision measuring tool" },
  { council: "PGD", query: "Solid carbide 4-flute end mill cutter" },
  { council: "PGD", query: "Shielded metal arc welding electrodes E6013" },

  // 14. Service Sector (SSD)
  { council: "SSD", query: "Scheduled commercial retail banking branch operations" },
  { council: "SSD", query: "Digital mobile payment gateway transactions" },
  { council: "SSD", query: "Public municipal grievance redressal Sevottam citizen charter" },
  { council: "SSD", query: "Hospitality services in heritage resort hotel" },
  { council: "SSD", query: "Professional chartered accountancy statutory audit services" },

  // 15. Textiles (TXD)
  { council: "TXD", query: "High density polyethylene woven sacks for packaging foodgrains" },
  { council: "TXD", query: "Polypropylene woven sacks for packing cement" },
  { council: "TXD", query: "Protective clothing for industrial workers exposed to heat" },
  { council: "TXD", query: "Medical textiles surgical 3-ply face mask" },
  { council: "TXD", query: "Needle punched nonwoven geotextile felts" },

  // 16. Transport Engineering (TED)
  { council: "TED", query: "Protective helmet for two-wheeler motorcycle riders" },
  { council: "TED", query: "Automotive safety glass windshield for passenger car" },
  { council: "TED", query: "Pneumatic tyres for two and three wheeled motor vehicles" },
  { council: "TED", query: "Automotive hydraulic brake hose assembly" },
  { council: "TED", query: "Automotive waterproof electric signaling horn" },

  // 17. Water Resources (WRD)
  { council: "WRD", query: "Drip irrigation inline cylindrical emitters 16mm" },
  { council: "WRD", query: "Micro sprinkler assemblies 360 degree rotor" },
  { council: "WRD", query: "Vertical lift fabricated steel canal sluice gates" },
  { council: "WRD", query: "Precast concrete interlocking canal lining slabs" },
  { council: "WRD", query: "Full bore electromagnetic water transmission flow meter" }
];

async function evaluate() {
  console.log(`Evaluating ${COUNCIL_QUERIES.length} queries across all 17 BIS councils...`);
  const results = [];

  let matchedCount = 0;
  let councilHits = {};

  for (let i = 0; i < COUNCIL_QUERIES.length; i++) {
    const item = COUNCIL_QUERIES[i];
    const res = await discoverStandards(item.query, { limit: 3 });
    const topRec = res.recommendations?.[0];
    const topFam = res.matchedProductFamilies?.[0];

    const isSuccess = res.hasMatch && res.count > 0;
    if (isSuccess) {
      matchedCount++;
      councilHits[item.council] = (councilHits[item.council] || 0) + 1;
    }

    results.push({
      index: i + 1,
      council: item.council,
      query: item.query,
      hasMatch: res.hasMatch,
      count: res.count,
      topStandard: topRec ? `${topRec.is_number} - ${topRec.title.slice(0, 60)}` : 'None',
      topFamily: topFam ? `${topFam.canonicalName} (${topFam.coverageStatus})` : 'None',
      mandatoryQco: topRec?.regulatoryCompliance?.isMandatoryQco || false
    });
  }

  console.log(`\n======================================================`);
  console.log(`17-COUNCIL EVALUATION COMPLETE: ${matchedCount} / ${COUNCIL_QUERIES.length} queries matched (${(matchedCount/COUNCIL_QUERIES.length*100).toFixed(1)}%)`);
  console.log(`======================================================`);
  console.table(councilHits);

  fs.writeFileSync('scripts/17_councils_evaluation_results.json', JSON.stringify({
    totalQueries: COUNCIL_QUERIES.length,
    matchedCount,
    accuracy: (matchedCount / COUNCIL_QUERIES.length * 100).toFixed(1),
    councilHits,
    details: results
  }, null, 2));
}

evaluate().catch(console.error);
