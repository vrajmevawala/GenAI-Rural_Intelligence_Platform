require('dotenv').config();
const { pool } = require('./src/config/db');

async function checkSchema() {
  try {
    const result = await pool.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name='weather_cache' 
       ORDER BY ordinal_position`
    );
    
    console.log('\n Weather Cache Table Columns:\n');
    result.rows.forEach(c => {
      console.log(`  • ${c.column_name}: ${c.data_type}`);
    });
    
    console.log('\n');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkSchema();
