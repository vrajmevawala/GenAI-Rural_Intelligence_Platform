# listAlerts

## Location
- Source: alerts/alerts.service.js
- Lines: 8-38

## Signature
```js
listAlerts(filters = {})
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Contains scoring/risk business logic for farmer intelligence.

## Parameters
- filters = {}

## Implementation Snapshot
```js
async function listAlerts(filters = {}) {
  const { farmer_id, priority, status, limit = 50 } = filters;
  const where = [];
  const values = [];

  if (farmer_id) {
    values.push(farmer_id);
    where.push(`a.farmer_id = $${values.length}`);
  }
  if (priority) {
    values.push(String(priority).toUpperCase());
    where.push(`a.risk_level = $${values.length}`);
  }
  if (status) {
    values.push(status);
    where.push(`a.status = $${values.length}`);
  }

  values.push(Number(limit) > 0 ? Number(limit) : 50);
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const sql = `
    SELECT a.*, f.name AS farmer_name
    FROM alerts a
    LEFT JOIN farmers f ON f.id = a.farmer_id
    ${whereSql}
    ORDER BY a.created_at DESC
    LIMIT $${values.length}
  `;
  const { rows } = await pool.query(sql, values);
  return { alerts: rows };
```
