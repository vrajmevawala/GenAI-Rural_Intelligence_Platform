const { v4: uuidv4 } = require("uuid");
const { pool } = require("../../config/db");
const { AppError } = require("../../middleware/errorHandler");

async function listCrops() {
  const { rows } = await pool.query("SELECT * FROM crops ORDER BY name ASC");
  return rows;
}

async function createCrop(payload) {
  const id = uuidv4();
  const sql = `
    INSERT INTO crops (id, name, water_requirement, heat_tolerance, risk_level, ideal_soil, season)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  const values = [id, payload.name, payload.water_requirement, payload.heat_tolerance, payload.risk_level, payload.ideal_soil, payload.season];
  const { rows } = await pool.query(sql, values);
  return rows[0];
}

async function allocateCropToFarmer(payload) {
  const id = uuidv4();
  const sql = `
    INSERT INTO farmer_crops (id, farmer_id, crop_id, area_allocated, season)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const values = [id, payload.farmer_id, payload.crop_id, payload.area_allocated, payload.season];
  const { rows } = await pool.query(sql, values);
  return rows[0];
}

async function listFarmerCrops(farmerId) {
  const sql = `
    SELECT fc.*, c.name as crop_name
    FROM farmer_crops fc
    JOIN crops c ON c.id = fc.crop_id
    WHERE fc.farmer_id = $1
  `;
  const { rows } = await pool.query(sql, [farmerId]);
  return rows;
}

module.exports = {
  listCrops,
  createCrop,
  allocateCropToFarmer,
  listFarmerCrops
};
