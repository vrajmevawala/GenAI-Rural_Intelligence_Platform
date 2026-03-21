# createUser

## Location
- Source: users/users.service.js
- Lines: 24-51

## Signature
```js
createUser(actor, payload, ipAddress)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Validates state and throws typed errors for failure cases.

## Parameters
- actor
- payload
- ipAddress

## Implementation Snapshot
```js
async function createUser(actor, payload, ipAddress) {
  const email = payload.email.toLowerCase();
  const exists = await pool.query("SELECT id FROM institution_users WHERE email = $1", [email]);
  if (exists.rowCount > 0) {
    throw new AppError("Email already exists", 409, "VALIDATION_ERROR");
  }

  const id = uuidv4();
  // Storing as plain text as per user request to 'remove encryption'
  const passwordHash = payload.password; 
  const { rows } = await pool.query(
    `INSERT INTO institution_users (id, institution_id, name, email, password, role)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, institution_id, name, email, role, created_at`,
    [id, payload.institution_id, payload.name, email, passwordHash, payload.role]
  );

  await writeAuditLog({
    userId: actor.userId,
    action: "user.create",
    entityType: "user",
    entityId: id,
    newValues: rows[0],
    ipAddress
  });

  return rows[0];
}
```
