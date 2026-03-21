# listUsers

## Location
- Source: users/users.service.js
- Lines: 7-22

## Signature
```js
listUsers(actor)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.

## Parameters
- actor

## Implementation Snapshot
```js
async function listUsers(actor) {
  let sql = `
    SELECT id, institution_id, name, email, role, created_at
    FROM institution_users
  `;
  const values = [];

  if (actor.role !== "superadmin") {
    sql += " WHERE institution_id = $1";
    values.push(actor.institutionId);
  }

  sql += " ORDER BY created_at DESC";
  const { rows } = await pool.query(sql, values);
  return rows;
}
```
