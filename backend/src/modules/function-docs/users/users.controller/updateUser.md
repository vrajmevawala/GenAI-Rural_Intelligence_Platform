# updateUser

## Location
- Source: users/users.controller.js
- Lines: 31-38

## Signature
```js
updateUser(req, res, next)
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
async function updateUser(req, res, next) {
  try {
    const user = await usersService.updateUser(req.user, req.params.id, req.body, req.ip);
    res.json(successResponse(user, "User updated"));
  } catch (err) {
    next(err);
  }
}
```
