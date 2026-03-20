const { v4: uuidv4 } = require("uuid");
const { pool } = require("../../config/db");

async function getWeather(location) {
  const { rows } = await pool.query(
    "SELECT * FROM weather_cache WHERE location = $1",
    [location]
  );
  return rows[0];
}

async function updateWeather(location, payload) {
  const existing = await getWeather(location);
  if (existing) {
    const { rows } = await pool.query(
      `UPDATE weather_cache 
       SET temperature = $1, rainfall = $2, humidity = $3, fetched_at = NOW()
       WHERE location = $4
       RETURNING *`,
      [payload.temperature, payload.rainfall, payload.humidity, location]
    );
    return rows[0];
  } else {
    const id = uuidv4();
    const { rows } = await pool.query(
      `INSERT INTO weather_cache (id, location, temperature, rainfall, humidity, fetched_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [id, location, payload.temperature, payload.rainfall, payload.humidity]
    );
    return rows[0];
  }
}

module.exports = {
  getWeather,
  updateWeather
};
