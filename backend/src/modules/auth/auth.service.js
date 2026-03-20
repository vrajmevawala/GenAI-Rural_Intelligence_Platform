const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { pool } = require("../../config/db");
const { ROLE_LEVELS, ROLES } = require("../../config/constants");
const { AppError } = require("../../middleware/errorHandler");
const { writeAuditLog } = require("../../utils/logger");

const ACCESS_TTL = "15m";
const REFRESH_TTL_DAYS = 7;

function signAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      organizationId: user.organization_id,
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
  if (!actor || ![ROLES.ORG_ADMIN, ROLES.SUPERADMIN].includes(actor.role)) {
    throw new AppError("Permission denied", 403, "PERMISSION_DENIED");
  }

  if (ROLE_LEVELS[payload.role] > ROLE_LEVELS[actor.role]) {
    throw new AppError("Cannot assign higher role", 403, "PERMISSION_DENIED");
  }

  if (actor.role !== ROLES.SUPERADMIN && actor.organizationId !== payload.organization_id) {
    throw new AppError("Cannot create user for another organization", 403, "PERMISSION_DENIED");
  }

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [payload.email.toLowerCase()]);
  if (existing.rowCount > 0) {
    throw new AppError("Email already exists", 409, "VALIDATION_ERROR");
  }

  const passwordHash = await bcrypt.hash(payload.password, 12);
  const id = uuidv4();
  const sql = `
    INSERT INTO users (id, organization_id, name, email, password_hash, role, preferred_language)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, organization_id, name, email, role, preferred_language, is_active, created_at
  `;

  const values = [
    id,
    payload.organization_id,
    payload.name,
    payload.email.toLowerCase(),
    passwordHash,
    payload.role,
    payload.preferred_language || "en"
  ];

  const { rows } = await pool.query(sql, values);

  await writeAuditLog({
    userId: actor.userId,
    action: "user.create",
    entityType: "user",
    entityId: id,
    oldValues: null,
    newValues: rows[0],
    ipAddress
  });

  return rows[0];
}

async function login(payload, ipAddress) {
  const sql = `
    SELECT id, organization_id, name, email, password_hash, role, preferred_language, is_active
    FROM users
    WHERE email = $1
  `;
  const { rows } = await pool.query(sql, [payload.email.toLowerCase()]);

  if (rows.length === 0) {
    throw new AppError("Invalid credentials", 401, "AUTH_INVALID_CREDENTIALS");
  }

  const user = rows[0];
  if (!user.is_active) {
    throw new AppError("User is inactive", 403, "PERMISSION_DENIED");
  }

  const ok = await bcrypt.compare(payload.password, user.password_hash);
  if (!ok) {
    throw new AppError("Invalid credentials", 401, "AUTH_INVALID_CREDENTIALS");
  }

  const accessToken = signAccessToken(user);
  const tokenId = uuidv4();
  const refreshToken = signRefreshToken(user.id, tokenId);
  const tokenHash = await bcrypt.hash(refreshToken, 12);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
    [tokenId, user.id, tokenHash, expiresAt]
  );

  await pool.query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [user.id]);

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
      organization_id: user.organization_id,
      name: user.name,
      email: user.email,
      role: user.role,
      preferred_language: user.preferred_language
    }
  };
}

async function refreshSession(rawRefreshToken, ipAddress) {
  if (!rawRefreshToken) {
    throw new AppError("Refresh token missing", 401, "AUTH_INVALID_CREDENTIALS");
  }

  let payload;
  try {
    payload = jwt.verify(rawRefreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw new AppError("Invalid refresh token", 401, "AUTH_INVALID_CREDENTIALS");
  }

  const tokenRes = await pool.query(
    `SELECT id, user_id, token_hash, expires_at, revoked_at FROM refresh_tokens WHERE id = $1 AND user_id = $2`,
    [payload.tokenId, payload.userId]
  );

  if (tokenRes.rowCount === 0) {
    throw new AppError("Refresh token not found", 401, "AUTH_INVALID_CREDENTIALS");
  }

  const tokenRow = tokenRes.rows[0];
  if (tokenRow.revoked_at || new Date(tokenRow.expires_at) < new Date()) {
    throw new AppError("Refresh token expired", 401, "AUTH_TOKEN_EXPIRED");
  }

  const hashOk = await bcrypt.compare(rawRefreshToken, tokenRow.token_hash);
  if (!hashOk) {
    throw new AppError("Refresh token mismatch", 401, "AUTH_INVALID_CREDENTIALS");
  }

  const userRes = await pool.query(
    `SELECT id, organization_id, email, role, is_active, name, preferred_language FROM users WHERE id = $1`,
    [payload.userId]
  );

  if (userRes.rowCount === 0 || !userRes.rows[0].is_active) {
    throw new AppError("User not found or inactive", 401, "AUTH_INVALID_CREDENTIALS");
  }

  const user = userRes.rows[0];

  await pool.query("UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1", [tokenRow.id]);

  const newTokenId = uuidv4();
  const newRefreshToken = signRefreshToken(user.id, newTokenId);
  const newTokenHash = await bcrypt.hash(newRefreshToken, 12);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
    [newTokenId, user.id, newTokenHash, expiresAt]
  );

  await writeAuditLog({
    userId: user.id,
    action: "auth.refresh",
    entityType: "refresh_token",
    entityId: newTokenId,
    newValues: { rotatedFrom: tokenRow.id },
    ipAddress
  });

  return {
    accessToken: signAccessToken(user),
    refreshToken: newRefreshToken
  };
}

async function logout(rawRefreshToken, actor, ipAddress) {
  if (!rawRefreshToken) {
    return { revoked: false };
  }

  try {
    const payload = jwt.verify(rawRefreshToken, process.env.JWT_REFRESH_SECRET);
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
      [payload.tokenId, payload.userId]
    );

    await writeAuditLog({
      userId: actor?.userId || payload.userId,
      action: "auth.logout",
      entityType: "refresh_token",
      entityId: payload.tokenId,
      newValues: { revoked: true },
      ipAddress
    });

    return { revoked: true };
  } catch (err) {
    return { revoked: false };
  }
}

async function getCurrentUser(userId) {
  const { rows } = await pool.query(
    `SELECT id, organization_id, name, email, role, preferred_language, is_active, last_login_at, created_at
     FROM users WHERE id = $1`,
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
