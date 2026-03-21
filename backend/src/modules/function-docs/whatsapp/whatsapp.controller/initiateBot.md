# initiateBot

## Location
- Source: whatsapp/whatsapp.controller.js
- Lines: 13-43

## Signature
```js
initiateBot(req, res, next)
```

## How It Works (Actual Flow)
- Handles HTTP request/response flow in a controller.
- Wraps API output in the platform response envelope.
- Calls external services/integrations during processing.

## Parameters
- req
- res
- next

## Implementation Snapshot
```js
async function initiateBot(req, res, next) {
  try {
    const { farmerId } = req.params
    const { language = 'gu' } = req.body
    const authenticatedUser = req.user

    // Verify request has required fields
    if (!farmerId) {
      return res.status(400).json(errorResponse('BAD_REQUEST', 'Farm ID is required'))
    }

    info('WhatsApp bot initiation', {
      farmerId,
      initiatedBy: authenticatedUser?.userId,
      language,
      organizationId: authenticatedUser?.institutionId,
      action: 'whatsapp.initiate'
    })

    const result = await whatsappService.initiateBot(
      farmerId,
      authenticatedUser?.institutionId,
      language
    )

    res.json(successResponse(result, 'WhatsApp message sent successfully'))
  } catch (err) {
    logError('WhatsApp initiation failed', err)
    next(err)
  }
```
