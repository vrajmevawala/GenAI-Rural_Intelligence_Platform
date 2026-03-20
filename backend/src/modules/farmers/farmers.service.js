const { v4: uuidv4 } = require("uuid");
const { pool } = require("../../config/db");
const { ROLES } = require("../../config/constants");
const { AppError } = require("../../middleware/errorHandler");
const { writeAuditLog } = require("../../utils/logger");
const { recalculateFarmerScore } = require("../vulnerability/vulnerability.service");

function scopeFilter(actor, whereParts, values) {
  if (actor.role !== ROLES.SUPERADMIN) {
    values.push(actor.organizationId);
    whereParts.push(`organization_id = $${values.length}`);
  }
}

async function listFarmers(actor, query, page, limit, offset) {
  const whereParts = [];
  const values = [];

  if (query.district) {
    values.push(query.district);
    whereParts.push(`district = $${values.length}`);
  }
  if (query.taluka) {
    values.push(query.taluka);
    whereParts.push(`taluka = $${values.length}`);
  }
  if (query.vulnerability_label) {
    values.push(query.vulnerability_label);
    whereParts.push(`vulnerability_label = $${values.length}`);
  }
  if (query.primary_crop) {
    values.push(query.primary_crop);
    whereParts.push(`primary_crop = $${values.length}`);
  }
  if (query.loan_type) {
    values.push(query.loan_type);
    whereParts.push(`loan_type = $${values.length}`);
  }
  if (typeof query.has_crop_insurance === "boolean") {
    values.push(query.has_crop_insurance);
    whereParts.push(`has_crop_insurance = $${values.length}`);
  }
  if (query.search) {
    values.push(query.search);
    whereParts.push(`name % $${values.length}`);
  }

  scopeFilter(actor, whereParts, values);

  const where = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

  const listSql = `
    SELECT id, organization_id, name, phone, district, taluka, village, primary_crop, loan_type,
           has_crop_insurance, vulnerability_score, vulnerability_label, created_at
    FROM farmers
    ${where}
    ORDER BY vulnerability_score DESC, created_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;

  const countSql = `SELECT COUNT(*)::int AS total FROM farmers ${where}`;

  const listValues = [...values, limit, offset];
  const [listRes, countRes] = await Promise.all([
    pool.query(listSql, listValues),
    pool.query(countSql, values)
  ]);

  return {
    rows: listRes.rows,
    total: countRes.rows[0].total,
    page,
    limit
  };
}

async function createFarmer(actor, payload, ipAddress) {
  const organizationId = actor.role === ROLES.SUPERADMIN ? payload.organization_id : actor.organizationId;

  if (!organizationId) {
    throw new AppError("organization_id is required", 400, "VALIDATION_ERROR");
  }

  const id = uuidv4();
  const sql = `
    INSERT INTO farmers (
      id, organization_id, name, phone, aadhaar_last4, district, taluka, village, state,
      land_area_acres, primary_crop, secondary_crop, soil_type, irrigation_type,
      annual_income_inr, family_size, loan_amount_inr, loan_type, loan_due_date, last_repayment_date,
      has_crop_insurance, insurance_expiry_date, pm_kisan_enrolled, pm_kisan_last_installment_date,
      bank_account_number, preferred_language, latitude, longitude, created_by
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9,
      $10, $11, $12, $13, $14,
      $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24,
      $25, $26, $27, $28, $29
    )
    RETURNING *
  `;

  const values = [
    id,
    organizationId,
    payload.name,
    payload.phone,
    payload.aadhaar_last4,
    payload.district,
    payload.taluka,
    payload.village,
    payload.state,
    payload.land_area_acres,
    payload.primary_crop,
    payload.secondary_crop || null,
    payload.soil_type,
    payload.irrigation_type,
    payload.annual_income_inr,
    payload.family_size,
    payload.loan_amount_inr || null,
    payload.loan_type,
    payload.loan_due_date || null,
    payload.last_repayment_date || null,
    payload.has_crop_insurance,
    payload.insurance_expiry_date || null,
    payload.pm_kisan_enrolled,
    payload.pm_kisan_last_installment_date || null,
    payload.bank_account_number || null,
    payload.preferred_language,
    payload.latitude || null,
    payload.longitude || null,
    actor.userId
  ];

  const { rows } = await pool.query(sql, values);

  const computed = await recalculateFarmerScore(id, actor, "on_create");

  await writeAuditLog({
    userId: actor.userId,
    action: "farmer.create",
    entityType: "farmer",
    entityId: id,
    newValues: { ...rows[0], vulnerability: computed },
    ipAddress
  });

  return {
    ...rows[0],
    vulnerability_score: computed.score,
    vulnerability_label: computed.label
  };
}

async function getFarmerById(actor, id) {
  const where = actor.role === ROLES.SUPERADMIN ? "id = $1" : "id = $1 AND organization_id = $2";
  const params = actor.role === ROLES.SUPERADMIN ? [id] : [id, actor.organizationId];

  const farmerRes = await pool.query(`SELECT * FROM farmers WHERE ${where}`, params);
  if (farmerRes.rowCount === 0) {
    throw new AppError("Farmer not found", 404, "FARMER_NOT_FOUND");
  }

  const farmer = farmerRes.rows[0];

  const [matchesRes, alertsRes] = await Promise.all([
    pool.query(
      `SELECT fsm.*, gs.name AS scheme_name, gs.short_code
       FROM farmer_scheme_matches fsm
       JOIN government_schemes gs ON gs.id = fsm.scheme_id
       WHERE fsm.farmer_id = $1
       ORDER BY fsm.eligibility_score DESC`,
      [id]
    ),
    pool.query(
      `SELECT id, alert_type, priority, status, language, message_text, created_at
       FROM alerts
       WHERE farmer_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [id]
    )
  ]);

  return {
    ...farmer,
    scheme_matches: matchesRes.rows,
    recent_alerts: alertsRes.rows
  };
}

