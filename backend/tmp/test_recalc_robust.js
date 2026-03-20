const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();
const { recalculateFarmerScore } = require('../src/modules/vulnerability/vulnerability.service');

const farmerId = "d6509c2c-7bc9-4e82-8e9e-adcc934221c6";

async function test() {
  try {
    const res = await recalculateFarmerScore(farmerId, { role: 'test' }, 'manual');
    fs.writeFileSync('e:/GenAI-Rural_Intelligence_Platform/backend/tmp/test_result.json', JSON.stringify({ success: true, data: res }, null, 2));
    console.log("SUCCESS");
  } catch (err) {
    // Also fetch the data to see what it looks like
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    const f = await pool.query("SELECT * FROM farmers WHERE id = $1", [farmerId]);
    const w = await pool.query("SELECT * FROM weather_cache WHERE location = $1", [f.rows[0].district]);
    
    fs.writeFileSync('e:/GenAI-Rural_Intelligence_Platform/backend/tmp/test_result.json', JSON.stringify({ 
      success: false, 
      error: err.message, 
      farmer: f.rows[0],
      weather: w.rows[0]
    }, null, 2));
    await pool.end();
    console.error("FAILURE", err.message);
  } finally {
    process.exit(0);
  }
}

test();
