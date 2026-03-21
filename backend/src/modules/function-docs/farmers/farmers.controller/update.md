# update

## Location
- Source: farmers/farmers.controller.js
- Lines: 52-59

## Signature
```js
update(req, res, next)
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
async function update(req, res, next) {
  try {
    const data = await farmersService.updateFarmer(req.params.id, req.body);
    res.status(200).json(successResponse(data, "Farmer updated successfully"));
  } catch (err) {
    next(err);
  }
}
```
