# me

## Location
- Source: auth/auth.controller.js
- Lines: 82-89

## Signature
```js
me(req, res, next)
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
async function me(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.userId);
    res.status(200).json(successResponse(user, "Current user"));
  } catch (err) {
    next(err);
  }
}
```
