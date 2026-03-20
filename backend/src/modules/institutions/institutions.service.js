const { v4: uuidv4 } = require("uuid");
const { pool } = require("../../config/db");
const { AppError } = require("../../middleware/errorHandler");

async function listInstitutions() {
  const { rows } = await pool.query("SELECT * FROM institutions ORDER BY created_at DESC");
  return rows;
}

async function createInstitution(payload) {
  const id = uuidv4();
  const sql = `
    INSERT INTO institutions (id, name, type, location)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const values = [id, payload.name, payload.type, payload.location];
  const { rows } = await pool.query(sql, values);
  return rows[0];
}

async function getInstitutionById(id) {
  const { rows } = await pool.query("SELECT * FROM institutions WHERE id = $1", [id]);
  if (rows.length === 0) {
    throw new AppError("Institution not found", 404, "NOT_FOUND");
  }
  return rows[0];
}

async function updateInstitution(id, payload) {
  const fields = [];
  const values = [];
  let idx = 1;

  Object.keys(payload).forEach((key) => {
    fields.push(`${key} = $${idx}`);
    values.push(payload[key]);
    idx += 1;
  });

  if (fields.length === 0) return getInstitutionById(id);

  values.push(id);
  const sql = `
    UPDATE institutions
    SET ${fields.join(", ")}
    WHERE id = $${idx}
    RETURNING *
  `;

  const { rows } = await pool.query(sql, values);
  if (rows.length === 0) {
    throw new AppError("Institution not found", 404, "NOT_FOUND");
  }
  return rows[0];
}

async function deleteInstitution(id) {
  await pool.query("DELETE FROM institutions WHERE id = $1", [id]);
  return { id, deleted: true };
}

module.exports = {
  listInstitutions,
  createInstitution,
  getInstitutionById,
  updateInstitution,
  deleteInstitution
};
