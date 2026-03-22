const { pool } = require('./src/config/db');

(async () => {
  try {
    const farmerId = '50000000-0000-0000-0000-000000000001';
    
    // Clear recent alerts
    const result = await pool.query(
      'DELETE FROM alerts WHERE farmer_id = $1',
      [farmerId]
    );
    
    console.log(`✅ Cleared ${result.rowCount} alerts for farmer ${farmerId}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
