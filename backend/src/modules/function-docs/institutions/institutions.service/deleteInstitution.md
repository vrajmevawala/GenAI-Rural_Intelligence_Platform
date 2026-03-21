# deleteInstitution

## Location
- Source: institutions/institutions.service.js
- Lines: 58-61

## Signature
```js
deleteInstitution(id)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.

## Parameters
- id

## Implementation Snapshot
```js
async function deleteInstitution(id) {
  await pool.query("DELETE FROM institutions WHERE id = $1", [id]);
  return { id, deleted: true };
}
```
