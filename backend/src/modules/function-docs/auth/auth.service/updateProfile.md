# updateProfile

## Location
- Source: auth/auth.service.js
- Lines: 177-202

## Signature
```js
updateProfile(userId, payload)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.

## Parameters
- userId
- payload

## Implementation Snapshot
```js
async function updateProfile(userId, payload) {
  const fields = [];
  const values = [];
  let idx = 1;

  ["name", "preferred_language"].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      fields.push(`${key} = $${idx}`);
      values.push(payload[key]);
      idx += 1;
    }
  });

  if (fields.length === 0) return getCurrentUser(userId);

  values.push(userId);
  const sql = `
    UPDATE institution_users
    SET ${fields.join(", ")}
    WHERE id = $${idx}
    RETURNING id
  `;

  await pool.query(sql, values);
  return getCurrentUser(userId);
}
```
