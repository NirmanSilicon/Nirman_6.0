const { query } = require('../database');
async function check() {
  const r = await query("SELECT data_type, character_maximum_length, is_nullable FROM information_schema.columns WHERE table_name = 'product_families' AND column_name = 'coverage_status'");
  console.log('coverage_status column definition:', r.rows);
  const mapCols = await query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'product_standard_mappings'");
  console.log('product_standard_mappings columns:', mapCols.rows);
}
check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

