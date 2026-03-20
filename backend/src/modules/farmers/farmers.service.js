const { v4: uuidv4 } = require("uuid");
const { pool } = require("../../config/db");
const { AppError } = require("../../middleware/errorHandler");

async function listFarmers(query, limit = 10, offset = 0) {
  const whereParts = [];
  const values = [];

  if (query.district) {
    values.push(query.district);
    whereParts.push(`district = $${values.length}`);
  }
  if (query.village) {
    values.push(query.village);
    whereParts.push(`village = $${values.length}`);
  }
  if (query.soil_type) {
    values.push(query.soil_type);
    whereParts.push(`soil_type = $${values.length}`);
  }
  if (query.search) {
    values.push(`%${query.search}%`);
    whereParts.push(`name ILIKE $${values.length}`);
  }

  const where = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

  const listSql = `
    SELECT f.*, 
           fvi.score as vulnerability_score
    FROM farmers f
    LEFT JOIN (
      SELECT DISTINCT ON (farmer_id) farmer_id, score, created_at 
      FROM fvi_records 
      ORDER BY farmer_id, created_at DESC
    ) fvi ON fvi.farmer_id = f.id
    ${where}
    ORDER BY f.created_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;

  const countSql = `SELECT COUNT(*)::int AS total FROM farmers ${where}`;

  const [listRes, countRes] = await Promise.all([
    pool.query(listSql, [...values, limit, offset]),
    pool.query(countSql, values)
  ]);

  // Map fields for frontend
  const farmers = listRes.rows.map(f => {
    let label = 'low';
    if (f.vulnerability_score > 80) label = 'critical';
    else if (f.vulnerability_score > 60) label = 'high';
    else if (f.vulnerability_score > 40) label = 'medium';

    return {
      ...f,
      land_area_acres: f.land_size,
      annual_income_inr: f.annual_income,
      vulnerability_label: label,
      vulnerability_score: f.vulnerability_score || 0
    };
  });

  return {
    farmers,
    total: countRes.rows[0].total,
    limit,
    offset
  };
}

async function createFarmer(payload) {
  const id = uuidv4();
  const sql = `
    INSERT INTO farmers (
      id, name, phone, password, language,
      district, village, latitude, longitude,
      soil_type, land_size, annual_income
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
    )
    RETURNING *
  `;

  const values = [
    id, payload.name, payload.phone, payload.password || null, payload.language || "en",
    payload.district, payload.village, payload.latitude || null, payload.longitude || null,
    payload.soil_type, payload.land_size, payload.annual_income
  ];

  const { rows } = await pool.query(sql, values);
  return rows[0];
}

async function getFarmerById(id) {
  const farmerRes = await pool.query("SELECT * FROM farmers WHERE id = $1", [id]);
  if (farmerRes.rowCount === 0) {
    throw new AppError("Farmer not found", 404, "NOT_FOUND");
  }

  const farmer = farmerRes.rows[0];

  // Fetch crops
  const cropsRes = await pool.query(
    `SELECT fc.*, c.name as crop_name
     FROM farmer_crops fc
     JOIN crops c ON c.id = fc.crop_id
     WHERE fc.farmer_id = $1`,
    [id]
  );

  // Fetch latest FVI score
  const fviRes = await pool.query(
    "SELECT * FROM fvi_records WHERE farmer_id = $1 ORDER BY created_at DESC LIMIT 1",
    [id]
  );
  
  const fvi = fviRes.rows[0] || { score: 0, breakdown: {} };

  // 3. Fetch/Update Weather for district
  let weather = null;
  const weatherRes = await pool.query(
    "SELECT * FROM weather_cache WHERE location = $1 OR district = $1 ORDER BY fetched_at DESC LIMIT 1",
    [farmer.district]
  );
  weather = weatherRes.rows[0];

  const needsRefresh = !weather || !weather.valid_until || new Date(weather.valid_until) < new Date();
  
  if (needsRefresh && farmer.district) {
    try {
      const weatherService = require('../weather/weather.service');
      weather = await weatherService.fetchWeatherForDistrict(
        farmer.district,
        farmer.latitude || 22.5,
        farmer.longitude || 72.8,
        farmer.state || 'Gujarat'
      );
    } catch (err) {
      console.error(`Weather refresh failed for ${farmer.district}:`, err.message);
    }
  }

  // 4. Map fields for frontend
  return {
    ...farmer,
    land_area_acres: farmer.land_size,
    annual_income_inr: farmer.annual_income,
    primary_crop: cropsRes.rows[0]?.crop_name || "N/A",
    vulnerability_score: fvi.score,
    score_breakdown: fvi.breakdown,
    weather: weather,
    crops: cropsRes.rows
  };
}

async function recalculateScore(id) {
  const vulnerabilityService = require("../vulnerability/vulnerability.service");
  return vulnerabilityService.recalculateFarmerScore(id, { role: 'system' }, 'manual');
}

async function getScoreHistory(id) {
  const res = await pool.query(
    "SELECT score, created_at FROM fvi_records WHERE farmer_id = $1 ORDER BY created_at ASC",
    [id]
  );
  return { history: res.rows };
}

async function updateFarmer(id, payload) {
  const fields = [];
  const values = [];
  let idx = 1;

  Object.keys(payload).forEach((key) => {
    if (["name", "phone", "password", "language", "district", "village", "latitude", "longitude", "soil_type", "land_size", "annual_income"].includes(key)) {
      fields.push(`${key} = $${idx}`);
      values.push(payload[key]);
      idx += 1;
    }
  });

  if (fields.length === 0) return getFarmerById(id);

  values.push(id);
  const sql = `
    UPDATE farmers
    SET ${fields.join(", ")}
    WHERE id = $${idx}
    RETURNING *
  `;

  const { rows } = await pool.query(sql, values);
  if (rows.length === 0) {
    throw new AppError("Farmer not found", 404, "NOT_FOUND");
  }
  return rows[0];
}

async function deleteFarmer(id) {
  await pool.query("DELETE FROM farmers WHERE id = $1", [id]);
  return { id, deleted: true };
}

module.exports = {
  listFarmers,
  createFarmer,
  getFarmerById,
  updateFarmer,
  deleteFarmer,
  recalculateScore,
  getScoreHistory
};
