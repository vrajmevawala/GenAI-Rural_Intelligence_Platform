const { v4: uuidv4 } = require("uuid");
const { pool } = require("../../config/db");
const { AppError } = require("../../middleware/errorHandler");

let farmerColumnsCache = null;

async function getFarmerColumns() {
  if (farmerColumnsCache) return farmerColumnsCache;
  const res = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = 'farmers'`
  );
  farmerColumnsCache = new Set(res.rows.map((r) => r.column_name));
  return farmerColumnsCache;
}

function normalizePhoneNumber(phone) {
  if (!phone) return null;
  const trimmed = String(phone).trim();
  if (trimmed.startsWith("+")) return trimmed;

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return trimmed;
}

function nullIfEmpty(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}

function mapFarmerPayload(payload = {}) {
  return {
    name: payload.name,
    phone: normalizePhoneNumber(payload.phone),
    password: payload.password || null,
    language: payload.language || payload.preferred_language || "en",
    district: payload.district || null,
    village: payload.village || null,
    latitude: payload.latitude || null,
    longitude: payload.longitude || null,
    aadhaar_last4: payload.aadhaar_last4 || null,
    soil_type: payload.soil_type || null,
    land_size: payload.land_size ?? payload.land_area_acres ?? null,
    annual_income: payload.annual_income ?? payload.annual_income_inr ?? null,
    taluka: payload.taluka || null,
    primary_crop: payload.primary_crop || null,
    secondary_crop: payload.secondary_crop || null,
    irrigation_type: payload.irrigation_type || null,
    family_size: payload.family_size ?? null,
    loan_amount_inr: payload.loan_amount_inr ?? payload.loan_amount ?? null,
    loan_type: payload.loan_type || null,
    loan_due_date: payload.loan_due_date || null,
    has_crop_insurance: payload.has_crop_insurance ?? null,
    insurance_expiry_date: payload.insurance_expiry_date || null,
    pm_kisan_enrolled: payload.pm_kisan_enrolled ?? null,
    bank_account_number: payload.bank_account_number || null
  };
}

function mapPostgresError(err) {
  if (!err || !err.code) return null;

  if (err.code === "23505") {
    if (String(err.constraint || "").includes("phone")) {
      return new AppError("Phone number already exists", 409, "FARMER_PHONE_EXISTS");
    }
    return new AppError("Duplicate value", 409, "DUPLICATE_VALUE");
  }

  if (err.code === "23502") {
    return new AppError(`Missing required field: ${err.column || "unknown"}`, 400, "VALIDATION_ERROR");
  }

  if (err.code === "22P02") {
    return new AppError("Invalid input format", 400, "VALIDATION_ERROR");
  }

  if (err.code === "22007") {
    return new AppError("Invalid date format", 400, "VALIDATION_ERROR");
  }

  if (err.code === "23514") {
    return new AppError("Invalid field value", 400, "VALIDATION_ERROR");
  }

  if (err.code === "23503") {
    return new AppError("Cannot delete farmer due to dependent records", 409, "FARMER_HAS_DEPENDENCIES");
  }

  return null;
}

async function syncPrimaryCropForFarmer(farmerId, primaryCrop) {
  const cropName = String(primaryCrop || "").trim();
  if (!cropName) return;

  const cropRes = await pool.query(
    `INSERT INTO crops (id, name)
     VALUES ($1, $2)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [uuidv4(), cropName]
  );

  const cropId = cropRes.rows[0]?.id;
  if (!cropId) return;

  const existing = await pool.query(
    `SELECT id FROM farmer_crops WHERE farmer_id = $1 ORDER BY created_at ASC LIMIT 1`,
    [farmerId]
  );

  if (existing.rowCount > 0) {
    await pool.query(
      `UPDATE farmer_crops
       SET crop_id = $1, season = COALESCE(season, 'Kharif')
       WHERE id = $2`,
      [cropId, existing.rows[0].id]
    );
    return;
  }

  await pool.query(
    `INSERT INTO farmer_crops (id, farmer_id, crop_id, area_allocated, season)
     VALUES ($1, $2, $3, $4, $5)`,
    [uuidv4(), farmerId, cropId, null, "Kharif"]
  );
}

