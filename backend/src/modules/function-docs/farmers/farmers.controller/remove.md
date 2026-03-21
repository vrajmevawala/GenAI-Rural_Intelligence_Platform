# remove

## Location
- Source: farmers/farmers.controller.js
- Lines: 61-68

## Signature
```js
remove(req, res, next)
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
async function remove(req, res, next) {
  try {
    const data = await farmersService.deleteFarmer(req.params.id);
    res.status(200).json(successResponse(data, "Farmer deleted successfully"));
  } catch (err) {
    next(err);
  }
}
```
