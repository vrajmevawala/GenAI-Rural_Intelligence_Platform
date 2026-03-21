# getScoreHistory

## Location
- Source: farmers/farmers.service.js
- Lines: 379-385

## Signature
```js
getScoreHistory(id)
```

## How It Works (Actual Flow)
- Handles HTTP request/response flow in a controller.
- Runs one or more PostgreSQL queries for read/write operations.
- Contains scoring/risk business logic for farmer intelligence.

## Parameters
- id

## Implementation Snapshot
```js
async function getScoreHistory(id) {
  const res = await pool.query(
    "SELECT score, created_at FROM fvi_records WHERE farmer_id = $1 ORDER BY created_at ASC",
    [id]
  );
  return { history: res.rows };
}
```
