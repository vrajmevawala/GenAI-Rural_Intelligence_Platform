# formatProfileMessage

## Location
- Source: whatsapp/whatsapp.service.js
- Lines: 509-534

## Signature
```js
formatProfileMessage(farmer, language)
```

## How It Works (Actual Flow)
- Calls external services/integrations during processing.

## Parameters
- farmer
- language

## Implementation Snapshot
```js
async function formatProfileMessage(farmer, language) {
  try {
    const systemPrompt = `You are KhedutMitra. Summarize farmer profile in ${getLanguageName(language)} with clean WhatsApp formatting. Use 5-7 short lines. Plain text only, no markdown symbols.`
    const userPrompt = `Name: ${farmer.name}\nDistrict: ${farmer.district}\nVillage: ${farmer.village || 'N/A'}\nLand: ${farmer.land_size || 'N/A'} acres\nSoil: ${farmer.soil_type || 'N/A'}\nIncome: INR ${farmer.annual_income || 'N/A'}`
    const summary = await callGrok(systemPrompt, userPrompt, 220)
    if (summary && summary.trim()) {
      return summary.trim()
    }
  } catch (err) {
    logger.warn('Dynamic profile summary failed, using fallback', {
      error: err.message,
      action: 'whatsapp.profile.summary.fallback'
    })
  }

  if (language === 'gu') {
    return `આપનું પ્રોફાઇલ\nનામ: ${farmer.name}\nજીલ્લો: ${farmer.district}\nગામ: ${farmer.village || 'N/A'}\nભૂમિ વિસ્તાર: ${farmer.land_size || 'N/A'} એકર\nમાટીનો પ્રકાર: ${farmer.soil_type || 'N/A'}\nવાર્ષિક આવક: ₹${farmer.annual_income || 'N/A'}`
  }
  if (language === 'hi') {
    return `आपकी प्रोफाइल\nनाम: ${farmer.name}\nजिला: ${farmer.district}\nगांव: ${farmer.village || 'N/A'}\nभूमि क्षेत्र: ${farmer.land_size || 'N/A'} एकड़\nमिट्टी का प्रकार: ${farmer.soil_type || 'N/A'}\nवार्षिक आय: ₹${farmer.annual_income || 'N/A'}`
  }
  if (language === 'hinglish') {
    return `Aapki Profile\nNaam: ${farmer.name}\nDistrict: ${farmer.district}\nGaon: ${farmer.village || 'N/A'}\nLand: ${farmer.land_size || 'N/A'} acres\nSoil Type: ${farmer.soil_type || 'N/A'}\nIncome: ₹${farmer.annual_income || 'N/A'}`
  }
  return `Your Profile\nName: ${farmer.name}\nDistrict: ${farmer.district}\nVillage: ${farmer.village || 'N/A'}\nLand: ${farmer.land_size || 'N/A'} acres\nSoil: ${farmer.soil_type || 'N/A'}\nIncome: ₹${farmer.annual_income || 'N/A'}`
}
```
