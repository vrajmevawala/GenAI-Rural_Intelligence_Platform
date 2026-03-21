# getMenuMessage

## Location
- Source: whatsapp/whatsapp.service.js
- Lines: 585-592

## Signature
```js
getMenuMessage(lang)
```

## How It Works (Actual Flow)
- Implements module-specific business logic and returns computed result.

## Parameters
- lang

## Implementation Snapshot
```js
function getMenuMessage(lang) {
  return {
    gu: `કૃપા કરીને 1 થી 6 માંથી કોઈ એક નંબર લખો.\n\n${getMenuFollowup('gu')}\n${getLanguageChangeHelp('gu')}`,
    hi: `कृपया 1 से 6 में से कोई एक नंबर लिखें।\n\n${getMenuFollowup('hi')}\n${getLanguageChangeHelp('hi')}`,
    en: `Anything else? Type menu to see options again.\n${getLanguageChangeHelp('en')}`,
    hinglish: `1 se 6 tak koi number type karo.\n\n${getMenuFollowup('hinglish')}\n${getLanguageChangeHelp('hinglish')}`
  }[lang] || 'Type menu for options.'
}
```
