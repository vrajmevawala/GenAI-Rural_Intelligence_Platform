const { v4: uuidv4 } = require("uuid");
const { pool } = require("../../config/db");
const { AppError } = require("../../middleware/errorHandler");

function computeDroughtRisk(forecastJson) {
  const daily = forecastJson?.daily || {};
  const sums = daily.precipitation_sum || [];
  const totalPrecipitation = sums.reduce((acc, val) => acc + Number(val || 0), 0);

  if (totalPrecipitation >= 60) {
    return "none";
  }
  if (totalPrecipitation >= 45) {
    return "low";
  }
  if (totalPrecipitation >= 30) {
    return "moderate";
  }
  if (totalPrecipitation >= 15) {
    return "high";
  }
  return "severe";
}

async function fetchWeatherForDistrict(district, lat, lon, state = "Gujarat") {
  if (lat == null || lon == null) {
    throw new AppError("Latitude and longitude are required for weather sync", 400, "VALIDATION_ERROR");
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("daily", "precipitation_sum,temperature_2m_max");
  url.searchParams.set("forecast_days", "14");
  url.searchParams.set("timezone", "Asia/Kolkata");

  const response = await fetch(url);
  if (!response.ok) {
    throw new AppError("Failed to fetch weather data", 502, "EXTERNAL_API_FAILURE");
  }

  const forecastJson = await response.json();
  const droughtRiskLevel = computeDroughtRisk(forecastJson);
  const validUntil = new Date(Date.now() + 6 * 60 * 60 * 1000);

  const sql = `
    INSERT INTO weather_cache (id, district, state, forecast_json, drought_risk_level, fetched_at, valid_until)
    VALUES ($1, $2, $3, $4, $5, NOW(), $6)
    ON CONFLICT (district, state)
    DO UPDATE SET forecast_json = EXCLUDED.forecast_json,
                  drought_risk_level = EXCLUDED.drought_risk_level,
                  fetched_at = NOW(),
                  valid_until = EXCLUDED.valid_until,
                  updated_at = NOW()
    RETURNING *
  `;

  const { rows } = await pool.query(sql, [uuidv4(), district, state, forecastJson, droughtRiskLevel, validUntil]);
  return rows[0];
}

async function getWeatherForDistrict(district, state = "Gujarat", lat = null, lon = null) {
  const cached = await pool.query(
    `SELECT * FROM weather_cache WHERE district = $1 AND state = $2 ORDER BY fetched_at DESC LIMIT 1`,
    [district, state]
  );

  if (cached.rowCount > 0 && new Date(cached.rows[0].valid_until) > new Date()) {
    return cached.rows[0];
  }

  if (lat == null || lon == null) {
    const coordRes = await pool.query(
      `SELECT latitude, longitude FROM farmers WHERE district = $1 AND state = $2 AND latitude IS NOT NULL AND longitude IS NOT NULL LIMIT 1`,
      [district, state]
    );

    if (coordRes.rowCount > 0) {
      lat = coordRes.rows[0].latitude;
      lon = coordRes.rows[0].longitude;
    }
  }

  if (lat == null || lon == null) {
    throw new AppError("Coordinates unavailable for district weather fetch", 400, "VALIDATION_ERROR");
  }

  return fetchWeatherForDistrict(district, lat, lon, state);
}

module.exports = {
  computeDroughtRisk,
  fetchWeatherForDistrict,
  getWeatherForDistrict
};
