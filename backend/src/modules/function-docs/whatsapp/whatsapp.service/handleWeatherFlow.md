# handleWeatherFlow

## Location
- Source: whatsapp/whatsapp.service.js
- Lines: 485-487

## Signature
```js
handleWeatherFlow(conv, input, language)
```

## How It Works (Actual Flow)
- Implements module-specific business logic and returns computed result.

## Parameters
- conv
- input
- language

## Implementation Snapshot
```js
async function handleWeatherFlow(conv, input, language) {
  return { message: getMenuMessage(language), nextStage: 'menu' }
}
```
