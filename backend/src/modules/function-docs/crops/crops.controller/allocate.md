# allocate

## Location
- Source: crops/crops.controller.js
- Lines: 22-29

## Signature
```js
allocate(req, res, next)
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
async function allocate(req, res, next) {
  try {
    const data = await cropsService.allocateCropToFarmer(req.body);
    res.status(201).json(successResponse(data, "Crop allocated successfully"));
  } catch (err) {
    next(err);
  }
}
```
