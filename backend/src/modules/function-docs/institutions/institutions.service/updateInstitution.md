# updateInstitution

## Location
- Source: institutions/institutions.service.js
- Lines: 30-56

## Signature
```js
updateInstitution(id, payload)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Validates state and throws typed errors for failure cases.

## Parameters
- id
- payload

## Implementation Snapshot
```js
async function updateInstitution(id, payload) {
  const fields = [];
  const values = [];
  let idx = 1;

  Object.keys(payload).forEach((key) => {
    fields.push(`${key} = $${idx}`);
    values.push(payload[key]);
    idx += 1;
  });

  if (fields.length === 0) return getInstitutionById(id);

  values.push(id);
  const sql = `
    UPDATE institutions
    SET ${fields.join(", ")}
    WHERE id = $${idx}
    RETURNING *
  `;

  const { rows } = await pool.query(sql, values);
  if (rows.length === 0) {
    throw new AppError("Institution not found", 404, "NOT_FOUND");
  }
  return rows[0];
}
```
