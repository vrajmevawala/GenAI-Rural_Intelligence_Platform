# create

## Location
- Source: farmers/farmers.controller.js
- Lines: 34-41

## Signature
```js
create(req, res, next)
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
async function create(req, res, next) {
  try {
    const data = await farmersService.createFarmer(req.body);
    res.status(201).json(successResponse(data, "Farmer created successfully"));
  } catch (err) {
    next(err);
  }
}
```
