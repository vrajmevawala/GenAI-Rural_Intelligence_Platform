const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const { pool } = require("../../config/db");
const { ROLE_LEVELS, ROLES } = require("../../config/constants");
const { AppError } = require("../../middleware/errorHandler");
const { writeAuditLog } = require("../../utils/logger");

function ensureOrgScope(actor, orgId) {
  if (actor.role !== ROLES.SUPERADMIN && actor.organizationId !== orgId) {
    throw new AppError("Organization scope violation", 403, "PERMISSION_DENIED");
  }
}

function ensureRoleAssignable(actorRole, targetRole) {
  if (ROLE_LEVELS[targetRole] > ROLE_LEVELS[actorRole]) {
    throw new AppError("Cannot assign higher role", 403, "PERMISSION_DENIED");
  }
}

async function listUsers(actor) {
  let sql = `
    SELECT id, organization_id, name, email, role, preferred_language, is_active, last_login_at, created_at
    FROM users
  `;
  const values = [];

  if (actor.role !== ROLES.SUPERADMIN) {
    sql += " WHERE organization_id = $1";
    values.push(actor.organizationId);
  }

  sql += " ORDER BY created_at DESC";
  const { rows } = await pool.query(sql, values);
  return rows;
}

async function createUser(actor, payload, ipAddress) {
  ensureOrgScope(actor, payload.organization_id);
  ensureRoleAssignable(actor.role, payload.role);

  const email = payload.email.toLowerCase();
  const exists = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (exists.rowCount > 0) {
    throw new AppError("Email already exists", 409, "VALIDATION_ERROR");
  }

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(payload.password, 12);
  const { rows } = await pool.query(
    `INSERT INTO users (id, organization_id, name, email, password_hash, role, preferred_language)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, organization_id, name, email, role, preferred_language, is_active, created_at`,
    [id, payload.organization_id, payload.name, email, passwordHash, payload.role, payload.preferred_language]
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
    `SELECT id, organization_id, name, email, role, preferred_language, is_active, last_login_at, created_at
     FROM users WHERE id = $1`,
    [id]
  );

  if (rows.length === 0) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  ensureOrgScope(actor, rows[0].organization_id);
  return rows[0];
}

async function updateUser(actor, id, payload, ipAddress) {
  const current = await getUserById(actor, id);

  const fields = [];
  const values = [];
  let idx = 1;

  ["name", "preferred_language", "is_active"].forEach((key) => {
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
    UPDATE users
    SET ${fields.join(", ")}, updated_at = NOW()
    WHERE id = $${idx}
    RETURNING id, organization_id, name, email, role, preferred_language, is_active, last_login_at, created_at, updated_at
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

async function softDeleteUser(actor, id, ipAddress) {
  const current = await getUserById(actor, id);

  await pool.query("UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1", [id]);

  await writeAuditLog({
    userId: actor.userId,
    action: "user.soft_delete",
    entityType: "user",
    entityId: id,
    oldValues: current,
    newValues: { is_active: false },
    ipAddress
  });

  return { id, is_active: false };
}

module.exports = {
  listUsers,
  createUser,
  getUserById,
  updateUser,
  softDeleteUser
};
