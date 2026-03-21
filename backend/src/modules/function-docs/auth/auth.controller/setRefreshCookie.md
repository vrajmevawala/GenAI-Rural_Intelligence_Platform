# setRefreshCookie

## Location
- Source: auth/auth.controller.js
- Lines: 17-22

## Signature
```js
setRefreshCookie(res, token)
```

## How It Works (Actual Flow)
- Handles HTTP request/response flow in a controller.
- Performs authentication/security-related processing.

## Parameters
- res
- token

## Implementation Snapshot
```js
function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...getCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}
```
