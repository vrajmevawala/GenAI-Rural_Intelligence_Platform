const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { pool } = require("../config/db");

dotenv.config();

async function runMigration() {
  const migrationDir = path.join(__dirname, "migrations");
  const discoveredFiles = fs
    .readdirSync(migrationDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const migrationFiles = discoveredFiles.includes("001_schema.sql")
    ? ["001_schema.sql"]
    : discoveredFiles;

  const client = await pool.connect();

  try {
    for (const file of migrationFiles) {
      const migrationPath = path.join(migrationDir, file);
      const sql = fs.readFileSync(migrationPath, "utf8");

      // eslint-disable-next-line no-console
      console.log(`Running migration: ${file}`);

      await client.query("BEGIN");
      await client.query(sql);
      await client.query("COMMIT");

      // eslint-disable-next-line no-console
      console.log(`✓ ${file} completed`);
    }

    // eslint-disable-next-line no-console
    console.log("\n✓ All migrations completed successfully");
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
