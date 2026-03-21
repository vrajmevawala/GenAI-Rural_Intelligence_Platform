# getMenuLabel

## Location
- Source: whatsapp/whatsapp.service.js
- Lines: 612-619

## Signature
```js
getMenuLabel(lang)
```

## How It Works (Actual Flow)
- Implements module-specific business logic and returns computed result.

## Parameters
- lang

## Implementation Snapshot
```js
function getMenuLabel(lang) {
  return {
    gu: 'મુખ્ય મેનુ',
    hi: 'Main Menu',
    en: 'Main menu',
    hinglish: 'Main menu'
  }[lang] || 'Main menu'
}
```
