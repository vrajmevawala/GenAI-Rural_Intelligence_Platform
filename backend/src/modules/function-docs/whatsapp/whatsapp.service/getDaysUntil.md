# getDaysUntil

## Location
- Source: whatsapp/whatsapp.service.js
- Lines: 558-562

## Signature
```js
getDaysUntil(dateStr)
```

## How It Works (Actual Flow)
- Implements module-specific business logic and returns computed result.

## Parameters
- dateStr

## Implementation Snapshot
```js
function getDaysUntil(dateStr) {
  if (!dateStr) return 'soon'
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
  return diff > 0 ? `${diff}` : 'already expired'
}
```
