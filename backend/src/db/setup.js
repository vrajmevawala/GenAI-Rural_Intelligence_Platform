const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function run() {
  const client = await pool.connect();
  try {
    console.log('Dropping schema...');
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public; CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    
    console.log('Running 001_init.sql...');
    const sql1 = fs.readFileSync(path.join(__dirname, 'migrations', '001_init.sql'), 'utf8');
    await client.query(sql1);
    
    console.log('Running graamai_full_seed.sql...');
    const sql2 = fs.readFileSync(path.join(__dirname, 'graamai_full_seed.sql'), 'utf8');
    await client.query(sql2);
    
    console.log('Done successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Fatal Error:', err.message);
    process.exit(1);
  }
}

run();
