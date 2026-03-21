# registerUser

## Location
- Source: auth/auth.service.js
- Lines: 30-66

## Signature
```js
registerUser(actor, payload, ipAddress)
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
```
