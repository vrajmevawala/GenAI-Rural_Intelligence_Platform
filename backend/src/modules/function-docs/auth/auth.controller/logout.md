# logout

## Location
- Source: auth/auth.controller.js
- Lines: 71-80

## Signature
```js
logout(req, res, next)
```

## How It Works (Actual Flow)
- Handles HTTP request/response flow in a controller.
- Wraps API output in the platform response envelope.
- Performs authentication/security-related processing.

## Parameters
- req
- res
- next

## Implementation Snapshot
```js
async function logout(req, res, next) {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    await authService.logout(rawRefreshToken, req.user, req.ip);
    clearRefreshCookie(res);
    res.status(200).json(successResponse({}, "Logged out"));
  } catch (err) {
    next(err);
  }
}
```
