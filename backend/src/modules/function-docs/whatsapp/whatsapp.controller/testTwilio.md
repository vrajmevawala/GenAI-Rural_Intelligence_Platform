# testTwilio

## Location
- Source: whatsapp/whatsapp.controller.js
- Lines: 171-188

## Signature
```js
testTwilio(req, res, next)
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
async function testTwilio(req, res, next) {
  try {
    const testPhone = req.body.testPhone
    if (!testPhone) {
      return res.status(400).json(errorResponse('BAD_REQUEST', 'Test phone number required in format +91XXXXXXXXXX'))
    }

    const testMessage = `Test message from KhedutMitra at ${new Date().toLocaleString()}`
    const sid = await whatsappService.sendMessage(testPhone, testMessage)

    res.json(successResponse(
      { messageSid: sid, testPhone },
      'Test message sent successfully'
    ))
  } catch (err) {
    next(err)
  }
}
```
