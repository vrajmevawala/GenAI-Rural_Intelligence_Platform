# create

## Location
- Source: institutions/institutions.controller.js
- Lines: 13-20

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
    const data = await institutionsService.createInstitution(req.body);
    res.status(201).json(successResponse(data, "Institution created successfully"));
  } catch (err) {
    next(err);
  }
}
```
