const { EXPANDED_STANDARDS: s1 } = require('./expansion/standards_data');
const { ETD_STANDARDS: s2 } = require('./expansion/standards_etd');
const { MED_STANDARDS: s3 } = require('./expansion/standards_med');
const { CHD_STANDARDS: s4, MTD_STANDARDS: s5 } = require('./expansion/standards_chd_mtd');
const { LITD_STANDARDS: s6, MHD_STANDARDS: s7, FAD_STANDARDS: s8 } = require('./expansion/standards_litd_mhd_fad');
const { OTHER_COUNCILS_STANDARDS: s9 } = require('./expansion/standards_other_councils');
const { ADDITIONAL_STANDARDS: s10 } = require('./expansion/standards_additional');
const { BATCH2_STANDARDS: s11 } = require('./expansion/standards_registry_batch2');
const { BATCH3_STANDARDS: s12 } = require('./expansion/standards_registry_batch3');
const { BATCH4_STANDARDS: s13 } = require('./expansion/standards_registry_batch4');
const { BATCH5_STANDARDS: s14 } = require('./expansion/standards_registry_batch5');

const all = [...s1, ...s2, ...s3, ...s4, ...s5, ...s6, ...s7, ...s8, ...s9, ...s10, ...s11, ...s12, ...s13, ...s14];
console.log('Total newly curated authentic standards:', all.length);

const map = new Map();
const dups = [];
for (const s of all) {
  if (map.has(s.is_number)) dups.push(s.is_number);
  map.set(s.is_number, true);
}
console.log('Duplicates among new standards:', dups);

// Also check intersection with existing 58 standards in DB
const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkDB() {
  const existing = await pool.query('SELECT is_number FROM standards');
  const existingSet = new Set(existing.rows.map(r => r.is_number));
  console.log('Existing standards in DB:', existingSet.size);

  const existingOverlap = [];
  const uniqueNew = [];
  for (const s of all) {
    if (existingSet.has(s.is_number)) {
      existingOverlap.push(s.is_number);
    } else {
      uniqueNew.push(s);
    }
  }

  console.log('Overlap with existing DB standards (to skip or update):', existingOverlap);
  console.log('Net brand new standards to insert:', uniqueNew.length);
  console.log('Projected total standards in DB after insertion:', existingSet.size + uniqueNew.length);

  // Council breakdown of brand new standards
  const councils = {};
  for (const s of uniqueNew) {
    councils[s.division_council] = (councils[s.division_council] || 0) + 1;
  }
  console.table(councils);

  await pool.end();
}

checkDB().catch(console.error);
