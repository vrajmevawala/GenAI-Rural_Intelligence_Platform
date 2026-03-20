const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function describeTable() {
  try {
    const res = await pool.query(`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'fvi_records'
    `);
    const cols = res.rows.map(r => r.column_name);
    console.log("FVI_RECORDS COLUMNS:", cols.join(", "));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

describeTable();
