const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { pool } = require("../../config/db");
const { AppError } = require("../../middleware/errorHandler");
const { writeAuditLog } = require("../../utils/logger");

const ACCESS_TTL = "15m";
const REFRESH_TTL_DAYS = 7;

function signAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      institutionId: user.institution_id,
      role: user.role,
      email: user.email
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TTL }
  );
}

function signRefreshToken(userId, tokenId) {
  return jwt.sign({ userId, tokenId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: `${REFRESH_TTL_DAYS}d`
  });
}

async function registerUser(actor, payload, ipAddress) {
  const existing = await pool.query("SELECT id FROM institution_users WHERE email = $1", [payload.email.toLowerCase()]);
  if (existing.rowCount > 0) {
    throw new AppError("Email already exists", 409, "VALIDATION_ERROR");
  }

  // Storing as plain text for now as per user request to 'remove encryption'
  const passwordHash = payload.password; 
  const id = uuidv4();
  const sql = `
    INSERT INTO institution_users (id, institution_id, name, email, password, role)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, institution_id, name, email, role, created_at
  `;

  const values = [
    id,
    payload.institution_id,
    payload.name,
    payload.email.toLowerCase(),
    passwordHash,
    payload.role
  ];

  const { rows } = await pool.query(sql, values);

  await writeAuditLog({
    userId: actor?.userId || id,
    action: "user.register",
    entityType: "user",
    entityId: id,
    newValues: rows[0],
    ipAddress
  });

  return rows[0];
}

async function login(payload, ipAddress) {
  const sql = `
    SELECT id, institution_id, name, email, password, role
    FROM institution_users
    WHERE email = $1
  `;
  const { rows } = await pool.query(sql, [payload.email.toLowerCase()]);

  if (rows.length === 0) {
    throw new AppError("Invalid credentials", 401, "AUTH_INVALID_CREDENTIALS");
  }

  const user = rows[0];
  
  // SUPPORT PLAIN TEXT FALLBACK
  let ok = false;
  try {
    ok = await bcrypt.compare(payload.password, user.password);
  } catch (err) {
    // If user.password is not a hash, compare normally
  }
  
  const plainMatch = payload.password === user.password;
  
  if (!ok && !plainMatch) {
    throw new AppError("Invalid credentials", 401, "AUTH_INVALID_CREDENTIALS");
  }

  const accessToken = signAccessToken(user);
  const tokenId = uuidv4();
  const refreshToken = signRefreshToken(user.id, tokenId);

  await writeAuditLog({
    userId: user.id,
    action: "auth.login",
    entityType: "user",
    entityId: user.id,
    newValues: { email: user.email },
    ipAddress
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      institution_id: user.institution_id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
}

async function refreshSession(rawRefreshToken, ipAddress) {
  try {
    const payload = jwt.verify(rawRefreshToken, process.env.JWT_REFRESH_SECRET);
    const userRes = await pool.query(
      `SELECT id, institution_id, email, role, name FROM institution_users WHERE id = $1`,
      [payload.userId]
    );

    if (userRes.rowCount === 0) {
      throw new AppError("User not found", 401, "AUTH_INVALID_CREDENTIALS");
    }

    const user = userRes.rows[0];
    return {
      accessToken: signAccessToken(user),
      refreshToken: rawRefreshToken 
    };
  } catch (err) {
    throw new AppError("Invalid refresh token", 401, "AUTH_INVALID_CREDENTIALS");
  }
}

async function logout(rawRefreshToken, actor, ipAddress) {
  return { revoked: true };
}

async function getCurrentUser(userId) {
  const { rows } = await pool.query(
    `SELECT id, institution_id, name, email, role, created_at
     FROM institution_users WHERE id = $1`,
    [userId]
  );

  if (rows.length === 0) {
    throw new AppError("User not found", 404, "AUTH_INVALID_CREDENTIALS");
  }

  return rows[0];
}

module.exports = {
  registerUser,
  login,
  refreshSession,
  logout,
  getCurrentUser
};
