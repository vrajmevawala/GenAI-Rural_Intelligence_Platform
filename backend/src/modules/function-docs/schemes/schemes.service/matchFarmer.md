# matchFarmer

## Location
- Source: schemes/schemes.service.js
- Lines: 10-31

## Signature
```js
matchFarmer(farmerId)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Validates state and throws typed errors for failure cases.

## Parameters
- farmerId

## Implementation Snapshot
```js
async function matchFarmer(farmerId) {
  // Logic: find all schemes and mark them as eligible/not
  const schemesRes = await pool.query("SELECT * FROM schemes");
  const farmerRes = await pool.query("SELECT * FROM farmers WHERE id = $1", [farmerId]);
  
  if (farmerRes.rowCount === 0) throw new AppError("Farmer not found", 404);
  
  // For each scheme, create a farmer_schemes entry only if missing.
  for (const scheme of schemesRes.rows) {
    await pool.query(
      `INSERT INTO farmer_schemes (id, farmer_id, scheme_id, status)
       SELECT $1, $2, $3, $4
       WHERE NOT EXISTS (
         SELECT 1 FROM farmer_schemes fs
         WHERE fs.farmer_id = $2 AND fs.scheme_id = $3
       )`,
      [uuidv4(), farmerId, scheme.id, 'eligible']
    );
  }
  
  return getMatchesByFarmer(farmerId);
}
```
