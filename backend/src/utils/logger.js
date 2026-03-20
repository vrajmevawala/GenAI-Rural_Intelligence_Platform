const { v4: uuidv4 } = require("uuid");
const { pool } = require("../config/db");

function log(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta
  };

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(entry));
}

function info(message, meta) {
  log("info", message, meta);
}

function warn(message, meta) {
  log("warn", message, meta);
}

function error(message, meta) {
  log("error", message, meta);
}

async function writeAuditLog(payload) {
  try {
    const {
      userId = null,
      action,
      entityType,
      entityId,
      oldValues = null,
      newValues = null,
      ipAddress = null
    } = payload;

    const sql = `
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    await pool.query(sql, [
      uuidv4(),
      userId,
      action,
      entityType,
      entityId,
      oldValues,
      newValues,
      ipAddress
    ]);
  } catch (err) {
    // Gracefully handle missing audit_logs table (since we are limited to 16 tables)
    warn("Failed to write audit log to DB (table might be missing)", {
      error: err.message,
      auditAction: payload.action
    });
  }
}

async function withAudit(auditPayload, operationFn) {
  const result = await operationFn();
  await writeAuditLog(auditPayload);
  return result;
}

module.exports = {
  info,
  warn,
  error,
  writeAuditLog,
  withAudit
};
