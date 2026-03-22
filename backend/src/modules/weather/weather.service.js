const { v4: uuidv4 } = require("uuid");
const { pool } = require("../../config/db");

// ─── DISTRICT COORDINATES (GUJARATI DISTRICTS) ─────────────────────────────────
// Fallback mapping of district names to lat/long (for quick weather lookup)
const DISTRICT_COORDINATES = {
  "Anand": { lat: 22.5697, long: 72.9289 },
  "Ahmedabad": { lat: 23.0225, long: 72.5714 },
  "Surat": { lat: 21.1703, long: 72.8311 },
  "Vadodara": { lat: 22.3072, long: 73.1812 },
  "Rajkot": { lat: 22.3039, long: 70.8022 },
  "Gandhinagar": { lat: 23.2156, long: 72.6369 },
  "Kheda": { lat: 22.6771, long: 72.6975 },
  "Junagadh": { lat: 21.5230, long: 70.4730 },
  "Amreli": { lat: 21.6097, long: 71.3103 },
  "Bhavnagar": { lat: 21.7645, long: 71.9789 },
  "Jamnagar": { lat: 22.4707, long: 70.0883 },
  "Kutch": { lat: 23.1449, long: 69.4671 },
  "Porbandar": { lat: 21.6450, long: 69.6050 },
  "Valsad": { lat: 22.9734, long: 72.9197 },
  "Navsari": { lat: 20.9437, long: 72.9289 },
  "Dang": { lat: 20.7500, long: 73.7500 },
  "Panchmahal": { lat: 22.7667, long: 73.7500 },
  "Mehsana": { lat: 23.5840, long: 72.4358 }
};

async function getWeather(location) {
  const { rows } = await pool.query(
    "SELECT * FROM weather_cache WHERE location = $1 OR district = $1",
    [location]
  );
  
  if (rows.length > 0) {
    const weather = rows[0];
    // Parse forecast_json if it's a string
    if (typeof weather.forecast_json === 'string') {
      weather.forecast_json = JSON.parse(weather.forecast_json);
    }
    return weather;
  }
  
  return null;
}

// ─── GET COORDINATES FOR DISTRICT ────────────────────────────────────────────
// First tries database, then falls back to hardcoded mapping
async function getDistrictCoordinates(district) {
  try {
    // Try fetching from locations table first
    const { rows } = await pool.query(
      `SELECT latitude, longitude, state FROM locations WHERE district = $1 LIMIT 1`,
      [district]
    );
    
    if (rows.length > 0) {
      return {
        lat: rows[0].latitude,
        long: rows[0].longitude,
        state: rows[0].state
      };
    }
  } catch (err) {
    // Locations table might not exist, continue to fallback
    console.warn(`Locations table query failed: ${err.message}`);
  }

  // Fallback to hardcoded mapping
  const coords = DISTRICT_COORDINATES[district];
  if (coords) {
    return {
      lat: coords.lat,
      long: coords.long,
      state: "Gujarat"
    };
  }

  throw new Error(`No coordinates found for district: ${district}`);
}

async function fetchWeatherForDistrict(district, lat, long, state) {
  try {
    // Fetch both current weather AND 15-day forecast with daily data
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}&current=temperature_2m,relative_humidity_2m,precipitation&daily=temperature_2m_max,temperature_2m_min,relative_humidity_2m_max,precipitation_sum,windspeed_10m_max&temperature_unit=celsius&windspeed_unit=kmh&precipitation_unit=mm&timezone=auto`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (!data.current || !data.daily) throw new Error("Invalid weather data from API - missing current or daily data");

    // Create payload with both current and forecast data in expected format
    const payload = {
      temperature: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
      rainfall: data.current.precipitation,
      forecast_json: {
        daily: {
          temperature_2m_max: data.daily.temperature_2m_max || [],
          temperature_2m_min: data.daily.temperature_2m_min || [],
          relative_humidity_2m_max: data.daily.relative_humidity_2m_max || [],
          precipitation_sum: data.daily.precipitation_sum || [],
          windspeed_10m_max: data.daily.windspeed_10m_max || []
        }
      }
    };

    return await updateWeather(district, payload, state);
  } catch (err) {
    console.error(`Failed to fetch weather for ${district}:`, err.message);
    throw err;
  }
}

// ─── WRAPPER: GET WEATHER BY DISTRICT NAME ONLY ──────────────────────────────
// Looks up coordinates and fetches weather
async function getWeatherByDistrictName(districtName) {
  try {
    // Check cache first
    const cached = await getWeather(districtName);
    if (cached && cached.valid_until && new Date(cached.valid_until) > new Date()) {
      return cached;
    }

    // Get coordinates for district
    const { lat, long, state } = await getDistrictCoordinates(districtName);
    
    // Fetch fresh weather from API
    const weather = await fetchWeatherForDistrict(districtName, lat, long, state);
    return weather;
  } catch (err) {
    console.error(`Error getting weather for ${districtName}:`, err.message);
    throw new Error(`Unable to fetch weather for district "${districtName}": ${err.message}`);
  }
}

async function updateWeather(location, payload, state = null) {
  const existing = await getWeather(location);
  const validUntil = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hour cache for forecast data

  if (existing) {
    const { rows } = await pool.query(
      `UPDATE weather_cache 
       SET temperature = $1, rainfall = $2, humidity = $3, forecast_json = $4, fetched_at = NOW(), valid_until = $5
       WHERE id = $6
       RETURNING *`,
      [
        payload.temperature,
        payload.rainfall,
        payload.humidity,
        JSON.stringify(payload.forecast_json || {}),
        validUntil,
        existing.id
      ]
    );
    return rows[0];
  } else {
    const id = uuidv4();
    const { rows } = await pool.query(
      `INSERT INTO weather_cache (id, location, district, state, temperature, rainfall, humidity, forecast_json, fetched_at, valid_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
       RETURNING *`,
      [
        id,
        location,
        location,
        state,
        payload.temperature,
        payload.rainfall,
        payload.humidity,
        JSON.stringify(payload.forecast_json || {}),
        validUntil
      ]
    );
    return rows[0];
  }
}

module.exports = {
  getWeather,
  updateWeather,
  fetchWeatherForDistrict,
  getWeatherByDistrictName,
  getDistrictCoordinates
};
