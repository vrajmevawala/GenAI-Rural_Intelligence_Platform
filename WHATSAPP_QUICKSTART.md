# WhatsApp Integration - Quick Start (5 Minute Setup)

## Prerequisites
- Twilio account (sign up free at https://twilio.com)
- ngrok installed globally: `npm install -g ngrok@latest`
- KhedutMitra backend + frontend running

## Quick Setup

### Step 1: Get Twilio Credentials (2 min)

```
1. Go to https://console.twilio.com
2. Copy "Account SID" (starts with AC)
3. Copy "Auth Token"
4. Go to Messaging > Try it out > WhatsApp
5. Note sandbox number (e.g., +14155238886)
```

### Step 2: Update .env (1 min)

```bash
# backend/.env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_token_here
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
NGROK_URL=https://xxxx.ngrok.io  # Update after step 3
```

### Step 3: Start ngrok (1 min)

```bash
# Terminal 1
ngrok http 3000

# Copy the https:// URL shown
# Update NGROK_URL in .env with this
```

### Step 4: Update Twilio Webhook (1 min)

```
1. Twilio Console > Messaging > WhatsApp > Sandbox Settings
2. Find "When a message comes in"
3. Set to: https://your-ngrok-url/api/whatsapp/webhook
4. Save
```

## Register Test Phone

From a phone (your mobile):
1. Open WhatsApp
2. Send to: **+14155238886**
3. Message: `join coastal-jump` (code may vary)
4. Twilio replies with confirmation
5. Done! Now ready to receive messages

## Send Test Message

### Via API:
```bash
curl -X POST http://localhost:3000/api/whatsapp/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"testPhone": "+919876543210"}'
```

### Via Dashboard (When farmer page has button):
1. Go to farmer detail page
2. Click "Send WhatsApp"
3. Select language
4. Check your test phone!

## What You'll See

**On test phone:**
```
Hi [Farmer Name]!

This is KhedutMitra. You have 3 important 
updates about crop insurance, PM-KISAN, 
and weather.

Reply 1 to see updates.
```

Then bot responds to each reply with relevant info.

## Troubleshooting

- **"Webhook not called"** → Check ngrok is running and URL is correct in Twilio
- **"Message not sent"** → Check phone is registered (sent "join" message)
- **"Invalid signature"** → Verify `TWILIO_AUTH_TOKEN` is exact

## Done!

You now have:
- ✅ Real WhatsApp messages going to farmer phones
- ✅ Bot conversations with menu and options
- ✅ Multi-language support (Gujarati, Hindi, English)
- ✅ Message audit trail in database
- ✅ 24-hour session windows

## Next: Hook into Dashboard

To add "Send WhatsApp" button to farmer page:

```jsx
import { useSendWhatsAppAlert } from '@/hooks/useWhatsApp'

const sendWhatsApp = useSendWhatsAppAlert()

<button onClick={() => sendWhatsApp.mutate({ 
  farmerId: farmer.id, 
  language: 'gu' 
})}>
  Send WhatsApp Alert
</button>
```

See `frontend/src/hooks/useWhatsApp.js` for full hook implementation.

---

**Need help?** See `backend/WHATSAPP_SETUP.md` for detailed guide.
