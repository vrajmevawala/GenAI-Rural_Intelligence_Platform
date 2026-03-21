# matchFarmer

## Location
- Source: schemes/schemes.controller.js
- Lines: 13-20

## Signature
```js
matchFarmer(req, res, next)
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
async function matchFarmer(req, res, next) {
  try {
    const data = await schemesService.matchFarmer(req.params.farmerId);
    res.json(successResponse(data, "Farmer matched with schemes"));
  } catch (err) {
    next(err);
  }
}
```
