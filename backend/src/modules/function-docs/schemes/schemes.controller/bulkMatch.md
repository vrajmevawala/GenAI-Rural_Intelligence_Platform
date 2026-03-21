# bulkMatch

## Location
- Source: schemes/schemes.controller.js
- Lines: 41-48

## Signature
```js
bulkMatch(req, res, next)
```

## How It Works (Actual Flow)
- Handles HTTP request/response flow in a controller.
- Wraps API output in the platform response envelope.

## Parameters
- req
- res
- next

## Implementation Snapshot
```js
async function bulkMatch(req, res, next) {
  try {
    // Dummy bulk match
    res.json(successResponse({ processed: 10, matched: 8 }, "Bulk matching completed"));
  } catch (err) {
    next(err);
  }
}
```
