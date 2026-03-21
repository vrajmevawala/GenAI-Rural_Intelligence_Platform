# generateDynamicMenuHeader

## Location
- Source: whatsapp/whatsapp.service.js
- Lines: 385-401

## Signature
```js
generateDynamicMenuHeader(conv, language)
```

## How It Works (Actual Flow)
- Calls external services/integrations during processing.

## Parameters
- conv
- language

## Implementation Snapshot
```js
async function generateDynamicMenuHeader(conv, language) {
  const fallback = getMenuHeader(language)

  try {
    const systemPrompt = `You are KhedutMitra. Write one short WhatsApp menu header in ${getLanguageName(language)} for a farmer. Keep it under 90 characters. Friendly, clear, and action-oriented. Plain text only.`
    const userPrompt = `Farmer name: ${conv.farmer_name || 'Farmer'}. Crop: ${conv.primary_crop || 'N/A'}. District: ${conv.district || 'N/A'}. Ask them to choose one service by number.`
    const text = await callGrok(systemPrompt, userPrompt, 120)
    if (text && text.trim()) return text.trim()
  } catch (err) {
    logger.warn('Dynamic menu header failed, using fallback', {
      error: err.message,
      action: 'whatsapp.menu.header.fallback'
    })
  }

  return fallback
}
```
