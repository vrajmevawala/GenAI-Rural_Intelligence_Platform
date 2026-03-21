# initiateBot

## Location
- Source: whatsapp/whatsapp.service.js
- Lines: 108-160

## Signature
```js
initiateBot(farmerId, organizationId, language = 'gu')
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Validates state and throws typed errors for failure cases.
- Calls external services/integrations during processing.
- Transforms result sets before returning data to caller/UI.

## Parameters
- farmerId
- organizationId
- language = 'gu'

## Implementation Snapshot
```js
async function initiateBot(farmerId, organizationId, language = 'gu') {
  const supportedLanguages = new Set(['gu', 'hi', 'en', 'hinglish'])
  const selectedLanguage = supportedLanguages.has(language) ? language : 'gu'

  // 1. Get farmer details from DB
  const farmerResult = await pool.query(
    `SELECT f.*, 
            (SELECT COUNT(*) FROM alerts a 
             WHERE a.farmer_id = f.id AND a.status = 'pending') as pending_alerts_count
     FROM farmers f 
     WHERE f.id = $1`,
    [farmerId]
  )
  const farmer = farmerResult.rows[0]
  if (!farmer) throw new AppError('Farmer not found', 404, 'FARMER_NOT_FOUND')
  if (!farmer.phone) throw new AppError('Farmer has no phone number', 400, 'NO_PHONE_NUMBER')

  // 2. Get pending alerts for this farmer
  const alertsResult = await pool.query(
    `SELECT * FROM alerts 
     WHERE farmer_id = $1 AND status = 'pending' 
     ORDER BY created_at DESC LIMIT 5`,
    [farmerId]
  )
  const alerts = alertsResult.rows

  // 3. Get or create conversation
  const conv = await getOrCreateConversation(farmerId, organizationId, farmer.phone, selectedLanguage)

  // 4. Build welcome message via Claude
```
