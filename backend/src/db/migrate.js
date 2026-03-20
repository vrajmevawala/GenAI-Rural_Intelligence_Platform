const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { pool } = require("../config/db");

dotenv.config();

async function runMigration() {
  const migrationPath = path.join(__dirname, "migrations", "001_init.sql");
  const sql = fs.readFileSync(migrationPath, "utf8");

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    // eslint-disable-next-line no-console
    console.log("Migration completed successfully");
  } catch (err) {
    await client.query("ROLLBACK");
    // eslint-disable-next-line no-console
    console.error("Migration failed", err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
