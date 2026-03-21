# clearRefreshCookie

## Location
- Source: auth/auth.controller.js
- Lines: 24-28

## Signature
```js
clearRefreshCookie(res)
```

## How It Works (Actual Flow)
- Handles HTTP request/response flow in a controller.

## Parameters
- res

## Implementation Snapshot
```js
function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    ...getCookieOptions()
  });
}
```
