const { v4: uuidv4 } = require("uuid");
const { pool } = require("../../config/db");
const { AppError } = require("../../middleware/errorHandler");
const whatsappService = require("../whatsapp/whatsapp.service");
const logger = require("../../utils/logger");

async function listAlerts(farmerId) {
  let sql = "SELECT * FROM alerts";
  let values = [];
  if (farmerId) {
    sql += " WHERE farmer_id = $1";
    values.push(farmerId);
  }
  sql += " ORDER BY created_at DESC";
  const { rows } = await pool.query(sql, values);
  return { alerts: rows };
}

async function createAlert(payload) {
  const id = uuidv4();
  const sql = `
    INSERT INTO alerts (id, farmer_id, crop_id, message, reason, risk_level)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const values = [id, payload.farmer_id, payload.crop_id, payload.message, payload.reason, payload.risk_level];
  const { rows } = await pool.query(sql, values);
  return rows[0];
}

async function generateAlertsForFarmer(user, farmerId, ip) {
  // Simple logic: create a dummy alert for the farmer
  const farmerRes = await pool.query("SELECT * FROM farmers WHERE id = $1", [farmerId]);
  if (farmerRes.rowCount === 0) throw new AppError("Farmer not found", 404);
  const farmer = farmerRes.rows[0];
  
  const id = uuidv4();
  const sql = `
    INSERT INTO alerts (id, farmer_id, message, reason, risk_level, status)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const values = [
    id, 
    farmerId, 
    "Potential moisture stress detected. Consider irrigation.", 
    "High temperature + No rain", 
    "MEDIUM", 
    "pending"
  ];
  const { rows } = await pool.query(sql, values);

  // Auto-trigger WhatsApp delivery for freshly generated alerts.
  // Keep alert generation successful even if WhatsApp send fails.
  try {
    const organizationId = user?.institutionId || farmer.organization_id;
    if (organizationId) {
      await whatsappService.initiateBot(farmerId, organizationId, "gu");
    } else {
      logger.warn("Skipping WhatsApp auto-send: organizationId missing", {
        farmerId,
        action: "alerts.whatsapp.autosend.skipped",
      });
    }
  } catch (err) {
    logger.error("WhatsApp auto-send failed after alert generation", {
      farmerId,
      error: err.message,
      action: "alerts.whatsapp.autosend.failed",
    });
  }

  return rows[0];
}

async function updateAlertStatus(user, id, status, ip) {
  const sql = "UPDATE alerts SET status = $1 WHERE id = $2 RETURNING *";
  const { rows } = await pool.query(sql, [status, id]);
  if (rows.length === 0) throw new AppError("Alert not found", 404);
  return rows[0];
}

async function getPendingHighUrgent(user) {
  const sql = "SELECT * FROM alerts WHERE status = 'pending' AND (risk_level = 'HIGH' OR risk_level = 'CRITICAL') LIMIT 5";
  const { rows } = await pool.query(sql);
  return rows;
}

module.exports = {
  listAlerts,
  createAlert,
  generateAlertsForFarmer,
  updateAlertStatus,
  getPendingHighUrgent
};
