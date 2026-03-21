# createInstitution

## Location
- Source: institutions/institutions.service.js
- Lines: 10-20

## Signature
```js
createInstitution(payload)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.

## Parameters
- payload

## Implementation Snapshot
```js
async function createInstitution(payload) {
  const id = uuidv4();
  const sql = `
    INSERT INTO institutions (id, name, type, location)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const values = [id, payload.name, payload.type, payload.location];
  const { rows } = await pool.query(sql, values);
  return rows[0];
}
```
