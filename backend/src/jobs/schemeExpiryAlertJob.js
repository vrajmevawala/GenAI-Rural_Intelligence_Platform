const cron = require("node-cron");
const { pool } = require("../config/db");
const { info, error } = require("../utils/logger");
const { generateAlert } = require("../utils/alertGenerator");
const { ALERT_TYPES, ALERT_DEDUP_WINDOWS } = require("../utils/alertTypes");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runSchemeExpiryAlertJob() {
  let generated = 0;

  const insuranceExpiring = await pool.query(
    `SELECT f.id, f.organization_id, f.preferred_language, f.language
     FROM farmers f
     WHERE has_crop_insurance = TRUE
       AND insurance_expiry_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
       AND f.phone IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM alerts a
         WHERE a.farmer_id = f.id
           AND a.alert_type = $1
           AND a.created_at > NOW() - INTERVAL '${ALERT_DEDUP_WINDOWS[ALERT_TYPES.INSURANCE_EXPIRY]}'
       )`,
    [ALERT_TYPES.INSURANCE_EXPIRY]
  );

  for (const farmer of insuranceExpiring.rows) {
    await generateAlert({
      farmerId: farmer.id,
      organizationId: farmer.organization_id,
      alertType: ALERT_TYPES.INSURANCE_EXPIRY,
      language: farmer.preferred_language || farmer.language || "gu",
      contextData: {},
      sendWhatsAppMessage: true
    }).then(() => {
      generated += 1;
    }).catch((err) => {
      error("Insurance alert generation failed", { farmerId: farmer.id, message: err.message });
    });

    await delay(1500);
  }

  const overdueLoan = await pool.query(
    `SELECT f.id, f.organization_id, f.preferred_language, f.language
     FROM farmers f
     WHERE loan_due_date < NOW()
       AND loan_type IS NOT NULL
       AND lower(loan_type) != 'none'
       AND f.phone IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM alerts a
         WHERE a.farmer_id = f.id
           AND a.alert_type = $1
           AND a.created_at > NOW() - INTERVAL '${ALERT_DEDUP_WINDOWS[ALERT_TYPES.LOAN_OVERDUE]}'
       )`,
    [ALERT_TYPES.LOAN_OVERDUE]
  );

  for (const farmer of overdueLoan.rows) {
    await generateAlert({
      farmerId: farmer.id,
      organizationId: farmer.organization_id,
      alertType: ALERT_TYPES.LOAN_OVERDUE,
      language: farmer.preferred_language || farmer.language || "gu",
      contextData: {},
      sendWhatsAppMessage: true
    }).then(() => {
      generated += 1;
    }).catch((err) => {
      error("Loan alert generation failed", { farmerId: farmer.id, message: err.message });
    });

    await delay(1500);
  }

  const pmKisanPending = await pool.query(
    `SELECT f.id, f.organization_id, f.preferred_language, f.language
     FROM farmers f
     WHERE pm_kisan_enrolled = TRUE
       AND (
         pm_kisan_last_installment_date IS NULL
         OR pm_kisan_last_installment_date < NOW() - INTERVAL '120 days'
       )
       AND f.phone IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM alerts a
         WHERE a.farmer_id = f.id
           AND a.alert_type = $1
           AND a.created_at > NOW() - INTERVAL '${ALERT_DEDUP_WINDOWS[ALERT_TYPES.PM_KISAN_PENDING]}'
       )`,
    [ALERT_TYPES.PM_KISAN_PENDING]
  );

  for (const farmer of pmKisanPending.rows) {
    await generateAlert({
      farmerId: farmer.id,
      organizationId: farmer.organization_id,
      alertType: ALERT_TYPES.PM_KISAN_PENDING,
      language: farmer.preferred_language || farmer.language || "gu",
      contextData: {},
      sendWhatsAppMessage: true
    }).then(() => {
      generated += 1;
    }).catch((err) => {
      error("PM-KISAN alert generation failed", { farmerId: farmer.id, message: err.message });
    });

    await delay(1500);
  }

  info("Scheme expiry alert job completed", { alertsGenerated: generated });
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
