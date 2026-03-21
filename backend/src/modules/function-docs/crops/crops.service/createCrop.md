# createCrop

## Location
- Source: crops/crops.service.js
- Lines: 10-20

## Signature
```js
createCrop(payload)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Contains scoring/risk business logic for farmer intelligence.

## Parameters
- payload

## Implementation Snapshot
```js
async function createCrop(payload) {
  const id = uuidv4();
  const sql = `
    INSERT INTO crops (id, name, water_requirement, heat_tolerance, risk_level, ideal_soil, season)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  const values = [id, payload.name, payload.water_requirement, payload.heat_tolerance, payload.risk_level, payload.ideal_soil, payload.season];
  const { rows } = await pool.query(sql, values);
  return rows[0];
}
```
