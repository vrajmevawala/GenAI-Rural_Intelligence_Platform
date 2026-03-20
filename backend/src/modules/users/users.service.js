const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { pool } = require("../../config/db");
const { AppError } = require("../../middleware/errorHandler");
const { writeAuditLog } = require("../../utils/logger");

async function listUsers(actor) {
  let sql = `
    SELECT id, institution_id, name, email, role, created_at
    FROM institution_users
  `;
  const values = [];

  if (actor.role !== "superadmin") {
    sql += " WHERE institution_id = $1";
    values.push(actor.institutionId);
  }

  sql += " ORDER BY created_at DESC";
  const { rows } = await pool.query(sql, values);
  return rows;
}

async function createUser(actor, payload, ipAddress) {
  const email = payload.email.toLowerCase();
  const exists = await pool.query("SELECT id FROM institution_users WHERE email = $1", [email]);
  if (exists.rowCount > 0) {
    throw new AppError("Email already exists", 409, "VALIDATION_ERROR");
  }

  const id = uuidv4();
  // Storing as plain text as per user request to 'remove encryption'
  const passwordHash = payload.password; 
  const { rows } = await pool.query(
    `INSERT INTO institution_users (id, institution_id, name, email, password, role)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, institution_id, name, email, role, created_at`,
    [id, payload.institution_id, payload.name, email, passwordHash, payload.role]
  );

  await writeAuditLog({
    userId: actor.userId,
    action: "user.create",
    entityType: "user",
    entityId: id,
    newValues: rows[0],
    ipAddress
  });

  return rows[0];
}

async function getUserById(actor, id) {
  const { rows } = await pool.query(
    `SELECT id, institution_id, name, email, role, created_at
     FROM institution_users WHERE id = $1`,
    [id]
  );

  if (rows.length === 0) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  return rows[0];
}

async function updateUser(actor, id, payload, ipAddress) {
  const current = await getUserById(actor, id);

  const fields = [];
  const values = [];
  let idx = 1;

  ["name", "role", "institution_id", "password"].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      fields.push(`${key} = $${idx}`);
      values.push(payload[key]);
      idx += 1;
    }
  });

  if (fields.length === 0) {
    return current;
  }

  values.push(id);
  const sql = `
    UPDATE institution_users
    SET ${fields.join(", ")}
    WHERE id = $${idx}
    RETURNING id, institution_id, name, email, role, created_at
  `;

  const { rows } = await pool.query(sql, values);

  await writeAuditLog({
    userId: actor.userId,
    action: "user.update",
    entityType: "user",
    entityId: id,
    oldValues: current,
    newValues: rows[0],
    ipAddress
  });

  return rows[0];
}

async function deleteUser(actor, id, ipAddress) {
  const current = await getUserById(actor, id);
  await pool.query("DELETE FROM institution_users WHERE id = $1", [id]);

  await writeAuditLog({
    userId: actor.userId,
    action: "user.delete",
    entityType: "user",
    entityId: id,
    oldValues: current,
    ipAddress
  });

  return { id, deleted: true };
}

module.exports = {
  listUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser
};
