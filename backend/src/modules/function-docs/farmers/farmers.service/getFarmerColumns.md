# getFarmerColumns

## Location
- Source: farmers/farmers.service.js
- Lines: 7-16

## Signature
```js
getFarmerColumns()
```

## How It Works (Actual Flow)
- Handles HTTP request/response flow in a controller.
- Runs one or more PostgreSQL queries for read/write operations.
- Transforms result sets before returning data to caller/UI.

## Parameters
- None

## Implementation Snapshot
```js
async function getFarmerColumns() {
  if (farmerColumnsCache) return farmerColumnsCache;
  const res = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = 'farmers'`
  );
  farmerColumnsCache = new Set(res.rows.map((r) => r.column_name));
  return farmerColumnsCache;
}
```
