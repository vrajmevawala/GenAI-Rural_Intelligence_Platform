# listFarmerCrops

## Location
- Source: crops/crops.service.js
- Lines: 34-43

## Signature
```js
listFarmerCrops(farmerId)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.

## Parameters
- farmerId

## Implementation Snapshot
```js
async function listFarmerCrops(farmerId) {
  const sql = `
    SELECT fc.*, c.name as crop_name
    FROM farmer_crops fc
    JOIN crops c ON c.id = fc.crop_id
    WHERE fc.farmer_id = $1
  `;
  const { rows } = await pool.query(sql, [farmerId]);
  return rows;
}
```
