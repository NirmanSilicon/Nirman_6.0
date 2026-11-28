const { extractUniversalRequirements } = require('../universalRequirementProfiles');
const { closePool } = require('../database');

async function test() {
  console.log('Testing Universal Requirement Profile Engine...\n');

  const testCases = [
    { name: 'Industrial Safety Helmet', text: 'Industrial safety helmet for construction workers' },
    { name: 'Safety Glasses', text: 'Safety glasses for industries' },
    { name: 'PVC Cables', text: 'PVC insulated electrical copper cables 1.5 sq mm 1100V' },
    { name: 'Portland Cement', text: 'Ordinary Portland Cement 53 grade for structural concrete' }
  ];

  for (const tc of testCases) {
    console.log(`=== Test: ${tc.name} ===`);
    const res = await extractUniversalRequirements(tc.text);
    console.log('Success:', res.success);
    console.log('Product Name:', res.requirements.product_name);
    console.log('Category:', res.requirements.product_category);
    console.log('Technical Reqs count:', res.requirements.technical_requirements.length);
    console.log('Sample Technical Req:', res.requirements.technical_requirements[0]);
    console.log('Materials count:', res.requirements.materials.length);
    console.log('Sample Material:', res.requirements.materials[0]);
    console.log('Performance count:', res.requirements.performance_requirements.length);
    console.log('Safety count:', res.requirements.safety_requirements.length);
    console.log('Testing count:', res.requirements.testing_requirements.length);
    console.log('Certification count:', res.requirements.certification_requirements.length);
    console.log('Clarification questions:', res.requirements.clarification_questions ? res.requirements.clarification_questions.length : 0);
    console.log('Metadata:', res.requirements.metadata);
    console.log('\n');
  }

  await closePool();
}

test().catch(console.error);
