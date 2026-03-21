# getUser

## Location
- Source: users/users.controller.js
- Lines: 22-29

## Signature
```js
getUser(req, res, next)
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
async function getUser(req, res, next) {
  try {
    const user = await usersService.getUserById(req.user, req.params.id);
    res.json(successResponse(user, "User fetched"));
  } catch (err) {
    next(err);
  }
}
```
