# handleMainMenu

## Location
- Source: whatsapp/whatsapp.service.js
- Lines: 365-368

## Signature
```js
handleMainMenu(conv, input, language)
```

## How It Works (Actual Flow)
- Implements module-specific business logic and returns computed result.

## Parameters
- conv
- input
- language

## Implementation Snapshot
```js
async function handleMainMenu(conv, input, language) {
  const menuMessage = await generateMenuMessage(conv, language)
  return { message: menuMessage, nextStage: 'menu' }
}
```
