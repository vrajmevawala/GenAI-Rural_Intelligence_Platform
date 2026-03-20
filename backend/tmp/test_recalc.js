const { Pool } = require('pg');
require('dotenv').config();
const { recalculateFarmerScore } = require('../src/modules/vulnerability/vulnerability.service');

const farmerId = "d6509c2c-7bc9-4e82-8e9e-adcc934221c6";

async function test() {
  try {
    const res = await recalculateFarmerScore(farmerId, { role: 'test' }, 'manual');
    console.log("SUCCESS:", JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("FAILURE:", err);
  } finally {
    const { pool } = require('../src/config/db');
    await pool.end();
  }
}

test();
