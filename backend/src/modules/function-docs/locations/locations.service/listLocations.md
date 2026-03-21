# listLocations

## Location
- Source: locations/locations.service.js
- Lines: 4-7

## Signature
```js
listLocations()
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.

## Parameters
- None

## Implementation Snapshot
```js
async function listLocations() {
  const { rows } = await pool.query("SELECT * FROM locations");
  return rows;
}
```
