const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function seed() {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'migrations', 'khedutmitra_full_seed.sql'), 'utf8');
    await client.query(sql);
    console.log('Seed completed successfully');
  } catch (err) {
    console.error('Seed failed', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
