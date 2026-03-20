const { v4: uuidv4 } = require("uuid");
const { pool } = require("../../config/db");

async function listLocations() {
  const { rows } = await pool.query("SELECT * FROM locations");
  return rows;
}

async function createLocation(payload) {
  const id = uuidv4();
  const sql = `
    INSERT INTO locations (id, district, state, latitude, longitude)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const values = [id, payload.district, payload.state, payload.latitude, payload.longitude];
  const { rows } = await pool.query(sql, values);
  return rows[0];
}

module.exports = {
  listLocations,
  createLocation
};
