require('dotenv').config();
const { pool } = require('./src/config/db');

async function listFarmers() {
  try {
    const result = await pool.query(
      `SELECT id, name, phone, primary_crop, district
       FROM farmers 
       WHERE phone IS NOT NULL 
       LIMIT 10`
    );
    
    console.log(`\n Found ${result.rows.length} farmers with phone numbers:\n`);
    result.rows.forEach((f) => {
      console.log(`  ID: ${f.id}`);
      console.log(`  Name: ${f.name}`);
      console.log(`  Phone: ${f.phone}`);
      console.log(`  Crop: ${f.primary_crop}`);
      console.log(`  District: ${f.district}\n`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

listFarmers();
