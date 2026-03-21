# sendMessage

## Location
- Source: whatsapp/whatsapp.service.js
- Lines: 31-51

## Signature
```js
sendMessage(toPhone, body)
```

## How It Works (Actual Flow)
- Validates state and throws typed errors for failure cases.
- Calls external services/integrations during processing.

## Parameters
- toPhone
- body

## Implementation Snapshot
```js
async function sendMessage(toPhone, body) {
  if (!toPhone || !body) {
    throw new AppError('Phone and message body required', 400, 'INVALID_INPUT')
  }

  try {
    const message = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${toPhone}`,
      body,
    })
    return message.sid
  } catch (err) {
    console.error('Twilio sendMessage error:', err)
    throw new AppError(
      `Failed to send WhatsApp message: ${err.message}`,
      500,
      'WHATSAPP_SEND_FAILED'
    )
  }
}
```
