# updateStatus

## Location
- Source: schemes/schemes.controller.js
- Lines: 31-39

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
    const nextStatus = req.body.application_status || req.body.status;
    const data = await schemesService.updateMatchStatus(req.params.matchId, nextStatus);
    res.json(successResponse(data, "Application status updated"));
  } catch (err) {
    next(err);
  }
}
```
