const { fetchWeatherForDistrict } = require('../src/modules/weather/weather.service');

const district = "Anand";
const lat = 22.5567;
const long = 72.9515;
const state = "Gujarat";

async function test() {
  try {
    console.log(`Testing weather fetch for ${district}...`);
    const res = await fetchWeatherForDistrict(district, lat, long, state);
    console.log("SUCCESS:", JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("FAILURE:", err.message);
  } finally {
    const { pool } = require('../src/config/db');
    await pool.end();
  }
}

test();
