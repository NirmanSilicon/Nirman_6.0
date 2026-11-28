const fs = require('fs');
const lines = fs.readFileSync('C:/Users/SURYAKANTA PATI/.gemini/antigravity/brain/16859fb8-f521-477a-a664-73f0e8009de0/.system_generated/logs/transcript.jsonl', 'utf8').trim().split('\n');
for (let i = lines.length - 1; i >= Math.max(0, lines.length - 50); i--) {
  const line = lines[i];
  if (line.includes('UNIVERSAL TECHNICAL REQUIREMENTS EXTRACTION')) {
    console.log('Found line at:', i);
    const obj = JSON.parse(line);
    console.log(JSON.stringify(obj, null, 2).substring(0, 4000));
    break;
  }
}
