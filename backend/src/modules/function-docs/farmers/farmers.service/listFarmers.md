# listFarmers

## Location
- Source: farmers/farmers.service.js
- Lines: 120-237

## Signature
```js
listFarmers(query, limit = 10, offset = 0)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Transforms result sets before returning data to caller/UI.
- Contains scoring/risk business logic for farmer intelligence.

## Parameters
- query
- limit = 10
- offset = 0

## Implementation Snapshot
```js
async function listFarmers(query, limit = 10, offset = 0) {
  const columns = await getFarmerColumns();
  const primaryCropExpr = columns.has("primary_crop")
    ? "COALESCE(f.primary_crop, fc.crop_name)"
    : "fc.crop_name";
  const whereParts = [];
  const values = [];

  if (query.district) {
    values.push(query.district);
    whereParts.push(`district = $${values.length}`);
  }
  if (query.village) {
    values.push(query.village);
    whereParts.push(`village = $${values.length}`);
  }
  if (query.taluka && columns.has("taluka")) {
    values.push(query.taluka);
    whereParts.push(`taluka = $${values.length}`);
  }
  if (query.soil_type) {
    values.push(query.soil_type);
    whereParts.push(`soil_type = $${values.length}`);
  }
  if (query.primary_crop) {
    values.push(`%${query.primary_crop}%`);
    whereParts.push(`(f.primary_crop ILIKE $${values.length} OR fc.crop_name ILIKE $${values.length})`);
  }
  if (query.vulnerability_label) {
    const bands = {
```
