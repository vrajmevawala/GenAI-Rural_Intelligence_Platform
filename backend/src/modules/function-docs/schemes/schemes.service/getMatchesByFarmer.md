# getMatchesByFarmer

## Location
- Source: schemes/schemes.service.js
- Lines: 33-49

## Signature
```js
getMatchesByFarmer(farmerId)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.

## Parameters
- farmerId

## Implementation Snapshot
```js
async function getMatchesByFarmer(farmerId) {
  const sql = `
    SELECT fs.id, fs.farmer_id, fs.scheme_id,
           fs.status as application_status,
           fs.created_at,
           s.name as scheme_name,
           s.description,
           s.eligibility_criteria,
           s.benefit as benefit_amount
    FROM farmer_schemes fs
    JOIN schemes s ON s.id = fs.scheme_id
    WHERE fs.farmer_id = $1
    ORDER BY fs.created_at DESC
  `;
  const { rows } = await pool.query(sql, [farmerId]);
  return { matches: rows };
}
```
