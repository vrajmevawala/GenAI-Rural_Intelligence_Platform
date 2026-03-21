# signRefreshToken

## Location
- Source: auth/auth.service.js
- Lines: 24-28

## Signature
```js
signRefreshToken(userId, tokenId)
```

## How It Works (Actual Flow)
- Performs authentication/security-related processing.

## Parameters
- userId
- tokenId

## Implementation Snapshot
```js
function signRefreshToken(userId, tokenId) {
  return jwt.sign({ userId, tokenId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: `${REFRESH_TTL_DAYS}d`
  });
}
```
