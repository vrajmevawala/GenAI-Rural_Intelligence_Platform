# handleSchemeFlow

## Location
- Source: whatsapp/whatsapp.service.js
- Lines: 489-491

## Signature
```js
handleSchemeFlow(conv, input, language)
```

## How It Works (Actual Flow)
- Implements module-specific business logic and returns computed result.

## Parameters
- conv
- input
- language

## Implementation Snapshot
```js
async function handleSchemeFlow(conv, input, language) {
  return { message: getMenuMessage(language), nextStage: 'menu' }
}
```
