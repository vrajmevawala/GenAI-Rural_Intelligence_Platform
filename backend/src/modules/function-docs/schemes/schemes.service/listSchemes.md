# listSchemes

## Location
- Source: schemes/schemes.service.js
- Lines: 5-8

## Signature
```js
listSchemes()
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.

## Parameters
- None

## Implementation Snapshot
```js
async function listSchemes() {
  const { rows } = await pool.query("SELECT * FROM schemes ORDER BY created_at DESC");
  return { schemes: rows };
}
```
