# generateForFarmer

## Location
- Source: alerts/alerts.controller.js
- Lines: 19-26

## Signature
```js
generateForFarmer(req, res, next)
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
async function generateForFarmer(req, res, next) {
  try {
    const data = await alertsService.generateAlertsForFarmer(req.user, req.params.farmerId, req.ip);
    res.json(successResponse(data, "Alerts generated"));
  } catch (err) {
    next(err);
  }
}
```
