# generateAlertsForFarmer

## Location
- Source: alerts/alerts.service.js
- Lines: 52-225

## Signature
```js
generateAlertsForFarmer(user, farmerId, ip)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Validates state and throws typed errors for failure cases.
- Calls external services/integrations during processing.
- Transforms result sets before returning data to caller/UI.
- Contains scoring/risk business logic for farmer intelligence.

## Parameters
- user
- farmerId
- ip

## Implementation Snapshot
```js
async function generateAlertsForFarmer(user, farmerId, ip) {
  const farmerRes = await pool.query(
    `SELECT * FROM farmers WHERE id = $1`,
    [farmerId]
  );
  if (farmerRes.rowCount === 0) throw new AppError("Farmer not found", 404);
  const farmer = farmerRes.rows[0];

  const [recentAlertsRes, latestScoreRes] = await Promise.all([
    pool.query(
      `SELECT message, reason, risk_level, created_at
       FROM alerts
       WHERE farmer_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [farmerId]
    ),
    pool.query(
      `SELECT score
       FROM fvi_records
       WHERE farmer_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [farmerId]
    )
  ]);

  const currentMonth = new Date().toLocaleString("en-IN", { month: "long" });
  const season = ["June", "July", "August", "September"].includes(currentMonth)
    ? "Kharif"
```
