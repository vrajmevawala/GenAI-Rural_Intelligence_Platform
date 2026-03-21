# generateMenuMessage

## Location
- Source: whatsapp/whatsapp.service.js
- Lines: 370-383

## Signature
```js
generateMenuMessage(conv, language)
```

## How It Works (Actual Flow)
- Transforms result sets before returning data to caller/UI.

## Parameters
- conv
- language

## Implementation Snapshot
```js
async function generateMenuMessage(conv, language) {
  const options = [
    getMenuOption('insurance', language),
    getMenuOption('pmkisan', language),
    getMenuOption('weather', language),
    getMenuOption('scheme', language),
    getMenuOption('profile', language),
    getMenuOption('officer', language)
  ]

  const numbered = options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')
  const header = await generateDynamicMenuHeader(conv, language)
  return `${header}\n\n${numbered}\n\n0. ${getMenuLabel(language)}\n${getLanguageChangeHelp(language)}`
}
```
