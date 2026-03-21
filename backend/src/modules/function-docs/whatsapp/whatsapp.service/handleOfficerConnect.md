# handleOfficerConnect

## Location
- Source: whatsapp/whatsapp.service.js
- Lines: 536-548

## Signature
```js
handleOfficerConnect(conv, input, language)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Calls external services/integrations during processing.
- Contains scoring/risk business logic for farmer intelligence.

## Parameters
- conv
- input
- language

## Implementation Snapshot
```js
async function handleOfficerConnect(conv, input, language) {
  // Log officer contact request
  await pool.query(
    `INSERT INTO alerts (id, farmer_id, message, reason, risk_level, status)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [uuidv4(), conv.farmer_id, 'Officer callback requested via WhatsApp', 
     'Farmer requested officer callback', 'high', 'pending']
  )
  return {
    message: getOfficerConfirmation(language),
    nextStage: 'done'
  }
}
```
