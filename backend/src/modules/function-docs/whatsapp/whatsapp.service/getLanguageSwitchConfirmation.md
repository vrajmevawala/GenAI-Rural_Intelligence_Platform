# getLanguageSwitchConfirmation

## Location
- Source: whatsapp/whatsapp.service.js
- Lines: 621-628

## Signature
```js
getLanguageSwitchConfirmation(lang)
```

## How It Works (Actual Flow)
- Implements module-specific business logic and returns computed result.

## Parameters
- lang

## Implementation Snapshot
```js
function getLanguageSwitchConfirmation(lang) {
  return {
    gu: 'બરાબર. હવે આપણે ગુજરાતી માં વાત કરીએ. સેવા માટે નંબર લખો.',
    hi: 'ठीक है। अब हम हिंदी में बात करेंगे। सेवा के लिए नंबर लिखें।',
    en: 'Got it. Switching to English.',
    hinglish: 'Thik hai. Ab language update ho gayi. Service ke liye number type karo.'
  }[lang] || 'Language updated.'
}
```
