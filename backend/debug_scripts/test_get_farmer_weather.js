const { getFarmerById } = require('./src/modules/farmers/farmers.service');
const dotenv = require('dotenv');
dotenv.config();

const farmerId = 'd6509c2c-7bc9-4e82-8e9e-adcc934221c6'; // Ramesh Patel

async function test() {
  console.log('Testing getFarmerById for farmer:', farmerId);
  try {
    const result = await getFarmerById(farmerId);
    console.log('Farmer Data Weather:', JSON.stringify(result.weather, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

test();
