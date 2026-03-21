# createAlert

## Location
- Source: alerts/alerts.service.js
- Lines: 40-50

## Signature
```js
createAlert(payload)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Contains scoring/risk business logic for farmer intelligence.

## Parameters
- payload

## Implementation Snapshot
```js
async function createAlert(payload) {
  const id = uuidv4();
  const sql = `
    INSERT INTO alerts (id, farmer_id, crop_id, message, reason, risk_level)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const values = [id, payload.farmer_id, payload.crop_id, payload.message, payload.reason, payload.risk_level];
  const { rows } = await pool.query(sql, values);
  return rows[0];
}
```
