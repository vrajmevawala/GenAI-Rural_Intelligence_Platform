const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function findFarmer() {
  try {
    const res = await pool.query("SELECT id, name FROM farmers LIMIT 1");
    console.log(JSON.stringify(res.rows[0]));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

findFarmer();
