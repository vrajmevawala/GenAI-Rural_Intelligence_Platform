# saveMessage

## Location
- Source: whatsapp/whatsapp.service.js
- Lines: 81-87

## Signature
```js
saveMessage(conversationId, direction, body, twilioSid = null)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Calls external services/integrations during processing.

## Parameters
- conversationId
- direction
- body
- twilioSid = null

## Implementation Snapshot
```js
async function saveMessage(conversationId, direction, body, twilioSid = null) {
  await pool.query(
    `INSERT INTO whatsapp_messages (id, conversation_id, direction, body, twilio_sid, status)
     VALUES ($1, $2, $3, $4, $5, 'sent')`,
    [uuidv4(), conversationId, direction, body, twilioSid]
  )
}
```
