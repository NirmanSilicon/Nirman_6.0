const http = require('http');

function postExtract(text, inputType = 'general') {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ text, inputType });
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/extract-requirements',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: data });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testEndpoint() {
  console.log('Testing Live POST /api/extract-requirements...\n');

  console.log('--- 1. Safety Glasses for Industries ---');
  const glassesRes = await postExtract('Safety glasses for industries');
  console.log('Success:', glassesRes.success);
  console.log('Product:', glassesRes.requirements ? glassesRes.requirements.product_name : 'N/A');
  console.log('Category:', glassesRes.requirements ? glassesRes.requirements.product_category : 'N/A');
  console.log('Technical Requirements count:', glassesRes.requirements ? glassesRes.requirements.technical_requirements.length : 0);
  console.log('Sample Technical Req:', glassesRes.requirements ? glassesRes.requirements.technical_requirements[0] : 'N/A');
  console.log('Materials count:', glassesRes.requirements ? glassesRes.requirements.materials.length : 0);
  console.log('Clarification questions:', glassesRes.requirements ? glassesRes.requirements.clarification_questions : []);

  console.log('\n--- 2. Industrial Safety Helmet ---');
  const helmetRes = await postExtract('Safety helmet for construction workers');
  console.log('Success:', helmetRes.success);
  console.log('Product:', helmetRes.requirements ? helmetRes.requirements.product_name : 'N/A');
  console.log('Technical Requirements count:', helmetRes.requirements ? helmetRes.requirements.technical_requirements.length : 0);
}

testEndpoint().catch(console.error);
