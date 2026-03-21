# handlePmKisanFlow

## Location
- Source: whatsapp/whatsapp.service.js
- Lines: 481-483

## Signature
```js
handlePmKisanFlow(conv, input, language)
```

## How It Works (Actual Flow)
- Implements module-specific business logic and returns computed result.

## Parameters
- conv
- input
- language

## Implementation Snapshot
```js
async function handlePmKisanFlow(conv, input, language) {
  return { message: getMenuMessage(language), nextStage: 'menu' }
}
```
