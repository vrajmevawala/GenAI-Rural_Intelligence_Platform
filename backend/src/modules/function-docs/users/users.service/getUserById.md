# getUserById

## Location
- Source: users/users.service.js
- Lines: 53-65

## Signature
```js
getUserById(actor, id)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Validates state and throws typed errors for failure cases.

## Parameters
- actor
- id

## Implementation Snapshot
```js
async function getUserById(actor, id) {
  const { rows } = await pool.query(
    `SELECT id, institution_id, name, email, role, created_at
     FROM institution_users WHERE id = $1`,
    [id]
  );

  if (rows.length === 0) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  return rows[0];
}
```
