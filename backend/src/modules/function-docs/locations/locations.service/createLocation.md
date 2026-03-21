# createLocation

## Location
- Source: locations/locations.service.js
- Lines: 9-19

## Signature
```js
createLocation(payload)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.

## Parameters
- payload

## Implementation Snapshot
```js
async function createLocation(payload) {
  const id = uuidv4();
  const sql = `
    INSERT INTO locations (id, district, state, latitude, longitude)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const values = [id, payload.district, payload.state, payload.latitude, payload.longitude];
  const { rows } = await pool.query(sql, values);
  return rows[0];
}
```
