# listCrops

## Location
- Source: crops/crops.service.js
- Lines: 5-8

## Signature
```js
listCrops()
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.

## Parameters
- None

## Implementation Snapshot
```js
async function listCrops() {
  const { rows } = await pool.query("SELECT * FROM crops ORDER BY name ASC");
  return rows;
}
```
