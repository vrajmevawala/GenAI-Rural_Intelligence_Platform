# generateWelcomeMessage

## Location
- Source: whatsapp/whatsapp.service.js
- Lines: 248-303

## Signature
```js
generateWelcomeMessage(farmer, alerts, language)
```

## How It Works (Actual Flow)
- Transforms result sets before returning data to caller/UI.

## Parameters
- farmer
- alerts
- language

## Implementation Snapshot
```js
async function generateWelcomeMessage(farmer, alerts, language) {
  try {
    // Try dynamic generation using Grok
    const alertContext = alerts.slice(0, 3)
      .map((a, i) => `${i + 1}. ${a.message || a.reason}`)
      .join('\n');

    const systemPrompt = language === 'gu'
      ? `You are KhedutMitra, a warm and helpful Gujarati-speaking agricultural advisor. Generate a brief, friendly welcome message for a farmer. Keep it under 120 characters. Mention you have important updates. NO MARKDOWN OR EMOJIS.`
      : `You are KhedutMitra, a helpful agricultural advisor. Generate a warm welcome in ${language}. Keep under 120 chars. NO MARKDOWN.`;

    const userPrompt = `Welcome message for farmer ${farmer.name}. Crop: ${farmer.primary_crop}. District: ${farmer.district}. They have ${alerts.length} alerts. Be warm and personalized.`;

    const grokResponse = await callGrok(systemPrompt, userPrompt, 200);

    if (grokResponse) {
      let msg = grokResponse;
      if (alerts.length > 0) {
        if (language === 'gu') {
          msg += `\n\n📋 તમારા અલર્ટ્સ:\n${alertContext}`;
        } else {
          msg += `\n\nYour Alerts:\n${alertContext}`;
        }
      }
      if (language === 'gu') {
        msg += '\n\nકૃપા કરીને 1 લખીને સેવા મેનુ જુઓ.';
      } else {
        msg += '\n\nReply 1 for menu.';
      }
      return msg;
```
