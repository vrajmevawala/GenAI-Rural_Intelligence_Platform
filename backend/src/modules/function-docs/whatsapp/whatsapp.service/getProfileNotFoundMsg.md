# getProfileNotFoundMsg

## Location
- Source: whatsapp/whatsapp.service.js
- Lines: 630-637

## Signature
```js
getProfileNotFoundMsg(lang)
```

## How It Works (Actual Flow)
- Implements module-specific business logic and returns computed result.

## Parameters
- lang

## Implementation Snapshot
```js
function getProfileNotFoundMsg(lang) {
  return {
    gu: 'માફ કરજો, આપનું પ્રોફાઇલ લોડ કરી શકાયું નહीં.',
    hi: 'खेद है, प्रोफाइल लोड नहीं हो सकी।',
    en: 'Sorry, could not load profile.',
    hinglish: 'Maafi chahta hoon, profile load nahi ho saka.'
  }[lang] || 'Could not load profile.'
}
```
