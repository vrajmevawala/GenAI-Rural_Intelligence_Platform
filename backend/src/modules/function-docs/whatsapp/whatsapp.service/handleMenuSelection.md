# handleMenuSelection

## Location
- Source: whatsapp/whatsapp.service.js
- Lines: 403-423

## Signature
```js
handleMenuSelection(conv, input, language)
```

## How It Works (Actual Flow)
- Implements module-specific business logic and returns computed result.

## Parameters
- conv
- input
- language

## Implementation Snapshot
```js
async function handleMenuSelection(conv, input, language) {
  const num = parseInt(input)
  if (isNaN(num) || num < 1 || num > 6) {
    return { message: await generateMenuMessage(conv, language), nextStage: 'menu' }
  }

  const stages = ['insurance_flow', 'pmkisan_flow', 'weather_flow', 'scheme_flow', 'profile_view', 'officer_connect']

  const targetStage = stages[num - 1] || 'menu'

  if (targetStage === 'officer_connect') {
    return await handleOfficerConnect(conv, input, language)
  }

  if (targetStage === 'profile_view') {
    return await handleProfileView(conv, input, language)
  }

  const message = await generateStageIntro(targetStage, conv, language)
  return { message: `${message}\n\n${getMenuFollowup(language)}`, nextStage: 'menu' }
}
```
