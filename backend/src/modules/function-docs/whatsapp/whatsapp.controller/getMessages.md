# getMessages

## Location
- Source: whatsapp/whatsapp.controller.js
- Lines: 143-164

## Signature
```js
getMessages(req, res, next)
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
async function getMessages(req, res, next) {
  try {
    const { conversationId } = req.params

    if (!conversationId) {
      return res.status(400).json(errorResponse('BAD_REQUEST', 'Conversation ID is required'))
    }

    const result = await pool.query(
      `SELECT wm.id, wm.direction, wm.body, wm.status,
              wm.created_at, wm.twilio_sid
       FROM whatsapp_messages wm
       WHERE wm.conversation_id = $1 
       ORDER BY wm.created_at ASC`,
      [conversationId]
    )

    res.json(successResponse(result.rows, 'Messages retrieved'))
  } catch (err) {
    next(err)
  }
}
```
