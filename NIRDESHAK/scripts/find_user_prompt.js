const fs = require('fs');
const readline = require('readline');

async function getLine(lineNum) {
  const fileStream = fs.createReadStream('C:/Users/SURYAKANTA PATI/.gemini/antigravity/brain/16859fb8-f521-477a-a664-73f0e8009de0/.system_generated/logs/transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  let idx = 0;
  for await (const line of rl) {
    if (idx === lineNum) {
      const obj = JSON.parse(line);
      fs.writeFileSync('scripts/last_user_prompt.txt', obj.content || JSON.stringify(obj, null, 2));
      console.log('Successfully wrote user prompt to scripts/last_user_prompt.txt');
      break;
    }
    idx++;
  }
}

getLine(3776).catch(console.error);
