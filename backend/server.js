const dotenv = require("dotenv");
const app = require("./src/app");
const { info } = require("./src/utils/logger");
const { scheduleVulnerabilityRecalcJob, runVulnerabilityRecalcJob } = require("./src/jobs/vulnerabilityRecalcJob");
const { scheduleSchemeExpiryAlertJob, runSchemeExpiryAlertJob } = require("./src/jobs/schemeExpiryAlertJob");
const { scheduleWeatherSyncJob, runWeatherSyncJob } = require("./src/jobs/weatherSyncJob");
// Removed: Intelligent alert job - alerts now send AUTOMATICALLY when generated

dotenv.config();

const PORT = Number(process.env.PORT || 3000);

app.listen(PORT, async () => {
  info("KhedutMitra backend started", { port: PORT });

  scheduleVulnerabilityRecalcJob();
  scheduleSchemeExpiryAlertJob();
  scheduleWeatherSyncJob();
  // Removed: scheduleIntelligentAlertJob() - alerts auto-send when generated

  if (process.env.NODE_ENV !== "production") {
    await runWeatherSyncJob().catch(() => {});
    await runSchemeExpiryAlertJob().catch(() => {});
    await runVulnerabilityRecalcJob().catch(() => {});
  }
});
