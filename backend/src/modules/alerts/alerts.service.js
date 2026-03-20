const { v4: uuidv4 } = require("uuid");
const { pool } = require("../../config/db");
const { ROLES } = require("../../config/constants");
const { AppError } = require("../../middleware/errorHandler");
const { callClaude } = require("../../utils/claudeClient");
const { writeAuditLog } = require("../../utils/logger");
const { getWeatherForDistrict } = require("../weather/weather.service");

async function generateFarmerAlert(farmer, alertType, contextData, language) {
  const systemPrompt = `You are a helpful assistant for rural farmers in India working for a cooperative bank. Generate short, actionable alerts in ${language}. message_text should be under 160 characters. voice_note_script should be under 60 words in conversational tone.`;

  const userPrompt = [
    `Farmer: ${farmer.name}`,
    `Alert type: ${alertType}`,
    `Context: ${JSON.stringify(contextData)}`,
    "Return JSON with keys message_text and voice_note_script only."
  ].join("\n");

  const raw = await callClaude(systemPrompt, userPrompt, 400);
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return {
      message_text: String(parsed.message_text || "").slice(0, 160),
      voice_note_script: String(parsed.voice_note_script || "").split(" ").slice(0, 60).join(" ")
    };
  } catch (err) {
    const lines = raw.split("\n").filter(Boolean);
    return {
      message_text: (lines[0] || "Please review your recent farm support update.").slice(0, 160),
      voice_note_script: (lines.slice(1).join(" ") || lines[0] || "Please contact your field officer.")
        .split(" ")
        .slice(0, 60)
        .join(" ")
    };
  }
}

async function ensureFarmer(actor, farmerId) {
  const values = [farmerId];
  let sql = "SELECT * FROM farmers WHERE id = $1";
  if (actor.role !== ROLES.SUPERADMIN) {
    values.push(actor.organizationId);
    sql += " AND organization_id = $2";
  }
  const { rows } = await pool.query(sql, values);
  if (!rows.length) {
    throw new AppError("Farmer not found", 404, "FARMER_NOT_FOUND");
  }
  return rows[0];
}

function hasOverdueLoan(farmer) {
  if (!farmer.loan_due_date || farmer.loan_type === "none") {
    return false;
  }
  const due = new Date(farmer.loan_due_date);
  const repaid = farmer.last_repayment_date ? new Date(farmer.last_repayment_date) : null;
  return due < new Date() && (!repaid || repaid < due);
}

