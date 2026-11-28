const fs = require('fs');
const path = require('path');

const unmapped = JSON.parse(fs.readFileSync(path.join(__dirname, '../unmapped_674_products.json'), 'utf8'));

const aydDict = JSON.parse(fs.readFileSync(path.join(__dirname, 'ayd_dict.json'), 'utf8'));
const mhdDict = JSON.parse(fs.readFileSync(path.join(__dirname, 'mhd_dict.json'), 'utf8'));
const eedDict = JSON.parse(fs.readFileSync(path.join(__dirname, 'eed_dict.json'), 'utf8'));
const medDict = JSON.parse(fs.readFileSync(path.join(__dirname, 'med_dict.json'), 'utf8'));

const results = [];

function processCouncil(council, dict) {
  const prods = unmapped.filter(p => p.division_council_code === council);
  for (const p of prods) {
    const item = dict[p.canonical_name];
    if (!item) {
      console.error(`Missing item for ${council}: ${p.canonical_name}`);
      process.exit(1);
    }
    results.push({
      canonical_name: p.canonical_name,
      council: council,
      status: item.status,
      standard_is: item.standard_is,
      new_standard: item.new_standard,
      mapping: item.mapping,
      investigation_notes: item.investigation_notes
    });
  }
}

processCouncil('AYD', aydDict);
processCouncil('MHD', mhdDict);
processCouncil('EED', eedDict);
processCouncil('MED', medDict);

console.log('Total MED + MHD + AYD + EED items:', results.length);

const outContent = `/**
 * investigation_med_mhd_ayd_eed.js
 * Comprehensive regulatory and technical investigation for:
 * AYD: 12 products
 * MHD: 31 products
 * EED: 34 products
 * MED: 63 products
 * Total: 140 products
 */

const MED_MHD_AYD_EED_INVESTIGATION = ${JSON.stringify(results, null, 2)};

module.exports = { MED_MHD_AYD_EED_INVESTIGATION };
`;

fs.writeFileSync(path.join(__dirname, 'investigation_med_mhd_ayd_eed.js'), outContent, 'utf8');
console.log('Successfully wrote investigation_med_mhd_ayd_eed.js');
