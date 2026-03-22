require('dotenv').config();
const { pool } = require('./src/config/db');

async function addForecastJsonColumn() {
  try {
    console.log('Adding forecast_json column to weather_cache...\n');
    
    await pool.query(`
      ALTER TABLE weather_cache 
      ADD COLUMN IF NOT EXISTS forecast_json JSONB DEFAULT '{}'::jsonb
    `);
    
    console.log('✓ forecast_json column added\n');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

addForecastJsonColumn();
