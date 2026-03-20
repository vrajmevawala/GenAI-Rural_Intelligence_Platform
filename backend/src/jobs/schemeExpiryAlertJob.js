const cron = require("node-cron");
const { pool } = require("../config/db");
const { info, error } = require("../utils/logger");
const { generateFarmerAlert } = require("../modules/alerts/alerts.service");
const { v4: uuidv4 } = require("uuid");

async function createAlertIfMissing(farmer, alertType, priority, context) {
  const exists = await pool.query(
    `SELECT id FROM alerts WHERE farmer_id = $1 AND alert_type = $2 AND status = 'pending' LIMIT 1`,
    [farmer.id, alertType]
  );

  if (exists.rowCount > 0) {
    return false;
  }

  const ai = await generateFarmerAlert(farmer, alertType, context, farmer.preferred_language || "gu");

  await pool.query(
    `INSERT INTO alerts (
      id, farmer_id, organization_id, triggered_by_user_id, alert_type, priority, language,
      message_text, voice_note_script, status, ai_generated
    ) VALUES ($1,$2,$3,NULL,$4,$5,$6,$7,$8,'pending',TRUE)`,
    [
      uuidv4(),
      farmer.id,
      farmer.organization_id,
      alertType,
      priority,
      farmer.preferred_language || "gu",
      ai.message_text,
      ai.voice_note_script
    ]
  );

  return true;
}

async function runSchemeExpiryAlertJob() {
  let created = 0;

  const insuranceExpiring = await pool.query(
    `SELECT * FROM farmers
     WHERE has_crop_insurance = TRUE
       AND insurance_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`
  );

  for (const farmer of insuranceExpiring.rows) {
    if (
      await createAlertIfMissing(farmer, "insurance_expiry", "high", {
        insurance_expiry_date: farmer.insurance_expiry_date
      })
    ) {
      created += 1;
    }
  }

  const overdueLoan = await pool.query(
    `SELECT * FROM farmers
     WHERE loan_due_date < CURRENT_DATE
       AND (last_repayment_date IS NULL OR last_repayment_date < loan_due_date)`
  );

  for (const farmer of overdueLoan.rows) {
    if (await createAlertIfMissing(farmer, "loan_overdue", "urgent", { loan_due_date: farmer.loan_due_date })) {
      created += 1;
    }
  }

  const pmKisanPending = await pool.query(
    `SELECT * FROM farmers
     WHERE pm_kisan_enrolled = TRUE
       AND (
         pm_kisan_last_installment_date IS NULL
         OR pm_kisan_last_installment_date < CURRENT_DATE - INTERVAL '120 days'
       )`
  );

  for (const farmer of pmKisanPending.rows) {
    if (await createAlertIfMissing(farmer, "pm_kisan_pending", "high", {})) {
      created += 1;
    }
  }

  info("Scheme expiry alert job completed", { alertsCreated: created });
}

function scheduleSchemeExpiryAlertJob() {
  cron.schedule("0 6 * * *", () => {
    runSchemeExpiryAlertJob().catch((err) => {
      error("Scheme expiry alert job failed", { message: err.message });
    });
  });
}

module.exports = {
  runSchemeExpiryAlertJob,
  scheduleSchemeExpiryAlertJob
};
