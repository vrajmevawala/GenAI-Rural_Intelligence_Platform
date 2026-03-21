# getFarmerById

## Location
- Source: farmers/farmers.service.js
- Lines: 299-372

## Signature
```js
getFarmerById(id)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Validates state and throws typed errors for failure cases.
- Calls external services/integrations during processing.
- Contains scoring/risk business logic for farmer intelligence.

## Parameters
- id

## Implementation Snapshot
```js
async function getFarmerById(id) {
  const farmerRes = await pool.query("SELECT * FROM farmers WHERE id = $1", [id]);
  if (farmerRes.rowCount === 0) {
    throw new AppError("Farmer not found", 404, "NOT_FOUND");
  }

  const farmer = farmerRes.rows[0];

  // Fetch crops
  const cropsRes = await pool.query(
    `SELECT fc.*, c.name as crop_name
     FROM farmer_crops fc
     JOIN crops c ON c.id = fc.crop_id
     WHERE fc.farmer_id = $1`,
    [id]
  );

  // Fetch latest FVI score
  const fviRes = await pool.query(
    "SELECT * FROM fvi_records WHERE farmer_id = $1 ORDER BY created_at DESC LIMIT 1",
    [id]
  );
  
  const fvi = fviRes.rows[0] || { score: 0, breakdown: {} };

  // 3. Fetch/Update Weather for district
  let weather = null;
  const weatherRes = await pool.query(
    "SELECT * FROM weather_cache WHERE location = $1 OR district = $1 ORDER BY fetched_at DESC LIMIT 1",
    [farmer.district]
```
