# normalizePhoneNumber

## Location
- Source: whatsapp/whatsapp.service.js
- Lines: 16-25

## Signature
```js
normalizePhoneNumber(phone)
```

## How It Works (Actual Flow)
- Implements module-specific business logic and returns computed result.

## Parameters
- phone

## Implementation Snapshot
```js
function normalizePhoneNumber(phone) {
  if (!phone) return null;
  const trimmed = String(phone).trim();
  if (trimmed.startsWith("+")) return trimmed;

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return trimmed;
}
```
