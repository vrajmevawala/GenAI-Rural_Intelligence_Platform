const { recalculateFarmerScore } = require('./src/modules/vulnerability/vulnerability.service');
const { pool } = require('./src/config/db');
const dotenv = require('dotenv');
dotenv.config();

async function test() {
  try {
    const res = await pool.query('SELECT id, name FROM farmers LIMIT 1');
    if (!res.rows[0]) {
      console.log('No farmers found');
      process.exit(1);
    }
    const farmerId = res.rows[0].id;
    console.log('Testing recalculation for farmer:', farmerId, '(', res.rows[0].name, ')');
    
    const result = await recalculateFarmerScore(farmerId, { role: 'system' }, 'manual');
    console.log('Recalculation result score:', result.score);
    console.log('Recalculation result breakdown:', JSON.stringify(result.breakdown, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error('Recalculation failed:', err);
    process.exit(1);
  }
}

test();
