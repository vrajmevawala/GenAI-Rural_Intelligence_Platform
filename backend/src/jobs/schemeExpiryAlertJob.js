const cron = require("node-cron");
const { pool } = require("../config/db");
const { info, error } = require("../utils/logger");
const { generateAlert } = require("../utils/alertGenerator");
const { evaluateAlertsTriggers } = require("../utils/alertTrigger");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * SIMPLIFIED ALERT JOB - Only CROP, WEATHER, SOIL, VULNERABILITY, LOAN (< 30 days)
 * Generates alerts and sends directly to WhatsApp
 */
async function runCoreAlertsJob() {
  let generated = 0;
  let skipped = 0;

  try {
    // Get all active farmers with phone numbers
    const farmersResult = await pool.query(
      `SELECT f.id, f.phone
       FROM farmers f
       WHERE f.phone IS NOT NULL
       LIMIT 100`
    );

    info(`Core alerts job: Processing ${farmersResult.rows.length} farmers`);

    for (const farmer of farmersResult.rows) {
      try {
        // Evaluate all active triggers for this farmer
        const triggers = await evaluateAlertsTriggers(farmer.id);

        if (triggers.length === 0) {
          skipped += 1;
          continue;
        }

        // Generate alert for each trigger
        for (const trigger of triggers) {
          try {
            // Check for duplicate alert (no recent alert of same type)
            const recentAlert = await pool.query(
              `SELECT id FROM alerts
               WHERE farmer_id = $1
               AND alert_type = $2
               AND created_at > NOW() - INTERVAL '24 hours'
               LIMIT 1`,
              [farmer.id, trigger.alertType]
            );

            if (recentAlert.rows.length > 0) {
              // Skip duplicate
              continue;
            }

            // Generate and send alert to WhatsApp immediately
            await generateAlert({
              farmerId: farmer.id,
              alertType: trigger.alertType,
              language: 'gu',
              contextData: trigger.contextData,
              sendWhatsAppMessage: true
            });

            generated += 1;
            info(`Alert sent: ${trigger.alertType} for farmer ${farmer.id}`);

            // Rate limiting
            await delay(1500);

          } catch (err) {
            error("Alert generation failed", {
              farmerId: farmer.id,
              alertType: trigger.alertType,
              message: err.message
            });
          }
        }

      } catch (err) {
        error("Farmer trigger evaluation failed", {
          farmerId: farmer.id,
          message: err.message
        });
      }

      await delay(500);
    }

    info(`Core alerts job completed: ${generated} alerts sent, ${skipped} farmers skipped`);

  } catch (err) {
    error("Core alerts job failed", { message: err.message });
  }
}

// Run every hour
cron.schedule("0 * * * *", () => {
  info("Starting core alerts job...");
  runCoreAlertsJob();
});

// Export functions
function scheduleSchemeExpiryAlertJob() {
  info("Core alerts job scheduler initialized (runs every hour)");
}

async function runSchemeExpiryAlertJob() {
  await runCoreAlertsJob();
}

module.exports = { 
  runCoreAlertsJob,
  scheduleSchemeExpiryAlertJob,
  runSchemeExpiryAlertJob
};
