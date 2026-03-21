# register

## Location
- Source: auth/auth.controller.js
- Lines: 30-37

## Signature
```js
register(req, res, next)
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
async function register(req, res, next) {
  try {
    const user = await authService.registerUser(req.user, req.body, req.ip);
    res.status(201).json(successResponse(user, "User registered successfully"));
  } catch (err) {
    next(err);
  }
}
```
