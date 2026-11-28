/**
 * build_fad_txd.js
 * Generates investigation_fad_txd.js covering:
 * FAD: 71 products
 * TXD: 46 products
 * Total: 117 products
 */

const fs = require('fs');
const path = require('path');

const unmapped = JSON.parse(fs.readFileSync(path.join(__dirname, '../unmapped_674_products.json'), 'utf8'));

const fadProducts = unmapped.filter(p => p.division_council_code === 'FAD');
const txdProducts = unmapped.filter(p => p.division_council_code === 'TXD');

console.log(`Found ${fadProducts.length} FAD and ${txdProducts.length} TXD products.`);
