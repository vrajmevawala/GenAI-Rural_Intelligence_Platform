# getConversations

## Location
- Source: whatsapp/whatsapp.controller.js
- Lines: 110-136

## Signature
```js
getConversations(req, res, next)
```

## How It Works (Actual Flow)
- Handles HTTP request/response flow in a controller.
- Runs one or more PostgreSQL queries for read/write operations.
- Wraps API output in the platform response envelope.
- Calls external services/integrations during processing.

## Parameters
- req
- res
- next

## Implementation Snapshot
```js
async function getConversations(req, res, next) {
  try {
    const { farmerId } = req.params
    const authenticatedUser = req.user

    if (!farmerId) {
      return res.status(400).json(errorResponse('BAD_REQUEST', 'Farm ID is required'))
    }

    const result = await pool.query(
      `SELECT wc.id, wc.phone_number, wc.language, wc.current_stage,
              wc.is_active, wc.created_at, wc.updated_at,
              COUNT(wm.id) as message_count,
              MAX(wm.created_at) as last_message_at
       FROM whatsapp_conversations wc
       LEFT JOIN whatsapp_messages wm ON wm.conversation_id = wc.id
       WHERE wc.farmer_id = $1 AND wc.organization_id = $2
       GROUP BY wc.id
       ORDER BY wc.created_at DESC`,
      [farmerId, authenticatedUser?.organizationId]
    )

    res.json(successResponse(result.rows, 'Conversations retrieved'))
  } catch (err) {
    next(err)
  }
}
```
