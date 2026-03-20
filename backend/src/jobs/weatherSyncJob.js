const cron = require("node-cron");
const { pool } = require("../config/db");
const { info, error } = require("../utils/logger");
const { fetchWeatherForDistrict } = require("../modules/weather/weather.service");

async function runWeatherSyncJob() {
  const sql = `
    SELECT DISTINCT ON (district, state)
      district,
      state,
      latitude,
      longitude
    FROM farmers
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    ORDER BY district, state, created_at DESC
  `;

  const { rows } = await pool.query(sql);
  let synced = 0;

  for (const row of rows) {
    try {
      const cached = await pool.query(
        `SELECT id FROM weather_cache
         WHERE district = $1 AND state = $2 AND valid_until > NOW()` ,
        [row.district, row.state]
      );

      if (cached.rowCount === 0) {
        await fetchWeatherForDistrict(row.district, row.latitude, row.longitude, row.state);
        synced += 1;
      }
    } catch (err) {
      error("Weather sync failed for district", {
        district: row.district,
        state: row.state,
        message: err.message
      });
    }
  }

  info("Weather sync job completed", { districtsSynced: synced });
}

function scheduleWeatherSyncJob() {
  cron.schedule("0 */6 * * *", () => {
    runWeatherSyncJob().catch((err) => {
      error("Weather sync job failed", { message: err.message });
    });
  });
}

module.exports = {
  runWeatherSyncJob,
  scheduleWeatherSyncJob
};
