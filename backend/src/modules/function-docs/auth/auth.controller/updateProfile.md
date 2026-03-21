# updateProfile

## Location
- Source: auth/auth.controller.js
- Lines: 91-98

## Signature
```js
updateProfile(req, res, next)
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
async function updateProfile(req, res, next) {
  try {
    const user = await authService.updateProfile(req.user.userId, req.body);
    res.status(200).json(successResponse(user, "Profile updated"));
  } catch (err) {
    next(err);
  }
}
```