async function updateFarmer(actor, id, payload, ipAddress) {
  const current = await getFarmerById(actor, id);

  const fields = [];
  const values = [];
  let idx = 1;

  Object.keys(payload).forEach((key) => {
    fields.push(`${key} = $${idx}`);
    values.push(payload[key] === "" ? null : payload[key]);
    idx += 1;
  });

  if (fields.length === 0) {
    return current;
  }

  values.push(id);
  if (actor.role !== ROLES.SUPERADMIN) {
    values.push(actor.organizationId);
  }

  const where = actor.role === ROLES.SUPERADMIN ? `id = $${idx}` : `id = $${idx} AND organization_id = $${idx + 1}`;

  const sql = `
    UPDATE farmers
    SET ${fields.join(", ")}, updated_at = NOW()
    WHERE ${where}
    RETURNING *
  `;

  const { rows } = await pool.query(sql, values);
  if (rows.length === 0) {
    throw new AppError("Farmer not found", 404, "FARMER_NOT_FOUND");
  }

  const scoreSensitiveFields = [
    "loan_amount_inr",
    "loan_type",
    "loan_due_date",
    "last_repayment_date",
    "has_crop_insurance",
    "insurance_expiry_date",
    "primary_crop",
    "secondary_crop",
    "annual_income_inr",
    "land_area_acres",
    "pm_kisan_enrolled",
    "pm_kisan_last_installment_date"
  ];

  const shouldRecalculate = scoreSensitiveFields.some((field) => Object.prototype.hasOwnProperty.call(payload, field));

  if (shouldRecalculate) {
    await recalculateFarmerScore(id, actor, "manual");
  }

  await writeAuditLog({
    userId: actor.userId,
    action: "farmer.update",
    entityType: "farmer",
    entityId: id,
    oldValues: current,
    newValues: rows[0],
    ipAddress
  });

  return rows[0];
}

async function deleteFarmer(actor, id, ipAddress) {
  if (actor.role === ROLES.FIELD_OFFICER) {
    throw new AppError("Permission denied", 403, "PERMISSION_DENIED");
  }

  const current = await getFarmerById(actor, id);
  const params = actor.role === ROLES.SUPERADMIN ? [id] : [id, actor.organizationId];
  const where = actor.role === ROLES.SUPERADMIN ? "id = $1" : "id = $1 AND organization_id = $2";

  await pool.query(`DELETE FROM farmers WHERE ${where}`, params);

  await writeAuditLog({
    userId: actor.userId,
    action: "farmer.delete",
    entityType: "farmer",
    entityId: id,
    oldValues: current,
    ipAddress
  });

  return { id, deleted: true };
}

async function getScoreHistory(actor, id) {
  const farmer = await getFarmerById(actor, id);
  const { rows } = await pool.query(
    `SELECT score, label, score_breakdown, calculated_at, triggered_by
     FROM vulnerability_score_history
     WHERE farmer_id = $1
     ORDER BY calculated_at DESC`,
    [farmer.id]
  );

  return rows;
}

async function manualRecalculate(actor, id, ipAddress) {
  if (actor.role === ROLES.FIELD_OFFICER) {
    throw new AppError("Permission denied", 403, "PERMISSION_DENIED");
  }

  const computed = await recalculateFarmerScore(id, actor, "manual");

  await writeAuditLog({
    userId: actor.userId,
    action: "score.recalculate",
    entityType: "farmer",
    entityId: id,
    newValues: computed,
    ipAddress
  });

  return computed;
}

module.exports = {
  listFarmers,
  createFarmer,
  getFarmerById,
  updateFarmer,
  deleteFarmer,
  getScoreHistory,
  manualRecalculate
};
