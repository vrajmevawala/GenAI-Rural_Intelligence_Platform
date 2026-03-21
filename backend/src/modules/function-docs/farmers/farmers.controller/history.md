# history

## Location
- Source: farmers/farmers.controller.js
- Lines: 79-86

## Signature
```js
history(req, res, next)
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
async function history(req, res, next) {
  try {
    const data = await farmersService.getScoreHistory(req.params.id);
    res.status(200).json(successResponse(data, "Score history retrieved"));
  } catch (err) {
    next(err);
  }
}
```
