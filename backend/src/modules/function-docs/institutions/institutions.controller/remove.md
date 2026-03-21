# remove

## Location
- Source: institutions/institutions.controller.js
- Lines: 40-47

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
    const data = await institutionsService.deleteInstitution(req.params.id);
    res.status(200).json(successResponse(data, "Institution deleted successfully"));
  } catch (err) {
    next(err);
  }
}
```
