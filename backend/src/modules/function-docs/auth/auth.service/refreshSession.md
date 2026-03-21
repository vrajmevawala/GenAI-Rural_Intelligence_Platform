# refreshSession

## Location
- Source: auth/auth.service.js
- Lines: 118-138

## Signature
```js
refreshSession(rawRefreshToken, ipAddress)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Validates state and throws typed errors for failure cases.
- Performs authentication/security-related processing.

## Parameters
- rawRefreshToken
- ipAddress

## Implementation Snapshot
```js
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
```
