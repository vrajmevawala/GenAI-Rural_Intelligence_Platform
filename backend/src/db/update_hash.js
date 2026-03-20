const bcrypt = require("bcryptjs");
const { pool } = require("../config/db");

async function updateHash() {
  try {
    const password = "Admin@1234";
    const email = "admin@graamai.com";
    const hash = await bcrypt.hash(password, 12);
    
    const res = await pool.query(
      "UPDATE institution_users SET password = $1 WHERE email = $2",
      [hash, email]
    );
    
    if (res.rowCount > 0) {
      console.log(`Successfully updated hash for ${email}`);
      console.log(`New Hash: ${hash}`);
    } else {
      console.log(`User ${email} not found.`);
    }
    process.exit(0);
  } catch (err) {
    console.error("Error updating hash", err);
    process.exit(1);
  }
}

updateHash();
