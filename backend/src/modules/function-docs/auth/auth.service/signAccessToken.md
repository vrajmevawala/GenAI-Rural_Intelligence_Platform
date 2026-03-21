# signAccessToken

## Location
- Source: auth/auth.service.js
- Lines: 11-22

## Signature
```js
signAccessToken(user)
```

## How It Works (Actual Flow)
- Performs authentication/security-related processing.

## Parameters
- user

## Implementation Snapshot
```js
function signAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      institutionId: user.institution_id,
      role: user.role,
      email: user.email
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TTL }
  );
}
```
