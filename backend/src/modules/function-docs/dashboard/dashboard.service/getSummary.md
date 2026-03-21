# getSummary

## Location
- Source: dashboard/dashboard.service.js
- Lines: 107-170

## Signature
```js
getSummary(institutionId)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Contains scoring/risk business logic for farmer intelligence.

## Parameters
- institutionId

## Implementation Snapshot
```js
async function getSummary(institutionId) {
  // Stats
  const farmersRes = await pool.query("SELECT COUNT(*)::int AS count FROM farmers");
  const alertsRes = await pool.query("SELECT COUNT(*)::int AS count FROM alerts");
  const criticalRes = await pool.query("SELECT COUNT(*)::int AS count FROM alerts WHERE risk_level = 'CRITICAL'");
  const schemesRes = await pool.query("SELECT COUNT(*)::int AS count FROM farmer_schemes");
  
  // Distribution by risk level
  const distributionRes = await pool.query(`
    SELECT risk_level as label, COUNT(*)::int as value
    FROM alerts
    GROUP BY risk_level
  `);

  // Alert breakdown by reason
  const breakdownRes = await pool.query(`
    SELECT reason as name, COUNT(*)::int as value
    FROM alerts
    GROUP BY reason
  `);
  
  // Average FVI Score (Latest per farmer)
  const avgScoreRes = await pool.query(`
    SELECT AVG(score)::int as avg_score FROM (
      SELECT DISTINCT ON (farmer_id) score 
      FROM fvi_records 
      ORDER BY farmer_id, created_at DESC
    ) as latest_scores
  `);

```
