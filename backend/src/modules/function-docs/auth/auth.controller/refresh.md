# refresh

## Location
- Source: auth/auth.controller.js
- Lines: 54-69

## Signature
```js
refresh(req, res, next)
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
async function refresh(req, res, next) {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!rawRefreshToken) {
      return res
        .status(401)
        .json(errorResponse("AUTH_SESSION_MISSING", "No refresh session cookie found", []));
    }

    const data = await authService.refreshSession(rawRefreshToken, req.ip);
    setRefreshCookie(res, data.refreshToken);
    res.status(200).json(successResponse({ access_token: data.accessToken }, "Token refreshed"));
  } catch (err) {
    next(err);
  }
}
```
