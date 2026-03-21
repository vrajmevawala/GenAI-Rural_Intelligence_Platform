# getAdminStats

## Location
- Source: dashboard/dashboard.service.js
- Lines: 172-186

## Signature
```js
getAdminStats()
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.

## Parameters
- None

## Implementation Snapshot
```js
async function getAdminStats() {
  const [farmersCount, cropsCount, alertsCount, institutionsCount] = await Promise.all([
    pool.query("SELECT COUNT(*)::int as count FROM farmers"),
    pool.query("SELECT COUNT(*)::int as count FROM crops"),
    pool.query("SELECT COUNT(*)::int as count FROM alerts"),
    pool.query("SELECT COUNT(*)::int as count FROM institutions")
  ]);

  return {
    farmers: farmersCount.rows[0].count,
    crops: cropsCount.rows[0].count,
    alerts: alertsCount.rows[0].count,
    institutions: institutionsCount.rows[0].count
  };
}
```
