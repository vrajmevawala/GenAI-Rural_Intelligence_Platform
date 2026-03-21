# listInstitutions

## Location
- Source: institutions/institutions.service.js
- Lines: 5-8

## Signature
```js
listInstitutions()
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.

## Parameters
- None

## Implementation Snapshot
```js
async function listInstitutions() {
  const { rows } = await pool.query("SELECT * FROM institutions ORDER BY created_at DESC");
  return rows;
}
```
