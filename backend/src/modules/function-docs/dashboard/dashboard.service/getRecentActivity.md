# getRecentActivity

## Location
- Source: dashboard/dashboard.service.js
- Lines: 53-105

## Signature
```js
getRecentActivity(limit = 10)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Contains scoring/risk business logic for farmer intelligence.

## Parameters
- limit = 10

## Implementation Snapshot
```js
async function getRecentActivity(limit = 10) {
  const [alertsRes, schemesRes, farmersRes, highRiskRes] = await Promise.all([
    pool.query(
      `SELECT 'alert_sent'::text as type,
              CONCAT('Alert generated for ', COALESCE(f.name, 'farmer')) as message,
              a.created_at
       FROM alerts a
       LEFT JOIN farmers f ON f.id = a.farmer_id
       ORDER BY a.created_at DESC
       LIMIT $1`,
      [limit]
    ),
    pool.query(
      `SELECT 'scheme_matched'::text as type,
              CONCAT('Scheme status updated to ', COALESCE(fs.status, 'eligible'), ' for ', COALESCE(f.name, 'farmer')) as message,
              fs.created_at
       FROM farmer_schemes fs
       LEFT JOIN farmers f ON f.id = fs.farmer_id
       ORDER BY fs.created_at DESC
       LIMIT $1`,
      [limit]
    ),
    pool.query(
      `SELECT 'farmer_added'::text as type,
              CONCAT('New farmer registered: ', name) as message,
              created_at
       FROM farmers
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
```
