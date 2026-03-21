# recalculate

## Location
- Source: farmers/farmers.controller.js
- Lines: 70-77

## Signature
```js
recalculate(req, res, next)
```

## How It Works (Actual Flow)
- Handles HTTP request/response flow in a controller.
- Wraps API output in the platform response envelope.
- Contains scoring/risk business logic for farmer intelligence.

## Parameters
- req
- res
- next

## Implementation Snapshot
```js
async function recalculate(req, res, next) {
  try {
    const data = await farmersService.recalculateScore(req.params.id);
    res.status(200).json(successResponse(data, "Score recalculated"));
  } catch (err) {
    next(err);
  }
}
```
