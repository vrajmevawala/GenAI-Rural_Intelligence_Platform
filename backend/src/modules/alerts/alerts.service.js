const { v4: uuidv4 } = require("uuid");
const { pool } = require("../../config/db");
const { AppError } = require("../../middleware/errorHandler");
const { generateAlert } = require("../../utils/alertGenerator");
const { ALERT_TYPES } = require("../../utils/alertTypes");

async function listAlerts(filters = {}) {
  const { farmer_id, priority, status, alert_type, limit = 50 } = filters;
  const where = [];
  const values = [];

  if (farmer_id) {
    values.push(farmer_id);
    where.push(`a.farmer_id = $${values.length}`);
  }
  if (priority) {
    values.push(String(priority).toLowerCase());
    where.push(`a.priority = $${values.length}`);
  }
  if (status) {
    values.push(status);
    where.push(`a.status = $${values.length}`);
  }
  if (alert_type) {
    values.push(alert_type);
    where.push(`a.alert_type = $${values.length}`);
  }

  values.push(Number(limit) > 0 ? Number(limit) : 50);
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const sql = `
    SELECT a.*, f.name AS farmer_name
    FROM alerts a
    LEFT JOIN farmers f ON f.id = a.farmer_id
    ${whereSql}
    ORDER BY a.created_at DESC
    LIMIT $${values.length}
  `;
  const { rows } = await pool.query(sql, values);
  return { alerts: rows };
}

async function createAlert(payload) {
  const id = uuidv4();
  const sql = `
    INSERT INTO alerts (
      id, farmer_id, organization_id, alert_type, priority, language,
      message_text, message, voice_note_script, reason, status, ai_generated,
      created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
    RETURNING *
  `;
  const values = [
    id,
    payload.farmer_id,
    payload.organization_id || null,
    payload.alert_type || ALERT_TYPES.CUSTOM,
    payload.priority || "medium",
    payload.language || "gu",
    payload.message_text || payload.message || "",
    payload.message || payload.message_text || "",
    payload.voice_note_script || "",
    payload.reason || "",
    payload.status || "pending",
    payload.ai_generated !== false
  ];
  const { rows } = await pool.query(sql, values);
  return rows[0];
}

async function generateFarmerAlert(farmerId, organizationId, alertType, language, contextData = {}) {
  return generateAlert({
    farmerId,
    organizationId,
    alertType,
    language,
    contextData,
    sendWhatsAppMessage: false
  });
}

async function generateAlertsForFarmer(user, farmerId, body = {}) {
  const { alertType = ALERT_TYPES.CUSTOM, language = "gu", context = {} } = body;
  const result = await generateFarmerAlert(
    farmerId,
    user?.organizationId || user?.institutionId,
    alertType,
    language,
    context
  );

  return {
    alert: result.alert,
    preview: {
      whatsapp: result.messages.whatsappMessage,
      dashboard: result.messages.dashboardMessage,
      voiceNote: result.messages.voiceNoteScript
    }
  };
}

async function updateAlertStatus(user, id, status, ip) {
  const sql = "UPDATE alerts SET status = $1 WHERE id = $2 RETURNING *";
  const { rows } = await pool.query(sql, [status, id]);
  if (rows.length === 0) throw new AppError("Alert not found", 404);
  return rows[0];
}

async function getPendingHighUrgent(user) {
  const sql = `
    SELECT a.*, f.name AS farmer_name
    FROM alerts a
    LEFT JOIN farmers f ON f.id = a.farmer_id
    WHERE a.status = 'pending' AND (a.priority = 'high' OR a.priority = 'urgent')
    ORDER BY a.created_at DESC
    LIMIT 5
  `;
  const { rows } = await pool.query(sql);
  return rows;
}

module.exports = {
  listAlerts,
  createAlert,
  generateFarmerAlert,
  generateAlertsForFarmer,
  updateAlertStatus,
  getPendingHighUrgent
};
