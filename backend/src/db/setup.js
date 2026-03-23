const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function run() {
  const client = await pool.connect();
  try {
    console.log('Dropping and recreating schema...');
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public; CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    const migrationDir = path.join(__dirname, 'migrations');
    const discoveredFiles = fs
      .readdirSync(migrationDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    const migrationFiles = discoveredFiles.includes('001_schema.sql')
      ? ['001_schema.sql']
      : discoveredFiles;

    for (const file of migrationFiles) {
      console.log(`Running ${file}...`);
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
      await client.query(sql);
    }

    console.log('Done successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Fatal Error:', err.message);
    process.exit(1);
  }
}

run();