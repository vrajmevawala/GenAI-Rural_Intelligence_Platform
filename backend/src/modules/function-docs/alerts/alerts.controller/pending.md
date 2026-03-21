# pending

## Location
- Source: alerts/alerts.controller.js
- Lines: 37-44

## Signature
```js
pending(req, res, next)
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
async function pending(req, res, next) {
  try {
    const data = await alertsService.getPendingHighUrgent(req.user);
    res.json(successResponse(data, "Pending high-priority alerts"));
  } catch (err) {
    next(err);
  }
}
```
