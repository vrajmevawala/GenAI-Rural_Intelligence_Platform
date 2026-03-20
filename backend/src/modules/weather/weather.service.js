const { v4: uuidv4 } = require("uuid");
const { pool } = require("../../config/db");

async function getWeather(location) {
  const { rows } = await pool.query(
    "SELECT * FROM weather_cache WHERE location = $1 OR district = $1",
    [location]
  );
  return rows[0];
}

async function fetchWeatherForDistrict(district, lat, long, state) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}&current=temperature_2m,relative_humidity_2m,precipitation&timezone=auto`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.current) throw new Error("Invalid weather data");

    const payload = {
      temperature: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
      rainfall: data.current.precipitation
    };

    return await updateWeather(district, payload, state);
  } catch (err) {
    console.error(`Failed to fetch weather for ${district}:`, err.message);
    throw err;
  }
}

async function updateWeather(location, payload, state = null) {
  const existing = await getWeather(location);
  const validUntil = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours cache

  if (existing) {
    const { rows } = await pool.query(
      `UPDATE weather_cache 
       SET temperature = $1, rainfall = $2, humidity = $3, fetched_at = NOW(), valid_until = $4
       WHERE id = $5
       RETURNING *`,
      [payload.temperature, payload.rainfall, payload.humidity, validUntil, existing.id]
    );
    return rows[0];
  } else {
    const id = uuidv4();
    const { rows } = await pool.query(
      `INSERT INTO weather_cache (id, location, district, state, temperature, rainfall, humidity, fetched_at, valid_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
       RETURNING *`,
      [id, location, location, state, payload.temperature, payload.rainfall, payload.humidity, validUntil]
    );
    return rows[0];
  }
}

module.exports = {
  getWeather,
  updateWeather,
  fetchWeatherForDistrict
};
