# get

## Location
- Source: institutions/institutions.controller.js
- Lines: 22-29

## Signature
```js
get(req, res, next)
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
async function get(req, res, next) {
  try {
    const data = await institutionsService.getInstitutionById(req.params.id);
    res.status(200).json(successResponse(data, "Institution retrieved"));
  } catch (err) {
    next(err);
  }
}
```
