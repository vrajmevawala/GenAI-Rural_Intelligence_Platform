# KhedutMitra WhatsApp Integration - Implementation Complete ✓

## What Has Been Implemented

### Backend (Node.js + Express + PostgreSQL)

1. **✓ New WhatsApp Module** (`src/modules/whatsapp/`)
   - `whatsapp.service.js` - Core logic for sending/receiving messages, bot flow
   - `whatsapp.controller.js` - Request handlers and webhook management
   - `whatsapp.routes.js` - Express routes (protected + webhook endpoint)

2. **✓ Database Migration** (`src/db/migrations/002_whatsapp.sql`)
   - `whatsapp_conversations` table - Bot conversation sessions
   - `whatsapp_messages` table - Message audit log
   - Custom types: `bot_stage`, `bot_language`
   - Indexes for fast lookups

3. **✓ App Configuration** (`src/app.js`)
   - WhatsApp routes mounted at `/api/whatsapp`
   - Ready to receive Twilio webhooks

4. **✓ Dependencies** (`package.json`)
   - `twilio` ^4.19.0 installed via `npm install`

5. **✓ Environment Variables** (`.env`)
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_WHATSAPP_FROM`
   - `NGROK_URL` (for local webhook testing)

### Frontend (React + Vite + React Query)

1. **✓ WhatsApp API Client** (`src/api/whatsapp.api.js`)
   - `sendWhatsAppAlert()` - Send bot to farmer
   - `getWhatsAppConversations()` - Fetch history
   - `getWhatsAppMessages()` - Fetch message thread
   - `testWhatsAppIntegration()` - Test endpoint

2. **✓ Custom Hooks** (`src/hooks/useWhatsApp.js`)
   - `useSendWhatsAppAlert()` - Send with loading states
   - `useWhatsAppConversations()` - Auto-fetch conversations
   - `useWhatsAppMessages()` - Auto-fetch messages
   - `useTestWhatsApp()` - Test integration

### Documentation

**✓ Setup Guide** (`backend/WHATSAPP_SETUP.md`)
- How to get Twilio credentials
- ngrok setup for local webhook testing
- Database migration steps
- Testing procedures
- Production deployment checklist

---

## Next Steps to Go Live

### 1. Get Twilio Credentials (5 minutes)

```
1. Go to https://www.twilio.com/console
2. Sign up for free account (trial = 50 messages/day)
3. Copy Account SID from dashboard
4. Copy Auth Token 
5. Navigate to Messaging > Try it out > WhatsApp
6. Note the sandbox number (e.g., +14155238886)
```

### 2. Update .env File

Replace placeholders in `backend/.env`:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_from_console
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
NGROK_URL=https://xxxx.ngrok.io  # Add this after step 3
```

### 3. Setup ngrok for Webhook Testing (5 minutes)

```bash
# Install globally
npm install -g ngrok@latest

# Terminal 1: Start ngrok
ngrok http 3000

# Copy the https URL (e.g., https://xxxx.ngrok.io)
# Use this as NGROK_URL in .env
```

### 4. Register Demo Phone Numbers (2 minutes)

