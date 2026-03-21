# handleInboundMessage

## Location
- Source: whatsapp/whatsapp.service.js
- Lines: 165-242

## Signature
```js
handleInboundMessage(fromPhone, body)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Calls external services/integrations during processing.
- Contains scoring/risk business logic for farmer intelligence.

## Parameters
- fromPhone
- body

## Implementation Snapshot
```js
async function handleInboundMessage(fromPhone, body) {
  try {
    // Strip whatsapp: prefix and normalize to E.164 format
    const cleanPhone = normalizePhoneNumber(fromPhone.replace('whatsapp:', ''))
    logger.info('WhatsApp inbound message', { from: cleanPhone, body: body.substring(0, 50), action: 'whatsapp.inbound' })

    // Find active conversation for this phone
    const convResult = await pool.query(
      `SELECT wc.*,
              f.name AS farmer_name,
              f.language AS preferred_language,
              f.district,
              (
                SELECT c.name
                FROM farmer_crops fc
                JOIN crops c ON c.id = fc.crop_id
                WHERE fc.farmer_id = f.id
                ORDER BY fc.created_at DESC
                LIMIT 1
              ) AS primary_crop,
              NULL::integer AS vulnerability_score,
              NULL::boolean AS has_crop_insurance,
              NULL::timestamp AS insurance_expiry_date,
              NULL::text AS loan_type,
              NULL::timestamp AS loan_due_date,
              NULL::boolean AS pm_kisan_enrolled
       FROM whatsapp_conversations wc
       JOIN farmers f ON f.id = wc.farmer_id
       WHERE wc.phone_number = $1
         AND wc.is_active = true
```
