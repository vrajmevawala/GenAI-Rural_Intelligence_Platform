# getCookieOptions

## Location
- Source: auth/auth.controller.js
- Lines: 6-15

## Signature
```js
getCookieOptions()
```

## How It Works (Actual Flow)
- Calls external services/integrations during processing.

## Parameters
- None

## Implementation Snapshot
```js
function getCookieOptions() {
  const sameSite = process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === "production" ? "none" : "lax");
  const secure = process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    sameSite,
    secure
  };
}
```
