# getMenuHeader

## Location
- Source: whatsapp/whatsapp.service.js
- Lines: 576-583

## Signature
```js
getMenuHeader(lang)
```

## How It Works (Actual Flow)
- Implements module-specific business logic and returns computed result.

## Parameters
- lang

## Implementation Snapshot
```js
function getMenuHeader(lang) {
  return {
    gu: 'નમસ્તે! કઈ સેવા જોઈએ? કૃપા કરીને નંબર લખો:',
    hi: 'नमस्ते! किस सेवा में मदद चाहिए? कृपया नंबर लिखें:',
    en: 'What do you need help with? Type a number:',
    hinglish: 'Namaste! Kis service mein help chahiye? Number type karo:'
  }[lang] || 'Type a number:'
}
```
