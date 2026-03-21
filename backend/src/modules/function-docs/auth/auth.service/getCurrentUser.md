# getCurrentUser

## Location
- Source: auth/auth.service.js
- Lines: 144-175

## Signature
```js
getCurrentUser(userId)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Validates state and throws typed errors for failure cases.

## Parameters
- userId

## Implementation Snapshot
```js
async function getCurrentUser(userId) {
  const sql = `
    SELECT 
      u.id, u.institution_id, u.name, u.email, u.role, u.preferred_language, u.created_at,
      i.name as institution_name, i.type as institution_type, i.location as institution_location
    FROM institution_users u
    LEFT JOIN institutions i ON u.institution_id = i.id
    WHERE u.id = $1
  `;
  const { rows } = await pool.query(sql, [userId]);

  if (rows.length === 0) {
    throw new AppError("User not found", 404, "AUTH_INVALID_CREDENTIALS");
  }

  const user = rows[0];
  return {
    id: user.id,
    institution_id: user.institution_id,
    name: user.name,
    email: user.email,
    role: user.role,
    preferred_language: user.preferred_language,
    created_at: user.created_at,
    organization: {
      id: user.institution_id,
      name: user.institution_name,
      type: user.institution_type,
      location: user.institution_location
    }
```
