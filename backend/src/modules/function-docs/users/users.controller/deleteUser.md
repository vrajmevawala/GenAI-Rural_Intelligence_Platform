# deleteUser

## Location
- Source: users/users.controller.js
- Lines: 40-47

## Signature
```js
deleteUser(req, res, next)
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
async function deleteUser(req, res, next) {
  try {
    const data = await usersService.softDeleteUser(req.user, req.params.id, req.ip);
    res.json(successResponse(data, "User deactivated"));
  } catch (err) {
    next(err);
  }
}
```
