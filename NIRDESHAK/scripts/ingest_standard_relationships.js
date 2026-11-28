const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432', 10),
  database: process.env.PG_DATABASE || 'nirdeshak_clean_20261126',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'surya123'
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('Ingesting verified standard relationships into standard_relationships...');

    const pairs = [
      {
        srcIs: 'IS 4926:2003',
        tgtIs: 'IS 456:2000',
        type: 'normative',
        evidence: 'IS 4926 Clause 4 specifies compliance with IS 456 for constituent materials, structural concrete grades, and durability requirements.',
        source: 'BIS Official Standard Clause 4'
      },
      {
        srcIs: 'IS 4926:2003',
        tgtIs: 'IS 10262:2019',
        type: 'normative',
        evidence: 'IS 4926 Clause 5 specifies concrete mix proportioning in accordance with IS 10262 guidelines.',
        source: 'BIS Official Standard Clause 5'
      },
      {
        srcIs: 'IS 4926:2003',
        tgtIs: 'IS 516 (Part 1/Sec 1):2021',
        type: 'testing',
        evidence: 'IS 4926 Clause 8 mandates sampling and compressive strength testing of concrete specimens in accordance with IS 516.',
        source: 'BIS Official Standard Clause 8'
      },
      {
        srcIs: 'IS 4926:2003',
        tgtIs: 'IS 9103:1999',
        type: 'materials',
        evidence: 'IS 4926 Clause 4.3 mandates chemical admixtures used in ready-mixed concrete must conform to IS 9103.',
        source: 'BIS Official Standard Clause 4.3'
      },
      {
        srcIs: 'IS 458:2021',
        tgtIs: 'IS 456:2000',
        type: 'normative',
        evidence: 'IS 458 specifies concrete mix durability and reinforcement fabrication conforming to IS 456.',
        source: 'BIS Official Standard'
      },
      {
        srcIs: 'IS 458:2021',
        tgtIs: 'IS 516 (Part 1/Sec 1):2021',
        type: 'testing',
        evidence: 'IS 458 Clause 10 mandates compressive strength testing of concrete test cubes per IS 516.',
        source: 'BIS Official Standard Clause 10'
      },
      {
        srcIs: 'IS 2185 (Part 3):1984',
        tgtIs: 'IS 516 (Part 1/Sec 1):2021',
        type: 'testing',
        evidence: 'Compressive strength determination for autoclaved aerated cellular concrete masonry blocks.',
        source: 'BIS Official Standard'
      },
      {
        srcIs: 'IS 694:2010',
        tgtIs: 'IS 10810 (Part 0):1984',
        type: 'testing',
        evidence: 'IS 694 Clause 15 references IS 10810 series for conductor resistance, spark testing, and insulation tests.',
        source: 'BIS Official Standard Clause 15'
      },
      {
        srcIs: 'IS 1180 (Part 1):2014',
        tgtIs: 'IS 335:2018',
        type: 'materials',
        evidence: 'IS 1180 Clause 7 mandates mineral insulating oil conform to IS 335 specification.',
        source: 'BIS Official Standard Clause 7'
      },
      {
        srcIs: 'IS 10258:2002',
        tgtIs: 'IS 10654:2002',
        type: 'allied',
        evidence: 'Complementary medical device standard for sterile hypodermic needles used with hypodermic syringes.',
        source: 'BIS Official Standard'
      },
      {
        srcIs: 'IS 2925:1984',
        tgtIs: 'IS 8521 (Part 1):1977',
        type: 'safety',
        evidence: 'Allied head and face protective equipment for industrial and construction hazard protection.',
        source: 'BIS Official Standard'
      },
      {
        srcIs: 'IS 15636:2012',
        tgtIs: 'IS 15633:2005',
        type: 'allied',
        evidence: 'Allied automotive pneumatic tyre specification for passenger cars under CMVR.',
        source: 'BIS / CMVR Tyre Standards'
      },
      {
        srcIs: 'IS 269:2015',
        tgtIs: 'IS 12269:2015',
        type: 'allied',
        evidence: 'High-strength 53 Grade Portland cement standard complementing 33/43 Grade OPC.',
        source: 'BIS Official Standard'
      }
    ];

    for (const p of pairs) {
      const srcRes = await client.query('SELECT id, is_number FROM standards WHERE is_number = $1', [p.srcIs]);
      const tgtRes = await client.query('SELECT id, is_number FROM standards WHERE is_number = $1', [p.tgtIs]);

      if (srcRes.rows.length > 0 && tgtRes.rows.length > 0) {
        const srcId = srcRes.rows[0].id;
        const tgtId = tgtRes.rows[0].id;

        await client.query(`
          INSERT INTO standard_relationships (
            source_standard_id, target_standard_id,
            source_is_number, target_is_number,
            relationship_type, evidence, source
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT DO NOTHING;
        `, [srcId, tgtId, p.srcIs, p.tgtIs, p.type, p.evidence, p.source]);
        console.log(`Linked: ${p.srcIs} -> ${p.tgtIs} (${p.type})`);
      } else {
        console.warn(`Could not resolve standard pair: ${p.srcIs} -> ${p.tgtIs}`);
      }
    }

    const totalRel = await client.query('SELECT count(*) FROM standard_relationships');
    console.log(`Total rows in standard_relationships now: ${totalRel.rows[0].count}`);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
