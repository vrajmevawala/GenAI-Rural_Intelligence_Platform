# adminStats

## Location
- Source: dashboard/dashboard.controller.js
- Lines: 23-30

## Signature
```js
adminStats(req, res, next)
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
async function adminStats(req, res, next) {
  try {
    const data = await dashboardService.getAdminStats();
    res.json(successResponse(data, "Admin stats"));
  } catch (err) {
    next(err);
  }
}
```
