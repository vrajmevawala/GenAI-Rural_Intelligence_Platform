# login

## Location
- Source: auth/auth.controller.js
- Lines: 39-52

## Signature
```js
login(req, res, next)
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
async function login(req, res, next) {
  try {
    const data = await authService.login(req.body, req.ip);
    setRefreshCookie(res, data.refreshToken);
    res.status(200).json(
      successResponse(
        { access_token: data.accessToken, user: data.user },
        "Login successful"
      )
    );
  } catch (err) {
    next(err);
  }
}
```
