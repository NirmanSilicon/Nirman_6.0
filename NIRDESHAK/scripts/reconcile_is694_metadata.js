require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function reconcileIS694() {
  const client = await pool.connect();
  try {
    console.log('[Step 1] Connecting to database...');
    await client.query('BEGIN');

    const selectQuery = "SELECT id, canonical_id, is_number, title, certification, technical_requirements FROM standards WHERE canonical_id = 'IS-694-2010' FOR UPDATE";
    const curRes = await client.query(selectQuery);
    if (curRes.rowCount === 0) {
      throw new Error('IS-694-2010 not found in database');
    }

    const currentCert = curRes.rows[0].certification || {};
    const currentTech = curRes.rows[0].technical_requirements || {};

    const officialStandardTitle = "Polyvinyl Chloride Insulated Unsheathed and Sheathed Cables/Cords with Rigid and Flexible Conductor for Rated Voltages Up to and Including 450/750 V";
    const fullDbTitle = "Polyvinyl Chloride Insulated Unsheathed and Sheathed Cables/Cords with Rigid and Flexible Conductor for Rated Voltages Up to and Including 450/750 V (Fourth Revision)";
    const qcoScheduleDescription = "PVC insulated cables for working voltages up to and including 1100 V.";
    const productManualTitle = "Polyvinyl Chloride Insulated Unsheathed and Sheathed Cables/Cords with Rigid and Flexible Conductor for Rated Voltages Up to and Including 1100 V";
    const certificationScope = "Cables and cords for working voltages up to and including 1100 V under BIS Scheme-I (ISI Mark)";
    const ratedVoltageInStandard = "Up to and including 450/750 V";
    const qcoProductCoverage = "PVC insulated cables for working voltages up to and including 1100 V";

    const discrepancyNote = "Official Indian Standard IS 694:2010 Fourth Revision defines rated voltages 'Up to and Including 450/750 V' (as affirmed by BIS Central Marks Department Circular dated 15 December 2014 and ETD 19). In contrast, the statutory Quality Control Order S.O. 189(E) dated 17 February 2003 (Schedule Serial 20, effective 17 August 2003) prescribes mandatory coverage for 'PVC insulated cables for working voltages up to and including 1100 V'. To bridge this statutory requirement, the BIS Product Manual PM/IS 694/5/March 2024 expands its title and certification scope to 'voltages up to and including 1100 V', granting ISI certification licenses up to 1100 V.";

    const sourceReferences = {
      official_standard_source: "BIS Central Marks Department circular dated 15 December 2014 & IS 694:2010 (Fourth Revision)",
      qco_source: "Official Gazette of India S.O. 189(E) dated 17 February 2003, Schedule Serial Number 20, Clause 1(2)",
      product_manual_source: "BIS Product Manual PM/IS 694/5/March 2024"
    };

    const updatedCert = {
      ...currentCert,
      official_standard_title: officialStandardTitle,
      qco_schedule_description: qcoScheduleDescription,
      product_manual_title: productManualTitle,
      certification_scope: certificationScope,
      rated_voltage_in_standard: ratedVoltageInStandard,
      qco_product_coverage: qcoProductCoverage,
      discrepancy_note: discrepancyNote,
      source_references: sourceReferences,
      // Retain verified statutory items
      schedule_serial: 20,
      schedule_item: "Serial Number 20 of Schedule",
      effective_date: "2003-08-17",
      commencement_date: "2003-08-17",
      gazette_no: "S.O. 189(E)",
      gazette_date: "2003-02-17",
      product_manual_ref: "PM/IS 694/5/March 2024",
      regulatory_class: "Class A",
      mandatory: true,
      scheme: "Scheme-I (ISI Mark)",
      issuing_ministry: "Ministry of Commerce and Industry (DIPP / DPIIT)",
      exclusion_note: "Scheduled under S.O. 189(E) Serial 20; excluded from S.O. 280(E) which regulates 13 other heavy-duty cable standards.",
      verification_status: "VERIFIED"
    };

    const updatedTech = {
      ...currentTech,
      rated_voltage: "Up to and including 450/750 V (standard) / Up to 1100 V (QCO & Product Manual)",
      rated_voltage_in_standard: ratedVoltageInStandard,
      qco_product_coverage: qcoProductCoverage
    };

    const newScope = "Specifies construction, dimensions, and test requirements for single-core and multi-core PVC-insulated cables and cords with rigid and flexible copper or aluminium conductor for rated voltages up to and including 450/750 V, with BIS Scheme-I certification extended up to and including 1100 V per PM/IS 694/5/March 2024 and QCO S.O. 189(E).";

    const updateQuery = `
      UPDATE standards
      SET 
        title = $1,
        scope = $2,
        certification = $3,
        technical_requirements = $4,
        updated_at = NOW()
      WHERE canonical_id = 'IS-694-2010'
    `;

    console.log('[Step 2] Executing UPDATE query on IS-694-2010...');
    await client.query(updateQuery, [
      fullDbTitle,
      newScope,
      JSON.stringify(updatedCert),
      JSON.stringify(updatedTech)
    ]);

    await client.query('COMMIT');
    console.log('[Step 3] Transaction COMMITTED successfully.');

    // Verification read
    const verifyRes = await client.query("SELECT canonical_id, title, certification FROM standards WHERE canonical_id = 'IS-694-2010'");
    const row = verifyRes.rows[0];
    console.log('\n--- VERIFICATION RESULT ---');
    console.log('Title:', row.title);
    console.log('Official Standard Title:', row.certification.official_standard_title);
    console.log('QCO Schedule Description:', row.certification.qco_schedule_description);
    console.log('Product Manual Title:', row.certification.product_manual_title);
    console.log('Certification Scope:', row.certification.certification_scope);
    console.log('Rated Voltage in Standard:', row.certification.rated_voltage_in_standard);
    console.log('QCO Product Coverage:', row.certification.qco_product_coverage);
    console.log('Discrepancy Note:', row.certification.discrepancy_note);
    console.log('Source References:', JSON.stringify(row.certification.source_references, null, 2));

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Reconciliation failed, rolled back:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

reconcileIS694().catch(err => {
  console.error(err);
  process.exit(1);
});