function insuranceExpiring(farmer) {
  if (!farmer.has_crop_insurance || !farmer.insurance_expiry_date) {
    return false;
  }
  const days = Math.floor((new Date(farmer.insurance_expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
  return days <= 30;
}

function missedPmKisan(farmer) {
  if (!farmer.pm_kisan_enrolled) {
    return false;
  }
  if (!farmer.pm_kisan_last_installment_date) {
    return true;
  }
  const days = Math.floor((new Date() - new Date(farmer.pm_kisan_last_installment_date)) / (1000 * 60 * 60 * 24));
  return days > 120;
}

async function findTriggers(farmer) {
  const triggers = [];

  if (hasOverdueLoan(farmer)) {
    triggers.push({ alert_type: "loan_overdue", priority: "urgent", context: { loan_due_date: farmer.loan_due_date } });
  }

  if (insuranceExpiring(farmer)) {
    triggers.push({
      alert_type: "insurance_expiry",
      priority: "high",
      context: { insurance_expiry_date: farmer.insurance_expiry_date }
    });
  }

  if (missedPmKisan(farmer)) {
    triggers.push({ alert_type: "pm_kisan_pending", priority: "high", context: {} });
  }

  try {
    const weather = await getWeatherForDistrict(farmer.district, farmer.state, farmer.latitude, farmer.longitude);
    if (["high", "severe"].includes(weather.drought_risk_level)) {
      triggers.push({
        alert_type: "weather_risk",
        priority: weather.drought_risk_level === "severe" ? "urgent" : "high",
        context: { drought_risk_level: weather.drought_risk_level }
      });
    }
  } catch (err) {
    // Weather is optional for trigger generation if coordinates are missing.
  }

  const schemeRes = await pool.query(
    `SELECT COUNT(*)::int AS pending
     FROM farmer_scheme_matches
     WHERE farmer_id = $1 AND is_eligible = TRUE AND application_status = 'not_started'`,
    [farmer.id]
  );

  if (schemeRes.rows[0].pending > 0) {
    triggers.push({
      alert_type: "scheme_opportunity",
      priority: "medium",
      context: { eligible_pending_schemes: schemeRes.rows[0].pending }
    });
  }

  return triggers;
}

async function insertAlertIfNotPending({ farmer, actor, trigger, aiMessage, ipAddress }) {
  const dup = await pool.query(
    `SELECT id FROM alerts WHERE farmer_id = $1 AND alert_type = $2 AND status = 'pending' LIMIT 1`,
    [farmer.id, trigger.alert_type]
  );

  if (dup.rowCount > 0) {
    return null;
  }

  const id = uuidv4();
  const { rows } = await pool.query(
    `INSERT INTO alerts (
      id, farmer_id, organization_id, triggered_by_user_id, alert_type, priority, language,
      message_text, voice_note_script, status, ai_generated
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',TRUE)
    RETURNING *`,
    [
      id,
      farmer.id,
      farmer.organization_id,
      actor?.userId || null,
      trigger.alert_type,
      trigger.priority,
      farmer.preferred_language,
      aiMessage.message_text,
      aiMessage.voice_note_script
    ]
  );

  await writeAuditLog({
    userId: actor?.userId || null,
    action: "alert.generate",
    entityType: "alert",
    entityId: id,
    newValues: rows[0],
    ipAddress
  });

  return rows[0];
}

async function generateAlertsForFarmer(actor, farmerId, ipAddress) {
  const farmer = await ensureFarmer(actor, farmerId);
  const triggers = await findTriggers(farmer);
  const alerts = [];

  for (const trigger of triggers) {
    const aiMessage = await generateFarmerAlert(
      farmer,
      trigger.alert_type,
      trigger.context,
      farmer.preferred_language || "gu"
    );

    const inserted = await insertAlertIfNotPending({ farmer, actor, trigger, aiMessage, ipAddress });
    if (inserted) {
      alerts.push(inserted);
    }
  }

  return alerts;
}

async function generateBulkAlerts(actor, ipAddress) {
  if (actor.role === ROLES.FIELD_OFFICER) {
    throw new AppError("Permission denied", 403, "PERMISSION_DENIED");
  }

  const values = [];
  let sql = "SELECT id FROM farmers WHERE vulnerability_label IN ('high', 'critical')";
  if (actor.role !== ROLES.SUPERADMIN) {
    values.push(actor.organizationId);
    sql += " AND organization_id = $1";
  }

  const { rows } = await pool.query(sql, values);

  let created = 0;
  for (const farmer of rows) {
    const generated = await generateAlertsForFarmer(actor, farmer.id, ipAddress);
    created += generated.length;
  }

  return { farmers_processed: rows.length, alerts_created: created };
}

async function listAlerts(actor, filters, page, limit, offset) {
  const where = [];
  const values = [];

  if (filters.priority) {
    values.push(filters.priority);
    where.push(`priority = $${values.length}`);
  }
  if (filters.status) {
    values.push(filters.status);
    where.push(`status = $${values.length}`);
  }
  if (filters.alert_type) {
    values.push(filters.alert_type);
    where.push(`alert_type = $${values.length}`);
  }
  if (filters.farmer_id) {
    values.push(filters.farmer_id);
    where.push(`farmer_id = $${values.length}`);
  }

  if (actor.role !== ROLES.SUPERADMIN) {
    values.push(actor.organizationId);
    where.push(`organization_id = $${values.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const listSql = `
    SELECT *
    FROM alerts
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;

  const countSql = `SELECT COUNT(*)::int AS total FROM alerts ${whereSql}`;

  const [listRes, countRes] = await Promise.all([
    pool.query(listSql, [...values, limit, offset]),
    pool.query(countSql, values)
  ]);

  return {
    rows: listRes.rows,
    total: countRes.rows[0].total,
    page,
    limit
  };
}

async function updateAlertStatus(actor, id, status, ipAddress) {
  const matchRes = await pool.query("SELECT * FROM alerts WHERE id = $1", [id]);
  if (matchRes.rowCount === 0) {
    throw new AppError("Alert not found", 404, "ALERT_NOT_FOUND");
  }

  const current = matchRes.rows[0];

  if (actor.role !== ROLES.SUPERADMIN && current.organization_id !== actor.organizationId) {
    throw new AppError("Permission denied", 403, "PERMISSION_DENIED");
  }

  const sentAt = status === "sent" ? new Date() : null;
  const { rows } = await pool.query(
    `UPDATE alerts
     SET status = $1,
         sent_at = CASE WHEN $2::timestamptz IS NULL THEN sent_at ELSE $2 END,
         updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [status, sentAt, id]
  );

  await writeAuditLog({
    userId: actor.userId,
    action: "alert.update_status",
    entityType: "alert",
    entityId: id,
    oldValues: { status: current.status },
    newValues: { status },
    ipAddress
  });

  return rows[0];
}

async function getPendingHighUrgent(actor) {
  const values = [];
  let sql = `
    SELECT * FROM alerts
    WHERE status = 'pending' AND priority IN ('high', 'urgent')
  `;

  if (actor.role !== ROLES.SUPERADMIN) {
    values.push(actor.organizationId);
    sql += " AND organization_id = $1";
  }

  sql += " ORDER BY priority DESC, created_at DESC";

  const { rows } = await pool.query(sql, values);
  return rows;
}

module.exports = {
  generateFarmerAlert,
  listAlerts,
  generateAlertsForFarmer,
  generateBulkAlerts,
  updateAlertStatus,
  getPendingHighUrgent
};
