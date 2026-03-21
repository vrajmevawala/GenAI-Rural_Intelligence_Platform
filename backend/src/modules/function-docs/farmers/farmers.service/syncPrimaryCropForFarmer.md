# syncPrimaryCropForFarmer

## Location
- Source: farmers/farmers.service.js
- Lines: 83-118

## Signature
```js
syncPrimaryCropForFarmer(farmerId, primaryCrop)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.

## Parameters
- farmerId
- primaryCrop

## Implementation Snapshot
```js
async function syncPrimaryCropForFarmer(farmerId, primaryCrop) {
  const cropName = String(primaryCrop || "").trim();
  if (!cropName) return;

  const cropRes = await pool.query(
    `INSERT INTO crops (id, name)
     VALUES ($1, $2)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [uuidv4(), cropName]
  );

  const cropId = cropRes.rows[0]?.id;
  if (!cropId) return;

  const existing = await pool.query(
    `SELECT id FROM farmer_crops WHERE farmer_id = $1 ORDER BY created_at ASC LIMIT 1`,
    [farmerId]
  );

  if (existing.rowCount > 0) {
    await pool.query(
      `UPDATE farmer_crops
       SET crop_id = $1, season = COALESCE(season, 'Kharif')
       WHERE id = $2`,
      [cropId, existing.rows[0].id]
    );
    return;
  }

```
