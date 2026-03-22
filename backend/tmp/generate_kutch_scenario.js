/**
 * Script to generate a high-risk farmer scenario in Kutch, Gujarat.
 * Scenario: Rice (High water req, needs clay) grown in Kutch (Sandy soil, high heat, no rain).
 */
const { pool } = require("../src/config/db");
const { v4: uuidv4 } = require("uuid");
const vulnerabilityService = require("../src/modules/vulnerability/vulnerability.service");
require("dotenv").config();

async function generateScenario() {
  console.log("--- Generating High-Risk Kutch Scenario ---");

  try {
    // 1. Find the Rice crop ID
    const cropRes = await pool.query("SELECT id FROM crops WHERE name = 'Rice' LIMIT 1");
    if (cropRes.rowCount === 0) {
      console.error("Rice crop not found. Please seed the database first.");
      process.exit(1);
    }
    const riceId = cropRes.rows[0].id;

    // 2. Create the Farmer in Kutch with Sandy soil (Incompatible for Rice)
    const farmerId = uuidv4();
    
    // Proper cleanup of old test data to avoid FK errors
    const oldFarmerRes = await pool.query("SELECT id FROM farmers WHERE name = 'Kutch Farmer (Test)'");
    if (oldFarmerRes.rowCount > 0) {
      const oldId = oldFarmerRes.rows[0].id;
      await pool.query("DELETE FROM alerts WHERE farmer_id = $1", [oldId]);
      await pool.query("DELETE FROM fvi_records WHERE farmer_id = $1", [oldId]);
      await pool.query("DELETE FROM farmer_crops WHERE farmer_id = $1", [oldId]);
      await pool.query("DELETE FROM farmers WHERE id = $1", [oldId]);
    }
    
    const farmerSql = `
      INSERT INTO farmers (id, name, phone, language, district, village, soil_type, land_size, annual_income)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const farmerValues = [
      farmerId, 
      "Kutch Farmer (Test)", 
      "9900001234", 
      "gujarati", 
      "Kutch", 
      "Bhuj", 
      "sandy", 
      2.0, 
      100000
    ];
    await pool.query(farmerSql, farmerValues);
    console.log(`✅ Farmer created: ${farmerId} (Kutch, Sandy soil)`);

    // 3. Assign Rice to the Farmer
    await pool.query(
      "INSERT INTO farmer_crops (id, farmer_id, crop_id, area_allocated, season) VALUES ($1, $2, $3, $4, $5)",
      [uuidv4(), farmerId, riceId, 1.5, 'kharif']
    );
    console.log("✅ Crop assigned: Rice");

    // 4. Force extreme weather for Kutch in the cache
    await pool.query("DELETE FROM weather_cache WHERE location = 'Kutch' OR district = 'Kutch'"); // Reset
    
    const weatherId = uuidv4();
    const weatherSql = `
      INSERT INTO weather_cache (id, location, district, state, temperature, rainfall, humidity, fetched_at, valid_until)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW() + INTERVAL '1 hour')
    `;
    const weatherValues = [weatherId, 'Kutch', 'Kutch', 'Gujarat', 44.5, 2, 10]; // 44.5°C, 2mm Rain (Severe Drought)
    await pool.query(weatherSql, weatherValues);
    console.log("✅ Weather simulated: 44.5°C, 2mm Rain (Severe Drought for Rice)");

    // 5. Trigger FVI and LLM Advice
    console.log("\n--- Triggering Dynamic Advice Generation ---");
    const result = await vulnerabilityService.recalculateFarmerScore(farmerId, { role: 'system' }, 'scenario-test');

    console.log("\n📊 Dynamic Assessment Result:");
    console.log(`FVI Score: ${result.score} (${result.label.toUpperCase()})`);
    console.log("\n💡 Dynamic LLM Advice:");
    console.log(result.advice);

    process.exit(0);
  } catch (err) {
    console.error("Scenario generation failed:", err);
    process.exit(1);
  }
}

generateScenario();
