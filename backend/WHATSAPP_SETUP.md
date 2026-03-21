# KhedutMitra WhatsApp Integration Setup Guide

This guide walks through integrating real Twilio WhatsApp messaging into the KhedutMitra backend and frontend.

## Overview

The integration enables:
- ✅ Bank officers send WhatsApp alerts to farmers directly from the dashboard
- ✅ Multi-language bot conversation (Gujarati, Hindi, English, Hinglish)
- ✅ Real farmer replies received and processed via Twilio webhook
- ✅ Conversation history and message audit trail in PostgreSQL
- ✅ Two-way interaction through WhatsApp bot state machine

## Prerequisites

1. **Twilio Account** (free trial at https://www.twilio.com/console)
2. **Node.js 20+** (already have)
3. **PostgreSQL** (already have)
4. **ngrok** for local webhook testing: `npm install -g ngrok@latest`

## Step 1: Install Dependencies

```bash
cd backend
npm install
npm install twilio  # Add Twilio SDK
```

## Step 2: Get Twilio Credentials

1. Go to https://console.twilio.com/
2. Copy **Account SID** and **Auth Token** from dashboard
3. Navigate to **Messaging** → **Try it out** → **WhatsApp**
4. Note the Sandbox number (e.g., `+14155238886`)

Your .env should have:
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

## Step 3: Create Database Tables

Run the migration to create WhatsApp conversation and message tables:

```bash
# Using psql:
psql $DATABASE_URL -f src/db/migrations/002_whatsapp.sql

# Or using the migrate script:
npm run migrate
```

This creates:
- `whatsapp_conversations` - conversation sessions
- `whatsapp_messages` - message audit log
- Related indexes for performance

## Step 4: Register Test Farmers' Phone Numbers

Send the Twilio Sandbox code to test phone numbers:
- **From phone:** Twilio WhatsApp number (e.g., `+14155238886`)
- **Message:** `join code-word` (code gets provided in Twilio Console under WhatsApp Sandbox Settings)
- **Example:** `join coastal-jump`

Once farmers/test numbers reply, they're registered and can receive bot messages.

## Step 5: Setup ngrok for Webhook Callback (Local Dev)

Twilio needs a public URL to send webhooks. For local dev, use ngrok:

```bash
# Terminal 1: Start ngrok
ngrok http 3000

# Copy the https URL shown (e.g., https://xxxx.ngrok.io)
```

Add to `.env`:
```env
NGROK_URL=https://xxxx.ngrok.io
```

## Step 6: Configure Twilio Webhook

1. Go to https://console.twilio.com/ → **Messaging** → **Try it out** → **WhatsApp** → **Sandbox Settings**
2. Find **"When a message comes in"** field
3. Set to: `https://xxxx.ngrok.io/api/whatsapp/webhook`
4. Save

Twilio will now send all farmer replies to your webhook.

## Step 7: Start the Backend

```bash
cd backend
npm run dev
```

You should see:
```
[nodemon] starting `node server.js`
KhedutMitra backend started { port: 3000 }
```

## Step 8: Test the Integration

### Option A: Using API directly

```bash
# Test endpoint (admin only)
curl -X POST http://localhost:3000/api/whatsapp/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"testPhone": "+919876543210"}'
```

### Option B: Using Frontend Dashboard

Coming soon - WhatsApp button in FarmerDetailPage

## Farmer Side: How the Bot Works

When a farmer receives a WhatsApp message from KhedutMitra:

1. **Welcome Stage**: Bank officer message with farmer's name and pending alerts
2. **Menu Stage**: Numbered options (1. Insurance, 2. PM-KISAN, 3. Weather, 4. Officers, etc.)
3. **Alert Flow**: Farmer selects topic → gets specific info about that alert
4. **Officer Connect**: Farmer can request callback from field officer
5. **Session Ends**: After max 24 hours or farmer selection

All messages are saved to `whatsapp_messages` table for audit.

## Farmer Phone Format

Farmers' phone numbers in the database must be in **E.164 format**:
- ✅ Correct: `+919876543210`
- ❌ Wrong: `919876543210` (missing +)
- ❌ Wrong: `9876543210` (missing country code)

## Message Limitations (Twilio Sandbox)

1. **50 messages/day** in free tier
2. **Only registering phones** can receive messages (sandbox restriction)
3. **24-hour conversation window** - farmer can reply for 24h after receiving a message
4. **No template restrictions** in sandbox (we get free-text mode after farmer initiates session)
5. Twilio logo shown to farmer instead of KhedutMitra branding

For production, you'll need Meta Business verification and upgrade to official WhatsApp Business account.

## Troubleshooting

### "Invalid Twilio signature" error
- Ensure `TWILIO_AUTH_TOKEN` is correct
- Ensure webhook URL in Twilio console matches `NGROK_URL` + `/api/whatsapp/webhook`
- In dev mode, Twilio validation is skipped if `NODE_ENV !== 'production'`

### Messages not being delivered
- Check farmer phone is registered (send "join code" to sandbox number)
- Verify phone is in E.164 format in database
- Check Twilio account trial credits (50/day limit)
- Look at Twilio Console → Message Logs for delivery status

### Webhook not being called
- Ensure ngrok is running and URL is updated in Twilio console  
- Check ngrok terminal shows POST requests coming in
- Backend logs should show "Webhook received" if it's hitting the endpoint

### Claude message generation fails
- Check `ANTHROPIC_API_KEY` is set and valid
- Fallback messages will be used if Claude fails

## Environment Variables Checklist

- [ ] `TWILIO_ACCOUNT_SID` - from Twilio console
- [ ] `TWILIO_AUTH_TOKEN` - from Twilio console
- [ ] `TWILIO_WHATSAPP_FROM` - sandbox number or your business number
- [ ] `NGROK_URL` - https URL from ngrok
- [ ] `DATABASE_URL` - PostgreSQL connection
- [ ] `JWT_SECRET` - min 32 chars
- [ ] `ANTHROPIC_API_KEY` - for Claude
- [ ] `NODE_ENV=development`

## API Endpoints

### Send WhatsApp Alert (Protected)
```
POST /api/whatsapp/send/:farmerId
{
  "language": "gu"  // or "hi", "en", "hinglish"
}

Response:
{
  "success": true,
  "data": {
    "conversationId": "uuid",
    "messageSid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "alertsSent": 3
  }
}
```

### Webhook (No Auth - Twilio calls this)
```
POST /api/whatsapp/webhook
(Twilio sends farmer replies here automatically)
```

### Get Conversations (Protected)
```
GET /api/whatsapp/conversations/:farmerId

Response: Array of conversations with message counts
```

### Get Messages (Protected)
```
GET /api/whatsapp/messages/:conversationId

Response: Array of messages with timestamps and direction
```

### Test Integration (Admin Only)
```
POST /api/whatsapp/test
{
  "testPhone": "+919876543210"
}
```

## Frontend Integration

See `src/api/whatsapp.api.js` and `src/hooks/useWhatsApp.js` for React integration examples.

Example usage in FarmerDetailPage:
```jsx
import { useSendWhatsAppAlert } from '@/hooks/useWhatsApp'

const sendWhatsApp = useSendWhatsAppAlert()

<button onClick={() => sendWhatsApp.mutate({ 
  farmerId: farmer.id, 
  language: 'gu' 
})}>
  Send WhatsApp
</button>
```

## Production Deployment

When moving to production:

1. **Upgrade to WhatsApp Business Account** (requires Meta verification)
2. **Set `NODE_ENV=production`** - enables Twilio signature validation
3. **Use real WhatsApp Business number** instead of sandbox
4. **Update NGROK_URL to your actual domain**
5. **Implement SMS backup** for failed WhatsApp delivery
6. **Monitor message delivery rates** in Twilio dashboard
7. **Implement fallback to SMS** if WhatsApp fails

## Support & Documentation

- **Twilio Docs:** https://www.twilio.com/docs/whatsapp
- **Twilio Node SDK:** https://www.twilio.com/docs/libraries/node
- **Webhook Security:** https://www.twilio.com/docs/tutorials/webhooks