async function listFarmers(query, limit = 10, offset = 0) {
  const columns = await getFarmerColumns();
  const primaryCropExpr = columns.has("primary_crop")
    ? "COALESCE(f.primary_crop, fc.crop_name)"
    : "fc.crop_name";
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
  if (query.taluka && columns.has("taluka")) {
    values.push(query.taluka);
    whereParts.push(`taluka = $${values.length}`);
  }
  if (query.soil_type) {
    values.push(query.soil_type);
    whereParts.push(`soil_type = $${values.length}`);
  }
  if (query.primary_crop) {
    values.push(`%${query.primary_crop}%`);
    whereParts.push(`(f.primary_crop ILIKE $${values.length} OR fc.crop_name ILIKE $${values.length})`);
  }
  if (query.vulnerability_label) {
    const bands = {
      low: [0, 40],
      medium: [41, 60],
      high: [61, 80],
      critical: [81, 100]
    };
    const band = bands[String(query.vulnerability_label).toLowerCase()];
    if (band) {
      values.push(band[0]);
      values.push(band[1]);
      whereParts.push(`COALESCE(fvi.score, 0) BETWEEN $${values.length - 1} AND $${values.length}`);
    }
  }
  if (query.search) {
    values.push(`%${query.search}%`);
    const p = values.length;
    whereParts.push(`(name ILIKE $${p} OR phone ILIKE $${p} OR village ILIKE $${p} OR district ILIKE $${p})`);
  }

  const where = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

  const listSql = `
    SELECT f.*, 
        ${primaryCropExpr} as primary_crop,
           fvi.score as vulnerability_score
    FROM farmers f
    LEFT JOIN LATERAL (
      SELECT c.name as crop_name
      FROM farmer_crops fcl
      JOIN crops c ON c.id = fcl.crop_id
      WHERE fcl.farmer_id = f.id
      LIMIT 1
    ) fc ON true
    LEFT JOIN (
      SELECT DISTINCT ON (farmer_id) farmer_id, score, created_at 
      FROM fvi_records 
      ORDER BY farmer_id, created_at DESC
    ) fvi ON fvi.farmer_id = f.id
    ${where}
    ORDER BY f.created_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;

  const countSql = `
  SELECT COUNT(DISTINCT f.id)::int AS total
  FROM farmers f
  LEFT JOIN LATERAL (
    SELECT c.name as crop_name
    FROM farmer_crops fcl
    JOIN crops c ON c.id = fcl.crop_id
    WHERE fcl.farmer_id = f.id
    LIMIT 1
  ) fc ON true
  LEFT JOIN (
    SELECT DISTINCT ON (farmer_id) farmer_id, score
    FROM fvi_records 
    ORDER BY farmer_id, created_at DESC
  ) fvi ON fvi.farmer_id = f.id
  ${where}
`;

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
  const columns = await getFarmerColumns();
  const mapped = mapFarmerPayload(payload);

  if (!mapped.name || String(mapped.name).trim().length < 2) {
    throw new AppError("Name is required", 400, "VALIDATION_ERROR");
  }

  if (!mapped.phone || !/^\+\d{10,15}$/.test(mapped.phone)) {
    throw new AppError("Phone must be in E.164 format (e.g. +919876543210)", 400, "VALIDATION_ERROR");
  }

  const id = uuidv4();
  const insertPayload = {
    id,
    name: mapped.name,
    phone: mapped.phone,
    password: mapped.password,
    language: mapped.language,
    district: mapped.district,
    village: mapped.village,
    latitude: mapped.latitude,
    longitude: mapped.longitude,
    aadhaar_last4: mapped.aadhaar_last4,
    soil_type: mapped.soil_type,
    land_size: mapped.land_size,
    annual_income: mapped.annual_income,
    taluka: mapped.taluka,
    primary_crop: mapped.primary_crop,
    secondary_crop: mapped.secondary_crop,
    irrigation_type: mapped.irrigation_type,
    family_size: mapped.family_size,
    loan_amount_inr: mapped.loan_amount_inr,
    loan_type: mapped.loan_type,
    loan_due_date: mapped.loan_due_date,
    has_crop_insurance: mapped.has_crop_insurance,
    insurance_expiry_date: mapped.insurance_expiry_date,
    pm_kisan_enrolled: mapped.pm_kisan_enrolled,
    bank_account_number: mapped.bank_account_number
  };

  const keys = Object.keys(insertPayload).filter((k) => columns.has(k));
  const values = keys.map((k) => insertPayload[k]);
  const sql = `
    INSERT INTO farmers (${keys.join(", ")})
    VALUES (${keys.map((_, i) => `$${i + 1}`).join(", ")})
    RETURNING *
  `;

  try {
    const { rows } = await pool.query(sql, values);
    await syncPrimaryCropForFarmer(rows[0].id, payload.primary_crop);
    return getFarmerById(rows[0].id);
  } catch (err) {
    const mappedError = mapPostgresError(err);
    if (mappedError) throw mappedError;
    throw err;
  }
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
    preferred_language: farmer.preferred_language || farmer.language || null,
    aadhaar_last4: farmer.aadhaar_last4 || null,
    taluka: farmer.taluka || farmer.tehsil || null,
    secondary_crop: farmer.secondary_crop || null,
    irrigation_type: farmer.irrigation_type || farmer.irrigation || null,
    family_size: farmer.family_size ?? null,
    land_area_acres: farmer.land_size,
    annual_income_inr: farmer.annual_income,
    loan_amount_inr: farmer.loan_amount_inr ?? farmer.loan_amount ?? null,
    loan_type: farmer.loan_type || null,
    loan_due_date: farmer.loan_due_date || null,
    has_crop_insurance: farmer.has_crop_insurance ?? false,
    insurance_expiry_date: farmer.insurance_expiry_date || null,
    pm_kisan_enrolled: farmer.pm_kisan_enrolled ?? false,
    bank_account_number: farmer.bank_account_number || null,
    primary_crop: cropsRes.rows[0]?.crop_name || farmer.primary_crop || "N/A",
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
  const columns = await getFarmerColumns();
  const fields = [];
  const values = [];
  let idx = 1;

  const normalizedPayload = {
    ...payload,
    phone: payload.phone ? normalizePhoneNumber(payload.phone) : payload.phone,
    land_size: payload.land_size ?? payload.land_area_acres,
    annual_income: payload.annual_income ?? payload.annual_income_inr,
    loan_amount_inr: payload.loan_amount_inr ?? payload.loan_amount,
    language: payload.language ?? payload.preferred_language,
    secondary_crop: nullIfEmpty(payload.secondary_crop),
    loan_type: nullIfEmpty(payload.loan_type),
    loan_due_date: nullIfEmpty(payload.loan_due_date),
    insurance_expiry_date: nullIfEmpty(payload.insurance_expiry_date),
    bank_account_number: nullIfEmpty(payload.bank_account_number),
    land_size: nullIfEmpty(payload.land_size ?? payload.land_area_acres),
    annual_income: nullIfEmpty(payload.annual_income ?? payload.annual_income_inr),
    loan_amount_inr: nullIfEmpty(payload.loan_amount_inr ?? payload.loan_amount),
    family_size: nullIfEmpty(payload.family_size),
    latitude: nullIfEmpty(payload.latitude),
    longitude: nullIfEmpty(payload.longitude)
  };

  Object.keys(normalizedPayload).forEach((key) => {
    if (["name", "phone", "password", "language", "district", "village", "taluka", "aadhaar_last4", "primary_crop", "secondary_crop", "irrigation_type", "family_size", "latitude", "longitude", "soil_type", "land_size", "annual_income", "loan_amount_inr", "loan_type", "loan_due_date", "has_crop_insurance", "insurance_expiry_date", "pm_kisan_enrolled", "bank_account_number"].includes(key) && columns.has(key)) {
      fields.push(`${key} = $${idx}`);
      values.push(normalizedPayload[key]);
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

  try {
    const { rows } = await pool.query(sql, values);
    if (rows.length === 0) {
      throw new AppError("Farmer not found", 404, "NOT_FOUND");
    }

    await syncPrimaryCropForFarmer(id, payload.primary_crop);
    return getFarmerById(id);
  } catch (err) {
    const mappedError = mapPostgresError(err);
    if (mappedError) throw mappedError;
    throw err;
  }
}

async function deleteFarmer(id) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const dependentTables = [
      "alerts",
      "disease_records",
      "fvi_records",
      "farmer_schemes",
      "farmer_crops",
      "chat_logs",
      "voice_logs",
      "image_analysis",
      "notifications",
      "whatsapp_conversations"
    ];

    for (const table of dependentTables) {
      try {
        await client.query(`DELETE FROM ${table} WHERE farmer_id = $1`, [id]);
      } catch (err) {
        if (err.code !== "42P01") {
          throw err;
        }
      }
    }

    const delRes = await client.query("DELETE FROM farmers WHERE id = $1", [id]);
    if (delRes.rowCount === 0) {
      throw new AppError("Farmer not found", 404, "NOT_FOUND");
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    const mappedError = mapPostgresError(err);
    if (mappedError) throw mappedError;
    throw err;
  } finally {
    client.release();
  }

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
