# updateAlertStatus

## Location
- Source: alerts/alerts.service.js
- Lines: 227-232

## Signature
```js
updateAlertStatus(user, id, status, ip)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Validates state and throws typed errors for failure cases.

## Parameters
- user
- id
- status
- ip

## Implementation Snapshot
```js
async function updateAlertStatus(user, id, status, ip) {
  const sql = "UPDATE alerts SET status = $1 WHERE id = $2 RETURNING *";
  const { rows } = await pool.query(sql, [status, id]);
  if (rows.length === 0) throw new AppError("Alert not found", 404);
  return rows[0];
}
```
