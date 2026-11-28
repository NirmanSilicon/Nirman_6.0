require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function inspect() {
  try {
    const res = await pool.query('SELECT canonical_id, is_number, title, scope, description, certification FROM standards WHERE canonical_id = $1', ['IS-694-2010']);
    console.log('--- IS 694 RECORD ---');
    console.log(JSON.stringify(res.rows[0], null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

inspect();
