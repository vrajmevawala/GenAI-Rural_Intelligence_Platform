# listSchemes

## Location
- Source: schemes/schemes.controller.js
- Lines: 4-11

## Signature
```js
listSchemes(req, res, next)
```

## How It Works (Actual Flow)
- Handles HTTP request/response flow in a controller.
- Wraps API output in the platform response envelope.
- Calls external services/integrations during processing.

## Parameters
- req
- res
- next

## Implementation Snapshot
```js
async function listSchemes(req, res, next) {
  try {
    const data = await schemesService.listSchemes();
    res.json(successResponse(data, "Schemes fetched"));
  } catch (err) {
    next(err);
  }
}
```