1. Get 2-3 test phone numbers (your phone, colleague's)
2. From those phones, send WhatsApp message to Twilio sandbox:
   - **To:** +14155238886
   - **Message:** `join coastal-jump` (code varies by account)
3. Twilio will reply confirming they're registered
4. Now those numbers can receive bot messages!

### 5. Configure Twilio Webhook (3 minutes)

1. Dashboard: Messaging > Try it out > WhatsApp > Sandbox Settings
2. Find **"When a message comes in"** field
3. Set to: `https://xxxx.ngrok.io/api/whatsapp/webhook`
4. Save

### 6. Start Backend & Frontend

```bash
# Terminal A: Backend
cd backend
npm run dev

# Terminal B: Frontend (new terminal)
cd frontend
npm run dev
```

### 7. Test the Integration

**Option A: Via API**
```bash
curl -X POST http://localhost:3000/api/whatsapp/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"testPhone": "+919876543210"}'
```

**Option B: Via Dashboard (Coming Soon)**
- Navigate to a farmer in FarmerDetailPage
- Click "Send WhatsApp" button
- Select language (Gujarati/Hindi/English)
- Farmer receives bot message on real phone!

---

## Bot Flow (What Farmers Experience)

```
1️⃣ Welcome Message
   "Hi John! This is KhedutMitra. You have 3 pending alerts about crop insurance, 
    PM-KISAN, and weather. Reply 1 to see updates."

2️⃣ Menu
   "What do you need help with? Type a number:
    1. Crop insurance
    2. PM-KISAN
    3. Weather info
    4. Talk to officer"

3️⃣ Details
   (Farmer selects → Specific info about that topic)

4️⃣ Follow-up
   (Multi-language support, can ask officer to call back)

5️⃣ Session Ends
   (After 24 hours or farmer says 'done')
```

All messages logged in `whatsapp_messages` table for audit trail.

---

## API Endpoints Available

### Send Alert to Farmer *(Protected - Officer Role)*
```
POST /api/whatsapp/send/:farmerId
Body: { "language": "gu" }

Response: { conversationId, messageSid, alertsSent }
```

### Webhook *(No Auth - Twilio calls)*
```
POST /api/whatsapp/webhook
(Farmer replies automatically processed here)
```

### Get Conversations *(Protected)*
```
GET /api/whatsapp/conversations/:farmerId

Response: [ { id, phone_number, language, message_count, last_message_at }, ... ]
```

### Get Messages *(Protected)*
```
GET /api/whatsapp/messages/:conversationId

Response: [ { id, direction, body, created_at }, ... ]
```

### Test Twilio *(Admin Only)*
```
POST /api/whatsapp/test
Body: { "testPhone": "+919876543210" }

Response: { messageSid, testPhone }
```

---

## Important Notes

### Farmer Phone Numbers
Must be in **E.164 format** in database:
- ✅ `+919876543210` (correct)
- ❌ `919876543210` (missing +)
- ❌ `9876543210` (missing country code)

### Twilio Sandbox Limitations
- **50 messages/day** (free trial)
- **Only registered phones** receive messages
- **24-hour replies** policy
- Twilio logo shown (not KhedutMitra branding)

### For Production
- Upgrade to **WhatsApp Business Account** (requires Meta verification)
- Get official WhatsApp number (not sandbox)
- Webhook validation enabled automatically (`NODE_ENV=production`)
- No daily message limits (custom pricing)

---

## Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| 404 on `/api/whatsapp/send` | Ensure routes mounted in `app.js` |
| "Invalid Twilio signature" | Check `TWILIO_AUTH_TOKEN` is correct |
| Webhook not called | Verify ngrok URL matches Twilio console |
| Message not delivered | Check phone registered to sandbox, format is E.164 |
| Claude message fails | Falls back to pre-written message. Check `ANTHROPIC_API_KEY` |

---

## File Structure Summary

```
backend/
├── src/
│   ├── modules/whatsapp/
│   │   ├── whatsapp.service.js       (Twilio API + bot logic)
│   │   ├── whatsapp.controller.js    (Request handlers)
│   │   └── whatsapp.routes.js        (Express routes)
│   ├── db/migrations/
│   │   └── 002_whatsapp.sql          (DB tables)
│   └── app.js                        (UPDATED - routes mounted)
├── .env                              (UPDATED - Twilio vars)
├── package.json                      (UPDATED - twilio added)
└── WHATSAPP_SETUP.md                (Detailed setup guide)

frontend/
├── src/
│   ├── api/
│   │   └── whatsapp.api.js          (API client)
│   └── hooks/
│       └── useWhatsApp.js           (React hooks)
```

---

## Database Schema

```sql
-- Conversation session (24-hour duration)
whatsapp_conversations {
  id: UUID,
  farmer_id: UUID,
  phone_number: E.164,
  language: 'gu' | 'hi' | 'en' | 'hinglish',
  current_stage: bot_stage enum,
  context: JSON (alert types, etc),
  is_active: boolean,
  session_expires_at: TIMESTAMP,
}

-- Message audit trail
whatsapp_messages {
  id: UUID,
  conversation_id: UUID,
  direction: 'inbound' | 'outbound',
  body: TEXT,
  twilio_sid: VARCHAR,
  created_at: TIMESTAMP,
}
```

---

## Support Resources

- **Twilio Docs:** https://www.twilio.com/docs/whatsapp
- **Node SDK:** https://www.twilio.com/docs/libraries/node
- **Webhook Security:** https://www.twilio.com/docs/tutorials/webhooks
- **KhedutMitra Setup:** See `backend/WHATSAPP_SETUP.md`

---

## Summary

✅ Backend module: Complete (service, controller, routes)
✅ Frontend integration: Complete (API client, hooks)
✅ Database: Tables created with migration
✅ Documentation: Comprehensive setup guide provided
✅ Dependencies: Twilio SDK installed

**You're ready to:**
1. Get Twilio credentials
2. Register test phones
3. Setup ngrok for webhooks
4. Send real WhatsApp messages to farmers
5. Receive & process their replies

**Demo-ready:** 2-3 test phones + Twilio credentials = live bot in action!
