const { pool } = require('./src/config/db');
const dotenv = require('dotenv');
dotenv.config();

async function checkFarmersColumns() {
  try {
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'farmers'
    `);
    console.log('--- Farmers Columns ---');
    res.rows.forEach(r => console.log(r.column_name));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkFarmersColumns();
