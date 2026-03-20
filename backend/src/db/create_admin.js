const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { pool } = require("../config/db");

async function createDefaultUser() {
  try {
    const instRes = await pool.query("SELECT id FROM institutions LIMIT 1");
    if (instRes.rowCount === 0) {
      console.error("No institutions found. Please create one first.");
      process.exit(1);
    }
    const institutionId = instRes.rows[0].id;

    const email = "admin@graamai.com";
    const password = "Admin@1234";
    const passwordHash = await bcrypt.hash(password, 12);

    await pool.query(
      `INSERT INTO institution_users (id, institution_id, name, email, password, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO NOTHING`,
      [uuidv4(), institutionId, "Default Admin", email, passwordHash, "superadmin"]
    );

    console.log("Default superadmin created successfully:");
    console.log("Email:", email);
    console.log("Password:", password);
    process.exit(0);
  } catch (err) {
    console.error("Error creating default user", err);
    process.exit(1);
  }
}

createDefaultUser();
