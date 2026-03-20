const { v4: uuidv4 } = require("uuid");
const { pool } = require("../../config/db");

async function listDiseaseRecords(farmerId) {
  let sql = "SELECT * FROM disease_records";
  let values = [];
  if (farmerId) {
    sql += " WHERE farmer_id = $1";
    values.push(farmerId);
  }
  sql += " ORDER BY detected_at DESC";
  const { rows } = await pool.query(sql, values);
  return rows;
}

async function createDiseaseRecord(payload) {
  const id = uuidv4();
  const sql = `
    INSERT INTO disease_records (
      id, farmer_id, crop_id, disease_name, severity, status, confidence, image_url, detected_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    RETURNING *
  `;
  const values = [
    id, payload.farmer_id, payload.crop_id, payload.disease_name,
    payload.severity, payload.status || "DETECTED", payload.confidence, payload.image_url
  ];
  const { rows } = await pool.query(sql, values);
  return rows[0];
}

module.exports = {
  listDiseaseRecords,
  createDiseaseRecord
};
