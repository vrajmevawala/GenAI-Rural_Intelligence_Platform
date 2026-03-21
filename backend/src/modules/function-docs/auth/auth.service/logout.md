# logout

## Location
- Source: auth/auth.service.js
- Lines: 140-142

## Signature
```js
logout(rawRefreshToken, actor, ipAddress)
```

## How It Works (Actual Flow)
- Performs authentication/security-related processing.

## Parameters
- rawRefreshToken
- actor
- ipAddress

## Implementation Snapshot
```js
async function logout(rawRefreshToken, actor, ipAddress) {
  return { revoked: true };
}
```
