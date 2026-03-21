const dotenv = require("dotenv");
const app = require("./src/app");
const { info } = require("./src/utils/logger");
const { scheduleVulnerabilityRecalcJob, runVulnerabilityRecalcJob } = require("./src/jobs/vulnerabilityRecalcJob");
const { scheduleSchemeExpiryAlertJob, runSchemeExpiryAlertJob } = require("./src/jobs/schemeExpiryAlertJob");
const { scheduleWeatherSyncJob, runWeatherSyncJob } = require("./src/jobs/weatherSyncJob");

dotenv.config();

const PORT = Number(process.env.PORT || 3000);

app.listen(PORT, async () => {
  info("KhedutMitra backend started", { port: PORT });

  scheduleVulnerabilityRecalcJob();
  scheduleSchemeExpiryAlertJob();
  scheduleWeatherSyncJob();

  if (process.env.NODE_ENV !== "production") {
    await runWeatherSyncJob().catch(() => {});
    await runSchemeExpiryAlertJob().catch(() => {});
    await runVulnerabilityRecalcJob().catch(() => {});
  }
});
