# activityFeed

## Location
- Source: dashboard/dashboard.controller.js
- Lines: 14-21

## Signature
```js
activityFeed(req, res, next)
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
async function activityFeed(req, res, next) {
  try {
    const data = await dashboardService.getRecentActivity(10);
    res.json(successResponse(data, "Activity feed"));
  } catch (err) {
    next(err);
  }
}
```
