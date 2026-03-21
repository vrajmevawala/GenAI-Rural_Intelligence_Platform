# listDiseaseRecords

## Location
- Source: disease/disease.service.js
- Lines: 4-14

## Signature
```js
listDiseaseRecords(farmerId)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.

## Parameters
- farmerId

## Implementation Snapshot
```js
async function listDiseaseRecords(farmerId) {
  let sql = "SELECT * FROM disease_records";
  let values = [];
  if (farmerId) {
    sql += " WHERE farmer_id = $1";
    values.push(farmerId);
  }
  sql += " ORDER BY detected_at DESC";
  const { rows } = await pool.query(sql, values);
  return rows;
}
```
