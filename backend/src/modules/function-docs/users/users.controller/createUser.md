# createUser

## Location
- Source: users/users.controller.js
- Lines: 13-20

## Signature
```js
createUser(req, res, next)
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
async function createUser(req, res, next) {
  try {
    const user = await usersService.createUser(req.user, req.body, req.ip);
    res.status(201).json(successResponse(user, "User created"));
  } catch (err) {
    next(err);
  }
}
```
