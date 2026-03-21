# listUsers

## Location
- Source: users/users.controller.js
- Lines: 4-11

## Signature
```js
listUsers(req, res, next)
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
async function listUsers(req, res, next) {
  try {
    const users = await usersService.listUsers(req.user);
    res.json(successResponse(users, "Users fetched"));
  } catch (err) {
    next(err);
  }
}
```
