# updateStatus

## Location
- Source: alerts/alerts.controller.js
- Lines: 28-35

## Signature
```js
updateStatus(req, res, next)
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
async function updateStatus(req, res, next) {
  try {
    const data = await alertsService.updateAlertStatus(req.user, req.params.id, req.body.status, req.ip);
    res.json(successResponse(data, "Alert status updated"));
  } catch (err) {
    next(err);
  }
}
```
