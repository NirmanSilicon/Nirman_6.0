const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const items = [
  'High Density Polyethylene (HDPE) Pipes for Water Supply',
  'Sulphuric Acid for Industrial Use',
  'Paving Bitumen (VG-30, VG-40)',
  'Modified Bitumen (CRMB & PMB)',
  'Floor Traps and Grates (Nahani Trap)',
  'Hydrochloric Acid (Commercial)',
  'Bleaching Powder (Stable)',
  'Stable Bleaching Powder',
  'Two-Component Polyurethane Wood Coating',
  'Polymer Modified Bitumen (PMB 40 / PMB 120)',
  'Medium Voltage XLPE Power Cables 11kV/33kV'
];

// Load modules to check what standard_is was specified
const mod1 = require('./mapping_completion/investigation_infrastructure.js').INFRASTRUCTURE_INVESTIGATION;
const mod5 = require('./mapping_completion/investigation_chd.js').CHD_INVESTIGATION;
const mod4 = require('./mapping_completion/investigation_litd_etd.js').LITD_ETD_INVESTIGATION;

const all = [...mod1, ...mod5, ...mod4];

async function run() {
  for (const name of items) {
    const item = all.find(x => x.canonical_name === name);
    if (!item) {
      console.log(`NOT FOUND in modules: ${name}`);
      continue;
    }
    const stdIs = item.standard_is;
    console.log(`\nProduct: ${name}`);
    console.log(`Wanted standard_is: "${stdIs}"`);

    // Search in DB
    const isNum = stdIs.split(':')[0].trim();
    const res = await pool.query("SELECT id, is_number, title FROM standards WHERE is_number ILIKE $1", [`%${isNum}%`]);
    if (res.rows.length === 0) {
      console.log(`  -> No matching standard in DB for ${isNum}`);
    } else {
      res.rows.forEach(r => console.log(`  -> Found in DB: id=${r.id}, is_number="${r.is_number}", title="${r.title.substring(0, 50)}..."`));
    }
  }
  await pool.end();
}

run();
