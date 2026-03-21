# handleWebhook

## Location
- Source: whatsapp/whatsapp.controller.js
- Lines: 51-103

## Signature
```js
handleWebhook(req, res, next)
```

## How It Works (Actual Flow)
- Handles HTTP request/response flow in a controller.
- Performs authentication/security-related processing.
- Calls external services/integrations during processing.

## Parameters
- req
- res
- next

## Implementation Snapshot
```js
async function handleWebhook(req, res, next) {
  try {
    // Validate Twilio signature in production
    if (process.env.NODE_ENV === 'production') {
      const twilioSignature = req.headers['x-twilio-signature']
      const url = `${process.env.NGROK_URL}/api/whatsapp/webhook`
      const isValid = twilio.validateRequest(
        process.env.TWILIO_AUTH_TOKEN,
        twilioSignature,
        url,
        req.body
      )
      if (!isValid) {
        logError('Invalid Twilio signature', { headers: req.headers })
        res.set('Content-Type', 'text/xml')
        return res.send('<Response></Response>')
      }
    }

    const fromPhone = req.body.From // e.g. "whatsapp:+919876543210"
    const body = req.body.Body // farmer's reply text
    const messageSid = req.body.MessageSid // Twilio message ID
    const messageStatus = req.body.MessageStatus // 'sent', 'delivered', 'read', etc.

    info('Webhook received', {
      from: fromPhone,
      messageSid,
      status: messageStatus,
      action: 'whatsapp.webhook'
    })
```
