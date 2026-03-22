const cron = require("node-cron");
const { pool } = require("../config/db");
const { info, error } = require("../utils/logger");
const { generateIntelligentAlerts } = require("../modules/alerts/intelligentAlerts");

// Run daily at 7:00 AM — before farmers start their day
function scheduleIntelligentAlertJob() {
  cron.schedule("0 7 * * *", () => {
    runIntelligentAlertJob().catch((err) => {
      error("Intelligent alert job failed", { message: err.message });
    });
  });
}

async function runIntelligentAlertJob() {
  info("Starting daily intelligent alert job...", {});

  // Get all active farmers with phone numbers and high/critical vulnerability
  const farmers = await pool.query(
    `SELECT id FROM farmers 
     WHERE phone IS NOT NULL 
       AND vulnerability_label IN ('high', 'critical')
     ORDER BY vulnerability_score DESC`
  );

  info("Processing farmers for intelligent alerts", {
    count: farmers.rows.length
  });

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const farmer of farmers.rows) {
    processed += 1;

    try {
      const alerts = await generateIntelligentAlerts(farmer.id, true); // true = send WhatsApp
      succeeded += alerts.length;
      info("Generated intelligent alerts", {
        farmerId: farmer.id,
        alertsGenerated: alerts.length
      });
    } catch (err) {
      failed += 1;
      error("Failed to generate alerts for farmer", {
        farmerId: farmer.id,
        message: err.message
      });
    }

    // Rate limit — don't hammer Groq or our DB
    await new Promise((r) => setTimeout(r, 2000));
  }

  info("Intelligent alert job complete", {
    totalProcessed: processed,
    alertsGenerated: succeeded,
    failed
  });
}

module.exports = {
  runIntelligentAlertJob,
  scheduleIntelligentAlertJob
};
