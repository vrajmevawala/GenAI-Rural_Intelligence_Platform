# list

## Location
- Source: institutions/institutions.controller.js
- Lines: 4-11

## Signature
```js
list(req, res, next)
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
async function list(req, res, next) {
  try {
    const data = await institutionsService.listInstitutions();
    res.status(200).json(successResponse(data, "Institutions retrieved"));
  } catch (err) {
    next(err);
  }
}
```
