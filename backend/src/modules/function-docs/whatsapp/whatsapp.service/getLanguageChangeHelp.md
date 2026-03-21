# getLanguageChangeHelp

## Location
- Source: whatsapp/whatsapp.service.js
- Lines: 603-610

## Signature
```js
getLanguageChangeHelp(lang)
```

## How It Works (Actual Flow)
- Implements module-specific business logic and returns computed result.

## Parameters
- lang

## Implementation Snapshot
```js
function getLanguageChangeHelp(lang) {
  return {
    gu: 'ભાષા બદલવા GU / HI / EN લખો.',
    hi: 'भाषा बदलने के लिए GU / HI / EN लिखें।',
    en: 'To change language, type GU / HI / EN.',
    hinglish: 'Language change karne ke liye GU / HI / EN type karo.'
  }[lang] || 'To change language, type GU / HI / EN.'
}
```
