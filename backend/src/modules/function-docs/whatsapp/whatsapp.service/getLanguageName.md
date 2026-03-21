# getLanguageName

## Location
- Source: whatsapp/whatsapp.service.js
- Lines: 554-556

## Signature
```js
getLanguageName(code)
```

## How It Works (Actual Flow)
- Implements module-specific business logic and returns computed result.

## Parameters
- code

## Implementation Snapshot
```js
function getLanguageName(code) {
  return { gu: 'Gujarati', hi: 'Hindi', en: 'English', hinglish: 'Hinglish' }[code] || 'Gujarati'
}
```
