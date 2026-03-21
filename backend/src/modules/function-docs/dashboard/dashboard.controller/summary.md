# summary

## Location
- Source: dashboard/dashboard.controller.js
- Lines: 4-12

## Signature
```js
summary(req, res, next)
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
async function summary(req, res, next) {
  try {
    const institutionId = req.user.institutionId;
    const data = await dashboardService.getSummary(institutionId);
    res.json(successResponse(data, "Dashboard summary"));
  } catch (err) {
    next(err);
  }
}
```
