# createDiseaseRecord

## Location
- Source: disease/disease.service.js
- Lines: 16-31

## Signature
```js
createDiseaseRecord(payload)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.

## Parameters
- payload

## Implementation Snapshot
```js
async function createDiseaseRecord(payload) {
  const id = uuidv4();
  const sql = `
    INSERT INTO disease_records (
      id, farmer_id, crop_id, disease_name, severity, status, confidence, image_url, detected_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    RETURNING *
  `;
  const values = [
    id, payload.farmer_id, payload.crop_id, payload.disease_name,
    payload.severity, payload.status || "DETECTED", payload.confidence, payload.image_url
  ];
  const { rows } = await pool.query(sql, values);
  return rows[0];
}
```
