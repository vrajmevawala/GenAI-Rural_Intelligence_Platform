# getOrCreateConversation

## Location
- Source: whatsapp/whatsapp.service.js
- Lines: 56-76

## Signature
```js
getOrCreateConversation(farmerId, organizationId, phone, language = 'gu')
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Calls external services/integrations during processing.

## Parameters
- farmerId
- organizationId
- phone
- language = 'gu'

## Implementation Snapshot
```js
async function getOrCreateConversation(farmerId, organizationId, phone, language = 'gu') {
  // Check for existing active non-expired session
  const existing = await pool.query(
    `SELECT * FROM whatsapp_conversations 
     WHERE farmer_id = $1 AND organization_id = $2 AND is_active = true 
     AND session_expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [farmerId, organizationId]
  )
  if (existing.rows.length > 0) return existing.rows[0]

  // Create new conversation session
  const result = await pool.query(
    `INSERT INTO whatsapp_conversations 
     (id, farmer_id, organization_id, phone_number, language, current_stage)
     VALUES ($1, $2, $3, $4, $5, 'welcome')
     RETURNING *`,
    [uuidv4(), farmerId, organizationId, phone, language]
  )
  return result.rows[0]
}
```
