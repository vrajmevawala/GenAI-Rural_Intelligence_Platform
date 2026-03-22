const { pool } = require("./src/config/db");

async function addValidationScoreColumn() {
  try {
    console.log("Adding validation_score column to alerts table...");
    
    await pool.query(
      `ALTER TABLE alerts ADD COLUMN IF NOT EXISTS validation_score INTEGER DEFAULT 100`
    );
    console.log("✓ Column added");
    
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_alerts_validation_score ON alerts(validation_score)`
    );
    console.log("✓ Index created");
    
    console.log("\n✓ Migration completed successfully");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

addValidationScoreColumn();
