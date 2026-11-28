/**
 * NIRDESHAK Database Remediation Script
 * Executes regulatory metadata corrections in a strict database transaction:
 * - IS 694: S.O. 189(E) Serial 20, commencement 17 August 2003 (Clause 1(2)), PM/IS 694/5/March 2024
 * - IS 8828 / IS/IEC 60898-1: S.O. 189(E) Serial 10, commencement 17 August 2003 (Clause 1(2)),
 *   separate successor adoption evidence.
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function remediate() {
  console.log('='.repeat(80));
  console.log('STARTING NIRDESHAK REGULATORY REMEDIATION (DATABASE TRANSACTION)');
  console.log('='.repeat(80));

  const client = await pool.connect();

  try {
    await client.query('BEGIN;');
    console.log('[Transaction]: BEGIN');

    // 1. Fetch current records to confirm existence
    const cur694Res = await client.query("SELECT id, canonical_id, is_number, title, certification FROM standards WHERE canonical_id = 'IS-694-2010';");
    if (cur694Res.rowCount === 0) throw new Error('IS-694-2010 record not found in database');

    const cur60898Res = await client.query("SELECT id, canonical_id, is_number, title, certification FROM standards WHERE canonical_id = 'IS-IEC-60898-1-2015';");
    if (cur60898Res.rowCount === 0) throw new Error('IS-IEC-60898-1-2015 record not found in database');

    const cur694 = cur694Res.rows[0];
    const cur60898 = cur60898Res.rows[0];

    // 2. Prepare remediated certification JSONB for IS 694
    const newCert694 = {
      ...cur694.certification,
      regulatory_class: 'Class A',
      mandatory: true,
      qco_name: 'Electrical Wires, Cables, Appliances and Protection Devices and Accessories (Quality Control) Order, 2003',
      gazette_no: 'S.O. 189(E)',
      gazette_date: '2003-02-17',
      effective_date: '2003-08-17',
      commencement_date: '2003-08-17',
      issuing_ministry: 'Ministry of Commerce and Industry (DIPP / DPIIT)',
      schedule_item: 'Serial Number 20 of Schedule',
      schedule_serial: 20,
      applicable_group: 'Schedule serials 8 to 24 (6 months transition)',
      statutory_basis: 'Bureau of Indian Standards Act, 1986 (Section 14) / 2016 Act',
      scheme: 'Scheme-I (ISI Mark)',
      product_manual_ref: 'PM/IS 694/5/March 2024',
      commencement_clause_note: 'Came into force six months from the date of publication per Paragraph 1(2) of S.O. 189(E) for schedule serials 8 to 24 (effective 17 August 2003).',
      exclusion_note: 'Scheduled under S.O. 189(E) Serial 20; excluded from S.O. 280(E) which regulates 13 other heavy-duty cable standards.',
      voltage_rating: 'Up to and including 1100 V',
      verification_status: 'VERIFIED'
    };

    // Ensure title explicitly states 1100 V
    const title694 = 'Polyvinyl Chloride Insulated Unsheathed and Sheathed Cables/Cords with Rigid and Flexible Conductor for Rated Voltages Up to and Including 1100 V (Fourth Revision)';

    // Update IS 694
    await client.query(`
      UPDATE standards
      SET certification = $1,
          title = $2,
          updated_at = NOW()
      WHERE canonical_id = 'IS-694-2010';
    `, [newCert694, title694]);
    console.log('[Update]: IS-694-2010 metadata updated successfully.');

    // 3. Prepare remediated certification JSONB for IS/IEC 60898-1:2015
    const newCert60898 = {
      ...cur60898.certification,
      regulatory_class: 'Class A',
      mandatory: true,
      qco_name: 'Electrical Wires, Cables, Appliances and Protection Devices and Accessories (Quality Control) Order, 2003',
      gazette_no: 'S.O. 189(E)',
      gazette_date: '2003-02-17',
      effective_date: '2003-08-17',
      commencement_date: '2003-08-17',
      issuing_ministry: 'Ministry of Commerce and Industry (DIPP / DPIIT)',
      schedule_item: 'Serial Number 10 of Schedule (originally specified as IS 8828)',
      schedule_serial: 10,
      applicable_group: 'Schedule serials 8 to 24 (6 months transition)',
      statutory_basis: 'Bureau of Indian Standards Act, 1986 (Section 14) / 2016 Act',
      scheme: 'Scheme-I (ISI Mark)',
      product_manual_ref: 'PM/IS/IEC 60898-1',
      commencement_clause_note: 'Original standard IS 8828 scheduled at Serial 10 came into force six months from publication per Paragraph 1(2) on 17 August 2003.',
      predecessor_standard: 'IS 8828:1996',
      successor_adoption_note: 'Original 2003 Gazette scheduled predecessor IS 8828. BIS Electrotechnical division harmonized IS 8828 with IEC 60898-1 and confirmed successor IS/IEC 60898-1 coverage under mandatory certification. Successor edition is not claimed to be explicitly listed in 2003 Gazette.',
      verification_status: 'VERIFIED'
    };

    // Update IS/IEC 60898-1
    await client.query(`
      UPDATE standards
      SET certification = $1,
          updated_at = NOW()
      WHERE canonical_id = 'IS-IEC-60898-1-2015';
    `, [newCert60898]);
    console.log('[Update]: IS-IEC-60898-1-2015 metadata updated successfully.');

    // 4. Update evidence in standard_relationships for IS 8828 / IS/IEC 60898-1
    const predEvidence = 'Original standard IS 8828:1996 was scheduled at Serial 10 of S.O. 189(E) (effective 17 August 2003 per Clause 1(2)). BIS Electrotechnical division harmonized IS 8828 with IEC 60898-1 to formulate IS/IEC 60898-1, transferring certification licensing to the successor standard.';
    await client.query(`
      UPDATE standard_relationships
      SET evidence = $1
      WHERE relationship_type = 'predecessor_to' AND target_is_number LIKE '%60898%';
    `, [predEvidence]);

    const succEvidence = 'Active canonical national standard for MCBs replacing legacy IS 8828:1996. S.O. 189(E) Serial 10 originally mandated IS 8828 from 17 August 2003; mandatory Scheme-I licensing transferred to IS/IEC 60898-1 under BIS transition guidelines without claiming the 2003 Gazette explicitly named the 2015 edition.';
    await client.query(`
      UPDATE standard_relationships
      SET evidence = $1
      WHERE relationship_type = 'successor_to' AND source_is_number LIKE '%60898%';
    `, [succEvidence]);
    console.log('[Update]: standard_relationships predecessor/successor evidence updated.');

    // 5. Verification checks inside transaction before COMMIT
    const verify694 = await client.query("SELECT canonical_id, title, certification FROM standards WHERE canonical_id = 'IS-694-2010';");
    const vCert694 = verify694.rows[0].certification;
    if (vCert694.schedule_serial !== 20) throw new Error(`IS 694 schedule_serial verification failed: got ${vCert694.schedule_serial}`);
    if (vCert694.effective_date !== '2003-08-17') throw new Error(`IS 694 effective_date verification failed: got ${vCert694.effective_date}`);
    if (!verify694.rows[0].title.includes('1100 V')) throw new Error('IS 694 title verification failed: missing 1100 V');

    const verify60898 = await client.query("SELECT canonical_id, certification FROM standards WHERE canonical_id = 'IS-IEC-60898-1-2015';");
    const vCert60898 = verify60898.rows[0].certification;
    if (vCert60898.schedule_serial !== 10) throw new Error(`IS 60898 schedule_serial verification failed: got ${vCert60898.schedule_serial}`);
    if (vCert60898.effective_date !== '2003-08-17') throw new Error(`IS 60898 effective_date verification failed: got ${vCert60898.effective_date}`);

    await client.query('COMMIT;');
    console.log('[Transaction]: COMMIT - All database updates verified and committed cleanly!');

  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('[Transaction]: ROLLBACK due to error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

remediate().then(() => {
  console.log('Remediation script finished cleanly.');
  process.exit(0);
}).catch(e => {
  console.error('Remediation script failed:', e);
  process.exit(1);
});
