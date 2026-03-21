# updateStage

## Location
- Source: whatsapp/whatsapp.service.js
- Lines: 92-102

## Signature
```js
updateStage(conversationId, newStage, contextUpdate = {})
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Calls external services/integrations during processing.

## Parameters
- conversationId
- newStage
- contextUpdate = {}

## Implementation Snapshot
```js
async function updateStage(conversationId, newStage, contextUpdate = {}) {
  await pool.query(
    `UPDATE whatsapp_conversations 
     SET current_stage = $1, 
         context = context || $2::jsonb,
         updated_at = NOW(),
         session_expires_at = NOW() + INTERVAL '24 hours'
     WHERE id = $3`,
    [newStage, JSON.stringify(contextUpdate), conversationId]
  )
}
```
