# getMatches

## Location
- Source: schemes/schemes.controller.js
- Lines: 22-29

## Signature
```js
getMatches(req, res, next)
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
async function getMatches(req, res, next) {
  try {
    const data = await schemesService.getMatchesByFarmer(req.params.farmerId);
    res.json(successResponse(data, "Farmer matches retrieved"));
  } catch (err) {
    next(err);
  }
}
```
