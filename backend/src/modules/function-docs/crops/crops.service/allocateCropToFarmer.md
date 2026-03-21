# allocateCropToFarmer

## Location
- Source: crops/crops.service.js
- Lines: 22-32

## Signature
```js
allocateCropToFarmer(payload)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.

## Parameters
- payload

## Implementation Snapshot
```js
async function allocateCropToFarmer(payload) {
  const id = uuidv4();
  const sql = `
    INSERT INTO farmer_crops (id, farmer_id, crop_id, area_allocated, season)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const values = [id, payload.farmer_id, payload.crop_id, payload.area_allocated, payload.season];
  const { rows } = await pool.query(sql, values);
  return rows[0];
}
```
