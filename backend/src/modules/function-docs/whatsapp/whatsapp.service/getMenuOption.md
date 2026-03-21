# getMenuOption

## Location
- Source: whatsapp/whatsapp.service.js
- Lines: 564-574

## Signature
```js
getMenuOption(type, lang)
```

## How It Works (Actual Flow)
- Implements module-specific business logic and returns computed result.

## Parameters
- type
- lang

## Implementation Snapshot
```js
function getMenuOption(type, lang) {
  const opts = {
    insurance: { gu: 'પાક વીમા માર્ગદર્શન', hi: 'Fasal Bima', en: 'Crop insurance guidance', hinglish: 'Fasal Bima' },
    pmkisan: { gu: 'PM-KISAN', hi: 'PM-KISAN', en: 'PM-KISAN', hinglish: 'PM-KISAN' },
    weather: { gu: 'હવામાન અને પાક સલાહ', hi: 'Mausam Jankari', en: 'Weather and crop advice', hinglish: 'Mausam Info' },
    scheme: { gu: 'સરકારી યોજનાઓ', hi: 'Sarkari Yojana', en: 'Government schemes', hinglish: 'Govt Scheme' },
    profile: { gu: 'મારી પ્રોફાઇલ જુઓ', hi: 'Meri Profile Dekho', en: 'View my profile', hinglish: 'Meri profile dekho' },
    officer: { gu: 'અધિકારી સાથે વાત', hi: 'Officer Se Baat', en: 'Talk to officer', hinglish: 'Officer Se Baat' },
  }
  return opts[type]?.[lang] || opts[type]?.en || type
}
```
