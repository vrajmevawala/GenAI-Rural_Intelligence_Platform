# deleteFarmer

## Location
- Source: farmers/farmers.service.js
- Lines: 428-472

## Signature
```js
deleteFarmer(id)
```

## How It Works (Actual Flow)
- Uses transaction control to keep multi-step DB operations consistent.
- Validates state and throws typed errors for failure cases.
- Calls external services/integrations during processing.

## Parameters
- id

## Implementation Snapshot
```js
async function deleteFarmer(id) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const dependentTables = [
      "alerts",
      "disease_records",
      "fvi_records",
      "farmer_schemes",
      "farmer_crops",
      "chat_logs",
      "voice_logs",
      "image_analysis",
      "notifications",
      "whatsapp_conversations"
    ];

    for (const table of dependentTables) {
      try {
        await client.query(`DELETE FROM ${table} WHERE farmer_id = $1`, [id]);
      } catch (err) {
        if (err.code !== "42P01") {
          throw err;
        }
      }
    }

    const delRes = await client.query("DELETE FROM farmers WHERE id = $1", [id]);
    if (delRes.rowCount === 0) {
```
