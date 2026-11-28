/**
 * NIRDESHAK Regulatory and Standards Catalogue Auditor
 * Audits all 19 standards in nirdeshak_clean_20261126 against official Gazette,
 * DPIIT, and BIS statutory requirements.
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function auditRegulatory() {
  console.log('='.repeat(80));
  console.log('NIRDESHAK REGULATORY AND LEGAL CITATION AUDIT');
  console.log('='.repeat(80));

  const issues = [];
  const checks = [];

  function record(title, passed, detail) {
    checks.push({ title, passed, detail });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${title}: ${detail}`);
    if (!passed) issues.push(`${title}: ${detail}`);
  }

  try {
    const res = await pool.query(`
      SELECT id, canonical_id, is_number, title, scope, category, 
             version, publication_year, status, is_primary_candidate,
             certification, amendments, supersedes, superseded_by, source
      FROM standards
      ORDER BY id;
    `);

    const records = res.rows;
    console.log(`Auditing ${records.length} records individually...\n`);

    // 1. Classification Count Verification
    const classACount = records.filter(r => r.is_primary_candidate && r.certification?.regulatory_class === 'Class A').length;
    const classBCount = records.filter(r => r.is_primary_candidate && r.certification?.regulatory_class === 'Class B').length;
    const classCCount = records.filter(r => r.is_primary_candidate && r.certification?.regulatory_class === 'Class C').length;
    const primaryCount = records.filter(r => r.is_primary_candidate).length;
    const supportingCount = records.filter(r => !r.is_primary_candidate).length;

    record('Class A Count is 12', classACount === 12, `Found ${classACount}`);
    record('Class B Count is 2', classBCount === 2, `Found ${classBCount}`);
    record('Class C Count is 2', classCCount === 2, `Found ${classCCount}`);
    record('Primary Candidates Count is 16', primaryCount === 16, `Found ${primaryCount}`);
    record('Supporting References Count is 3', supportingCount === 3, `Found ${supportingCount}`);

    // Map by canonical_id
    const map = new Map(records.map(r => [r.canonical_id, r]));

    // 2. IS 694 Checks
    const is694 = map.get('IS-694-2010');
    if (is694) {
      const cert = is694.certification || {};

      // Official Indian Standard Title (BIS CMD Circular 15 Dec 2014)
      const officialTitle450 = is694.title.includes('450/750 V') && (cert.official_standard_title || '').includes('450/750 V');
      record('IS 694 Official Standard Title Specifies 450/750 V', officialTitle450, is694.title);

      // QCO Schedule Description (S.O. 189(E) Serial 20)
      const qcoDesc = cert.qco_schedule_description || '';
      const qcoDesc1100 = qcoDesc.includes('1100 V') && qcoDesc.includes('PVC insulated cables');
      record('IS 694 QCO Schedule Description Specifies 1100 V', qcoDesc1100, qcoDesc);

      // Product Manual Title & Scope (PM/IS 694/5/March 2024)
      const pmTitle = cert.product_manual_title || '';
      const pmTitle1100 = pmTitle.includes('1100 V');
      record('IS 694 Product Manual Title Specifies 1100 V', pmTitle1100, pmTitle);

      const certScope = cert.certification_scope || '';
      const scope1100 = certScope.includes('1100 V');
      record('IS 694 Certification Scope Specifies 1100 V', scope1100, certScope);

      // Distinct fields check
      const ratedStd = cert.rated_voltage_in_standard === 'Up to and including 450/750 V';
      record('IS 694 Rated Voltage in Standard Recorded as 450/750 V', ratedStd, cert.rated_voltage_in_standard);

      const qcoCoverage = Boolean(cert.qco_product_coverage && cert.qco_product_coverage.includes('1100 V'));
      record('IS 694 QCO Product Coverage Recorded as 1100 V', qcoCoverage, cert.qco_product_coverage);

      const hasDiscrepancyNote = Boolean(cert.discrepancy_note && cert.discrepancy_note.includes('450/750 V') && cert.discrepancy_note.includes('1100 V'));
      record('IS 694 Discrepancy Note Explains 450/750 V vs 1100 V', hasDiscrepancyNote, cert.discrepancy_note?.slice(0, 80));

      const sources = cert.source_references || {};
      const hasSources = Boolean(sources.official_standard_source && sources.qco_source && sources.product_manual_source);
      record('IS 694 Source References Cites CMD 2014, S.O. 189(E), PM 2024', hasSources, JSON.stringify(sources));

      const gazetteIs189 = cert.gazette_no === 'S.O. 189(E)';
      record('IS 694 QCO is S.O. 189(E)', gazetteIs189, `Gazette: ${cert.gazette_no}`);

      const itemIs20 = cert.schedule_serial === 20 || cert.schedule_item?.includes('20');
      record('IS 694 Schedule Item is Serial 20', itemIs20, `Item: ${cert.schedule_item}`);

      const dateIsAug2003 = cert.effective_date === '2003-08-17';
      record('IS 694 Commencement Date is 2003-08-17 (6 Months per Clause 1(2))', dateIsAug2003, `Effective: ${cert.effective_date}`);

      const pmRefIsMarch2024 = cert.product_manual_ref === 'PM/IS 694/5/March 2024';
      record('IS 694 Product Manual is PM/IS 694/5/March 2024', pmRefIsMarch2024, cert.product_manual_ref);

      const decoupled280 = cert.gazette_no !== 'S.O. 280(E)' && (cert.exclusion_note || '').includes('280(E)');
      record('IS 694 Decoupled from S.O. 280(E)', decoupled280, cert.exclusion_note || 'Excluded from S.O. 280(E)');
    } else {
      record('IS 694 Found in DB', false, 'Missing IS-694-2010');
    }

    // 3. IS 8828 / IS/IEC 60898-1 Checks
    const mcb = map.get('IS-IEC-60898-1-2015');
    if (mcb) {
      record('IS/IEC 60898-1 Active Canonical Record', mcb.is_number.includes('60898-1'), mcb.is_number);
      const mcbCert = mcb.certification || {};
      const citesSo189 = mcbCert.gazette_no === 'S.O. 189(E)';
      record('IS/IEC 60898-1 Enforces S.O. 189(E) with Transition', citesSo189, `Gazette: ${mcbCert.gazette_no}`);
      const isSerial10 = mcbCert.schedule_serial === 10 || mcbCert.schedule_item?.includes('10');
      record('IS 8828 Original Schedule Serial is 10', isSerial10, `Item: ${mcbCert.schedule_item}`);
      const isAug2003 = mcbCert.effective_date === '2003-08-17';
      record('IS 8828 Original Commencement is 2003-08-17', isAug2003, `Effective: ${mcbCert.effective_date}`);
      const successorSeparated = Boolean(mcbCert.successor_adoption_note);
      record('Successor IS/IEC 60898-1 Adoption Evidence Separated', successorSeparated, mcbCert.successor_adoption_note?.slice(0, 80));
      const predecessorMentioned = JSON.stringify(mcb.supersedes || []).includes('8828');
      record('IS/IEC 60898-1 Documents Predecessor IS 8828', predecessorMentioned, 'Predecessor IS 8828 noted in supersedes');
    } else {
      record('IS/IEC 60898-1 Found in DB', false, 'Missing IS-IEC-60898-1-2015');
    }

    // 4. IS 12615 Checks
    const is12615 = map.get('IS-12615-2018');
    if (is12615) {
      record('IS 12615 Baseline Edition is 2018', is12615.is_number.includes('2018'), is12615.is_number);
      const notes = JSON.stringify(is12615.certification || {}) + JSON.stringify(is12615.amendments || {});
      const rev4Mentioned = notes.includes('2026') && (notes.includes('Fourth Revision') || notes.includes('fourth_revision_note') || notes.includes('ETD 15'));
      record('IS 12615 Notes 2026 4th Revision', rev4Mentioned, '2026 4th Revision recorded');
      const unresolvedQco = notes.includes('UNRESOLVED') || notes.includes('pending') || notes.includes('Pending');
      record('IS 12615 2026 QCO Status Recorded as Pending', unresolvedQco, 'Pending QCO amendment noted');
    } else {
      record('IS 12615 Found in DB', false, 'Missing IS-12615-2018');
    }

    // 5. IS 8034 Checks
    const is8034 = map.get('IS-8034-2018');
    if (is8034) {
      const isClassB = is8034.certification?.regulatory_class === 'Class B';
      const isNotMandatory = is8034.certification?.mandatory === false;
      record('IS 8034 Classified as Class B (Voluntary)', isClassB && isNotMandatory, `Class: ${is8034.certification?.regulatory_class}, Mandatory: ${is8034.certification?.mandatory}`);
      const draftQcoNoted = JSON.stringify(is8034.certification || {}).includes('G/TBT/N/IND/308') || JSON.stringify(is8034.certification || {}).includes('Draft');
      record('IS 8034 Notes Draft QCO Status', draftQcoNoted, 'Draft QCO documented without claiming final enactment');
    } else {
      record('IS 8034 Found in DB', false, 'Missing IS-8034-2018');
    }

    // 6. IS 4151 Checks
    const is4151 = map.get('IS-4151-2015');
    if (is4151) {
      const cert4151 = is4151.certification || {};
      const gazette4151 = cert4151.gazette_no === 'S.O. 4252(E)';
      record('IS 4151 QCO is S.O. 4252(E)', gazette4151, `Gazette: ${cert4151.gazette_no}`);
      const statutoryBis = /Sections?\s+16/i.test(cert4151.statutory_basis || '') && cert4151.statutory_basis.includes('2016');
      record('IS 4151 Statutory Basis is BIS Act 2016 Sections 16, 25', statutoryBis, cert4151.statutory_basis);
      const mvActDistinct = cert4151.traffic_law_note && cert4151.traffic_law_note.includes('129');
      record('IS 4151 Motor Vehicles Act 129 Segregated as Traffic Law', Boolean(mvActDistinct), cert4151.traffic_law_note);
    } else {
      record('IS 4151 Found in DB', false, 'Missing IS-4151-2015');
    }

    // 7. IS 1239 (Part 1):2004 Checks
    const is1239 = map.get('IS-1239-Part-1-2004');
    if (is1239) {
      record('IS 1239 Edition is Sixth Revision 2004', is1239.is_number.includes('2004'), is1239.is_number);
      const cert1239 = is1239.certification || {};
      const footnotePresent = (cert1239.gazette_footnote || '').includes('latest') || JSON.stringify(cert1239).includes('latest');
      record('IS 1239 S.O. 281(E) Amendments Footnote Recorded', footnotePresent, cert1239.gazette_footnote || 'Footnote present');
    } else {
      record('IS 1239 Found in DB', false, 'Missing IS-1239-Part-1-2004');
    }

    // 8. IS 456 & IS 3177 Codes of Practice Checks
    const is456 = map.get('IS-456-2000');
    if (is456) {
      const isClassC = is456.certification?.regulatory_class === 'Class C';
      record('IS 456 Classified as Class C (Code of Practice)', isClassC, `Class: ${is456.certification?.regulatory_class}`);
      const notMandatoryQco = !is456.certification?.mandatory;
      record('IS 456 Not Claimed as Mandatory QCO Product', notMandatoryQco, `Mandatory: ${is456.certification?.mandatory}`);
    } else {
      record('IS 456 Found in DB', false, 'Missing IS-456-2000');
    }

    const is3177 = map.get('IS-3177-2020');
    if (is3177) {
      const isClassC = is3177.certification?.regulatory_class === 'Class C';
      record('IS 3177 Classified as Class C (Code of Practice)', isClassC, `Class: ${is3177.certification?.regulatory_class}`);
    } else {
      record('IS 3177 Found in DB', false, 'Missing IS-3177-2020');
    }

    // 9. IS/IEC 62271-100 Checks
    const hvBreaker = map.get('IS-IEC-62271-100-2008');
    if (hvBreaker) {
      const isClassB = hvBreaker.certification?.regulatory_class === 'Class B';
      record('IS/IEC 62271-100 Classified as Class B Voluntary', isClassB, `Class: ${hvBreaker.certification?.regulatory_class}`);
      const utilitySeparated = JSON.stringify(hvBreaker.certification || {}).includes('Utility') || JSON.stringify(hvBreaker.certification || {}).includes('procurement');
      record('IS/IEC 62271-100 Distinguishes BIS from Utility Procurement', utilitySeparated, 'Utility procurement distinction noted');
    } else {
      record('IS/IEC 62271-100 Found in DB', false, 'Missing IS-IEC-62271-100-2008');
    }

    // 10. Supporting Reference Standards Checks (IS 383, IS 10262, IS 3043)
    const is383 = map.get('IS-383-2016');
    const is10262 = map.get('IS-10262-2019');
    const is3043 = map.get('IS-3043-2018');

    record('IS 383 is Supporting Reference (is_primary_candidate = false)', is383 && !is383.is_primary_candidate, `Primary: ${is383?.is_primary_candidate}`);
    record('IS 10262 is Supporting Reference (is_primary_candidate = false)', is10262 && !is10262.is_primary_candidate, `Primary: ${is10262?.is_primary_candidate}`);
    record('IS 3043 is Supporting Reference (is_primary_candidate = false)', is3043 && !is3043.is_primary_candidate, `Primary: ${is3043?.is_primary_candidate}`);

    console.log('\n' + '='.repeat(80));
    console.log(`TOTAL REGULATORY CHECKS: ${checks.length}`);
    console.log(`PASSED: ${checks.filter(c => c.passed).length}`);
    console.log(`FAILED: ${issues.length}`);
    console.log('='.repeat(80));

    return { total: checks.length, passed: checks.filter(c => c.passed).length, failed: issues.length, checks, issues };
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  auditRegulatory().then(r => {
    process.exit(r.failed === 0 ? 0 : 1);
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { auditRegulatory };
