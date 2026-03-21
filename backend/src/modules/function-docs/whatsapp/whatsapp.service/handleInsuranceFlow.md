# handleInsuranceFlow

## Location
- Source: whatsapp/whatsapp.service.js
- Lines: 474-479

## Signature
```js
handleInsuranceFlow(conv, input, language)
```

## How It Works (Actual Flow)
- Implements module-specific business logic and returns computed result.

## Parameters
- conv
- input
- language

## Implementation Snapshot
```js
async function handleInsuranceFlow(conv, input, language) {
  return {
    message: getMenuMessage(language),
    nextStage: 'menu'
  }
}
```
