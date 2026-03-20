const { pool } = require('./src/config/db');
const dotenv = require('dotenv');
dotenv.config();

async function checkSuresh() {
  try {
    const res = await pool.query(`
      SELECT f.id, f.name, f.soil_type, c.name as crop_name, c.ideal_soil 
      FROM farmers f 
      JOIN farmer_crops fc ON fc.farmer_id = f.id 
      JOIN crops c ON c.id = fc.crop_id
      WHERE f.name = 'Suresh Kumar'
    `);
    
    if (res.rows[0]) {
      const suresh = res.rows[0];
      console.log('--- Suresh Kumar ID ---');
      console.log(suresh.id);
      
      const fvi = await pool.query('SELECT score, breakdown FROM fvi_records WHERE farmer_id = $1 ORDER BY created_at DESC LIMIT 1', [suresh.id]);
      console.log('--- Latest FVI ---');
      console.log(JSON.stringify(fvi.rows[0], null, 2));
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSuresh();
