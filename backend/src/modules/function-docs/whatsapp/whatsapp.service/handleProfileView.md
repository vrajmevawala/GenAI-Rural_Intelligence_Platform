# handleProfileView

## Location
- Source: whatsapp/whatsapp.service.js
- Lines: 493-507

## Signature
```js
handleProfileView(conv, input, language)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Calls external services/integrations during processing.

## Parameters
- conv
- input
- language

## Implementation Snapshot
```js
async function handleProfileView(conv, input, language) {
  // Fetch farmer profile and display key info
  const farmerRes = await pool.query(
    `SELECT name, phone, soil_type, district, village, land_size, annual_income
     FROM farmers WHERE id = $1`,
    [conv.farmer_id]
  )
  const farmer = farmerRes.rows[0]
  if (!farmer) {
    return { message: getProfileNotFoundMsg(language), nextStage: 'menu' }
  }

  const profileMsg = await formatProfileMessage(farmer, language)
  return { message: `${profileMsg}\n\n${getMenuFollowup(language)}`, nextStage: 'menu' }
}
```
