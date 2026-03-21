const { v4: uuidv4 } = require("uuid");
const { pool } = require("../../config/db");
const { AppError } = require("../../middleware/errorHandler");

async function listSchemes() {
  const { rows } = await pool.query("SELECT * FROM schemes ORDER BY created_at DESC");
  return { schemes: rows };
}

async function matchFarmer(farmerId) {
  // Logic: find all schemes and mark them as eligible/not
  const schemesRes = await pool.query("SELECT * FROM schemes");
  const farmerRes = await pool.query("SELECT * FROM farmers WHERE id = $1", [farmerId]);
  
  if (farmerRes.rowCount === 0) throw new AppError("Farmer not found", 404);
  
  // For each scheme, create a farmer_schemes entry only if missing.
  for (const scheme of schemesRes.rows) {
    await pool.query(
      `INSERT INTO farmer_schemes (id, farmer_id, scheme_id, status)
       SELECT $1, $2, $3, $4
       WHERE NOT EXISTS (
         SELECT 1 FROM farmer_schemes fs
         WHERE fs.farmer_id = $2 AND fs.scheme_id = $3
       )`,
      [uuidv4(), farmerId, scheme.id, 'eligible']
    );
  }
  
  return getMatchesByFarmer(farmerId);
}

async function getMatchesByFarmer(farmerId) {
  const sql = `
    SELECT fs.id, fs.farmer_id, fs.scheme_id,
           fs.status as application_status,
           fs.created_at,
           s.name as scheme_name,
           s.description,
           s.eligibility_criteria,
           s.benefit as benefit_amount
    FROM farmer_schemes fs
    JOIN schemes s ON s.id = fs.scheme_id
    WHERE fs.farmer_id = $1
    ORDER BY fs.created_at DESC
  `;
  const { rows } = await pool.query(sql, [farmerId]);
  return { matches: rows };
}

async function updateMatchStatus(matchId, status) {
  const sql = "UPDATE farmer_schemes SET status = $1 WHERE id = $2 RETURNING *";
  const { rows } = await pool.query(sql, [status, matchId]);
  if (rows.length === 0) throw new AppError("Match not found", 404);
  return {
    ...rows[0],
    application_status: rows[0].status
  };
}

module.exports = {
  listSchemes,
  matchFarmer,
  getMatchesByFarmer,
  updateMatchStatus
};
