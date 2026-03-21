# getPendingHighUrgent

## Location
- Source: alerts/alerts.service.js
- Lines: 234-245

## Signature
```js
getPendingHighUrgent(user)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Contains scoring/risk business logic for farmer intelligence.

## Parameters
- user

## Implementation Snapshot
```js
async function getPendingHighUrgent(user) {
  const sql = `
    SELECT a.*, f.name AS farmer_name
    FROM alerts a
    LEFT JOIN farmers f ON f.id = a.farmer_id
    WHERE a.status = 'pending' AND (a.risk_level = 'high' OR a.risk_level = 'critical')
    ORDER BY a.created_at DESC
    LIMIT 5
  `;
  const { rows } = await pool.query(sql);
  return rows;
}
```
