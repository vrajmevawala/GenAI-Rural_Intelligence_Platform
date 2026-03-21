# updateUser

## Location
- Source: users/users.service.js
- Lines: 67-107

## Signature
```js
updateUser(actor, id, payload, ipAddress)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.

## Parameters
- actor
- id
- payload
- ipAddress

## Implementation Snapshot
```js
async function updateUser(actor, id, payload, ipAddress) {
  const current = await getUserById(actor, id);

  const fields = [];
  const values = [];
  let idx = 1;

  ["name", "role", "institution_id", "password"].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      fields.push(`${key} = $${idx}`);
      values.push(payload[key]);
      idx += 1;
    }
  });

  if (fields.length === 0) {
    return current;
  }

  values.push(id);
  const sql = `
    UPDATE institution_users
    SET ${fields.join(", ")}
    WHERE id = $${idx}
    RETURNING id, institution_id, name, email, role, created_at
  `;

  const { rows } = await pool.query(sql, values);

  await writeAuditLog({
```
