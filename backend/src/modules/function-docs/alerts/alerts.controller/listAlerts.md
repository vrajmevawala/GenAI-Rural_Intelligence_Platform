# listAlerts

## Location
- Source: alerts/alerts.controller.js
- Lines: 4-17

## Signature
```js
listAlerts(req, res, next)
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
async function listAlerts(req, res, next) {
  try {
    const { farmer_id, priority, status, limit } = req.query;
    const data = await alertsService.listAlerts({
      farmer_id,
      priority,
      status,
      limit: Number(limit || 50)
    });
    res.json(successResponse(data, "Alerts retrieved"));
  } catch (err) {
    next(err);
  }
}
```
