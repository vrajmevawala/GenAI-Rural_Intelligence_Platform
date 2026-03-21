# recalculateScore

## Location
- Source: farmers/farmers.service.js
- Lines: 374-377

## Signature
```js
recalculateScore(id)
```

## How It Works (Actual Flow)
- Contains scoring/risk business logic for farmer intelligence.

## Parameters
- id

## Implementation Snapshot
```js
async function recalculateScore(id) {
  const vulnerabilityService = require("../vulnerability/vulnerability.service");
  return vulnerabilityService.recalculateFarmerScore(id, { role: 'system' }, 'manual');
}
```
