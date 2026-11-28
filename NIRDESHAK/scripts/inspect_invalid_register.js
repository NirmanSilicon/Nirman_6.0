const fs = require('fs');

const lines = fs.readFileSync('NIRDESHAK_INVALID_MAPPING_REGISTER.csv', 'utf8').trim().split('\n');
console.log('Total invalid lines (including header):', lines.length);

const stdCounts = {};
for (let i = 1; i < lines.length; i++) {
  const parts = lines[i].split('","').map(s => s.replace(/^"|"$/g, ''));
  const isNum = parts[4];
  const prodName = parts[1];
  const domain = parts[6];
  const prodDomain = parts[3];
  stdCounts[isNum] = stdCounts[isNum] || { count: 0, title: parts[5], samples: [] };
  stdCounts[isNum].count++;
  if (stdCounts[isNum].samples.length < 3) {
    stdCounts[isNum].samples.push(`${prodName} (${prodDomain})`);
  }
}

console.log('Invalid Mappings by Standard:');
Object.entries(stdCounts).forEach(([num, data]) => {
  console.log(`- ${num} (${data.count} invalid mappings): "${data.title}"`);
  console.log(`    Samples: ${data.samples.join('; ')}`);
});
