const bcrypt = require('bcryptjs');
const { pool } = require('./src/config/db');

async function fix() {
  const password = 'Admin@1234';
  const hash = bcrypt.hashSync(password, 10);
  console.log('New Hash:', hash);
  
  const res = await pool.query(
    "UPDATE institution_users SET password = $1 WHERE email = 'admin@graamai.com' RETURNING *",
    [hash]
  );
  
  if (res.rowCount > 0) {
    console.log('Admin password updated successfully!');
  } else {
    console.log('Admin user not found!');
  }
  process.exit(0);
}

fix();
