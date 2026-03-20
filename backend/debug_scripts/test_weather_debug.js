const { fetchWeatherForDistrict } = require('./src/modules/weather/weather.service');
const dotenv = require('dotenv');
dotenv.config();

async function testFetch() {
  const district = 'Anand';
  const lat = 22.5;
  const long = 72.8;
  const state = 'Gujarat';

  console.log(`Fetching weather for ${district}...`);
  try {
    const result = await fetchWeatherForDistrict(district, lat, long, state);
    console.log('Weather fetched and cached:', JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Weather fetch failed:', err);
    process.exit(1);
  }
}

testFetch();
