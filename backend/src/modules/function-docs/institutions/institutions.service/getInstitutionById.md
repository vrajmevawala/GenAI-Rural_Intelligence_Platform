# getInstitutionById

## Location
- Source: institutions/institutions.service.js
- Lines: 22-28

## Signature
```js
getInstitutionById(id)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Validates state and throws typed errors for failure cases.

## Parameters
- id

## Implementation Snapshot
```js
async function getInstitutionById(id) {
  const { rows } = await pool.query("SELECT * FROM institutions WHERE id = $1", [id]);
  if (rows.length === 0) {
    throw new AppError("Institution not found", 404, "NOT_FOUND");
  }
  return rows[0];
}
```
