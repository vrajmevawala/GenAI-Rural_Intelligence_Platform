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

    const existing = await pool.query(
      "SELECT id FROM institution_users WHERE email = $1 LIMIT 1",
      [email]
    );

    if (existing.rowCount > 0) {
      await pool.query(
        "UPDATE institution_users SET password = $1, role = $2 WHERE id = $3",
        [passwordHash, "superadmin", existing.rows[0].id]
      );
      console.log("Default superadmin already existed; password updated successfully:");
      console.log("Email:", email);
      console.log("Password:", password);
      process.exit(0);
    }

    await pool.query(
      `INSERT INTO institution_users (id, institution_id, name, email, password, role)
       VALUES ($1, $2, $3, $4, $5, $6)`,
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
