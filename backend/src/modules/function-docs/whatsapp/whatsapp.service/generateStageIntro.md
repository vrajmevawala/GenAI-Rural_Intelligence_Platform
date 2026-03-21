# generateStageIntro

## Location
- Source: whatsapp/whatsapp.service.js
- Lines: 425-472

## Signature
```js
generateStageIntro(stage, conv, language)
```

## How It Works (Actual Flow)
- Implements module-specific business logic and returns computed result.

## Parameters
- stage
- conv
- language

## Implementation Snapshot
```js
async function generateStageIntro(stage, conv, language) {
  try {
    // Try dynamic generation with Grok based on stage and farmer context
    const stageDescriptions = {
      insurance_flow: 'crop insurance (PMFBY) information and how to apply',
      pmkisan_flow: 'PM-KISAN scheme benefits and how to enroll',
      weather_flow: 'weather forecast and farming recommendations',
      scheme_flow: 'government schemes and loans available for farmers'
    };

    const systemPrompt = language === 'gu'
      ? `You are KhedutMitra, a Gujarati-speaking agricultural advisor. Generate helpful, specific advice about ${stageDescriptions[stage] || stage} for a farmer. Keep it under 150 chars. Be practical and actionable. NO MARKDOWN.`
      : `Generate helpful advice about ${stageDescriptions[stage] || stage} in ${language}. Keep under 150 chars. Be practical and specific. NO MARKDOWN.`;

    const userPrompt = `Farmer grows ${conv.primary_crop || 'crops'}, in ${conv.district || 'rural area'}. Provide specific ${stageDescriptions[stage] || 'advice'} for their situation.`;

    const grokResponse = await callGrok(systemPrompt, userPrompt, 250);
    if (grokResponse) return grokResponse;
  } catch (err) {
    logger.warn('Grok stage intro failed', { stage, error: err.message });
  }

  // Fallback to fixed templates
  if (language === 'gu') {
    if (stage === 'insurance_flow') {
      return `વીમા સેવા (PMFBY):\n• પ્રીમિયમ: રૂ. 680+\n• જરૂર: આધાર, 7/12, બેંક\n• આવેદન કરો શાખા/CSC.`;
    }
    if (stage === 'pmkisan_flow') {
      return `PM-KISAN:\n• રૂ. 2000 હપ્તો\n• eKYC બેંક ચકાસો\n• હેલ્પલાઇન: 155261.`;
    }
```
